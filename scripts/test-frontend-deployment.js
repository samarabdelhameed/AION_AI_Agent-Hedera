#!/usr/bin/env node

/**
 * @fileoverview Frontend Deployment Testing Script
 * @description Test deployed frontend functionality
 * @author AION Team
 * @version 2.0.0
 */

const http = require('http');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

/**
 * Frontend Deployment Tester
 */
class FrontendDeploymentTester {
    constructor() {
        this.config = {
            baseUrl: 'localhost',
            port: 3000,
            timeout: 5000
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
     * Make HTTP request
     */
    async makeRequest(path, method = 'GET') {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.config.baseUrl,
                port: this.config.port,
                path: path,
                method: method
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(this.config.timeout, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }

    /**
     * Test 1: Health Check
     */
    async testHealthCheck() {
        try {
            const response = await this.makeRequest('/health');
            
            if (response.statusCode === 200) {
                const healthData = response.data.trim();
                
                if (healthData === 'healthy') {
                    this.logTest('healthCheck', 'pass', 'Health check endpoint working correctly', {
                        statusCode: response.statusCode,
                        response: healthData
                    });
                } else {
                    this.logTest('healthCheck', 'fail', 'Health check returned unexpected response', {
                        statusCode: response.statusCode,
                        response: healthData
                    });
                }
            } else {
                this.logTest('healthCheck', 'fail', `Health check returned status ${response.statusCode}`, {
                    statusCode: response.statusCode,
                    response: response.data
                });
            }
        } catch (error) {
            this.logTest('healthCheck', 'fail', `Health check failed: ${error.message}`);
        }
    }

    /**
     * Test 2: Main Page
     */
    async testMainPage() {
        try {
            const response = await this.makeRequest('/');
            
            if (response.statusCode === 200) {
                const htmlContent = response.data;
                
                // Check for required content
                const requiredContent = [
                    'AION AI Agent',
                    'Hedera',
                    'Integration',
                    'AI Decision Logging',
                    'Vault Operations',
                    'Monitoring'
                ];
                
                const missingContent = requiredContent.filter(content => 
                    !htmlContent.includes(content)
                );
                
                if (missingContent.length === 0) {
                    this.logTest('mainPage', 'pass', 'Main page loads with all required content', {
                        statusCode: response.statusCode,
                        contentLength: htmlContent.length,
                        contentType: response.headers['content-type']
                    });
                } else {
                    this.logTest('mainPage', 'fail', 'Main page missing required content', {
                        statusCode: response.statusCode,
                        missingContent: missingContent
                    });
                }
            } else {
                this.logTest('mainPage', 'fail', `Main page returned status ${response.statusCode}`, {
                    statusCode: response.statusCode
                });
            }
        } catch (error) {
            this.logTest('mainPage', 'fail', `Main page test failed: ${error.message}`);
        }
    }

    /**
     * Test 3: Build Manifest
     */
    async testBuildManifest() {
        try {
            const response = await this.makeRequest('/build-manifest.json');
            
            if (response.statusCode === 200) {
                try {
                    const manifest = JSON.parse(response.data);
                    
                    const requiredFields = ['version', 'buildTime', 'environment', 'features', 'deployment'];
                    const missingFields = requiredFields.filter(field => !manifest[field]);
                    
                    if (missingFields.length === 0) {
                        this.logTest('buildManifest', 'pass', 'Build manifest is valid and complete', {
                            version: manifest.version,
                            buildTime: manifest.buildTime,
                            environment: manifest.environment,
                            featuresCount: manifest.features?.length || 0
                        });
                    } else {
                        this.logTest('buildManifest', 'fail', 'Build manifest missing required fields', {
                            missingFields: missingFields
                        });
                    }
                } catch (parseError) {
                    this.logTest('buildManifest', 'fail', 'Build manifest is not valid JSON', {
                        parseError: parseError.message
                    });
                }
            } else {
                this.logTest('buildManifest', 'fail', `Build manifest returned status ${response.statusCode}`, {
                    statusCode: response.statusCode
                });
            }
        } catch (error) {
            this.logTest('buildManifest', 'fail', `Build manifest test failed: ${error.message}`);
        }
    }

    /**
     * Test 4: Robots.txt
     */
    async testRobotsTxt() {
        try {
            const response = await this.makeRequest('/robots.txt');
            
            if (response.statusCode === 200) {
                const robotsContent = response.data;
                
                if (robotsContent.includes('User-agent:') && robotsContent.includes('Allow:')) {
                    this.logTest('robotsTxt', 'pass', 'Robots.txt is present and valid', {
                        statusCode: response.statusCode,
                        contentLength: robotsContent.length
                    });
                } else {
                    this.logTest('robotsTxt', 'fail', 'Robots.txt content is invalid', {
                        content: robotsContent
                    });
                }
            } else {
                this.logTest('robotsTxt', 'fail', `Robots.txt returned status ${response.statusCode}`, {
                    statusCode: response.statusCode
                });
            }
        } catch (error) {
            this.logTest('robotsTxt', 'fail', `Robots.txt test failed: ${error.message}`);
        }
    }

    /**
     * Test 5: Favicon
     */
    async testFavicon() {
        try {
            const response = await this.makeRequest('/favicon.svg');
            
            if (response.statusCode === 200) {
                const faviconContent = response.data;
                
                if (faviconContent.includes('<svg') && faviconContent.includes('</svg>')) {
                    this.logTest('favicon', 'pass', 'Favicon SVG is present and valid', {
                        statusCode: response.statusCode,
                        contentLength: faviconContent.length
                    });
                } else {
                    this.logTest('favicon', 'fail', 'Favicon SVG content is invalid', {
                        content: faviconContent.substring(0, 100) + '...'
                    });
                }
            } else {
                this.logTest('favicon', 'fail', `Favicon returned status ${response.statusCode}`, {
                    statusCode: response.statusCode
                });
            }
        } catch (error) {
            this.logTest('favicon', 'fail', `Favicon test failed: ${error.message}`);
        }
    }

    /**
     * Test 6: Content Type Headers
     */
    async testContentTypes() {
        try {
            const tests = [
                { path: '/', expectedType: 'text/html' },
                { path: '/build-manifest.json', expectedType: 'application/json' },
                { path: '/robots.txt', expectedType: 'text/plain' },
                { path: '/favicon.svg', expectedType: 'image/svg+xml' }
            ];
            
            let passedTests = 0;
            let totalTests = tests.length;
            
            for (const test of tests) {
                try {
                    const response = await this.makeRequest(test.path);
                    const contentType = response.headers['content-type'] || '';
                    
                    if (contentType.includes(test.expectedType.split('/')[0])) {
                        passedTests++;
                    }
                } catch (error) {
                    // Skip individual errors for this test
                }
            }
            
            if (passedTests === totalTests) {
                this.logTest('contentTypes', 'pass', 'All content types are correct', {
                    passedTests: passedTests,
                    totalTests: totalTests
                });
            } else if (passedTests > 0) {
                this.logTest('contentTypes', 'warn', 'Some content types may be incorrect', {
                    passedTests: passedTests,
                    totalTests: totalTests
                });
            } else {
                this.logTest('contentTypes', 'fail', 'Content type testing failed', {
                    passedTests: passedTests,
                    totalTests: totalTests
                });
            }
        } catch (error) {
            this.logTest('contentTypes', 'fail', `Content type test failed: ${error.message}`);
        }
    }

    /**
     * Test 7: Response Times
     */
    async testResponseTimes() {
        try {
            const paths = ['/', '/health', '/build-manifest.json'];
            const responseTimes = [];
            
            for (const path of paths) {
                const startTime = Date.now();
                try {
                    await this.makeRequest(path);
                    const responseTime = Date.now() - startTime;
                    responseTimes.push({ path, responseTime });
                } catch (error) {
                    responseTimes.push({ path, responseTime: -1, error: error.message });
                }
            }
            
            const avgResponseTime = responseTimes
                .filter(rt => rt.responseTime > 0)
                .reduce((sum, rt) => sum + rt.responseTime, 0) / responseTimes.length;
            
            if (avgResponseTime < 1000) {
                this.logTest('responseTimes', 'pass', 'Response times are acceptable', {
                    averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
                    responseTimes: responseTimes
                });
            } else if (avgResponseTime < 2000) {
                this.logTest('responseTimes', 'warn', 'Response times are slow but acceptable', {
                    averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
                    responseTimes: responseTimes
                });
            } else {
                this.logTest('responseTimes', 'fail', 'Response times are too slow', {
                    averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
                    responseTimes: responseTimes
                });
            }
        } catch (error) {
            this.logTest('responseTimes', 'fail', `Response time test failed: ${error.message}`);
        }
    }

    /**
     * Test 8: 404 Handling
     */
    async test404Handling() {
        try {
            const response = await this.makeRequest('/nonexistent-page');
            
            // For SPAs, 404s should return the main page (200) or proper 404
            if (response.statusCode === 200 || response.statusCode === 404) {
                this.logTest('404Handling', 'pass', '404 handling works correctly', {
                    statusCode: response.statusCode,
                    handlingType: response.statusCode === 200 ? 'SPA routing' : 'Proper 404'
                });
            } else {
                this.logTest('404Handling', 'fail', `Unexpected status for 404: ${response.statusCode}`, {
                    statusCode: response.statusCode
                });
            }
        } catch (error) {
            this.logTest('404Handling', 'fail', `404 handling test failed: ${error.message}`);
        }
    }

    /**
     * Generate test report
     */
    async generateReport() {
        this.testResults.endTime = new Date();
        this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
        
        const reportPath = path.join(__dirname, '../TASK_6_3_DEPLOYMENT_TEST_REPORT.md');
        
        const report = `# Task 6.3 Deployment Test Report: Frontend Testing

## 📋 Test Overview
**Task:** 6.3 Deploy updated frontend  
**Test Date:** ${this.testResults.startTime.toISOString().split('T')[0]}  
**Duration:** ${Math.round(this.testResults.duration / 1000)} seconds  
**Base URL:** http://${this.config.baseUrl}:${this.config.port}

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
- Main Page: ${this.testResults.tests.mainPage?.status || 'Not Run'}
- Build Manifest: ${this.testResults.tests.buildManifest?.status || 'Not Run'}

### Static Assets
- Robots.txt: ${this.testResults.tests.robotsTxt?.status || 'Not Run'}
- Favicon: ${this.testResults.tests.favicon?.status || 'Not Run'}
- Content Types: ${this.testResults.tests.contentTypes?.status || 'Not Run'}

### Performance & Reliability
- Response Times: ${this.testResults.tests.responseTimes?.status || 'Not Run'}
- 404 Handling: ${this.testResults.tests['404Handling']?.status || 'Not Run'}

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
- Frontend deployment is successful
- All core functionality is working
- System is ready for production use
` : ''}

## 📋 Next Steps

1. **Address Failed Tests**: Fix any critical issues identified
2. **Review Warnings**: Optimize performance and configuration
3. **Integration Testing**: Run comprehensive end-to-end tests (Task 6.4)
4. **Performance Testing**: Consider running load tests
5. **Monitoring Setup**: Set up continuous monitoring
6. **Documentation**: Update deployment documentation with findings

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
        console.log(chalk.blue('🧪 Starting Frontend Deployment Tests...'));
        console.log(chalk.gray(`Base URL: http://${this.config.baseUrl}:${this.config.port}`));
        console.log(chalk.gray(`Timeout: ${this.config.timeout}ms\n`));

        const tests = [
            'testHealthCheck',
            'testMainPage',
            'testBuildManifest',
            'testRobotsTxt',
            'testFavicon',
            'testContentTypes',
            'testResponseTimes',
            'test404Handling'
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
    const tester = new FrontendDeploymentTester();
    
    try {
        const results = await tester.runAllTests();
        
        if (results.success) {
            console.log(chalk.green('\n🎉 All tests passed! Frontend deployment is successful.'));
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

module.exports = { FrontendDeploymentTester };