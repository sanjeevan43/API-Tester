import { Endpoint, TestCase, Config } from './types';
import { v4 as uuidv4 } from 'uuid';

export class Generator {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  generateAll(endpoint: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

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

  private createValid(ep: Endpoint): TestCase {
    const body: any = {};
    ep.bodyFields.forEach(f => body[f] = this.exampleFor(f));

    return {
      id: uuidv4(),
      name: `Valid ${ep.method} ${ep.path}`,
      endpointId: ep.id,
      method: ep.method,
      url: this.interpolate(ep.url, ep.params),
      headers: this.getHeaders(ep),
      body: ep.method !== 'GET' ? body : undefined,
      expectedStatus: ep.method === 'POST' ? 201 : 200
    };
  }

  private createMissing(ep: Endpoint): TestCase {
    const body: any = {};
    ep.bodyFields.slice(1).forEach(f => body[f] = this.exampleFor(f)); // Skip first field

    return {
      id: uuidv4(),
      name: `Missing ${ep.bodyFields[0]}`,
      endpointId: ep.id,
      method: ep.method,
      url: this.interpolate(ep.url, ep.params),
      headers: this.getHeaders(ep),
      body: ep.method !== 'GET' ? body : undefined,
      expectedStatus: 400
    };
  }

  private createUnauthorized(ep: Endpoint): TestCase {
    return {
      id: uuidv4(),
      name: 'Unauthorized Request',
      endpointId: ep.id,
      method: ep.method,
      url: this.interpolate(ep.url, ep.params),
      headers: {}, // Empty headers
      expectedStatus: 401
    };
  }

  private getHeaders(ep: Endpoint): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ep.requiresAuth && this.config.authToken) {
      h['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    return h;
  }

  private interpolate(url: string, params: string[]): string {
    let u = url;
    params.forEach(p => u = u.replace(`:${p}`, '1')); // Default to 1 for IDs
    return u;
  }

  private exampleFor(name: string): any {
    if (/email/i.test(name)) return 'user@example.com';
    if (/id$/i.test(name)) return 1;
    if (/password/i.test(name)) return 'Secret123!';
    return `test_${name}`;
  }
}
