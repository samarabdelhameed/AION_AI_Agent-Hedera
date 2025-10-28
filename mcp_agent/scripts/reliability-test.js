#!/usr/bin/env node

/**
 * Reliability Testing Script for Hedera Integration
 * Tests system reliability under various failure scenarios
 */

import HederaService from '../services/hederaService.js';
import HederaErrorHandler from '../services/hederaErrorHandler.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: '.env.hedera' });

class ReliabilityTester {
    constructor() {
        this.hederaService = null;
        this.errorHandler = null;
        this.web3Provider = null;
        
        this.testResults = {
            startTime: Date.now(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    /**
     * Initialize reliability tester
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Reliability Tester...');
            
            this.web3Provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api');
            this.hederaService = new HederaService();
            this.errorHandler = new HederaErrorHandler();
            
            await this.hederaService.initialize();
            this.errorHandler.initialize();
            
            console.log('✅ Reliability Tester initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Reliability Tester:', error);
            throw error;
        }
    }

    /**
     * Record test result
     */
    recordTest(testName, status, details = {}) {
        const result = {
            testName,
            status, // 'passed', 'failed', 'warning'
            timestamp: Date.now(),
            duration: details.duration || 0,
            details
        };
        
        this.testResults.tests.push(result);
        this.testResults.summary.total++;
        this.testResults.summary[status]++;
        
        const statusIcon = {
            passed: '✅',
            failed: '❌',
            warning: '⚠️'
        }[status];
        
        console.log(`${statusIcon} ${testName}: ${status.toUpperCase()}`);
        if (details.message) {
            console.log(`   ${details.message}`);
        }
    }

    /**
     * Test 1: Network Connectivity Reliability
     */
    async testNetworkConnectivity() {
        console.log('\n🌐 Testing Network Connectivity Reliability...');
        
        const startTime = Date.now();
        let successCount = 0;
        const totalAttempts = 10;
        
        for (let i = 0; i < totalAttempts; i++) {
            try {
                await this.web3Provider.getBlockNumber();
                successCount++;
            } catch (error) {
                console.warn(`   Attempt ${i + 1} failed: ${error.message}`);
            }
            
            // Small delay between attempts
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const duration = Date.now() - startTime;
        const successRate = (successCount / totalAttempts) * 100;
        
        if (successRate >= 90) {
            this.recordTest('Network Connectivity', 'passed', {
                duration,
                successRate,
                message: `${successCount}/${totalAttempts} successful connections (${successRate.toFixed(1)}%)`
            });
        } else if (successRate >= 70) {
            this.recordTest('Network Connectivity', 'warning', {
                duration,
                successRate,
                message: `${successCount}/${totalAttempts} successful connections (${successRate.toFixed(1)}%) - Network unstable`
            });
        } else {
            this.recordTest('Network Connectivity', 'failed', {
                duration,
                successRate,
                message: `${successCount}/${totalAttempts} successful connections (${successRate.toFixed(1)}%) - Network unreliable`
            });
        }
    }

    /**
     * Test 2: Error Handler Resilience
     */
    async testErrorHandlerResilience() {
        console.log('\n🛡️ Testing Error Handler Resilience...');
        
        const startTime = Date.now();
        
        // Test 1: Retry mechanism
        let retryTestPassed = false;
        try {
            let attemptCount = 0;
            const flakyOperation = async () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('NETWORK_ERROR: Simulated failure');
                }
                return { success: true, attempts: attemptCount };
            };
            
            const result = await this.errorHandler.executeWithRetry('retry_test', flakyOperation);
            retryTestPassed = result.success && result.attempts === 3;
        } catch (error) {
            console.warn(`   Retry test failed: ${error.message}`);
        }
        
        // Test 2: Circuit breaker
        let circuitBreakerTestPassed = false;
        try {
            const alwaysFailingOperation = async () => {
                throw new Error('SERVICE_UNAVAILABLE: Permanent failure');
            };
            
            // Trigger circuit breaker
            for (let i = 0; i < 6; i++) {
                try {
                    await this.errorHandler.executeWithRetry('circuit_test', alwaysFailingOperation);
                } catch (error) {
                    // Expected to fail
                }
            }
            
            const serviceHealth = this.errorHandler.getServiceHealth('circuit_test');
            circuitBreakerTestPassed = serviceHealth.circuitState === 'OPEN';
            
            // Reset for cleanup
            this.errorHandler.resetCircuitBreaker('circuit_test');
        } catch (error) {
            console.warn(`   Circuit breaker test failed: ${error.message}`);
        }
        
        // Test 3: Queue management
        let queueTestPassed = false;
        try {
            const queueableOperation = async () => {
                throw new Error('RATE_LIMITED: Temporary unavailability');
            };
            
            for (let i = 0; i < 3; i++) {
                try {
                    await this.errorHandler.executeWithRetry('queue_test', queueableOperation);
                } catch (error) {
                    // Expected to fail and queue
                }
            }
            
            const stats = this.errorHandler.getStatistics();
            queueTestPassed = stats.queueSize > 0;
            
            // Clear queue for cleanup
            this.errorHandler.clearQueue();
        } catch (error) {
            console.warn(`   Queue test failed: ${error.message}`);
        }
        
        const duration = Date.now() - startTime;
        const passedTests = [retryTestPassed, circuitBreakerTestPassed, queueTestPassed].filter(Boolean).length;
        
        if (passedTests === 3) {
            this.recordTest('Error Handler Resilience', 'passed', {
                duration,
                message: 'All error handling mechanisms working correctly'
            });
        } else if (passedTests >= 2) {
            this.recordTest('Error Handler Resilience', 'warning', {
                duration,
                message: `${passedTests}/3 error handling tests passed`
            });
        } else {
            this.recordTest('Error Handler Resilience', 'failed', {
                duration,
                message: `Only ${passedTests}/3 error handling tests passed`
            });
        }
    }

    /**
     * Test 3: Service Recovery After Failure
     */
    async testServiceRecovery() {
        console.log('\n🔄 Testing Service Recovery After Failure...');
        
        const startTime = Date.now();
        
        try {
            // Simulate service failure and recovery
            const serviceName = 'recovery_test';
            
            // Force circuit breaker open
            const failingOperation = async () => {
                throw new Error('SERVICE_DOWN: Simulated service failure');
            };
            
            for (let i = 0; i < 6; i++) {
                try {
                    await this.errorHandler.executeWithRetry(serviceName, failingOperation);
                } catch (error) {
                    // Expected to fail
                }
            }
            
            // Verify circuit is open
            let serviceHealth = this.errorHandler.getServiceHealth(serviceName);
            const circuitOpened = serviceHealth.circuitState === 'OPEN';
            
            // Reset circuit breaker (simulating service recovery)
            this.errorHandler.resetCircuitBreaker(serviceName);
            
            // Test successful operation after recovery
            const successfulOperation = async () => {
                return { success: true, recovered: true };
            };
            
            const result = await this.errorHandler.executeWithRetry(serviceName, successfulOperation);
            
            // Verify circuit is closed
            serviceHealth = this.errorHandler.getServiceHealth(serviceName);
            const circuitClosed = serviceHealth.circuitState === 'CLOSED';
            
            const duration = Date.now() - startTime;
            
            if (circuitOpened && result.success && circuitClosed) {
                this.recordTest('Service Recovery', 'passed', {
                    duration,
                    message: 'Service successfully recovered from failure state'
                });
            } else {
                this.recordTest('Service Recovery', 'failed', {
                    duration,
                    message: 'Service recovery mechanism not working correctly'
                });
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.recordTest('Service Recovery', 'failed', {
                duration,
                message: `Service recovery test failed: ${error.message}`
            });
        }
    }

    /**
     * Test 4: Memory Leak Detection
     */
    async testMemoryLeaks() {
        console.log('\n💾 Testing Memory Leak Detection...');
        
        const startTime = Date.now();
        const initialMemory = process.memoryUsage().heapUsed;
        
        try {
            // Perform many operations to test for memory leaks
            const operations = 100;
            
            for (let i = 0; i < operations; i++) {
                // Create and process mock decision data
                const decisionData = {
                    txHash: `0x${(Date.now() + i).toString(16).padStart(64, '0')}`,
                    blockNumber: 1000000 + i,
                    logIndex: i,
                    type: 'memory_test',
                    agent: '0x0000000000000000000000000000000000000000',
                    decisionId: `memory_test_${i}`,
                    timestamp: Date.now(),
                    operation: 'memory_leak_test'
                };
                
                // Simulate processing without actual Hedera calls
                try {
                    // Just process the data structure
                    JSON.stringify(decisionData);
                } catch (error) {
                    // Ignore processing errors for this test
                }
                
                // Periodic garbage collection hint
                if (i % 20 === 0 && global.gc) {
                    global.gc();
                }
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
            
            const duration = Date.now() - startTime;
            
            if (memoryIncreasePercent < 50) {
                this.recordTest('Memory Leak Detection', 'passed', {
                    duration,
                    memoryIncrease: Math.round(memoryIncrease / 1024 / 1024), // MB
                    message: `Memory increase: ${memoryIncreasePercent.toFixed(1)}% (acceptable)`
                });
            } else if (memoryIncreasePercent < 100) {
                this.recordTest('Memory Leak Detection', 'warning', {
                    duration,
                    memoryIncrease: Math.round(memoryIncrease / 1024 / 1024), // MB
                    message: `Memory increase: ${memoryIncreasePercent.toFixed(1)}% (monitor closely)`
                });
            } else {
                this.recordTest('Memory Leak Detection', 'failed', {
                    duration,
                    memoryIncrease: Math.round(memoryIncrease / 1024 / 1024), // MB
                    message: `Memory increase: ${memoryIncreasePercent.toFixed(1)}% (potential leak)`
                });
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.recordTest('Memory Leak Detection', 'failed', {
                duration,
                message: `Memory leak test failed: ${error.message}`
            });
        }
    }

    /**
     * Test 5: Concurrent Operation Handling
     */
    async testConcurrentOperations() {
        console.log('\n🔀 Testing Concurrent Operation Handling...');
        
        const startTime = Date.now();
        
        try {
            const concurrentOperations = 10;
            const operationPromises = [];
            
            for (let i = 0; i < concurrentOperations; i++) {
                const operation = async () => {
                    const operationStart = Date.now();
                    
                    // Simulate concurrent processing
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
                    
                    return {
                        operationId: i,
                        duration: Date.now() - operationStart,
                        success: true
                    };
                };
                
                operationPromises.push(
                    this.errorHandler.executeWithRetry(`concurrent_${i}`, operation)
                        .then(result => ({ success: true, result }))
                        .catch(error => ({ success: false, error: error.message }))
                );
            }
            
            const results = await Promise.allSettled(operationPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
            const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
            
            const duration = Date.now() - startTime;
            const successRate = (successful.length / concurrentOperations) * 100;
            
            if (successRate >= 90) {
                this.recordTest('Concurrent Operations', 'passed', {
                    duration,
                    successRate,
                    message: `${successful.length}/${concurrentOperations} concurrent operations successful`
                });
            } else if (successRate >= 70) {
                this.recordTest('Concurrent Operations', 'warning', {
                    duration,
                    successRate,
                    message: `${successful.length}/${concurrentOperations} concurrent operations successful (some failures)`
                });
            } else {
                this.recordTest('Concurrent Operations', 'failed', {
                    duration,
                    successRate,
                    message: `Only ${successful.length}/${concurrentOperations} concurrent operations successful`
                });
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.recordTest('Concurrent Operations', 'failed', {
                duration,
                message: `Concurrent operations test failed: ${error.message}`
            });
        }
    }

    /**
     * Run all reliability tests
     */
    async runAllTests() {
        console.log('🧪 Starting Comprehensive Reliability Testing...\n');
        
        const tests = [
            () => this.testNetworkConnectivity(),
            () => this.testErrorHandlerResilience(),
            () => this.testServiceRecovery(),
            () => this.testMemoryLeaks(),
            () => this.testConcurrentOperations()
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error(`❌ Test execution failed: ${error.message}`);
            }
        }
        
        this.displaySummary();
        return this.testResults;
    }

    /**
     * Display test summary
     */
    displaySummary() {
        const { summary } = this.testResults;
        const totalDuration = Date.now() - this.testResults.startTime;
        
        console.log('\n📊 Reliability Test Summary');
        console.log('═'.repeat(50));
        console.log(`Total Tests: ${summary.total}`);
        console.log(`✅ Passed: ${summary.passed}`);
        console.log(`❌ Failed: ${summary.failed}`);
        console.log(`⚠️  Warnings: ${summary.warnings}`);
        console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
        
        const successRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
        console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 90) {
            console.log('🎉 System reliability: EXCELLENT');
        } else if (successRate >= 70) {
            console.log('👍 System reliability: GOOD');
        } else if (successRate >= 50) {
            console.log('⚠️  System reliability: FAIR - Needs attention');
        } else {
            console.log('🚨 System reliability: POOR - Immediate action required');
        }
        
        console.log('═'.repeat(50));
    }

    /**
     * Generate reliability report
     */
    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            testDuration: Date.now() - this.testResults.startTime,
            results: this.testResults,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            },
            recommendations: this.generateRecommendations()
        };
        
        const reportPath = `./tests/reports/reliability-report-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📊 Reliability report saved to: ${reportPath}`);
        return report;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        const { summary } = this.testResults;
        
        if (summary.failed > 0) {
            recommendations.push('Review failed tests and address underlying issues');
        }
        
        if (summary.warnings > 0) {
            recommendations.push('Monitor warning conditions and consider optimization');
        }
        
        const successRate = (summary.passed / summary.total) * 100;
        if (successRate < 90) {
            recommendations.push('Improve system reliability to achieve >90% success rate');
        }
        
        // Check specific test results for targeted recommendations
        this.testResults.tests.forEach(test => {
            if (test.testName === 'Memory Leak Detection' && test.status !== 'passed') {
                recommendations.push('Investigate potential memory leaks and optimize memory usage');
            }
            
            if (test.testName === 'Network Connectivity' && test.status !== 'passed') {
                recommendations.push('Improve network connectivity reliability and add redundancy');
            }
            
            if (test.testName === 'Error Handler Resilience' && test.status !== 'passed') {
                recommendations.push('Enhance error handling mechanisms and retry strategies');
            }
        });
        
        if (recommendations.length === 0) {
            recommendations.push('System reliability is excellent - maintain current practices');
        }
        
        return recommendations;
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.errorHandler) await this.errorHandler.close();
            if (this.hederaService) await this.hederaService.close();
            console.log('✅ Reliability Tester cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

// CLI interface
async function main() {
    const tester = new ReliabilityTester();
    
    try {
        await tester.initialize();
        const results = await tester.runAllTests();
        await tester.generateReport();
        await tester.cleanup();
        
        // Exit with appropriate code
        const successRate = (results.summary.passed / results.summary.total) * 100;
        process.exit(successRate >= 70 ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Reliability testing failed:', error);
        await tester.cleanup();
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

// Also run if this is the main module
if (process.argv[1] && process.argv[1].endsWith('reliability-test.js')) {
    main().catch(console.error);
}

export default ReliabilityTester;