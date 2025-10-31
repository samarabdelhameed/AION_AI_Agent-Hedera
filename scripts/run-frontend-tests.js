#!/usr/bin/env node

/**
 * @fileoverview Frontend Test Runner
 * @description Comprehensive test runner for frontend components and integration
 * @author AION Team
 * @version 2.0.0
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class FrontendTestRunner {
    constructor() {
        this.testResults = {
            unit: { passed: 0, failed: 0, total: 0 },
            integration: { passed: 0, failed: 0, total: 0 },
            e2e: { passed: 0, failed: 0, total: 0 },
            coverage: { lines: 0, functions: 0, branches: 0, statements: 0 }
        };
        
        this.testSuites = [
            {
                name: 'Unit Tests',
                command: 'npm',
                args: ['test', '--', '--testPathPattern=__tests__', '--coverage', '--watchAll=false'],
                cwd: 'frontend',
                type: 'unit'
            },
            {
                name: 'Component Tests',
                command: 'npm',
                args: ['test', '--', '--testPathPattern=components.*test', '--watchAll=false'],
                cwd: 'frontend',
                type: 'unit'
            },
            {
                name: 'Hook Tests',
                command: 'npm',
                args: ['test', '--', '--testPathPattern=hooks.*test', '--watchAll=false'],
                cwd: 'frontend',
                type: 'unit'
            },
            {
                name: 'Service Tests',
                command: 'npm',
                args: ['test', '--', '--testPathPattern=services.*test', '--watchAll=false'],
                cwd: 'frontend',
                type: 'unit'
            },
            {
                name: 'Integration Tests',
                command: 'npm',
                args: ['test', '--', '--testPathPattern=UserExperience', '--watchAll=false'],
                cwd: 'frontend',
                type: 'integration'
            }
        ];
    }

    /**
     * Log with colors
     */
    log(message, type = 'info') {
        const colors = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            header: chalk.cyan.bold
        };
        
        console.log(colors[type](message));
    }

    /**
     * Run a single test suite
     */
    async runTestSuite(suite) {
        this.log(`\\n🧪 Running ${suite.name}...`, 'header');
        
        return new Promise((resolve) => {
            const process = spawn(suite.command, suite.args, {
                cwd: suite.cwd,
                stdio: 'pipe',
                shell: true
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
                // Show real-time output for important messages
                const output = data.toString();
                if (output.includes('PASS') || output.includes('FAIL')) {
                    console.log(output.trim());
                }
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                const success = code === 0;
                
                if (success) {
                    this.log(`✅ ${suite.name} completed successfully`, 'success');
                    this.parseTestResults(stdout, suite.type, true);
                } else {
                    this.log(`❌ ${suite.name} failed`, 'error');
                    this.parseTestResults(stdout, suite.type, false);
                    if (stderr) {
                        console.log(chalk.red('Error output:'));
                        console.log(stderr);
                    }
                }

                resolve({ success, stdout, stderr, code });
            });

            process.on('error', (error) => {
                this.log(`❌ Failed to run ${suite.name}: ${error.message}`, 'error');
                resolve({ success: false, error: error.message });
            });
        });
    }

    /**
     * Parse test results from Jest output
     */
    parseTestResults(output, type, success) {
        // Parse Jest output for test counts
        const testSummaryMatch = output.match(/Tests:\\s+(\\d+)\\s+failed,\\s+(\\d+)\\s+passed,\\s+(\\d+)\\s+total/);
        if (testSummaryMatch) {
            const [, failed, passed, total] = testSummaryMatch;
            this.testResults[type].failed += parseInt(failed);
            this.testResults[type].passed += parseInt(passed);
            this.testResults[type].total += parseInt(total);
        } else if (success) {
            // If no specific counts but successful, assume some tests passed
            this.testResults[type].passed += 1;
            this.testResults[type].total += 1;
        } else {
            this.testResults[type].failed += 1;
            this.testResults[type].total += 1;
        }

        // Parse coverage information
        const coverageMatch = output.match(/All files\\s+\\|\\s+(\\d+\\.?\\d*)\\s+\\|\\s+(\\d+\\.?\\d*)\\s+\\|\\s+(\\d+\\.?\\d*)\\s+\\|\\s+(\\d+\\.?\\d*)/);
        if (coverageMatch) {
            const [, statements, branches, functions, lines] = coverageMatch;
            this.testResults.coverage = {
                statements: parseFloat(statements),
                branches: parseFloat(branches),
                functions: parseFloat(functions),
                lines: parseFloat(lines)
            };
        }
    }

    /**
     * Check if frontend dependencies are installed
     */
    async checkDependencies() {
        this.log('🔍 Checking frontend dependencies...', 'info');
        
        try {
            const packageJsonPath = path.join('frontend', 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            const requiredDeps = [
                '@testing-library/react',
                '@testing-library/jest-dom',
                '@testing-library/user-event',
                'jest'
            ];

            const missingDeps = requiredDeps.filter(dep => 
                !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
            );

            if (missingDeps.length > 0) {
                this.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'error');
                this.log('Run: npm install --save-dev ' + missingDeps.join(' '), 'info');
                return false;
            }

            this.log('✅ All required dependencies are installed', 'success');
            return true;
        } catch (error) {
            this.log(`❌ Error checking dependencies: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Setup test environment
     */
    async setupTestEnvironment() {
        this.log('🛠️  Setting up test environment...', 'info');
        
        try {
            // Ensure test directories exist
            const testDirs = [
                'frontend/src/__tests__',
                'frontend/src/components/hedera/__tests__',
                'frontend/src/hooks/__tests__',
                'frontend/src/services/__tests__',
                'frontend/coverage',
                'frontend/test-results'
            ];

            for (const dir of testDirs) {
                try {
                    await fs.access(dir);
                } catch {
                    await fs.mkdir(dir, { recursive: true });
                    this.log(`📁 Created directory: ${dir}`, 'info');
                }
            }

            // Check for Jest config
            const jestConfigPath = path.join('frontend', 'jest.config.js');
            try {
                await fs.access(jestConfigPath);
                this.log('✅ Jest configuration found', 'success');
            } catch {
                this.log('⚠️  Jest configuration not found', 'warning');
            }

            // Check for setup files
            const setupTestsPath = path.join('frontend', 'src', 'setupTests.js');
            try {
                await fs.access(setupTestsPath);
                this.log('✅ Test setup file found', 'success');
            } catch {
                this.log('⚠️  Test setup file not found', 'warning');
            }

            return true;
        } catch (error) {
            this.log(`❌ Error setting up test environment: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Generate test report
     */
    async generateReport() {
        this.log('\\n📊 Generating test report...', 'header');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: Object.values(this.testResults).reduce((sum, result) => sum + (result.total || 0), 0),
                totalPassed: Object.values(this.testResults).reduce((sum, result) => sum + (result.passed || 0), 0),
                totalFailed: Object.values(this.testResults).reduce((sum, result) => sum + (result.failed || 0), 0)
            },
            results: this.testResults,
            coverage: this.testResults.coverage
        };

        report.summary.successRate = report.summary.totalTests > 0 
            ? ((report.summary.totalPassed / report.summary.totalTests) * 100).toFixed(2)
            : 0;

        try {
            const reportPath = path.join('frontend', 'test-results', 'test-report.json');
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            this.log(`📄 Test report saved to: ${reportPath}`, 'success');
        } catch (error) {
            this.log(`⚠️  Could not save test report: ${error.message}`, 'warning');
        }

        return report;
    }

    /**
     * Print test summary
     */
    printSummary(report) {
        this.log('\\n' + '='.repeat(60), 'header');
        this.log('                 FRONTEND TEST SUMMARY', 'header');
        this.log('='.repeat(60), 'header');

        this.log(`\\n📈 Overall Results:`, 'info');
        this.log(`  Total Tests: ${report.summary.totalTests}`);
        this.log(`  ${chalk.green('Passed:')} ${report.summary.totalPassed}`);
        this.log(`  ${chalk.red('Failed:')} ${report.summary.totalFailed}`);
        this.log(`  Success Rate: ${report.summary.successRate}%`);

        this.log(`\\n🧪 Test Categories:`, 'info');
        Object.entries(this.testResults).forEach(([category, results]) => {
            if (results.total > 0) {
                const successRate = ((results.passed / results.total) * 100).toFixed(1);
                const status = results.failed === 0 ? chalk.green('✓') : chalk.red('✗');
                this.log(`  ${status} ${category.toUpperCase()}: ${results.passed}/${results.total} (${successRate}%)`);
            }
        });

        if (this.testResults.coverage.lines > 0) {
            this.log(`\\n📊 Code Coverage:`, 'info');
            this.log(`  Lines: ${this.testResults.coverage.lines}%`);
            this.log(`  Functions: ${this.testResults.coverage.functions}%`);
            this.log(`  Branches: ${this.testResults.coverage.branches}%`);
            this.log(`  Statements: ${this.testResults.coverage.statements}%`);
        }

        this.log('\\n' + '='.repeat(60), 'header');

        // Recommendations
        if (report.summary.totalFailed > 0) {
            this.log('\\n💡 Recommendations:', 'warning');
            this.log('  • Review failed test output above');
            this.log('  • Check component implementations');
            this.log('  • Verify API mock responses');
            this.log('  • Ensure proper test setup');
        } else {
            this.log('\\n🎉 All tests passed! Great work!', 'success');
            this.log('  • Frontend components are working correctly');
            this.log('  • API integrations are properly tested');
            this.log('  • User experience flows are validated');
        }
    }

    /**
     * Run all frontend tests
     */
    async runAllTests() {
        this.log('🚀 Starting Frontend Test Suite...', 'header');
        this.log('Testing React components, hooks, services, and user experience\\n');

        // Check dependencies
        const depsOk = await this.checkDependencies();
        if (!depsOk) {
            process.exit(1);
        }

        // Setup test environment
        const setupOk = await this.setupTestEnvironment();
        if (!setupOk) {
            process.exit(1);
        }

        let allPassed = true;

        // Run each test suite
        for (const suite of this.testSuites) {
            const result = await this.runTestSuite(suite);
            if (!result.success) {
                allPassed = false;
            }
        }

        // Generate and display report
        const report = await this.generateReport();
        this.printSummary(report);

        return allPassed;
    }
}

// CLI execution
if (require.main === module) {
    const runner = new FrontendTestRunner();
    
    runner.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Test runner failed:'), error);
            process.exit(1);
        });
}

module.exports = FrontendTestRunner;