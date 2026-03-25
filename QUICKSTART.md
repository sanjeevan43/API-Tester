# Quick Start Guide

## 5-Minute Setup

### Step 1: Install (1 min)
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "API Sentinel"
4. Click Install

### Step 2: Configure (1 min)
1. Click the **API Sentinel** icon in the Activity Bar (left sidebar)
2. In the **Dashboard** tab, enter your API's Base URL
   - Example: `http://localhost:3000`
   - Example: `https://api.example.com`
3. (Optional) Add your Authorization Token if needed
4. Click **SAVE SETTINGS**

### Step 3: Scan (1 min)
1. Click **Discover Endpoints** button
2. Wait for scan to complete
3. View detected endpoints in the **Results** tab

### Step 4: Test (1 min)
1. Click **Execute Automation** button
2. Watch tests run in real-time
3. View results and logs

### Step 5: Review (1 min)
1. Check **Results** tab for endpoint status
2. Review **System Log** for detailed execution info
3. Adjust settings if needed

## Common Scenarios

### Testing a Local Express API

```javascript
// server.js
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.post('/api/users', (req, res) => {
  res.status(201).json({ id: 2, name: req.body.name });
});

app.listen(3000);
```

**In API Sentinel:**
1. Base URL: `http://localhost:3000`
2. Click "Discover Endpoints"
3. Should find: `GET /api/users`, `POST /api/users`
4. Click "Execute Automation"
5. Tests run automatically

### Testing a FastAPI Application

```python
# main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    return {"item_id": item_id}

@app.post("/items")
async def create_item(name: str):
    return {"name": name}
```

**In API Sentinel:**
1. Base URL: `http://localhost:8000`
2. Click "Discover Endpoints"
3. Should find: `GET /items/{item_id}`, `POST /items`
4. Click "Execute Automation"
5. Tests run with parameter interpolation

### Testing with Authentication

```javascript
// app.js
const express = require('express');
const app = express();

app.get('/api/protected', (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ data: 'secret' });
});

app.listen(3000);
```

**In API Sentinel:**
1. Base URL: `http://localhost:3000`
2. Authorization Token: `your-bearer-token`
3. Click "SAVE SETTINGS"
4. Click "Discover Endpoints"
5. Should detect auth requirement
6. Click "Execute Automation"
7. Tests include auth header automatically

## Dashboard Tabs

### 🏠 Dashboard
- **Base URL** — Your API server address (required)
- **Auth Token** — Bearer token or API key (optional)
- **Discover Endpoints** — Scan project for routes
- **Execute Automation** — Run all tests
- **Status Indicator** — Shows if URL is valid

### 📊 Results
- **Endpoint Registry** — List of all detected endpoints
- **Status** — Pass/Fail/Error for each endpoint
- **Response Code** — HTTP status code returned
- **Live Updates** — Updates as tests run

### ⚙️ Settings
- **Timeout** — How long to wait for responses (ms)
- **Retries** — How many times to retry failed requests
- **Auto-save** — Settings save automatically

## System Log

The **System Log** at the bottom shows:
- Scan progress
- Test execution details
- Network requests
- Errors and warnings
- Response times

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open API Sentinel | Click icon in Activity Bar |
| Save Settings | Ctrl+S (auto-saves) |
| Run Tests | Click "Execute Automation" |
| View Logs | Scroll in System Log |

## Tips & Tricks

### 💡 Tip 1: Test Connection
Before running tests, use the test connection button to verify your API is reachable.

### 💡 Tip 2: Check Logs
If tests fail, check the System Log for detailed error messages.

### 💡 Tip 3: Adjust Timeout
If tests timeout, increase the timeout value in Settings.

### 💡 Tip 4: Use Bearer Tokens
For APIs requiring authentication, add your token in the Auth Token field.

### 💡 Tip 5: Monitor Response Times
Check the System Log to see how long each request takes.

## Troubleshooting

### ❌ "Base URL is required"
**Solution:** Enter your API's base URL in the Dashboard tab and click SAVE SETTINGS.

### ❌ "No endpoints found"
**Solution:** 
- Ensure your project has API code (Express, FastAPI, etc.)
- Check file extensions (.js, .ts, .py, .go, .swift)
- Try scanning again

### ❌ "Connection refused"
**Solution:**
- Start your API server
- Verify the base URL is correct
- Check the port is accessible
- Try the test connection button

### ❌ "Tests timing out"
**Solution:**
- Increase timeout in Settings
- Check your API server's performance
- Verify network connectivity

### ❌ "401 Unauthorized"
**Solution:**
- Add your API key/token in the Auth Token field
- Click SAVE SETTINGS
- Run tests again

## Next Steps

1. **Read Full Documentation** — See README.md for complete features
2. **Explore Settings** — Adjust timeout and retry settings
3. **Test Multiple Endpoints** — Try with different API routes
4. **Check Logs** — Review System Log for insights
5. **Share Feedback** — Report issues on GitHub

## Support

- 📖 **Documentation** — README.md
- 🔧 **Development** — DEVELOPMENT.md
- 🐛 **Issues** — GitHub Issues
- 💬 **Discussions** — GitHub Discussions

---

**You're all set! Start testing your APIs now.** 🚀
