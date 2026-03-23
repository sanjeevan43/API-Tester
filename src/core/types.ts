export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface Endpoint {
  id: string;
  method: HttpMethod;
  url: string;
  path: string;
  framework: string;
  params: string[];      // Path parameters
  query: string[];       // Query parameters
  bodyFields: string[];  // Body field names
  requiresAuth: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  endpointId: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  expectedStatus: number;
}

export interface TestResult {
  id: string;
  endpoint: Endpoint;
  name: string;
  status: 'pass' | 'fail' | 'error';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  executedAt: Date;
}

export interface Config {
  baseURL: string;
  authToken: string;
  timeout: number;
  include?: string[];
  exclude?: string[];
}
