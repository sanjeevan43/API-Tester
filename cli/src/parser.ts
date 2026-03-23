// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Route Extraction / Parser Engine
// ══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Endpoint, HttpMethod, Config } from './types';

// ── Framework Route Patterns ──────────────────────────────────
interface RoutePattern {
  framework: string;
  regex: RegExp;
  methodGroup: number;
  pathGroup: number;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  // Express / Koa / Hapi / Generic Node
  {
    framework: 'express',
    regex: /(?:app|router|server|route)\.(?:get|post|put|patch|delete|head|options)\s*\(\s*['\"`]([^'\"`]+)['\"`]/gi,
    methodGroup: 0,  // special: extracted from the dot-method name
    pathGroup: 1
  },
  // Fastify
  {
    framework: 'fastify',
    regex: /fastify\.(?:get|post|put|patch|delete|head|options)\s*\(\s*['\"`]([^'\"`]+)['\"`]/gi,
    methodGroup: 0,
    pathGroup: 1
  },
  // Flask (@app.route or @blueprint.route)
  {
    framework: 'flask',
    regex: /@(?:app|blueprint)\s*\.route\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?/gi,
    methodGroup: 2,
    pathGroup: 1
  },
  // FastAPI decorators
  {
    framework: 'fastapi',
    regex: /@(?:app|router)\.(?:get|post|put|patch|delete|head|options)\s*\(\s*['"]([^'"]+)['"]/gi,
    methodGroup: 0,
    pathGroup: 1
  },
  // Django (path / url patterns)
  {
    framework: 'django',
    regex: /(?:path|url)\s*\(\s*['"]([^'"]+)['"]/gi,
    methodGroup: 0,
    pathGroup: 1
  },
  // Gin (Go)
  {
    framework: 'gin',
    regex: /(?:r|router|group|api|v1|v2)\.(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/gi,
    methodGroup: 0,
    pathGroup: 1
  },
  // Echo (Go)
  {
    framework: 'echo',
    regex: /e\.(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/gi,
    methodGroup: 0,
    pathGroup: 1
  },
  // Vapor (Swift)
  {
    framework: 'vapor',
    regex: /(?:app|routes|grouped)\.(?:get|post|put|patch|delete|head|options)\s*\(\s*"([^"]+)"/gi,
    methodGroup: 0,
    pathGroup: 1
  }
];

// ── Body Field Extraction ─────────────────────────────────────
const BODY_PATTERNS = [
  /const\s*\{([^}]+)\}\s*=\s*req\.body/g,
  /let\s*\{([^}]+)\}\s*=\s*req\.body/g,
  /req\.body\.([\w]+)/g,
  /request\.json\.get\s*\(\s*['"]([\w]+)['"]/g,
  /request\.json\s*\[\s*['"]([\w]+)['"]\s*\]/g,
  /request\.form\.get\s*\(\s*['"]([\w]+)['"]/g,
  /request\.data\.get\s*\(\s*['"]([\w]+)['"]/g,
  /request\.POST\.get\s*\(\s*['"]([\w]+)['"]/g,
  /(\w+)\s*=\s*data\.get\s*\(\s*['"]\w+['"]/g,
];

// ── Auth Detection ────────────────────────────────────────────
const AUTH_PATTERNS = [
  /authenticate/i,
  /authorize/i,
  /requireAuth/i,
  /isAuthenticated/i,
  /passport\.authenticate/i,
  /jwt\.verify/i,
  /jwt\.sign/i,
  /@login_required/i,
  /@permission_required/i,
  /middleware.*auth/i,
  /req\.user/i,
  /Bearer/i,
  /token_required/i,
  /IsAuthenticated/i,
  /permission_classes/i,
];

// ── Header Detection ──────────────────────────────────────────
const HEADER_PATTERNS = [
  /req\.headers?\[?\s*['"]([\w-]+)['"]/gi,
  /request\.headers?\.\s*get\s*\(\s*['"]([\w-]+)['"]/gi,
];

export class Parser {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Parse a single file and extract all API endpoints
   */
  parseFile(filePath: string): Endpoint[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const endpoints: Endpoint[] = [];

    for (const pattern of ROUTE_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const extracted = this.extractMethodAndPath(match, pattern, content);
        if (!extracted) continue;

        const { methods, rawPath } = extracted;

        // Get surrounding context (20 lines after route definition)
        const context = this.getContext(content, match.index, 25);

        for (const method of methods) {
          const normalizedPath = this.normalizePath(rawPath, pattern.framework);

          endpoints.push({
            id: uuidv4(),
            method,
            path: normalizedPath,
            url: `${this.config.baseURL}${normalizedPath}`,
            file: filePath,
            framework: pattern.framework,
            params: this.extractPathParams(rawPath, pattern.framework),
            query: this.extractQueryParams(context),
            bodyFields: this.extractBodyFields(context),
            headers: this.extractHeaders(context),
            requiresAuth: this.detectAuth(context)
          });
        }
      }
    }

    return endpoints;
  }

  // ── Private Helpers ───────────────────────────────────────────

  private extractMethodAndPath(
    match: RegExpExecArray,
    pattern: RoutePattern,
    content: string
  ): { methods: HttpMethod[]; rawPath: string } | null {
    const rawPath = match[pattern.pathGroup];
    if (!rawPath) return null;

    // For frameworks where method is in the function name (e.g. app.get, router.post)
    if (pattern.methodGroup === 0) {
      // Extract method from the matched string itself
      const methodMatch = match[0].match(/\.(get|post|put|patch|delete|head|options)\s*\(/i);
      if (methodMatch) {
        const method = this.normalizeMethod(methodMatch[1]);
        return method ? { methods: [method], rawPath } : null;
      }

      // Django — default to GET
      if (pattern.framework === 'django') {
        return { methods: ['GET' as HttpMethod], rawPath };
      }

      return null;
    }

    // Flask-style: methods in list, e.g. methods=['GET', 'POST']
    if (pattern.framework === 'flask') {
      const methodsStr = match[pattern.methodGroup];
      if (methodsStr) {
        const methods = methodsStr
          .replace(/['"]/g, '')
          .split(',')
          .map(s => this.normalizeMethod(s.trim()))
          .filter(Boolean) as HttpMethod[];
        return methods.length > 0 ? { methods, rawPath } : null;
      }
      return { methods: ['GET' as HttpMethod], rawPath };
    }

    const rawMethod = match[pattern.methodGroup];
    if (!rawMethod) return null;

    const method = this.normalizeMethod(rawMethod);
    return method ? { methods: [method], rawPath } : null;
  }

  private normalizeMethod(raw: string): HttpMethod | null {
    const m = raw.toUpperCase().trim() as HttpMethod;
    const valid: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    return valid.includes(m) ? m : null;
  }

  private normalizePath(raw: string, framework: string): string {
    let p = raw.trim();

    // Flask / FastAPI: <int:id> → :id
    if (framework === 'flask' || framework === 'fastapi') {
      p = p.replace(/<(?:\w+:)?(\w+)>/g, ':$1');
    }

    // Gin / Echo: :id already uses colon notation
    // Vapor: :id is also colon notation

    // Django: (?P<id>\d+) → :id
    if (framework === 'django') {
      p = p.replace(/\(\?P<(\w+)>[^)]*\)/g, ':$1');
      p = p.replace(/<(\w+)>/g, ':$1');
    }

    if (!p.startsWith('/')) p = '/' + p;

    // Remove trailing slash (except root)
    if (p.length > 1 && p.endsWith('/')) {
      p = p.slice(0, -1);
    }

    return p;
  }

  private extractPathParams(rawPath: string, framework: string): string[] {
    const params: string[] = [];

    // Colon-style: :id, :slug
    const colonMatches = rawPath.matchAll(/:(\w+)/g);
    for (const m of colonMatches) params.push(m[1]);

    // Flask-style: <int:id>, <id>
    const angleMatches = rawPath.matchAll(/<(?:\w+:)?(\w+)>/g);
    for (const m of angleMatches) {
      if (!params.includes(m[1])) params.push(m[1]);
    }

    // Django-style: (?P<id>\d+)
    const djangoMatches = rawPath.matchAll(/\(\?P<(\w+)>/g);
    for (const m of djangoMatches) {
      if (!params.includes(m[1])) params.push(m[1]);
    }

    return params;
  }

  private extractQueryParams(context: string): string[] {
    const params: string[] = [];

    // Node: req.query.x
    const nodeMatches = context.matchAll(/req\.query\.(\w+)/g);
    for (const m of nodeMatches) params.push(m[1]);

    // Node: req.query['x'] or req.query["x"]
    const nodeBracket = context.matchAll(/req\.query\s*\[\s*['"](\w+)['"]\s*\]/g);
    for (const m of nodeBracket) params.push(m[1]);

    // Flask: request.args.get('x')
    const flaskMatches = context.matchAll(/request\.args\.get\s*\(\s*['"](\w+)['"]/g);
    for (const m of flaskMatches) params.push(m[1]);

    // FastAPI: Query(...)
    const fastapiMatches = context.matchAll(/(\w+)\s*:\s*\w+\s*=\s*Query\s*\(/g);
    for (const m of fastapiMatches) params.push(m[1]);

    return [...new Set(params)];
  }

  private extractBodyFields(context: string): string[] {
    const fields: string[] = [];

    for (const pat of BODY_PATTERNS) {
      const re = new RegExp(pat.source, pat.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(context)) !== null) {
        const raw = m[1];
        if (raw.includes(',')) {
          // Destructured: const { name, email, password } = req.body
          const names = raw.split(',').map(s => s.trim().split(':')[0].split('=')[0].trim());
          fields.push(...names);
        } else {
          fields.push(raw.trim());
        }
      }
    }

    return [...new Set(fields)].filter(Boolean);
  }

  private extractHeaders(context: string): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const pat of HEADER_PATTERNS) {
      const re = new RegExp(pat.source, pat.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(context)) !== null) {
        const headerName = m[1].toLowerCase();
        if (headerName !== 'content-type') {
          headers[m[1]] = '';
        }
      }
    }

    return headers;
  }

  private detectAuth(context: string): boolean {
    return AUTH_PATTERNS.some(p => p.test(context));
  }

  private getContext(content: string, matchIndex: number, lines: number): string {
    const before = content.substring(0, matchIndex);
    const startLineNum = before.split('\n').length;
    const allLines = content.split('\n');
    return allLines.slice(Math.max(0, startLineNum - 3), startLineNum + lines).join('\n');
  }
}
