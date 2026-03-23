// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Configuration Loader
// ══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

const CONFIG_FILENAME = 'api.config.json';

const DEFAULT_CONFIG: Config = {
  baseURL: 'http://localhost:3000',
  authToken: '',
  timeout: 5000,
  retries: 1,
  parallel: false,
  concurrency: 5,
  include: [
    '**/*.js',
    '**/*.ts',
    '**/*.py',
    '**/*.swift',
    '**/*.go'
  ],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/.git/**',
    '**/__pycache__/**',
    '**/venv/**',
    '**/.venv/**',
    '**/vendor/**',
    '**/test/**',
    '**/tests/**',
    '**/spec/**'
  ],
  exportJson: false,
  exportPath: './api-sentinel-results.json',
  verbose: false
};

export function loadConfig(cwd: string, overrides?: Partial<Config>): Config {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  let userConfig: Partial<Config> = {};

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      userConfig = JSON.parse(raw);
    } catch (e: any) {
      console.warn(`⚠️  Warning: Failed to parse ${CONFIG_FILENAME}: ${e.message}`);
      console.warn('   Using default configuration.\n');
    }
  }

  return { ...DEFAULT_CONFIG, ...userConfig, ...(overrides || {}) };
}

export function initConfig(cwd: string): string {
  const configPath = path.join(cwd, CONFIG_FILENAME);

  if (fs.existsSync(configPath)) {
    return `⚠️  ${CONFIG_FILENAME} already exists at ${configPath}`;
  }

  const template = {
    baseURL: 'http://localhost:3000',
    authToken: '',
    timeout: 5000,
    retries: 1,
    parallel: false,
    concurrency: 5,
    include: ['**/*.js', '**/*.ts', '**/*.py', '**/*.swift', '**/*.go'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    exportJson: false,
    exportPath: './api-sentinel-results.json'
  };

  fs.writeFileSync(configPath, JSON.stringify(template, null, 2), 'utf8');
  return `✅ Created ${CONFIG_FILENAME} at ${configPath}`;
}
