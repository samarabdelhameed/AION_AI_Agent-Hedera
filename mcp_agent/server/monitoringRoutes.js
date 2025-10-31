/**
 * Monitoring API Routes
 * Provides REAL monitoring data through REST API endpoints
 * NO MOCK DATA - Only real system metrics and alerts
 */

import ComprehensiveMonitoringSystem from '../services/comprehensiveMonitoringSystem.js';

class MonitoringRoutes {
    constructor(fastify, config) {
        this.fastify = fastify;
        this.config = config;
        
        // Initialize monitoring system
        this.monitoringSystem = new ComprehensiveMonitoringSystem({
            hederaNetwork: config.HEDERA_NETWORK || 'testnet',
            hederaMirrorNode: config.HEDERA_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com',
            hederaAccountId: config.HEDERA_ACCOUNT_ID,
            hederaPrivateKey: config.HEDERA_PRIVATE_KEY,
            hcsTopicId: config.HCS_TOPIC_ID,
            hfsFileId: config.HFS_BRIDGE_FILE_ID,
            htsTokenId: config.HTS_SHARE_TOKEN_ID,
            bscRpcUrl: config.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
            bscAccountAddress: config.BSC_ACCOUNT_ADDRESS,
            webhookUrl: config.MONITORING_WEBHOOK_URL
        });

        this.registerRoutes();
    }

    /**
     * Register all monitoring routes
     */
    registerRoutes() {
        // System status endpoint
        this.fastify.get('/api/monitoring/status', async (request, reply) => {
            try {
                const status = this.monitoringSystem.getSystemStatus();
                return {
                    success: true,
                    data: status,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Real-time dashboard data
        this.fastify.get('/api/monitoring/dashboard', async (request, reply) => {
            try {
                const dashboardData = await this.monitoringSystem.getRealTimeDashboardData();
                return {
                    success: true,
                    data: dashboardData,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Real performance metrics
        this.fastify.get('/api/monitoring/performance', async (request, reply) => {
            try {
                const performanceData = this.monitoringSystem.performanceMonitor.getRealTimeMetrics();
                return {
                    success: true,
                    data: performanceData,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Performance comparison
        this.fastify.get('/api/monitoring/performance/comparison', async (request, reply) => {
            try {
                const comparison = await this.monitoringSystem.performanceMonitor.compareRealPerformance();
                return {
                    success: true,
                    data: comparison,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Performance history
        this.fastify.get('/api/monitoring/performance/history', async (request, reply) => {
            try {
                const limit = parseInt(request.query.limit) || 50;
                const history = this.monitoringSystem.performanceMonitor.getPerformanceHistory(limit);
                return {
                    success: true,
                    data: history,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Real transaction costs
        this.fastify.get('/api/monitoring/costs', async (request, reply) => {
            try {
                const costs = await this.monitoringSystem.performanceMonitor.getRealTransactionCosts();
                return {
                    success: true,
                    data: costs,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Real alerts
        this.fastify.get('/api/monitoring/alerts', async (request, reply) => {
            try {
                const limit = parseInt(request.query.limit) || 50;
                const alerts = this.monitoringSystem.alertingSystem.getRecentRealAlerts(limit);
                return {
                    success: true,
                    data: alerts,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Alert statistics
        this.fastify.get('/api/monitoring/alerts/stats', async (request, reply) => {
            try {
                const stats = this.monitoringSystem.alertingSystem.getRealAlertStatistics();
                return {
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Hedera real data
        this.fastify.get('/api/monitoring/hedera/account/:accountId', async (request, reply) => {
            try {
                const accountId = request.params.accountId;
                const accountInfo = await this.monitoringSystem.hederaMonitor.getRealAccountInfo(accountId);
                return {
                    success: true,
                    data: accountInfo,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // HCS real messages
        this.fastify.get('/api/monitoring/hedera/hcs/:topicId/messages', async (request, reply) => {
            try {
                const topicId = request.params.topicId;
                const limit = parseInt(request.query.limit) || 10;
                const messages = await this.monitoringSystem.hederaMonitor.getRealHCSMessages(topicId, limit);
                return {
                    success: true,
                    data: {
                        topicId: topicId,
                        messages: messages,
                        count: messages.length
                    },
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // HTS real token info
        this.fastify.get('/api/monitoring/hedera/hts/:tokenId', async (request, reply) => {
            try {
                const tokenId = request.params.tokenId;
                const tokenInfo = await this.monitoringSystem.hederaMonitor.getRealTokenInfo(tokenId);
                return {
                    success: true,
                    data: tokenInfo,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Real transaction history
        this.fastify.get('/api/monitoring/hedera/transactions/:accountId', async (request, reply) => {
            try {
                const accountId = request.params.accountId;
                const limit = parseInt(request.query.limit) || 20;
                const transactions = await this.monitoringSystem.hederaMonitor.getRealTransactionHistory(accountId, limit);
                return {
                    success: true,
                    data: {
                        accountId: accountId,
                        transactions: transactions,
                        count: transactions.length
                    },
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Real network status
        this.fastify.get('/api/monitoring/hedera/network', async (request, reply) => {
            try {
                const networkStatus = await this.monitoringSystem.hederaMonitor.getRealNetworkStatus();
                return {
                    success: true,
                    data: networkStatus,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // AI decisions monitoring
        this.fastify.get('/api/monitoring/ai/decisions', async (request, reply) => {
            try {
                const decisions = await this.monitoringSystem.hederaMonitor.monitorRealAIDecisions();
                return {
                    success: true,
                    data: {
                        decisions: decisions,
                        count: decisions.length,
                        source: 'REAL_HCS_AI_DECISIONS'
                    },
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Comprehensive monitoring report
        this.fastify.get('/api/monitoring/report', async (request, reply) => {
            try {
                const report = await this.monitoringSystem.generateMonitoringReport();
                return {
                    success: true,
                    data: report,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Health check endpoint
        this.fastify.get('/api/monitoring/health', async (request, reply) => {
            try {
                const healthCheck = await this.monitoringSystem.performComprehensiveHealthCheck();
                return {
                    success: true,
                    data: healthCheck,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Start monitoring
        this.fastify.post('/api/monitoring/start', async (request, reply) => {
            try {
                const started = await this.monitoringSystem.startMonitoring();
                return {
                    success: started,
                    message: started ? 'Monitoring started successfully' : 'Failed to start monitoring',
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Stop monitoring
        this.fastify.post('/api/monitoring/stop', async (request, reply) => {
            try {
                this.monitoringSystem.stopMonitoring();
                return {
                    success: true,
                    message: 'Monitoring stopped successfully',
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Test alert system
        this.fastify.post('/api/monitoring/alerts/test', async (request, reply) => {
            try {
                await this.monitoringSystem.alertingSystem.testRealAlert();
                return {
                    success: true,
                    message: 'Test alert sent successfully',
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // Clear alert history
        this.fastify.delete('/api/monitoring/alerts', async (request, reply) => {
            try {
                const clearedCount = this.monitoringSystem.alertingSystem.clearAlertHistory();
                return {
                    success: true,
                    message: `Cleared ${clearedCount} alerts from history`,
                    clearedCount: clearedCount,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        // WebSocket endpoint for real-time monitoring data
        this.fastify.register(async function (fastify) {
            fastify.get('/api/monitoring/ws', { websocket: true }, (connection, req) => {
                console.log('📡 Real-time monitoring WebSocket connection established');

                // Send initial data
                connection.socket.send(JSON.stringify({
                    type: 'connection',
                    message: 'Real-time monitoring connected',
                    timestamp: new Date().toISOString()
                }));

                // Send real-time updates every 30 seconds
                const updateInterval = setInterval(async () => {
                    try {
                        const dashboardData = await this.monitoringSystem.getRealTimeDashboardData();
                        connection.socket.send(JSON.stringify({
                            type: 'dashboard_update',
                            data: dashboardData,
                            timestamp: new Date().toISOString()
                        }));
                    } catch (error) {
                        connection.socket.send(JSON.stringify({
                            type: 'error',
                            error: error.message,
                            timestamp: new Date().toISOString()
                        }));
                    }
                }, 30000);

                // Handle connection close
                connection.socket.on('close', () => {
                    clearInterval(updateInterval);
                    console.log('📡 Real-time monitoring WebSocket connection closed');
                });
            });
        });

        console.log('✅ Monitoring API routes registered');
    }

    /**
     * Initialize monitoring system
     */
    async initialize() {
        try {
            const initialized = await this.monitoringSystem.startMonitoring();
            if (initialized) {
                console.log('✅ Monitoring system initialized and started');
            } else {
                console.log('⚠️ Monitoring system initialization failed');
            }
            return initialized;
        } catch (error) {
            console.error('❌ Failed to initialize monitoring system:', error.message);
            return false;
        }
    }

    /**
     * Cleanup monitoring system
     */
    cleanup() {
        if (this.monitoringSystem) {
            this.monitoringSystem.cleanup();
        }
        console.log('✅ Monitoring routes cleanup completed');
    }
}

export default MonitoringRoutes;