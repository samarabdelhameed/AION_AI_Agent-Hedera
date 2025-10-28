#!/usr/bin/env node

/**
 * Performance Monitoring Script for Hedera Integration
 * Monitors system performance and generates real-time metrics
 */

import HederaService from '../services/hederaService.js';
import HederaErrorHandler from '../services/hederaErrorHandler.js';
import RealTimeEventMonitor from '../services/realTimeEventMonitor.js';
import ModelMetadataManager from '../services/modelMetadataManager.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: '.env.hedera' });

class PerformanceMonitor {
    constructor() {
        this.hederaService = null;
        this.errorHandler = null;
        this.eventMonitor = null;
        this.modelManager = null;
        this.web3Provider = null;
        
        this.metrics = {
            startTime: Date.now(),
            operations: {
                total: 0,
                successful: 0,
                failed: 0,
                hcsSubmissions: 0,
                hfsOperations: 0
            },
            performance: {
                averageResponseTime: 0,
                minResponseTime: Infinity,
                maxResponseTime: 0,
                totalResponseTime: 0
            },
            errors: {
                circuitBreakerTrips: 0,
                retryAttempts: 0,
                queuedOperations: 0
            },
            system: {
                memoryUsage: 0,
                cpuUsage: 0,
                uptime: 0
            }
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
    }

    /**
     * Initialize performance monitoring
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Performance Monitor...');
            
            // Initialize services
            this.web3Provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api');
            this.hederaService = new HederaService();
            this.errorHandler = new HederaErrorHandler();
            this.modelManager = new ModelMetadataManager();
            this.eventMonitor = new RealTimeEventMonitor(
                this.web3Provider,
                this.hederaService,
                null,
                this.modelManager
            );
            
            // Initialize all services
            await this.hederaService.initialize();
            this.errorHandler.initialize();
            await this.modelManager.initialize();
            await this.eventMonitor.initialize();
            
            // Set up event listeners for metrics collection
            this.setupEventListeners();
            
            console.log('✅ Performance Monitor initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Performance Monitor:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for metrics collection
     */
    setupEventListeners() {
        // Error handler events
        this.errorHandler.on('operation_success', (data) => {
            this.metrics.operations.successful++;
            this.updatePerformanceMetrics(data.duration || 0);
        });

        this.errorHandler.on('operation_failed', (data) => {
            this.metrics.operations.failed++;
            this.metrics.errors.retryAttempts += data.attempts || 0;
        });

        this.errorHandler.on('circuit_breaker_opened', (data) => {
            this.metrics.errors.circuitBreakerTrips++;
            console.log(`🚨 Circuit breaker opened for ${data.serviceName}`);
        });

        this.errorHandler.on('operation_queued', (data) => {
            this.metrics.errors.queuedOperations++;
        });

        // Event monitor events
        this.eventMonitor.on('event_processed', (data) => {
            this.metrics.operations.total++;
            console.log(`📊 Event processed: ${data.eventName}`);
        });

        this.eventMonitor.on('event_failed', (data, error) => {
            this.metrics.operations.failed++;
            console.log(`❌ Event processing failed: ${error.message}`);
        });
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(responseTime) {
        this.metrics.performance.totalResponseTime += responseTime;
        this.metrics.performance.minResponseTime = Math.min(this.metrics.performance.minResponseTime, responseTime);
        this.metrics.performance.maxResponseTime = Math.max(this.metrics.performance.maxResponseTime, responseTime);
        
        const totalOps = this.metrics.operations.successful + this.metrics.operations.failed;
        if (totalOps > 0) {
            this.metrics.performance.averageResponseTime = this.metrics.performance.totalResponseTime / totalOps;
        }
    }

    /**
     * Start performance monitoring
     */
    async startMonitoring(interval = 10000) {
        if (this.isMonitoring) {
            console.warn('⚠️ Performance monitoring already active');
            return;
        }

        console.log(`📊 Starting performance monitoring (interval: ${interval}ms)`);
        this.isMonitoring = true;
        this.metrics.startTime = Date.now();

        // Start periodic metrics collection
        this.monitoringInterval = setInterval(async () => {
            await this.collectMetrics();
            this.displayMetrics();
        }, interval);

        // Start event monitoring
        await this.eventMonitor.startMonitoring(5000);

        console.log('✅ Performance monitoring started');
    }

    /**
     * Collect system and service metrics
     */
    async collectMetrics() {
        try {
            // Update uptime
            this.metrics.system.uptime = Date.now() - this.metrics.startTime;

            // Collect memory usage
            const memUsage = process.memoryUsage();
            this.metrics.system.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB

            // Get error handler statistics
            const errorStats = this.errorHandler.getStatistics();
            this.metrics.errors.queuedOperations = errorStats.queueSize || 0;

            // Get Hedera service statistics
            const hederaStats = this.hederaService.getStatistics();
            this.metrics.operations.hcsSubmissions = errorStats.successfulOperations || 0;

            // Get event monitor statistics
            const eventStats = this.eventMonitor.getStatistics();
            this.metrics.operations.total = eventStats.totalEventsProcessed || 0;

        } catch (error) {
            console.error('❌ Error collecting metrics:', error);
        }
    }

    /**
     * Display current metrics
     */
    displayMetrics() {
        const uptime = Math.round(this.metrics.system.uptime / 1000);
        const successRate = this.metrics.operations.total > 0 
            ? ((this.metrics.operations.successful / this.metrics.operations.total) * 100).toFixed(1)
            : '0.0';

        console.log('\n📊 Performance Metrics Dashboard');
        console.log('═'.repeat(50));
        console.log(`⏱️  Uptime: ${uptime}s`);
        console.log(`📈 Operations: ${this.metrics.operations.total} total, ${this.metrics.operations.successful} successful`);
        console.log(`✅ Success Rate: ${successRate}%`);
        console.log(`⚡ Avg Response: ${this.metrics.performance.averageResponseTime.toFixed(2)}ms`);
        console.log(`🔄 Circuit Breakers: ${this.metrics.errors.circuitBreakerTrips} trips`);
        console.log(`📋 Queue Size: ${this.metrics.errors.queuedOperations}`);
        console.log(`💾 Memory Usage: ${this.metrics.system.memoryUsage}MB`);
        console.log('═'.repeat(50));
    }

    /**
     * Run performance stress test
     */
    async runStressTest(duration = 60000, operationInterval = 2000) {
        console.log(`🔥 Starting stress test (duration: ${duration}ms, interval: ${operationInterval}ms)`);
        
        const startTime = Date.now();
        const operations = [];
        let operationCount = 0;

        const stressInterval = setInterval(async () => {
            if (Date.now() - startTime >= duration) {
                clearInterval(stressInterval);
                return;
            }

            operationCount++;
            const operationStart = Date.now();

            try {
                // Simulate HCS submission
                const decisionData = {
                    txHash: `0x${Date.now().toString(16).padStart(64, '0')}`,
                    blockNumber: await this.web3Provider.getBlockNumber(),
                    logIndex: operationCount,
                    type: 'stress_test',
                    agent: process.env.ADMIN_ADDRESS || '0x0000000000000000000000000000000000000000',
                    decisionId: `stress_${operationCount}_${Date.now()}`,
                    timestamp: Date.now(),
                    operation: 'stress_test_operation',
                    testId: operationCount
                };

                await this.hederaService.submitDecisionWithRetry(decisionData, 2, 500);
                
                const operationEnd = Date.now();
                operations.push({
                    operationNumber: operationCount,
                    success: true,
                    duration: operationEnd - operationStart,
                    timestamp: operationEnd
                });

            } catch (error) {
                const operationEnd = Date.now();
                operations.push({
                    operationNumber: operationCount,
                    success: false,
                    duration: operationEnd - operationStart,
                    error: error.message,
                    timestamp: operationEnd
                });
            }
        }, operationInterval);

        // Wait for test completion
        await new Promise(resolve => {
            const checkCompletion = setInterval(() => {
                if (Date.now() - startTime >= duration) {
                    clearInterval(checkCompletion);
                    resolve();
                }
            }, 1000);
        });

        // Analyze stress test results
        const successful = operations.filter(op => op.success);
        const failed = operations.filter(op => !op.success);

        console.log('\n🔥 Stress Test Results');
        console.log('═'.repeat(40));
        console.log(`Total Operations: ${operations.length}`);
        console.log(`Successful: ${successful.length}`);
        console.log(`Failed: ${failed.length}`);
        console.log(`Success Rate: ${((successful.length / operations.length) * 100).toFixed(1)}%`);
        
        if (successful.length > 0) {
            const avgDuration = successful.reduce((sum, op) => sum + op.duration, 0) / successful.length;
            console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
        }
        
        console.log('═'.repeat(40));

        return {
            totalOperations: operations.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / operations.length) * 100,
            operations: operations
        };
    }

    /**
     * Generate performance report
     */
    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            testDuration: this.metrics.system.uptime,
            metrics: this.metrics,
            services: {
                hedera: this.hederaService.getStatistics(),
                errorHandler: this.errorHandler.getStatistics(),
                eventMonitor: this.eventMonitor.getStatistics(),
                modelManager: this.modelManager.getStatistics()
            },
            healthChecks: {
                hedera: await this.hederaService.healthCheck(),
                errorHandler: await this.errorHandler.healthCheck(),
                eventMonitor: await this.eventMonitor.healthCheck(),
                modelManager: await this.modelManager.healthCheck()
            }
        };

        // Save report to file
        const reportPath = `./tests/reports/performance-report-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📊 Performance report saved to: ${reportPath}`);
        return report;
    }

    /**
     * Stop performance monitoring
     */
    async stopMonitoring() {
        console.log('⏹️ Stopping performance monitoring...');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        await this.eventMonitor.stopMonitoring();
        
        // Generate final report
        const report = await this.generateReport();
        
        console.log('✅ Performance monitoring stopped');
        return report;
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.stopMonitoring();
            
            if (this.eventMonitor) await this.eventMonitor.close();
            if (this.modelManager) await this.modelManager.close();
            if (this.errorHandler) await this.errorHandler.close();
            if (this.hederaService) await this.hederaService.close();
            
            console.log('✅ Performance Monitor cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

// CLI interface
async function main() {
    const monitor = new PerformanceMonitor();
    
    try {
        await monitor.initialize();
        
        // Handle command line arguments
        const args = process.argv.slice(2);
        const command = args[0] || 'monitor';
        
        switch (command) {
            case 'monitor':
                await monitor.startMonitoring(10000);
                
                // Run for specified duration or until interrupted
                const duration = parseInt(args[1]) || 300000; // 5 minutes default
                setTimeout(async () => {
                    await monitor.cleanup();
                    process.exit(0);
                }, duration);
                break;
                
            case 'stress':
                await monitor.startMonitoring(5000);
                const stressDuration = parseInt(args[1]) || 60000; // 1 minute default
                const stressInterval = parseInt(args[2]) || 2000; // 2 seconds default
                
                await monitor.runStressTest(stressDuration, stressInterval);
                await monitor.cleanup();
                process.exit(0);
                break;
                
            case 'report':
                await monitor.startMonitoring(1000);
                setTimeout(async () => {
                    await monitor.cleanup();
                    process.exit(0);
                }, 10000); // 10 seconds for quick report
                break;
                
            default:
                console.log('Usage: node performance-monitor.js [monitor|stress|report] [duration] [interval]');
                process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Performance monitoring failed:', error);
        await monitor.cleanup();
        process.exit(1);
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await monitor.cleanup();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await monitor.cleanup();
        process.exit(0);
    });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default PerformanceMonitor;