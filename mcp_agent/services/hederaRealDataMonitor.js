/**
 * Hedera Real Data Monitor
 * Collects and monitors REAL data from Hedera network
 * NO MOCK DATA - Only real transactions and operations
 */

import axios from 'axios';
import { Client, AccountId, TopicId, FileId, TokenId } from '@hashgraph/sdk';
import HederaLogger from './hederaLogger.js';

class HederaRealDataMonitor {
    constructor(config) {
        this.config = {
            network: config.network || 'testnet',
            mirrorNodeUrl: config.mirrorNodeUrl || 'https://testnet.mirrornode.hedera.com',
            accountId: config.accountId,
            hcsTopicId: config.hcsTopicId,
            hfsFileId: config.hfsFileId,
            htsTokenId: config.htsTokenId,
            pollingInterval: config.pollingInterval || 30000, // 30 seconds
            ...config
        };

        this.logger = new HederaLogger({
            logFile: './logs/hedera-real-data.log',
            enableMetrics: true
        });

        this.client = null;
        this.isMonitoring = false;
        this.realDataCache = new Map();
        this.lastUpdateTimestamp = new Map();
    }

    /**
     * Initialize Hedera client for real data access
     */
    async initialize() {
        try {
            this.client = this.config.network === 'mainnet' 
                ? Client.forMainnet() 
                : Client.forTestnet();

            if (this.config.accountId && this.config.privateKey) {
                this.client.setOperator(
                    AccountId.fromString(this.config.accountId),
                    this.config.privateKey
                );
            }

            this.logger.logHealthCheck('HederaRealDataMonitor', 'healthy', {
                network: this.config.network,
                mirrorNodeUrl: this.config.mirrorNodeUrl
            });

            console.log('✅ Hedera Real Data Monitor initialized');
            return true;
        } catch (error) {
            this.logger.logHealthCheck('HederaRealDataMonitor', 'unhealthy', {
                error: error.message
            });
            console.error('❌ Failed to initialize Hedera Real Data Monitor:', error.message);
            return false;
        }
    }

    /**
     * Get REAL account information from Hedera
     */
    async getRealAccountInfo(accountId) {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(
                `${this.config.mirrorNodeUrl}/api/v1/accounts/${accountId}`,
                { timeout: 10000 }
            );

            const duration = Date.now() - startTime;
            const accountData = response.data;

            // Log real data retrieval
            this.logger.logHCSOperation('get_account_info', {
                accountId: accountId,
                duration: duration,
                dataSize: JSON.stringify(accountData).length
            }, {
                balance: accountData.balance?.balance,
                tokens: accountData.balance?.tokens?.length || 0
            });

            // Cache real data
            this.realDataCache.set(`account_${accountId}`, {
                data: accountData,
                timestamp: Date.now(),
                source: 'hedera_mirror_node'
            });

            return {
                accountId: accountData.account,
                balance: {
                    hbar: accountData.balance?.balance || 0,
                    tokens: accountData.balance?.tokens || []
                },
                createdTimestamp: accountData.created_timestamp,
                publicKey: accountData.key?.key,
                isDeleted: accountData.deleted,
                expiryTimestamp: accountData.expiry_timestamp,
                autoRenewPeriod: accountData.auto_renew_period,
                lastUpdated: new Date().toISOString(),
                source: 'REAL_HEDERA_DATA'
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.logHCSOperation('get_account_info', {
                accountId: accountId,
                duration: duration
            }, null, error);

            throw new Error(`Failed to get real account info: ${error.message}`);
        }
    }

    /**
     * Get REAL HCS topic messages from Mirror Node
     */
    async getRealHCSMessages(topicId, limit = 10) {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(
                `${this.config.mirrorNodeUrl}/api/v1/topics/${topicId}/messages`,
                { 
                    params: { limit: limit, order: 'desc' },
                    timeout: 15000 
                }
            );

            const duration = Date.now() - startTime;
            const messages = response.data.messages || [];

            // Log real data retrieval
            this.logger.logHCSOperation('get_messages', {
                topicId: topicId,
                duration: duration,
                messageCount: messages.length,
                dataSize: JSON.stringify(messages).length
            }, {
                messagesRetrieved: messages.length
            });

            // Process real messages
            const realMessages = messages.map(msg => ({
                consensusTimestamp: msg.consensus_timestamp,
                message: Buffer.from(msg.message, 'base64').toString('utf8'),
                runningHash: msg.running_hash,
                sequenceNumber: msg.sequence_number,
                topicId: msg.topic_id,
                validStartTimestamp: msg.valid_start_timestamp,
                source: 'REAL_HEDERA_HCS'
            }));

            // Cache real messages
            this.realDataCache.set(`hcs_messages_${topicId}`, {
                data: realMessages,
                timestamp: Date.now(),
                source: 'hedera_mirror_node'
            });

            return realMessages;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.logHCSOperation('get_messages', {
                topicId: topicId,
                duration: duration
            }, null, error);

            throw new Error(`Failed to get real HCS messages: ${error.message}`);
        }
    }

    /**
     * Get REAL HTS token information
     */
    async getRealTokenInfo(tokenId) {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(
                `${this.config.mirrorNodeUrl}/api/v1/tokens/${tokenId}`,
                { timeout: 10000 }
            );

            const duration = Date.now() - startTime;
            const tokenData = response.data;

            // Log real data retrieval
            this.logger.logHTSOperation('get_token_info', {
                tokenId: tokenId,
                duration: duration,
                dataSize: JSON.stringify(tokenData).length
            }, {
                totalSupply: tokenData.total_supply,
                holders: tokenData.total_supply !== '0'
            });

            // Cache real token data
            this.realDataCache.set(`token_${tokenId}`, {
                data: tokenData,
                timestamp: Date.now(),
                source: 'hedera_mirror_node'
            });

            return {
                tokenId: tokenData.token_id,
                name: tokenData.name,
                symbol: tokenData.symbol,
                decimals: tokenData.decimals,
                totalSupply: tokenData.total_supply,
                treasuryAccountId: tokenData.treasury_account_id,
                adminKey: tokenData.admin_key,
                supplyKey: tokenData.supply_key,
                createdTimestamp: tokenData.created_timestamp,
                modifiedTimestamp: tokenData.modified_timestamp,
                deleted: tokenData.deleted,
                source: 'REAL_HEDERA_DATA'
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.logHTSOperation('get_token_info', {
                tokenId: tokenId,
                duration: duration
            }, null, error);

            throw new Error(`Failed to get real token info: ${error.message}`);
        }
    }

    /**
     * Get REAL transaction history for account
     */
    async getRealTransactionHistory(accountId, limit = 20) {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(
                `${this.config.mirrorNodeUrl}/api/v1/transactions`,
                { 
                    params: { 
                        'account.id': accountId,
                        limit: limit,
                        order: 'desc'
                    },
                    timeout: 15000 
                }
            );

            const duration = Date.now() - startTime;
            const transactions = response.data.transactions || [];

            // Log real data retrieval
            this.logger.logHSCSOperation('get_transactions', {
                accountId: accountId,
                duration: duration,
                transactionCount: transactions.length,
                dataSize: JSON.stringify(transactions).length
            }, {
                transactionsRetrieved: transactions.length
            });

            // Process real transactions
            const realTransactions = transactions.map(tx => ({
                transactionId: tx.transaction_id,
                consensusTimestamp: tx.consensus_timestamp,
                validStartTimestamp: tx.valid_start_timestamp,
                type: tx.name,
                result: tx.result,
                charged_tx_fee: tx.charged_tx_fee,
                max_fee: tx.max_fee,
                memo_base64: tx.memo_base64,
                node: tx.node,
                nonce: tx.nonce,
                scheduled: tx.scheduled,
                entity_id: tx.entity_id,
                source: 'REAL_HEDERA_TRANSACTION'
            }));

            // Cache real transactions
            this.realDataCache.set(`transactions_${accountId}`, {
                data: realTransactions,
                timestamp: Date.now(),
                source: 'hedera_mirror_node'
            });

            return realTransactions;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.logHSCSOperation('get_transactions', {
                accountId: accountId,
                duration: duration
            }, null, error);

            throw new Error(`Failed to get real transaction history: ${error.message}`);
        }
    }

    /**
     * Get REAL network status and statistics
     */
    async getRealNetworkStatus() {
        const startTime = Date.now();
        
        try {
            const [networkResponse, nodesResponse] = await Promise.all([
                axios.get(`${this.config.mirrorNodeUrl}/api/v1/network/exchangerate`, { timeout: 10000 }),
                axios.get(`${this.config.mirrorNodeUrl}/api/v1/network/nodes`, { timeout: 10000 })
            ]);

            const duration = Date.now() - startTime;
            const networkData = networkResponse.data;
            const nodesData = nodesResponse.data;

            // Log real network data retrieval
            this.logger.logHealthCheck('hedera_network', 'healthy', {
                duration: duration,
                exchangeRate: networkData.current_rate,
                nodeCount: nodesData.nodes?.length || 0
            });

            const realNetworkStatus = {
                exchangeRate: {
                    current: networkData.current_rate,
                    next: networkData.next_rate,
                    timestamp: networkData.timestamp
                },
                nodes: nodesData.nodes?.map(node => ({
                    nodeId: node.node_id,
                    nodeAccountId: node.node_account_id,
                    description: node.description,
                    publicKey: node.public_key,
                    serviceEndpoints: node.service_endpoint
                })) || [],
                timestamp: new Date().toISOString(),
                source: 'REAL_HEDERA_NETWORK'
            };

            // Cache real network status
            this.realDataCache.set('network_status', {
                data: realNetworkStatus,
                timestamp: Date.now(),
                source: 'hedera_mirror_node'
            });

            return realNetworkStatus;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.logHealthCheck('hedera_network', 'unhealthy', {
                duration: duration,
                error: error.message
            });

            throw new Error(`Failed to get real network status: ${error.message}`);
        }
    }

    /**
     * Monitor REAL AI decisions logged to HCS
     */
    async monitorRealAIDecisions() {
        if (!this.config.hcsTopicId) {
            console.log('⚠️ No HCS topic ID configured for AI decisions monitoring');
            return [];
        }

        try {
            const messages = await this.getRealHCSMessages(this.config.hcsTopicId, 50);
            const aiDecisions = [];

            for (const message of messages) {
                try {
                    const parsedMessage = JSON.parse(message.message);
                    
                    // Validate this is an AI decision message
                    if (parsedMessage.decision && parsedMessage.modelVersion) {
                        aiDecisions.push({
                            ...parsedMessage,
                            hcsTimestamp: message.consensusTimestamp,
                            hcsSequenceNumber: message.sequenceNumber,
                            source: 'REAL_HCS_AI_DECISION'
                        });
                    }
                } catch (parseError) {
                    // Skip non-JSON messages
                    continue;
                }
            }

            this.logger.logAIDecision({
                id: 'monitor_batch',
                decisionsFound: aiDecisions.length,
                totalMessages: messages.length
            }, {
                sequenceNumber: `batch_${Date.now()}`
            });

            return aiDecisions;

        } catch (error) {
            this.logger.logAIDecision({
                id: 'monitor_batch_error'
            }, null, error);

            throw error;
        }
    }

    /**
     * Get REAL performance metrics from actual operations
     */
    async getRealPerformanceMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            source: 'REAL_HEDERA_METRICS'
        };

        try {
            // Get real account balance to test HTS performance
            if (this.config.accountId) {
                const accountStartTime = Date.now();
                await this.getRealAccountInfo(this.config.accountId);
                metrics.accountQueryTime = Date.now() - accountStartTime;
            }

            // Get real HCS messages to test HCS performance
            if (this.config.hcsTopicId) {
                const hcsStartTime = Date.now();
                await this.getRealHCSMessages(this.config.hcsTopicId, 5);
                metrics.hcsQueryTime = Date.now() - hcsStartTime;
            }

            // Get real token info to test HTS performance
            if (this.config.htsTokenId) {
                const htsStartTime = Date.now();
                await this.getRealTokenInfo(this.config.htsTokenId);
                metrics.htsQueryTime = Date.now() - htsStartTime;
            }

            // Get real network status
            const networkStartTime = Date.now();
            await this.getRealNetworkStatus();
            metrics.networkQueryTime = Date.now() - networkStartTime;

            // Calculate average response time
            const responseTimes = [
                metrics.accountQueryTime,
                metrics.hcsQueryTime,
                metrics.htsQueryTime,
                metrics.networkQueryTime
            ].filter(time => time !== undefined);

            metrics.averageResponseTime = responseTimes.length > 0 
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
                : 0;

            this.logger.logPerformanceMetrics('hedera_real_data', 'performance_check', {
                duration: metrics.averageResponseTime,
                successRate: 1.0,
                errorRate: 0.0,
                throughput: responseTimes.length
            });

            return metrics;

        } catch (error) {
            metrics.error = error.message;
            metrics.success = false;

            this.logger.logPerformanceMetrics('hedera_real_data', 'performance_check', {
                duration: 0,
                successRate: 0.0,
                errorRate: 1.0,
                throughput: 0
            });

            return metrics;
        }
    }

    /**
     * Start continuous monitoring of real data
     */
    startRealDataMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Real data monitoring is already running');
            return;
        }

        this.isMonitoring = true;
        console.log('🔄 Starting real data monitoring...');

        this.monitoringInterval = setInterval(async () => {
            try {
                // Monitor real AI decisions
                await this.monitorRealAIDecisions();

                // Get real performance metrics
                await this.getRealPerformanceMetrics();

                // Update cache timestamps
                this.lastUpdateTimestamp.set('monitoring_cycle', Date.now());

                console.log('✅ Real data monitoring cycle completed');

            } catch (error) {
                console.error('❌ Real data monitoring cycle failed:', error.message);
                this.logger.logHealthCheck('real_data_monitoring', 'unhealthy', {
                    error: error.message
                });
            }
        }, this.config.pollingInterval);

        console.log(`✅ Real data monitoring started (interval: ${this.config.pollingInterval}ms)`);
    }

    /**
     * Stop real data monitoring
     */
    stopRealDataMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        console.log('⏹️ Real data monitoring stopped');
    }

    /**
     * Get cached real data
     */
    getCachedRealData(key) {
        const cached = this.realDataCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutes cache
            return cached.data;
        }
        return null;
    }

    /**
     * Get all real data summary
     */
    getRealDataSummary() {
        const summary = {
            timestamp: new Date().toISOString(),
            source: 'REAL_HEDERA_DATA_SUMMARY',
            cacheSize: this.realDataCache.size,
            lastUpdate: this.lastUpdateTimestamp.get('monitoring_cycle'),
            isMonitoring: this.isMonitoring,
            cachedDataTypes: Array.from(this.realDataCache.keys()),
            config: {
                network: this.config.network,
                mirrorNodeUrl: this.config.mirrorNodeUrl,
                pollingInterval: this.config.pollingInterval
            }
        };

        return summary;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopRealDataMonitoring();
        
        if (this.client) {
            this.client.close();
        }

        if (this.logger) {
            this.logger.cleanup();
        }

        console.log('✅ Hedera Real Data Monitor cleanup completed');
    }
}

export default HederaRealDataMonitor;