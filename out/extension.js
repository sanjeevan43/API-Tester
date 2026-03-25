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
const webviewProvider_1 = require("./webviewProvider");
const settingsProvider_1 = require("./settingsProvider");
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('API Sentinel');
    const sidebarProvider = new webviewProvider_1.SidebarProvider(context.extensionUri);
    const settingsProvider = new settingsProvider_1.SettingsProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('apiSentinel.endpointSidebar', sidebarProvider), vscode.window.registerWebviewViewProvider('apiSentinel.settingsView', settingsProvider));
    let endpoints = [];
    const scanCommand = vscode.commands.registerCommand('apiSentinel.scanProject', async () => {
        const cwd = getWorkspacePath();
        if (!cwd)
            return;
        const config = (0, config_1.loadConfig)(cwd);
        const scanner = new scanner_1.Scanner(config);
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`🔍 Scanning: ${cwd}`);
        try {
            endpoints = scanner.scanWorkspace(cwd);
            sidebarProvider.updateEndpoints(endpoints);
            outputChannel.appendLine(`✅ Found ${endpoints.length} endpoints.`);
            vscode.window.showInformationMessage(`✅ Found ${endpoints.length} endpoints!`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Scan failed: ${err.message}`);
        }
    });
    const runAllCommand = vscode.commands.registerCommand('apiSentinel.runAll', async (data) => {
        if (endpoints.length === 0) {
            vscode.window.showErrorMessage('No endpoints found. Run Scan first.');
            return;
        }
        const cwd = getWorkspacePath();
        if (!cwd)
            return;
        outputChannel.clear();
        outputChannel.show();
        const configNamespace = vscode.workspace.getConfiguration('apiSentinel');
        const settings = {
            baseURL: data?.baseURL || configNamespace.get('baseURL') || '',
            apiKey: data?.apiKey || configNamespace.get('apiKey') || '',
            timeout: data?.timeout || configNamespace.get('timeout') || 30000,
            retries: data?.retries ?? (configNamespace.get('retries') || 0)
        };
        const config = (0, config_1.loadConfig)(cwd);
        config.baseURL = settings.baseURL;
        config.authToken = settings.apiKey;
        config.timeout = settings.timeout;
        if (!config.baseURL) {
            outputChannel.appendLine('❌ ❌ ❌ Error: Base URL is not configured. Please enter it in the Dashboard. ❌ ❌ ❌');
            vscode.window.showErrorMessage('Base URL is required to run tests.');
            return;
        }
        const generator = new generator_1.Generator(config);
        const executor = new executor_1.Executor(config);
        const retries = settings.retries;
        outputChannel.appendLine('\n🚀 Running tests (internal engine)...');
        outputChannel.appendLine(`📍 Base URL: ${config.baseURL}`);
        outputChannel.appendLine(`🔑 Auth Token: ${config.authToken ? 'Set' : 'No'}`);
        outputChannel.appendLine(`⏱  Timeout: ${config.timeout}ms | Retries: ${retries}\n`);
        const results = [];
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'API Sentinel: Running Tests', cancellable: false }, async (progress) => {
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
        });
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
function getWorkspacePath() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) {
        vscode.window.showErrorMessage('Open a workspace folder first.');
        return null;
    }
    return folders[0].uri.fsPath;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map