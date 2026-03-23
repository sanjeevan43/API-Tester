// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Intelligent Project Scanner
// ══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { Endpoint, Config, ScanResult } from './types';
import { Parser } from './parser';

export class Scanner {
  private config: Config;
  private parser: Parser;

  constructor(config: Config) {
    this.config = config;
    this.parser = new Parser(config);
  }

  /**
   * Scan the entire workspace for API endpoints
   */
  scanWorkspace(cwd: string): ScanResult {
    const startTime = Date.now();
    const allEndpoints: Endpoint[] = [];

    const files = globSync(this.config.include, {
      cwd,
      ignore: this.config.exclude,
      absolute: true,
      nodir: true
    });

    for (const file of files) {
      try {
        const endpoints = this.parser.parseFile(file);
        allEndpoints.push(...endpoints);
      } catch (e: any) {
        if (this.config.verbose) {
          console.warn(`   ⚠️  Skipped ${path.basename(file)}: ${e.message}`);
        }
      }
    }

    return {
      endpoints: this.deduplicate(allEndpoints),
      filesScanned: files.length,
      scanTime: Date.now() - startTime
    };
  }

  /**
   * Scan a single file
   */
  scanFile(filePath: string): ScanResult {
    const startTime = Date.now();
    const absPath = path.resolve(filePath);

    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }

    const endpoints = this.parser.parseFile(absPath);

    return {
      endpoints,
      filesScanned: 1,
      scanTime: Date.now() - startTime
    };
  }

  private deduplicate(endpoints: Endpoint[]): Endpoint[] {
    const seen = new Map<string, Endpoint>();
    for (const ep of endpoints) {
      const key = `${ep.method}:${ep.path}`;
      if (!seen.has(key)) {
        seen.set(key, ep);
      }
    }
    return Array.from(seen.values());
  }
}
