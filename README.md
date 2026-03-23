# API Sentinel — Automated API Testing

Automatically detect, generate, execute, and display API tests inside VS Code.

## Features

- **Scan Project**: Scans your source files to detect API endpoints (Express, FastAPI, Flask, etc.).
- **Generate Tests**: Automatically creates test cases based on detected routes, including path/query parameters and request bodies.
- **Run All Tests**: Executes all test cases and shows results directly in the VS Code sidebar.
- **Live Logs**: Detailed execution logs in the `API Sentinel` output channel.

## How to Use

1. Click on the **API Sentinel** icon in the Activity Bar.
2. Click the **Search** icon (Scan Project) to populate the endpoint tree.
3. Click the **Play** icon to run all generated test cases.

## Supported Frameworks

- Express.js
- Fastify
- Flask (Python)
- FastAPI (Python)
- Gin (Go)
- Echo (Go)

## License

MIT
