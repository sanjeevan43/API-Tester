import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

export function loadConfig(cwd: string): Config {
  const configPath = path.join(cwd, 'api.config.json');
  const defaults: Config = {
    baseURL: 'http://localhost:3000',
    authToken: '',
    timeout: 5000,
    include: ['**/*.js', '**/*.ts', '**/*.py', '**/*.swift', '**/*.go'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
  };

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaults, ...userConfig };
    } catch (e) {
      console.warn('⚠️ Warning: Failed to parse api.config.json. Using defaults.');
    }
  }

  return defaults;
}
