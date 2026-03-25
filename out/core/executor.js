"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Executor = void 0;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
class Executor {
    constructor(config) {
        this.config = config;
    }
    async run(tc, ep, retries = 0) {
        if (!this.config.baseURL) {
            return {
                id: (0, uuid_1.v4)(),
                endpoint: ep,
                name: tc.name,
                status: 'error',
                error: 'Base URL is required for testing. Please check your settings.',
                executedAt: new Date()
            };
        }
        const startedAt = Date.now();
        const reqConfig = {
            baseURL: this.config.baseURL,
            method: tc.method,
            url: tc.url,
            headers: tc.headers,
            data: tc.body,
            params: tc.queryParams,
            timeout: this.config.timeout,
            validateStatus: () => true
        };
        try {
            const resp = await (0, axios_1.default)(reqConfig);
            const duration = Date.now() - startedAt;
            // Real response validation
            let status = 'fail';
            // Consider status codes 2xx, 3xx as pass by default.
            if (resp.status >= 200 && resp.status < 400)
                status = 'pass';
            // Specific checks
            if (tc.expectedStatus === 400 && resp.status === 400)
                status = 'pass';
            if (tc.expectedStatus === 401 && resp.status === 401)
                status = 'pass';
            if (resp.status === tc.expectedStatus)
                status = 'pass';
            return {
                id: (0, uuid_1.v4)(),
                endpoint: ep,
                name: tc.name,
                status: status,
                statusCode: resp.status,
                responseTime: duration,
                executedAt: new Date()
            };
        }
        catch (e) {
            if (retries > 0 && e.code === 'ECONNREFUSED') {
                await new Promise(r => setTimeout(r, 1000));
                return this.run(tc, ep, retries - 1);
            }
            return {
                id: (0, uuid_1.v4)(),
                endpoint: ep,
                name: tc.name,
                status: 'error',
                error: e.code === 'ECONNREFUSED' ? 'Server not running (Connection Refused)' : e.message,
                executedAt: new Date()
            };
        }
    }
}
exports.Executor = Executor;
//# sourceMappingURL=executor.js.map