import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

export function loadConfig(cwd: string): Config {
  const configPath = path.join(cwd, 'api.config.json');
  const defaults: Config = {
    baseURL: '',  // NO FALLBACKS
    authToken: '',
    timeout: 30000, // Default timeout is fine as it's a technical constraint, but URL is NOT
    include: ['**/*.js', '**/*.ts', '**/*.py', '**/*.swift', '**/*.go'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
  };

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaults, ...userConfig };
    } catch (e) {
      // Fail silently for corrupted files, but don't inject defaults for specific user data
    }
  }

  return defaults;
}
