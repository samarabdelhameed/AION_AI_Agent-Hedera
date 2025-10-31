/**
 * Bridge Integration Service
 * Coordinates between bridge operations and HCS logging
 */

import { BridgeOperationLogger } from './bridgeOperationLogger.js';
import { HederaService } from './hederaService.js';
import { AIDecisionLogger } from './aiDecisionLogger.js';

class BridgeIntegrationService {
    constructor(hederaService, aiDecisionLogger) {
        this.hederaService = hederaService;
        this.aiDecisionLogger = aiDecisionLogger;
        this.bridgeLogger = new BridgeOperationLogger(hederaService, aiDecisionLogger);
        
        // Bridge operation tracking
        this.activeOperations = new Map();
        this.operationHistory = [];
        this.eventListeners = new Map();
        
        // Configuration
        this.config = {
            maxHistorySize: 1000,
            operationTimeout: 24 * 60 * 60 * 1000, // 24 hours
            retryAttempts: 3,
            retryDelay: 5000
        };
        
        // Initialize service
        this.initialize();
    }
    
    /**
     * Initialize bridge integration service
     */
    async initialize() {
        try {
            console.log('🌉 Initializing Bridge Integration Service...');
            
            // Wait for bridge logger to initialize
            await this.bridgeLogger.initializeBridgeTopic();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            console.log('✅ Bridge Integration Service initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Bridge Integration Service:', error);
            throw error;
        }
    }
    
    /**
     * Set up event handlers for bridge operations
     */
    setupEventHandlers() {
        // Handle bridge operation events
        this.eventListeners.set('bridgeInitiated', this.handleBridgeInitiated.bind(this));
        this.eventListeners.set('bridgeCompleted', this.handleBridgeCompleted.bind(this));
        this.eventListeners.set('bridgeFailed', this.handleBridgeFailed.bind(this));
        this.eventListeners.set('bridgeCancelled', this.handleBridgeCancelled.bind(this));
        
        // Handle AI decision events
        this.eventListeners.set('aiDecisionMade', this.handleAIDecision.bind(this));
        
        console.log('📡 Bridge event handlers configured');
    }
    
    /**
     * Handle bridge operation initiation
     */
    async handleBridgeInitiated(eventData) {
        try {
            console.log('🚀 Bridge operation initiated:', eventData.operationId);
            
            // Extract operation data from event
            const operationData = {
                operationId: eventData.operationId || eventData.returnValues?.operationId,
                user: eventData.user || eventData.returnValues?.user,
                sourceChainId: eventData.sourceChainId || this.extractChainId(eventData),
                targetChainId: eventData.targetChainId || this.getTargetChainId(eventData),
                sourceToken: eventData.sourceToken || eventData.returnValues?.sourceToken,
                targetToken: eventData.targetToken || eventData.returnValues?.targetToken,
                amount: eventData.amount || eventData.returnValues?.amount,
                recipient: eventData.recipient || eventData.returnValues?.recipient,
                bridgeService: eventData.bridgeService || 'unknown',
                txHash: eventData.transactionHash,
                gasLimit: eventData.gasLimit || 200000,
                bridgeFee: eventData.bridgeFee || '0',
                payload: eventData.payload || '0x'
            };
            
            // Track active operation
            this.activeOperations.set(operationData.operationId, {
                ...operationData,
                status: 'initiated',
                timestamp: Date.now(),
                events: [eventData]
            });
            
            // Log to HCS
            let hcsMessageId;
            if (operationData.targetChainId === 295) {
                // Bridging to Hedera
                hcsMessageId = await this.bridgeLogger.logBridgeInitiation(operationData);
            } else {
                // Bridging from Hedera
                hcsMessageId = await this.bridgeLogger.logBridgeFromHedera(operationData);
            }
            
            // Update operation with HCS message ID
            const operation = this.activeOperations.get(operationData.operationId);
            if (operation) {
                operation.hcsMessageId = hcsMessageId;
                operation.hcsLogs = [hcsMessageId];
            }
            
            console.log(`✅ Bridge initiation logged to HCS: ${hcsMessageId}`);
            
            return {
                success: true,
                operationId: operationData.operationId,
                hcsMessageId: hcsMessageId
            };
            
        } catch (error) {
            console.error('❌ Failed to handle bridge initiation:', error);
            throw error;
        }
    }
    
    /**
     * Handle bridge operation completion
     */
    async handleBridgeCompleted(eventData) {
        try {
            console.log('✅ Bridge operation completed:', eventData.operationId);
            
            const operationId = eventData.operationId || eventData.returnValues?.operationId;
            const operation = this.activeOperations.get(operationId);
            
            if (!operation) {
                console.warn(`⚠️ No active operation found for ID: ${operationId}`);
                return { success: false, reason: 'operation_not_found' };
            }
            
            // Extract completion data
            const completionData = {
                operationId: operationId,
                user: operation.user,
                amount: operation.amount,
                targetChainId: operation.targetChainId,
                targetTxHash: eventData.targetTxHash || eventData.returnValues?.txHash,
                bridgeService: operation.bridgeService,
                completionTime: Date.now(),
                tokensIssued: eventData.tokensIssued || eventData.returnValues?.amount,
                finalAmount: eventData.finalAmount || operation.amount,
                fees: eventData.fees || operation.bridgeFee
            };
            
            // Log completion to HCS
            const hcsMessageId = await this.bridgeLogger.logBridgeCompletion(completionData);
            
            // Update operation status
            operation.status = 'completed';
            operation.completedAt = Date.now();
            operation.events.push(eventData);
            operation.hcsLogs.push(hcsMessageId);
            operation.completionData = completionData;
            
            // Move to history and remove from active operations
            this.moveToHistory(operationId);
            
            console.log(`✅ Bridge completion logged to HCS: ${hcsMessageId}`);
            
            return {
                success: true,
                operationId: operationId,
                hcsMessageId: hcsMessageId,
                completionTime: operation.completedAt
            };
            
        } catch (error) {
            console.error('❌ Failed to handle bridge completion:', error);
            throw error;
        }
    }
    
    /**
     * Handle bridge operation failure
     */
    async handleBridgeFailed(eventData) {
        try {
            console.log('❌ Bridge operation failed:', eventData.operationId);
            
            const operationId = eventData.operationId || eventData.returnValues?.operationId;
            const operation = this.activeOperations.get(operationId);
            
            if (!operation) {
                console.warn(`⚠️ No active operation found for ID: ${operationId}`);
                return { success: false, reason: 'operation_not_found' };
            }
            
            // Extract failure data
            const failureData = {
                operationId: operationId,
                user: operation.user,
                amount: operation.amount,
                reason: eventData.reason || eventData.returnValues?.reason || 'Unknown error',
                errorCode: eventData.errorCode || eventData.returnValues?.errorCode,
                bridgeService: operation.bridgeService,
                refunded: eventData.refunded || false,
                refundTxHash: eventData.refundTxHash || eventData.returnValues?.refundTxHash,
                refundAmount: eventData.refundAmount || operation.amount
            };
            
            // Log failure to HCS
            const hcsMessageId = await this.bridgeLogger.logBridgeFailure(failureData);
            
            // Update operation status
            operation.status = 'failed';
            operation.failedAt = Date.now();
            operation.events.push(eventData);
            operation.hcsLogs.push(hcsMessageId);
            operation.failureData = failureData;
            
            // Move to history and remove from active operations
            this.moveToHistory(operationId);
            
            console.log(`✅ Bridge failure logged to HCS: ${hcsMessageId}`);
            
            return {
                success: true,
                operationId: operationId,
                hcsMessageId: hcsMessageId,
                failureReason: failureData.reason
            };
            
        } catch (error) {
            console.error('❌ Failed to handle bridge failure:', error);
            throw error;
        }
    }
    
    /**
     * Handle bridge operation cancellation
     */
    async handleBridgeCancelled(eventData) {
        try {
            console.log('🚫 Bridge operation cancelled:', eventData.operationId);
            
            const operationId = eventData.operationId || eventData.returnValues?.operationId;
            const operation = this.activeOperations.get(operationId);
            
            if (!operation) {
                console.warn(`⚠️ No active operation found for ID: ${operationId}`);
                return { success: false, reason: 'operation_not_found' };
            }
            
            // Extract cancellation data
            const cancellationData = {
                operationId: operationId,
                user: operation.user,
                amount: operation.amount,
                reason: eventData.reason || eventData.returnValues?.reason || 'User cancellation',
                cancelledBy: eventData.cancelledBy || eventData.returnValues?.cancelledBy || 'user',
                bridgeService: operation.bridgeService,
                tokensReturned: eventData.tokensReturned || true,
                refundTxHash: eventData.refundTxHash || eventData.returnValues?.refundTxHash
            };
            
            // Log cancellation to HCS
            const hcsMessageId = await this.bridgeLogger.logBridgeCancellation(cancellationData);
            
            // Update operation status
            operation.status = 'cancelled';
            operation.cancelledAt = Date.now();
            operation.events.push(eventData);
            operation.hcsLogs.push(hcsMessageId);
            operation.cancellationData = cancellationData;
            
            // Move to history and remove from active operations
            this.moveToHistory(operationId);
            
            console.log(`✅ Bridge cancellation logged to HCS: ${hcsMessageId}`);
            
            return {
                success: true,
                operationId: operationId,
                hcsMessageId: hcsMessageId,
                cancellationReason: cancellationData.reason
            };
            
        } catch (error) {
            console.error('❌ Failed to handle bridge cancellation:', error);
            throw error;
        }
    }
    
    /**
     * Handle AI decision related to bridge operations
     */
    async handleAIDecision(decisionData) {
        try {
            console.log('🤖 AI decision made for bridge operation:', decisionData.bridgeOperationId);
            
            // Log AI decision to HCS
            const result = await this.bridgeLogger.logBridgeAIDecision(decisionData);
            
            // Update operation with AI decision data
            const operationId = decisionData.bridgeOperationId;
            const operation = this.activeOperations.get(operationId);
            
            if (operation) {
                operation.aiDecisions = operation.aiDecisions || [];
                operation.aiDecisions.push({
                    ...decisionData,
                    bridgeMessageId: result.bridgeMessageId,
                    aiMessageId: result.aiMessageId,
                    timestamp: Date.now()
                });
                
                operation.hcsLogs.push(result.bridgeMessageId);
            }
            
            console.log(`✅ AI decision logged to HCS: ${result.bridgeMessageId}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to handle AI decision:', error);
            throw error;
        }
    }
    
    /**
     * Process bridge event from contract
     */
    async processBridgeEvent(eventData) {
        try {
            const eventType = eventData.event || this.determineEventType(eventData);
            const handler = this.eventListeners.get(eventType);
            
            if (handler) {
                return await handler(eventData);
            } else {
                console.warn(`⚠️ No handler found for event type: ${eventType}`);
                return { success: false, reason: 'no_handler' };
            }
            
        } catch (error) {
            console.error('❌ Failed to process bridge event:', error);
            throw error;
        }
    }
    
    /**
     * Get bridge operation status
     */
    getBridgeOperationStatus(operationId) {
        const activeOperation = this.activeOperations.get(operationId);
        if (activeOperation) {
            return {
                found: true,
                status: activeOperation.status,
                operation: activeOperation
            };
        }
        
        const historicalOperation = this.operationHistory.find(op => op.operationId === operationId);
        if (historicalOperation) {
            return {
                found: true,
                status: historicalOperation.status,
                operation: historicalOperation
            };
        }
        
        return {
            found: false,
            status: 'not_found'
        };
    }
    
    /**
     * Get all active bridge operations
     */
    getActiveOperations() {
        return Array.from(this.activeOperations.values());
    }
    
    /**
     * Get bridge operation history
     */
    getOperationHistory(limit = 50) {
        return this.operationHistory
            .slice(-limit)
            .reverse(); // Most recent first
    }
    
    /**
     * Verify bridge operation audit trail
     */
    async verifyOperationAuditTrail(operationId) {
        try {
            const verification = await this.bridgeLogger.verifyAuditTrail(operationId);
            
            // Add local operation data for comparison
            const localOperation = this.getBridgeOperationStatus(operationId);
            
            return {
                ...verification,
                localOperation: localOperation.found ? localOperation.operation : null,
                crossReference: localOperation.found ? this.crossReferenceAuditTrail(localOperation.operation, verification.logs) : null
            };
            
        } catch (error) {
            console.error('❌ Failed to verify operation audit trail:', error);
            throw error;
        }
    }
    
    /**
     * Get bridge statistics
     */
    async getBridgeStatistics(timeRange = '24h') {
        try {
            // Get HCS statistics
            const hcsStats = await this.bridgeLogger.getBridgeStatistics(timeRange);
            
            // Get local statistics
            const localStats = this.calculateLocalStatistics(timeRange);
            
            return {
                hcs: hcsStats,
                local: localStats,
                combined: this.combineStatistics(hcsStats, localStats)
            };
            
        } catch (error) {
            console.error('❌ Failed to get bridge statistics:', error);
            throw error;
        }
    }
    
    /**
     * Health check for bridge integration service
     */
    async healthCheck() {
        try {
            const bridgeLoggerHealth = await this.bridgeLogger.healthCheck();
            const hederaHealth = await this.hederaService.healthCheck();
            
            const serviceHealth = {
                healthy: bridgeLoggerHealth.healthy && hederaHealth.client,
                bridgeLogger: bridgeLoggerHealth,
                hederaService: hederaHealth,
                activeOperations: this.activeOperations.size,
                historySize: this.operationHistory.length,
                eventListeners: this.eventListeners.size
            };
            
            return serviceHealth;
            
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    // Helper methods
    
    /**
     * Move operation from active to history
     */
    moveToHistory(operationId) {
        const operation = this.activeOperations.get(operationId);
        if (operation) {
            this.operationHistory.push(operation);
            this.activeOperations.delete(operationId);
            
            // Maintain history size limit
            if (this.operationHistory.length > this.config.maxHistorySize) {
                this.operationHistory.shift();
            }
        }
    }
    
    /**
     * Extract chain ID from event data
     */
    extractChainId(eventData) {
        return eventData.sourceChainId || 
               eventData.returnValues?.sourceChainId || 
               (eventData.blockNumber ? 295 : 56); // Default based on context
    }
    
    /**
     * Get target chain ID from event data
     */
    getTargetChainId(eventData) {
        return eventData.targetChainId || 
               eventData.returnValues?.targetChainId || 
               295; // Default to Hedera
    }
    
    /**
     * Determine event type from event data
     */
    determineEventType(eventData) {
        const eventName = eventData.event || eventData.eventName;
        
        const eventTypeMap = {
            'BridgeDepositInitiated': 'bridgeInitiated',
            'BridgeWithdrawInitiated': 'bridgeInitiated',
            'BridgeOperationCompleted': 'bridgeCompleted',
            'BridgeOperationFailed': 'bridgeFailed',
            'BridgeOperationCancelled': 'bridgeCancelled'
        };
        
        return eventTypeMap[eventName] || 'unknown';
    }
    
    /**
     * Cross-reference local operation with HCS audit trail
     */
    crossReferenceAuditTrail(localOperation, hcsLogs) {
        const matches = {
            operationId: false,
            user: false,
            amount: false,
            timestamps: false,
            eventCount: false
        };
        
        if (hcsLogs && hcsLogs.length > 0) {
            const firstLog = hcsLogs[0];
            
            matches.operationId = firstLog.operationId === localOperation.operationId;
            matches.user = firstLog.user === localOperation.user;
            matches.amount = firstLog.amount === localOperation.amount;
            matches.eventCount = hcsLogs.length === localOperation.events.length;
            
            // Check timestamp consistency (within reasonable range)
            const timeDiff = Math.abs(new Date(firstLog.timestamp) - localOperation.timestamp);
            matches.timestamps = timeDiff < 60000; // Within 1 minute
        }
        
        return matches;
    }
    
    /**
     * Calculate local statistics
     */
    calculateLocalStatistics(timeRange) {
        const now = Date.now();
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        const rangeMs = ranges[timeRange] || ranges['24h'];
        const cutoff = now - rangeMs;
        
        const recentOperations = [
            ...Array.from(this.activeOperations.values()),
            ...this.operationHistory
        ].filter(op => op.timestamp >= cutoff);
        
        const stats = {
            totalOperations: recentOperations.length,
            activeOperations: this.activeOperations.size,
            completedOperations: recentOperations.filter(op => op.status === 'completed').length,
            failedOperations: recentOperations.filter(op => op.status === 'failed').length,
            cancelledOperations: recentOperations.filter(op => op.status === 'cancelled').length,
            averageCompletionTime: 0,
            totalVolume: 0
        };
        
        // Calculate averages
        const completedOps = recentOperations.filter(op => op.status === 'completed' && op.completedAt);
        if (completedOps.length > 0) {
            const totalTime = completedOps.reduce((sum, op) => sum + (op.completedAt - op.timestamp), 0);
            stats.averageCompletionTime = totalTime / completedOps.length;
        }
        
        // Calculate total volume
        stats.totalVolume = recentOperations.reduce((sum, op) => {
            const amount = parseFloat(op.amount || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        
        return stats;
    }
    
    /**
     * Combine HCS and local statistics
     */
    combineStatistics(hcsStats, localStats) {
        return {
            totalOperations: Math.max(hcsStats.totalOperations, localStats.totalOperations),
            successRate: hcsStats.successRate || 0,
            averageCompletionTime: localStats.averageCompletionTime,
            totalVolume: Math.max(hcsStats.totalVolume, localStats.totalVolume),
            dataConsistency: {
                operationCountMatch: hcsStats.totalOperations === localStats.totalOperations,
                volumeMatch: Math.abs(hcsStats.totalVolume - localStats.totalVolume) < 0.01
            }
        };
    }
    
    /**
     * Cleanup expired operations
     */
    cleanupExpiredOperations() {
        const now = Date.now();
        const expiredOperations = [];
        
        for (const [operationId, operation] of this.activeOperations.entries()) {
            if (now - operation.timestamp > this.config.operationTimeout) {
                expiredOperations.push(operationId);
            }
        }
        
        expiredOperations.forEach(operationId => {
            console.log(`🧹 Cleaning up expired operation: ${operationId}`);
            this.moveToHistory(operationId);
        });
        
        return expiredOperations.length;
    }
    
    /**
     * Start periodic cleanup
     */
    startPeriodicCleanup(interval = 60 * 60 * 1000) { // 1 hour
        this.cleanupInterval = setInterval(() => {
            const cleaned = this.cleanupExpiredOperations();
            if (cleaned > 0) {
                console.log(`🧹 Cleaned up ${cleaned} expired operations`);
            }
        }, interval);
        
        console.log('🧹 Periodic cleanup started');
    }
    
    /**
     * Stop periodic cleanup
     */
    stopPeriodicCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🧹 Periodic cleanup stopped');
        }
    }
    
    /**
     * Shutdown service
     */
    async shutdown() {
        try {
            console.log('🛑 Shutting down Bridge Integration Service...');
            
            // Stop periodic cleanup
            this.stopPeriodicCleanup();
            
            // Clear event listeners
            this.eventListeners.clear();
            
            // Clear active operations
            this.activeOperations.clear();
            
            console.log('✅ Bridge Integration Service shutdown complete');
            
        } catch (error) {
            console.error('❌ Error during Bridge Integration Service shutdown:', error);
        }
    }
}

export { BridgeIntegrationService };