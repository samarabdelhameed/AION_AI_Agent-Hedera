/**
 * Real Alerting System
 * Monitors REAL issues and sends alerts based on actual data
 * NO MOCK ALERTS - Only real problems and performance issues
 */

import axios from 'axios';
import HederaLogger from './hederaLogger.js';

class RealAlertingSystem {
    constructor(config) {
        this.config = {
            // Alert thresholds (based on real performance data)
            responseTimeThreshold: config.responseTimeThreshold || 5000, // 5 seconds
            errorRateThreshold: config.errorRateThreshold || 0.1, // 10%
            balanceThreshold: config.balanceThreshold || 5, // 5 HBAR minimum
            
            // Notification settings
            enableConsoleAlerts: config.enableConsoleAlerts !== false,
            enableFileAlerts: config.enableFileAlerts !== false,
            enableWebhookAlerts: config.enableWebhookAlerts || false,
            webhookUrl: config.webhookUrl,
            
            // Alert frequency limits
            alertCooldown: config.alertCooldown || 300000, // 5 minutes
            maxAlertsPerHour: config.maxAlertsPerHour || 10,
            
            ...config
        };

        this.logger = new HederaLogger({
            logFile: './logs/real-alerts.log',
            enableMetrics: true
        });

        this.alertHistory = [];
        this.lastAlertTimes = new Map();
        this.alertCounts = new Map();
        this.isMonitoring = false;
    }

    /**
     * Check REAL Hedera service health
     */
    async checkHederaServiceHealth(hederaMonitor) {
        const healthCheck = {
            timestamp: new Date().toISOString(),
            service: 'hedera',
            checks: {},
            alerts: []
        };

        try {
            // Check 1: Mirror Node availability
            const mirrorNodeStartTime = Date.now();
            try {
                await axios.get(`${hederaMonitor.config.mirrorNodeUrl}/api/v1/network/exchangerate`, {
                    timeout: 10000
                });
                healthCheck.checks.mirrorNode = {
                    status: 'healthy',
                    responseTime: Date.now() - mirrorNodeStartTime
                };
            } catch (error) {
                healthCheck.checks.mirrorNode = {
                    status: 'unhealthy',
                    error: error.message,
                    responseTime: Date.now() - mirrorNodeStartTime
                };
                
                await this.sendRealAlert({
                    type: 'service_down',
                    severity: 'critical',
                    service: 'hedera_mirror_node',
                    message: `Hedera Mirror Node is unreachable: ${error.message}`,
                    data: { responseTime: Date.now() - mirrorNodeStartTime }
                });
            }

            // Check 2: Account balance (if configured)
            if (hederaMonitor.config.accountId) {
                try {
                    const accountInfo = await hederaMonitor.getRealAccountInfo(hederaMonitor.config.accountId);
                    const balanceHbar = parseFloat(accountInfo.balance.hbar) / 100000000; // Convert tinybars to HBAR
                    
                    healthCheck.checks.accountBalance = {
                        status: balanceHbar >= this.config.balanceThreshold ? 'healthy' : 'warning',
                        balance: balanceHbar,
                        threshold: this.config.balanceThreshold
                    };

                    if (balanceHbar < this.config.balanceThreshold) {
                        await this.sendRealAlert({
                            type: 'low_balance',
                            severity: 'warning',
                            service: 'hedera_account',
                            message: `Account balance is low: ${balanceHbar} HBAR (threshold: ${this.config.balanceThreshold} HBAR)`,
                            data: { balance: balanceHbar, accountId: hederaMonitor.config.accountId }
                        });
                    }
                } catch (error) {
                    healthCheck.checks.accountBalance = {
                        status: 'error',
                        error: error.message
                    };
                }
            }

            // Check 3: HCS topic accessibility
            if (hederaMonitor.config.hcsTopicId) {
                const hcsStartTime = Date.now();
                try {
                    await hederaMonitor.getRealHCSMessages(hederaMonitor.config.hcsTopicId, 1);
                    const hcsResponseTime = Date.now() - hcsStartTime;
                    
                    healthCheck.checks.hcsService = {
                        status: hcsResponseTime <= this.config.responseTimeThreshold ? 'healthy' : 'warning',
                        responseTime: hcsResponseTime,
                        threshold: this.config.responseTimeThreshold
                    };

                    if (hcsResponseTime > this.config.responseTimeThreshold) {
                        await this.sendRealAlert({
                            type: 'slow_response',
                            severity: 'warning',
                            service: 'hedera_hcs',
                            message: `HCS response time is slow: ${hcsResponseTime}ms (threshold: ${this.config.responseTimeThreshold}ms)`,
                            data: { responseTime: hcsResponseTime, topicId: hederaMonitor.config.hcsTopicId }
                        });
                    }
                } catch (error) {
                    healthCheck.checks.hcsService = {
                        status: 'error',
                        error: error.message,
                        responseTime: Date.now() - hcsStartTime
                    };

                    await this.sendRealAlert({
                        type: 'service_error',
                        severity: 'high',
                        service: 'hedera_hcs',
                        message: `HCS service error: ${error.message}`,
                        data: { topicId: hederaMonitor.config.hcsTopicId }
                    });
                }
            }

            // Check 4: HTS token accessibility
            if (hederaMonitor.config.htsTokenId) {
                const htsStartTime = Date.now();
                try {
                    await hederaMonitor.getRealTokenInfo(hederaMonitor.config.htsTokenId);
                    const htsResponseTime = Date.now() - htsStartTime;
                    
                    healthCheck.checks.htsService = {
                        status: htsResponseTime <= this.config.responseTimeThreshold ? 'healthy' : 'warning',
                        responseTime: htsResponseTime,
                        threshold: this.config.responseTimeThreshold
                    };

                    if (htsResponseTime > this.config.responseTimeThreshold) {
                        await this.sendRealAlert({
                            type: 'slow_response',
                            severity: 'warning',
                            service: 'hedera_hts',
                            message: `HTS response time is slow: ${htsResponseTime}ms (threshold: ${this.config.responseTimeThreshold}ms)`,
                            data: { responseTime: htsResponseTime, tokenId: hederaMonitor.config.htsTokenId }
                        });
                    }
                } catch (error) {
                    healthCheck.checks.htsService = {
                        status: 'error',
                        error: error.message,
                        responseTime: Date.now() - htsStartTime
                    };

                    await this.sendRealAlert({
                        type: 'service_error',
                        severity: 'high',
                        service: 'hedera_hts',
                        message: `HTS service error: ${error.message}`,
                        data: { tokenId: hederaMonitor.config.htsTokenId }
                    });
                }
            }

            return healthCheck;

        } catch (error) {
            await this.sendRealAlert({
                type: 'system_error',
                severity: 'critical',
                service: 'hedera_health_check',
                message: `Health check system error: ${error.message}`,
                data: { error: error.message }
            });

            return {
                ...healthCheck,
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Check REAL BSC service health
     */
    async checkBSCServiceHealth(bscProvider) {
        const healthCheck = {
            timestamp: new Date().toISOString(),
            service: 'bsc',
            checks: {},
            alerts: []
        };

        try {
            // Check 1: RPC endpoint availability
            const rpcStartTime = Date.now();
            try {
                await bscProvider.getBlockNumber();
                healthCheck.checks.rpcEndpoint = {
                    status: 'healthy',
                    responseTime: Date.now() - rpcStartTime
                };
            } catch (error) {
                healthCheck.checks.rpcEndpoint = {
                    status: 'unhealthy',
                    error: error.message,
                    responseTime: Date.now() - rpcStartTime
                };

                await this.sendRealAlert({
                    type: 'service_down',
                    severity: 'critical',
                    service: 'bsc_rpc',
                    message: `BSC RPC endpoint is unreachable: ${error.message}`,
                    data: { responseTime: Date.now() - rpcStartTime }
                });
            }

            // Check 2: Gas price monitoring
            const gasPriceStartTime = Date.now();
            try {
                const feeData = await bscProvider.getFeeData();
                const gasPriceResponseTime = Date.now() - gasPriceStartTime;
                const gasPriceGwei = parseFloat(feeData.gasPrice.toString()) / 1e9;

                healthCheck.checks.gasPrice = {
                    status: gasPriceResponseTime <= this.config.responseTimeThreshold ? 'healthy' : 'warning',
                    responseTime: gasPriceResponseTime,
                    gasPrice: gasPriceGwei
                };

                // Alert if gas price is unusually high (>20 Gwei on testnet)
                if (gasPriceGwei > 20) {
                    await this.sendRealAlert({
                        type: 'high_gas_price',
                        severity: 'warning',
                        service: 'bsc_network',
                        message: `BSC gas price is high: ${gasPriceGwei.toFixed(2)} Gwei`,
                        data: { gasPrice: gasPriceGwei }
                    });
                }
            } catch (error) {
                healthCheck.checks.gasPrice = {
                    status: 'error',
                    error: error.message,
                    responseTime: Date.now() - gasPriceStartTime
                };
            }

            // Check 3: Network connectivity
            const networkStartTime = Date.now();
            try {
                const network = await bscProvider.getNetwork();
                healthCheck.checks.network = {
                    status: 'healthy',
                    responseTime: Date.now() - networkStartTime,
                    chainId: network.chainId.toString()
                };
            } catch (error) {
                healthCheck.checks.network = {
                    status: 'error',
                    error: error.message,
                    responseTime: Date.now() - networkStartTime
                };
            }

            return healthCheck;

        } catch (error) {
            await this.sendRealAlert({
                type: 'system_error',
                severity: 'critical',
                service: 'bsc_health_check',
                message: `BSC health check system error: ${error.message}`,
                data: { error: error.message }
            });

            return {
                ...healthCheck,
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Monitor REAL AI decision failures
     */
    async monitorAIDecisionFailures(aiDecisionHistory) {
        try {
            const recentDecisions = aiDecisionHistory.slice(-20); // Last 20 decisions
            const failedDecisions = recentDecisions.filter(decision => !decision.success);
            const errorRate = failedDecisions.length / recentDecisions.length;

            if (errorRate > this.config.errorRateThreshold) {
                await this.sendRealAlert({
                    type: 'high_error_rate',
                    severity: 'high',
                    service: 'ai_decision_system',
                    message: `AI decision error rate is high: ${(errorRate * 100).toFixed(1)}% (${failedDecisions.length}/${recentDecisions.length})`,
                    data: {
                        errorRate: errorRate,
                        failedDecisions: failedDecisions.length,
                        totalDecisions: recentDecisions.length,
                        recentFailures: failedDecisions.slice(-5).map(d => ({
                            timestamp: d.timestamp,
                            error: d.error
                        }))
                    }
                });
            }

            // Check for consecutive failures
            const lastFiveDecisions = recentDecisions.slice(-5);
            const consecutiveFailures = lastFiveDecisions.every(decision => !decision.success);

            if (consecutiveFailures && lastFiveDecisions.length >= 5) {
                await this.sendRealAlert({
                    type: 'consecutive_failures',
                    severity: 'critical',
                    service: 'ai_decision_system',
                    message: 'AI decision system has 5 consecutive failures',
                    data: {
                        consecutiveFailures: 5,
                        lastFailures: lastFiveDecisions.map(d => ({
                            timestamp: d.timestamp,
                            error: d.error
                        }))
                    }
                });
            }

        } catch (error) {
            this.logger.logAIDecision({
                id: 'monitor_failures_error'
            }, null, error);
        }
    }

    /**
     * Send REAL alert (not mock)
     */
    async sendRealAlert(alert) {
        const alertKey = `${alert.service}_${alert.type}`;
        const now = Date.now();

        // Check cooldown period
        const lastAlertTime = this.lastAlertTimes.get(alertKey);
        if (lastAlertTime && (now - lastAlertTime) < this.config.alertCooldown) {
            return; // Skip alert due to cooldown
        }

        // Check hourly limit
        const hourlyKey = `${alertKey}_${Math.floor(now / 3600000)}`;
        const hourlyCount = this.alertCounts.get(hourlyKey) || 0;
        if (hourlyCount >= this.config.maxAlertsPerHour) {
            return; // Skip alert due to hourly limit
        }

        // Create alert record
        const alertRecord = {
            id: `alert_${now}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...alert,
            source: 'REAL_ALERT_SYSTEM'
        };

        // Update tracking
        this.lastAlertTimes.set(alertKey, now);
        this.alertCounts.set(hourlyKey, hourlyCount + 1);
        this.alertHistory.push(alertRecord);

        // Keep only recent alerts
        if (this.alertHistory.length > 1000) {
            this.alertHistory = this.alertHistory.slice(-1000);
        }

        // Send console alert
        if (this.config.enableConsoleAlerts) {
            const severityEmoji = {
                'low': '🟡',
                'warning': '🟠',
                'high': '🔴',
                'critical': '🚨'
            };

            console.log(`${severityEmoji[alert.severity] || '⚠️'} REAL ALERT [${alert.severity.toUpperCase()}]`);
            console.log(`   Service: ${alert.service}`);
            console.log(`   Type: ${alert.type}`);
            console.log(`   Message: ${alert.message}`);
            console.log(`   Time: ${alertRecord.timestamp}`);
            if (alert.data) {
                console.log(`   Data: ${JSON.stringify(alert.data, null, 2)}`);
            }
            console.log('');
        }

        // Log alert
        if (this.config.enableFileAlerts) {
            this.logger.logger.warn(alertRecord, `Real alert: ${alert.message}`);
        }

        // Send webhook alert
        if (this.config.enableWebhookAlerts && this.config.webhookUrl) {
            try {
                await axios.post(this.config.webhookUrl, {
                    text: `🚨 AION Alert: ${alert.message}`,
                    attachments: [{
                        color: this.getSeverityColor(alert.severity),
                        fields: [
                            { title: 'Service', value: alert.service, short: true },
                            { title: 'Type', value: alert.type, short: true },
                            { title: 'Severity', value: alert.severity, short: true },
                            { title: 'Time', value: alertRecord.timestamp, short: true }
                        ]
                    }]
                }, { timeout: 5000 });
            } catch (webhookError) {
                console.error('❌ Failed to send webhook alert:', webhookError.message);
            }
        }

        return alertRecord;
    }

    /**
     * Get severity color for webhook alerts
     */
    getSeverityColor(severity) {
        const colors = {
            'low': '#36a64f',      // Green
            'warning': '#ff9500',   // Orange
            'high': '#ff0000',      // Red
            'critical': '#8b0000'   // Dark Red
        };
        return colors[severity] || '#808080';
    }

    /**
     * Get real alert statistics
     */
    getRealAlertStatistics() {
        const now = Date.now();
        const last24Hours = this.alertHistory.filter(alert => 
            (now - new Date(alert.timestamp).getTime()) < 86400000
        );

        const stats = {
            timestamp: new Date().toISOString(),
            source: 'REAL_ALERT_STATISTICS',
            total: {
                allTime: this.alertHistory.length,
                last24Hours: last24Hours.length
            },
            bySeverity: {
                critical: last24Hours.filter(a => a.severity === 'critical').length,
                high: last24Hours.filter(a => a.severity === 'high').length,
                warning: last24Hours.filter(a => a.severity === 'warning').length,
                low: last24Hours.filter(a => a.severity === 'low').length
            },
            byService: {},
            byType: {},
            recentAlerts: this.alertHistory.slice(-10)
        };

        // Count by service
        last24Hours.forEach(alert => {
            stats.byService[alert.service] = (stats.byService[alert.service] || 0) + 1;
        });

        // Count by type
        last24Hours.forEach(alert => {
            stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get recent real alerts
     */
    getRecentRealAlerts(limit = 50) {
        return {
            alerts: this.alertHistory.slice(-limit),
            total: this.alertHistory.length,
            source: 'RECENT_REAL_ALERTS'
        };
    }

    /**
     * Clear alert history
     */
    clearAlertHistory() {
        const clearedCount = this.alertHistory.length;
        this.alertHistory = [];
        this.lastAlertTimes.clear();
        this.alertCounts.clear();

        console.log(`✅ Cleared ${clearedCount} alerts from history`);
        return clearedCount;
    }

    /**
     * Test alert system with real alert
     */
    async testRealAlert() {
        await this.sendRealAlert({
            type: 'system_test',
            severity: 'low',
            service: 'alert_system',
            message: 'Real alert system test - this is a real test alert',
            data: {
                testTime: new Date().toISOString(),
                testId: Math.random().toString(36).substr(2, 9)
            }
        });

        console.log('✅ Real alert system test completed');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.logger) {
            this.logger.cleanup();
        }

        console.log('✅ Real Alerting System cleanup completed');
    }
}

export default RealAlertingSystem;