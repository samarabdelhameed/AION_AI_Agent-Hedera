#!/usr/bin/env node

/**
 * Test Monitoring System
 * Tests the comprehensive monitoring system with REAL data
 * NO MOCK DATA - Only real Hedera and BSC network tests
 */

import ComprehensiveMonitoringSystem from '../mcp_agent/services/comprehensiveMonitoringSystem.js';
import { config } from 'dotenv';
import chalk from 'chalk';

// Load environment variables
config({ path: '.env.hedera' });

class MonitoringSystemTest {
    constructor() {
        this.testResults = {
            initialization: false,
            hederaDataRetrieval: false,
            performanceComparison: false,
            alertSystem: false,
            healthChecks: false,
            realTimeMonitoring: false
        };

        this.monitoringSystem = new ComprehensiveMonitoringSystem({
            hederaNetwork: process.env.HEDERA_NETWORK || 'testnet',
            hederaMirrorNode: process.env.HEDERA_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com',
            hederaAccountId: process.env.HEDERA_ACCOUNT_ID,
            hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY,
            hcsTopicId: process.env.HCS_TOPIC_ID,
            hfsFileId: process.env.HFS_BRIDGE_FILE_ID,
            htsTokenId: process.env.HTS_SHARE_TOKEN_ID,
            bscRpcUrl: process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
            bscAccountAddress: process.env.BSC_ACCOUNT_ADDRESS
        });
    }

    /**
     * Test monitoring system initialization
     */
    async testInitialization() {
        console.log(chalk.blue('🔧 Testing monitoring system initialization...'));
        
        try {
            const initialized = await this.monitoringSystem.startMonitoring();
            
            if (initialized) {
                console.log(chalk.green('   ✅ Monitoring system initialized successfully'));
                this.testResults.initialization = true;
            } else {
                console.log(chalk.red('   ❌ Monitoring system initialization failed'));
            }
            
            return initialized;
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Initialization error: ${error.message}`));
            return false;
        }
    }

    /**
     * Test real Hedera data retrieval
     */
    async testHederaDataRetrieval() {
        console.log(chalk.blue('\\n📊 Testing real Hedera data retrieval...'));
        
        try {
            const tests = [];
            
            // Test 1: Network status
            console.log(chalk.gray('   Testing network status...'));
            const networkStatus = await this.monitoringSystem.hederaMonitor.getRealNetworkStatus();
            tests.push({
                name: 'Network Status',
                success: !!networkStatus.exchangeRate,
                data: `Exchange rate: ${networkStatus.exchangeRate?.current || 'N/A'}`
            });
            
            // Test 2: Account info (if configured)
            if (process.env.HEDERA_ACCOUNT_ID) {
                console.log(chalk.gray('   Testing account info...'));
                const accountInfo = await this.monitoringSystem.hederaMonitor.getRealAccountInfo(process.env.HEDERA_ACCOUNT_ID);
                tests.push({
                    name: 'Account Info',
                    success: !!accountInfo.accountId,
                    data: `Balance: ${(parseFloat(accountInfo.balance.hbar) / 100000000).toFixed(2)} HBAR`
                });
            }
            
            // Test 3: HCS messages (if configured)
            if (process.env.HCS_TOPIC_ID) {
                console.log(chalk.gray('   Testing HCS messages...'));
                const messages = await this.monitoringSystem.hederaMonitor.getRealHCSMessages(process.env.HCS_TOPIC_ID, 5);
                tests.push({
                    name: 'HCS Messages',
                    success: Array.isArray(messages),
                    data: `Retrieved ${messages.length} messages`
                });
            }
            
            // Test 4: HTS token info (if configured)
            if (process.env.HTS_SHARE_TOKEN_ID) {
                console.log(chalk.gray('   Testing HTS token info...'));
                const tokenInfo = await this.monitoringSystem.hederaMonitor.getRealTokenInfo(process.env.HTS_SHARE_TOKEN_ID);
                tests.push({
                    name: 'HTS Token Info',
                    success: !!tokenInfo.tokenId,
                    data: `Token: ${tokenInfo.symbol} (${tokenInfo.name})`
                });
            }
            
            // Display results
            const successfulTests = tests.filter(test => test.success);
            
            for (const test of tests) {
                const status = test.success ? chalk.green('✅') : chalk.red('❌');
                console.log(`   ${status} ${test.name}: ${test.data}`);
            }
            
            this.testResults.hederaDataRetrieval = successfulTests.length === tests.length;
            
            console.log(chalk.cyan(`   Summary: ${successfulTests.length}/${tests.length} tests passed`));
            
            return this.testResults.hederaDataRetrieval;
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Hedera data retrieval error: ${error.message}`));
            return false;
        }
    }

    /**
     * Test real performance comparison
     */
    async testPerformanceComparison() {
        console.log(chalk.blue('\\n⚡ Testing real performance comparison...'));
        
        try {
            console.log(chalk.gray('   Running performance comparison between Hedera and BSC...'));
            
            const comparison = await this.monitoringSystem.performanceMonitor.compareRealPerformance();
            
            if (comparison && comparison.comparison) {
                console.log(chalk.green('   ✅ Performance comparison completed'));
                console.log(chalk.cyan(`   Winner: ${comparison.comparison.winner}`));
                console.log(chalk.cyan(`   Hedera avg response: ${comparison.hedera.averageResponseTime}ms`));
                console.log(chalk.cyan(`   BSC avg response: ${comparison.bsc.averageResponseTime}ms`));
                
                if (comparison.comparison.speedDifference) {
                    console.log(chalk.cyan(`   Speed difference: ${comparison.comparison.speedDifference}ms`));
                }
                
                this.testResults.performanceComparison = true;
            } else {
                console.log(chalk.red('   ❌ Performance comparison failed'));
            }
            
            return this.testResults.performanceComparison;
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Performance comparison error: ${error.message}`));
            return false;
        }
    }

    /**
     * Test real alert system
     */
    async testAlertSystem() {
        console.log(chalk.blue('\\n🚨 Testing real alert system...'));
        
        try {
            console.log(chalk.gray('   Sending test alert...'));
            
            await this.monitoringSystem.alertingSystem.testRealAlert();
            
            // Get alert statistics
            const alertStats = this.monitoringSystem.alertingSystem.getRealAlertStatistics();
            
            console.log(chalk.green('   ✅ Test alert sent successfully'));
            console.log(chalk.cyan(`   Total alerts: ${alertStats.total.allTime}`));
            console.log(chalk.cyan(`   Last 24h alerts: ${alertStats.total.last24Hours}`));
            
            this.testResults.alertSystem = true;
            
            return true;
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Alert system error: ${error.message}`));
            return false;
        }
    }

    /**
     * Test health checks
     */
    async testHealthChecks() {
        console.log(chalk.blue('\\n🏥 Testing health checks...'));
        
        try {
            console.log(chalk.gray('   Running comprehensive health check...'));
            
            const healthCheck = await this.monitoringSystem.performComprehensiveHealthCheck();
            
            if (healthCheck) {
                console.log(chalk.green('   ✅ Health check completed'));
                console.log(chalk.cyan(`   Overall status: ${healthCheck.overall}`));
                
                // Display service statuses
                for (const [serviceName, serviceStatus] of Object.entries(healthCheck.services)) {
                    const status = serviceStatus.status || 'unknown';
                    const statusColor = status === 'healthy' ? chalk.green : 
                                      status === 'warning' ? chalk.yellow : chalk.red;
                    console.log(`   ${statusColor(serviceName)}: ${status}`);
                }
                
                this.testResults.healthChecks = true;
            } else {
                console.log(chalk.red('   ❌ Health check failed'));
            }
            
            return this.testResults.healthChecks;
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Health check error: ${error.message}`));
            return false;
        }
    }

    /**
     * Test real-time monitoring
     */
    async testRealTimeMonitoring() {
        console.log(chalk.blue('\\n📡 Testing real-time monitoring...'));
        
        try {
            console.log(chalk.gray('   Getting real-time dashboard data...'));
            
            const dashboardData = await this.monitoringSystem.getRealTimeDashboardData();
            
            if (dashboardData && dashboardData.systemStatus) {
                console.log(chalk.green('   ✅ Real-time data retrieved'));
                console.log(chalk.cyan(`   System status: ${dashboardData.systemStatus.overall}`));
                console.log(chalk.cyan(`   Monitoring active: ${dashboardData.systemStatus.isMonitoring}`));
                
                if (dashboardData.performanceMetrics) {
                    console.log(chalk.cyan(`   Performance data available: Yes`));
                }
                
                if (dashboardData.alertStatistics) {
                    console.log(chalk.cyan(`   Alert data available: Yes`));
                }
                
                this.testResults.realTimeMonitoring = true;
            } else {
                console.log(chalk.red('   ❌ Real-time monitoring failed'));
            }
            
            return this.testResults.realTimeMonitoring;
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Real-time monitoring error: ${error.message}`));
            return false;
        }
    }

    /**
     * Generate test report
     */
    generateTestReport() {
        console.log('\\n' + chalk.bold('📊 MONITORING SYSTEM TEST REPORT'));
        console.log('=' .repeat(60));
        
        const tests = [
            { name: 'Initialization', result: this.testResults.initialization },
            { name: 'Hedera Data Retrieval', result: this.testResults.hederaDataRetrieval },
            { name: 'Performance Comparison', result: this.testResults.performanceComparison },
            { name: 'Alert System', result: this.testResults.alertSystem },
            { name: 'Health Checks', result: this.testResults.healthChecks },
            { name: 'Real-time Monitoring', result: this.testResults.realTimeMonitoring }
        ];
        
        let passedTests = 0;
        
        console.log('\\n📈 TEST RESULTS:');
        for (const test of tests) {
            const status = test.result ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
            console.log(`   ${test.name}: ${status}`);
            if (test.result) passedTests++;
        }
        
        console.log('\\n📊 SUMMARY:');
        console.log(`   Tests Passed: ${passedTests}/${tests.length}`);
        console.log(`   Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);
        
        if (passedTests === tests.length) {
            console.log(chalk.green('\\n🎉 All tests passed! Monitoring system is working correctly with REAL data.'));
        } else {
            console.log(chalk.yellow('\\n⚠️ Some tests failed. Please check configuration and network connectivity.'));
        }
        
        console.log('\\n🔗 MONITORING ENDPOINTS:');
        console.log('   Status: GET /api/monitoring/status');
        console.log('   Dashboard: GET /api/monitoring/dashboard');
        console.log('   Performance: GET /api/monitoring/performance');
        console.log('   Alerts: GET /api/monitoring/alerts');
        console.log('   Health: GET /api/monitoring/health');
        
        console.log('\\n' + '=' .repeat(60));
        
        return passedTests === tests.length;
    }

    /**
     * Run all monitoring tests
     */
    async runAllTests() {
        console.log(chalk.bold('🧪 Starting Comprehensive Monitoring System Tests...'));
        console.log(chalk.gray('Testing with REAL data from Hedera and BSC networks'));
        console.log('=' .repeat(60));
        
        try {
            // Run tests in sequence
            await this.testInitialization();
            await this.testHederaDataRetrieval();
            await this.testPerformanceComparison();
            await this.testAlertSystem();
            await this.testHealthChecks();
            await this.testRealTimeMonitoring();
            
            // Generate report
            const allPassed = this.generateTestReport();
            
            return allPassed;
            
        } catch (error) {
            console.log(chalk.red('❌ Test execution failed:'), error.message);
            return false;
        } finally {
            // Cleanup
            console.log('\\n🧹 Cleaning up test resources...');
            this.monitoringSystem.cleanup();
            console.log('✅ Cleanup completed');
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new MonitoringSystemTest();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export default MonitoringSystemTest;