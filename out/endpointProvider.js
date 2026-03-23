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
exports.EndpointProvider = void 0;
const vscode = __importStar(require("vscode"));
class EndpointProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.endpoints = [];
        this.lastResults = new Map();
    }
    refresh(endpoints) {
        this.endpoints = endpoints;
        this._onDidChangeTreeData.fire();
    }
    updateResults(results) {
        results.forEach(r => {
            const existing = this.lastResults.get(r.endpoint.id) || [];
            // Replace or add
            const idx = existing.findIndex(e => e.name === r.name);
            if (idx >= 0)
                existing[idx] = r;
            else
                existing.push(r);
            this.lastResults.set(r.endpoint.id, existing);
        });
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            // Return test cases for this endpoint
            const results = this.lastResults.get(element.endpoint?.id || '') || [];
            return Promise.resolve(results.map(r => new EndpointItem(r.name, vscode.TreeItemCollapsibleState.None, r.endpoint, r)));
        }
        else {
            // Return endpoints
            return Promise.resolve(this.endpoints.map(e => {
                const results = this.lastResults.get(e.id) || [];
                const state = results.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
                return new EndpointItem(`${e.method} ${e.path}`, state, e);
            }));
        }
    }
}
exports.EndpointProvider = EndpointProvider;
class EndpointItem extends vscode.TreeItem {
    constructor(label, collapsibleState, endpoint, result) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.endpoint = endpoint;
        this.result = result;
        if (result) {
            this.contextValue = 'testCase';
            this.description = result.status === 'pass' ? `$(check) ${result.statusCode}` : `$(error) ${result.error || result.statusCode}`;
            this.iconPath = new vscode.ThemeIcon(result.status === 'pass' ? 'check' : result.status === 'fail' ? 'error' : 'warning', new vscode.ThemeColor(result.status === 'pass' ? 'testing.iconPassed' : 'testing.iconFailed'));
        }
        else if (endpoint) {
            this.contextValue = 'endpoint';
            this.description = endpoint.framework;
            this.iconPath = new vscode.ThemeIcon('symbol-interface');
        }
    }
}
//# sourceMappingURL=endpointProvider.js.map