"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generator = void 0;
const uuid_1 = require("uuid");
class Generator {
    constructor(config) {
        this.config = config;
    }
    generateAll(endpoint) {
        const cases = [];
        // 1. Valid Request
        cases.push(this.createValid(endpoint));
        // 2. Missing Fields (if any)
        if (endpoint.bodyFields.length > 0) {
            cases.push(this.createMissing(endpoint));
        }
        // 3. Unauthorized (if auth required)
        if (endpoint.requiresAuth) {
            cases.push(this.createUnauthorized(endpoint));
        }
        return cases;
    }
    createValid(ep) {
        let body = {};
        if (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH') {
            if (ep.bodyFields.length === 0) {
                body = { "test": "data" };
            }
            else {
                ep.bodyFields.forEach(f => body[f] = this.exampleFor(f));
            }
        }
        else {
            body = undefined;
        }
        return {
            id: (0, uuid_1.v4)(),
            name: `Valid ${ep.method} ${ep.path}`,
            endpointId: ep.id,
            method: ep.method,
            url: this.interpolate(ep.url, ep.params),
            headers: this.getHeaders(ep),
            body,
            expectedStatus: ep.method === 'POST' ? 201 : 200
        };
    }
    createMissing(ep) {
        const body = {};
        ep.bodyFields.slice(1).forEach(f => body[f] = this.exampleFor(f)); // Skip first field
        return {
            id: (0, uuid_1.v4)(),
            name: `Missing ${ep.bodyFields[0]}`,
            endpointId: ep.id,
            method: ep.method,
            url: this.interpolate(ep.url, ep.params),
            headers: this.getHeaders(ep),
            body: ep.method !== 'GET' ? body : undefined,
            expectedStatus: 400
        };
    }
    createUnauthorized(ep) {
        return {
            id: (0, uuid_1.v4)(),
            name: 'Unauthorized Request',
            endpointId: ep.id,
            method: ep.method,
            url: this.interpolate(ep.url, ep.params),
            headers: {}, // Empty headers
            expectedStatus: 401
        };
    }
    getHeaders(ep) {
        const h = { 'Content-Type': 'application/json' };
        if (ep.requiresAuth) {
            if (this.config.authToken) {
                h['Authorization'] = `Bearer ${this.config.authToken}`;
            }
            else {
                h['Authorization'] = `Bearer test_token`;
            }
        }
        return h;
    }
    interpolate(url, params) {
        let u = url;
        params.forEach(p => {
            u = u.replace(`:${p}`, '1');
            u = u.replace(`{${p}}`, '1');
            u = u.replace(`<${p}>`, '1');
        });
        // In case no params were extracted but it's still generic
        u = u.replace(/:[a-zA-Z0-9_]+/g, '1');
        u = u.replace(/\{[a-zA-Z0-9_]+\}/g, '1');
        return u;
    }
    exampleFor(name) {
        if (/email/i.test(name))
            return 'user@example.com';
        if (/id$/i.test(name))
            return 1;
        if (/password/i.test(name))
            return 'Secret123!';
        return `test_${name}`;
    }
}
exports.Generator = Generator;
//# sourceMappingURL=generator.js.map