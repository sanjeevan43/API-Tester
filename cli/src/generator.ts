// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Smart Test Case Generator
// ══════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';
import { Endpoint, TestCase, Config, HttpMethod } from './types';

export class Generator {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Generate ALL test cases for an endpoint (positive + negative + edge)
   */
  generateAll(endpoint: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // Dispatch to method-specific strategy
    switch (endpoint.method) {
      case 'GET':     cases.push(...this.generateGET(endpoint)); break;
      case 'POST':    cases.push(...this.generatePOST(endpoint)); break;
      case 'PUT':     cases.push(...this.generatePUT(endpoint)); break;
      case 'PATCH':   cases.push(...this.generatePATCH(endpoint)); break;
      case 'DELETE':  cases.push(...this.generateDELETE(endpoint)); break;
      case 'HEAD':    cases.push(...this.generateHEAD(endpoint)); break;
      case 'OPTIONS': cases.push(...this.generateOPTIONS(endpoint)); break;
    }

    // Auth tests (common to all)
    if (endpoint.requiresAuth) {
      cases.push(this.createUnauthorized(endpoint));
      cases.push(this.createForbidden(endpoint));
    }

    return cases;
  }

  // ── Method-Specific Strategies ────────────────────────────────

  private generateGET(ep: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // ✅ Positive: valid GET request
    cases.push(this.createCase(ep, {
      name: `GET ${ep.path} — Valid Request`,
      category: 'positive',
      expectedStatus: 200,
      description: 'Standard GET request with valid parameters'
    }));

    // ❌ Negative: missing required path params
    if (ep.params.length > 0) {
      cases.push(this.createCase(ep, {
        name: `GET ${ep.path} — Invalid Path Param`,
        category: 'negative',
        expectedStatus: 400,
        description: 'GET with invalid path parameter value',
        overrideParams: { useInvalid: true }
      }));

      cases.push(this.createCase(ep, {
        name: `GET ${ep.path} — Non-existent Resource`,
        category: 'negative',
        expectedStatus: 404,
        description: 'GET with non-existent resource ID',
        overrideParams: { useNotFound: true }
      }));
    }

    // ❌ Negative: missing query params
    if (ep.query.length > 0) {
      cases.push(this.createCase(ep, {
        name: `GET ${ep.path} — Missing Query Params`,
        category: 'negative',
        expectedStatus: 400,
        description: 'GET request without required query parameters',
        skipQuery: true
      }));
    }

    // 🔲 Edge: special characters in params
    if (ep.params.length > 0) {
      cases.push(this.createCase(ep, {
        name: `GET ${ep.path} — Special Chars in Param`,
        category: 'edge',
        expectedStatus: 400,
        description: 'GET with special characters in path parameter',
        overrideParams: { useSpecialChars: true }
      }));
    }

    return cases;
  }

  private generatePOST(ep: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // ✅ Positive: valid POST
    cases.push(this.createCase(ep, {
      name: `POST ${ep.path} — Valid Create`,
      category: 'positive',
      expectedStatus: 201,
      description: 'Standard POST with valid body'
    }));

    // ❌ Negative: empty body
    cases.push(this.createCase(ep, {
      name: `POST ${ep.path} — Empty Body`,
      category: 'negative',
      expectedStatus: 400,
      description: 'POST request with empty body',
      emptyBody: true
    }));

    // ❌ Negative: missing required fields
    if (ep.bodyFields.length > 0) {
      cases.push(this.createCase(ep, {
        name: `POST ${ep.path} — Missing Required Fields`,
        category: 'negative',
        expectedStatus: 400,
        description: 'POST with missing required body fields',
        skipFirstField: true
      }));

      // ❌ Negative: invalid data types
      cases.push(this.createCase(ep, {
        name: `POST ${ep.path} — Invalid Data Types`,
        category: 'negative',
        expectedStatus: 400,
        description: 'POST with incorrect data types for body fields',
        useInvalidTypes: true
      }));
    }

    // 🔲 Edge: null values
    cases.push(this.createCase(ep, {
      name: `POST ${ep.path} — Null Values`,
      category: 'edge',
      expectedStatus: 400,
      description: 'POST with null values in all body fields',
      useNullValues: true
    }));

    // 🔲 Edge: large payload
    cases.push(this.createCase(ep, {
      name: `POST ${ep.path} — Large Payload`,
      category: 'edge',
      expectedStatus: 413,
      description: 'POST with an exceptionally large payload',
      useLargePayload: true
    }));

    return cases;
  }

  private generatePUT(ep: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // ✅ Positive: valid full update
    cases.push(this.createCase(ep, {
      name: `PUT ${ep.path} — Valid Full Update`,
      category: 'positive',
      expectedStatus: 200,
      description: 'Full resource update with all fields'
    }));

    // ❌ Negative: empty body
    cases.push(this.createCase(ep, {
      name: `PUT ${ep.path} — Empty Body`,
      category: 'negative',
      expectedStatus: 400,
      description: 'PUT request with empty body',
      emptyBody: true
    }));

    // ❌ Negative: non-existent resource
    if (ep.params.length > 0) {
      cases.push(this.createCase(ep, {
        name: `PUT ${ep.path} — Non-existent Resource`,
        category: 'negative',
        expectedStatus: 404,
        description: 'PUT to a resource that does not exist',
        overrideParams: { useNotFound: true }
      }));
    }

    // 🔲 Edge: null values
    cases.push(this.createCase(ep, {
      name: `PUT ${ep.path} — Null Values`,
      category: 'edge',
      expectedStatus: 400,
      description: 'PUT with null values',
      useNullValues: true
    }));

    return cases;
  }

  private generatePATCH(ep: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // ✅ Positive: valid partial update
    cases.push(this.createCase(ep, {
      name: `PATCH ${ep.path} — Valid Partial Update`,
      category: 'positive',
      expectedStatus: 200,
      description: 'Partial resource update with subset of fields'
    }));

    // ❌ Negative: empty body
    cases.push(this.createCase(ep, {
      name: `PATCH ${ep.path} — Empty Body`,
      category: 'negative',
      expectedStatus: 400,
      description: 'PATCH request with empty body',
      emptyBody: true
    }));

    // ❌ Negative: non-existent resource
    if (ep.params.length > 0) {
      cases.push(this.createCase(ep, {
        name: `PATCH ${ep.path} — Non-existent Resource`,
        category: 'negative',
        expectedStatus: 404,
        description: 'PATCH to a non-existent resource',
        overrideParams: { useNotFound: true }
      }));
    }

    return cases;
  }

  private generateDELETE(ep: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // ✅ Positive: valid DELETE
    cases.push(this.createCase(ep, {
      name: `DELETE ${ep.path} — Valid Delete`,
      category: 'positive',
      expectedStatus: 200,
      description: 'Delete an existing resource'
    }));

    // ❌ Negative: non-existent resource
    if (ep.params.length > 0) {
      cases.push(this.createCase(ep, {
        name: `DELETE ${ep.path} — Non-existent Resource`,
        category: 'negative',
        expectedStatus: 404,
        description: 'Delete a resource that does not exist',
        overrideParams: { useNotFound: true }
      }));

      // ❌ Negative: invalid ID
      cases.push(this.createCase(ep, {
        name: `DELETE ${ep.path} — Invalid ID`,
        category: 'negative',
        expectedStatus: 400,
        description: 'Delete with an invalid resource ID',
        overrideParams: { useInvalid: true }
      }));
    }

    return cases;
  }

  private generateHEAD(ep: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // ✅ Positive: valid HEAD
    cases.push(this.createCase(ep, {
      name: `HEAD ${ep.path} — Header Validation`,
      category: 'positive',
      expectedStatus: 200,
      description: 'HEAD request to validate response headers only'
    }));

    return cases;
  }

  private generateOPTIONS(ep: Endpoint): TestCase[] {
    const cases: TestCase[] = [];

    // ✅ Positive: valid OPTIONS
    cases.push(this.createCase(ep, {
      name: `OPTIONS ${ep.path} — CORS Validation`,
      category: 'positive',
      expectedStatus: 204,
      description: 'OPTIONS preflight request for CORS validation'
    }));

    return cases;
  }

  // ── Common Unauthorized / Forbidden ───────────────────────────

  private createUnauthorized(ep: Endpoint): TestCase {
    return {
      id: uuidv4(),
      name: `${ep.method} ${ep.path} — Unauthorized (No Token)`,
      category: 'negative',
      endpointId: ep.id,
      method: ep.method,
      url: this.interpolateUrl(ep.url, ep.params),
      headers: { 'Content-Type': 'application/json' },  // No auth header
      body: this.needsBody(ep.method) ? this.buildBody(ep.bodyFields) : undefined,
      expectedStatus: 401,
      description: 'Request without authorization token'
    };
  }

  private createForbidden(ep: Endpoint): TestCase {
    return {
      id: uuidv4(),
      name: `${ep.method} ${ep.path} — Forbidden (Bad Token)`,
      category: 'negative',
      endpointId: ep.id,
      method: ep.method,
      url: this.interpolateUrl(ep.url, ep.params),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-xxx'
      },
      body: this.needsBody(ep.method) ? this.buildBody(ep.bodyFields) : undefined,
      expectedStatus: 403,
      description: 'Request with an invalid/expired authorization token'
    };
  }

  // ── Test Case Factory ─────────────────────────────────────────

  private createCase(ep: Endpoint, opts: {
    name: string;
    category: 'positive' | 'negative' | 'edge';
    expectedStatus: number;
    description: string;
    emptyBody?: boolean;
    skipFirstField?: boolean;
    useInvalidTypes?: boolean;
    useNullValues?: boolean;
    useLargePayload?: boolean;
    skipQuery?: boolean;
    overrideParams?: { useInvalid?: boolean; useNotFound?: boolean; useSpecialChars?: boolean };
  }): TestCase {
    // Build URL
    let url: string;
    if (opts.overrideParams?.useInvalid) {
      url = this.interpolateUrl(ep.url, ep.params, 'abc!@#');
    } else if (opts.overrideParams?.useNotFound) {
      url = this.interpolateUrl(ep.url, ep.params, '999999');
    } else if (opts.overrideParams?.useSpecialChars) {
      url = this.interpolateUrl(ep.url, ep.params, '<script>alert(1)</script>');
    } else {
      url = this.interpolateUrl(ep.url, ep.params);
    }

    // Build body
    let body: any = undefined;
    if (this.needsBody(ep.method)) {
      if (opts.emptyBody) {
        body = {};
      } else if (opts.skipFirstField) {
        body = this.buildBody(ep.bodyFields.slice(1));
      } else if (opts.useInvalidTypes) {
        body = this.buildInvalidBody(ep.bodyFields);
      } else if (opts.useNullValues) {
        body = this.buildNullBody(ep.bodyFields);
      } else if (opts.useLargePayload) {
        body = this.buildLargePayload(ep.bodyFields);
      } else {
        body = this.buildBody(ep.bodyFields);
      }
    }

    // Build query params
    let queryParams: Record<string, string> | undefined;
    if (ep.query.length > 0 && !opts.skipQuery) {
      queryParams = {};
      ep.query.forEach(q => queryParams![q] = this.exampleFor(q));
    }

    // Build headers
    const headers = this.buildHeaders(ep, opts.category === 'negative' && opts.name.includes('Unauthorized'));

    return {
      id: uuidv4(),
      name: opts.name,
      category: opts.category,
      endpointId: ep.id,
      method: ep.method,
      url,
      headers,
      body,
      queryParams,
      expectedStatus: opts.expectedStatus,
      description: opts.description
    };
  }

  // ── Body Builders ─────────────────────────────────────────────

  private buildBody(fields: string[]): any {
    const body: any = {};
    fields.forEach(f => body[f] = this.exampleFor(f));
    return body;
  }

  private buildInvalidBody(fields: string[]): any {
    const body: any = {};
    fields.forEach(f => {
      if (/email/i.test(f)) body[f] = 12345;
      else if (/id$/i.test(f)) body[f] = 'not-a-number';
      else if (/password/i.test(f)) body[f] = true;
      else if (/age/i.test(f)) body[f] = 'old';
      else if (/name/i.test(f)) body[f] = 99999;
      else body[f] = { invalid: true };
    });
    return body;
  }

  private buildNullBody(fields: string[]): any {
    const body: any = {};
    fields.forEach(f => body[f] = null);
    return body;
  }

  private buildLargePayload(fields: string[]): any {
    const body: any = {};
    const bigString = 'x'.repeat(100000);
    fields.forEach(f => body[f] = bigString);
    if (fields.length === 0) {
      body['data'] = bigString;
    }
    return body;
  }

  // ── URL Interpolation ─────────────────────────────────────────

  private interpolateUrl(url: string, params: string[], overrideValue?: string): string {
    let u = url;
    params.forEach(p => {
      u = u.replace(`:${p}`, encodeURIComponent(overrideValue ?? '1'));
    });
    return u;
  }

  // ── Header Builder ────────────────────────────────────────────

  private buildHeaders(ep: Endpoint, skipAuth: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (ep.requiresAuth && !skipAuth && this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    return headers;
  }

  // ── Smart Example Values ──────────────────────────────────────

  private exampleFor(fieldName: string): any {
    const name = fieldName.toLowerCase();

    if (/email/.test(name)) return 'user@example.com';
    if (/password|passwd|pass/.test(name)) return 'SecureP@ss123!';
    if (/username|user_name/.test(name)) return 'testuser';
    if (/^name$|first.?name/.test(name)) return 'John';
    if (/last.?name|surname/.test(name)) return 'Doe';
    if (/phone|mobile|tel/.test(name)) return '+1234567890';
    if (/age/.test(name)) return 25;
    if (/address/.test(name)) return '123 Test Street';
    if (/city/.test(name)) return 'TestCity';
    if (/country/.test(name)) return 'US';
    if (/zip|postal/.test(name)) return '10001';
    if (/url|link|website/.test(name)) return 'https://example.com';
    if (/title/.test(name)) return 'Test Title';
    if (/desc|description/.test(name)) return 'Test description text';
    if (/content|message|body|text/.test(name)) return 'Test content message';
    if (/token/.test(name)) return 'test-token-abc123';
    if (/id$/.test(name)) return 1;
    if (/price|amount|cost/.test(name)) return 29.99;
    if (/quantity|qty|count/.test(name)) return 1;
    if (/date/.test(name)) return '2024-01-15';
    if (/time/.test(name)) return '14:30:00';
    if (/status/.test(name)) return 'active';
    if (/type|category/.test(name)) return 'general';
    if (/page/.test(name)) return '1';
    if (/limit|size/.test(name)) return '10';
    if (/sort|order/.test(name)) return 'asc';
    if (/search|q|query|keyword/.test(name)) return 'test';

    return `test_${fieldName}`;
  }

  private needsBody(method: HttpMethod): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(method);
  }
}
