#!/usr/bin/env node

/**
 * @fileoverview Real-World Scenario Tests
 * @description Test real-world usage scenarios for AION system
 * @author AION Team
 * @version 2.0.0
 */

const http = require('http');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

/**
 * Real-World Scenario Test Suite
 */
class RealWorldScenarioTests {
    constructor() {
        this.config = {
            frontend: { url: 'http://localhost:3000' },
            mcpAgent: { url: 'http://localhost:3001' },
            timeout: 15000
        };
        
        this.scenarios = [];
        this.results = { passed: 0, failed: 0, total: 0 };
    }

    /**
     * Make HTTP request
     */
    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: this.config.timeout
            };
            
            const req = http.request(requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, data: data });
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            if (options.data) req.write(options.data);
            req.end();
        });
    }

    /**
     * Log scenario result
     */
    logScenario(name, status, message, details = null) {
        const statusIcon = status === 'pass' ? '✅' : '❌';
        console.log(chalk.blue(`${statusIcon} ${name}: ${message}`));
        
        if (details) {
            console.log(chalk.gray(`   ${JSON.stringify(details, null, 2)}`));
        }
        
        this.scenarios.push({ name, status, message, details });
        this.results.total++;
        this.results[status === 'pass' ? 'passed' : 'failed']++;
    }

    /**
     * Scenario 1: New User Onboarding
     */
    async testNewUserOnboarding() {
        console.log(chalk.yellow('\n👤 Testing New User Onboarding Scenario...\n'));
        
        try {
            // Step 1: User visits frontend
            const frontendResponse = await this.makeRequest(this.config.frontend.url);
            
            if (frontendResponse.statusCode !== 200) {
                throw new Error(`Frontend not accessible: ${frontendResponse.statusCode}`);
            }
            
            // Step 2: Frontend loads API info
            const apiResponse = await this.makeRequest(this.config.frontend.url + '/api');
            
            if (apiResponse.statusCode !== 200) {
                throw new Error(`API not accessible through frontend: ${apiResponse.statusCode}`);
            }
            
            // Step 3: Check system status
            const healthResponse = await this.makeRequest(this.config.frontend.url + '/health');
            
            if (healthResponse.statusCode === 200) {
                this.logScenario('newUserOnboarding', 'pass', 'New user can successfully access the system', {
                    frontendAccess: true,
                    apiAccess: true,
                    systemHealth: true
                });
            } else {
                throw new Error('Health check failed');
            }
            
        } catch (error) {
            this.logScenario('newUserOnboarding', 'fail', `New user onboarding failed: ${error.message}`);
        }
    }

    /**
     * Scenario 2: AI Decision Making Process
     */
    async testAIDecisionMaking() {
        console.log(chalk.yellow('\n🤖 Testing AI Decision Making Scenario...\n'));
        
        try {
            // Simulate AI decision process
            const decisionData = {
                strategy: 'conservative_growth',
                market_conditions: 'volatile',
                confidence: 0.75,
                timestamp: new Date().toISOString()
            };
            
            const response = await this.makeRequest(this.config.mcpAgent.url + '/api/ai/log-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(decisionData)
            });
            
            if (response.statusCode === 200 || response.statusCode === 201) {
                this.logScenario('aiDecisionMaking', 'pass', 'AI decision making process works correctly', {
                    decisionLogged: true,
                    statusCode: response.statusCode
                });
            } else {
                throw new Error(`Decision logging failed: ${response.statusCode}`);
            }
            
        } catch (error) {
            this.logScenario('aiDecisionMaking', 'fail', `AI decision making failed: ${error.message}`);
        }
    }

    /**
     * Generate scenario test report
     */
    async generateReport() {
        const reportPath = path.join(__dirname, '../REAL_WORLD_SCENARIOS_REPORT.md');
        
        const report = `# Real-World Scenario Test Report

## Test Summary
- **Total Scenarios**: ${this.results.total}
- **Passed**: ${this.results.passed}
- **Failed**: ${this.results.failed}
- **Success Rate**: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%

## Scenario Results
${this.scenarios.map(s => `
### ${s.status === 'pass' ? '✅' : '❌'} ${s.name}
**Status:** ${s.status.toUpperCase()}
**Message:** ${s.message}
${s.details ? `**Details:** \`${JSON.stringify(s.details)}\`` : ''}
`).join('\n')}

---
*Generated on: ${new Date().toISOString()}*
`;
        
        await fs.writeFile(reportPath, report);
        return reportPath;
    }

    /**
     * Run all scenario tests
     */
    async runAllScenarios() {
        console.log(chalk.blue('🎯 Starting Real-World Scenario Tests...\n'));
        
        await this.testNewUserOnboarding();
        await this.testAIDecisionMaking();
        
        const reportPath = await this.generateReport();
        
        console.log(chalk.blue(`\n📊 Scenario Test Summary:`));
        console.log(chalk.green(`✅ Passed: ${this.results.passed}`));
        console.log(chalk.red(`❌ Failed: ${this.results.failed}`));
        console.log(chalk.blue(`📋 Report: ${reportPath}`));
        
        return this.results;
    }
}

// Main execution
if (require.main === module) {
    const tester = new RealWorldScenarioTests();
    tester.runAllScenarios().then(results => {
        process.exit(results.failed === 0 ? 0 : 1);
    }).catch(error => {
        console.error(chalk.red('❌ Scenario testing failed:'), error.message);
        process.exit(1);
    });
}

module.exports = { RealWorldScenarioTests };