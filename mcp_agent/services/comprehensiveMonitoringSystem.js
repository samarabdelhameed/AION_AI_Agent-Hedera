/**
 * Comprehensive Monitoring System
 * Integrates all real monitoring services for complete system oversight
 * REAL DATA ONLY - No mock or simulated data
 */

import HederaRealDataMonitor from './hederaRealDataMonitor.js';
import RealPerformanceMonitor from './realPerformanceMonitor.js';
import RealAlertingSystem from './realAlertingSystem.js';
import HederaLogger from './hederaLogger.js';
import { ethers } from 'ethers';

class ComprehensiveMonitoringSystem {
    constructor(config) {
        this.config = {
            // Hedera configuration
            hederaNetwork: config.hederaNetwork || 'testnet',
            hederaMirrorNode: config.hederaMirrorNode || 'https://testnet.mirrornode.hedera.com',
            hederaAccountId: config.hederaAccountId,
            hederaPrivateKey: config.hederaPrivateKey,
            hcsTopicId: config.hcsTopicId,
            hfsFileId: config.hfsFileId,
            htsTokenId: config.htsTokenId,

            // BSC configuration
            bscRpcUrl: config.bscRpcUrl || 'https://data-seed-prebsc-1-s1.binance.org:8545',
            bscAccountAddress: config.bscAccountAddress,

            // Monitoring intervals
            healthCheckInterval: config.healthCheckInterval || 60000, // 1 minute
            performanceCheckInterval: config.performanceCheckInterval || 300000, // 5 minutes
            alertCheckInterval: config.alertCheckInterval || 30000, // 30 seconds

            // Alert configuration
            enableAlerts: config.enableAlerts !== false,
            webhookUrl: config.webhookUrl,

            ...config
        };

        this.logger = new HederaLogger({
            logFile: './logs/comprehensive-monitoring.log',
            enableMetrics: true
        });

        this.isMonitoring = false;
        this.monitoringIntervals = {};
        this.systemStatus = {
            overall: 'unknown',
            services: {},
            lastUpdate: null
        };

        this.initializeMonitors();
    }

    /**
     * Initialize all monitoring services
     */
    initializeMonitors() {
        // Initialize Hedera real data monitor
        this.hederaMonitor = new HederaRealDataMonitor({
            network: this.config.hederaNetwork,
            mirrorNodeUrl: this.config.hederaMirrorNode,
            accountId: this.config.hederaAccountId,
            privateKey: this.config.hederaPrivateKey,
            hcsTopicId: this.config.hcsTopicId,
            hfsFileId: this.config.hfsFileId,
            htsTokenId: this.config.htsTokenId
        });

        // Initialize performance monitor
        this.performanceMonitor = new RealPerformanceMonitor({
            hederaNetwork: this.config.hederaNetwork,
            hederaMirrorNode: this.config.hederaMirrorNode,
            hederaAccountId: this.config.hederaAccountId,
            bscRpcUrl: this.config.bscRpcUrl,
            bscAccountAddress: this.config.bscAccountAddress
        });

        // Initialize alerting system
        this.alertingSystem = new RealAlertingSystem({
            enableWebhookAlerts: !!this.config.webhookUrl,
            webhookUrl: this.config.webhookUrl,
            enableConsoleAlerts: true,
            enableFileAlerts: true
        });

        // Initialize BSC provider
        this.bscProvider = new ethers.JsonRpcProvider(this.config.bscRpcUrl);
    }

    /**
     * Start comprehensive monitoring
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Comprehensive monitoring is already running');
            return false;
        }

        try {
            console.log('🚀 Starting comprehensive monitoring system...');

            // Initialize all monitors
            const hederaInitialized = await this.hederaMonitor.initialize();
            const performanceInitialized = await this.performanceMonitor.initialize();

            if (!hederaInitialized || !performanceInitialized) {
                throw new Error('Failed to initialize monitoring services');
            }

            // Start individual monitoring services
            this.hederaMonitor.startRealDataMonitoring();
            this.performanceMonitor.startRealPerformanceMonitoring();

            // Start comprehensive monitoring intervals
            this.startHealthCheckMonitoring();
            this.startPerformanceMonitoring();
            this.startAlertMonitoring();

            this.isMonitoring = true;

            // Log monitoring start
            this.logger.logHealthCheck('comprehensive_monitoring', 'healthy', {
                hederaNetwork: this.config.hederaNetwork,
                bscNetwork: this.config.bscRpcUrl,
                monitoringStarted: new Date().toISOString()
            });

            console.log('✅ Comprehensive monitoring system started successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to start comprehensive monitoring:', error.message);
            
            this.logger.logHealthCheck('comprehensive_monitoring', 'unhealthy', {
                error: error.message,
                startupFailed: new Date().toISOString()
            });

            return false;
        }
    }

    /**
     * Start health check monitoring
     */
    startHealthCheckMonitoring() {
        this.monitoringIntervals.healthCheck = setInterval(async () => {
            try {
                await this.performComprehensiveHealthCheck();
            } catch (error) {
                console.error('❌ Health check monitoring error:', error.message);
            }
        }, this.config.healthCheckInterval);

        console.log(`✅ Health check monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        this.monitoringIntervals.performance = setInterval(async () => {
            try {
                await this.performComprehensivePerformanceCheck();
            } catch (error) {
                console.error('❌ Performance monitoring error:', error.message);
            }
        }, this.config.performanceCheckInterval);

        console.log(`✅ Performance monitoring started (interval: ${this.config.performanceCheckInterval}ms)`);
    }

    /**
     * Start alert monitoring
     */
    startAlertMonitoring() {
        this.monitoringIntervals.alerts = setInterval(async () => {
            try {
                await this.performComprehensiveAlertCheck();
            } catch (error) {
                console.error('❌ Alert monitoring error:', error.message);
            }
        }, this.config.alertCheckInterval);

        console.log(`✅ Alert monitoring started (interval: ${this.config.alertCheckInterval}ms)`);
    }

    /**
     * Perform comprehensive health check
     */
    async performComprehensiveHealthCheck() {
        const healthCheck = {
            timestamp: new Date().toISOString(),
            source: 'COMPREHENSIVE_HEALTH_CHECK',
            services: {},
            overall: 'healthy'
        };

        try {
            // Check Hedera services
            const hederaHealth = await this.alertingSystem.checkHederaServiceHealth(this.hederaMonitor);
            healthCheck.services.hedera = hederaHealth;

            // Check BSC services
            const bscHealth = await this.alertingSystem.checkBSCServiceHealth(this.bscProvider);
            healthCheck.services.bsc = bscHealth;

            // Check monitoring services themselves
            healthCheck.services.monitoring = {
                hederaMonitor: this.hederaMonitor.isMonitoring,
                performanceMonitor: this.performanceMonitor.isMonitoring,
                alertingSystem: true,
                timestamp: new Date().toISOString()
            };

            // Determine overall health
            const hasErrors = Object.values(healthCheck.services).some(service => 
                service.status === 'error' || service.status === 'unhealthy'
            );

            const hasWarnings = Object.values(healthCheck.services).some(service => 
                service.status === 'warning' || 
                Object.values(service.checks || {}).some(check => check.status === 'warning')
            );

            if (hasErrors) {
                healthCheck.overall = 'unhealthy';
            } else if (hasWarnings) {
                healthCheck.overall = 'warning';
            }

            // Update system status
            this.systemStatus = {
                overall: healthCheck.overall,
                services: healthCheck.services,
                lastUpdate: healthCheck.timestamp
            };

            // Log health check results
            this.logger.logHealthCheck('comprehensive_system', healthCheck.overall, {
                hederaStatus: healthCheck.services.hedera.status || 'unknown',
                bscStatus: healthCheck.services.bsc.status || 'unknown',
                monitoringActive: this.isMonitoring
            });

            console.log(`🏥 Health check completed - Overall status: ${healthCheck.overall}`);

            return healthCheck;

        } catch (error) {
            healthCheck.overall = 'error';
            healthCheck.error = error.message;

            this.logger.logHealthCheck('comprehensive_system', 'error', {
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Perform comprehensive performance check
     */
    async performComprehensivePerformanceCheck() {
        try {
            console.log('📊 Starting comprehensive performance check...');

            // Get real performance comparison
            const performanceComparison = await this.performanceMonitor.compareRealPerformance();

            // Get real transaction costs
            const transactionCosts = await this.performanceMonitor.getRealTransactionCosts();

            // Get Hedera real data summary
            const hederaDataSummary = this.hederaMonitor.getRealDataSummary();

            const comprehensivePerformance = {
                timestamp: new Date().toISOString(),
                source: 'COMPREHENSIVE_PERFORMANCE_CHECK',
                networkComparison: performanceComparison,
                transactionCosts: transactionCosts,
                hederaDataStatus: hederaDataSummary,
                summary: {
                    winner: performanceComparison.comparison.winner,
                    hederaAvgResponse: performanceComparison.hedera.averageResponseTime,
                    bscAvgResponse: performanceComparison.bsc.averageResponseTime,
                    costSavings: transactionCosts.comparison.savingsPercentage
                }
            };

            // Log performance results
            this.logger.logPerformanceMetrics('comprehensive_system', 'performance_check', {
                duration: performanceComparison.testDuration,
                winner: performanceComparison.comparison.winner,
                hederaSuccess: performanceComparison.hedera.success,
                bscSuccess: performanceComparison.bsc.success
            });

            console.log('✅ Comprehensive performance check completed');
            console.log(`   Winner: ${comprehensivePerformance.summary.winner}`);
            console.log(`   Cost savings: ${comprehensivePerformance.summary.costSavings}%`);

            return comprehensivePerformance;

        } catch (error) {
            this.logger.logPerformanceMetrics('comprehensive_system', 'performance_check', {
                duration: 0,
                error: error.message,
                success: false
            });

            throw error;
        }
    }

    /**
     * Perform comprehensive alert check
     */
    async performComprehensiveAlertCheck() {
        try {
            // Check for AI decision failures (if available)
            const aiDecisionHistory = this.getAIDecisionHistory();
            if (aiDecisionHistory.length > 0) {
                await this.alertingSystem.monitorAIDecisionFailures(aiDecisionHistory);
            }

            // Get alert statistics
            const alertStats = this.alertingSystem.getRealAlertStatistics();

            // Check if alert rate is too high
            if (alertStats.total.last24Hours > 50) {
                await this.alertingSystem.sendRealAlert({
                    type: 'high_alert_volume',
                    severity: 'warning',
                    service: 'monitoring_system',
                    message: `High alert volume detected: ${alertStats.total.last24Hours} alerts in last 24 hours`,
                    data: alertStats
                });
            }

            return alertStats;

        } catch (error) {
            console.error('❌ Alert check error:', error.message);
            throw error;
        }
    }

    /**
     * Get AI decision history (placeholder - would integrate with actual AI system)
     */
    getAIDecisionHistory() {
        // This would integrate with the actual AI decision system
        // For now, return empty array
        return [];
    }

    /**
     * Get comprehensive system status
     */
    getSystemStatus() {
        return {
            ...this.systemStatus,
            isMonitoring: this.isMonitoring,
            uptime: this.isMonitoring ? Date.now() - this.startTime : 0,
            monitors: {
                hederaMonitor: this.hederaMonitor.isMonitoring,
                performanceMonitor: this.performanceMonitor.isMonitoring,
                alertingSystem: true
            },
            source: 'COMPREHENSIVE_SYSTEM_STATUS'
        };
    }

    /**
     * Get real-time dashboard data
     */
    async getRealTimeDashboardData() {
        try {
            const dashboardData = {
                timestamp: new Date().toISOString(),
                source: 'REAL_TIME_DASHBOARD',
                systemStatus: this.getSystemStatus(),
                performanceMetrics: this.performanceMonitor.getRealTimeMetrics(),
                alertStatistics: this.alertingSystem.getRealAlertStatistics(),
                hederaDataSummary: this.hederaMonitor.getRealDataSummary(),
                recentAlerts: this.alertingSystem.getRecentRealAlerts(10).alerts
            };

            return dashboardData;

        } catch (error) {
            return {
                timestamp: new Date().toISOString(),
                source: 'REAL_TIME_DASHBOARD',
                error: error.message,
                systemStatus: this.getSystemStatus()
            };
        }
    }

    /**
     * Generate comprehensive monitoring report
     */
    async generateMonitoringReport() {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                source: 'COMPREHENSIVE_MONITORING_REPORT',
                systemOverview: this.getSystemStatus(),
                performanceReport: this.performanceMonitor.generateRealPerformanceReport(),
                alertSummary: this.alertingSystem.getRealAlertStatistics(),
                hederaDataStatus: this.hederaMonitor.getRealDataSummary(),
                recommendations: this.generateRecommendations()
            };

            // Log report generation
            this.logger.logger.info(report, 'Comprehensive monitoring report generated');

            return report;

        } catch (error) {
            this.logger.logger.error({ error: error.message }, 'Failed to generate monitoring report');
            throw error;
        }
    }

    /**
     * Generate system recommendations based on monitoring data
     */
    generateRecommendations() {
        const recommendations = [];

        // Check system status
        if (this.systemStatus.overall === 'unhealthy') {
            recommendations.push({
                type: 'critical',
                message: 'System health is compromised. Immediate attention required.',
                action: 'Check service logs and resolve critical issues'
            });
        }

        // Check performance
        const performanceMetrics = this.performanceMonitor.getRealTimeMetrics();
        if (performanceMetrics.comparison && performanceMetrics.comparison.winner === 'bsc') {
            recommendations.push({
                type: 'performance',
                message: 'BSC is currently outperforming Hedera in response times.',
                action: 'Monitor Hedera network status and consider optimization'
            });
        }

        // Check alerts
        const alertStats = this.alertingSystem.getRealAlertStatistics();
        if (alertStats.total.last24Hours > 20) {
            recommendations.push({
                type: 'alerts',
                message: 'High number of alerts in the last 24 hours.',
                action: 'Review alert patterns and address recurring issues'
            });
        }

        return recommendations;
    }

    /**
     * Stop comprehensive monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('⚠️ Comprehensive monitoring is not running');
            return;
        }

        console.log('⏹️ Stopping comprehensive monitoring system...');

        // Stop all monitoring intervals
        Object.values(this.monitoringIntervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });
        this.monitoringIntervals = {};

        // Stop individual monitors
        this.hederaMonitor.stopRealDataMonitoring();
        this.performanceMonitor.stopRealPerformanceMonitoring();

        this.isMonitoring = false;

        // Log monitoring stop
        this.logger.logHealthCheck('comprehensive_monitoring', 'stopped', {
            monitoringStopped: new Date().toISOString()
        });

        console.log('✅ Comprehensive monitoring system stopped');
    }

    /**
     * Cleanup all resources
     */
    cleanup() {
        this.stopMonitoring();

        // Cleanup individual monitors
        if (this.hederaMonitor) {
            this.hederaMonitor.cleanup();
        }

        if (this.performanceMonitor) {
            this.performanceMonitor.cleanup();
        }

        if (this.alertingSystem) {
            this.alertingSystem.cleanup();
        }

        if (this.logger) {
            this.logger.cleanup();
        }

        console.log('✅ Comprehensive monitoring system cleanup completed');
    }
}

export default ComprehensiveMonitoringSystem;