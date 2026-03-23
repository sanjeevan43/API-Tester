import * as vscode from 'vscode';
import { Scanner } from './core/scanner';
import { Generator } from './core/generator';
import { Executor } from './core/executor';
import { loadConfig } from './core/config';
import { EndpointProvider } from './endpointProvider';
import { Endpoint, TestResult } from './core/types';

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('API Sentinel');
    const endpointProvider = new EndpointProvider();
    vscode.window.registerTreeDataProvider('apiSentinel.endpointTree', endpointProvider);

    let endpoints: Endpoint[] = [];

    const scanCommand = vscode.commands.registerCommand('apiSentinel.scanProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a workspace folder first.');
            return;
        }

        const cwd = workspaceFolders[0].uri.fsPath;
        const config = loadConfig(cwd);
        const scanner = new Scanner(config);

        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`🔍 API Sentinel: Scanning workspace... ${cwd}`);
        
        try {
            endpoints = scanner.scanWorkspace(cwd);
            endpointProvider.refresh(endpoints);
            vscode.window.showInformationMessage(`✅ Found ${endpoints.length} endpoints!`);
            outputChannel.appendLine(`✅ Found ${endpoints.length} endpoints.`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Scan failed: ${error.message}`);
        }
    });

    const runAllCommand = vscode.commands.registerCommand('apiSentinel.runAll', async () => {
        if (endpoints.length === 0) {
            vscode.window.showErrorMessage('No endpoints detected. Please scan first.');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const config = loadConfig(workspaceFolders[0].uri.fsPath);
        const generator = new Generator(config);
        const executor = new Executor(config.timeout);

        outputChannel.show();
        outputChannel.appendLine('\n🚀 Running all tests...');

        const results: TestResult[] = [];
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "API Sentinel: Running Tests",
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
            for (let i = 0; i < endpoints.length; i++) {
                const ep = endpoints[i];
                const cases = generator.generateAll(ep);
                
                progress.report({ increment: (1 / endpoints.length) * 100, message: `Testing ${ep.path}` });

                for (const tc of cases) {
                    outputChannel.appendLine(`➡️ Running: ${tc.name}...`);
                    const res = await executor.run(tc, ep);
                    results.push(res);
                    outputChannel.appendLine(`   [${res.status.toUpperCase()}] ${res.statusCode || res.error}`);
                }
            }
        });

        endpointProvider.updateResults(results);
        const passed = results.filter(r => r.status === 'pass').length;
        vscode.window.showInformationMessage(`🏁 Testing Complete! Passed: ${passed}/${results.length}`);
    });

    context.subscriptions.push(scanCommand, runAllCommand);
}

export function deactivate() {}
