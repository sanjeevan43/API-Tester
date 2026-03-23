import * as vscode from 'vscode';
import { Endpoint, TestResult } from './core/types';

export class EndpointProvider implements vscode.TreeDataProvider<EndpointItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<EndpointItem | undefined | void> = new vscode.EventEmitter<EndpointItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<EndpointItem | undefined | void> = this._onDidChangeTreeData.event;

  private endpoints: Endpoint[] = [];
  private lastResults: Map<string, TestResult[]> = new Map();

  refresh(endpoints: Endpoint[]): void {
    this.endpoints = endpoints;
    this._onDidChangeTreeData.fire();
  }

  updateResults(results: TestResult[]): void {
    results.forEach(r => {
      const existing = this.lastResults.get(r.endpoint.id) || [];
      // Replace or add
      const idx = existing.findIndex(e => e.name === r.name);
      if (idx >= 0) existing[idx] = r;
      else existing.push(r);
      this.lastResults.set(r.endpoint.id, existing);
    });
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: EndpointItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EndpointItem): Thenable<EndpointItem[]> {
    if (element) {
      // Return test cases for this endpoint
      const results = this.lastResults.get(element.endpoint?.id || '') || [];
      return Promise.resolve(results.map(r => new EndpointItem(
        r.name,
        vscode.TreeItemCollapsibleState.None,
        r.endpoint,
        r
      )));
    } else {
      // Return endpoints
      return Promise.resolve(this.endpoints.map(e => {
        const results = this.lastResults.get(e.id) || [];
        const state = results.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        return new EndpointItem(`${e.method} ${e.path}`, state, e);
      }));
    }
  }
}

class EndpointItem extends vscode.TreeItem {
  contextValue?: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly endpoint?: Endpoint,
    public readonly result?: TestResult
  ) {
    super(label, collapsibleState);
    
    if (result) {
      this.contextValue = 'testCase';
      this.description = result.status === 'pass' ? `$(check) ${result.statusCode}` : `$(error) ${result.error || result.statusCode}`;
      this.iconPath = new vscode.ThemeIcon(
        result.status === 'pass' ? 'check' : result.status === 'fail' ? 'error' : 'warning',
        new vscode.ThemeColor(result.status === 'pass' ? 'testing.iconPassed' : 'testing.iconFailed')
      );
    } else if (endpoint) {
      this.contextValue = 'endpoint';
      this.description = endpoint.framework;
      this.iconPath = new vscode.ThemeIcon('symbol-interface');
    }
  }
}
