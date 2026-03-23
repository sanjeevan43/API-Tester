// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Response Validator
// ══════════════════════════════════════════════════════════════

import { TestResult } from './types';

export interface ValidationIssue {
  type: 'status' | 'timing' | 'schema' | 'unexpected';
  severity: 'warning' | 'error';
  message: string;
}

export class Validator {

  /**
   * Additional response validations beyond status code matching
   */
  validate(result: TestResult): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Response time check
    if (result.responseTime && result.responseTime > 3000) {
      issues.push({
        type: 'timing',
        severity: 'warning',
        message: `Slow response: ${result.responseTime}ms (threshold: 3000ms)`
      });
    }

    // 2. Unexpected 5xx errors
    if (result.statusCode && result.statusCode >= 500) {
      issues.push({
        type: 'unexpected',
        severity: 'error',
        message: `Server error ${result.statusCode} — possible bug or unhandled exception`
      });
    }

    // 3. Check for empty response body on success GET
    if (
      result.endpoint.method === 'GET' &&
      result.statusCode === 200 &&
      result.responseBody !== undefined
    ) {
      if (
        result.responseBody === null ||
        result.responseBody === '' ||
        (typeof result.responseBody === 'object' && Object.keys(result.responseBody).length === 0)
      ) {
        issues.push({
          type: 'schema',
          severity: 'warning',
          message: 'GET 200 returned an empty response body'
        });
      }
    }

    // 4. Missing content-type header on JSON responses
    if (result.responseHeaders) {
      const contentType = result.responseHeaders['content-type'] || '';
      if (result.statusCode && result.statusCode < 300 && !contentType.includes('json') && result.endpoint.method !== 'HEAD') {
        issues.push({
          type: 'schema',
          severity: 'warning',
          message: `Response Content-Type is "${contentType}" (expected application/json)`
        });
      }
    }

    // 5. Detect potential breaking changes — unexpected status classes
    if (result.statusCode && result.testCase.expectedStatus) {
      const expectedClass = Math.floor(result.testCase.expectedStatus / 100);
      const actualClass = Math.floor(result.statusCode / 100);

      // Expected 2xx but got 4xx or 5xx = likely breaking change
      if (expectedClass === 2 && (actualClass === 4 || actualClass === 5)) {
        issues.push({
          type: 'unexpected',
          severity: 'error',
          message: `Expected ${result.testCase.expectedStatus} but got ${result.statusCode} — potential breaking change`
        });
      }
    }

    return issues;
  }

  /**
   * Summarize validation issues across all results
   */
  summarizeIssues(results: TestResult[]): { warnings: number; errors: number; issues: ValidationIssue[] } {
    const allIssues: ValidationIssue[] = [];

    for (const result of results) {
      const issues = this.validate(result);
      allIssues.push(...issues);
    }

    return {
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      errors: allIssues.filter(i => i.severity === 'error').length,
      issues: allIssues
    };
  }
}
