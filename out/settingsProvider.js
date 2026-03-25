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
exports.SettingsProvider = void 0;
const vscode = __importStar(require("vscode"));
class SettingsProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this.onSettingsChanged = null;
        this._cachedSettings = null;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        webviewView.webview.html = this._html();
        webviewView.webview.onDidReceiveMessage((data) => {
            switch (data.type) {
                case 'saveSettings':
                    this._cachedSettings = { baseURL: data.baseURL, apiKey: data.apiKey, timeout: data.timeout, retries: data.retries };
                    this.saveSettings(data.baseURL, data.apiKey, data.timeout, data.retries);
                    if (this.onSettingsChanged) {
                        this.onSettingsChanged(this._cachedSettings);
                    }
                    break;
                case 'loadSettings':
                    this.loadAndSendSettings();
                    break;
            }
        });
        this.loadAndSendSettings();
    }
    loadAndSendSettings() {
        const baseURL = vscode.workspace.getConfiguration('apiSentinel').get('baseURL') || 'http://localhost:3000';
        const apiKey = vscode.workspace.getConfiguration('apiSentinel').get('apiKey') || '';
        const timeout = vscode.workspace.getConfiguration('apiSentinel').get('timeout') || 5000;
        const retries = vscode.workspace.getConfiguration('apiSentinel').get('retries') || 1;
        this._view?.webview.postMessage({
            type: 'settingsLoaded',
            baseURL,
            apiKey,
            timeout,
            retries
        });
    }
    saveSettings(baseURL, apiKey, timeout, retries) {
        const config = vscode.workspace.getConfiguration('apiSentinel');
        config.update('baseURL', baseURL, vscode.ConfigurationTarget.Workspace);
        config.update('apiKey', apiKey, vscode.ConfigurationTarget.Workspace);
        config.update('timeout', timeout, vscode.ConfigurationTarget.Workspace);
        config.update('retries', retries, vscode.ConfigurationTarget.Workspace);
    }
    onSettingsChange(callback) {
        this.onSettingsChanged = callback;
    }
    getSettings() {
        if (this._cachedSettings)
            return this._cachedSettings;
        const config = vscode.workspace.getConfiguration('apiSentinel');
        this._cachedSettings = {
            baseURL: config.get('baseURL') || '', // Strict: No default localhost
            apiKey: config.get('apiKey') || '',
            timeout: config.get('timeout') || 30000,
            retries: config.get('retries') || 0
        };
        return this._cachedSettings;
    }
    _html() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Sentinel Settings</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-main: #0b0e14;
    --surface-container: #161a21;
    --surface-container-high: #1c2028;
    --surface-container-highest: #22262f;
    --surface-container-low: #10131a;
    --primary: #8ff5ff;
    --primary-dim: #00deec;
    --primary-container: #00eefc;
    --secondary: #00fc40;
    --secondary-dim: #00ec3b;
    --tertiary: #ff7166;
    --tertiary-dim: #e51a22;
    --on-surface: #ecedf6;
    --on-surface-variant: #a9abb3;
    --outline: #73757d;
    --outline-variant: #45484f;
  }

  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    color: var(--on-surface);
    background: var(--bg-main);
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow-x: hidden;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: rgba(22, 26, 33, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(69, 72, 79, 0.2);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-icon { font-size: 22px; color: var(--primary); text-shadow: 0 0 8px rgba(143, 245, 255, 0.5); }
  .header-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: linear-gradient(90deg, var(--primary), var(--primary-dim));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Content */
  .content { padding: 20px 16px; display: flex; flex-direction: column; gap: 24px; }

  /* Section */
  .section { display: flex; flex-direction: column; gap: 16px; }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--primary);
    text-shadow: 0 0 8px rgba(143, 245, 255, 0.3);
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(143, 245, 255, 0.2);
  }

  /* Form Group */
  .form-group { display: flex; flex-direction: column; gap: 8px; }
  .form-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--on-surface-variant);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .form-label-required { color: var(--tertiary); }
  .form-description {
    font-size: 10px;
    color: var(--on-surface-variant);
    opacity: 0.7;
    margin-top: -4px;
  }

  /* Input */
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-icon {
    position: absolute;
    left: 12px;
    font-size: 16px;
    color: var(--outline);
    pointer-events: none;
  }
  input, textarea {
    width: 100%;
    background: var(--surface-container-highest);
    border: 1px solid rgba(69, 72, 79, 0.4);
    border-radius: 8px;
    padding: 10px 12px 10px 40px;
    color: var(--primary);
    font-family: 'Consolas', monospace;
    font-size: 12px;
    transition: all 0.2s;
  }
  input:focus, textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(143, 245, 255, 0.1), inset 0 0 0 1px rgba(143, 245, 255, 0.2);
  }
  input::placeholder, textarea::placeholder { color: var(--outline); opacity: 0.5; }

  /* Number Input */
  .number-input-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .number-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .number-input-wrapper label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--on-surface-variant);
    font-weight: 600;
  }
  input[type="number"] {
    padding: 8px 12px;
    text-align: center;
  }

  /* Toggle */
  .toggle-group {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--surface-container-low);
    border-radius: 8px;
    border: 1px solid rgba(69, 72, 79, 0.2);
  }
  .toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
    background: var(--outline-variant);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .toggle-switch.active { background: var(--secondary); }
  .toggle-switch::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: left 0.2s;
  }
  .toggle-switch.active::after { left: 22px; }
  .toggle-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .toggle-label-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--on-surface);
  }
  .toggle-label-desc {
    font-size: 10px;
    color: var(--on-surface-variant);
    opacity: 0.7;
  }

  /* Status Indicator */
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(0, 252, 64, 0.1);
    border: 1px solid rgba(0, 252, 64, 0.3);
    border-radius: 8px;
    font-size: 11px;
    color: var(--secondary);
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--secondary);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* Buttons */
  .button-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 12px;
  }
  button {
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  button:disabled { opacity: 0.3; cursor: not-allowed; pointer-events: none; }
  button:active { transform: scale(0.95); }

  .btn-save {
    background: linear-gradient(135deg, var(--primary), var(--primary-container));
    color: #003f43;
    box-shadow: 0 0 15px rgba(143, 245, 255, 0.3);
    grid-column: 1 / -1;
  }
  .btn-save:hover { box-shadow: 0 0 20px rgba(143, 245, 255, 0.5); }

  .btn-reset {
    background: var(--surface-container-high);
    border: 1px solid rgba(69, 72, 79, 0.3);
    color: var(--on-surface-variant);
  }
  .btn-reset:hover { background: var(--surface-container-highest); }

  .btn-test {
    background: linear-gradient(135deg, var(--secondary-dim), var(--secondary));
    color: #00440a;
    box-shadow: 0 0 15px rgba(0, 252, 64, 0.3);
  }
  .btn-test:hover { box-shadow: 0 0 20px rgba(0, 252, 64, 0.5); }

  /* Info Box */
  .info-box {
    background: rgba(143, 245, 255, 0.05);
    border: 1px solid rgba(143, 245, 255, 0.2);
    border-radius: 8px;
    padding: 12px;
    font-size: 11px;
    color: var(--on-surface-variant);
    line-height: 1.5;
  }
  .info-box strong { color: var(--primary); }

  /* Divider */
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(69, 72, 79, 0.3), transparent);
    margin: 8px 0;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--outline); }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <span class="header-icon">⚙️</span>
  <span class="header-title">Settings</span>
</div>

<div class="content">
  <!-- API Configuration Section -->
  <div class="section">
    <div class="section-title">🌐 API Configuration</div>

    <!-- Base URL -->
    <div class="form-group">
      <label class="form-label">
        <span>Base URL</span>
        <span class="form-label-required">*</span>
      </label>
      <div class="input-wrapper">
        <span class="input-icon">🔗</span>
        <input type="text" id="base-url" placeholder="http://localhost:3000" />
      </div>
      <div class="form-description">The root URL of your API server (e.g., http://localhost:3000 or https://api.example.com)</div>
    </div>

    <!-- API Key -->
    <div class="form-group">
      <label class="form-label">
        <span>Authorization Token</span>
        <span style="font-size:9px;color:var(--on-surface-variant);">(Optional)</span>
      </label>
      <div class="input-wrapper">
        <span class="input-icon">🔑</span>
        <input type="password" id="api-key" placeholder="Bearer token or API key..." />
      </div>
      <div class="form-description">Leave empty if your API doesn't require authentication. Supports Bearer tokens and API keys.</div>
    </div>

    <!-- Status -->
    <div class="status-indicator">
      <span class="status-dot"></span>
      <span>Configuration loaded and ready</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Request Configuration Section -->
  <div class="section">
    <div class="section-title">⏱️ Request Configuration</div>

    <div class="number-input-group">
      <div class="number-input-wrapper">
        <label>Timeout (ms)</label>
        <input type="number" id="timeout" min="1000" max="60000" step="1000" value="5000" />
      </div>
      <div class="number-input-wrapper">
        <label>Retries</label>
        <input type="number" id="retries" min="0" max="5" step="1" value="1" />
      </div>
    </div>

    <div class="form-description">Timeout: Maximum time to wait for a response. Retries: Number of times to retry failed requests.</div>
  </div>

  <div class="divider"></div>

  <!-- Test Connection Section -->
  <div class="section">
    <div class="section-title">🧪 Test Connection</div>
    <button class="btn-test" onclick="testConnection()">
      <span>🔍</span> TEST CONNECTION
    </button>
    <div id="test-result" style="display:none;margin-top:12px;"></div>
  </div>

  <div class="divider"></div>

  <!-- Actions Section -->
  <div class="section">
    <button class="btn-save" onclick="saveSettings()">
      <span>💾</span> SAVE SETTINGS
    </button>
    <button class="btn-reset" onclick="resetSettings()">
      <span>↺</span> RESET TO DEFAULTS
    </button>
  </div>

  <!-- Info -->
  <div class="info-box">
    <strong>💡 Tip:</strong> Your settings are saved to the workspace configuration and will persist across sessions. The Base URL is required for API testing.
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();

  const baseURLInput = document.getElementById('base-url');
  const apiKeyInput = document.getElementById('api-key');
  const timeoutInput = document.getElementById('timeout');
  const retriesInput = document.getElementById('retries');

  window.addEventListener('message', ({ data }) => {
    if (data.type === 'settingsLoaded') {
      baseURLInput.value = data.baseURL || '';
      apiKeyInput.value = data.apiKey || '';
      timeoutInput.value = data.timeout || 5000;
      retriesInput.value = data.retries || 1;
    }
  });

  let saveTimer;
  function triggerAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSettings, 800);
  }

  baseURLInput.addEventListener('input', triggerAutoSave);
  apiKeyInput.addEventListener('input', triggerAutoSave);
  timeoutInput.addEventListener('input', triggerAutoSave);
  retriesInput.addEventListener('input', triggerAutoSave);

  function saveSettings() {
    const baseURL = baseURLInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const timeout = parseInt(timeoutInput.value);
    const retries = parseInt(retriesInput.value);

    if (!baseURL) {
      showTestResult('❌ Base URL is required!', 'error');
      return;
    }

    vscode.postMessage({
      type: 'saveSettings',
      baseURL,
      apiKey,
      timeout: isNaN(timeout) ? undefined : timeout,
      retries: isNaN(retries) ? undefined : retries
    });

    showTestResult('✅ Settings saved successfully!', 'success');
  }

  function resetSettings() {
    baseURLInput.value = '';
    apiKeyInput.value = '';
    timeoutInput.value = '';
    retriesInput.value = '';
    saveSettings();
  }

  async function testConnection() {
    const baseURL = baseURLInput.value.trim();
    if (!baseURL) {
      showTestResult('❌ Please enter a Base URL first', 'error');
      return;
    }

    const btn = event.target.closest('button');
    btn.disabled = true;
    btn.textContent = '⏳ Testing...';

    try {
      const response = await fetch(baseURL, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'Authorization': apiKeyInput.value ? \`Bearer \${apiKeyInput.value}\` : ''
        }
      });

      if (response.ok || response.status === 404 || response.status === 401) {
        showTestResult(\`✅ Connection successful! (Status: \${response.status})\`, 'success');
      } else {
        showTestResult(\`⚠️ Server responded with status \${response.status}\`, 'warning');
      }
    } catch (err) {
      showTestResult(\`❌ Connection failed: \${err.message}\`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔍 TEST CONNECTION';
    }
  }

  function showTestResult(message, type) {
    const resultDiv = document.getElementById('test-result');
    resultDiv.style.display = 'block';
    resultDiv.style.padding = '10px 12px';
    resultDiv.style.borderRadius = '8px';
    resultDiv.style.fontSize = '11px';
    resultDiv.style.fontWeight = '600';

    if (type === 'success') {
      resultDiv.style.background = 'rgba(0, 252, 64, 0.1)';
      resultDiv.style.border = '1px solid rgba(0, 252, 64, 0.3)';
      resultDiv.style.color = 'var(--secondary)';
    } else if (type === 'error') {
      resultDiv.style.background = 'rgba(255, 113, 102, 0.1)';
      resultDiv.style.border = '1px solid rgba(255, 113, 102, 0.3)';
      resultDiv.style.color = 'var(--tertiary)';
    } else {
      resultDiv.style.background = 'rgba(143, 245, 255, 0.1)';
      resultDiv.style.border = '1px solid rgba(143, 245, 255, 0.3)';
      resultDiv.style.color = 'var(--primary)';
    }

    resultDiv.textContent = message;
  }

  // Load settings on init
  vscode.postMessage({ type: 'loadSettings' });
</script>
</body>
</html>`;
    }
}
exports.SettingsProvider = SettingsProvider;
//# sourceMappingURL=settingsProvider.js.map