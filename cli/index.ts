import { Scanner }  from './scanner';
import { Generator } from './generator';
import { Executor }  from './executor';
import { Reporter }  from './reporter';
import { loadConfig } from './config';
import { Endpoint, TestResult, TestCase } from './types';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  // Use the folder passed in command line, or fallback to current directory
  const targetDir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : process.cwd();
  
  const config = loadConfig(targetDir);
  const scanner = new Scanner(config);
  const generator = new Generator(config);
  const executor = new Executor(config.timeout);
  const reporter = new Reporter();

  // 1. Scan
  reporter.printHeader();
  console.log(chalk.gray(`🔍 Scanning directory: ${targetDir}`));
  const endpoints = scanner.scanWorkspace(targetDir);
  console.log(chalk.green(`✓ Found ${endpoints.length} endpoints.`));

  // 2. Run All
  const results: TestResult[] = [];
  for (const ep of endpoints) {
    const cases = generator.generateAll(ep);
    for (const tc of cases) {
      // Clear line before printing result
      process.stdout.write(chalk.gray(`🧪 Running ${tc.name.substring(0, 30)}...\r`));
      const result = await executor.run(tc, ep);
      process.stdout.write(' '.repeat(60) + '\r'); // Clear the line manually
      
      results.push(result);
      reporter.printResult(result);
    }
  }

  // 3. Summary
  reporter.printSummary(results);
}

// ── Simple Chalk implementation if not installed ──────────────────
// (Using small wrapper to ensure it runs even if dependencies are pending)
import chalk from 'chalk';

main().catch(err => {
  console.error(chalk.red('\n💥 Fatal Error:'), err.message);
  process.exit(1);
});
