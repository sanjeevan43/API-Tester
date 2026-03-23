// ══════════════════════════════════════════════════════════════
// API Sentinel CLI — Professional Terminal Reporter
// ══════════════════════════════════════════════════════════════

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { TestResult, TestSummary, Endpoint, ScanResult, HttpMethod, Config } from './types';
import { Validator, ValidationIssue } from './validator';

// ── Method Colors ───────────────────────────────────────────
const METHOD_COLORS: Record<HttpMethod, (s: string) => string> = {
  GET:     chalk.bold.green,
  POST:    chalk.bold.yellow,
  PUT:     chalk.bold.blue,
  PATCH:   chalk.bold.magenta,
  DELETE:  chalk.bold.red,
  HEAD:    chalk.bold.cyan,
  OPTIONS: chalk.bold.gray,
};

export class Reporter {
  private config: Config;
  private validator: Validator;

  constructor(config: Config) {
    this.config = config;
    this.validator = new Validator();
  }

  // ── Banner ────────────────────────────────────────────────────

  printBanner(): void {
    console.log('');
    console.log(chalk.bold.cyan('  ╔══════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('  ║') + chalk.bold.white('   ⚡ API Sentinel — Automated API Testing        ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('  ║') + chalk.gray('   Production-Grade CLI v2.0.0                     ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('  ╚══════════════════════════════════════════════════╝'));
    console.log('');
  }

  // ── Scan Results ──────────────────────────────────────────────

  printScanResults(scanResult: ScanResult): void {
    console.log(chalk.gray('  ─'.repeat(25)));
    console.log(
      chalk.bold.white('  📁 Scan Complete') +
      chalk.gray(` │ ${scanResult.filesScanned} files │ ${scanResult.endpoints.length} endpoints │ ${scanResult.scanTime}ms`)
    );
    console.log(chalk.gray('  ─'.repeat(25)));
    console.log('');

    if (scanResult.endpoints.length === 0) {
      console.log(chalk.yellow('  ⚠️  No endpoints found. Check your project directory and config.\n'));
      return;
    }

    // Group by framework
    const byFramework = new Map<string, Endpoint[]>();
    for (const ep of scanResult.endpoints) {
      const group = byFramework.get(ep.framework) || [];
      group.push(ep);
      byFramework.set(ep.framework, group);
    }

    for (const [framework, endpoints] of byFramework) {
      console.log(chalk.bold.white(`  📦 ${framework.toUpperCase()}`));
      for (const ep of endpoints) {
        const methodColor = METHOD_COLORS[ep.method] || chalk.white;
        const paramInfo = ep.params.length > 0 ? chalk.gray(` params: ${ep.params.join(', ')}`) : '';
        const bodyInfo = ep.bodyFields.length > 0 ? chalk.gray(` body: {${ep.bodyFields.join(', ')}}`) : '';
        const authIcon = ep.requiresAuth ? chalk.yellow(' 🔒') : '';

        console.log(
          `    ${methodColor(ep.method.padEnd(8))}` +
          chalk.white(ep.path.padEnd(25)) +
          paramInfo + bodyInfo + authIcon
        );
      }
      console.log('');
    }
  }

  // ── Individual Test Result ────────────────────────────────────

  printResult(result: TestResult): void {
    const methodColor = METHOD_COLORS[result.endpoint.method] || chalk.white;

    // Status icon
    let icon: string;
    let statusStr: string;
    switch (result.status) {
      case 'pass':
        icon = chalk.green('  ✔');
        statusStr = chalk.green(`${result.statusCode} OK`);
        break;
      case 'fail':
        icon = chalk.red('  ✖');
        statusStr = chalk.red(`${result.statusCode} FAIL`);
        break;
      case 'error':
        icon = chalk.yellow('  ⚠');
        statusStr = chalk.yellow('ERROR');
        break;
      case 'skip':
        icon = chalk.gray('  ○');
        statusStr = chalk.gray('SKIP');
        break;
    }

    // Category badge
    let badge = '';
    switch (result.category) {
      case 'positive': badge = chalk.bgGreen.black(' + '); break;
      case 'negative': badge = chalk.bgRed.white(' - '); break;
      case 'edge':     badge = chalk.bgYellow.black(' ~ '); break;
    }

    // Method + Path
    const method = methodColor(`[${result.endpoint.method}]`.padEnd(10));
    const pathStr = chalk.white(result.endpoint.path.padEnd(22));

    // Time
    const timeStr = result.responseTime
      ? chalk.gray(`(${result.responseTime}ms)`)
      : '';

    console.log(`${icon} ${badge} ${method} ${pathStr} ${statusStr.padEnd(20)} ${timeStr}`);

    // Error details
    if (result.error) {
      console.log(chalk.red(`     └─ ${result.error}`));
    }

    // Verbose: show response body
    if (this.config.verbose && result.responseBody) {
      const bodyStr = typeof result.responseBody === 'string'
        ? result.responseBody.substring(0, 200)
        : JSON.stringify(result.responseBody, null, 2).substring(0, 200);
      console.log(chalk.gray(`     └─ Body: ${bodyStr}`));
    }

    // Validation issues
    if (this.config.verbose) {
      const issues = this.validator.validate(result);
      for (const issue of issues) {
        const issueIcon = issue.severity === 'error' ? chalk.red('🚨') : chalk.yellow('⚡');
        console.log(`     ${issueIcon} ${chalk.gray(issue.message)}`);
      }
    }
  }

  // ── Test Running Progress ─────────────────────────────────────

  printTestStart(totalTests: number): void {
    console.log(chalk.bold.white(`  🧪 Executing ${totalTests} test cases...\n`));
  }

  // ── Summary ───────────────────────────────────────────────────

  printSummary(results: TestResult[], totalTime: number): void {
    const summary = this.buildSummary(results, totalTime);

    console.log('');
    console.log(chalk.gray('  ═'.repeat(25)));
    console.log(chalk.bold.white('  📊 Test Summary'));
    console.log(chalk.gray('  ─'.repeat(25)));
    console.log('');

    // Main stats
    console.log(chalk.bold.white(`    Total:        ${summary.total}`));
    console.log(chalk.bold.green(`    ✔ Passed:     ${summary.passed}`));
    console.log(chalk.bold.red(`    ✖ Failed:     ${summary.failed}`));
    if (summary.errors > 0) {
      console.log(chalk.bold.yellow(`    ⚠ Errors:     ${summary.errors}`));
    }
    if (summary.skipped > 0) {
      console.log(chalk.gray(`    ○ Skipped:    ${summary.skipped}`));
    }

    console.log('');

    // Timing
    console.log(chalk.gray(`    ⏱  Avg Response:  ${summary.avgResponseTime.toFixed(0)}ms`));
    console.log(chalk.gray(`    ⏱  Total Time:    ${(summary.totalTime / 1000).toFixed(2)}s`));

    console.log('');

    // By method breakdown
    console.log(chalk.bold.white('    By Method:'));
    for (const [method, stats] of Object.entries(summary.byMethod)) {
      if (stats.total === 0) continue;
      const methodColor = METHOD_COLORS[method as HttpMethod] || chalk.white;
      const passRate = ((stats.passed / stats.total) * 100).toFixed(0);
      const bar = this.progressBar(stats.passed, stats.total, 15);
      console.log(`      ${methodColor(method.padEnd(8))} ${bar} ${chalk.gray(`${stats.passed}/${stats.total}`)} ${chalk.gray(`(${passRate}%)`)}`);
    }

    console.log('');

    // By category breakdown
    console.log(chalk.bold.white('    By Category:'));
    for (const [category, stats] of Object.entries(summary.byCategory)) {
      if (stats.total === 0) continue;
      const passRate = ((stats.passed / stats.total) * 100).toFixed(0);
      const catIcon = category === 'positive' ? chalk.green('✚') : category === 'negative' ? chalk.red('✖') : chalk.yellow('~');
      console.log(`      ${catIcon} ${category.padEnd(10)} ${chalk.gray(`${stats.passed}/${stats.total}`)} ${chalk.gray(`(${passRate}% pass)`)}`);
    }

    // Validation issues summary
    const validationSummary = this.validator.summarizeIssues(results);
    if (validationSummary.warnings > 0 || validationSummary.errors > 0) {
      console.log('');
      console.log(chalk.bold.white('    ⚡ Validation Issues:'));
      if (validationSummary.errors > 0) {
        console.log(chalk.red(`      🚨 ${validationSummary.errors} error(s)`));
      }
      if (validationSummary.warnings > 0) {
        console.log(chalk.yellow(`      ⚡ ${validationSummary.warnings} warning(s)`));
      }
    }

    console.log('');
    console.log(chalk.gray('  ═'.repeat(25)));

    // Overall pass/fail verdict
    const passRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
    if (passRate === 100) {
      console.log(chalk.bold.green('\n  🎉 All tests passed!\n'));
    } else if (passRate >= 80) {
      console.log(chalk.bold.yellow(`\n  ⚡ ${passRate.toFixed(0)}% pass rate — some issues found\n`));
    } else {
      console.log(chalk.bold.red(`\n  ❌ ${passRate.toFixed(0)}% pass rate — attention needed\n`));
    }
  }

  // ── JSON Export ───────────────────────────────────────────────

  exportResults(results: TestResult[], scanResult: ScanResult, totalTime: number): void {
    const summary = this.buildSummary(results, totalTime);
    const exportData = {
      meta: {
        tool: 'API Sentinel CLI',
        version: '2.0.0',
        executedAt: new Date().toISOString(),
        baseURL: this.config.baseURL,
        totalTime: `${(totalTime / 1000).toFixed(2)}s`
      },
      scan: {
        filesScanned: scanResult.filesScanned,
        endpointsFound: scanResult.endpoints.length,
        scanTime: `${scanResult.scanTime}ms`
      },
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        errors: summary.errors,
        avgResponseTime: `${summary.avgResponseTime.toFixed(0)}ms`,
        byMethod: summary.byMethod,
        byCategory: summary.byCategory
      },
      endpoints: scanResult.endpoints.map(ep => ({
        method: ep.method,
        path: ep.path,
        framework: ep.framework,
        params: ep.params,
        query: ep.query,
        bodyFields: ep.bodyFields,
        requiresAuth: ep.requiresAuth
      })),
      results: results.map(r => ({
        name: r.name,
        category: r.category,
        method: r.endpoint.method,
        path: r.endpoint.path,
        status: r.status,
        statusCode: r.statusCode,
        responseTime: r.responseTime,
        error: r.error,
        executedAt: r.executedAt
      }))
    };

    const exportPath = path.resolve(this.config.exportPath);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(chalk.green(`  📄 Results exported to: ${exportPath}\n`));
  }

  // ── Private Helpers ───────────────────────────────────────────

  private buildSummary(results: TestResult[], totalTime: number): TestSummary {
    const total = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const errors = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skip').length;

    const responseTimesArr = results
      .filter(r => r.responseTime !== undefined)
      .map(r => r.responseTime!);
    const avgResponseTime = responseTimesArr.length > 0
      ? responseTimesArr.reduce((a, b) => a + b, 0) / responseTimesArr.length
      : 0;

    // By method
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const byMethod: Record<HttpMethod, { passed: number; failed: number; total: number }> = {} as any;
    for (const m of methods) {
      const methodResults = results.filter(r => r.endpoint.method === m);
      byMethod[m] = {
        total: methodResults.length,
        passed: methodResults.filter(r => r.status === 'pass').length,
        failed: methodResults.filter(r => r.status !== 'pass').length
      };
    }

    // By category
    const categories = ['positive', 'negative', 'edge'];
    const byCategory: Record<string, { passed: number; failed: number; total: number }> = {};
    for (const c of categories) {
      const catResults = results.filter(r => r.category === c);
      byCategory[c] = {
        total: catResults.length,
        passed: catResults.filter(r => r.status === 'pass').length,
        failed: catResults.filter(r => r.status !== 'pass').length
      };
    }

    return { total, passed, failed, errors, skipped, avgResponseTime, totalTime, byMethod, byCategory };
  }

  private progressBar(value: number, max: number, width: number): string {
    const ratio = max > 0 ? value / max : 0;
    const filled = Math.round(ratio * width);
    const empty = width - filled;

    const filledBar = ratio === 1
      ? chalk.green('█'.repeat(filled))
      : ratio >= 0.8
        ? chalk.yellow('█'.repeat(filled))
        : chalk.red('█'.repeat(filled));

    return filledBar + chalk.gray('░'.repeat(empty));
  }
}
