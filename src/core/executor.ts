import axios, { AxiosRequestConfig } from 'axios';
import { TestCase, TestResult, Endpoint } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Config } from './types';

export class Executor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async run(tc: TestCase, ep: Endpoint, retries = 0): Promise<TestResult> {
    if (!this.config.baseURL) {
      return {
        id: uuidv4(),
        endpoint: ep,
        name: tc.name,
        status: 'error',
        error: 'Base URL is required for testing. Please check your settings.',
        executedAt: new Date()
      };
    }

    const startedAt = Date.now();
    
    const reqConfig: AxiosRequestConfig = {
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
      const resp = await axios(reqConfig);
      const duration = Date.now() - startedAt;

      // Real response validation
      let status = 'fail';
      // Consider status codes 2xx, 3xx as pass by default.
      if (resp.status >= 200 && resp.status < 400) status = 'pass';
      // Specific checks
      if (tc.expectedStatus === 400 && resp.status === 400) status = 'pass';
      if (tc.expectedStatus === 401 && resp.status === 401) status = 'pass';
      if (resp.status === tc.expectedStatus) status = 'pass';

      return {
        id: uuidv4(),
        endpoint: ep,
        name: tc.name,
        status: status as 'pass' | 'fail',
        statusCode: resp.status,
        responseTime: duration,
        executedAt: new Date()
      };
    } catch (e: any) {
      if (retries > 0 && e.code === 'ECONNREFUSED') {
         await new Promise(r => setTimeout(r, 1000));
         return this.run(tc, ep, retries - 1);
      }
      return {
        id: uuidv4(),
        endpoint: ep,
        name: tc.name,
        status: 'error',
        error: e.code === 'ECONNREFUSED' ? 'Server not running (Connection Refused)' : e.message,
        executedAt: new Date()
      };
    }
  }
}
