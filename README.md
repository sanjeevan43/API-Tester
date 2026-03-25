# API Sentinel — Automated API Testing

A powerful VS Code extension that automatically detects, generates, and executes comprehensive API tests for your endpoints.

## Features

✨ **Automatic Endpoint Detection** — Scans your codebase to find all API endpoints across multiple frameworks

🧪 **Smart Test Generation** — Creates test cases including valid requests, missing fields, and unauthorized access scenarios

⚡ **Built-in Test Engine** — Executes tests directly in VS Code with real-time results and detailed logging

📊 **Live Results Dashboard** — View endpoint registry, test results, and execution logs in an intuitive cyberpunk UI

🔐 **Authentication Support** — Handles Bearer tokens and API keys automatically

⏱️ **Configurable Execution** — Set timeout, retry attempts, and other request parameters

## Supported Frameworks

- **JavaScript/TypeScript**: Express.js, Fastify
- **Python**: Flask, FastAPI
- **Go**: Gin, Echo
- **Swift**: Vapor

## Quick Start

1. **Install the Extension**
   - Open VS Code and search for "API Sentinel" in the Extensions marketplace
   - Click Install

2. **Configure Your API**
   - Click the API Sentinel icon in the Activity Bar
   - Enter your API's Base URL (required)
   - Optionally add an Authorization Token
   - Click "SAVE SETTINGS"

3. **Scan for Endpoints**
   - Click the "Discover Endpoints" button
   - The extension scans your project and displays all detected endpoints

4. **Run Tests**
   - Click "Execute Automation" to run all generated test cases
   - View results in real-time in the Results tab
   - Check detailed logs in the system log panel

## How It Works

### 1. Scanning
The Scanner analyzes your source code using framework-specific regex patterns to extract:
- HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
- Route path with parameter detection
- Path parameters (`:id`, `{id}`, `<id>`)
- Query parameters
- Request body fields
- Authentication requirements

### 2. Test Generation
The Generator creates multiple test cases per endpoint:
- **Valid Request** — Standard request with example data
- **Missing Fields** — Tests required field validation
- **Unauthorized** — Tests authentication enforcement (if required)

### 3. Execution
The Executor runs each test case against your API:
- Makes HTTP requests with proper headers and body
- Validates response status codes
- Retries on connection failures
- Measures response time
- Captures detailed error messages

### 4. Reporting
Results are displayed in the dashboard with:
- Pass/Fail status for each test
- HTTP status codes
- Response times
- Detailed execution logs

## Configuration

All settings are stored in your workspace configuration (`.vscode/settings.json`):

```json
{
  "apiSentinel.baseURL": "http://localhost:3000",
  "apiSentinel.apiKey": "your-bearer-token",
  "apiSentinel.timeout": 30000,
  "apiSentinel.retries": 0
}
```

### Settings Explained

| Setting | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| `baseURL` | string | ✅ Yes | — | Root URL of your API server |
| `apiKey` | string | ❌ No | — | Bearer token or API key for authentication |
| `timeout` | number | ❌ No | 30000 | Request timeout in milliseconds |
| `retries` | number | ❌ No | 0 | Number of times to retry failed requests |

## Architecture

```
src/
├── extension.ts              # Main extension entry point
├── settingsProvider.ts       # Settings UI and management
├── webviewProvider.ts        # Dashboard UI
└── core/
    ├── scanner.ts            # Endpoint detection
    ├── generator.ts          # Test case generation
    ├── executor.ts           # HTTP request execution
    ├── config.ts             # Configuration loader
    └── types.ts              # TypeScript interfaces
```

## Key Components

### Scanner (`core/scanner.ts`)
- Detects framework type from source code
- Extracts routes, parameters, and metadata
- Deduplicates endpoints across frameworks
- Supports 6+ frameworks with extensible pattern matching

### Generator (`core/generator.ts`)
- Creates positive, negative, and edge case tests
- Generates smart example values (emails, IDs, passwords)
- Handles path parameter interpolation
- Manages authentication headers

### Executor (`core/executor.ts`)
- Makes HTTP requests using axios
- Implements retry logic for transient failures
- Validates response status codes
- Measures performance metrics

### Settings Provider (`settingsProvider.ts`)
- Manages workspace configuration
- Provides test connection functionality
- Persists settings across sessions

### Webview Provider (`webviewProvider.ts`)
- Renders the dashboard UI
- Displays endpoints and results
- Handles user interactions
- Shows real-time execution logs

## Usage Examples

### Testing a Simple Express API

```javascript
// app.js
const express = require('express');
const app = express();

app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.post('/users', (req, res) => {
  res.status(201).json({ id: 2, name: req.body.name });
});

app.listen(3000);
```

**API Sentinel will automatically:**
1. Detect both endpoints
2. Generate test cases for each
3. Create valid POST request with `name` field
4. Test missing `name` field validation
5. Execute all tests and report results

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

**API Sentinel will:**
1. Parse FastAPI decorators
2. Extract path parameters (`item_id`)
3. Generate tests with parameter interpolation
4. Validate all responses

## Troubleshooting

### "Base URL is required" Error
- Open the Settings tab in the dashboard
- Enter your API's base URL (e.g., `http://localhost:3000`)
- Click "SAVE SETTINGS"

### No Endpoints Found
- Ensure your project contains supported framework files
- Check that routes are defined using standard patterns
- Verify file extensions match supported languages (.js, .ts, .py, .go, .swift)

### Connection Refused
- Verify your API server is running
- Check the base URL is correct
- Ensure the port is accessible
- Try the "TEST CONNECTION" button in Settings

### Tests Timing Out
- Increase the timeout value in Settings
- Check your API server's performance
- Verify network connectivity

## Performance Tips

- **Reduce Timeout**: Lower timeout values speed up test execution for fast APIs
- **Disable Retries**: Set retries to 0 if your server is stable
- **Batch Testing**: Run all tests together rather than individually
- **Monitor Logs**: Check the system log for performance insights

## Security

- API keys are stored in workspace settings (`.vscode/settings.json`)
- Never commit sensitive credentials to version control
- Use environment-specific configurations
- Consider using VS Code's secret storage for sensitive data

## License

MIT

## Support

For issues, feature requests, or contributions, visit the [GitHub repository](https://github.com/sanjeevan43/API-Tester).

---

**Made with ❤️ for API developers**
