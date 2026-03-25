import * as vscode from 'vscode';
import * as path from 'path';
import { Scanner } from './core/scanner';
import { Generator } from './core/generator';
import { Executor } from './core/executor';
import { loadConfig } from './core/config';
import { SidebarProvider } from './webviewProvider';
import { SettingsProvider } from './settingsProvider';
import { Endpoint, TestResult } from './core/types';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('API Sentinel');
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  const settingsProvider = new SettingsProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('apiSentinel.endpointSidebar', sidebarProvider),
    vscode.window.registerWebviewViewProvider('apiSentinel.settingsView', settingsProvider)
  );

  let endpoints: Endpoint[] = [];

  const scanCommand = vscode.commands.registerCommand('apiSentinel.scanProject', async () => {
    const cwd = getWorkspacePath();
    if (!cwd) return;

    const config = loadConfig(cwd);
    const scanner = new Scanner(config);

    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine(`🔍 Scanning: ${cwd}`);

    try {
      endpoints = scanner.scanWorkspace(cwd);
      sidebarProvider.updateEndpoints(endpoints);
      outputChannel.appendLine(`✅ Found ${endpoints.length} endpoints.`);
      vscode.window.showInformationMessage(`✅ Found ${endpoints.length} endpoints!`);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Scan failed: ${err.message}`);
    }
  });

  const runAllCommand = vscode.commands.registerCommand('apiSentinel.runAll', async (data?: any) => {
    if (endpoints.length === 0) {
      vscode.window.showErrorMessage('No endpoints found. Run Scan first.');
      return;
    }
    const cwd = getWorkspacePath();
    if (!cwd) return;

    outputChannel.clear();
    outputChannel.show();

    const configNamespace = vscode.workspace.getConfiguration('apiSentinel');
    const settings = {
      baseURL: data?.baseURL || configNamespace.get('baseURL') as string || '',
      apiKey: data?.apiKey || configNamespace.get('apiKey') as string || '',
      timeout: data?.timeout || configNamespace.get('timeout') as number || 30000,
      retries: data?.retries ?? (configNamespace.get('retries') as number || 0)
    };

    const config = loadConfig(cwd);
    config.baseURL = settings.baseURL;
    config.authToken = settings.apiKey;
    config.timeout = settings.timeout;

    if (!config.baseURL) {
      outputChannel.appendLine('❌ ❌ ❌ Error: Base URL is not configured. Please enter it in the Dashboard. ❌ ❌ ❌');
      vscode.window.showErrorMessage('Base URL is required to run tests.');
      return;
    }

    const generator = new Generator(config);
    const executor = new Executor(config);
    const retries = settings.retries;

    outputChannel.appendLine('\n🚀 Running tests (internal engine)...');
    outputChannel.appendLine(`📍 Base URL: ${config.baseURL}`);
    outputChannel.appendLine(`🔑 Auth Token: ${config.authToken ? 'Set' : 'No'}`);
    outputChannel.appendLine(`⏱  Timeout: ${config.timeout}ms | Retries: ${retries}\n`);

    const results: TestResult[] = [];

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'API Sentinel: Running Tests', cancellable: false },
      async (progress) => {
        for (let i = 0; i < endpoints.length; i++) {
          const ep = endpoints[i];
          progress.report({ increment: (1 / endpoints.length) * 100, message: `Testing ${ep.path}` });
          for (const tc of generator.generateAll(ep)) {
            const fullUrl = `${config.baseURL.replace(/\/$/, '')}/${tc.url.replace(/^\//, '')}`;
            outputChannel.appendLine(`  ➡️  ${tc.name}`);
            outputChannel.appendLine(`     🔗 URL: ${fullUrl}`); 
            const res = await executor.run(tc, ep, retries);
            results.push(res);
            outputChannel.appendLine(`     [${res.status.toUpperCase()}] ${res.statusCode ?? res.error}`);
          }
        }
      }
    );

    sidebarProvider.updateResults(results);
    const passed = results.filter(r => r.status === 'pass').length;
    vscode.window.showInformationMessage(`🏁 Done! Passed: ${passed}/${results.length}`);
  });



  const saveFromWebview = vscode.commands.registerCommand('apiSentinel.saveSettingsFromWebview', (data) => {
    // This command is triggered by our new premium Dashboard
    outputChannel.appendLine(`[DASHBOARD] Syncing configuration: baseURL=${data.baseURL}, apiKey=${data.apiKey ? 'Set' : 'Empty'}`);
    
    const config = vscode.workspace.getConfiguration('apiSentinel');
    config.update('baseURL', data.baseURL, vscode.ConfigurationTarget.Workspace);
    config.update('apiKey', data.apiKey, vscode.ConfigurationTarget.Workspace);
    config.update('timeout', data.timeout, vscode.ConfigurationTarget.Workspace);
    config.update('retries', data.retries, vscode.ConfigurationTarget.Workspace);
    
    // Also update our live providers
    settingsProvider.saveSettings(data.baseURL, data.apiKey, data.timeout, data.retries);
  });

  context.subscriptions.push(scanCommand, runAllCommand, saveFromWebview);
}

function getWorkspacePath(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return null;
  }
  return folders[0].uri.fsPath;
}

export function deactivate() {}
