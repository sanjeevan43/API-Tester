// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Execution Engine
// ══════════════════════════════════════════════════════════════

import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { TestCase, TestResult, Endpoint, Config } from './types';

export class Executor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Execute a single test case with retry support
   */
  async run(tc: TestCase, ep: Endpoint): Promise<TestResult> {
    let lastError: string | undefined;
    let lastResult: TestResult | undefined;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      lastResult = await this.execute(tc, ep, attempt);

      // If not an error (i.e., we got a response), return immediately
      if (lastResult.status !== 'error') {
        return lastResult;
      }

      lastError = lastResult.error;

      // Wait before retry (exponential backoff)
      if (attempt < this.config.retries) {
        await this.sleep(Math.min(1000 * Math.pow(2, attempt), 5000));
      }
    }

    return lastResult!;
  }

  /**
   * Execute multiple test cases in parallel (with concurrency limit)
   */
  async runParallel(
    testPairs: Array<{ tc: TestCase; ep: Endpoint }>,
    onResult: (result: TestResult) => void,
    concurrency: number = 5
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const queue = [...testPairs];

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const pair = queue.shift();
        if (!pair) break;

        const result = await this.run(pair.tc, pair.ep);
        results.push(result);
        onResult(result);
      }
    });

    await Promise.all(workers);
    return results;
  }

  // ── Private ───────────────────────────────────────────────────

  private async execute(tc: TestCase, ep: Endpoint, attempt: number): Promise<TestResult> {
    const startedAt = Date.now();

    const requestConfig: AxiosRequestConfig = {
      method: tc.method.toLowerCase() as any,
      url: tc.url,
      headers: tc.headers,
      data: tc.body,
      params: tc.queryParams,
      timeout: this.config.timeout,
      validateStatus: () => true, // Accept any status code (we validate ourselves)
      maxRedirects: 5,
      // Don't throw on any status
    };

    try {
      const response = await axios(requestConfig);
      const duration = Date.now() - startedAt;

      const isPassing = this.validateResponse(response.status, tc.expectedStatus);

      return {
        id: uuidv4(),
        testCase: tc,
        endpoint: ep,
        name: tc.name,
        category: tc.category,
        status: isPassing ? 'pass' : 'fail',
        statusCode: response.status,
        responseTime: duration,
        responseBody: this.config.verbose ? response.data : undefined,
        responseHeaders: this.config.verbose ? response.headers as Record<string, string> : undefined,
        executedAt: new Date()
      };
    } catch (err: any) {
      const duration = Date.now() - startedAt;
      const axiosErr = err as AxiosError;

      // Connection refused, timeout, network errors
      let errorMessage = err.message || 'Unknown error';

      if (axiosErr.code === 'ECONNREFUSED') {
        errorMessage = `Connection refused at ${tc.url} — Is the server running?`;
      } else if (axiosErr.code === 'ETIMEDOUT' || axiosErr.code === 'ECONNABORTED') {
        errorMessage = `Request timed out after ${this.config.timeout}ms`;
      } else if (axiosErr.code === 'ENOTFOUND') {
        errorMessage = `Host not found — Check baseURL in config`;
      }

      if (attempt < this.config.retries) {
        errorMessage += ` (attempt ${attempt + 1}/${this.config.retries + 1})`;
      }

      return {
        id: uuidv4(),
        testCase: tc,
        endpoint: ep,
        name: tc.name,
        category: tc.category,
        status: 'error',
        responseTime: duration,
        error: errorMessage,
        executedAt: new Date()
      };
    }
  }

  /**
   * Flexible status validation:
   * - Exact match
   * - Same class (2xx, 4xx, etc.)
   */
  private validateResponse(actual: number, expected: number): boolean {
    // Exact match
    if (actual === expected) return true;

    // Same status class match (e.g., expected 201, got 200 — both 2xx)
    if (Math.floor(actual / 100) === Math.floor(expected / 100)) return true;

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
