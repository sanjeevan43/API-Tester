import chalk from 'chalk';
import { TestResult, Endpoint } from './types';

export class Reporter {
  printHeader(): void {
    console.log(chalk.bold.cyan('\n🚀 API Sentinel CLI — Automated API Testing\n'));
    console.log(chalk.gray('⎯'.repeat(50)));
  }

  printResult(result: TestResult): void {
    const symbol = result.status === 'pass' ? chalk.green('✔') : result.status === 'fail' ? chalk.red('✖') : chalk.yellow('⚠');
    const methodStr = chalk.bold(result.endpoint.method.padEnd(7));
    const pathStr   = result.endpoint.path.padEnd(20);
    const statusStr = result.status === 'pass' ? chalk.green(`${result.statusCode} OK`) : result.status === 'fail' ? chalk.red(`${result.statusCode} Failed`) : chalk.yellow('Error');
    const timeStr   = result.responseTime ? chalk.gray(`(${result.responseTime}ms)`) : '';

    console.log(`${symbol} [${methodStr}] ${pathStr} ${statusStr} ${timeStr}`);
    if (result.error) {
      console.log(chalk.red(`   └─ Error: ${result.error}`));
    }
  }

  printSummary(results: TestResult[]): void {
    const total  = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status !== 'pass').length;
    const avgTime = results.reduce((acc, r) => acc + (r.responseTime || 0), 0) / total;

    console.log(chalk.gray('⎯'.repeat(50)));
    console.log(`${chalk.bold.green('✔ Passed: ')}${passed}`);
    console.log(`${chalk.bold.red('✖ Failed: ')}${failed}`);
    console.log(`${chalk.bold.blue('⚡ Avg Response: ')}${avgTime.toFixed(0)}ms\n`);
  }
}
