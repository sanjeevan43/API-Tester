"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const scanner_1 = require("./core/scanner");
const generator_1 = require("./core/generator");
const executor_1 = require("./core/executor");
const config_1 = require("./core/config");
const endpointProvider_1 = require("./endpointProvider");
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('API Sentinel');
    const endpointProvider = new endpointProvider_1.EndpointProvider();
    vscode.window.registerTreeDataProvider('apiSentinel.endpointTree', endpointProvider);
    let endpoints = [];
    const scanCommand = vscode.commands.registerCommand('apiSentinel.scanProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a workspace folder first.');
            return;
        }
        const cwd = workspaceFolders[0].uri.fsPath;
        const config = (0, config_1.loadConfig)(cwd);
        const scanner = new scanner_1.Scanner(config);
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`🔍 API Sentinel: Scanning workspace... ${cwd}`);
        try {
            endpoints = scanner.scanWorkspace(cwd);
            endpointProvider.refresh(endpoints);
            vscode.window.showInformationMessage(`✅ Found ${endpoints.length} endpoints!`);
            outputChannel.appendLine(`✅ Found ${endpoints.length} endpoints.`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Scan failed: ${error.message}`);
        }
    });
    const runAllCommand = vscode.commands.registerCommand('apiSentinel.runAll', async () => {
        if (endpoints.length === 0) {
            vscode.window.showErrorMessage('No endpoints detected. Please scan first.');
            return;
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return;
        const config = (0, config_1.loadConfig)(workspaceFolders[0].uri.fsPath);
        const generator = new generator_1.Generator(config);
        const executor = new executor_1.Executor(config.timeout);
        outputChannel.show();
        outputChannel.appendLine('\n🚀 Running all tests...');
        const results = [];
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "API Sentinel: Running Tests",
            cancellable: false
        }, async (progress) => {
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
function deactivate() { }
//# sourceMappingURL=extension.js.map