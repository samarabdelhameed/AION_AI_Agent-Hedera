import { EventEmitter } from 'events';
import { ethers } from 'ethers';

/**
 * Real-time Event Monitor Service
 * Monitors vault events and coordinates cross-chain logging to Hedera
 */
class RealTimeEventMonitor extends EventEmitter {
    constructor(web3Provider, hederaService, aiDecisionLogger, modelMetadataManager) {
        super();
        this.web3Provider = web3Provider;
        this.hederaService = hederaService;
        this.aiDecisionLogger = aiDecisionLogger;
        this.modelMetadataManager = modelMetadataManager;
        
        this.isMonitoring = false;
        this.monitoredContracts = new Map();
        this.eventFilters = new Map();
        this.lastProcessedBlocks = new Map();
        this.processingQueue = [];
        this.processingInterval = null;
        this.blockPollingInterval = null;
        
        // Configuration
        this.config = {
            pollInterval: 5000, // 5 seconds
            batchSize: 10,
            maxRetries: 3,
            retryDelay: 1000
        };
        
        // Statistics
        this.stats = {
            totalEventsProcessed: 0,
            successfulSubmissions: 0,
            failedSubmissions: 0,
            lastEventTimestamp: null,
            uptime: 0,
            startTime: null
        };
    }

    /**
     * Initialize the real-time event monitor
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Real-time Event Monitor...');
            
            // Verify dependencies
            if (!this.web3Provider) {
                throw new Error('Web3 provider is required');
            }
            
            if (!this.hederaService) {
                console.warn('⚠️ Hedera service not available - events will not be logged to HCS');
            }
            
            // Get current block number
            const currentBlock = await this.web3Provider.getBlockNumber();
            console.log(`📊 Current block number: ${currentBlock}`);
            
            this.stats.startTime = Date.now();
            
            console.log('✅ Real-time Event Monitor initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Real-time Event Monitor:', error);
            throw error;
        }
    }

    /**
     * Add contract for monitoring
     */
    async addContract(contractAddress, contractABI, eventNames = ['AIRebalance']) {
        try {
            console.log(`📝 Adding contract for monitoring: ${contractAddress}`);
            
            // Create contract instance
            const contract = new ethers.Contract(contractAddress, contractABI, this.web3Provider);
            
            // Set up event filters
            const filters = {};
            for (const eventName of eventNames) {
                try {
                    filters[eventName] = contract.filters[eventName]();
                    console.log(`✅ Event filter created for: ${eventName}`);
                } catch (filterError) {
                    console.warn(`⚠️ Could not create filter for event ${eventName}:`, filterError.message);
                }
            }
            
            // Get current block for this contract
            const currentBlock = await this.web3Provider.getBlockNumber();
            
            // Store contract info
            this.monitoredContracts.set(contractAddress, {
                contract,
                abi: contractABI,
                eventNames,
                addedAt: Date.now()
            });
            
            this.eventFilters.set(contractAddress, filters);
            this.lastProcessedBlocks.set(contractAddress, currentBlock);
            
            console.log(`✅ Contract ${contractAddress} added for monitoring`);
            
            return {
                success: true,
                contractAddress,
                eventNames,
                currentBlock
            };
        } catch (error) {
            console.error(`❌ Failed to add contract ${contractAddress}:`, error);
            throw error;
        }
    }

    /**
     * Start real-time monitoring
     */
    async startMonitoring(pollInterval = 5000) {
        if (this.isMonitoring) {
            console.warn('⚠️ Monitoring already active');
            return { status: 'already_active' };
        }

        try {
            console.log(`👀 Starting real-time event monitoring (poll interval: ${pollInterval}ms)`);
            
            this.config.pollInterval = pollInterval;
            this.isMonitoring = true;
            
            // Start block polling
            this.blockPollingInterval = setInterval(async () => {
                try {
                    await this.pollForEvents();
                } catch (error) {
                    console.error('❌ Error during block polling:', error);
                    this.emit('error', error);
                }
            }, pollInterval);
            
            // Start event processing
            this.processingInterval = setInterval(async () => {
                try {
                    await this.processEventQueue();
                } catch (error) {
                    console.error('❌ Error during event processing:', error);
                    this.emit('error', error);
                }
            }, 1000); // Process queue every second
            
            console.log('✅ Real-time monitoring started');
            this.emit('monitoring_started', { pollInterval });
            
            return {
                status: 'monitoring_started',
                pollInterval,
                monitoredContracts: Array.from(this.monitoredContracts.keys())
            };
        } catch (error) {
            console.error('❌ Failed to start monitoring:', error);
            throw error;
        }
    }

    /**
     * Poll for new events across all monitored contracts
     */
    async pollForEvents() {
        if (!this.isMonitoring) return;

        try {
            const currentBlock = await this.web3Provider.getBlockNumber();
            
            for (const [contractAddress, contractInfo] of this.monitoredContracts) {
                await this.pollContractEvents(contractAddress, contractInfo, currentBlock);
            }
            
            // Update uptime
            this.stats.uptime = Date.now() - this.stats.startTime;
        } catch (error) {
            console.error('❌ Error polling for events:', error);
            throw error;
        }
    }

    /**
     * Poll events for a specific contract
     */
    async pollContractEvents(contractAddress, contractInfo, currentBlock) {
        try {
            const lastProcessedBlock = this.lastProcessedBlocks.get(contractAddress);
            const fromBlock = lastProcessedBlock + 1;

            if (fromBlock > currentBlock) {
                return; // No new blocks
            }

            const filters = this.eventFilters.get(contractAddress);
            const { contract } = contractInfo;

            // Get events for each filter
            for (const [eventName, filter] of Object.entries(filters)) {
                try {
                    const events = await contract.queryFilter(filter, fromBlock, currentBlock);
                    
                    if (events.length > 0) {
                        console.log(`📊 Found ${events.length} ${eventName} events from contract ${contractAddress}`);
                        
                        // Add events to processing queue
                        for (const event of events) {
                            const eventData = await this.parseEvent(event, eventName, contractAddress);
                            this.processingQueue.push(eventData);
                            
                            this.emit('event_detected', eventData);
                        }
                    }
                } catch (eventError) {
                    console.error(`❌ Error querying ${eventName} events:`, eventError);
                }
            }

            // Update last processed block for this contract
            this.lastProcessedBlocks.set(contractAddress, currentBlock);
            
        } catch (error) {
            console.error(`❌ Error polling events for contract ${contractAddress}:`, error);
        }
    }

    /**
     * Parse event data
     */
    async parseEvent(event, eventName, contractAddress) {
        try {
            const receipt = await this.web3Provider.getTransactionReceipt(event.transactionHash);
            const block = await this.web3Provider.getBlock(event.blockNumber);
            
            const eventData = {
                // Event identification
                eventName,
                contractAddress,
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber,
                blockTimestamp: block.timestamp,
                logIndex: event.logIndex,
                
                // Event arguments (varies by event type)
                args: {},
                
                // Transaction details
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: receipt.effectiveGasPrice?.toString() || '0',
                
                // Processing metadata
                detectedAt: Date.now(),
                status: 'pending',
                retryCount: 0
            };

            // Parse event arguments based on event type
            if (eventName === 'AIRebalance' && event.args) {
                eventData.args = {
                    agent: event.args.agent,
                    timestamp: event.args.timestamp.toString(),
                    decisionCid: event.args.decisionCid,
                    fromStrategy: event.args.fromStrategy.toString(),
                    toStrategy: event.args.toStrategy.toString(),
                    amount: event.args.amount.toString()
                };
            } else {
                // Generic argument parsing
                if (event.args) {
                    for (let i = 0; i < event.args.length; i++) {
                        const value = event.args[i];
                        eventData.args[`arg${i}`] = typeof value === 'bigint' ? value.toString() : value;
                    }
                }
            }
            
            return eventData;
        } catch (error) {
            console.error('❌ Error parsing event:', error);
            throw error;
        }
    }

    /**
     * Process event queue
     */
    async processEventQueue() {
        if (this.processingQueue.length === 0) return;

        console.log(`🔄 Processing ${this.processingQueue.length} queued events`);

        const eventsToProcess = this.processingQueue.splice(0, this.config.batchSize);

        for (const eventData of eventsToProcess) {
            try {
                await this.processEvent(eventData);
                this.stats.totalEventsProcessed++;
                this.stats.lastEventTimestamp = Date.now();
                
                this.emit('event_processed', eventData);
            } catch (error) {
                console.error(`❌ Failed to process event ${eventData.transactionHash}:`, error);
                
                // Retry logic
                eventData.retryCount++;
                if (eventData.retryCount < this.config.maxRetries) {
                    console.log(`🔄 Retrying event ${eventData.transactionHash} (attempt ${eventData.retryCount + 1})`);
                    setTimeout(() => {
                        this.processingQueue.push(eventData);
                    }, this.config.retryDelay * eventData.retryCount);
                } else {
                    console.error(`❌ Max retries exceeded for event ${eventData.transactionHash}`);
                    this.stats.failedSubmissions++;
                    this.emit('event_failed', eventData, error);
                }
            }
        }
    }

    /**
     * Process individual event
     */
    async processEvent(eventData) {
        try {
            console.log(`📝 Processing ${eventData.eventName} event: ${eventData.transactionHash}`);

            // Prepare decision data for Hedera logging
            const decisionData = {
                // Core event identification
                txHash: eventData.transactionHash,
                blockNumber: eventData.blockNumber,
                logIndex: eventData.logIndex,
                
                // Event details
                type: eventData.eventName.toLowerCase(),
                contractAddress: eventData.contractAddress,
                
                // Timing information
                blockTimestamp: eventData.blockTimestamp,
                detectedAt: eventData.detectedAt,
                
                // Network information
                chainId: await this.web3Provider.getNetwork().then(n => n.chainId.toString()),
                gasUsed: eventData.gasUsed,
                gasPrice: eventData.gasPrice
            };

            // Add event-specific data
            if (eventData.eventName === 'AIRebalance' && eventData.args) {
                decisionData.agent = eventData.args.agent;
                decisionData.decisionId = eventData.args.decisionCid;
                decisionData.timestamp = eventData.args.timestamp;
                decisionData.decisionCid = eventData.args.decisionCid;
                decisionData.fromStrategy = eventData.args.fromStrategy;
                decisionData.toStrategy = eventData.args.toStrategy;
                decisionData.amount = eventData.args.amount;
                decisionData.reason = 'AI-driven yield optimization';
            }

            // Add model metadata reference if available
            if (this.modelMetadataManager) {
                try {
                    const modelReference = this.modelMetadataManager.getModelReferenceForHCS();
                    if (modelReference) {
                        decisionData.hfsFileId = modelReference.hfsFileId;
                        decisionData.modelVersion = modelReference.version;
                        decisionData.modelChecksum = modelReference.checksum;
                    }
                } catch (modelError) {
                    console.warn('⚠️ Could not get model reference:', modelError.message);
                }
            }

            // Submit to Hedera HCS
            let hcsResult = null;
            if (this.hederaService) {
                try {
                    hcsResult = await this.hederaService.submitDecisionWithRetry(decisionData, 2, 500);
                    this.stats.successfulSubmissions++;
                    console.log(`✅ Event logged to HCS: ${hcsResult.sequenceNumber}`);
                } catch (hcsError) {
                    console.error('❌ Failed to log to HCS:', hcsError.message);
                    this.stats.failedSubmissions++;
                    throw hcsError;
                }
            }

            // Log through AI Decision Logger if available
            if (this.aiDecisionLogger && eventData.eventName === 'AIRebalance') {
                try {
                    await this.aiDecisionLogger.submitEventToHCS(eventData);
                } catch (loggerError) {
                    console.warn('⚠️ AI Decision Logger failed:', loggerError.message);
                }
            }

            eventData.status = 'completed';
            eventData.hcsResult = hcsResult;
            eventData.processedAt = Date.now();

            return {
                success: true,
                eventData,
                hcsResult
            };
        } catch (error) {
            eventData.status = 'failed';
            eventData.error = error.message;
            throw error;
        }
    }

    /**
     * Stop monitoring
     */
    async stopMonitoring() {
        try {
            console.log('⏹️ Stopping real-time event monitoring...');
            
            this.isMonitoring = false;
            
            // Clear intervals
            if (this.blockPollingInterval) {
                clearInterval(this.blockPollingInterval);
                this.blockPollingInterval = null;
            }
            
            if (this.processingInterval) {
                clearInterval(this.processingInterval);
                this.processingInterval = null;
            }
            
            // Process remaining events
            if (this.processingQueue.length > 0) {
                console.log(`🔄 Processing ${this.processingQueue.length} remaining events...`);
                await this.processEventQueue();
            }
            
            console.log('✅ Real-time monitoring stopped');
            this.emit('monitoring_stopped');
            
            return {
                status: 'monitoring_stopped',
                finalStats: this.getStatistics()
            };
        } catch (error) {
            console.error('❌ Error stopping monitoring:', error);
            throw error;
        }
    }

    /**
     * Get monitoring statistics
     */
    getStatistics() {
        return {
            isMonitoring: this.isMonitoring,
            monitoredContracts: Array.from(this.monitoredContracts.keys()),
            totalEventsProcessed: this.stats.totalEventsProcessed,
            successfulSubmissions: this.stats.successfulSubmissions,
            failedSubmissions: this.stats.failedSubmissions,
            queuedEvents: this.processingQueue.length,
            lastEventTimestamp: this.stats.lastEventTimestamp,
            uptime: this.stats.uptime,
            config: this.config
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        const health = {
            timestamp: Date.now(),
            status: 'healthy',
            issues: []
        };

        try {
            // Check Web3 provider
            try {
                await this.web3Provider.getBlockNumber();
            } catch (web3Error) {
                health.issues.push(`Web3 provider error: ${web3Error.message}`);
                health.status = 'degraded';
            }

            // Check Hedera service
            if (this.hederaService) {
                try {
                    const hederaHealth = await this.hederaService.healthCheck();
                    if (hederaHealth.errors.length > 0) {
                        health.issues.push(...hederaHealth.errors);
                        health.status = 'degraded';
                    }
                } catch (hederaError) {
                    health.issues.push(`Hedera service error: ${hederaError.message}`);
                    health.status = 'degraded';
                }
            }

            // Check monitoring status
            if (!this.isMonitoring) {
                health.issues.push('Event monitoring not active');
            }

            // Check queue size
            if (this.processingQueue.length > 100) {
                health.issues.push(`Large processing queue: ${this.processingQueue.length} events`);
                health.status = 'degraded';
            }

            // Check error rate
            const totalSubmissions = this.stats.successfulSubmissions + this.stats.failedSubmissions;
            if (totalSubmissions > 0) {
                const errorRate = this.stats.failedSubmissions / totalSubmissions;
                if (errorRate > 0.1) { // More than 10% error rate
                    health.issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
                    health.status = 'degraded';
                }
            }

            if (health.issues.length > 3) {
                health.status = 'unhealthy';
            }

        } catch (error) {
            health.status = 'unhealthy';
            health.issues.push(`Health check failed: ${error.message}`);
        }

        return health;
    }

    /**
     * Close and cleanup
     */
    async close() {
        try {
            await this.stopMonitoring();
            this.removeAllListeners();
            console.log('✅ Real-time Event Monitor closed');
        } catch (error) {
            console.error('❌ Error closing Real-time Event Monitor:', error);
        }
    }
}

export default RealTimeEventMonitor;