/**
 * @fileoverview Enhanced AI Decision Logger with Hedera Integration
 * @description Comprehensive logging system for AI decisions with HCS integration and batch processing
 * @author AION Team
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Enhanced AI Decision Logger with Hedera integration
 */
class AIDecisionLogger extends EventEmitter {
    constructor(config = {}) {
        super();
        
        // Configuration
        this.config = {
            // Hedera integration
            hederaService: config.hederaService || null,
            hcsTopicId: config.hcsTopicId || process.env.HEDERA_HCS_TOPIC_ID,
            hcsAuditTopicId: config.hcsAuditTopicId || process.env.HEDERA_HCS_AUDIT_TOPIC_ID,
            
            // Logging settings
            logLevel: config.logLevel || 'info',
            enableHederaLogging: config.enableHederaLogging !== false,
            enableLocalLogging: config.enableLocalLogging !== false,
            
            // Batch processing
            batchSize: config.batchSize || 20,
            batchTimeout: config.batchTimeout || 5000, // 5 seconds
            maxRetries: config.maxRetries || 3,
            
            // Storage settings
            localLogPath: config.localLogPath || './logs/ai-decisions',
            maxLogFileSize: config.maxLogFileSize || 10 * 1024 * 1024, // 10MB
            maxLogFiles: config.maxLogFiles || 10,
            
            // Decision tracking
            trackDecisionOutcomes: config.trackDecisionOutcomes !== false,
            outcomeTrackingWindow: config.outcomeTrackingWindow || 24 * 60 * 60 * 1000, // 24 hours
            
            // Performance settings
            enableMetrics: config.enableMetrics !== false,
            metricsInterval: config.metricsInterval || 60000 // 1 minute
        };
        
        // State management
        this.isInitialized = false;
        this.batchQueue = [];
        this.batchTimer = null;
        this.decisionHistory = new Map();
        this.outcomeTracking = new Map();
        
        // Metrics
        this.metrics = {
            totalDecisions: 0,
            successfulLogs: 0,
            failedLogs: 0,
            batchesProcessed: 0,
            averageProcessingTime: 0,
            lastLogTime: null,
            hederaLogsCount: 0,
            localLogsCount: 0
        };
        
        // Performance tracking
        this.performanceData = {
            processingTimes: [],
            batchSizes: [],
            errorRates: []
        };
        
        // Initialize logger
        this.initialize();
    }
    
    /**
     * Initialize the AI Decision Logger
     */
    async initialize() {
        try {
            console.log('🤖 Initializing Enhanced AI Decision Logger...');
            
            // Validate configuration
            this.validateConfiguration();
            
            // Setup local logging directory
            if (this.config.enableLocalLogging) {
                await this.setupLocalLogging();
            }
            
            // Initialize Hedera integration
            if (this.config.enableHederaLogging && this.config.hederaService) {
                await this.initializeHederaIntegration();
            }
            
            // Start batch processing
            this.startBatchProcessing();
            
            // Start metrics collection
            if (this.config.enableMetrics) {
                this.startMetricsCollection();
            }
            
            this.isInitialized = true;
            this.emit('initialized', { timestamp: Date.now() });
            
            console.log('✅ AI Decision Logger initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize AI Decision Logger:', error);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Validate configuration
     */
    validateConfiguration() {
        if (this.config.enableHederaLogging && !this.config.hederaService) {
            console.warn('⚠️ Hedera logging enabled but no HederaService provided');
        }
        
        if (!this.config.enableHederaLogging && !this.config.enableLocalLogging) {
            throw new Error('At least one logging method must be enabled');
        }
        
        if (this.config.batchSize <= 0 || this.config.batchTimeout <= 0) {
            throw new Error('Batch size and timeout must be positive numbers');
        }
    }
    
    /**
     * Setup local logging directory and files
     */
    async setupLocalLogging() {
        try {
            const logDir = path.dirname(this.config.localLogPath);
            await fs.mkdir(logDir, { recursive: true });
            
            // Create initial log file if it doesn't exist
            const logFile = `${this.config.localLogPath}/decisions-${this.getDateString()}.json`;
            try {
                await fs.access(logFile);
            } catch {
                await fs.writeFile(logFile, JSON.stringify({ initialized: Date.now(), decisions: [] }, null, 2));
            }
            
            console.log(`📁 Local logging setup at: ${logDir}`);
            
        } catch (error) {
            console.error('❌ Failed to setup local logging:', error);
            throw error;
        }
    }
    
    /**
     * Initialize Hedera integration
     */
    async initializeHederaIntegration() {
        try {
            if (!this.config.hederaService.isConnected) {
                console.warn('⚠️ HederaService not connected, Hedera logging may fail');
            }
            
            // Verify HCS topics exist
            if (!this.config.hcsTopicId) {
                console.warn('⚠️ No HCS topic ID provided for decision logging');
            }
            
            console.log('🔗 Hedera integration initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Hedera integration:', error);
            throw error;
        }
    }
    
    // ========== Core Logging Methods ==========
    
    /**
     * Log an AI decision
     * @param {object} decision - Decision data
     * @returns {Promise<string>} Decision ID
     */
    async logDecision(decision) {
        try {
            const startTime = Date.now();
            
            // Generate unique decision ID
            const decisionId = this.generateDecisionId(decision);
            
            // Prepare decision entry
            const decisionEntry = this.prepareDecisionEntry(decision, decisionId);
            
            // Add to batch queue
            this.batchQueue.push(decisionEntry);
            
            // Store in decision history for tracking
            this.decisionHistory.set(decisionId, {
                ...decisionEntry,
                logged: false,
                loggedAt: null
            });
            
            // Process batch if it's full
            if (this.batchQueue.length >= this.config.batchSize) {
                await this.processBatch();
            }
            
            // Update metrics
            this.metrics.totalDecisions++;
            const processingTime = Date.now() - startTime;
            this.updateProcessingTime(processingTime);
            
            this.emit('decisionQueued', { decisionId, processingTime });
            
            return decisionId;
            
        } catch (error) {
            console.error('❌ Failed to log decision:', error);
            this.metrics.failedLogs++;
            this.emit('logError', { error, decision });
            throw error;
        }
    }
    
    /**
     * Log multiple AI decisions in batch
     * @param {Array} decisions - Array of decision data
     * @returns {Promise<Array>} Array of decision IDs
     */
    async logDecisionBatch(decisions) {
        try {
            const startTime = Date.now();
            const decisionIds = [];
            
            for (const decision of decisions) {
                const decisionId = this.generateDecisionId(decision);
                const decisionEntry = this.prepareDecisionEntry(decision, decisionId);
                
                this.batchQueue.push(decisionEntry);
                this.decisionHistory.set(decisionId, {
                    ...decisionEntry,
                    logged: false,
                    loggedAt: null
                });
                
                decisionIds.push(decisionId);
            }
            
            // Process batch immediately for large batches
            if (this.batchQueue.length >= this.config.batchSize) {
                await this.processBatch();
            }
            
            // Update metrics
            this.metrics.totalDecisions += decisions.length;
            const processingTime = Date.now() - startTime;
            this.updateProcessingTime(processingTime);
            
            this.emit('batchQueued', { count: decisions.length, decisionIds, processingTime });
            
            return decisionIds;
            
        } catch (error) {
            console.error('❌ Failed to log decision batch:', error);
            this.metrics.failedLogs += decisions.length;
            throw error;
        }
    }
    
    /**
     * Log decision outcome for tracking
     * @param {string} decisionId - Decision ID
     * @param {object} outcome - Outcome data
     * @returns {Promise<boolean>} Success status
     */
    async logDecisionOutcome(decisionId, outcome) {
        try {
            if (!this.config.trackDecisionOutcomes) {
                return false;
            }
            
            const decision = this.decisionHistory.get(decisionId);
            if (!decision) {
                console.warn(`⚠️ Decision ${decisionId} not found for outcome tracking`);
                return false;
            }
            
            // Prepare outcome entry
            const outcomeEntry = {
                decisionId: decisionId,
                outcome: outcome,
                timestamp: Date.now(),
                originalDecision: decision,
                timeSinceDecision: Date.now() - decision.timestamp
            };
            
            // Store outcome
            this.outcomeTracking.set(decisionId, outcomeEntry);
            
            // Log outcome to Hedera if enabled
            if (this.config.enableHederaLogging && this.config.hederaService) {
                await this.logOutcomeToHedera(outcomeEntry);
            }
            
            // Log outcome locally if enabled
            if (this.config.enableLocalLogging) {
                await this.logOutcomeLocally(outcomeEntry);
            }
            
            this.emit('outcomeLogged', { decisionId, outcome });
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to log decision outcome:', error);
            this.emit('outcomeLogError', { decisionId, outcome, error });
            return false;
        }
    }
    
    // ========== Batch Processing ==========
    
    /**
     * Start batch processing timer
     */
    startBatchProcessing() {
        this.batchTimer = setInterval(async () => {
            if (this.batchQueue.length > 0) {
                await this.processBatch();
            }
        }, this.config.batchTimeout);
        
        console.log(`⏱️ Batch processing started (${this.config.batchTimeout}ms interval)`);
    }
    
    /**
     * Process current batch of decisions
     */
    async processBatch() {
        if (this.batchQueue.length === 0) {
            return;
        }
        
        const startTime = Date.now();
        const batch = [...this.batchQueue];
        this.batchQueue = [];
        
        try {
            console.log(`📦 Processing batch of ${batch.length} decisions`);
            
            // Process Hedera logging
            if (this.config.enableHederaLogging && this.config.hederaService) {
                await this.processBatchHedera(batch);
            }
            
            // Process local logging
            if (this.config.enableLocalLogging) {
                await this.processBatchLocal(batch);
            }
            
            // Update decision history
            batch.forEach(decision => {
                const historyEntry = this.decisionHistory.get(decision.id);
                if (historyEntry) {
                    historyEntry.logged = true;
                    historyEntry.loggedAt = Date.now();
                }
            });
            
            // Update metrics
            this.metrics.batchesProcessed++;
            this.metrics.successfulLogs += batch.length;
            this.metrics.lastLogTime = Date.now();
            
            const processingTime = Date.now() - startTime;
            this.performanceData.batchSizes.push(batch.length);
            this.updateProcessingTime(processingTime);
            
            this.emit('batchProcessed', {
                batchSize: batch.length,
                processingTime: processingTime,
                timestamp: Date.now()
            });
            
            console.log(`✅ Batch processed successfully in ${processingTime}ms`);
            
        } catch (error) {
            console.error('❌ Failed to process batch:', error);
            
            // Re-queue failed decisions
            this.batchQueue.unshift(...batch);
            this.metrics.failedLogs += batch.length;
            
            this.emit('batchError', { batchSize: batch.length, error });
        }
    }
    
    /**
     * Process batch to Hedera
     * @param {Array} batch - Batch of decisions
     */
    async processBatchHedera(batch) {
        try {
            // Prepare messages for HCS
            const messages = batch.map(decision => ({
                type: 'AI_DECISION',
                data: decision,
                timestamp: Date.now(),
                version: '2.0.0'
            }));
            
            // Submit batch to HCS
            const results = await this.config.hederaService.submitBatchToHCS(
                this.config.hcsTopicId,
                messages
            );
            
            // Log successful submissions
            const successCount = results.filter(r => r.success).length;
            this.metrics.hederaLogsCount += successCount;
            
            console.log(`🔗 Hedera batch: ${successCount}/${batch.length} decisions logged`);
            
        } catch (error) {
            console.error('❌ Failed to process Hedera batch:', error);
            throw error;
        }
    }
    
    /**
     * Process batch to local storage
     * @param {Array} batch - Batch of decisions
     */
    async processBatchLocal(batch) {
        try {
            const logFile = `${this.config.localLogPath}/decisions-${this.getDateString()}.json`;
            
            // Read existing log file
            let logData;
            try {
                const fileContent = await fs.readFile(logFile, 'utf8');
                logData = JSON.parse(fileContent);
            } catch {
                logData = { initialized: Date.now(), decisions: [] };
            }
            
            // Add batch to log data
            logData.decisions.push(...batch);
            logData.lastUpdated = Date.now();
            logData.totalDecisions = logData.decisions.length;
            
            // Write updated log file
            await fs.writeFile(logFile, JSON.stringify(logData, null, 2));
            
            this.metrics.localLogsCount += batch.length;
            
            console.log(`💾 Local batch: ${batch.length} decisions logged to ${logFile}`);
            
        } catch (error) {
            console.error('❌ Failed to process local batch:', error);
            throw error;
        }
    }
    
    // ========== Decision Tracking ==========
    
    /**
     * Get decision by ID
     * @param {string} decisionId - Decision ID
     * @returns {object|null} Decision data
     */
    getDecision(decisionId) {
        return this.decisionHistory.get(decisionId) || null;
    }
    
    /**
     * Get decisions by criteria
     * @param {object} criteria - Search criteria
     * @returns {Array} Matching decisions
     */
    getDecisions(criteria = {}) {
        const decisions = Array.from(this.decisionHistory.values());
        
        return decisions.filter(decision => {
            if (criteria.type && decision.type !== criteria.type) return false;
            if (criteria.strategy && decision.strategy !== criteria.strategy) return false;
            if (criteria.confidence && decision.confidence < criteria.confidence) return false;
            if (criteria.startTime && decision.timestamp < criteria.startTime) return false;
            if (criteria.endTime && decision.timestamp > criteria.endTime) return false;
            if (criteria.logged !== undefined && decision.logged !== criteria.logged) return false;
            
            return true;
        });
    }
    
    /**
     * Get decision outcomes
     * @param {string} decisionId - Decision ID (optional)
     * @returns {Array|object} Outcomes
     */
    getDecisionOutcomes(decisionId = null) {
        if (decisionId) {
            return this.outcomeTracking.get(decisionId) || null;
        }
        
        return Array.from(this.outcomeTracking.values());
    }
    
    // ========== Utility Methods ==========
    
    /**
     * Generate unique decision ID
     * @param {object} decision - Decision data
     * @returns {string} Decision ID
     */
    generateDecisionId(decision) {
        const data = `${decision.type}-${Date.now()}-${JSON.stringify(decision.context || {})}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
    
    /**
     * Prepare decision entry for logging
     * @param {object} decision - Raw decision data
     * @param {string} decisionId - Decision ID
     * @returns {object} Prepared decision entry
     */
    prepareDecisionEntry(decision, decisionId) {
        return {
            id: decisionId,
            timestamp: Date.now(),
            type: decision.type || 'unknown',
            strategy: decision.strategy || null,
            action: decision.action || null,
            confidence: decision.confidence || 0,
            reasoning: decision.reasoning || '',
            context: decision.context || {},
            parameters: decision.parameters || {},
            expectedOutcome: decision.expectedOutcome || null,
            riskLevel: decision.riskLevel || 'medium',
            metadata: {
                version: '2.0.0',
                source: 'AION_AI_Agent',
                environment: process.env.NODE_ENV || 'development',
                ...decision.metadata
            }
        };
    }
    
    /**
     * Log outcome to Hedera
     * @param {object} outcomeEntry - Outcome entry
     */
    async logOutcomeToHedera(outcomeEntry) {
        try {
            const message = {
                type: 'AI_DECISION_OUTCOME',
                data: outcomeEntry,
                timestamp: Date.now(),
                version: '2.0.0'
            };
            
            await this.config.hederaService.submitToHCS(
                this.config.hcsAuditTopicId || this.config.hcsTopicId,
                message
            );
            
        } catch (error) {
            console.error('❌ Failed to log outcome to Hedera:', error);
            throw error;
        }
    }
    
    /**
     * Log outcome locally
     * @param {object} outcomeEntry - Outcome entry
     */
    async logOutcomeLocally(outcomeEntry) {
        try {
            const outcomeFile = `${this.config.localLogPath}/outcomes-${this.getDateString()}.json`;
            
            let outcomeData;
            try {
                const fileContent = await fs.readFile(outcomeFile, 'utf8');
                outcomeData = JSON.parse(fileContent);
            } catch {
                outcomeData = { initialized: Date.now(), outcomes: [] };
            }
            
            outcomeData.outcomes.push(outcomeEntry);
            outcomeData.lastUpdated = Date.now();
            outcomeData.totalOutcomes = outcomeData.outcomes.length;
            
            await fs.writeFile(outcomeFile, JSON.stringify(outcomeData, null, 2));
            
        } catch (error) {
            console.error('❌ Failed to log outcome locally:', error);
            throw error;
        }
    }
    
    /**
     * Get date string for file naming
     * @returns {string} Date string
     */
    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
    
    /**
     * Update processing time metrics
     * @param {number} processingTime - Processing time in ms
     */
    updateProcessingTime(processingTime) {
        this.performanceData.processingTimes.push(processingTime);
        
        // Keep only last 100 measurements
        if (this.performanceData.processingTimes.length > 100) {
            this.performanceData.processingTimes.shift();
        }
        
        // Update average
        const times = this.performanceData.processingTimes;
        this.metrics.averageProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;
    }
    
    // ========== Metrics and Monitoring ==========
    
    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        setInterval(() => {
            this.collectMetrics();
        }, this.config.metricsInterval);
        
        console.log(`📊 Metrics collection started (${this.config.metricsInterval}ms interval)`);
    }
    
    /**
     * Collect and emit metrics
     */
    collectMetrics() {
        const currentTime = Date.now();
        
        const metricsData = {
            ...this.metrics,
            timestamp: currentTime,
            queueSize: this.batchQueue.length,
            historySize: this.decisionHistory.size,
            outcomeTrackingSize: this.outcomeTracking.size,
            performance: {
                averageProcessingTime: this.metrics.averageProcessingTime,
                averageBatchSize: this.performanceData.batchSizes.length > 0 ?
                    this.performanceData.batchSizes.reduce((a, b) => a + b, 0) / this.performanceData.batchSizes.length : 0,
                errorRate: this.metrics.totalDecisions > 0 ?
                    (this.metrics.failedLogs / this.metrics.totalDecisions) * 100 : 0
            }
        };
        
        this.emit('metrics', metricsData);
    }
    
    /**
     * Get current metrics
     * @returns {object} Current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            queueSize: this.batchQueue.length,
            historySize: this.decisionHistory.size,
            outcomeTrackingSize: this.outcomeTracking.size,
            uptime: Date.now() - (this.metrics.lastLogTime || Date.now()),
            performance: {
                averageProcessingTime: this.metrics.averageProcessingTime,
                averageBatchSize: this.performanceData.batchSizes.length > 0 ?
                    this.performanceData.batchSizes.reduce((a, b) => a + b, 0) / this.performanceData.batchSizes.length : 0,
                errorRate: this.metrics.totalDecisions > 0 ?
                    (this.metrics.failedLogs / this.metrics.totalDecisions) * 100 : 0
            }
        };
    }
    
    /**
     * Get service status
     * @returns {object} Service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            configuration: {
                enableHederaLogging: this.config.enableHederaLogging,
                enableLocalLogging: this.config.enableLocalLogging,
                batchSize: this.config.batchSize,
                batchTimeout: this.config.batchTimeout,
                trackDecisionOutcomes: this.config.trackDecisionOutcomes
            },
            metrics: this.getMetrics(),
            health: {
                queueHealthy: this.batchQueue.length < this.config.batchSize * 2,
                hederaConnected: this.config.hederaService ? this.config.hederaService.isConnected : false,
                localLoggingEnabled: this.config.enableLocalLogging
            }
        };
    }
    
    /**
     * Gracefully shutdown the logger
     */
    async shutdown() {
        try {
            console.log('🛑 Shutting down AI Decision Logger...');
            
            // Process remaining batch
            if (this.batchQueue.length > 0) {
                await this.processBatch();
            }
            
            // Clear timers
            if (this.batchTimer) {
                clearInterval(this.batchTimer);
                this.batchTimer = null;
            }
            
            // Clear data structures
            this.batchQueue = [];
            this.decisionHistory.clear();
            this.outcomeTracking.clear();
            
            this.isInitialized = false;
            this.emit('shutdown', { timestamp: Date.now() });
            
            console.log('✅ AI Decision Logger shutdown complete');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            throw error;
        }
    }
}

export default AIDecisionLogger;