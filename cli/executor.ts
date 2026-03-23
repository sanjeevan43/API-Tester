import axios, { AxiosRequestConfig } from 'axios';
import { TestCase, TestResult, Endpoint } from './types';
import { v4 as uuidv4 } from 'uuid';

export class Executor {
  private timeout: number;

  constructor(timeout: number) {
    this.timeout = timeout;
  }

  async run(tc: TestCase, ep: Endpoint): Promise<TestResult> {
    const startedAt = Date.now();
    const config: AxiosRequestConfig = {
      method: tc.method,
      url: tc.url,
      headers: tc.headers,
      data: tc.body,
      params: tc.queryParams,
      timeout: this.timeout,
      validateStatus: () => true // Allow any status for testing
    };

    try {
      const resp = await axios(config);
      const duration = Date.now() - startedAt;

      return {
        id: uuidv4(),
        endpoint: ep,
        name: tc.name,
        status: resp.status === tc.expectedStatus ? 'pass' : 'fail',
        statusCode: resp.status,
        responseTime: duration,
        executedAt: new Date()
      };
    } catch (e: any) {
      return {
        id: uuidv4(),
        endpoint: ep,
        name: tc.name,
        status: 'error',
        error: e.message,
        executedAt: new Date()
      };
    }
  }
}
