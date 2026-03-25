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
exports.SidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
class SidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this.endpoints = [];
        this.lastResults = new Map();
        this.lastLogs = [];
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        webviewView.webview.html = this._html();
        webviewView.webview.onDidReceiveMessage((data) => {
            switch (data.type) {
                case 'scan':
                    vscode.commands.executeCommand('apiSentinel.scanProject');
                    break;
                case 'runAll':
                    vscode.commands.executeCommand('apiSentinel.runAll', data);
                    break;
                case 'saveSettings':
                    vscode.commands.executeCommand('apiSentinel.saveSettingsFromWebview', data);
                    break;
            }
        });
        // Send initial results if any
        this.updateEndpoints(this.endpoints);
        this.updateResults(Array.from(this.lastResults.values()).flat());
    }
    updateEndpoints(endpoints) {
        this.endpoints = endpoints;
        this._post({ type: 'updateEndpoints', endpoints });
    }
    updateResults(results) {
        results.forEach((r) => {
            const list = this.lastResults.get(r.endpoint.id) ?? [];
            const idx = list.findIndex(e => e.name === r.name);
            idx >= 0 ? (list[idx] = r) : list.push(r);
            this.lastResults.set(r.endpoint.id, list);
        });
        this._post({ type: 'updateResults', results: Object.fromEntries(this.lastResults) });
    }
    setCLIRunning(running) {
        this._post({ type: 'cliRunning', running });
        if (running) {
            this.lastLogs = [];
        }
    }
    appendLog(line) {
        this.lastLogs.push(line);
        this._post({ type: 'appendLog', line });
    }
    _post(msg) {
        this._view?.webview.postMessage(msg);
    }
    _html() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Sentinel Pro</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-deep: #050608;
    --bg-main: #0b0e14;
    --surface: #151921;
    --surface-bright: #1c222d;
    --surface-border: rgba(143, 245, 255, 0.1);
    --primary: #8ff5ff;
    --primary-dim: #00deec;
    --primary-glow: rgba(143, 245, 255, 0.3);
    --secondary: #00fc40;
    --on-surface: #ecedf6;
    --text-muted: #6e717a;
    --error: #ff5a5f;
    --success: #00fc40;
    --radius-sm: 6px;
    --radius-md: 12px;
  }

  body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    color: var(--on-surface);
    background: var(--bg-deep);
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .nav-bar {
    display: flex;
    padding: 12px;
    gap: 12px;
    background: var(--surface);
    border-bottom: 1px solid var(--surface-border);
    justify-content: center;
  }
  .nav-item {
    cursor: pointer;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
  }
  .nav-item.active { color: var(--primary); }

  .main-container { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; }
  .page { display: none; flex-direction: column; gap: 20px; }
  .page.active { display: flex; }

  .card {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .label-group { font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; }
  
  .input-field { display: flex; flex-direction: column; gap: 6px; }
  .input-field label { font-size: 10px; color: var(--text-muted); font-weight: 600; }
  input {
    width: 100%;
    background: var(--bg-deep);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    color: var(--primary);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }

  .status-badge {
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
  }
  .status-error { background: rgba(255, 90, 95, 0.1); color: var(--error); }
  .status-ready { background: rgba(0, 252, 64, 0.1); color: var(--success); }

  button {
    padding: 12px;
    border: none;
    border-radius: var(--radius-sm);
    font-weight: 800;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  button:disabled { opacity: 0.2; cursor: not-allowed; }
  .btn-primary { background: var(--primary); color: #000; }
  .btn-action { background: var(--secondary); color: #000; }

  .item {
    background: var(--surface-bright);
    padding: 12px;
    border-radius: var(--radius-sm);
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    border: 1px solid transparent;
  }
  .item:hover { border-color: var(--surface-border); }

  .debug-panel {
    background: #000;
    padding: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    height: 140px;
    overflow-y: auto;
    border-top: 1px solid var(--surface-border);
  }
</style>
</head>
<body>

  <div class="nav-bar">
    <div id="nav-dash" class="nav-item active" onclick="showPage('dashboard')"><span>🏠 Dashboard</span></div>
    <div id="nav-res" class="nav-item" onclick="showPage('results')"><span>📊 Results</span></div>
    <div id="nav-set" class="nav-item" onclick="showPage('settings')"><span>⚙️ Settings</span></div>
  </div>

  <div class="main-container">
    
    <div id="dashboard" class="page active">
      <div class="label-group">🌐 API Gateway</div>
      <div class="card">
        <div class="input-field">
          <label>BASE URL (Required)</label>
          <input type="text" id="base-url" oninput="v()">
        </div>
        <div class="input-field">
          <label>AUTH TOKEN (Optional)</label>
          <input type="password" id="api-key" oninput="v()">
        </div>
        <div id="status" class="status-badge status-error">DISCONNECTED</div>
      </div>
      <button id="b-scan" class="btn-primary" onclick="s('scan')" disabled>Discover Endpoints</button>
      <button id="b-run" class="btn-action" onclick="s('runAll')" disabled>Execute Automation</button>
    </div>

    <div id="results" class="page">
      <div class="label-group">📋 Endpoint Registry</div>
      <div id="res-list" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>

    <div id="settings" class="page">
      <div class="label-group">⚙️ Global Configuration</div>
      <div class="card">
         <div class="input-field"><label>TIMEOUT (MS)</label><input type="number" id="timeout" oninput="save()"></div>
         <div class="input-field"><label>RETRY ATTEMPTS</label><input type="number" id="retries" oninput="save()"></div>
      </div>
    </div>

  </div>

  <div class="debug-panel" id="debug">
    <div style="color:var(--primary); font-weight:700; margin-bottom:8px;">🛸 Sentinel System Log</div>
  </div>

<script>
  const vscode = acquireVsCodeApi();
  let eps = [];
  let rss = {};

  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-' + id.substring(0,4)).classList.add('active');
  }

  function v() {
    const u = document.getElementById('base-url').value.trim();
    const st = document.getElementById('status');
    const bS = document.getElementById('b-scan');
    const bR = document.getElementById('b-run');

    if (u && u.startsWith('http')) {
      st.className = 'status-badge status-ready';
      st.innerText = 'URL VALIDATED';
      bS.disabled = false;
    } else {
      st.className = 'status-badge status-error';
      st.innerText = 'DISCONNECTED';
      bS.disabled = true;
      bR.disabled = true;
    }
    if (eps.length > 0 && u) bR.disabled = false;
    save();
  }

  function save() {
    vscode.postMessage({
      type: 'saveSettings',
      baseURL: document.getElementById('base-url').value.trim(),
      apiKey: document.getElementById('api-key').value.trim(),
      timeout: parseInt(document.getElementById('timeout').value) || 30000,
      retries: parseInt(document.getElementById('retries').value) || 0
    });
  }

  function s(t) {
    l('[COMMAND] Initiating ' + t.toUpperCase());
    const data = {
      type: t,
      baseURL: document.getElementById('base-url').value.trim(),
      apiKey: document.getElementById('api-key').value.trim(),
      timeout: parseInt(document.getElementById('timeout').value) || 30000,
      retries: parseInt(document.getElementById('retries').value) || 0
    };
    vscode.postMessage(data);
  }

  function l(m) {
    const d = document.getElementById('debug');
    const n = document.createElement('div');
    n.innerText = '> ' + m;
    n.style.color = m.includes('[NETWORK]') ? 'var(--primary)' : 'var(--text-muted)';
    if (m.includes('URL:')) n.style.color = 'var(--secondary)';
    d.appendChild(n);
    d.scrollTop = d.scrollHeight;
  }

  window.addEventListener('message', ({ data }) => {
    if (data.type === 'updateEndpoints') { eps = data.endpoints; v(); rR(); }
    if (data.type === 'updateResults') { rss = data.results; rR(); }
    if (data.type === 'appendLog') {
       if (data.line.includes('🔗 URL:')) {
          l('[NETWORK] Calling ' + data.line.split('URL: ')[1]);
       } else if (data.line.includes('📍 Base URL:')) {
          l('[CONFIG] Base URL: ' + data.line.split('Base URL: ')[1]);
       } else {
          l(data.line);
       }
    }
  });

  function rR() {
    const h = document.getElementById('res-list');
    if (eps.length === 0) { h.innerHTML = '<div style="font-size:10px; opacity:0.5;">No endpoints found.</div>'; return; }
    h.innerHTML = eps.map(e => {
      const results = rss[e.id] || [];
      const r = results[0];
      return \`<div class="item"><div>\${e.method} \${e.path}</div><div style="color:\${r && r.status === 'pass' ? 'var(--success)' : 'var(--error)'}">\${r ? (r.statusCode || 'ERR') : '...'}</div></div>\`;
    }).join('');
  }
</script>
</body>
    `;
    }
}
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=webviewProvider.js.map