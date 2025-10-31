#!/usr/bin/env node

/**
 * @fileoverview Dashboard Integration Test Script
 * @description Test script to validate dashboard components with real Hedera data
 * @author AION Team
 * @version 2.0.0
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');
const fs = require('fs').promises;

class DashboardTester {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.browser = null;
        this.page = null;
        
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            sections: {},
            details: []
        };
    }

    /**
     * Log test result
     */
    logResult(testName, success, section = 'general', details = '') {
        this.testResults.total++;
        
        if (!this.testResults.sections[section]) {
            this.testResults.sections[section] = { passed: 0, failed: 0, total: 0 };
        }
        
        this.testResults.sections[section].total++;
        
        if (success) {
            this.testResults.passed++;
            this.testResults.sections[section].passed++;
            console.log(chalk.green(`✓ [${section.toUpperCase()}] ${testName}`));
        } else {
            this.testResults.failed++;
            this.testResults.sections[section].failed++;
            console.log(chalk.red(`✗ [${section.toUpperCase()}] ${testName}`));
            if (details) {
                console.log(chalk.red(`  Error: ${details}`));
            }
        }
        
        this.testResults.details.push({
            test: testName,
            section: section,
            success: success,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Initialize browser and page
     */
    async initialize() {
        console.log(chalk.blue('🚀 Initializing browser for dashboard testing...'));
        
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(chalk.red(`Browser Error: ${msg.text()}`));
            }
        });
        
        this.page.on('pageerror', error => {
            console.log(chalk.red(`Page Error: ${error.message}`));
        });
    }

    /**
     * Test dashboard loading
     */
    async testDashboardLoading() {
        console.log(chalk.blue('\n=== Testing Dashboard Loading ==='));

        try {
            await this.page.goto(`${this.baseURL}/dashboard`, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Check if dashboard loaded
            const title = await this.page.title();
            this.logResult(
                'Dashboard page loads',
                title.includes('AION Dashboard') || title.includes('Dashboard'),
                'loading',
                title ? `Title: ${title}` : 'No title found'
            );

            // Check for main dashboard heading
            const heading = await this.page.$eval('h1', el => el.textContent).catch(() => null);
            this.logResult(
                'Dashboard heading present',
                heading && heading.includes('AION Dashboard'),
                'loading',
                heading ? `Heading: ${heading}` : 'No heading found'
            );

            // Check for refresh button
            const refreshButton = await this.page.$('button:has-text("Refresh"), button[aria-label*="refresh"]').catch(() => null);
            this.logResult(
                'Refresh button present',
                refreshButton !== null,
                'loading'
            );

        } catch (error) {
            this.logResult(
                'Dashboard loading failed',
                false,
                'loading',
                error.message
            );
        }
    }

    /**
     * Test metric cards
     */
    async testMetricCards() {
        console.log(chalk.blue('\n=== Testing Metric Cards ==='));

        try {
            // Wait for metric cards to load
            await this.page.waitForSelector('[class*="card"], .card', { timeout: 10000 });

            // Check for TVL card
            const tvlCard = await this.page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                for (let el of elements) {
                    if (el.textContent && el.textContent.includes('Total Value Locked')) {
                        return true;
                    }
                }
                return false;
            });

            this.logResult(
                'Total Value Locked card present',
                tvlCard,
                'metrics'
            );

            // Check for transaction count
            const transactionCard = await this.page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                for (let el of elements) {
                    if (el.textContent && (el.textContent.includes('Network Transactions') || el.textContent.includes('Transactions'))) {
                        return true;
                    }
                }
                return false;
            });

            this.logResult(
                'Network transactions card present',
                transactionCard,
                'metrics'
            );

            // Check for token holders
            const holdersCard = await this.page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                for (let el of elements) {
                    if (el.textContent && el.textContent.includes('Token Holders')) {
                        return true;
                    }
                }
                return false;
            });

            this.logResult(
                'Token holders card present',
                holdersCard,
                'metrics'
            );

            // Check for AI decisions
            const aiCard = await this.page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                for (let el of elements) {
                    if (el.textContent && el.textContent.includes('AI Decisions')) {
                        return true;
                    }
                }
                return false;
            });

            this.logResult(
                'AI decisions card present',
                aiCard,
                'metrics'
            );

        } catch (error) {
            this.logResult(
                'Metric cards test failed',
                false,
                'metrics',
                error.message
            );
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(chalk.blue('🧪 Starting Dashboard Integration Tests...'));
        console.log(chalk.gray(`Target URL: ${this.baseURL}/dashboard`));
        
        try {
            await this.initialize();
            
            // Run test suites
            await this.testDashboardLoading();
            await this.testMetricCards();
            
            // Print summary
            this.printSummary();
            
            return this.testResults;
            
        } catch (error) {
            console.error(chalk.red('Test execution failed:'), error);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    /**
     * Print summary
     */
    printSummary() {
        console.log(chalk.blue('\n' + '='.repeat(60)));
        console.log(chalk.blue('                    TEST SUMMARY'));
        console.log(chalk.blue('='.repeat(60)));
        
        console.log(`\n${chalk.cyan('Overall Results:')}`);
        console.log(`  Total Tests: ${this.testResults.total}`);
        console.log(`  ${chalk.green('Passed:')} ${this.testResults.passed}`);
        console.log(`  ${chalk.red('Failed:')} ${this.testResults.failed}`);
        console.log(`  Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);

        console.log(`\n${chalk.cyan('Results by Section:')}`);
        Object.entries(this.testResults.sections).forEach(([section, results]) => {
            const successRate = ((results.passed / results.total) * 100).toFixed(1);
            const status = results.failed === 0 ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${status} ${section.toUpperCase()}: ${results.passed}/${results.total} (${successRate}%)`);
        });

        console.log(chalk.blue('\n' + '='.repeat(60)));
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const baseURL = args[0] || 'http://localhost:3001';
    
    const tester = new DashboardTester(baseURL);
    
    tester.runAllTests()
        .then(report => {
            const success = report.failed === 0;
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Test suite failed:'), error);
            process.exit(1);
        });
}

module.exports = DashboardTester;