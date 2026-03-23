#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Entry Point
// ══════════════════════════════════════════════════════════════

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import yargs from 'yargs';

import { loadConfig, initConfig } from './config';
import { Scanner } from './scanner';
import { Generator } from './generator';
import { Executor } from './executor';
import { Reporter } from './reporter';
import { Endpoint, TestResult, TestCase, Config } from './types';

// ── CLI Argument Parsing ────────────────────────────────────
const argv = yargs(process.argv.slice(2))
  .scriptName('api-sentinel')
  .usage('$0 [target] [options]')
  .command('$0 [target]', 'Run API tests', (y) => {
    return y.positional('target', {
      describe: 'Target directory or file to scan',
      type: 'string',
      default: '.'
    });
  })
  .command('init', 'Create a default api.config.json', () => {})
  .option('watch', {
    alias: 'w',
    type: 'boolean',
    default: false,
    describe: 'Re-run tests on file changes'
  })
  .option('debug', {
    alias: 'd',
    type: 'boolean',
    default: false,
    describe: 'Show detailed debug logs'
  })
  .option('parallel', {
    alias: 'p',
    type: 'boolean',
    default: false,
    describe: 'Run tests in parallel'
  })
  .option('export', {
    alias: 'e',
    type: 'boolean',
    default: false,
    describe: 'Export results to JSON'
  })
  .option('base-url', {
    alias: 'b',
    type: 'string',
    describe: 'Override base URL'
  })
  .option('timeout', {
    alias: 't',
    type: 'number',
    describe: 'Request timeout in ms'
  })
  .option('retries', {
    alias: 'r',
    type: 'number',
    describe: 'Number of retries per test'
  })
  .example('$0', 'Scan current directory and run tests')
  .example('$0 ./my-api', 'Scan specific directory')
  .example('$0 ./routes.js', 'Scan specific file')
  .example('$0 --watch', 'Watch mode with auto-rerun')
  .example('$0 --parallel --export', 'Parallel execution with JSON export')
  .example('$0 init', 'Create api.config.json')
  .help()
  .version('2.0.0')
  .parseSync();

// ── Main Execution ──────────────────────────────────────────

async function main() {
  const command = argv._[0];

  // Handle `init` command
  if (command === 'init') {
    const result = initConfig(process.cwd());
    console.log(result);
    process.exit(0);
  }

  // Resolve target
  const target = path.resolve(process.cwd(), (argv.target as string) || '.');
  const isFile = fs.existsSync(target) && fs.statSync(target).isFile();
  const targetDir = isFile ? path.dirname(target) : target;

  // Load config with CLI overrides
  const overrides: Partial<Config> = {};
  if (argv['base-url']) overrides.baseURL = argv['base-url'] as string;
  if (argv.timeout) overrides.timeout = argv.timeout as number;
  if (argv.retries) overrides.retries = argv.retries as number;
  if (argv.debug) overrides.verbose = true;
  if (argv.parallel) overrides.parallel = true;
  if (argv.export) overrides.exportJson = true;

  const config = loadConfig(targetDir, overrides);
  const scanner = new Scanner(config);
  const generator = new Generator(config);
  const executor = new Executor(config);
  const reporter = new Reporter(config);

  // Banner
  reporter.printBanner();

  // ── Run Tests ─────────────────────────────────────────────
  await runTests(scanner, generator, executor, reporter, config, target, isFile);

  // ── Watch Mode ────────────────────────────────────────────
  if (argv.watch) {
    console.log(chalk.cyan('  👁  Watch mode active — press Ctrl+C to stop\n'));

    let debounceTimer: NodeJS.Timeout | null = null;

    try {
      const chokidar = require('chokidar');
      const watchGlobs = config.include.map(g => path.join(targetDir, g));

      const watcher = chokidar.watch(watchGlobs, {
        ignored: config.exclude.map((g: string) => path.join(targetDir, g)),
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('change', (changedPath: string) => {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
          console.log(chalk.cyan(`\n  🔄 File changed: ${path.basename(changedPath)}\n`));
          await runTests(scanner, generator, executor, reporter, config, target, isFile);
          console.log(chalk.cyan('  👁  Watching for changes...\n'));
        }, 500);
      });
    } catch (e) {
      console.log(chalk.yellow('  ⚠️  chokidar not installed. Run: npm install chokidar'));
      console.log(chalk.gray('  Watch mode unavailable.\n'));
    }
  }
}

// ── Core Test Runner ────────────────────────────────────────

async function runTests(
  scanner: Scanner,
  generator: Generator,
  executor: Executor,
  reporter: Reporter,
  config: Config,
  target: string,
  isFile: boolean
) {
  const totalStartTime = Date.now();

  // Step 1: Scan
  console.log(chalk.gray(`  🔍 Scanning: ${target}\n`));
  const scanResult = isFile ? scanner.scanFile(target) : scanner.scanWorkspace(target);
  reporter.printScanResults(scanResult);

  if (scanResult.endpoints.length === 0) {
    return;
  }

  // Step 2: Generate test cases
  const allTestPairs: Array<{ tc: TestCase; ep: Endpoint }> = [];
  for (const ep of scanResult.endpoints) {
    const cases = generator.generateAll(ep);
    for (const tc of cases) {
      allTestPairs.push({ tc, ep });
    }
  }

  reporter.printTestStart(allTestPairs.length);

  // Step 3: Execute
  const results: TestResult[] = [];

  if (config.parallel) {
    // Parallel execution
    const parallelResults = await executor.runParallel(
      allTestPairs,
      (result) => reporter.printResult(result),
      config.concurrency
    );
    results.push(...parallelResults);
  } else {
    // Sequential execution
    for (const { tc, ep } of allTestPairs) {
      const result = await executor.run(tc, ep);
      results.push(result);
      reporter.printResult(result);
    }
  }

  const totalTime = Date.now() - totalStartTime;

  // Step 4: Summary
  reporter.printSummary(results, totalTime);

  // Step 5: Export (if enabled)
  if (config.exportJson) {
    reporter.exportResults(results, scanResult, totalTime);
  }

  // Exit code for CI/CD
  const failCount = results.filter(r => r.status === 'fail' || r.status === 'error').length;
  if (!config.parallel && failCount > 0 && !argv.watch) {
    // Don't exit with error in watch mode
    process.exitCode = 1;
  }
}

// ── Launch ──────────────────────────────────────────────────

main().catch(err => {
  console.error(chalk.red('\n  💥 Fatal Error:'), err.message);
  if (argv.debug) {
    console.error(chalk.gray(err.stack));
  }
  process.exit(1);
});
