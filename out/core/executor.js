"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Executor = void 0;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
class Executor {
    constructor(timeout) {
        this.timeout = timeout;
    }
    async run(tc, ep) {
        const startedAt = Date.now();
        const config = {
            method: tc.method,
            url: tc.url,
            headers: tc.headers,
            data: tc.body,
            params: tc.queryParams,
            timeout: this.timeout,
            validateStatus: () => true // Allow any status for testing
        };
        try {
            const resp = await (0, axios_1.default)(config);
            const duration = Date.now() - startedAt;
            return {
                id: (0, uuid_1.v4)(),
                endpoint: ep,
                name: tc.name,
                status: resp.status === tc.expectedStatus ? 'pass' : 'fail',
                statusCode: resp.status,
                responseTime: duration,
                executedAt: new Date()
            };
        }
        catch (e) {
            return {
                id: (0, uuid_1.v4)(),
                endpoint: ep,
                name: tc.name,
                status: 'error',
                error: e.message,
                executedAt: new Date()
            };
        }
    }
}
exports.Executor = Executor;
//# sourceMappingURL=executor.js.map