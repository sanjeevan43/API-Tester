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
exports.Scanner = void 0;
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const uuid_1 = require("uuid");
const ROUTE_PATTERNS = [
    { framework: 'express', regex: /(?:app|router|server)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi, methodGroup: 1, pathGroup: 2 },
    { framework: 'fastify', regex: /fastify\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi, methodGroup: 1, pathGroup: 2 },
    { framework: 'flask', regex: /@(?:app|blueprint)\s*\.route\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?/gi, methodGroup: 2, pathGroup: 1 },
    { framework: 'fastapi', regex: /@(?:app|router)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"]([^'"]+)['"]/gi, methodGroup: 1, pathGroup: 2 },
    { framework: 'gin', regex: /(?:r|router|group)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/gi, methodGroup: 1, pathGroup: 2 },
    { framework: 'echo', regex: /e\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/gi, methodGroup: 1, pathGroup: 2 },
];
const BODY_PATTERNS = [
    /const\s*\{([^}]+)\}\s*=\s*req\.body/g,
    /req\.body\.(\w+)/g,
    /request\.json\.get\s*\(\s*['"](\w+)['"]/g,
];
const AUTH_PATTERNS = [
    /authenticate/i, /authorize/i, /requireAuth/i, /passport\.authenticate/i, /jwt\.verify/i, /@login_required/i, /middleware.*auth/i
];
class Scanner {
    constructor(config) {
        this.config = config;
    }
    scanWorkspace(cwd) {
        const endpoints = [];
        const files = (0, glob_1.globSync)(this.config.include ?? [], {
            cwd,
            ignore: this.config.exclude,
            absolute: true
        });
        for (const file of files) {
            endpoints.push(...this.scanFile(file));
        }
        return this.deduplicate(endpoints);
    }
    scanFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const endpoints = [];
        for (const pattern of ROUTE_PATTERNS) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;
            while ((match = regex.exec(content)) !== null) {
                const rawMethod = match[pattern.methodGroup] ?? 'GET';
                const rawPath = match[pattern.pathGroup] ?? '/';
                const method = this.normalizeMethod(rawMethod);
                if (!method)
                    continue;
                // Context check for body & auth (~20 lines)
                const lines = content.substring(0, match.index).split('\n');
                const startLine = lines.length;
                const allLines = content.split('\n');
                const context = allLines.slice(startLine - 1, startLine + 20).join('\n');
                endpoints.push({
                    id: (0, uuid_1.v4)(),
                    method,
                    path: this.normalizePath(rawPath, pattern.framework),
                    url: `${this.config.baseURL}${this.normalizePath(rawPath, pattern.framework)}`,
                    framework: pattern.framework,
                    params: this.extractPathParams(rawPath),
                    query: this.extractQueryParams(context),
                    bodyFields: this.extractBodyFields(context),
                    requiresAuth: this.detectAuth(context)
                });
            }
        }
        return endpoints;
    }
    normalizeMethod(raw) {
        const m = raw.toUpperCase();
        const valid = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
        return valid.includes(m) ? m : null;
    }
    normalizePath(raw, framework) {
        let p = raw.trim();
        if (framework === 'flask' || framework === 'fastapi') {
            p = p.replace(/<(?:\w+:)?(\w+)>/g, ':$1'); // <int:id> -> :id
        }
        if (!p.startsWith('/'))
            p = '/' + p;
        return p;
    }
    extractPathParams(path) {
        const matches = path.matchAll(/:(\w+)/g);
        return Array.from(matches).map(m => m[1]);
    }
    extractQueryParams(context) {
        const matches = context.matchAll(/req\.query\.(\w+)|request\.args\.get\s*\(\s*['"](\w+)['"]/g);
        return Array.from(matches).map(m => m[1] || m[2]).filter(Boolean);
    }
    extractBodyFields(context) {
        const fields = [];
        for (const pat of BODY_PATTERNS) {
            const re = new RegExp(pat.source, pat.flags);
            let m;
            while ((m = re.exec(context)) !== null) {
                const raw = m[1];
                const names = raw.includes(',') ? raw.split(',').map(s => s.trim()) : [raw.trim()];
                fields.push(...names);
            }
        }
        return Array.from(new Set(fields)).filter(Boolean);
    }
    detectAuth(context) {
        return AUTH_PATTERNS.some(p => p.test(context));
    }
    deduplicate(endpoints) {
        const seen = new Set();
        return endpoints.filter(e => {
            const key = `${e.method}:${e.path}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
}
exports.Scanner = Scanner;
//# sourceMappingURL=scanner.js.map