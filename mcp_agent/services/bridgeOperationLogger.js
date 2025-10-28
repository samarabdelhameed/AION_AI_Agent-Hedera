/**
 * Bridge Operation Logger Service
 * Logs all cross-chain bridge operations to HCS for audit trail
 */

const { HederaService } = require('./hederaService');
const { AIDecisionLogger } = require('./aiDecisionLogger');

class BridgeOperationLogger {
    constructor(hederaService, aiDecisionLogger) {
        this.hederaService = hederaService;
        this.aiDecisionLogger = aiDecisionLogger;
        this.bridgeTopicId = null;
        this.operationQueue = [];
        this.isProcessing = false;
        
        // Bridge operation types
        this.OPERATION_TYPES = {
            BRIDGE_TO_HEDERA: 'bridge_to_hedera',
            BRIDGE_FROM_HEDERA: 'bridge_from_hedera',
            BRIDGE_COMPLETED: 'bridge_completed',
            BRIDGE_FAILED: 'bridge_failed',
            BRIDGE_CANCELLED: 'bridge_cancelled'
        };
        
        // Initialize bridge topic
        this.initializeBridgeTopic();
    }
    
    /**
     * Initialize HCS topic for bridge operations
     */
    async initializeBridgeTopic() {
        try {
            // Create or get existing bridge topic
            this.bridgeTopicId = await this.hederaService.createHCSTopicForBridge();
            console.log(`Bridge HCS topic initialized: ${this.bridgeTopicId}`);
        } catch (error) {
            console.error('Failed to initialize bridge HCS topic:', error);
            throw error;
        }
    }
    
    /**
     * Log bridge operation initiation
     */
    async logBridgeInitiation(operationData) {
        const logEntry = {
            type: this.OPERATION_TYPES.BRIDGE_TO_HEDERA,
            timestamp: new Date().toISOString(),
            operationId: operationData.operationId,
            user: operationData.user,
            sourceChain: operationData.sourceChainId,
            targetChain: operationData.targetChainId,
            sourceToken: operationData.sourceToken,
            targetToken: operationData.targetToken,
            amount: operationData.amount,
            recipient: operationData.recipient,
            bridgeService: operationData.bridgeService,
            txHash: operationData.txHash,
            metadata: {
                gasLimit: operationData.gasLimit,
                bridgeFee: operationData.bridgeFee,
                payload: operationData.payload
            }
        };
        
        return await this.submitBridgeLog(logEntry);
    }
    
    /**
     * Log bridge operation from Hedera
     */
    async logBridgeFromHedera(operationData) {
        const logEntry = {
            type: this.OPERATION_TYPES.BRIDGE_FROM_HEDERA,
            timestamp: new Date().toISOString(),
            operationId: operationData.operationId,
            user: operationData.user,
            sourceChain: operationData.sourceChainId,
            targetChain: operationData.targetChainId,
            sourceToken: operationData.sourceToken,
            targetToken: operationData.targetToken,
            amount: operationData.amount,
            recipient: operationData.recipient,
            bridgeService: operationData.bridgeService,
            htsOperation: {
                tokensBurned: operationData.tokensBurned,
                htsTokenId: operationData.htsTokenId
            },
            metadata: {
                gasLimit: operationData.gasLimit,
                bridgeFee: operationData.bridgeFee
            }
        };
        
        return await this.submitBridgeLog(logEntry);
    }
    
    /**
     * Log bridge operation completion
     */
    async logBridgeCompletion(operationData) {
        const logEntry = {
            type: this.OPERATION_TYPES.BRIDGE_COMPLETED,
            timestamp: new Date().toISOString(),
            operationId: operationData.operationId,
            user: operationData.user,
            amount: operationData.amount,
            targetChain: operationData.targetChainId,
            targetTxHash: operationData.targetTxHash,
            bridgeService: operationData.bridgeService,
            completionTime: operationData.completionTime,
            metadata: {
                tokensIssued: operationData.tokensIssued,
                finalAmount: operationData.finalAmount,
                fees: operationData.fees
            }
        };
        
        return await this.submitBridgeLog(logEntry);
    }
    
    /**
     * Log bridge operation failure
     */
    async logBridgeFailure(operationData) {
        const logEntry = {
            type: this.OPERATION_TYPES.BRIDGE_FAILED,
            timestamp: new Date().toISOString(),
            operationId: operationData.operationId,
            user: operationData.user,
            amount: operationData.amount,
            reason: operationData.reason,
            errorCode: operationData.errorCode,
            bridgeService: operationData.bridgeService,
            refundDetails: {
                refunded: operationData.refunded,
                refundTxHash: operationData.refundTxHash,
                refundAmount: operationData.refundAmount
            }
        };
        
        return await this.submitBridgeLog(logEntry);
    }
    
    /**
     * Log bridge operation cancellation
     */
    async logBridgeCancellation(operationData) {
        const logEntry = {
            type: this.OPERATION_TYPES.BRIDGE_CANCELLED,
            timestamp: new Date().toISOString(),
            operationId: operationData.operationId,
            user: operationData.user,
            amount: operationData.amount,
            reason: operationData.reason,
            cancelledBy: operationData.cancelledBy,
            bridgeService: operationData.bridgeService,
            refundDetails: {
                tokensReturned: operationData.tokensReturned,
                refundTxHash: operationData.refundTxHash
            }
        };
        
        return await this.submitBridgeLog(logEntry);
    }
    
    /**
     * Log AI decision related to bridge operations
     */
    async logBridgeAIDecision(decisionData) {
        const logEntry = {
            type: 'bridge_ai_decision',
            timestamp: new Date().toISOString(),
            decisionId: decisionData.decisionId,
            bridgeOperationId: decisionData.bridgeOperationId,
            aiAgent: decisionData.aiAgent,
            decision: {
                type: decisionData.decisionType,
                recommendation: decisionData.recommendation,
                confidence: decisionData.confidence,
                reasoning: decisionData.reasoning
            },
            bridgeContext: {
                sourceChain: decisionData.sourceChain,
                targetChain: decisionData.targetChain,
                amount: decisionData.amount,
                estimatedFee: decisionData.estimatedFee,
                selectedService: decisionData.selectedService
            },
            modelMetadata: {
                version: decisionData.modelVersion,
                hfsFileId: decisionData.hfsFileId,
                checksum: decisionData.modelChecksum
            }
        };
        
        // Submit to both bridge topic and AI decision topic
        const bridgeMessageId = await this.submitBridgeLog(logEntry);
        const aiMessageId = await this.aiDecisionLogger.logDecision({
            ...decisionData,
            bridgeMessageId: bridgeMessageId
        });
        
        return {
            bridgeMessageId,
            aiMessageId
        };
    }
    
    /**
     * Submit bridge log to HCS
     */
    async submitBridgeLog(logEntry) {
        try {
            // Add to queue for processing
            this.operationQueue.push(logEntry);
            
            // Process queue if not already processing
            if (!this.isProcessing) {
                this.processQueue();
            }
            
            // Submit to HCS
            const messageId = await this.hederaService.submitMessageToHCS(
                this.bridgeTopicId,
                JSON.stringify(logEntry)
            );
            
            console.log(`Bridge operation logged to HCS: ${messageId}`, {
                type: logEntry.type,
                operationId: logEntry.operationId,
                user: logEntry.user
            });
            
            return messageId;
            
        } catch (error) {
            console.error('Failed to submit bridge log to HCS:', error);
            
            // Store failed log for retry
            await this.storeFailedLog(logEntry, error);
            throw error;
        }
    }
    
    /**
     * Process queued operations
     */
    async processQueue() {
        if (this.isProcessing || this.operationQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.operationQueue.length > 0) {
                const operation = this.operationQueue.shift();
                
                try {
                    await this.hederaService.submitMessageToHCS(
                        this.bridgeTopicId,
                        JSON.stringify(operation)
                    );
                } catch (error) {
                    console.error('Failed to process queued bridge operation:', error);
                    // Re-queue for retry
                    this.operationQueue.unshift(operation);
                    break;
                }
                
                // Small delay between operations
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Store failed log for retry
     */
    async storeFailedLog(logEntry, error) {
        const failedLog = {
            timestamp: new Date().toISOString(),
            logEntry: logEntry,
            error: error.message,
            retryCount: 0
        };
        
        // Store in local file or database for retry
        // Implementation would depend on storage mechanism
        console.log('Storing failed bridge log for retry:', failedLog);
    }
    
    /**
     * Get bridge operation logs from HCS
     */
    async getBridgeOperationLogs(operationId, limit = 10) {
        try {
            const messages = await this.hederaService.getHCSMessages(
                this.bridgeTopicId,
                limit
            );
            
            // Filter messages for specific operation
            const operationLogs = messages
                .map(msg => {
                    try {
                        return JSON.parse(msg.contents);
                    } catch {
                        return null;
                    }
                })
                .filter(log => log && log.operationId === operationId)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            return operationLogs;
            
        } catch (error) {
            console.error('Failed to get bridge operation logs:', error);
            throw error;
        }
    }
    
    /**
     * Get bridge statistics from HCS logs
     */
    async getBridgeStatistics(timeRange = '24h') {
        try {
            const messages = await this.hederaService.getHCSMessages(
                this.bridgeTopicId,
                1000 // Get more messages for statistics
            );
            
            const logs = messages
                .map(msg => {
                    try {
                        return JSON.parse(msg.contents);
                    } catch {
                        return null;
                    }
                })
                .filter(log => log && this.isWithinTimeRange(log.timestamp, timeRange));
            
            const stats = {
                totalOperations: logs.length,
                operationsByType: {},
                operationsByChain: {},
                totalVolume: 0,
                averageAmount: 0,
                successRate: 0,
                averageCompletionTime: 0
            };
            
            // Calculate statistics
            logs.forEach(log => {
                // Count by type
                stats.operationsByType[log.type] = (stats.operationsByType[log.type] || 0) + 1;
                
                // Count by chain
                if (log.targetChain) {
                    stats.operationsByChain[log.targetChain] = (stats.operationsByChain[log.targetChain] || 0) + 1;
                }
                
                // Sum volume
                if (log.amount) {
                    stats.totalVolume += parseFloat(log.amount);
                }
            });
            
            // Calculate averages
            if (logs.length > 0) {
                stats.averageAmount = stats.totalVolume / logs.length;
                
                const completedOps = logs.filter(log => log.type === this.OPERATION_TYPES.BRIDGE_COMPLETED);
                const failedOps = logs.filter(log => log.type === this.OPERATION_TYPES.BRIDGE_FAILED);
                
                stats.successRate = completedOps.length / (completedOps.length + failedOps.length) * 100;
            }
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get bridge statistics:', error);
            throw error;
        }
    }
    
    /**
     * Verify cross-chain audit trail consistency
     */
    async verifyAuditTrail(operationId) {
        try {
            const bridgeLogs = await this.getBridgeOperationLogs(operationId);
            
            if (bridgeLogs.length === 0) {
                return {
                    valid: false,
                    reason: 'No bridge logs found for operation'
                };
            }
            
            // Check for required log sequence
            const hasInitiation = bridgeLogs.some(log => 
                log.type === this.OPERATION_TYPES.BRIDGE_TO_HEDERA || 
                log.type === this.OPERATION_TYPES.BRIDGE_FROM_HEDERA
            );
            
            const hasCompletion = bridgeLogs.some(log => 
                log.type === this.OPERATION_TYPES.BRIDGE_COMPLETED ||
                log.type === this.OPERATION_TYPES.BRIDGE_FAILED ||
                log.type === this.OPERATION_TYPES.BRIDGE_CANCELLED
            );
            
            // Verify chronological order
            const sortedLogs = bridgeLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const isChronological = JSON.stringify(sortedLogs) === JSON.stringify(bridgeLogs);
            
            // Verify data consistency
            const amounts = bridgeLogs.map(log => log.amount).filter(amount => amount);
            const consistentAmounts = amounts.every(amount => amount === amounts[0]);
            
            const users = bridgeLogs.map(log => log.user).filter(user => user);
            const consistentUsers = users.every(user => user === users[0]);
            
            return {
                valid: hasInitiation && hasCompletion && isChronological && consistentAmounts && consistentUsers,
                details: {
                    hasInitiation,
                    hasCompletion,
                    isChronological,
                    consistentAmounts,
                    consistentUsers,
                    logCount: bridgeLogs.length
                },
                logs: bridgeLogs
            };
            
        } catch (error) {
            console.error('Failed to verify audit trail:', error);
            return {
                valid: false,
                reason: `Verification failed: ${error.message}`
            };
        }
    }
    
    /**
     * Check if timestamp is within time range
     */
    isWithinTimeRange(timestamp, range) {
        const now = new Date();
        const logTime = new Date(timestamp);
        
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        const rangeMs = ranges[range] || ranges['24h'];
        return (now - logTime) <= rangeMs;
    }
    
    /**
     * Get bridge topic ID
     */
    getBridgeTopicId() {
        return this.bridgeTopicId;
    }
    
    /**
     * Health check for bridge logger
     */
    async healthCheck() {
        try {
            // Check HCS connection
            const hcsHealthy = await this.hederaService.healthCheck();
            
            // Check bridge topic accessibility
            const topicAccessible = this.bridgeTopicId !== null;
            
            // Check queue status
            const queueHealthy = this.operationQueue.length < 100; // Arbitrary threshold
            
            return {
                healthy: hcsHealthy && topicAccessible && queueHealthy,
                details: {
                    hcsConnection: hcsHealthy,
                    bridgeTopicId: this.bridgeTopicId,
                    queueLength: this.operationQueue.length,
                    isProcessing: this.isProcessing
                }
            };
            
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

module.exports = { BridgeOperationLogger };