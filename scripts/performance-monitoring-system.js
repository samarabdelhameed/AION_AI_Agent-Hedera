#!/usr/bin/env node

/**
 * Performance Monitoring System
 * Comprehensive monitoring for Hedera integration performance
 */

const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitoringSystem {
    constructor() {
        this.metrics = {
            responseTime: [],
            successRate: [],
            resourceUsage: [],
            hederaOperations: [],
            apiCalls: [],
            errors: []
        };
        
        this.thresholds = {
            responseTime: 2000, // 2 seconds
            successRate: 95, // 95%
            cpuUsage: 80, // 80%
            memoryUsage: 85 // 85%
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.logFile = path.join(__dirname, '../logs/performance.log');
    }

    async startMonitoring() {
        console.log('🚀 Starting Performance Monitoring System...');
        
        this.isMonitoring = true;
        
        // Create logs directory if it doesn't exist
        await this.ensureLogDirectory();
        
        // Start monitoring intervals
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 5000); // Collect metrics every 5 seconds
        
        // Monitor API endpoints
        this.startAPIMonitoring();
        
        // Monitor Hedera operations
        this.startHederaMonitoring();
        
        // Monitor system resources
        this.startResourceMonitoring();
        
        console.log('✅ Performance monitoring started successfully');
        
        return {
            status: 'started',
            timestamp: new Date().toISOString(),
            monitoringInterval: 5000
        };
    }

    async ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        try {
            await fs.access(logDir);
        } catch (error) {
            await fs.mkdir(logDir, { recursive: true });
        }
    }

    async collectMetrics() {
        const timestamp = new Date().toISOString();
        
        try {
            // Collect response time metrics
            const responseTimeMetric = await this.measureResponseTime();
            
            // Collect success rate metrics
            const successRateMetric = await this.calculateSuccessRate();
            
            // Collect resource usage metrics
            const resourceMetric = await this.getResourceUsage();
            
            // Store metrics
            this.metrics.responseTime.push({
                timestamp,
                value: responseTimeMetric
            });
            
            this.metrics.successRate.push({
                timestamp,
                value: successRateMetric
            });
            
            this.metrics.resourceUsage.push({
                timestamp,
                ...resourceMetric
            });
            
            // Log metrics
            await this.logMetrics({
                timestamp,
                responseTime: responseTimeMetric,
                successRate: successRateMetric,
                resourceUsage: resourceMetric
            });
            
            // Check thresholds and alert if needed
            await this.checkThresholds({
                responseTime: responseTimeMetric,
                successRate: successRateMetric,
                resourceUsage: resourceMetric
            });
            
        } catch (error) {
            console.error('❌ Error collecting metrics:', error.message);
            await this.logError(error);
        }
    }

    async measureResponseTime() {
        const endpoints = [
            'http://localhost:3001/api/hedera/status',
            'http://localhost:3001/api/vault/status',
            'http://localhost:3001/api/health'
        ];
        
        const measurements = [];
        
        for (const endpoint of endpoints) {
            try {
                const startTime = Date.now();
                
                // Simulate API call (replace with actual HTTP request in production)
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
                
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                measurements.push({
                    endpoint,
                    responseTime,
                    status: 'success'
                });
                
            } catch (error) {
                measurements.push({
                    endpoint,
                    responseTime: null,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        // Calculate average response time
        const successfulMeasurements = measurements.filter(m => m.status === 'success');
        const avgResponseTime = successfulMeasurements.length > 0 
            ? successfulMeasurements.reduce((sum, m) => sum + m.responseTime, 0) / successfulMeasurements.length
            : 0;
            
        return {
            average: avgResponseTime,
            measurements,
            timestamp: new Date().toISOString()
        };
    }

    async calculateSuccessRate() {
        // Get recent API calls from the last minute
        const oneMinuteAgo = Date.now() - 60000;
        const recentCalls = this.metrics.apiCalls.filter(
            call => new Date(call.timestamp).getTime() > oneMinuteAgo
        );
        
        if (recentCalls.length === 0) {
            return {
                rate: 100,
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0
            };
        }
        
        const successfulCalls = recentCalls.filter(call => call.status === 'success').length;
        const failedCalls = recentCalls.length - successfulCalls;
        const successRate = (successfulCalls / recentCalls.length) * 100;
        
        return {
            rate: successRate,
            totalCalls: recentCalls.length,
            successfulCalls,
            failedCalls,
            timestamp: new Date().toISOString()
        };
    }

    async getResourceUsage() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            memory: {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external,
                usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    startAPIMonitoring() {
        console.log('📊 Starting API monitoring...');
        
        // Simulate API call monitoring
        setInterval(() => {
            // Simulate random API calls
            const endpoints = [
                '/api/hedera/status',
                '/api/hedera/decisions',
                '/api/vault/balance',
                '/api/execute'
            ];
            
            const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
            const isSuccess = Math.random() > 0.05; // 95% success rate simulation
            
            this.metrics.apiCalls.push({
                endpoint: randomEndpoint,
                status: isSuccess ? 'success' : 'error',
                responseTime: Math.random() * 200 + 50,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 1000 API calls
            if (this.metrics.apiCalls.length > 1000) {
                this.metrics.apiCalls = this.metrics.apiCalls.slice(-1000);
            }
            
        }, 2000); // Every 2 seconds
    }

    startHederaMonitoring() {
        console.log('🌐 Starting Hedera operations monitoring...');
        
        setInterval(() => {
            // Simulate Hedera operations monitoring
            const operations = ['HTS_TRANSFER', 'HCS_SUBMIT', 'HFS_UPLOAD', 'ACCOUNT_BALANCE'];
            const randomOp = operations[Math.floor(Math.random() * operations.length)];
            const isSuccess = Math.random() > 0.02; // 98% success rate for Hedera
            
            this.metrics.hederaOperations.push({
                operation: randomOp,
                status: isSuccess ? 'success' : 'error',
                duration: Math.random() * 1000 + 100,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 500 Hedera operations
            if (this.metrics.hederaOperations.length > 500) {
                this.metrics.hederaOperations = this.metrics.hederaOperations.slice(-500);
            }
            
        }, 3000); // Every 3 seconds
    }

    startResourceMonitoring() {
        console.log('💻 Starting resource monitoring...');
        // Resource monitoring is handled in collectMetrics()
    }

    async checkThresholds(currentMetrics) {
        const alerts = [];
        
        // Check response time threshold
        if (currentMetrics.responseTime.average > this.thresholds.responseTime) {
            alerts.push({
                type: 'RESPONSE_TIME_HIGH',
                message: `Response time (${currentMetrics.responseTime.average}ms) exceeds threshold (${this.thresholds.responseTime}ms)`,
                severity: 'WARNING',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check success rate threshold
        if (currentMetrics.successRate.rate < this.thresholds.successRate) {
            alerts.push({
                type: 'SUCCESS_RATE_LOW',
                message: `Success rate (${currentMetrics.successRate.rate}%) below threshold (${this.thresholds.successRate}%)`,
                severity: 'CRITICAL',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check memory usage threshold
        if (currentMetrics.resourceUsage.memory.usagePercent > this.thresholds.memoryUsage) {
            alerts.push({
                type: 'MEMORY_USAGE_HIGH',
                message: `Memory usage (${currentMetrics.resourceUsage.memory.usagePercent.toFixed(2)}%) exceeds threshold (${this.thresholds.memoryUsage}%)`,
                severity: 'WARNING',
                timestamp: new Date().toISOString()
            });
        }
        
        // Process alerts
        for (const alert of alerts) {
            await this.processAlert(alert);
        }
    }

    async processAlert(alert) {
        console.log(`🚨 ALERT [${alert.severity}]: ${alert.message}`);
        
        // Log alert
        await this.logAlert(alert);
        
        // Here you could add integrations with:
        // - Slack notifications
        // - Email alerts
        // - PagerDuty
        // - Discord webhooks
    }

    async logMetrics(metrics) {
        const logEntry = {
            timestamp: metrics.timestamp,
            type: 'METRICS',
            data: metrics
        };
        
        try {
            await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('❌ Error writing to log file:', error.message);
        }
    }

    async logAlert(alert) {
        const logEntry = {
            timestamp: alert.timestamp,
            type: 'ALERT',
            data: alert
        };
        
        try {
            await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('❌ Error writing alert to log file:', error.message);
        }
    }

    async logError(error) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'ERROR',
            data: {
                message: error.message,
                stack: error.stack
            }
        };
        
        try {
            await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('❌ Error writing error to log file:', error.message);
        }
    }

    async getMetricsSummary() {
        const now = Date.now();
        const oneHourAgo = now - 3600000; // 1 hour ago
        
        // Filter metrics from last hour
        const recentResponseTimes = this.metrics.responseTime.filter(
            m => new Date(m.timestamp).getTime() > oneHourAgo
        );
        
        const recentSuccessRates = this.metrics.successRate.filter(
            m => new Date(m.timestamp).getTime() > oneHourAgo
        );
        
        const recentResourceUsage = this.metrics.resourceUsage.filter(
            m => new Date(m.timestamp).getTime() > oneHourAgo
        );
        
        return {
            summary: {
                monitoringDuration: this.isMonitoring ? Date.now() - this.startTime : 0,
                totalMetricsCollected: {
                    responseTime: this.metrics.responseTime.length,
                    successRate: this.metrics.successRate.length,
                    resourceUsage: this.metrics.resourceUsage.length,
                    apiCalls: this.metrics.apiCalls.length,
                    hederaOperations: this.metrics.hederaOperations.length
                }
            },
            lastHour: {
                avgResponseTime: recentResponseTimes.length > 0 
                    ? recentResponseTimes.reduce((sum, m) => sum + m.value.average, 0) / recentResponseTimes.length 
                    : 0,
                avgSuccessRate: recentSuccessRates.length > 0 
                    ? recentSuccessRates.reduce((sum, m) => sum + m.value.rate, 0) / recentSuccessRates.length 
                    : 0,
                avgMemoryUsage: recentResourceUsage.length > 0 
                    ? recentResourceUsage.reduce((sum, m) => sum + m.memory.usagePercent, 0) / recentResourceUsage.length 
                    : 0
            },
            current: {
                isMonitoring: this.isMonitoring,
                timestamp: new Date().toISOString()
            }
        };
    }

    async stopMonitoring() {
        console.log('🛑 Stopping Performance Monitoring System...');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        // Generate final report
        const finalReport = await this.getMetricsSummary();
        
        console.log('✅ Performance monitoring stopped');
        console.log('📊 Final Report:', JSON.stringify(finalReport, null, 2));
        
        return finalReport;
    }
}

// CLI interface
async function main() {
    const monitor = new PerformanceMonitoringSystem();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            monitor.startTime = Date.now();
            await monitor.startMonitoring();
            
            // Keep the process running
            process.on('SIGINT', async () => {
                await monitor.stopMonitoring();
                process.exit(0);
            });
            
            // Keep alive
            setInterval(() => {
                // Keep process alive
            }, 1000);
            break;
            
        case 'status':
            const summary = await monitor.getMetricsSummary();
            console.log('📊 Performance Monitoring Status:');
            console.log(JSON.stringify(summary, null, 2));
            break;
            
        case 'test':
            console.log('🧪 Testing Performance Monitoring System...');
            monitor.startTime = Date.now();
            await monitor.startMonitoring();
            
            // Run for 30 seconds then stop
            setTimeout(async () => {
                const report = await monitor.stopMonitoring();
                console.log('✅ Test completed successfully');
                process.exit(0);
            }, 30000);
            break;
            
        default:
            console.log('Usage: node performance-monitoring-system.js [start|status|test]');
            console.log('  start  - Start continuous monitoring');
            console.log('  status - Show current monitoring status');
            console.log('  test   - Run monitoring for 30 seconds');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = PerformanceMonitoringSystem;