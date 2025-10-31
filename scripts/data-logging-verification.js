#!/usr/bin/env node

/**
 * @fileoverview Data Logging Verification Tests
 * @description Verify data logging functionality across the system
 * @author AION Team
 * @version 2.0.0
 */

const http = require('http');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

/**
 * Data Logging Verification Test Suite
 */
class DataLoggingVerification {
    constructor() {
        this.config = {
            mcpAgent: { url: 'http://localhost:3001' },
            timeout: 10000
        };
        
        this.testResults = {
            startTime: new Date(),
            tests: {},
            passed: 0,
            failed: 0
        };
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
     * Log test result
     */
    logTest(testName, status, message, details = null) {
        const statusIcon = status === 'pass' ? '✅' : '❌';
        console.log(chalk.blue(`${statusIcon} ${testName}: ${message}`));
        
        if (details) {
            console.log(chalk.gray(`   Details: ${JSON.stringify(details, null, 2)}`));
        }
        
        this.testResults.tests[testName] = { status, message, details };
        this.testResults[status === 'pass' ? 'passed' : 'failed']++;
    }

    /**
     * Test AI Decision Logging
     */
    async testAIDecisionLogging() {
        console.log(chalk.yellow('\n🤖 Testing AI Decision Logging...\n'));
        
        try {
            const testDecision = {
                strategy: 'test_logging_strategy',
                action: 'buy',
                confidence: 0.85,
                reasoning: 'Test decision for logging verification',
                timestamp: new Date().toISOString(),
                metadata: {
                    testId: 'data_logging_test_001',
                    source: 'integration_test'
                }
            };
            
            const response = await this.makeRequest(this.config.mcpAgent.url + '/api/ai/log-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(testDecision)
            });
            
            if (response.statusCode === 200 || response.statusCode === 201) {
                const result = JSON.parse(response.data);
                
                if (result.success) {
                    this.logTest('aiDecisionLogging', 'pass', 'AI decision logging successful', {
                        decisionId: result.decisionId,
                        logged: result.logged,
                        timestamp: result.timestamp
                    });
                } else {
                    this.logTest('aiDecisionLogging', 'fail', 'AI decision logging failed', result);
                }
            } else {
                this.logTest('aiDecisionLogging', 'fail', `AI decision logging returned status ${response.statusCode}`);
            }
        } catch (error) {
            this.logTest('aiDecisionLogging', 'fail', `AI decision logging test failed: ${error.message}`);
        }
    }

    /**
     * Test Hedera Consensus Service Logging
     */
    async testHederaLogging() {
        console.log(chalk.yellow('\n🔗 Testing Hedera Consensus Service Logging...\n'));
        
        try {
            const testMessage = {
                type: 'data_logging_test',
                content: 'Test message for HCS logging verification',
                timestamp: new Date().toISOString(),
                testId: 'hcs_logging_test_001'
            };
            
            const response = await this.makeRequest(this.config.mcpAgent.url + '/api/hedera/hcs/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ message: JSON.stringify(testMessage) })
            });
            
            if (response.statusCode === 200 || response.statusCode === 201) {
                const result = JSON.parse(response.data);
                
                if (result.success) {
                    this.logTest('hederaLogging', 'pass', 'Hedera HCS logging successful', {
                        transactionId: result.transactionId,
                        topicId: result.topicId,
                        messageId: result.messageId
                    });
                } else {
                    this.logTest('hederaLogging', 'fail', 'Hedera HCS logging failed', result);
                }
            } else {
                this.logTest('hederaLogging', 'fail', `Hedera HCS logging returned status ${response.statusCode}`);
            }
        } catch (error) {
            this.logTest('hederaLogging', 'fail', `Hedera HCS logging test failed: ${error.message}`);
        }
    }

    /**
     * Test Data Retrieval
     */
    async testDataRetrieval() {
        console.log(chalk.yellow('\n📊 Testing Data Retrieval...\n'));
        
        try {
            const response = await this.makeRequest(this.config.mcpAgent.url + '/api/ai/decisions?limit=5');
            
            if (response.statusCode === 200) {
                const result = JSON.parse(response.data);
                
                if (result.success && Array.isArray(result.data)) {
                    this.logTest('dataRetrieval', 'pass', 'Data retrieval successful', {
                        recordCount: result.data.length,
                        hasData: result.data.length > 0,
                        sampleRecord: result.data[0] || null
                    });
                } else {
                    this.logTest('dataRetrieval', 'fail', 'Data retrieval failed - invalid response format', result);
                }
            } else {
                this.logTest('dataRetrieval', 'fail', `Data retrieval returned status ${response.statusCode}`);
            }
        } catch (error) {
            this.logTest('dataRetrieval', 'fail', `Data retrieval test failed: ${error.message}`);
        }
    }

    /**
     * Generate verification report
     */
    async generateReport() {
        this.testResults.endTime = new Date();
        this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
        
        const reportPath = path.join(__dirname, '../DATA_LOGGING_VERIFICATION_REPORT.md');
        
        const report = `# Data Logging Verification Report

## Test Overview
**Date:** ${this.testResults.startTime.toISOString().split('T')[0]}  
**Duration:** ${Math.round(this.testResults.duration / 1000)} seconds  

## Test Results Summary
- **Total Tests**: ${this.testResults.passed + this.testResults.failed}
- **✅ Passed**: ${this.testResults.passed}
- **❌ Failed**: ${this.testResults.failed}
- **Success Rate**: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%

## Detailed Results

${Object.entries(this.testResults.tests)
    .map(([testName, result]) => {
        const statusIcon = result.status === 'pass' ? '✅' : '❌';
        return `### ${statusIcon} ${testName}
**Status:** ${result.status.toUpperCase()}  
**Message:** ${result.message}  
${result.details ? `**Details:**
\`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`` : ''}`;
    }).join('\n\n')}

## Summary
${this.testResults.failed === 0 ? 
    '✅ All data logging verification tests passed. The system is properly logging and retrieving data.' :
    `❌ ${this.testResults.failed} test(s) failed. Data logging functionality needs attention.`}

---
*Generated on: ${new Date().toISOString()}*
`;
        
        await fs.writeFile(reportPath, report);
        return reportPath;
    }

    /**
     * Run all verification tests
     */
    async runAllTests() {
        console.log(chalk.blue('📝 Starting Data Logging Verification Tests...\n'));
        
        await this.testAIDecisionLogging();
        await this.testHederaLogging();
        await this.testDataRetrieval();
        
        const reportPath = await this.generateReport();
        
        console.log(chalk.blue(`\n📊 Data Logging Verification Summary:`));
        console.log(chalk.green(`✅ Passed: ${this.testResults.passed}`));
        console.log(chalk.red(`❌ Failed: ${this.testResults.failed}`));
        console.log(chalk.blue(`📋 Report: ${reportPath}`));
        
        return {
            passed: this.testResults.passed,
            failed: this.testResults.failed,
            success: this.testResults.failed === 0
        };
    }
}

// Main execution
if (require.main === module) {
    const tester = new DataLoggingVerification();
    tester.runAllTests().then(results => {
        process.exit(results.success ? 0 : 1);
    }).catch(error => {
        console.error(chalk.red('❌ Data logging verification failed:'), error.message);
        process.exit(1);
    });
}

module.exports = { DataLoggingVerification };