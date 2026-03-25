# API Sentinel — Complete Settings & Configuration Guide

## 🎯 Overview

API Sentinel now includes a **dedicated Settings Panel** with a unique cyberpunk UI design for managing API testing configuration. All settings are persisted to the VS Code workspace configuration.

---

## 📋 Features

### 1. **Settings View** (New Tab in Sidebar)
Located in the API Sentinel activity bar, the Settings view provides:

- **Base URL Configuration** (Required)
  - Set the root URL of your API server
  - Examples: `http://localhost:3000`, `https://api.example.com`
  - Used by both internal engine and CLI

- **Authorization Token** (Optional)
  - Bearer token or API key for authenticated endpoints
  - Password-masked input for security
  - Leave empty if your API doesn't require authentication

- **Request Configuration**
  - **Timeout (ms)**: Maximum time to wait for a response (1000-60000ms)
  - **Retries**: Number of times to retry failed requests (0-5)

- **Test Connection Button**
  - Verify your Base URL is reachable
  - Shows connection status with color-coded feedback
  - Tests with your configured authentication

- **Save & Reset Buttons**
  - Save all settings to workspace configuration
  - Reset to default values

---

## 🎨 UI Design

The Settings panel features a **cyberpunk/futuristic aesthetic**:

- **Color Scheme**:
  - Primary: Cyan (#8ff5ff) with glow effects
  - Secondary: Neon Green (#00fc40)
  - Tertiary: Red (#ff7166)
  - Dark background: #0b0e14

- **Visual Elements**:
  - Glass-morphism panels with backdrop blur
  - Animated pulse indicators
  - Glowing text shadows
  - Smooth transitions and hover effects
  - Material Design icons

---

## 🔧 How to Use

### Step 1: Open Settings
1. Click the **API Sentinel** icon in the Activity Bar
2. Click the **Settings** tab

### Step 2: Configure Base URL
1. Enter your API server URL in the "Base URL" field
2. Example: `http://localhost:3000`

### Step 3: Add Authorization (Optional)
1. If your API requires authentication, enter your Bearer token
2. Leave empty if no authentication is needed

### Step 4: Adjust Request Settings
1. Set **Timeout** (default: 5000ms)
2. Set **Retries** (default: 1)

### Step 5: Test Connection
1. Click **TEST CONNECTION** button
2. Verify the connection status
3. Green indicator = Server is reachable

### Step 6: Save Settings
1. Click **SAVE SETTINGS**
2. Settings are saved to workspace configuration
3. They persist across VS Code sessions

---

## 💾 Configuration Storage

Settings are stored in VS Code workspace configuration:

```json
{
  "apiSentinel.baseURL": "http://localhost:3000",
  "apiSentinel.apiKey": "your-bearer-token",
  "apiSentinel.timeout": 5000,
  "apiSentinel.retries": 1
}
```

**Location**: `.vscode/settings.json` in your workspace

---

## 🚀 Integration with Testing

### Internal Engine (Run Button)
- Uses settings from the Settings panel
- Applies Base URL and API key to all test requests
- Respects timeout and retry configuration

### CLI Mode (Run CLI Button)
- Passes Base URL via `--base-url` flag
- Passes API key via `SENTINEL_AUTH_TOKEN` environment variable
- Uses configured timeout and retries

---

## 🔐 Security Notes

- **API Keys**: Stored in workspace configuration (not global)
- **Password Field**: Authorization token input is masked
- **No Cloud Sync**: Settings remain local to your workspace
- **Recommendation**: Use workspace-level settings for sensitive data

---

## 📊 Endpoints View

The **Endpoints** tab now displays:

- **Scan Button**: Detect all API endpoints
- **Run Button**: Execute tests with configured settings
- **Run CLI Button**: Auto-start server + run tests
- **Live Stats**: Total tests and pass rate
- **Endpoint Cards**: Color-coded by test status
- **Live Log**: Real-time test execution output

---

## ⚙️ Default Configuration

If no settings are configured, defaults are:

```
Base URL: http://localhost:3000
API Key: (empty)
Timeout: 5000ms
Retries: 1
```

---

## 🎯 Best Practices

1. **Set Base URL First**: Always configure your API server URL before running tests
2. **Test Connection**: Use the test button to verify connectivity
3. **Use Workspace Settings**: Keep API keys in workspace config, not global
4. **Adjust Timeout**: Increase timeout for slow APIs or high-latency networks
5. **Enable Retries**: Set retries > 0 for flaky network conditions

---

## 🐛 Troubleshooting

### "Connection Failed" Error
- Verify your Base URL is correct
- Check if your API server is running
- Ensure firewall allows the connection

### "Unauthorized" Error
- Verify your API key/token is correct
- Check if the token has expired
- Ensure the Authorization header format is correct

### Tests Timing Out
- Increase the Timeout value
- Check your network connection
- Verify the API server is responsive

---

## 📝 Example Configurations

### Local Development
```
Base URL: http://localhost:3000
API Key: (empty)
Timeout: 5000ms
Retries: 1
```

### Staging Environment
```
Base URL: https://staging-api.example.com
API Key: Bearer staging_token_xyz
Timeout: 10000ms
Retries: 2
```

### Production
```
Base URL: https://api.example.com
API Key: Bearer prod_token_abc
Timeout: 15000ms
Retries: 3
```

---

## 🔄 Workflow

1. **Configure Settings** → Settings panel
2. **Scan Endpoints** → Endpoints tab → Scan button
3. **Run Tests** → Endpoints tab → Run or Run CLI button
4. **View Results** → Endpoints tab → Live results
5. **Adjust & Retry** → Modify settings → Run again

---

## 📞 Support

For issues or questions:
- Check the API Sentinel output channel for detailed logs
- Verify your configuration in Settings panel
- Test connection before running full test suite

---

**Version**: 2.1.0  
**Last Updated**: 2024
