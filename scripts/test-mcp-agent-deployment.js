#!/usr/bin/env node

/**
 * @fileoverview MCP Agent Deployment Testing Script
 * @description Test deployed MCP Agent functionality
 * @author AION Team
 * @version 2.0.0
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

/**
 * MCP Agent Deployment Tester
 */
class MCPAgentDeploymentTester {
    constructor() {
        this.config = {
            baseUrl: process.env.MCP_AGENT_URL || 'http://localhost:3001',
            timeout: 10000,
            retries: 3
        };
        
        this.testResults = {
            startTime: new Date(),
            tests: {},
            passed: 0,
            failed: 0,
            warnings: 0
        };
    }

    /**
     * Log test result
     */
    logTest(testName, status, message, details = null) {
        const timestamp = new Date().toISOString();
        const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
        
        console.log(chalk.blue(`[${timestamp}] ${statusIcon} ${testName}: ${message}`));
        
        if (details) {
            console.log(chalk.gray(`   Details: ${JSON.stringify(details, null, 2)}`));
        }
        
        this.testResults.tests[testName] = {
            status,
            message,
            details,
            timestamp
        };
        
        if (status === 'pass') {
            this.testResults.passed++;
        } else if (status === 'fail') {
            this.testResults.failed++;
        } else {
            this.testResults.warnings++;
        }
    }

    /**
     * Make HTTP request with retries
     */
    async makeRequest(method, endpoint, data = null, headers = {}) {
        const url = `${this.config.baseUrl}${endpoint}`;
        
        for (let attempt = 1; attempt <= this.config.retries; attempt++) {
            try {
                const response = await axios({
                    method,
                    url,
                    data,
                    headers,
                    timeout: this.config.timeout,
                    validateStatus: () => true // Don't throw on HTTP errors
                });
                
                return response;
            } catch (error) {
                if (attempt === this.config.retries) {
                    throw error;
                }
                
                console.log(chalk.yellow(`⚠️ Request attempt ${attempt} failed, retrying...`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    /**
     * Test 1: Health Check
     */
    async testHealthCheck() {
        try {
            const response = await this.makeRequest('GET', '/health');
            
            if (response.status === 200) {
                const health = response.data;
                
                if (health.status === 'healthy') {
                    this.logTest('healthCheck', 'pass', 'Health check passed', {
                        uptime: health.uptime,
                        version: health.version,
                        services: health.services
                    });
                } else {
                    this.logTest('healthCheck', 'fail', 'Health check returned unhealthy status', health);
                }
            } else {
                this.logTest('healthCheck', 'fail', `Health check returned status ${response.status}`, {
                    status: response.status,
                    data: response.data
                });
            }
        } catch (error) {
            this.logTest('healthCheck', 'fail', `Health check failed: ${error.message}`);
        }
    }

    /**
     * Test 2: API Info
     */
    async testAPIInfo() {
        try {
            const response = await this.makeRequest('GET', '/api');
            
            if (response.status === 200) {
                const apiInfo = response.data;
                
                if (apiInfo.name && apiInfo.version && apiInfo.endpoints) {
                    this.logTest('apiInfo', 'pass', 'API info endpoint working', {
                        name: apiInfo.name,
                        version: apiInfo.version,
                        endpoints: Object.keys(apiInfo.endpoints)
                    });
                } else {
                    this.logTest('apiInfo', 'fail', 'API info missing required fields', apiInfo);
                }
            } else {
                this.logTest('apiInfo', 'fail', `API info returned status ${response.status}`, {
                    status: response.status,
                    data: response.data
                });
            }
        } catch (error) {
            this.logTest('apiInfo', 'fail', `API info failed: ${error.message}`);
        }
    }

    /**
     * Test 3: Hedera Status
     */
    async testHederaStatus() {
        try {
            const response = await this.makeRequest('GET', '/api/hedera/status');
            
            if (response.status === 200) {
                const hederaStatus = response.data;
                
                if (hederaStatus.success && hederaStatus.data) {
                    this.logTest('hederaStatus', 'pass', 'Hedera status endpoint working', {
                        network: hederaStatus.data.network,
                        connected: hederaStatus.data.connected,
                        services: hederaStatus.data.services
                    });
                } else {
                    this.logTest('hederaStatus', 'fail', 'Hedera status returned error', hederaStatus);
                }
            } else {
                this.logTest('hederaStatus', 'fail', `Hedera status returned status ${response.status}`, {
                    status: response.status,
                    data: response.data
                });
            }
        } catch (error) {
            this.logTest('hederaStatus', 'fail', `Hedera status failed: ${error.message}`);
        }
    }

    /**
     * Test 4: Authentication Endpoints
     */
    async testAuthentication() {
        try {
            // Test login endpoint (should return 400 without credentials)
            const loginResponse = await this.makeRequest('POST', '/api/auth/login', {});
            
            if (loginResponse.status === 400) {
                this.logTest('authentication', 'pass', 'Authentication endpoint responding correctly', {
                    loginEndpoint: 'Available',
                    status: loginResponse.status
                });
            } else {
                this.logTest('authentication', 'warn', 'Authentication endpoint unexpected response', {
                    status: loginResponse.status,
                    data: loginResponse.data
                });
            }
        } catch (error) {
            this.logTest('authentication', 'fail', `Authentication test failed: ${error.message}`);
        }
    }

    /**
     * Test 5: Vault Endpoints
     */
    async testVaultEndpoints() {
        try {
            const response = await this.makeRequest('GET', '/api/vault/status');
            
            if (response.status === 200 || response.status === 401) {
                // 401 is expected without authentication
                this.logTest('vaultEndpoints', 'pass', 'Vault endpoints accessible', {
                    status: response.status,
                    authenticated: response.status === 200
                });
            } else {
                this.logTest('vaultEndpoints', 'fail', `Vault endpoint returned unexpected status ${response.status}`, {
                    status: response.status,
                    data: response.data
                });
            }
        } catch (error) {
            this.logTest('vaultEndpoints', 'fail', `Vault endpoints test failed: ${error.message}`);
        }
    }

    /**
     * Test 6: Monitoring Endpoints
     */
    async testMonitoringEndpoints() {
        try {
            const response = await this.makeRequest('GET', '/api/monitoring/metrics');
            
            if (response.status === 200) {
                const metrics = response.data;
                
                if (metrics.success && metrics.data) {
                    this.logTest('monitoringEndpoints', 'pass', 'Monitoring endpoints working', {
                        metricsAvailable: true,
                        timestamp: metrics.timestamp
                    });
                } else {
                    this.logTest('monitoringEndpoints', 'fail', 'Monitoring endpoints returned error', metrics);
                }
            } else {
                this.logTest('monitoringEndpoints', 'fail', `Monitoring endpoint returned status ${response.status}`, {
                    status: response.status,
                    data: response.data
                });
            }
        } catch (error) {
            this.logTest('monitoringEndpoints', 'fail', `Monitoring endpoints test failed: ${error.message}`);
        }
    }

    /**
     * Test 7: Rate Limiting
     */
    async testRateLimiting() {
        try {
            const requests = [];
            const requestCount = 60; // Should exceed rate limit
            
            // Make multiple rapid requests
            for (let i = 0; i < requestCount; i++) {
                requests.push(this.makeRequest('GET', '/api'));
            }
            
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            
            if (rateLimitedResponses.length > 0) {
                this.logTest('rateLimiting', 'pass', 'Rate limiting is working', {
                    totalRequests: requestCount,
                    rateLimitedRequests: rateLimitedResponses.length,
                    rateLimitPercentage: (rateLimitedResponses.length / requestCount * 100).toFixed(2) + '%'
                });
            } else {
                this.logTest('rateLimiting', 'warn', 'Rate limiting may not be working', {
                    totalRequests: requestCount,
                    rateLimitedRequests: 0
                });
            }
        } catch (error) {
            this.logTest('rateLimiting', 'fail', `Rate limiting test failed: ${error.message}`);
        }
    }

    /**
     * Test 8: Error Handling
     */
    async testErrorHandling() {
        try {
            const response = await this.makeRequest('GET', '/api/nonexistent-endpoint');
            
            if (response.status === 404) {
                this.logTest('errorHandling', 'pass', 'Error handling working correctly', {
                    status: response.status,
                    hasErrorMessage: !!response.data.error
                });
            } else {
                this.logTest('errorHandling', 'fail', `Unexpected response for non-existent endpoint: ${response.status}`, {
                    status: response.status,
                    data: response.data
                });
            }
        } catch (error) {
            this.logTest('errorHandling', 'fail', `Error handling test failed: ${error.message}`);
        }
    }

    /**
     * Test 9: CORS Headers
     */
    async testCORSHeaders() {
        try {
            const response = await this.makeRequest('OPTIONS', '/api', null, {
                'Origin': 'https://app.aion-ai.com',
                'Access-Control-Request-Method': 'GET'
            });
            
            const corsHeaders = {
                'access-control-allow-origin': response.headers['access-control-allow-origin'],
                'access-control-allow-methods': response.headers['access-control-allow-methods'],
                'access-control-allow-headers': response.headers['access-control-allow-headers']
            };
            
            if (corsHeaders['access-control-allow-origin']) {
                this.logTest('corsHeaders', 'pass', 'CORS headers present', corsHeaders);
            } else {
                this.logTest('corsHeaders', 'warn', 'CORS headers may not be configured', corsHeaders);
            }
        } catch (error) {
            this.logTest('corsHeaders', 'fail', `CORS headers test failed: ${error.message}`);
        }
    }

    /**
     * Test 10: Performance
     */
    async testPerformance() {
        try {
            const startTime = Date.now();
            const response = await this.makeRequest('GET', '/health');
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (response.status === 200) {
                if (responseTime < 1000) {
                    this.logTest('performance', 'pass', 'Response time acceptable', {
                        responseTime: `${responseTime}ms`,
                        threshold: '1000ms'
                    });
                } else {
                    this.logTest('performance', 'warn', 'Response time slow', {
                        responseTime: `${responseTime}ms`,
                        threshold: '1000ms'
                    });
                }
            } else {
                this.logTest('performance', 'fail', 'Performance test failed - endpoint not responding');
            }
        } catch (error) {
            this.logTest('performance', 'fail', `Performance test failed: ${error.message}`);
        }
    }

    /**
     * Generate test report
     */
    async generateReport() {
        this.testResults.endTime = new Date();
        this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
        
        const reportPath = path.join(__dirname, '../TASK_6_2_DEPLOYMENT_TEST_REPORT.md');
        
        const report = `# Task 6.2 Deployment Test Report: MCP Agent Testing

## 📋 Test Overview
**Task:** 6.2 Deploy enhanced MCP Agent with Hedera integration  
**Test Date:** ${this.testResults.startTime.toISOString().split('T')[0]}  
**Duration:** ${Math.round(this.testResults.duration / 1000)} seconds  
**Base URL:** ${this.config.baseUrl}

## 📊 Test Results Summary

### ✅ Passed Tests: ${this.testResults.passed}
### ❌ Failed Tests: ${this.testResults.failed}
### ⚠️ Warnings: ${this.testResults.warnings}
### 📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%

## 🧪 Detailed Test Results

${Object.entries(this.testResults.tests)
    .map(([testName, result]) => {
        const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        return `### ${statusIcon} ${testName}
**Status:** ${result.status.toUpperCase()}  
**Message:** ${result.message}  
**Timestamp:** ${result.timestamp}  
${result.details ? `**Details:**
\`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`` : ''}
`;
    }).join('\n')}

## 🎯 Test Categories

### Core Functionality
- Health Check: ${this.testResults.tests.healthCheck?.status || 'Not Run'}
- API Info: ${this.testResults.tests.apiInfo?.status || 'Not Run'}
- Hedera Status: ${this.testResults.tests.hederaStatus?.status || 'Not Run'}

### Security & Authentication
- Authentication: ${this.testResults.tests.authentication?.status || 'Not Run'}
- Rate Limiting: ${this.testResults.tests.rateLimiting?.status || 'Not Run'}
- CORS Headers: ${this.testResults.tests.corsHeaders?.status || 'Not Run'}

### API Endpoints
- Vault Endpoints: ${this.testResults.tests.vaultEndpoints?.status || 'Not Run'}
- Monitoring Endpoints: ${this.testResults.tests.monitoringEndpoints?.status || 'Not Run'}

### System Quality
- Error Handling: ${this.testResults.tests.errorHandling?.status || 'Not Run'}
- Performance: ${this.testResults.tests.performance?.status || 'Not Run'}

## 🔍 Recommendations

${this.testResults.failed > 0 ? `
### ❌ Critical Issues
- ${this.testResults.failed} test(s) failed and require immediate attention
- Review failed tests above and fix underlying issues
- Re-run tests after fixes are applied
` : ''}

${this.testResults.warnings > 0 ? `
### ⚠️ Warnings
- ${this.testResults.warnings} test(s) have warnings
- These may not be critical but should be reviewed
- Consider optimizing performance and configuration
` : ''}

${this.testResults.failed === 0 && this.testResults.warnings === 0 ? `
### ✅ All Tests Passed
- MCP Agent deployment is successful
- All core functionality is working
- System is ready for production use
` : ''}

## 📋 Next Steps

1. **Address Failed Tests**: Fix any critical issues identified
2. **Review Warnings**: Optimize performance and configuration
3. **Monitor Production**: Set up continuous monitoring
4. **Load Testing**: Consider running load tests for production readiness
5. **Documentation**: Update deployment documentation with findings

---
*Generated on: ${new Date().toISOString()}*
*Test Duration: ${Math.round(this.testResults.duration / 1000)} seconds*
*Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%*
`;

        await fs.writeFile(reportPath, report);
        return reportPath;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(chalk.blue('🧪 Starting MCP Agent Deployment Tests...'));
        console.log(chalk.gray(`Base URL: ${this.config.baseUrl}`));
        console.log(chalk.gray(`Timeout: ${this.config.timeout}ms`));
        console.log(chalk.gray(`Retries: ${this.config.retries}\n`));

        const tests = [
            'testHealthCheck',
            'testAPIInfo',
            'testHederaStatus',
            'testAuthentication',
            'testVaultEndpoints',
            'testMonitoringEndpoints',
            'testRateLimiting',
            'testErrorHandling',
            'testCORSHeaders',
            'testPerformance'
        ];

        for (const test of tests) {
            try {
                await this[test]();
            } catch (error) {
                console.error(chalk.red(`❌ Test ${test} failed:`, error.message));
            }
        }

        console.log(chalk.blue('\n📊 Test Summary:'));
        console.log(chalk.green(`✅ Passed: ${this.testResults.passed}`));
        console.log(chalk.red(`❌ Failed: ${this.testResults.failed}`));
        console.log(chalk.yellow(`⚠️ Warnings: ${this.testResults.warnings}`));

        const reportPath = await this.generateReport();
        console.log(chalk.blue(`📋 Test report generated: ${reportPath}`));

        return {
            passed: this.testResults.passed,
            failed: this.testResults.failed,
            warnings: this.testResults.warnings,
            success: this.testResults.failed === 0
        };
    }
}

// Main execution
async function main() {
    const tester = new MCPAgentDeploymentTester();
    
    try {
        const results = await tester.runAllTests();
        
        if (results.success) {
            console.log(chalk.green('\n🎉 All tests passed! MCP Agent deployment is successful.'));
            process.exit(0);
        } else {
            console.log(chalk.red(`\n❌ ${results.failed} test(s) failed. Please review and fix issues.`));
            process.exit(1);
        }
    } catch (error) {
        console.error(chalk.red('❌ Test execution failed:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { MCPAgentDeploymentTester };