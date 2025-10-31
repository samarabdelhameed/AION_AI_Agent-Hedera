/**
 * Hedera Operations Logger
 * Advanced logging system for all Hedera operations with structured logging
 */

import pino from 'pino';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

class HederaLogger {
    constructor(options = {}) {
        this.options = {
            logLevel: options.logLevel || process.env.LOG_LEVEL || 'info',
            logFile: options.logFile || './logs/hedera.log',
            enableConsole: options.enableConsole !== false,
            enableFile: options.enableFile !== false,
            enableMetrics: options.enableMetrics !== false,
            rotationSize: options.rotationSize || '10MB',
            maxFiles: options.maxFiles || 5,
            ...options
        };

        this.initializeLogger();
        this.initializeMetrics();
        this.operationCounters = new Map();
        this.performanceMetrics = new Map();
    }

    /**
     * Initialize Pino logger with multiple transports
     */
    initializeLogger() {
        // Ensure logs directory exists
        const logDir = this.options.logFile.substring(0, this.options.logFile.lastIndexOf('/'));
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }

        const transports = [];

        // Console transport
        if (this.options.enableConsole) {
            transports.push({
                target: 'pino-pretty',
                level: this.options.logLevel,
                options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                    messageFormat: '[HEDERA] {msg}'
                }
            });
        }

        // File transport
        if (this.options.enableFile) {
            transports.push({
                target: 'pino/file',
                level: this.options.logLevel,
                options: {
                    destination: this.options.logFile,
                    mkdir: true
                }
            });
        }

        this.logger = pino({
            level: this.options.logLevel,
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => ({ level: label }),
                log: (object) => ({
                    ...object,
                    service: 'hedera',
                    timestamp: new Date().toISOString()
                })
            }
        }, pino.transport({
            targets: transports
        }));

        this.logger.info('Hedera logger initialized', {
            logLevel: this.options.logLevel,
            enableConsole: this.options.enableConsole,
            enableFile: this.options.enableFile,
            logFile: this.options.logFile
        });
    }

    /**
     * Initialize metrics collection
     */
    initializeMetrics() {
        if (!this.options.enableMetrics) return;

        this.metrics = {
            operationCounts: new Map(),
            operationDurations: new Map(),
            errorCounts: new Map(),
            successRates: new Map(),
            lastOperationTime: new Map()
        };

        // Start metrics collection interval
        this.metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, 60000); // Collect every minute
    }

    /**
     * Log HCS (Hedera Consensus Service) operations
     */
    logHCSOperation(operation, data, result = null, error = null) {
        const logData = {
            service: 'HCS',
            operation: operation,
            topicId: data.topicId,
            messageSize: data.messageSize || 0,
            sequenceNumber: result?.sequenceNumber,
            transactionId: result?.transactionId,
            duration: data.duration,
            success: !error,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (error) {
            this.logger.error(logData, `HCS ${operation} failed`);
            this.incrementErrorCount('HCS', operation);
        } else {
            this.logger.info(logData, `HCS ${operation} successful`);
            this.incrementOperationCount('HCS', operation);
        }

        this.recordPerformanceMetric('HCS', operation, data.duration);
    }

    /**
     * Log HFS (Hedera File Service) operations
     */
    logHFSOperation(operation, data, result = null, error = null) {
        const logData = {
            service: 'HFS',
            operation: operation,
            fileId: data.fileId,
            fileSize: data.fileSize || 0,
            contentType: data.contentType,
            duration: data.duration,
            success: !error,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (error) {
            this.logger.error(logData, `HFS ${operation} failed`);
            this.incrementErrorCount('HFS', operation);
        } else {
            this.logger.info(logData, `HFS ${operation} successful`);
            this.incrementOperationCount('HFS', operation);
        }

        this.recordPerformanceMetric('HFS', operation, data.duration);
    }

    /**
     * Log HTS (Hedera Token Service) operations
     */
    logHTSOperation(operation, data, result = null, error = null) {
        const logData = {
            service: 'HTS',
            operation: operation,
            tokenId: data.tokenId,
            amount: data.amount,
            account: data.account,
            transactionId: result?.transactionId,
            duration: data.duration,
            success: !error,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (error) {
            this.logger.error(logData, `HTS ${operation} failed`);
            this.incrementErrorCount('HTS', operation);
        } else {
            this.logger.info(logData, `HTS ${operation} successful`);
            this.incrementOperationCount('HTS', operation);
        }

        this.recordPerformanceMetric('HTS', operation, data.duration);
    }

    /**
     * Log HSCS (Hedera Smart Contract Service) operations
     */
    logHSCSOperation(operation, data, result = null, error = null) {
        const logData = {
            service: 'HSCS',
            operation: operation,
            contractId: data.contractId,
            functionName: data.functionName,
            gasUsed: result?.gasUsed,
            transactionId: result?.transactionId,
            duration: data.duration,
            success: !error,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (error) {
            this.logger.error(logData, `HSCS ${operation} failed`);
            this.incrementErrorCount('HSCS', operation);
        } else {
            this.logger.info(logData, `HSCS ${operation} successful`);
            this.incrementOperationCount('HSCS', operation);
        }

        this.recordPerformanceMetric('HSCS', operation, data.duration);
    }

    /**
     * Log AI decision operations
     */
    logAIDecision(decision, hcsResult = null, error = null) {
        const logData = {
            service: 'AI_DECISION',
            decisionId: decision.id,
            strategy: {
                from: decision.fromStrategy,
                to: decision.toStrategy
            },
            confidence: decision.confidence,
            expectedYield: decision.expectedYield,
            riskScore: decision.riskScore,
            modelVersion: decision.modelVersion,
            hcsMessageId: hcsResult?.sequenceNumber,
            hcsTransactionId: hcsResult?.transactionId,
            success: !error,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (error) {
            this.logger.error(logData, 'AI decision logging failed');
        } else {
            this.logger.info(logData, 'AI decision logged successfully');
        }

        this.incrementOperationCount('AI', 'decision');
    }

    /**
     * Log bridge operations
     */
    logBridgeOperation(operation, data, result = null, error = null) {
        const logData = {
            service: 'BRIDGE',
            operation: operation,
            fromNetwork: data.fromNetwork,
            toNetwork: data.toNetwork,
            amount: data.amount,
            userAddress: data.userAddress,
            bridgeId: data.bridgeId,
            transactionHash: result?.transactionHash,
            duration: data.duration,
            success: !error,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (error) {
            this.logger.error(logData, `Bridge ${operation} failed`);
            this.incrementErrorCount('BRIDGE', operation);
        } else {
            this.logger.info(logData, `Bridge ${operation} successful`);
            this.incrementOperationCount('BRIDGE', operation);
        }

        this.recordPerformanceMetric('BRIDGE', operation, data.duration);
    }

    /**
     * Log system health checks
     */
    logHealthCheck(service, status, metrics = {}) {
        const logData = {
            service: 'HEALTH_CHECK',
            targetService: service,
            status: status,
            responseTime: metrics.responseTime,
            uptime: metrics.uptime,
            memoryUsage: metrics.memoryUsage,
            cpuUsage: metrics.cpuUsage,
            timestamp: new Date().toISOString()
        };

        if (status === 'healthy') {
            this.logger.info(logData, `${service} health check passed`);
        } else {
            this.logger.warn(logData, `${service} health check failed`);
        }
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetrics(service, operation, metrics) {
        const logData = {
            service: 'PERFORMANCE',
            targetService: service,
            operation: operation,
            duration: metrics.duration,
            throughput: metrics.throughput,
            successRate: metrics.successRate,
            errorRate: metrics.errorRate,
            timestamp: new Date().toISOString()
        };

        this.logger.info(logData, `Performance metrics for ${service}.${operation}`);
    }

    /**
     * Increment operation counter
     */
    incrementOperationCount(service, operation) {
        const key = `${service}.${operation}`;
        const current = this.operationCounters.get(key) || 0;
        this.operationCounters.set(key, current + 1);
    }

    /**
     * Increment error counter
     */
    incrementErrorCount(service, operation) {
        const key = `${service}.${operation}.errors`;
        const current = this.operationCounters.get(key) || 0;
        this.operationCounters.set(key, current + 1);
    }

    /**
     * Record performance metric
     */
    recordPerformanceMetric(service, operation, duration) {
        const key = `${service}.${operation}`;
        const metrics = this.performanceMetrics.get(key) || {
            count: 0,
            totalDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            avgDuration: 0
        };

        metrics.count++;
        metrics.totalDuration += duration;
        metrics.minDuration = Math.min(metrics.minDuration, duration);
        metrics.maxDuration = Math.max(metrics.maxDuration, duration);
        metrics.avgDuration = metrics.totalDuration / metrics.count;

        this.performanceMetrics.set(key, metrics);
    }

    /**
     * Collect and log metrics
     */
    collectMetrics() {
        const metricsData = {
            operationCounts: Object.fromEntries(this.operationCounters),
            performanceMetrics: Object.fromEntries(this.performanceMetrics),
            timestamp: new Date().toISOString()
        };

        this.logger.info(metricsData, 'Hedera metrics collected');

        // Reset counters for next interval
        this.operationCounters.clear();
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            operationCounts: Object.fromEntries(this.operationCounters),
            performanceMetrics: Object.fromEntries(this.performanceMetrics),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Export logs to file
     */
    exportLogs(startDate, endDate, outputFile) {
        // Implementation for exporting logs within date range
        this.logger.info({
            startDate,
            endDate,
            outputFile
        }, 'Log export requested');
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        this.logger.info('Hedera logger cleanup completed');
    }
}

export default HederaLogger;