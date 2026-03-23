// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Type Definitions
// ══════════════════════════════════════════════════════════════

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface Endpoint {
  id: string;
  method: HttpMethod;
  url: string;
  path: string;
  file: string;            // Source file where detected
  framework: string;
  params: string[];         // Path parameters (:id, :slug, etc.)
  query: string[];          // Query parameters
  bodyFields: string[];     // Request body field names
  headers: Record<string, string>;
  requiresAuth: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  category: 'positive' | 'negative' | 'edge';
  endpointId: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  expectedStatus: number;
  description: string;
}

export interface TestResult {
  id: string;
  testCase: TestCase;
  endpoint: Endpoint;
  name: string;
  category: 'positive' | 'negative' | 'edge';
  status: 'pass' | 'fail' | 'error' | 'skip';
  statusCode?: number;
  responseTime?: number;
  responseBody?: any;
  responseHeaders?: Record<string, string>;
  error?: string;
  executedAt: Date;
}

export interface Config {
  baseURL: string;
  authToken: string;
  timeout: number;
  retries: number;
  parallel: boolean;
  concurrency: number;
  include: string[];
  exclude: string[];
  exportJson: boolean;
  exportPath: string;
  verbose: boolean;
}

export interface ScanResult {
  endpoints: Endpoint[];
  filesScanned: number;
  scanTime: number;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  avgResponseTime: number;
  totalTime: number;
  byMethod: Record<HttpMethod, { passed: number; failed: number; total: number }>;
  byCategory: Record<string, { passed: number; failed: number; total: number }>;
}

export interface CLIOptions {
  target: string;
  watch: boolean;
  debug: boolean;
  file?: string;
  parallel: boolean;
  export: boolean;
  init: boolean;
}
