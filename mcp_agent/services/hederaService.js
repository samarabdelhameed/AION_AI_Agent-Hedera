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

export default HederaService;