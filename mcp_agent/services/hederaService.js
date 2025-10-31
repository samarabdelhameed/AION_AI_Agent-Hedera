import {
    Client,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    FileCreateTransaction,
    FileAppendTransaction,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import HederaErrorHandler from './hederaErrorHandler.js';

class HederaService {
    constructor() {
        this.client = null;
        this.topicId = null;
        this.fileId = null;
        this.initialized = false;
        this.errorHandler = new HederaErrorHandler();
    }

    /**
     * Initialize Hedera client with testnet configuration
     */
    async initialize() {
        try {
            // Initialize error handler
            this.errorHandler.initialize();
            
            // Configure client for testnet
            this.client = Client.forTestnet();
            
            // Set operator account (will be configured from environment)
            const accountId = process.env.HEDERA_ACCOUNT_ID || "0.0.123456";
            const privateKey = process.env.HEDERA_PRIVATE_KEY || "302e020100300506032b657004220420...";
            
            this.client.setOperator(
                AccountId.fromString(accountId),
                PrivateKey.fromString(privateKey)
            );

            // Set default max transaction fee
            this.client.setDefaultMaxTransactionFee(new Hbar(100));
            this.client.setDefaultMaxQueryPayment(new Hbar(50));

            this.initialized = true;
            this.initTimestamp = Date.now();
            console.log('✅ Hedera service initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Hedera service:', error);
            return false;
        }
    }

    /**
     * Create HCS topic for AI decision logging
     */
    async createHCSTopic(memo = "AION AI Decision Log") {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        return await this.errorHandler.executeWithRetry('hcs_create_topic', async () => {
            const transaction = new TopicCreateTransaction()
                .setTopicMemo(memo)
                .setMaxTransactionFee(new Hbar(2));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            this.topicId = receipt.topicId;
            console.log(`✅ HCS Topic created: ${this.topicId}`);
            
            return this.topicId.toString();
        }, { memo });
    }

    /**
     * Submit AI decision to HCS with enhanced metadata
     */
    async submitDecisionToHCS(decisionData, topicId = null) {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        const targetTopicId = topicId || this.topicId;
        if (!targetTopicId) {
            throw new Error('No HCS topic ID available');
        }

        return await this.errorHandler.executeWithRetry('hcs_submit', async () => {
            // Enhanced message structure with comprehensive metadata
            const message = JSON.stringify({
                // Core event data
                timestamp: Date.now(),
                txHash: decisionData.txHash,
                blockNumber: decisionData.blockNumber,
                logIndex: decisionData.logIndex,
                
                // Decision details
                decision: {
                    id: decisionData.decisionId,
                    type: decisionData.type || 'rebalance',
                    agent: decisionData.agent,
                    fromStrategy: decisionData.fromStrategy,
                    toStrategy: decisionData.toStrategy,
                    amount: decisionData.amount,
                    reason: decisionData.reason || 'AI-driven optimization',
                    decisionCid: decisionData.decisionCid
                },
                
                // Model information
                modelVersion: {
                    hash: decisionData.modelHash,
                    version: decisionData.modelVersion || 'v1.0.0',
                    hfsFileId: decisionData.hfsFileId,
                    trainingTimestamp: decisionData.modelTrainingTime
                },
                
                // Performance metrics
                performance: {
                    expectedYield: decisionData.expectedYield,
                    riskScore: decisionData.riskScore,
                    confidence: decisionData.confidence,
                    backtestResults: decisionData.backtestResults
                },
                
                // Network information
                network: {
                    chainId: decisionData.chainId || 'hedera-testnet',
                    contractAddress: decisionData.contractAddress,
                    gasUsed: decisionData.gasUsed
                },
                
                // Verification data
                verification: {
                    messageHash: this._generateMessageHash(decisionData),
                    signature: decisionData.signature,
                    nonce: Date.now()
                }
            });

            const transaction = new TopicMessageSubmitTransaction()
                .setTopicId(targetTopicId)
                .setMessage(message)
                .setMaxTransactionFee(new Hbar(2));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            console.log(`✅ Enhanced decision submitted to HCS: ${receipt.topicSequenceNumber}`);
            
            return {
                topicId: targetTopicId.toString(),
                sequenceNumber: receipt.topicSequenceNumber.toString(),
                transactionId: txResponse.transactionId.toString(),
                messageSize: message.length,
                timestamp: Date.now()
            };
        }, { decisionData, topicId: targetTopicId.toString() });
    }

    /**
     * Generate message hash for verification
     */
    _generateMessageHash(decisionData) {
        const crypto = require('crypto');
        const hashInput = `${decisionData.txHash}-${decisionData.timestamp}-${decisionData.amount}`;
        return crypto.createHash('sha256').update(hashInput).digest('hex');
    }

    /**
     * Submit model update to HFS with versioning
     */
    async submitModelUpdate(modelData, previousFileId = null) {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        return await this.errorHandler.executeWithRetry('hfs_store', async () => {
            const modelMetadata = {
                // Version information
                version: modelData.version || 'v1.0.0',
                previousVersion: modelData.previousVersion,
                previousFileId: previousFileId,
                
                // Model details
                architecture: modelData.architecture || 'neural_network',
                parameters: modelData.parameters || {},
                
                // Training information
                trainingData: {
                    startDate: modelData.trainingStartDate,
                    endDate: modelData.trainingEndDate,
                    samples: modelData.trainingSamples,
                    features: modelData.features,
                    dataHash: modelData.dataHash
                },
                
                // Performance metrics
                performance: {
                    accuracy: modelData.accuracy,
                    precision: modelData.precision,
                    recall: modelData.recall,
                    f1Score: modelData.f1Score,
                    auc: modelData.auc,
                    backtestReturn: modelData.backtestReturn,
                    sharpeRatio: modelData.sharpeRatio,
                    maxDrawdown: modelData.maxDrawdown
                },
                
                // Hyperparameters
                hyperparameters: {
                    learningRate: modelData.learningRate,
                    epochs: modelData.epochs,
                    batchSize: modelData.batchSize,
                    optimizer: modelData.optimizer,
                    lossFunction: modelData.lossFunction
                },
                
                // Validation
                validation: {
                    crossValidationScore: modelData.cvScore,
                    validationMethod: modelData.validationMethod,
                    testSetSize: modelData.testSetSize
                },
                
                // Metadata
                timestamp: Date.now(),
                checksum: this._generateModelChecksum(modelData),
                creator: modelData.creator || 'AION_AI_Agent',
                environment: modelData.environment || 'production'
            };

            const content = JSON.stringify(modelMetadata, null, 2);
            
            const transaction = new FileCreateTransaction()
                .setContents(content)
                .setMaxTransactionFee(new Hbar(5));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            this.fileId = receipt.fileId;
            console.log(`✅ Model metadata stored on HFS: ${this.fileId}`);
            
            return {
                fileId: this.fileId.toString(),
                version: modelMetadata.version,
                checksum: modelMetadata.checksum,
                size: content.length,
                timestamp: modelMetadata.timestamp
            };
        }, { modelData, previousFileId });
    }

    /**
     * Generate model checksum for integrity verification
     */
    _generateModelChecksum(modelData) {
        const crypto = require('crypto');
        const checksumInput = JSON.stringify({
            version: modelData.version,
            parameters: modelData.parameters,
            architecture: modelData.architecture,
            performance: modelData.performance
        });
        return crypto.createHash('sha256').update(checksumInput).digest('hex');
    }

    /**
     * Store model metadata on HFS
     */
    async storeModelMetadata(metadata) {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        try {
            const content = JSON.stringify({
                version: metadata.version,
                checksum: metadata.checksum,
                trainingData: {
                    startDate: metadata.trainingStartDate,
                    endDate: metadata.trainingEndDate,
                    samples: metadata.trainingSamples
                },
                performance: {
                    accuracy: metadata.accuracy,
                    precision: metadata.precision,
                    recall: metadata.recall
                },
                parameters: {
                    learningRate: metadata.learningRate,
                    epochs: metadata.epochs,
                    batchSize: metadata.batchSize
                },
                timestamp: Date.now()
            });

            const transaction = new FileCreateTransaction()
                .setContents(content)
                .setMaxTransactionFee(new Hbar(2));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            this.fileId = receipt.fileId;
            console.log(`✅ Model metadata stored on HFS: ${this.fileId}`);
            
            return this.fileId.toString();
        } catch (error) {
            console.error('❌ Failed to store model metadata on HFS:', error);
            throw error;
        }
    }

    /**
     * Retrieve model metadata from HFS
     */
    async retrieveModelMetadata(fileId) {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        try {
            // Note: File retrieval requires FileContentsQuery which is not implemented here
            // This would be implemented in a production environment
            console.log(`📁 Retrieving model metadata from HFS: ${fileId}`);
            
            return {
                fileId: fileId,
                status: 'retrieved',
                // In production, this would contain the actual file contents
                placeholder: 'File contents would be retrieved here'
            };
        } catch (error) {
            console.error('❌ Failed to retrieve model metadata from HFS:', error);
            throw error;
        }
    }

    /**
     * Monitor vault events and process them
     */
    async monitorVaultEvents(contractAddress, web3Provider, eventHandler) {
        console.log(`👀 Starting vault event monitoring for: ${contractAddress}`);
        
        if (!web3Provider) {
            console.warn('⚠️ No Web3 provider available for event monitoring');
            return {
                status: 'monitoring_disabled',
                reason: 'no_web3_provider',
                contractAddress: contractAddress
            };
        }

        try {
            // Set up event monitoring for AIRebalance events
            const eventFilter = {
                address: contractAddress,
                topics: [
                    // AIRebalance event signature
                    web3Provider.utils.keccak256('AIRebalance(address,uint256,uint256,string,uint256,uint256,uint256)')
                ]
            };

            // Store monitoring configuration
            this.monitoringConfig = {
                contractAddress,
                eventFilter,
                eventHandler,
                isActive: true,
                lastProcessedBlock: await web3Provider.eth.getBlockNumber()
            };

            console.log(`✅ Event monitoring configured for contract: ${contractAddress}`);
            
            return {
                status: 'monitoring_active',
                contractAddress: contractAddress,
                services: {
                    hcs: this.topicId?.toString() || 'not_created',
                    hfs: this.fileId?.toString() || 'not_created'
                },
                lastProcessedBlock: this.monitoringConfig.lastProcessedBlock
            };
        } catch (error) {
            console.error('❌ Failed to set up event monitoring:', error);
            return {
                status: 'monitoring_failed',
                error: error.message,
                contractAddress: contractAddress
            };
        }
    }

    /**
     * Process vault events and submit to HCS
     */
    async processVaultEvent(eventData) {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        try {
            console.log('📝 Processing vault event:', eventData);

            // Extract event data
            const {
                transactionHash,
                blockNumber,
                logIndex,
                returnValues
            } = eventData;

            // Create decision data from event
            const decisionData = {
                txHash: transactionHash,
                blockNumber: blockNumber,
                logIndex: logIndex,
                type: 'ai_rebalance',
                agent: returnValues.agent,
                decisionId: returnValues.decisionId,
                timestamp: returnValues.timestamp,
                decisionCid: returnValues.decisionCid,
                fromStrategy: returnValues.fromStrategy,
                toStrategy: returnValues.toStrategy,
                amount: returnValues.amount
            };

            // Submit to HCS
            const hcsResult = await this.submitDecisionToHCS(decisionData);
            
            console.log(`✅ Event processed and submitted to HCS: ${hcsResult.sequenceNumber}`);
            
            return {
                success: true,
                hcsResult: hcsResult,
                eventData: decisionData
            };
        } catch (error) {
            console.error('❌ Failed to process vault event:', error);
            throw error;
        }
    }

    /**
     * Start continuous event monitoring
     */
    async startEventMonitoring(web3Provider, pollInterval = 5000) {
        if (!this.monitoringConfig || !this.monitoringConfig.isActive) {
            throw new Error('Event monitoring not configured');
        }

        console.log(`🔄 Starting continuous event monitoring (poll interval: ${pollInterval}ms)`);

        this.monitoringInterval = setInterval(async () => {
            try {
                await this.pollForEvents(web3Provider);
            } catch (error) {
                console.error('❌ Error during event polling:', error);
            }
        }, pollInterval);

        return {
            status: 'monitoring_started',
            pollInterval: pollInterval,
            contractAddress: this.monitoringConfig.contractAddress
        };
    }

    /**
     * Poll for new events
     */
    async pollForEvents(web3Provider) {
        if (!this.monitoringConfig) return;

        try {
            const currentBlock = await web3Provider.eth.getBlockNumber();
            const fromBlock = this.monitoringConfig.lastProcessedBlock + 1;

            if (fromBlock > currentBlock) return; // No new blocks

            // Get events from the range
            const events = await web3Provider.eth.getPastLogs({
                ...this.monitoringConfig.eventFilter,
                fromBlock: fromBlock,
                toBlock: currentBlock
            });

            // Process each event
            for (const event of events) {
                try {
                    await this.processVaultEvent(event);
                    
                    // Call external event handler if provided
                    if (this.monitoringConfig.eventHandler) {
                        await this.monitoringConfig.eventHandler(event);
                    }
                } catch (error) {
                    console.error('❌ Failed to process individual event:', error);
                }
            }

            // Update last processed block
            this.monitoringConfig.lastProcessedBlock = currentBlock;
            
            if (events.length > 0) {
                console.log(`📊 Processed ${events.length} events up to block ${currentBlock}`);
            }
        } catch (error) {
            console.error('❌ Error polling for events:', error);
        }
    }

    /**
     * Stop event monitoring
     */
    stopEventMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            
            if (this.monitoringConfig) {
                this.monitoringConfig.isActive = false;
            }
            
            console.log('⏹️ Event monitoring stopped');
            return { status: 'monitoring_stopped' };
        }
        
        return { status: 'monitoring_not_active' };
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            client: this.client ? 'connected' : 'disconnected',
            network: 'testnet',
            topicId: this.topicId?.toString() || null,
            fileId: this.fileId?.toString() || null,
            errorHandler: this.errorHandler ? this.errorHandler.getStatistics() : null
        };
    }

    /**
     * Get error handler statistics
     */
    getErrorHandlerStats() {
        return this.errorHandler ? this.errorHandler.getStatistics() : null;
    }

    /**
     * Reset circuit breaker for specific service
     */
    resetCircuitBreaker(serviceName) {
        if (this.errorHandler) {
            this.errorHandler.resetCircuitBreaker(serviceName);
        }
    }

    /**
     * Clear error handler queue
     */
    clearErrorQueue() {
        if (this.errorHandler) {
            return this.errorHandler.clearQueue();
        }
        return 0;
    }

    /**
     * Submit decision with retry mechanism
     */
    async submitDecisionWithRetry(decisionData, maxRetries = 3, retryDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📤 Submitting decision (attempt ${attempt}/${maxRetries})`);
                const result = await this.submitDecisionToHCS(decisionData);
                
                console.log(`✅ Decision submitted successfully on attempt ${attempt}`);
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await this._delay(delay);
                }
            }
        }
        
        console.error(`❌ All ${maxRetries} attempts failed. Last error:`, lastError);
        throw new Error(`Failed to submit decision after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Store model with retry mechanism
     */
    async storeModelWithRetry(modelData, maxRetries = 3, retryDelay = 2000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`💾 Storing model metadata (attempt ${attempt}/${maxRetries})`);
                const result = await this.submitModelUpdate(modelData);
                
                console.log(`✅ Model stored successfully on attempt ${attempt}`);
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Model storage attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = retryDelay * Math.pow(2, attempt - 1);
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await this._delay(delay);
                }
            }
        }
        
        console.error(`❌ All ${maxRetries} model storage attempts failed. Last error:`, lastError);
        throw new Error(`Failed to store model after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Health check for Hedera services
     */
    async healthCheck() {
        const health = {
            timestamp: Date.now(),
            client: false,
            network: 'unknown',
            hcs: false,
            hfs: false,
            balance: null,
            errors: []
        };

        try {
            // Check client connection
            if (this.client && this.initialized) {
                health.client = true;
                health.network = 'testnet';
                
                // Check account balance
                try {
                    const accountId = this.client.operatorAccountId;
                    if (accountId) {
                        const balance = await this.client.getAccountBalance(accountId);
                        health.balance = balance.hbars.toString();
                    }
                } catch (error) {
                    health.errors.push(`Balance check failed: ${error.message}`);
                }
                
                // Check HCS availability
                if (this.topicId) {
                    health.hcs = true;
                } else {
                    health.errors.push('HCS topic not created');
                }
                
                // Check HFS availability
                if (this.fileId) {
                    health.hfs = true;
                } else {
                    health.errors.push('HFS file not created');
                }
            } else {
                health.errors.push('Client not initialized');
            }
        } catch (error) {
            health.errors.push(`Health check failed: ${error.message}`);
        }

        return health;
    }

    /**
     * Get service statistics
     */
    getStatistics() {
        return {
            initialized: this.initialized,
            topicId: this.topicId?.toString() || null,
            fileId: this.fileId?.toString() || null,
            monitoringActive: this.monitoringConfig?.isActive || false,
            lastProcessedBlock: this.monitoringConfig?.lastProcessedBlock || null,
            contractAddress: this.monitoringConfig?.contractAddress || null,
            uptime: this.initialized ? Date.now() - this.initTimestamp : 0
        };
    }

    /**
     * Utility function for delays
     */
    async _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create HCS topic for bridge operations
     */
    async createHCSTopicForBridge() {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        try {
            const transaction = new TopicCreateTransaction()
                .setTopicMemo("AION Bridge Operations Audit Trail")
                .setMaxTransactionFee(new Hbar(2));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            const bridgeTopicId = receipt.topicId;
            console.log(`✅ Bridge HCS topic created: ${bridgeTopicId}`);
            
            return bridgeTopicId.toString();
        } catch (error) {
            console.error('❌ Failed to create bridge HCS topic:', error);
            throw error;
        }
    }

    /**
     * Submit message to specific HCS topic
     */
    async submitMessageToHCS(topicId, message) {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        try {
            const transaction = new TopicMessageSubmitTransaction()
                .setTopicId(topicId)
                .setMessage(message)
                .setMaxTransactionFee(new Hbar(1));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            console.log(`✅ Message submitted to HCS topic ${topicId}: ${receipt.topicSequenceNumber}`);
            
            return {
                topicId: topicId,
                sequenceNumber: receipt.topicSequenceNumber.toString(),
                transactionId: txResponse.transactionId.toString(),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`❌ Failed to submit message to HCS topic ${topicId}:`, error);
            throw error;
        }
    }

    /**
     * Get HCS messages from topic (mock implementation)
     */
    async getHCSMessages(topicId, limit = 10) {
        // Note: In production, this would use the Mirror Node API
        // to retrieve messages from the HCS topic
        console.log(`📥 Retrieving messages from HCS topic ${topicId} (limit: ${limit})`);
        
        return {
            topicId: topicId,
            messages: [], // Would contain actual messages in production
            status: 'mock_implementation',
            note: 'Use Mirror Node API for actual message retrieval'
        };
    }

    /**
     * Monitor bridge events from contract
     */
    async monitorBridgeEvents(contractAddress, web3Provider, eventHandler) {
        console.log(`👀 Starting bridge event monitoring for: ${contractAddress}`);
        
        if (!web3Provider) {
            console.warn('⚠️ No Web3 provider available for bridge event monitoring');
            return {
                status: 'monitoring_disabled',
                reason: 'no_web3_provider',
                contractAddress: contractAddress
            };
        }

        try {
            // Set up event monitoring for bridge-related events
            const bridgeEventFilters = [
                {
                    name: 'BridgeDepositInitiated',
                    signature: web3Provider.utils.keccak256('BridgeDepositInitiated(bytes32,address,uint256,uint256)')
                },
                {
                    name: 'BridgeWithdrawInitiated', 
                    signature: web3Provider.utils.keccak256('BridgeWithdrawInitiated(bytes32,address,uint256,uint256)')
                },
                {
                    name: 'BridgeOperationCompleted',
                    signature: web3Provider.utils.keccak256('BridgeOperationCompleted(bytes32,address,uint256,bool)')
                },
                {
                    name: 'CrossChainSharesIssued',
                    signature: web3Provider.utils.keccak256('CrossChainSharesIssued(address,uint256,uint256,bytes32)')
                },
                {
                    name: 'CrossChainSharesRedeemed',
                    signature: web3Provider.utils.keccak256('CrossChainSharesRedeemed(address,uint256,uint256,bytes32)')
                }
            ];

            // Store bridge monitoring configuration
            this.bridgeMonitoringConfig = {
                contractAddress,
                eventFilters: bridgeEventFilters,
                eventHandler,
                isActive: true,
                lastProcessedBlock: await web3Provider.eth.getBlockNumber()
            };

            console.log(`✅ Bridge event monitoring configured for contract: ${contractAddress}`);
            
            return {
                status: 'bridge_monitoring_active',
                contractAddress: contractAddress,
                eventTypes: bridgeEventFilters.map(f => f.name),
                lastProcessedBlock: this.bridgeMonitoringConfig.lastProcessedBlock
            };
        } catch (error) {
            console.error('❌ Failed to set up bridge event monitoring:', error);
            return {
                status: 'bridge_monitoring_failed',
                error: error.message,
                contractAddress: contractAddress
            };
        }
    }

    /**
     * Process bridge events and submit to HCS
     */
    async processBridgeEvent(eventData, bridgeTopicId) {
        if (!this.initialized) {
            throw new Error('Hedera service not initialized');
        }

        try {
            console.log('📝 Processing bridge event:', eventData);

            // Extract event data
            const {
                transactionHash,
                blockNumber,
                logIndex,
                returnValues,
                event
            } = eventData;

            // Create bridge operation data from event
            const bridgeOperationData = {
                eventType: event,
                txHash: transactionHash,
                blockNumber: blockNumber,
                logIndex: logIndex,
                timestamp: Date.now(),
                ...returnValues
            };

            // Submit to bridge HCS topic
            const hcsResult = await this.submitMessageToHCS(
                bridgeTopicId,
                JSON.stringify(bridgeOperationData)
            );
            
            console.log(`✅ Bridge event processed and submitted to HCS: ${hcsResult.sequenceNumber}`);
            
            return {
                success: true,
                hcsResult: hcsResult,
                eventData: bridgeOperationData
            };
        } catch (error) {
            console.error('❌ Failed to process bridge event:', error);
            throw error;
        }
    }

    /**
     * Start continuous bridge event monitoring
     */
    async startBridgeEventMonitoring(web3Provider, bridgeTopicId, pollInterval = 5000) {
        if (!this.bridgeMonitoringConfig || !this.bridgeMonitoringConfig.isActive) {
            throw new Error('Bridge event monitoring not configured');
        }

        console.log(`🔄 Starting continuous bridge event monitoring (poll interval: ${pollInterval}ms)`);

        this.bridgeMonitoringInterval = setInterval(async () => {
            try {
                await this.pollForBridgeEvents(web3Provider, bridgeTopicId);
            } catch (error) {
                console.error('❌ Error during bridge event polling:', error);
            }
        }, pollInterval);

        return {
            status: 'bridge_monitoring_started',
            pollInterval: pollInterval,
            contractAddress: this.bridgeMonitoringConfig.contractAddress,
            bridgeTopicId: bridgeTopicId
        };
    }

    /**
     * Poll for new bridge events
     */
    async pollForBridgeEvents(web3Provider, bridgeTopicId) {
        if (!this.bridgeMonitoringConfig) return;

        try {
            const currentBlock = await web3Provider.eth.getBlockNumber();
            const fromBlock = this.bridgeMonitoringConfig.lastProcessedBlock + 1;

            if (fromBlock > currentBlock) return; // No new blocks

            // Get events for each bridge event type
            for (const eventFilter of this.bridgeMonitoringConfig.eventFilters) {
                const events = await web3Provider.eth.getPastLogs({
                    address: this.bridgeMonitoringConfig.contractAddress,
                    topics: [eventFilter.signature],
                    fromBlock: fromBlock,
                    toBlock: currentBlock
                });

                // Process each event
                for (const event of events) {
                    try {
                        // Add event name to event data
                        event.event = eventFilter.name;
                        
                        await this.processBridgeEvent(event, bridgeTopicId);
                        
                        // Call external event handler if provided
                        if (this.bridgeMonitoringConfig.eventHandler) {
                            await this.bridgeMonitoringConfig.eventHandler(event);
                        }
                    } catch (error) {
                        console.error('❌ Failed to process individual bridge event:', error);
                    }
                }
            }

            // Update last processed block
            this.bridgeMonitoringConfig.lastProcessedBlock = currentBlock;
            
        } catch (error) {
            console.error('❌ Error polling for bridge events:', error);
        }
    }

    /**
     * Stop bridge event monitoring
     */
    stopBridgeEventMonitoring() {
        if (this.bridgeMonitoringInterval) {
            clearInterval(this.bridgeMonitoringInterval);
            this.bridgeMonitoringInterval = null;
            
            if (this.bridgeMonitoringConfig) {
                this.bridgeMonitoringConfig.isActive = false;
            }
            
            console.log('⏹️ Bridge event monitoring stopped');
            return { status: 'bridge_monitoring_stopped' };
        }
        
        return { status: 'bridge_monitoring_not_active' };
    }

    /**
     * Verify cross-chain message integrity
     */
    async verifyCrossChainMessage(messageData, expectedHash) {
        try {
            const crypto = require('crypto');
            const messageString = JSON.stringify(messageData, Object.keys(messageData).sort());
            const actualHash = crypto.createHash('sha256').update(messageString).digest('hex');
            
            const isValid = actualHash === expectedHash;
            
            console.log(`🔍 Cross-chain message verification: ${isValid ? 'VALID' : 'INVALID'}`);
            
            return {
                valid: isValid,
                expectedHash: expectedHash,
                actualHash: actualHash,
                messageData: messageData
            };
        } catch (error) {
            console.error('❌ Failed to verify cross-chain message:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Get bridge monitoring statistics
     */
    getBridgeMonitoringStats() {
        return {
            active: this.bridgeMonitoringConfig?.isActive || false,
            contractAddress: this.bridgeMonitoringConfig?.contractAddress || null,
            lastProcessedBlock: this.bridgeMonitoringConfig?.lastProcessedBlock || null,
            eventTypes: this.bridgeMonitoringConfig?.eventFilters?.map(f => f.name) || [],
            monitoringInterval: this.bridgeMonitoringInterval ? 'active' : 'inactive'
        };
    }

    /**
     * Close client connection and cleanup
     */
    async close() {
        try {
            // Stop event monitoring
            this.stopEventMonitoring();
            this.stopBridgeEventMonitoring();
            
            // Close error handler
            if (this.errorHandler) {
                await this.errorHandler.close();
            }
            
            // Close client connection
            if (this.client) {
                this.client.close();
                this.initialized = false;
                console.log('✅ Hedera service closed');
            }
            
            // Clear monitoring configuration
            this.monitoringConfig = null;
            this.bridgeMonitoringConfig = null;
            this.topicId = null;
            this.fileId = null;
            
        } catch (error) {
            console.error('❌ Error during service cleanup:', error);
        }
    }
}

export default HederaService;de
ra services initialized successfully');\n    }\n    \n    // ========== HCS (Hedera Consensus Service) Operations ==========\n    \n    /**\n     * Create a new HCS topic\n     * @param {string} memo - Topic description\n     * @returns {Promise<string>} Topic ID\n     */\n    async createHCSTopic(memo) {\n        try {\n            const transaction = new TopicCreateTransaction()\n                .setTopicMemo(memo)\n                .setMaxTransactionFee(new Hbar(2));\n            \n            const response = await transaction.execute(this.client);\n            const receipt = await response.getReceipt(this.client);\n            \n            const topicId = receipt.topicId.toString();\n            console.log(`📝 Created HCS topic: ${topicId}`);\n            \n            this.updateMetrics('createTopic', true);\n            return topicId;\n            \n        } catch (error) {\n            console.error('❌ Failed to create HCS topic:', error);\n            this.updateMetrics('createTopic', false);\n            throw error;\n        }\n    }\n    \n    /**\n     * Submit message to HCS topic\n     * @param {string} topicId - Target topic ID\n     * @param {string|object} message - Message content\n     * @param {object} options - Additional options\n     * @returns {Promise<object>} Transaction result\n     */\n    async submitToHCS(topicId, message, options = {}) {\n        try {\n            const startTime = Date.now();\n            \n            // Prepare message\n            const messageContent = typeof message === 'string' ? message : JSON.stringify(message);\n            const messageBuffer = Buffer.from(messageContent, 'utf8');\n            \n            // Create transaction\n            const transaction = new TopicMessageSubmitTransaction()\n                .setTopicId(topicId)\n                .setMessage(messageBuffer)\n                .setMaxTransactionFee(new Hbar(2));\n            \n            // Execute with retry logic\n            const response = await this.executeWithRetry(async () => {\n                return await transaction.execute(this.client);\n            });\n            \n            const receipt = await response.getReceipt(this.client);\n            const responseTime = Date.now() - startTime;\n            \n            const result = {\n                success: true,\n                transactionId: response.transactionId.toString(),\n                topicId: topicId,\n                sequenceNumber: receipt.topicSequenceNumber,\n                runningHash: receipt.topicRunningHash,\n                consensusTimestamp: receipt.consensusTimestamp,\n                responseTime: responseTime,\n                messageSize: messageBuffer.length\n            };\n            \n            this.updateMetrics('hcsSubmit', true, responseTime);\n            this.emit('hcsMessage', result);\n            \n            console.log(`📤 HCS message submitted: ${result.transactionId}`);\n            return result;\n            \n        } catch (error) {\n            console.error('❌ Failed to submit HCS message:', error);\n            this.updateMetrics('hcsSubmit', false);\n            throw error;\n        }\n    }\n    \n    /**\n     * Submit batch messages to HCS\n     * @param {string} topicId - Target topic ID\n     * @param {Array} messages - Array of messages\n     * @returns {Promise<Array>} Array of results\n     */\n    async submitBatchToHCS(topicId, messages) {\n        try {\n            console.log(`📦 Submitting batch of ${messages.length} messages to HCS`);\n            \n            const results = [];\n            const batches = this.chunkArray(messages, this.config.batchSize);\n            \n            for (const batch of batches) {\n                const batchPromises = batch.map(message => \n                    this.submitToHCS(topicId, message)\n                );\n                \n                const batchResults = await Promise.allSettled(batchPromises);\n                \n                batchResults.forEach((result, index) => {\n                    if (result.status === 'fulfilled') {\n                        results.push(result.value);\n                    } else {\n                        console.error(`❌ Batch message ${index} failed:`, result.reason);\n                        results.push({ success: false, error: result.reason.message });\n                    }\n                });\n                \n                // Rate limiting between batches\n                if (batches.indexOf(batch) < batches.length - 1) {\n                    await this.delay(100);\n                }\n            }\n            \n            console.log(`✅ Batch submission completed: ${results.filter(r => r.success).length}/${messages.length} successful`);\n            return results;\n            \n        } catch (error) {\n            console.error('❌ Failed to submit batch to HCS:', error);\n            throw error;\n        }\n    }\n    \n    // ========== HTS (Hedera Token Service) Operations ==========\n    \n    /**\n     * Create a new HTS token\n     * @param {object} tokenConfig - Token configuration\n     * @returns {Promise<string>} Token ID\n     */\n    async createHTSToken(tokenConfig = {}) {\n        try {\n            const config = {\n                name: tokenConfig.name || this.config.htsTokenName,\n                symbol: tokenConfig.symbol || this.config.htsTokenSymbol,\n                decimals: tokenConfig.decimals || 18,\n                initialSupply: tokenConfig.initialSupply || 0,\n                maxSupply: tokenConfig.maxSupply || 1000000000,\n                treasuryAccountId: tokenConfig.treasuryAccountId || this.config.operatorId,\n                adminKey: tokenConfig.adminKey || this.config.operatorKey,\n                supplyKey: tokenConfig.supplyKey || this.config.operatorKey,\n                freezeDefault: tokenConfig.freezeDefault || false\n            };\n            \n            const transaction = new TokenCreateTransaction()\n                .setTokenName(config.name)\n                .setTokenSymbol(config.symbol)\n                .setDecimals(config.decimals)\n                .setInitialSupply(config.initialSupply)\n                .setMaxSupply(config.maxSupply)\n                .setTreasuryAccountId(AccountId.fromString(config.treasuryAccountId))\n                .setAdminKey(PrivateKey.fromString(config.adminKey))\n                .setSupplyKey(PrivateKey.fromString(config.supplyKey))\n                .setFreezeDefault(config.freezeDefault)\n                .setMaxTransactionFee(new Hbar(30));\n            \n            const response = await transaction.execute(this.client);\n            const receipt = await response.getReceipt(this.client);\n            \n            const tokenId = receipt.tokenId.toString();\n            console.log(`🪙 Created HTS token: ${tokenId}`);\n            \n            this.updateMetrics('createToken', true);\n            return tokenId;\n            \n        } catch (error) {\n            console.error('❌ Failed to create HTS token:', error);\n            this.updateMetrics('createToken', false);\n            throw error;\n        }\n    }\n    \n    /**\n     * Mint HTS tokens\n     * @param {string} tokenId - Token ID\n     * @param {number} amount - Amount to mint\n     * @param {object} metadata - Optional metadata\n     * @returns {Promise<object>} Transaction result\n     */\n    async mintHTSTokens(tokenId, amount, metadata = {}) {\n        try {\n            const transaction = new TokenMintTransaction()\n                .setTokenId(tokenId)\n                .setAmount(amount)\n                .setMaxTransactionFee(new Hbar(20));\n            \n            const response = await this.executeWithRetry(async () => {\n                return await transaction.execute(this.client);\n            });\n            \n            const receipt = await response.getReceipt(this.client);\n            \n            const result = {\n                success: true,\n                transactionId: response.transactionId.toString(),\n                tokenId: tokenId,\n                amount: amount,\n                newTotalSupply: receipt.totalSupply,\n                metadata: metadata\n            };\n            \n            // Log to HCS for audit trail\n            await this.submitToHCS(this.config.hcsAuditTopicId, {\n                action: 'TOKEN_MINT',\n                tokenId: tokenId,\n                amount: amount,\n                transactionId: result.transactionId,\n                timestamp: Date.now(),\n                metadata: metadata\n            });\n            \n            this.updateMetrics('mintTokens', true);\n            this.emit('tokenMinted', result);\n            \n            console.log(`🪙 Minted ${amount} tokens: ${result.transactionId}`);\n            return result;\n            \n        } catch (error) {\n            console.error('❌ Failed to mint HTS tokens:', error);\n            this.updateMetrics('mintTokens', false);\n            throw error;\n        }\n    }\n    \n    /**\n     * Burn HTS tokens\n     * @param {string} tokenId - Token ID\n     * @param {number} amount - Amount to burn\n     * @param {object} metadata - Optional metadata\n     * @returns {Promise<object>} Transaction result\n     */\n    async burnHTSTokens(tokenId, amount, metadata = {}) {\n        try {\n            const transaction = new TokenBurnTransaction()\n                .setTokenId(tokenId)\n                .setAmount(amount)\n                .setMaxTransactionFee(new Hbar(20));\n            \n            const response = await this.executeWithRetry(async () => {\n                return await transaction.execute(this.client);\n            });\n            \n            const receipt = await response.getReceipt(this.client);\n            \n            const result = {\n                success: true,\n                transactionId: response.transactionId.toString(),\n                tokenId: tokenId,\n                amount: amount,\n                newTotalSupply: receipt.totalSupply,\n                metadata: metadata\n            };\n            \n            // Log to HCS for audit trail\n            await this.submitToHCS(this.config.hcsAuditTopicId, {\n                action: 'TOKEN_BURN',\n                tokenId: tokenId,\n                amount: amount,\n                transactionId: result.transactionId,\n                timestamp: Date.now(),\n                metadata: metadata\n            });\n            \n            this.updateMetrics('burnTokens', true);\n            this.emit('tokenBurned', result);\n            \n            console.log(`🔥 Burned ${amount} tokens: ${result.transactionId}`);\n            return result;\n            \n        } catch (error) {\n            console.error('❌ Failed to burn HTS tokens:', error);\n            this.updateMetrics('burnTokens', false);\n            throw error;\n        }\n    }\n    \n    /**\n     * Transfer HTS tokens\n     * @param {string} tokenId - Token ID\n     * @param {string} fromAccountId - Sender account ID\n     * @param {string} toAccountId - Receiver account ID\n     * @param {number} amount - Amount to transfer\n     * @param {object} metadata - Optional metadata\n     * @returns {Promise<object>} Transaction result\n     */\n    async transferHTSTokens(tokenId, fromAccountId, toAccountId, amount, metadata = {}) {\n        try {\n            const transaction = new TokenTransferTransaction()\n                .addTokenTransfer(tokenId, AccountId.fromString(fromAccountId), -amount)\n                .addTokenTransfer(tokenId, AccountId.fromString(toAccountId), amount)\n                .setMaxTransactionFee(new Hbar(20));\n            \n            const response = await this.executeWithRetry(async () => {\n                return await transaction.execute(this.client);\n            });\n            \n            const receipt = await response.getReceipt(this.client);\n            \n            const result = {\n                success: true,\n                transactionId: response.transactionId.toString(),\n                tokenId: tokenId,\n                fromAccountId: fromAccountId,\n                toAccountId: toAccountId,\n                amount: amount,\n                metadata: metadata\n            };\n            \n            // Log to HCS for audit trail\n            await this.submitToHCS(this.config.hcsAuditTopicId, {\n                action: 'TOKEN_TRANSFER',\n                tokenId: tokenId,\n                fromAccountId: fromAccountId,\n                toAccountId: toAccountId,\n                amount: amount,\n                transactionId: result.transactionId,\n                timestamp: Date.now(),\n                metadata: metadata\n            });\n            \n            this.updateMetrics('transferTokens', true);\n            this.emit('tokenTransferred', result);\n            \n            console.log(`💸 Transferred ${amount} tokens: ${result.transactionId}`);\n            return result;\n            \n        } catch (error) {\n            console.error('❌ Failed to transfer HTS tokens:', error);\n            this.updateMetrics('transferTokens', false);\n            throw error;\n        }\n    }\n    \n    /**\n     * Associate account with HTS token\n     * @param {string} accountId - Account ID to associate\n     * @param {string} tokenId - Token ID\n     * @returns {Promise<object>} Transaction result\n     */\n    async associateHTSToken(accountId, tokenId) {\n        try {\n            const transaction = new TokenAssociateTransaction()\n                .setAccountId(AccountId.fromString(accountId))\n                .setTokenIds([tokenId])\n                .setMaxTransactionFee(new Hbar(20));\n            \n            const response = await this.executeWithRetry(async () => {\n                return await transaction.execute(this.client);\n            });\n            \n            const receipt = await response.getReceipt(this.client);\n            \n            const result = {\n                success: true,\n                transactionId: response.transactionId.toString(),\n                accountId: accountId,\n                tokenId: tokenId\n            };\n            \n            this.updateMetrics('associateToken', true);\n            console.log(`🔗 Associated account ${accountId} with token ${tokenId}`);\n            \n            return result;\n            \n        } catch (error) {\n            console.error('❌ Failed to associate HTS token:', error);\n            this.updateMetrics('associateToken', false);\n            throw error;\n        }\n    }\n    \n    // ========== HFS (Hedera File Service) Operations ==========\n    \n    /**\n     * Create file on HFS\n     * @param {Buffer|string} content - File content\n     * @param {object} options - File options\n     * @returns {Promise<string>} File ID\n     */\n    async createHFSFile(content, options = {}) {\n        try {\n            const fileContent = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');\n            \n            const transaction = new FileCreateTransaction()\n                .setContents(fileContent)\n                .setMaxTransactionFee(new Hbar(5));\n            \n            if (options.memo) {\n                transaction.setFileMemo(options.memo);\n            }\n            \n            const response = await this.executeWithRetry(async () => {\n                return await transaction.execute(this.client);\n            });\n            \n            const receipt = await response.getReceipt(this.client);\n            const fileId = receipt.fileId.toString();\n            \n            console.log(`📁 Created HFS file: ${fileId}`);\n            this.updateMetrics('createFile', true);\n            \n            return fileId;\n            \n        } catch (error) {\n            console.error('❌ Failed to create HFS file:', error);\n            this.updateMetrics('createFile', false);\n            throw error;\n        }\n    }\n    \n    /**\n     * Append content to HFS file\n     * @param {string} fileId - File ID\n     * @param {Buffer|string} content - Content to append\n     * @returns {Promise<object>} Transaction result\n     */\n    async appendToHFSFile(fileId, content) {\n        try {\n            const fileContent = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');\n            \n            const transaction = new FileAppendTransaction()\n                .setFileId(fileId)\n                .setContents(fileContent)\n                .setMaxTransactionFee(new Hbar(5));\n            \n            const response = await this.executeWithRetry(async () => {\n                return await transaction.execute(this.client);\n            });\n            \n            const receipt = await response.getReceipt(this.client);\n            \n            const result = {\n                success: true,\n                transactionId: response.transactionId.toString(),\n                fileId: fileId,\n                appendedSize: fileContent.length\n            };\n            \n            console.log(`📝 Appended to HFS file ${fileId}: ${result.transactionId}`);\n            this.updateMetrics('appendFile', true);\n            \n            return result;\n            \n        } catch (error) {\n            console.error('❌ Failed to append to HFS file:', error);\n            this.updateMetrics('appendFile', false);\n            throw error;\n        }\n    }\n    \n    // ========== Real-time Monitoring and Analytics ==========\n    \n    /**\n     * Start real-time monitoring\n     */\n    startRealTimeMonitoring() {\n        console.log('📊 Starting real-time monitoring...');\n        \n        // Performance monitoring\n        this.monitoringInterval = setInterval(() => {\n            this.collectPerformanceMetrics();\n        }, 30000); // Every 30 seconds\n        \n        // Health check monitoring\n        this.healthCheckInterval = setInterval(() => {\n            this.performHealthCheck();\n        }, 60000); // Every minute\n        \n        // Mirror node monitoring\n        this.startMirrorNodeMonitoring();\n    }\n    \n    /**\n     * Stop real-time monitoring\n     */\n    stopRealTimeMonitoring() {\n        if (this.monitoringInterval) {\n            clearInterval(this.monitoringInterval);\n            this.monitoringInterval = null;\n        }\n        \n        if (this.healthCheckInterval) {\n            clearInterval(this.healthCheckInterval);\n            this.healthCheckInterval = null;\n        }\n        \n        console.log('📊 Real-time monitoring stopped');\n    }\n    \n    /**\n     * Collect performance metrics\n     */\n    async collectPerformanceMetrics() {\n        try {\n            const currentTime = Date.now();\n            const timeDiff = currentTime - this.metrics.lastUpdateTime;\n            \n            // Calculate rates\n            const transactionRate = (this.metrics.totalTransactions / timeDiff) * 1000; // per second\n            const successRate = this.metrics.totalTransactions > 0 ? \n                (this.metrics.successfulTransactions / this.metrics.totalTransactions) * 100 : 0;\n            \n            const performanceData = {\n                timestamp: currentTime,\n                totalTransactions: this.metrics.totalTransactions,\n                successfulTransactions: this.metrics.successfulTransactions,\n                failedTransactions: this.metrics.failedTransactions,\n                transactionRate: transactionRate,\n                successRate: successRate,\n                averageResponseTime: this.metrics.averageResponseTime,\n                totalGasUsed: this.metrics.totalGasUsed,\n                cacheSize: this.cache.size,\n                activeSubscriptions: this.subscriptions.size\n            };\n            \n            this.emit('performanceMetrics', performanceData);\n            \n            // Log to HCS for historical tracking\n            await this.submitToHCS(this.config.hcsAuditTopicId, {\n                action: 'PERFORMANCE_METRICS',\n                data: performanceData,\n                timestamp: currentTime\n            });\n            \n        } catch (error) {\n            console.error('❌ Failed to collect performance metrics:', error);\n        }\n    }\n    \n    /**\n     * Perform health check\n     */\n    async performHealthCheck() {\n        try {\n            const healthData = {\n                timestamp: Date.now(),\n                isConnected: this.isConnected,\n                clientStatus: this.client ? 'active' : 'inactive',\n                network: this.config.network,\n                operatorId: this.config.operatorId,\n                services: {\n                    hcs: !!this.config.hcsTopicId,\n                    hts: !!this.config.htsShareTokenId,\n                    hfs: !!this.config.hfsModelFileId\n                },\n                metrics: this.metrics\n            };\n            \n            // Test basic connectivity\n            try {\n                const balance = await this.client.getAccountBalance(this.config.operatorId);\n                healthData.accountBalance = balance.hbars.toString();\n                healthData.connectivity = 'healthy';\n            } catch (error) {\n                healthData.connectivity = 'degraded';\n                healthData.connectivityError = error.message;\n            }\n            \n            this.emit('healthCheck', healthData);\n            \n            // Log critical health issues\n            if (healthData.connectivity === 'degraded') {\n                console.warn('⚠️ Hedera connectivity degraded:', healthData.connectivityError);\n            }\n            \n        } catch (error) {\n            console.error('❌ Health check failed:', error);\n            this.emit('healthCheck', {\n                timestamp: Date.now(),\n                status: 'failed',\n                error: error.message\n            });\n        }\n    }\n    \n    /**\n     * Start mirror node monitoring for real-time updates\n     */\n    startMirrorNodeMonitoring() {\n        // Monitor HCS topics for new messages\n        if (this.config.hcsTopicId) {\n            this.subscribeToTopic(this.config.hcsTopicId, 'operations');\n        }\n        \n        if (this.config.hcsAuditTopicId) {\n            this.subscribeToTopic(this.config.hcsAuditTopicId, 'audit');\n        }\n    }\n    \n    /**\n     * Subscribe to HCS topic for real-time updates\n     * @param {string} topicId - Topic ID to monitor\n     * @param {string} type - Subscription type\n     */\n    async subscribeToTopic(topicId, type) {\n        try {\n            // Use mirror node REST API for topic monitoring\n            const subscriptionId = `${topicId}_${type}`;\n            \n            // Store subscription info\n            this.subscriptions.set(subscriptionId, {\n                topicId: topicId,\n                type: type,\n                startTime: Date.now(),\n                messageCount: 0\n            });\n            \n            // Start polling mirror node (in production, use WebSocket or Server-Sent Events)\n            const pollInterval = setInterval(async () => {\n                try {\n                    await this.pollTopicMessages(topicId, type);\n                } catch (error) {\n                    console.error(`❌ Failed to poll topic ${topicId}:`, error);\n                }\n            }, 5000); // Poll every 5 seconds\n            \n            this.subscriptions.get(subscriptionId).pollInterval = pollInterval;\n            \n            console.log(`👂 Subscribed to topic ${topicId} (${type})`);\n            \n        } catch (error) {\n            console.error(`❌ Failed to subscribe to topic ${topicId}:`, error);\n        }\n    }\n    \n    /**\n     * Poll topic messages from mirror node\n     * @param {string} topicId - Topic ID\n     * @param {string} type - Subscription type\n     */\n    async pollTopicMessages(topicId, type) {\n        try {\n            const subscription = this.subscriptions.get(`${topicId}_${type}`);\n            if (!subscription) return;\n            \n            // Get messages from mirror node API\n            const url = `${this.config.mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=10&order=desc`;\n            \n            // In a real implementation, you would use fetch or axios here\n            // For now, we'll simulate the response\n            const messages = await this.fetchTopicMessages(url);\n            \n            messages.forEach(message => {\n                subscription.messageCount++;\n                \n                this.emit('topicMessage', {\n                    topicId: topicId,\n                    type: type,\n                    message: message,\n                    timestamp: Date.now()\n                });\n            });\n            \n        } catch (error) {\n            console.error(`❌ Failed to poll topic messages:`, error);\n        }\n    }\n    \n    /**\n     * Fetch topic messages from mirror node (placeholder)\n     * @param {string} url - Mirror node URL\n     * @returns {Promise<Array>} Messages array\n     */\n    async fetchTopicMessages(url) {\n        // Placeholder implementation\n        // In production, implement actual HTTP request to mirror node\n        return [];\n    }\n    \n    // ========== Utility Methods ==========\n    \n    /**\n     * Execute transaction with retry logic\n     * @param {Function} transactionFn - Transaction function\n     * @param {number} maxRetries - Maximum retry attempts\n     * @returns {Promise<any>} Transaction result\n     */\n    async executeWithRetry(transactionFn, maxRetries = this.config.maxRetries) {\n        let lastError;\n        \n        for (let attempt = 1; attempt <= maxRetries; attempt++) {\n            try {\n                return await transactionFn();\n            } catch (error) {\n                lastError = error;\n                \n                if (attempt === maxRetries) {\n                    break;\n                }\n                \n                const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff\n                console.warn(`⚠️ Transaction attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);\n                \n                await this.delay(delay);\n            }\n        }\n        \n        throw lastError;\n    }\n    \n    /**\n     * Update service metrics\n     * @param {string} operation - Operation name\n     * @param {boolean} success - Success status\n     * @param {number} responseTime - Response time in ms\n     */\n    updateMetrics(operation, success, responseTime = 0) {\n        this.metrics.totalTransactions++;\n        \n        if (success) {\n            this.metrics.successfulTransactions++;\n        } else {\n            this.metrics.failedTransactions++;\n        }\n        \n        if (responseTime > 0) {\n            // Update average response time\n            const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalTransactions - 1);\n            this.metrics.averageResponseTime = (totalResponseTime + responseTime) / this.metrics.totalTransactions;\n        }\n        \n        this.metrics.lastUpdateTime = Date.now();\n    }\n    \n    /**\n     * Chunk array into smaller arrays\n     * @param {Array} array - Input array\n     * @param {number} size - Chunk size\n     * @returns {Array} Array of chunks\n     */\n    chunkArray(array, size) {\n        const chunks = [];\n        for (let i = 0; i < array.length; i += size) {\n            chunks.push(array.slice(i, i + size));\n        }\n        return chunks;\n    }\n    \n    /**\n     * Delay execution\n     * @param {number} ms - Milliseconds to delay\n     * @returns {Promise} Promise that resolves after delay\n     */\n    delay(ms) {\n        return new Promise(resolve => setTimeout(resolve, ms));\n    }\n    \n    /**\n     * Get cached data\n     * @param {string} key - Cache key\n     * @returns {any} Cached data or null\n     */\n    getCached(key) {\n        const cached = this.cache.get(key);\n        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {\n            return cached.data;\n        }\n        \n        this.cache.delete(key);\n        return null;\n    }\n    \n    /**\n     * Set cached data\n     * @param {string} key - Cache key\n     * @param {any} data - Data to cache\n     */\n    setCached(key, data) {\n        this.cache.set(key, {\n            data: data,\n            timestamp: Date.now()\n        });\n    }\n    \n    /**\n     * Clear cache\n     */\n    clearCache() {\n        this.cache.clear();\n        console.log('🗑️ Cache cleared');\n    }\n    \n    // ========== Public API Methods ==========\n    \n    /**\n     * Get service status\n     * @returns {object} Service status\n     */\n    getStatus() {\n        return {\n            isConnected: this.isConnected,\n            network: this.config.network,\n            operatorId: this.config.operatorId,\n            services: {\n                hcs: {\n                    enabled: !!this.config.hcsTopicId,\n                    topicId: this.config.hcsTopicId,\n                    auditTopicId: this.config.hcsAuditTopicId\n                },\n                hts: {\n                    enabled: !!this.config.htsShareTokenId,\n                    tokenId: this.config.htsShareTokenId\n                },\n                hfs: {\n                    enabled: !!this.config.hfsModelFileId,\n                    modelFileId: this.config.hfsModelFileId,\n                    bridgeFileId: this.config.hfsBridgeFileId\n                }\n            },\n            metrics: this.metrics,\n            cache: {\n                size: this.cache.size,\n                timeout: this.config.cacheTimeout\n            },\n            subscriptions: Array.from(this.subscriptions.keys())\n        };\n    }\n    \n    /**\n     * Get detailed metrics\n     * @returns {object} Detailed metrics\n     */\n    getMetrics() {\n        return {\n            ...this.metrics,\n            uptime: Date.now() - this.metrics.lastUpdateTime,\n            cacheHitRate: this.cache.size > 0 ? (this.cache.size / this.metrics.totalTransactions) * 100 : 0,\n            subscriptionCount: this.subscriptions.size\n        };\n    }\n    \n    /**\n     * Gracefully shutdown the service\n     */\n    async shutdown() {\n        try {\n            console.log('🛑 Shutting down Hedera Service...');\n            \n            // Stop monitoring\n            this.stopRealTimeMonitoring();\n            \n            // Clear subscriptions\n            for (const [id, subscription] of this.subscriptions) {\n                if (subscription.pollInterval) {\n                    clearInterval(subscription.pollInterval);\n                }\n            }\n            this.subscriptions.clear();\n            \n            // Clear cache\n            this.clearCache();\n            \n            // Close client connection\n            if (this.client) {\n                this.client.close();\n                this.client = null;\n            }\n            \n            this.isConnected = false;\n            this.emit('disconnected', { timestamp: Date.now() });\n            \n            console.log('✅ Hedera Service shutdown complete');\n            \n        } catch (error) {\n            console.error('❌ Error during shutdown:', error);\n            throw error;\n        }\n    }\n}\n\nmodule.exports = HederaService;\n