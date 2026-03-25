# Development Guide

## Project Setup

### Prerequisites
- Node.js 16+
- npm 8+
- VS Code 1.85+
- TypeScript 5.3+

### Installation

```bash
# Clone the repository
git clone https://github.com/sanjeevan43/API-Tester.git
cd API-Tester

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

## Project Structure

```
src/
├── extension.ts              # Extension activation and command registration
├── settingsProvider.ts       # Settings webview and configuration management
├── webviewProvider.ts        # Main dashboard webview
└── core/
    ├── scanner.ts            # Endpoint detection engine
    ├── generator.ts          # Test case generation
    ├── executor.ts           # HTTP request execution
    ├── config.ts             # Configuration loading
    └── types.ts              # TypeScript type definitions
```

## Core Modules

### Scanner (`src/core/scanner.ts`)

Detects API endpoints from source code using framework-specific regex patterns.

**Key Methods:**
- `scanWorkspace(cwd)` — Scans entire workspace for endpoints
- `scanFile(filePath)` — Extracts endpoints from a single file
- `extractPathParams(path)` — Parses path parameters
- `extractBodyFields(context)` — Identifies request body fields
- `detectAuth(context)` — Detects authentication requirements

**Supported Patterns:**
```typescript
// Express
app.get('/users', handler)
router.post('/users', handler)

// FastAPI
@app.get('/items/{item_id}')
@router.post('/items')

// Flask
@app.route('/users', methods=['GET'])
@blueprint.route('/items')

// Gin
r.GET('/users', handler)
group.POST('/items', handler)

// Echo
e.GET('/users', handler)
e.POST('/items', handler)
```

### Generator (`src/core/generator.ts`)

Creates test cases for each endpoint.

**Test Case Types:**
1. **Valid Request** — Standard request with example data
2. **Missing Fields** — Omits required body fields
3. **Unauthorized** — Requests without authentication

**Example Values:**
- Email fields → `user@example.com`
- ID fields → `1`
- Password fields → `Secret123!`
- Generic fields → `test_fieldname`

### Executor (`src/core/executor.ts`)

Executes HTTP requests and validates responses.

**Features:**
- Retry logic for transient failures
- Flexible status code validation
- Response time measurement
- Detailed error reporting

**Status Validation:**
- 2xx/3xx responses → Pass
- Specific status matches → Pass
- 4xx/5xx responses → Fail
- Connection errors → Error

### Config (`src/core/config.ts`)

Loads configuration from workspace settings and `api.config.json`.

**Configuration Priority:**
1. Workspace settings (`.vscode/settings.json`)
2. Project config file (`api.config.json`)
3. Defaults

### Types (`src/core/types.ts`)

TypeScript interfaces for type safety:
- `Endpoint` — Detected API endpoint
- `TestCase` — Generated test case
- `TestResult` — Execution result
- `Config` — Configuration object
- `HttpMethod` — HTTP method type

## Extension Architecture

### Extension Entry Point (`src/extension.ts`)

Handles:
- Command registration (Scan, Run All)
- Settings management
- Output channel logging
- Progress notifications

**Commands:**
- `apiSentinel.scanProject` — Scan for endpoints
- `apiSentinel.runAll` — Execute all tests

### Settings Provider (`src/settingsProvider.ts`)

Manages configuration UI and persistence.

**Features:**
- Cyberpunk-themed settings panel
- Base URL validation
- Test connection functionality
- Workspace configuration storage

**Settings Keys:**
- `apiSentinel.baseURL` — API server URL
- `apiSentinel.apiKey` — Authentication token
- `apiSentinel.timeout` — Request timeout (ms)
- `apiSentinel.retries` — Retry attempts

### Webview Provider (`src/webviewProvider.ts`)

Renders the main dashboard with three tabs:

1. **Dashboard** — Configure API and run tests
2. **Results** — View endpoint registry and test results
3. **Settings** — Adjust timeout and retry settings

**Message Types:**
- `updateEndpoints` — Update endpoint list
- `updateResults` — Update test results
- `appendLog` — Add log entry
- `cliRunning` — CLI status indicator

## Adding Support for New Frameworks

### Step 1: Add Route Pattern

Edit `src/core/scanner.ts`:

```typescript
const ROUTE_PATTERNS = [
  // ... existing patterns
  {
    framework: 'myframework',
    regex: /pattern_to_match_routes/gi,
    methodGroup: 1,
    pathGroup: 2
  }
];
```

### Step 2: Add File Extension

Update `src/core/config.ts`:

```typescript
include: ['**/*.js', '**/*.ts', '**/*.py', '**/*.swift', '**/*.go', '**/*.myext']
```

### Step 3: Test

Create a test file with your framework's routes and verify detection.

## Testing

### Manual Testing

1. **Run in Development Mode:**
   ```bash
   npm run watch
   ```

2. **Open Extension Host:**
   - Press `F5` in VS Code
   - A new window opens with the extension loaded

3. **Test Workflow:**
   - Open a project with API code
   - Click API Sentinel icon
   - Enter base URL
   - Click "Discover Endpoints"
   - Click "Execute Automation"

### Testing Checklist

- [ ] Endpoints are correctly detected
- [ ] Test cases are generated for each endpoint
- [ ] Tests execute without errors
- [ ] Results display correctly
- [ ] Settings persist across sessions
- [ ] Error messages are helpful

## Debugging

### Enable Debug Logging

Add to `src/extension.ts`:

```typescript
outputChannel.appendLine(`[DEBUG] ${message}`);
```

### VS Code Debug Console

- Press `Ctrl+Shift+Y` to open Debug Console
- View extension logs and errors

### Inspect Webview

- Right-click in webview → Inspect Element
- View HTML, CSS, and JavaScript

## Building for Release

### Compile

```bash
npm run compile
```

### Package Extension

```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file for distribution.

### Publish to Marketplace

```bash
vsce publish
```

## Code Style

- Use TypeScript strict mode
- Follow VS Code extension guidelines
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

## Performance Considerations

- **Scanning**: Glob patterns are optimized to exclude node_modules
- **Execution**: Requests run sequentially to avoid overwhelming the server
- **Memory**: Results are stored in memory; consider pagination for large result sets
- **UI**: Webview updates are batched to reduce re-renders

## Common Issues

### TypeScript Compilation Errors

```bash
npm run compile
```

Check `tsconfig.json` for strict settings.

### Extension Not Loading

- Check `package.json` for syntax errors
- Verify `main` points to correct output file
- Check browser console for errors

### Tests Not Running

- Verify base URL is set
- Check API server is running
- Review output channel for error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Axios Documentation](https://axios-http.com/)

## License

MIT
