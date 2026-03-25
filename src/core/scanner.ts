import * as fs from 'fs';
import { globSync } from 'glob';
import { v4 as uuidv4 } from 'uuid';
import { Endpoint, HttpMethod, Config } from './types';

const ROUTE_PATTERNS = [
  { framework: 'express', regex: /(?:app|router|server)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,  methodGroup: 1, pathGroup: 2 },
  { framework: 'fastify', regex: /fastify\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,                 methodGroup: 1, pathGroup: 2 },
  { framework: 'flask',   regex: /@(?:app|blueprint)\s*\.route\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?/gi, methodGroup: 2, pathGroup: 1 },
  { framework: 'fastapi', regex: /@(?:app|router)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"]([^'"]+)['"]/gi,           methodGroup: 1, pathGroup: 2 },
  { framework: 'gin',     regex: /(?:r|router|group)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/gi,               methodGroup: 1, pathGroup: 2 },
  { framework: 'echo',    regex: /e\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/gi,                                methodGroup: 1, pathGroup: 2 },
];

const BODY_PATTERNS = [
  /const\s*\{([^}]+)\}\s*=\s*req\.body/g,
  /req\.body\.(\w+)/g,
  /request\.json\.get\s*\(\s*['"](\w+)['"]/g,
];

const AUTH_PATTERNS = [
  /authenticate/i, /authorize/i, /requireAuth/i, /passport\.authenticate/i, /jwt\.verify/i, /@login_required/i, /middleware.*auth/i
];

export class Scanner {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  scanWorkspace(cwd: string): Endpoint[] {
    const endpoints: Endpoint[] = [];
    const files = globSync(this.config.include ?? [], {
      cwd,
      ignore: this.config.exclude,
      absolute: true
    });

    for (const file of files) {
      endpoints.push(...this.scanFile(file));
    }

    // Force single framework detection if multiple exist
    let deduped = this.deduplicate(endpoints);
    if (deduped.length > 0) {
      const topFramework = deduped.map(e => e.framework).sort((a,b) =>
        deduped.filter(v => v.framework === a).length - deduped.filter(v => v.framework === b).length
      ).pop() || deduped[0].framework;
      deduped = deduped.filter(e => e.framework === topFramework);
    }

    return deduped;
  }

  scanFile(filePath: string): Endpoint[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const endpoints: Endpoint[] = [];
    
    for (const pattern of ROUTE_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const rawMethod = match[pattern.methodGroup] ?? 'GET';
        const rawPath   = match[pattern.pathGroup]   ?? '/';
        const method = this.normalizeMethod(rawMethod);
        if (!method) continue;

        // Context check for body & auth (~20 lines)
        const lines = content.substring(0, match.index).split('\n');
        const startLine = lines.length;
        const allLines = content.split('\n');
        const context = allLines.slice(startLine - 1, startLine + 20).join('\n');

        endpoints.push({
          id: uuidv4(),
          method,
          path: this.normalizePath(rawPath, pattern.framework),
          url: this.normalizePath(rawPath, pattern.framework),
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

  private normalizeMethod(raw: string): HttpMethod | null {
    const m = raw.toUpperCase() as HttpMethod;
    const valid: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    return valid.includes(m) ? m : null;
  }

  private normalizePath(raw: string, framework: string): string {
    let p = raw.trim();
    if (framework === 'flask' || framework === 'fastapi') {
      p = p.replace(/<(?:\w+:)?(\w+)>/g, ':$1'); // <int:id> -> :id
    }
    p = p.replace(/\{(\w+)\}/g, ':$1'); // {id} -> :id
    if (!p.startsWith('/')) p = '/' + p;
    return p;
  }

  private extractPathParams(path: string): string[] {
    const matches = path.matchAll(/[:{<](\w+)[}>]?/g);
    const results = Array.from(matches).map(m => m[1]);
    return results.filter(p => !['int', 'str', 'float', 'uuid'].includes(p)); // filter out typing from python routes
  }

  private extractQueryParams(context: string): string[] {
    const matches = context.matchAll(/req\.query\.(\w+)|request\.args\.get\s*\(\s*['"](\w+)['"]/g);
    return Array.from(matches).map(m => m[1] || m[2]).filter(Boolean);
  }

  private extractBodyFields(context: string): string[] {
    const fields: string[] = [];
    for (const pat of BODY_PATTERNS) {
      const re = new RegExp(pat.source, pat.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(context)) !== null) {
        const raw = m[1];
        const names = raw.includes(',') ? raw.split(',').map(s => s.trim()) : [raw.trim()];
        fields.push(...names);
      }
    }
    return Array.from(new Set(fields)).filter(Boolean);
  }

  private detectAuth(context: string): boolean {
    return AUTH_PATTERNS.some(p => p.test(context));
  }

  private deduplicate(endpoints: Endpoint[]): Endpoint[] {
    const seen = new Set();
    return endpoints.filter(e => {
      const key = `${e.method}:${e.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
