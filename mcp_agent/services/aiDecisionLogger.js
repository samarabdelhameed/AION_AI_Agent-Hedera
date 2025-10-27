import HederaService from './hederaService.js';
import { ethers } from 'ethers';

/**
 * AI Decision Logger Service
 * Monitors AIRebalance events from vault contract and logs them to HCS
 */
class AIDecisionLogger {
    constructor(web3Provider, contractAddress, contractABI) {
        this.web3Provider = web3Provider;
        this.contractAddress = contractAddress;
        this.contractABI = contractABI;
        this.hederaService = new HederaService();
        this.contract = null;
        this.eventMappings = new Map(); // Maps event hashes to HCS message IDs
        this.isMonitoring = false;
        this.lastProcessedBlock = 0;
        this.eventQueue = [];
        this.processingInterval = null;
    }

    /**
     * Initialize the AI decision logger
     */
    async initialize() {
        try {
            console.log('🚀 Initializing AI Decision Logger...');
            
            // Initialize Hedera service
            await this.hederaService.initialize();
            
            // Create HCS topic if not exists
            if (!process.env.HCS_TOPIC_ID) {
                const topicId = await this.hederaService.createHCSTopic("AION AI Decision Audit Trail");
                console.log(`✅ Created HCS topic: ${topicId}`);
            }
            
            // Initialize contract interface
            this.contract = new ethers.Contract(
                this.contractAddress,
                this.contractABI,
                this.web3Provider
            );
            
            // Get current block number
            this.lastProcessedBlock = await this.web3Provider.getBlockNumber();
            
            console.log('✅ AI Decision Logger initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AI Decision Logger:', error);
            throw error;
        }
    }

    /**
     * Start monitoring AIRebalance events
     */
    async startMonitoring(pollInterval = 5000) {
        if (this.isMonitoring) {
            console.warn('⚠️ Monitoring already active');
            return;
        }

        try {
            console.log(`👀 Starting AIRebalance event monitoring (poll interval: ${pollInterval}ms)`);
            
            this.isMonitoring = true;
            
            // Start event polling
            this.processingInterval = setInterval(async () => {
                try {
                    await this.pollForEvents();
                    await this.processEventQueue();
                } catch (error) {
                    console.error('❌ Error during event monitoring:', error);
                }
            }, pollInterval);
            
            console.log('✅ Event monitoring started');
            return {
                status: 'monitoring_started',
                contractAddress: this.contractAddress,
                pollInterval: pollInterval
            };
        } catch (error) {
            console.error('❌ Failed to start monitoring:', error);
            throw error;
        }
    }

    /**
     * Poll for new AIRebalance events
     */
    async pollForEvents() {
        try {
            const currentBlock = await this.web3Provider.getBlockNumber();
            const fromBlock = this.lastProcessedBlock + 1;

            if (fromBlock > currentBlock) {
                return; // No new blocks
            }

            // Get AIRebalance events
            const filter = this.contract.filters.AIRebalance();
            const events = await this.contract.queryFilter(filter, fromBlock, currentBlock);

            // Add events to processing queue
            for (const event of events) {
                const eventData = await this.parseAIRebalanceEvent(event);
                this.eventQueue.push(eventData);
                console.log(`📝 Queued AIRebalance event: ${event.transactionHash}`);
            }

            // Update last processed block
            this.lastProcessedBlock = currentBlock;

            if (events.length > 0) {
                console.log(`📊 Found ${events.length} new AIRebalance events up to block ${currentBlock}`);
            }
        } catch (error) {
            console.error('❌ Error polling for events:', error);
        }
    }

    /**
     * Parse AIRebalance event data
     */
    async parseAIRebalanceEvent(event) {
        try {
            const receipt = await this.web3Provider.getTransactionReceipt(event.transactionHash);
            const block = await this.web3Provider.getBlock(event.blockNumber);
            
            return {
                // Event identification
                eventHash: this.generateEventHash(event),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber,
                blockTimestamp: block.timestamp,
                logIndex: event.logIndex,
                
                // Event data
                agent: event.args.agent,
                timestamp: event.args.timestamp.toString(),
                decisionCid: event.args.decisionCid,
                fromStrategy: event.args.fromStrategy.toString(),
                toStrategy: event.args.toStrategy.toString(),
                amount: event.args.amount.toString(),
                
                // Transaction details
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: receipt.effectiveGasPrice?.toString() || '0',
                
                // Processing metadata
                processedAt: Date.now(),
                status: 'pending'
            };
        } catch (error) {
            console.error('❌ Error parsing AIRebalance event:', error);
            throw error;
        }
    }

    /**
     * Process queued events and submit to HCS
     */
    async processEventQueue() {
        if (this.eventQueue.length === 0) {
            return;
        }

        console.log(`🔄 Processing ${this.eventQueue.length} queued events`);

        const eventsToProcess = [...this.eventQueue];
        this.eventQueue = [];

        for (const eventData of eventsToProcess) {
            try {
                await this.submitEventToHCS(eventData);
            } catch (error) {
                console.error(`❌ Failed to process event ${eventData.transactionHash}:`, error);
                // Re-queue failed events for retry
                eventData.retryCount = (eventData.retryCount || 0) + 1;
                if (eventData.retryCount < 3) {
                    this.eventQueue.push(eventData);
                }
            }
        }
    }

    /**
     * Submit AI decision event to HCS
     */
    async submitEventToHCS(eventData) {
        try {
            console.log(`📤 Submitting AIRebalance event to HCS: ${eventData.transactionHash}`);

            // Prepare decision data for HCS
            const decisionData = {
                // Core event identification
                txHash: eventData.transactionHash,
                blockNumber: eventData.blockNumber,
                logIndex: eventData.logIndex,
                eventHash: eventData.eventHash,
                
                // Decision details
                type: 'ai_rebalance',
                agent: eventData.agent,
                decisionId: eventData.decisionCid,
                timestamp: eventData.timestamp,
                decisionCid: eventData.decisionCid,
                fromStrategy: eventData.fromStrategy,
                toStrategy: eventData.toStrategy,
                amount: eventData.amount,
                
                // Network information
                chainId: await this.web3Provider.getNetwork().then(n => n.chainId.toString()),
                contractAddress: this.contractAddress,
                gasUsed: eventData.gasUsed,
                gasPrice: eventData.gasPrice,
                
                // Timing information
                blockTimestamp: eventData.blockTimestamp,
                processedAt: eventData.processedAt,
                
                // Additional metadata
                reason: 'AI-driven yield optimization',
                confidence: 0.95, // Default confidence
                expectedYield: null, // To be enhanced with actual data
                riskScore: null // To be enhanced with actual data
            };

            // Submit to HCS with retry mechanism
            const hcsResult = await this.hederaService.submitDecisionWithRetry(decisionData, 3, 1000);
            
            // Store mapping between event and HCS message
            this.eventMappings.set(eventData.eventHash, {
                hcsTopicId: hcsResult.topicId,
                hcsSequenceNumber: hcsResult.sequenceNumber,
                hcsTransactionId: hcsResult.transactionId,
                submittedAt: Date.now(),
                eventData: eventData
            });

            console.log(`✅ AIRebalance event submitted to HCS: ${hcsResult.sequenceNumber}`);
            
            return {
                success: true,
                eventHash: eventData.eventHash,
                hcsResult: hcsResult
            };
        } catch (error) {
            console.error(`❌ Failed to submit event to HCS:`, error);
            throw error;
        }
    }

    /**
     * Generate unique hash for event identification
     */
    generateEventHash(event) {
        const crypto = require('crypto');
        const hashInput = `${event.transactionHash}-${event.blockNumber}-${event.logIndex}`;
        return crypto.createHash('sha256').update(hashInput).digest('hex');
    }

    /**
     * Get mapping between event and HCS message
     */
    getEventMapping(eventHash) {
        return this.eventMappings.get(eventHash);
    }

    /**
     * Get all event mappings
     */
    getAllEventMappings() {
        return Array.from(this.eventMappings.entries()).map(([eventHash, mapping]) => ({
            eventHash,
            ...mapping
        }));
    }

    /**
     * Verify event was logged to HCS
     */
    async verifyEventLogging(eventHash) {
        const mapping = this.eventMappings.get(eventHash);
        if (!mapping) {
            return {
                verified: false,
                reason: 'Event not found in mappings'
            };
        }

        return {
            verified: true,
            hcsTopicId: mapping.hcsTopicId,
            hcsSequenceNumber: mapping.hcsSequenceNumber,
            submittedAt: mapping.submittedAt,
            eventData: mapping.eventData
        };
    }

    /**
     * Get logging statistics
     */
    getStatistics() {
        const mappings = this.getAllEventMappings();
        const now = Date.now();
        const last24h = mappings.filter(m => (now - m.submittedAt) < 24 * 60 * 60 * 1000);
        
        return {
            totalEventsLogged: mappings.length,
            eventsLast24h: last24h.length,
            queuedEvents: this.eventQueue.length,
            isMonitoring: this.isMonitoring,
            lastProcessedBlock: this.lastProcessedBlock,
            contractAddress: this.contractAddress,
            hederaServiceStatus: this.hederaService.getStatus()
        };
    }

    /**
     * Stop monitoring and cleanup
     */
    async stopMonitoring() {
        try {
            console.log('⏹️ Stopping AI decision logging...');
            
            this.isMonitoring = false;
            
            if (this.processingInterval) {
                clearInterval(this.processingInterval);
                this.processingInterval = null;
            }
            
            // Process remaining queued events
            if (this.eventQueue.length > 0) {
                console.log(`🔄 Processing ${this.eventQueue.length} remaining events...`);
                await this.processEventQueue();
            }
            
            console.log('✅ AI decision logging stopped');
            return {
                status: 'monitoring_stopped',
                finalStatistics: this.getStatistics()
            };
        } catch (error) {
            console.error('❌ Error stopping monitoring:', error);
            throw error;
        }
    }

    /**
     * Health check for the decision logger
     */
    async healthCheck() {
        const health = {
            timestamp: Date.now(),
            status: 'healthy',
            issues: []
        };

        try {
            // Check Hedera service health
            const hederaHealth = await this.hederaService.healthCheck();
            if (hederaHealth.errors.length > 0) {
                health.issues.push(...hederaHealth.errors);
                health.status = 'degraded';
            }

            // Check Web3 provider
            try {
                await this.web3Provider.getBlockNumber();
            } catch (error) {
                health.issues.push(`Web3 provider error: ${error.message}`);
                health.status = 'degraded';
            }

            // Check contract interface
            if (!this.contract) {
                health.issues.push('Contract interface not initialized');
                health.status = 'degraded';
            }

            // Check monitoring status
            if (!this.isMonitoring) {
                health.issues.push('Event monitoring not active');
            }

            // Check queue size
            if (this.eventQueue.length > 100) {
                health.issues.push(`Large event queue: ${this.eventQueue.length} events`);
                health.status = 'degraded';
            }

            if (health.issues.length === 0) {
                health.status = 'healthy';
            } else if (health.issues.length > 3) {
                health.status = 'unhealthy';
            }

        } catch (error) {
            health.status = 'unhealthy';
            health.issues.push(`Health check failed: ${error.message}`);
        }

        return health;
    }

    /**
     * Close and cleanup resources
     */
    async close() {
        try {
            await this.stopMonitoring();
            await this.hederaService.close();
            console.log('✅ AI Decision Logger closed');
        } catch (error) {
            console.error('❌ Error closing AI Decision Logger:', error);
        }
    }
}

export default AIDecisionLogger;