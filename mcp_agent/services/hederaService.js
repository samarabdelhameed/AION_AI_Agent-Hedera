import { 
    Client, 
    PrivateKey, 
    AccountId, 
    Hbar,
    AccountBalanceQuery,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenBurnTransaction,
    TokenInfoQuery,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    FileCreateTransaction,
    FileAppendTransaction,
    FileContentsQuery,
    TransferTransaction,
    TokenId,
    TopicId,
    FileId
} from '@hashgraph/sdk';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced Hedera Service with comprehensive blockchain integration
 */
class HederaService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            network: config.network || process.env.HEDERA_NETWORK || 'testnet',
            operatorId: config.operatorId || process.env.HEDERA_ACCOUNT_ID,
            operatorKey: config.operatorKey || process.env.HEDERA_PRIVATE_KEY,
            mirrorNodeUrl: config.mirrorNodeUrl || process.env.HEDERA_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com',
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            cacheTimeout: config.cacheTimeout || 300000, // 5 minutes
            batchSize: config.batchSize || 10,
            ...config
        };
        
        this.client = null;
        this.isConnected = false;
        this.cache = new Map();
        this.subscriptions = new Map();
        
        // Metrics tracking
        this.metrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            averageResponseTime: 0,
            totalGasUsed: 0,
            lastUpdateTime: Date.now()
        };
    }

    /**
     * Initialize Hedera client and connect
     */
    async initialize() {
        try {
            console.log('🔗 Initializing Hedera Service...');
            
            if (!this.config.operatorId || !this.config.operatorKey) {
                console.warn('⚠️ Missing Hedera credentials - running in mock mode');
                this.isConnected = true;
                this.mockMode = true;
                this.emit('connected', { 
                    network: this.config.network,
                    operatorId: 'mock',
                    balance: '0 ℏ',
                    mockMode: true
                });
                return true;
            }

            // Create client based on network
            if (this.config.network === 'mainnet') {
                this.client = Client.forMainnet();
            } else {
                this.client = Client.forTestnet();
            }

            // Set operator
            this.client.setOperator(
                AccountId.fromString(this.config.operatorId),
                PrivateKey.fromString(this.config.operatorKey)
            );

            // Test connection
            const balanceQuery = new AccountBalanceQuery()
                .setAccountId(AccountId.fromString(this.config.operatorId));
            const balance = await balanceQuery.execute(this.client);
            console.log(`✅ Connected to Hedera ${this.config.network}`);
            console.log(`💰 Account balance: ${balance.hbars.toString()}`);

            this.isConnected = true;
            this.emit('connected', { 
                network: this.config.network,
                operatorId: this.config.operatorId,
                balance: balance.hbars.toString()
            });

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize Hedera Service:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            network: this.config.network,
            operatorId: this.config.operatorId,
            metrics: this.metrics,
            cacheSize: this.cache.size,
            subscriptions: Array.from(this.subscriptions.keys())
        };
    }

    /**
     * Get account balance
     */
    async getAccountBalance(accountId = null) {
        try {
            const targetAccountId = accountId || this.config.operatorId;
            const balanceQuery = new AccountBalanceQuery()
                .setAccountId(AccountId.fromString(targetAccountId));
            const balance = await balanceQuery.execute(this.client);
            
            return {
                accountId: targetAccountId,
                hbars: balance.hbars.toString(),
                tokens: balance.tokens ? Object.fromEntries(balance.tokens) : {}
            };
        } catch (error) {
            console.error('❌ Failed to get account balance:', error);
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected', healthy: false };
            }

            const balance = await this.getAccountBalance();
            
            return {
                status: 'connected',
                healthy: true,
                network: this.config.network,
                balance: balance.hbars,
                metrics: this.metrics
            };
        } catch (error) {
            return {
                status: 'error',
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * Shutdown service
     */
    async shutdown() {
        try {
            console.log('🛑 Shutting down Hedera Service...');
            
            if (this.client) {
                this.client.close();
                this.client = null;
            }
            
            this.isConnected = false;
            this.cache.clear();
            this.subscriptions.clear();
            
            console.log('✅ Hedera Service shutdown complete');
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            throw error;
        }
    }

    /**
     * ========== HTS (Token Service) Operations ==========
     */

    /**
     * Create a new HTS token
     */
    async createHTSToken(tokenConfig) {
        try {
            const startTime = Date.now();
            
            const tokenCreateTx = new TokenCreateTransaction()
                .setTokenName(tokenConfig.name || 'AION Token')
                .setTokenSymbol(tokenConfig.symbol || 'AION')
                .setTokenType(tokenConfig.tokenType || 0) // FUNGIBLE_COMMON
                .setInitialSupply(tokenConfig.initialSupply || 0)
                .setDecimals(tokenConfig.decimals || 18)
                .setTreasuryAccountId(AccountId.fromString(this.config.operatorId))
                .setAdminKey(this.client.operatorPublicKey)
                .setSupplyKey(this.client.operatorPublicKey)
                .setMaxTransactionFee(new Hbar(30));

            const response = await tokenCreateTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                tokenId: receipt.tokenId.toString(),
                transactionId: response.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to create HTS token:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Mint HTS tokens
     */
    async mintHTSTokens(tokenId, amount, metadata = {}) {
        try {
            const startTime = Date.now();
            
            const mintTx = new TokenMintTransaction()
                .setTokenId(TokenId.fromString(tokenId))
                .setAmount(amount)
                .setMaxTransactionFee(new Hbar(20));

            const response = await mintTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                newTotalSupply: receipt.totalSupply.toString(),
                transactionId: response.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to mint HTS tokens:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Burn HTS tokens
     */
    async burnHTSTokens(tokenId, amount, serialNumbers = []) {
        try {
            const startTime = Date.now();
            
            const burnTx = new TokenBurnTransaction()
                .setTokenId(TokenId.fromString(tokenId))
                .setAmount(amount)
                .setMaxTransactionFee(new Hbar(20));

            const response = await burnTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                newTotalSupply: receipt.totalSupply.toString(),
                transactionId: response.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to burn HTS tokens:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Transfer HTS tokens
     */
    async transferHTSTokens(tokenId, fromAccountId, toAccountId, amount, metadata = {}) {
        try {
            const startTime = Date.now();
            
            const transferTx = new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(tokenId),
                    AccountId.fromString(fromAccountId),
                    -amount
                )
                .addTokenTransfer(
                    TokenId.fromString(tokenId),
                    AccountId.fromString(toAccountId),
                    amount
                )
                .setMaxTransactionFee(new Hbar(20));

            const response = await transferTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                transactionId: response.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to transfer HTS tokens:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Associate HTS token with account
     */
    async associateHTSToken(accountId, tokenId) {
        try {
            const startTime = Date.now();
            
            const associateTx = await new TransferTransaction()
                .addTokenTransfer(
                    TokenId.fromString(tokenId),
                    AccountId.fromString(accountId),
                    0
                )
                .setMaxTransactionFee(new Hbar(20))
                .execute(this.client);
            
            const receipt = await associateTx.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                transactionId: associateTx.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to associate HTS token:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Get token information
     */
    async getTokenInfo(tokenId) {
        try {
            const query = new TokenInfoQuery()
                .setTokenId(TokenId.fromString(tokenId));
            
            const tokenInfo = await query.execute(this.client);
            
            return {
                tokenId: tokenInfo.tokenId.toString(),
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals,
                totalSupply: tokenInfo.totalSupply.toString(),
                treasury: tokenInfo.treasuryAccountId.toString(),
                adminKey: tokenInfo.adminKey ? tokenInfo.adminKey.toString() : null,
                supplyKey: tokenInfo.supplyKey ? tokenInfo.supplyKey.toString() : null
            };
        } catch (error) {
            console.error('❌ Failed to get token info:', error);
            throw error;
        }
    }

    /**
     * ========== HCS (Consensus Service) Operations ==========
     */

    /**
     * Create HCS topic
     */
    async createHCSTopic(memo = '') {
        try {
            const startTime = Date.now();
            
            const topicCreateTx = new TopicCreateTransaction()
                .setTopicMemo(memo || 'AION AI Decision Logging')
                .setAdminKey(this.client.operatorPublicKey)
                .setSubmitKey(this.client.operatorPublicKey)
                .setMaxTransactionFee(new Hbar(10));

            const response = await topicCreateTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                topicId: receipt.topicId.toString(),
                transactionId: response.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to create HCS topic:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Submit message to HCS
     */
    async submitToHCS(topicId, message) {
        try {
            const startTime = Date.now();
            
            const messageString = typeof message === 'string' 
                ? message 
                : JSON.stringify(message);
            
            const topicMessageTx = new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(topicId))
                .setMessage(messageString)
                .setMaxTransactionFee(new Hbar(10));

            const response = await topicMessageTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                transactionId: response.transactionId.toString(),
                sequenceNumber: receipt.topicSequenceNumber?.toString() || receipt.sequenceNumber?.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to submit to HCS:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Submit batch messages to HCS
     */
    async submitBatchToHCS(topicId, messages) {
        const results = [];
        
        for (const message of messages) {
            try {
                const result = await this.submitToHCS(topicId, message);
                results.push({ success: true, message, ...result });
            } catch (error) {
                results.push({ success: false, message, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * ========== HFS (File Service) Operations ==========
     */

    /**
     * Create HFS file
     */
    async createFile(content, memo = '') {
        try {
            const startTime = Date.now();
            
            const fileCreateTx = new FileCreateTransaction()
                .setContents(content)
                .setFileMemo(memo || 'AION File Storage')
                .setMaxTransactionFee(new Hbar(50));

            const response = await fileCreateTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                fileId: receipt.fileId.toString(),
                transactionId: response.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to create file:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Append to HFS file
     */
    async appendFile(fileId, content) {
        try {
            const startTime = Date.now();
            
            const fileAppendTx = new FileAppendTransaction()
                .setFileId(FileId.fromString(fileId))
                .setContents(content)
                .setMaxTransactionFee(new Hbar(50));

            const response = await fileAppendTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            this.metrics.totalTransactions++;
            this.metrics.successfulTransactions++;
            
            const duration = Date.now() - startTime;
            this.updateMetrics(duration);
            
            return {
                success: true,
                transactionId: response.transactionId.toString(),
                receipt: receipt
            };
        } catch (error) {
            console.error('❌ Failed to append file:', error);
            this.metrics.totalTransactions++;
            this.metrics.failedTransactions++;
            throw error;
        }
    }

    /**
     * Get HFS file contents
     */
    async getFileContents(fileId) {
        try {
            const query = new FileContentsQuery()
                .setFileId(FileId.fromString(fileId));
            
            const contents = await query.execute(this.client);
            
            return {
                success: true,
                fileId: fileId,
                contents: contents.toString('utf8'),
                length: contents.length
            };
        } catch (error) {
            console.error('❌ Failed to get file contents:', error);
            throw error;
        }
    }

    /**
     * Helper method to update metrics
     */
    updateMetrics(duration) {
        const totalDurations = this.metrics.totalTransactions || 0;
        const currentAvg = this.metrics.averageResponseTime || 0;
        
        this.metrics.averageResponseTime = Math.round(
            ((currentAvg * (totalDurations - 1)) + duration) / totalDurations
        );
        this.metrics.lastUpdateTime = Date.now();
    }
}

export default HederaService;