/**
 * Real Performance Monitor
 * Monitors REAL performance data comparing Hedera vs BSC
 * NO MOCK DATA - Only real network performance metrics
 */

import axios from 'axios';
import { ethers } from 'ethers';
import HederaRealDataMonitor from './hederaRealDataMonitor.js';
import HederaLogger from './hederaLogger.js';

class RealPerformanceMonitor {
    constructor(config) {
        this.config = {
            // Hedera configuration
            hederaNetwork: config.hederaNetwork || 'testnet',
            hederaMirrorNode: config.hederaMirrorNode || 'https://testnet.mirrornode.hedera.com',
            hederaAccountId: config.hederaAccountId,
            
            // BSC configuration
            bscRpcUrl: config.bscRpcUrl || 'https://data-seed-prebsc-1-s1.binance.org:8545',
            bscNetwork: config.bscNetwork || 'testnet',
            
            // Monitoring settings
            monitoringInterval: config.monitoringInterval || 60000, // 1 minute
            performanceHistoryLimit: config.performanceHistoryLimit || 100,
            ...config
        };

        this.logger = new HederaLogger({
            logFile: './logs/real-performance.log',
            enableMetrics: true
        });

        this.hederaMonitor = new HederaRealDataMonitor({
            network: this.config.hederaNetwork,
            mirrorNodeUrl: this.config.hederaMirrorNode,
            accountId: this.config.hederaAccountId
        });

        this.bscProvider = new ethers.JsonRpcProvider(this.config.bscRpcUrl);
        
        this.performanceHistory = [];
        this.isMonitoring = false;
        this.realTimeMetrics = {
            hedera: {},
            bsc: {},
            comparison: {}
        };
    }

    /**
     * Initialize performance monitoring
     */
    async initialize() {
        try {
            // Initialize Hedera monitor
            await this.hederaMonitor.initialize();

            // Test BSC connection
            const bscBlockNumber = await this.bscProvider.getBlockNumber();
            console.log(`✅ BSC connection established, current block: ${bscBlockNumber}`);

            this.logger.logHealthCheck('RealPerformanceMonitor', 'healthy', {
                hederaNetwork: this.config.hederaNetwork,
                bscNetwork: this.config.bscNetwork,
                bscBlockNumber: bscBlockNumber
            });

            return true;
        } catch (error) {
            this.logger.logHealthCheck('RealPerformanceMonitor', 'unhealthy', {
                error: error.message
            });
            console.error('❌ Failed to initialize Real Performance Monitor:', error.message);
            return false;
        }
    }

    /**
     * Measure REAL Hedera performance
     */
    async measureHederaPerformance() {
        const startTime = Date.now();
        const metrics = {
            timestamp: new Date().toISOString(),
            network: 'hedera',
            source: 'REAL_HEDERA_PERFORMANCE'
        };

        try {
            // Test 1: Account balance query performance
            const accountStartTime = Date.now();
            if (this.config.hederaAccountId) {
                await this.hederaMonitor.getRealAccountInfo(this.config.hederaAccountId);
                metrics.accountQueryTime = Date.now() - accountStartTime;
            }

            // Test 2: Network status query performance
            const networkStartTime = Date.now();
            const networkStatus = await this.hederaMonitor.getRealNetworkStatus();
            metrics.networkQueryTime = Date.now() - networkStartTime;
            metrics.exchangeRate = networkStatus.exchangeRate.current;
            metrics.nodeCount = networkStatus.nodes.length;

            // Test 3: HCS message retrieval performance
            const hcsStartTime = Date.now();
            if (this.config.hcsTopicId) {
                const messages = await this.hederaMonitor.getRealHCSMessages(this.config.hcsTopicId, 10);
                metrics.hcsQueryTime = Date.now() - hcsStartTime;
                metrics.hcsMessageCount = messages.length;
            }

            // Test 4: Token info query performance
            const htsStartTime = Date.now();
            if (this.config.htsTokenId) {
                await this.hederaMonitor.getRealTokenInfo(this.config.htsTokenId);
                metrics.htsQueryTime = Date.now() - htsStartTime;
            }

            // Calculate overall performance
            const queryTimes = [
                metrics.accountQueryTime,
                metrics.networkQueryTime,
                metrics.hcsQueryTime,
                metrics.htsQueryTime
            ].filter(time => time !== undefined);

            metrics.averageResponseTime = queryTimes.length > 0 
                ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length 
                : 0;
            
            metrics.totalTestTime = Date.now() - startTime;
            metrics.successfulQueries = queryTimes.length;
            metrics.success = true;

            // Log real performance data
            this.logger.logPerformanceMetrics('hedera', 'performance_test', {
                duration: metrics.averageResponseTime,
                throughput: metrics.successfulQueries,
                successRate: 1.0,
                errorRate: 0.0
            });

            return metrics;

        } catch (error) {
            metrics.error = error.message;
            metrics.success = false;
            metrics.totalTestTime = Date.now() - startTime;

            this.logger.logPerformanceMetrics('hedera', 'performance_test', {
                duration: metrics.totalTestTime,
                throughput: 0,
                successRate: 0.0,
                errorRate: 1.0
            });

            return metrics;
        }
    }

    /**
     * Measure REAL BSC performance
     */
    async measureBSCPerformance() {
        const startTime = Date.now();
        const metrics = {
            timestamp: new Date().toISOString(),
            network: 'bsc',
            source: 'REAL_BSC_PERFORMANCE'
        };

        try {
            // Test 1: Block number query performance
            const blockStartTime = Date.now();
            const blockNumber = await this.bscProvider.getBlockNumber();
            metrics.blockQueryTime = Date.now() - blockStartTime;
            metrics.currentBlock = blockNumber;

            // Test 2: Gas price query performance
            const gasPriceStartTime = Date.now();
            const gasPrice = await this.bscProvider.getFeeData();
            metrics.gasPriceQueryTime = Date.now() - gasPriceStartTime;
            metrics.gasPrice = gasPrice.gasPrice.toString();

            // Test 3: Network info query performance
            const networkStartTime = Date.now();
            const network = await this.bscProvider.getNetwork();
            metrics.networkQueryTime = Date.now() - networkStartTime;
            metrics.chainId = network.chainId.toString();

            // Test 4: Balance query performance (if account configured)
            if (this.config.bscAccountAddress) {
                const balanceStartTime = Date.now();
                const balance = await this.bscProvider.getBalance(this.config.bscAccountAddress);
                metrics.balanceQueryTime = Date.now() - balanceStartTime;
                metrics.accountBalance = balance.toString();
            }

            // Calculate overall performance
            const queryTimes = [
                metrics.blockQueryTime,
                metrics.gasPriceQueryTime,
                metrics.networkQueryTime,
                metrics.balanceQueryTime
            ].filter(time => time !== undefined);

            metrics.averageResponseTime = queryTimes.length > 0 
                ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length 
                : 0;
            
            metrics.totalTestTime = Date.now() - startTime;
            metrics.successfulQueries = queryTimes.length;
            metrics.success = true;

            // Log real performance data
            this.logger.logPerformanceMetrics('bsc', 'performance_test', {
                duration: metrics.averageResponseTime,
                throughput: metrics.successfulQueries,
                successRate: 1.0,
                errorRate: 0.0
            });

            return metrics;

        } catch (error) {
            metrics.error = error.message;
            metrics.success = false;
            metrics.totalTestTime = Date.now() - startTime;

            this.logger.logPerformanceMetrics('bsc', 'performance_test', {
                duration: metrics.totalTestTime,
                throughput: 0,
                successRate: 0.0,
                errorRate: 1.0
            });

            return metrics;
        }
    }

    /**
     * Compare REAL performance between Hedera and BSC
     */
    async compareRealPerformance() {
        const comparisonStartTime = Date.now();
        
        try {
            console.log('📊 Starting real performance comparison...');

            // Measure both networks simultaneously
            const [hederaMetrics, bscMetrics] = await Promise.all([
                this.measureHederaPerformance(),
                this.measureBSCPerformance()
            ]);

            // Calculate real comparison metrics
            const comparison = {
                timestamp: new Date().toISOString(),
                source: 'REAL_PERFORMANCE_COMPARISON',
                hedera: hederaMetrics,
                bsc: bscMetrics,
                comparison: {
                    responseTimeRatio: hederaMetrics.success && bscMetrics.success 
                        ? (hederaMetrics.averageResponseTime / bscMetrics.averageResponseTime).toFixed(2)
                        : null,
                    hederaFaster: hederaMetrics.success && bscMetrics.success 
                        ? hederaMetrics.averageResponseTime < bscMetrics.averageResponseTime
                        : null,
                    speedDifference: hederaMetrics.success && bscMetrics.success 
                        ? Math.abs(hederaMetrics.averageResponseTime - bscMetrics.averageResponseTime)
                        : null,
                    bothSuccessful: hederaMetrics.success && bscMetrics.success,
                    winner: this.determinePerformanceWinner(hederaMetrics, bscMetrics)
                },
                testDuration: Date.now() - comparisonStartTime
            };

            // Store in performance history
            this.performanceHistory.push(comparison);
            
            // Keep only recent history
            if (this.performanceHistory.length > this.config.performanceHistoryLimit) {
                this.performanceHistory = this.performanceHistory.slice(-this.config.performanceHistoryLimit);
            }

            // Update real-time metrics
            this.realTimeMetrics = {
                hedera: hederaMetrics,
                bsc: bscMetrics,
                comparison: comparison.comparison,
                lastUpdate: comparison.timestamp
            };

            // Log comparison results
            this.logger.logPerformanceMetrics('comparison', 'network_comparison', {
                duration: comparison.testDuration,
                hederaSuccess: hederaMetrics.success,
                bscSuccess: bscMetrics.success,
                winner: comparison.comparison.winner
            });

            console.log('✅ Real performance comparison completed');
            console.log(`   Hedera avg response: ${hederaMetrics.averageResponseTime}ms`);
            console.log(`   BSC avg response: ${bscMetrics.averageResponseTime}ms`);
            console.log(`   Winner: ${comparison.comparison.winner}`);

            return comparison;

        } catch (error) {
            this.logger.logPerformanceMetrics('comparison', 'network_comparison', {
                duration: Date.now() - comparisonStartTime,
                error: error.message,
                success: false
            });

            throw new Error(`Real performance comparison failed: ${error.message}`);
        }
    }

    /**
     * Determine performance winner based on real metrics
     */
    determinePerformanceWinner(hederaMetrics, bscMetrics) {
        if (!hederaMetrics.success && !bscMetrics.success) {
            return 'both_failed';
        }
        
        if (!hederaMetrics.success) {
            return 'bsc';
        }
        
        if (!bscMetrics.success) {
            return 'hedera';
        }

        // Compare average response times
        if (hederaMetrics.averageResponseTime < bscMetrics.averageResponseTime) {
            return 'hedera';
        } else if (bscMetrics.averageResponseTime < hederaMetrics.averageResponseTime) {
            return 'bsc';
        } else {
            return 'tie';
        }
    }

    /**
     * Get REAL transaction costs comparison
     */
    async getRealTransactionCosts() {
        try {
            const costs = {
                timestamp: new Date().toISOString(),
                source: 'REAL_TRANSACTION_COSTS'
            };

            // Get real Hedera costs
            const hederaNetwork = await this.hederaMonitor.getRealNetworkStatus();
            costs.hedera = {
                hcsMessageCost: 0.0001, // Real HCS cost in USD
                htsTransferCost: 0.001, // Real HTS cost in USD
                hfsFileCost: 0.05, // Real HFS cost per KB in USD
                exchangeRate: hederaNetwork.exchangeRate.current,
                currency: 'USD'
            };

            // Get real BSC costs
            const bscGasPrice = await this.bscProvider.getFeeData();
            const bnbPriceResponse = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            const bnbPrice = parseFloat(bnbPriceResponse.data.price);

            costs.bsc = {
                gasPrice: bscGasPrice.gasPrice.toString(),
                transferCost: (21000 * parseFloat(ethers.formatUnits(bscGasPrice.gasPrice, 'gwei')) * bnbPrice / 1e9).toFixed(6),
                contractCallCost: (100000 * parseFloat(ethers.formatUnits(bscGasPrice.gasPrice, 'gwei')) * bnbPrice / 1e9).toFixed(6),
                bnbPrice: bnbPrice,
                currency: 'USD'
            };

            // Calculate cost comparison
            costs.comparison = {
                hederaCheaper: parseFloat(costs.hedera.htsTransferCost) < parseFloat(costs.bsc.transferCost),
                costDifference: Math.abs(parseFloat(costs.hedera.htsTransferCost) - parseFloat(costs.bsc.transferCost)).toFixed(6),
                savingsPercentage: (((parseFloat(costs.bsc.transferCost) - parseFloat(costs.hedera.htsTransferCost)) / parseFloat(costs.bsc.transferCost)) * 100).toFixed(2)
            };

            return costs;

        } catch (error) {
            throw new Error(`Failed to get real transaction costs: ${error.message}`);
        }
    }

    /**
     * Start continuous real performance monitoring
     */
    startRealPerformanceMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Real performance monitoring is already running');
            return;
        }

        this.isMonitoring = true;
        console.log('🔄 Starting continuous real performance monitoring...');

        this.monitoringInterval = setInterval(async () => {
            try {
                await this.compareRealPerformance();
                console.log('✅ Real performance monitoring cycle completed');
            } catch (error) {
                console.error('❌ Real performance monitoring cycle failed:', error.message);
            }
        }, this.config.monitoringInterval);

        console.log(`✅ Real performance monitoring started (interval: ${this.config.monitoringInterval}ms)`);
    }

    /**
     * Stop real performance monitoring
     */
    stopRealPerformanceMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        console.log('⏹️ Real performance monitoring stopped');
    }

    /**
     * Get real-time performance metrics
     */
    getRealTimeMetrics() {
        return {
            ...this.realTimeMetrics,
            isMonitoring: this.isMonitoring,
            historyCount: this.performanceHistory.length,
            source: 'REAL_TIME_METRICS'
        };
    }

    /**
     * Get performance history
     */
    getPerformanceHistory(limit = 50) {
        return {
            history: this.performanceHistory.slice(-limit),
            totalRecords: this.performanceHistory.length,
            source: 'REAL_PERFORMANCE_HISTORY'
        };
    }

    /**
     * Generate real performance report
     */
    generateRealPerformanceReport() {
        if (this.performanceHistory.length === 0) {
            return {
                error: 'No performance data available',
                source: 'REAL_PERFORMANCE_REPORT'
            };
        }

        const recentData = this.performanceHistory.slice(-20); // Last 20 measurements
        const hederaWins = recentData.filter(d => d.comparison.winner === 'hedera').length;
        const bscWins = recentData.filter(d => d.comparison.winner === 'bsc').length;

        const report = {
            timestamp: new Date().toISOString(),
            source: 'REAL_PERFORMANCE_REPORT',
            summary: {
                totalMeasurements: this.performanceHistory.length,
                recentMeasurements: recentData.length,
                hederaWins: hederaWins,
                bscWins: bscWins,
                winRate: {
                    hedera: ((hederaWins / recentData.length) * 100).toFixed(1),
                    bsc: ((bscWins / recentData.length) * 100).toFixed(1)
                }
            },
            averagePerformance: {
                hedera: {
                    avgResponseTime: (recentData
                        .filter(d => d.hedera.success)
                        .reduce((sum, d) => sum + d.hedera.averageResponseTime, 0) / 
                        recentData.filter(d => d.hedera.success).length).toFixed(2),
                    successRate: ((recentData.filter(d => d.hedera.success).length / recentData.length) * 100).toFixed(1)
                },
                bsc: {
                    avgResponseTime: (recentData
                        .filter(d => d.bsc.success)
                        .reduce((sum, d) => sum + d.bsc.averageResponseTime, 0) / 
                        recentData.filter(d => d.bsc.success).length).toFixed(2),
                    successRate: ((recentData.filter(d => d.bsc.success).length / recentData.length) * 100).toFixed(1)
                }
            },
            currentMetrics: this.realTimeMetrics
        };

        return report;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopRealPerformanceMonitoring();
        
        if (this.hederaMonitor) {
            this.hederaMonitor.cleanup();
        }

        if (this.logger) {
            this.logger.cleanup();
        }

        console.log('✅ Real Performance Monitor cleanup completed');
    }
}

export default RealPerformanceMonitor;