#!/usr/bin/env node

/**
 * Hedera Error Handler & Retry Logic
 * Comprehensive error handling and retry mechanisms for Hedera operations
 */

const { Status } = require('@hashgraph/sdk');

class HederaErrorHandler {
    constructor(maxRetries = 3, baseDelay = 1000) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
        this.errorCounts = {};
        this.retryHistory = [];
    }

    /**
     * Execute operation with retry logic
     */
    async executeWithRetry(operation, operationName, context = {}) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔄 ${operationName} (attempt ${attempt + 1}/${this.maxRetries + 1})`);
                
                const result = await operation();
                
                if (attempt > 0) {
                    console.log(`✅ ${operationName} succeeded after ${attempt + 1} attempts`);
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                
                // Log error details
                this.logError(operationName, error, attempt + 1, context);
                
                // Check if error is retryable
                if (!this.isRetryableError(error) || attempt === this.maxRetries) {
                    break;
                }
                
                // Calculate delay with exponential backoff
                const delay = this.calculateDelay(attempt);
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await this.delay(delay);
            }
        }
        
        // All retries failed
        const errorMessage = `${operationName} failed after ${this.maxRetries + 1} attempts: ${lastError.message}`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'BUSY',
            'PLATFORM_TRANSACTION_NOT_CREATED',
            'PLATFORM_NOT_ACTIVE',
            'INSUFFICIENT_PAYER_BALANCE',
            'TRANSACTION_EXPIRED',
            'INVALID_NODE_ACCOUNT',
            'RECEIPT_NOT_FOUND',
            'RECORD_NOT_FOUND'
        ];

        const retryableMessages = [
            'timeout',
            'network error',
            'connection refused',
            'socket hang up',
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT'
        ];

        // Check Hedera status codes
        if (error.status && retryableErrors.includes(error.status.toString())) {
            return true;
        }

        // Check error messages
        const errorMessage = error.message.toLowerCase();
        return retryableMessages.some(msg => errorMessage.includes(msg));
    }

    /**
     * Handle specific Hedera errors
     */
    handleHederaError(error, operation) {
        const errorHandlers = {
            'INVALID_SIGNATURE': () => {
                console.log('🔧 Suggestion: Check private key format and account ID');
                console.log('💡 Try running: node scripts/fix-key-format.js');
                return false; // Not retryable
            },
            
            'INSUFFICIENT_PAYER_BALANCE': () => {
                console.log('💰 Suggestion: Add more HBAR to your account');
                console.log('💡 Get test HBAR from: https://portal.hedera.com/');
                return true; // Retryable after funding
            },
            
            'INVALID_ACCOUNT_ID': () => {
                console.log('🔧 Suggestion: Verify account ID format (0.0.XXXXXX)');
                console.log('💡 Check .env.hedera file');
                return false; // Not retryable
            },
            
            'TRANSACTION_EXPIRED': () => {
                console.log('⏰ Transaction expired, will retry with new timestamp');
                return true; // Retryable
            },
            
            'BUSY': () => {
                console.log('🚦 Network busy, will retry after delay');
                return true; // Retryable
            },
            
            'RECEIPT_NOT_FOUND': () => {
                console.log('📋 Receipt not found, will retry query');
                return true; // Retryable
            }
        };

        const status = error.status?.toString() || 'UNKNOWN';
        const handler = errorHandlers[status];
        
        if (handler) {
            return handler();
        }
        
        // Default handling
        console.log(`⚠️  Unhandled error status: ${status}`);
        console.log(`📝 Error message: ${error.message}`);
        return this.isRetryableError(error);
    }

    /**
     * Log error with context
     */
    logError(operationName, error, attempt, context) {
        const errorInfo = {
            operation: operationName,
            attempt: attempt,
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                status: error.status?.toString(),
                code: error.code
            },
            context: context
        };

        this.retryHistory.push(errorInfo);
        
        // Count errors by type
        const errorType = error.status?.toString() || error.message;
        this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;

        console.log(`❌ ${operationName} failed (attempt ${attempt}):`);
        console.log(`   Status: ${error.status || 'Unknown'}`);
        console.log(`   Message: ${error.message}`);
        
        if (context && Object.keys(context).length > 0) {
            console.log(`   Context: ${JSON.stringify(context)}`);
        }
    }

    /**
     * Calculate delay with exponential backoff and jitter
     */
    calculateDelay(attempt) {
        const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Add randomness
        return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    }

    /**
     * Simple delay function
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validate transaction receipt
     */
    async validateTransactionReceipt(transactionResponse, client, operationName) {
        return this.executeWithRetry(async () => {
            const receipt = await transactionResponse.getReceipt(client);
            
            if (receipt.status !== Status.Success) {
                throw new Error(`Transaction failed with status: ${receipt.status}`);
            }
            
            return receipt;
        }, `${operationName} - Receipt Validation`);
    }

    /**
     * Safe transaction execution
     */
    async safeTransactionExecute(transaction, client, operationName, context = {}) {
        return this.executeWithRetry(async () => {
            const response = await transaction.execute(client);
            const receipt = await this.validateTransactionReceipt(response, client, operationName);
            
            return { response, receipt };
        }, operationName, context);
    }

    /**
     * Safe query execution
     */
    async safeQueryExecute(query, client, operationName, context = {}) {
        return this.executeWithRetry(async () => {
            return await query.execute(client);
        }, operationName, context);
    }

    /**
     * Generate error report
     */
    generateErrorReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalErrors: this.retryHistory.length,
            errorCounts: this.errorCounts,
            retryHistory: this.retryHistory,
            summary: {
                mostCommonError: this.getMostCommonError(),
                totalRetries: this.retryHistory.length,
                successfulRetries: this.retryHistory.filter(r => r.attempt > 1).length
            }
        };

        return report;
    }

    /**
     * Get most common error
     */
    getMostCommonError() {
        if (Object.keys(this.errorCounts).length === 0) {
            return 'None';
        }

        return Object.entries(this.errorCounts)
            .sort(([,a], [,b]) => b - a)[0][0];
    }

    /**
     * Reset error tracking
     */
    reset() {
        this.errorCounts = {};
        this.retryHistory = [];
    }

    /**
     * Circuit breaker pattern
     */
    createCircuitBreaker(failureThreshold = 5, resetTimeout = 60000) {
        let failures = 0;
        let lastFailureTime = 0;
        let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

        return {
            async execute(operation, operationName) {
                const now = Date.now();

                // Check if circuit should reset
                if (state === 'OPEN' && now - lastFailureTime > resetTimeout) {
                    state = 'HALF_OPEN';
                    failures = 0;
                    console.log(`🔄 Circuit breaker reset for ${operationName}`);
                }

                // Reject if circuit is open
                if (state === 'OPEN') {
                    throw new Error(`Circuit breaker is OPEN for ${operationName}. Try again later.`);
                }

                try {
                    const result = await operation();
                    
                    // Success - reset failures if in half-open state
                    if (state === 'HALF_OPEN') {
                        state = 'CLOSED';
                        failures = 0;
                        console.log(`✅ Circuit breaker closed for ${operationName}`);
                    }
                    
                    return result;
                    
                } catch (error) {
                    failures++;
                    lastFailureTime = now;

                    if (failures >= failureThreshold) {
                        state = 'OPEN';
                        console.log(`🚨 Circuit breaker opened for ${operationName} after ${failures} failures`);
                    }

                    throw error;
                }
            },

            getState() {
                return { state, failures, lastFailureTime };
            }
        };
    }

    /**
     * Health check for Hedera services
     */
    async performHealthCheck(client) {
        const healthChecks = {
            connection: false,
            balance: false,
            network: false
        };

        try {
            // Test basic connection
            console.log('🏥 Performing Hedera health check...');
            
            // Check network connectivity
            const networkMap = client.network;
            if (Object.keys(networkMap).length > 0) {
                healthChecks.network = true;
                console.log('✅ Network connectivity: OK');
            }

            // Check account balance (if operator is set)
            try {
                const operatorId = client.operatorAccountId;
                if (operatorId) {
                    const { AccountBalanceQuery } = require('@hashgraph/sdk');
                    const balance = await new AccountBalanceQuery()
                        .setAccountId(operatorId)
                        .execute(client);
                    
                    healthChecks.balance = true;
                    healthChecks.connection = true;
                    console.log(`✅ Account balance: ${balance.hbars.toString()}`);
                }
            } catch (balanceError) {
                console.log('⚠️  Balance check failed:', balanceError.message);
            }

            const healthScore = Object.values(healthChecks).filter(Boolean).length;
            console.log(`🏥 Health check score: ${healthScore}/3`);

            return {
                healthy: healthScore >= 2,
                checks: healthChecks,
                score: healthScore
            };

        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            return {
                healthy: false,
                checks: healthChecks,
                score: 0,
                error: error.message
            };
        }
    }
}

module.exports = HederaErrorHandler;