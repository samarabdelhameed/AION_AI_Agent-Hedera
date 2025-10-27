import { EventEmitter } from 'events';

/**
 * Hedera Error Handler and Retry Service
 * Advanced error handling with exponential backoff, circuit breaker, and fallback mechanisms
 */
class HederaErrorHandler extends EventEmitter {
    constructor() {
        super();
        
        // Retry configuration
        this.retryConfig = {
            maxRetries: 5,
            baseDelay: 1000, // 1 second
            maxDelay: 30000, // 30 seconds
            backoffMultiplier: 2,
            jitterFactor: 0.1
        };
        
        // Circuit breaker configuration
        this.circuitBreaker = {
            failureThreshold: 5,
            recoveryTimeout: 60000, // 1 minute
            halfOpenMaxCalls: 3
        };
        
        // Service states
        this.serviceStates = new Map();
        
        // Message queue for failed operations
        this.messageQueue = [];
        this.maxQueueSize = 1000;
        
        // Statistics
        this.stats = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            retriedOperations: 0,
            queuedOperations: 0,
            circuitBreakerTrips: 0
        };
        
        // Queue processing
        this.queueProcessor = null;
        this.isProcessingQueue = false;
    }

    /**
     * Initialize error handler
     */
    initialize() {
        console.log('🚀 Initializing Hedera Error Handler...');
        
        // Start queue processor
        this.startQueueProcessor();
        
        console.log('✅ Hedera Error Handler initialized');
        return true;
    }

    /**
     * Execute operation with retry and circuit breaker
     */
    async executeWithRetry(serviceName, operation, operationData = {}) {
        this.stats.totalOperations++;
        
        const serviceState = this.getServiceState(serviceName);
        
        // Check circuit breaker
        if (serviceState.circuitState === 'OPEN') {
            if (Date.now() - serviceState.lastFailureTime < this.circuitBreaker.recoveryTimeout) {
                throw new Error(`Circuit breaker is OPEN for ${serviceName}. Service temporarily unavailable.`);
            } else {
                // Move to half-open state
                serviceState.circuitState = 'HALF_OPEN';
                serviceState.halfOpenCalls = 0;
                console.log(`🔄 Circuit breaker for ${serviceName} moved to HALF_OPEN state`);
            }
        }
        
        // Check half-open state
        if (serviceState.circuitState === 'HALF_OPEN') {
            if (serviceState.halfOpenCalls >= this.circuitBreaker.halfOpenMaxCalls) {
                throw new Error(`Circuit breaker is HALF_OPEN for ${serviceName}. Max calls exceeded.`);
            }
            serviceState.halfOpenCalls++;
        }
        
        let lastError;
        let attempt = 0;
        
        while (attempt <= this.retryConfig.maxRetries) {
            try {
                const result = await operation();
                
                // Success - reset circuit breaker
                if (serviceState.circuitState !== 'CLOSED') {
                    serviceState.circuitState = 'CLOSED';
                    serviceState.failureCount = 0;
                    serviceState.halfOpenCalls = 0;
                    console.log(`✅ Circuit breaker for ${serviceName} reset to CLOSED state`);
                }
                
                this.stats.successfulOperations++;
                if (attempt > 0) {
                    this.stats.retriedOperations++;
                }
                
                this.emit('operation_success', {
                    serviceName,
                    attempt,
                    operationData
                });
                
                return result;
                
            } catch (error) {
                lastError = error;
                attempt++;
                
                console.warn(`⚠️ ${serviceName} operation failed (attempt ${attempt}):`, error.message);
                
                // Update circuit breaker state
                serviceState.failureCount++;
                serviceState.lastFailureTime = Date.now();
                
                if (serviceState.failureCount >= this.circuitBreaker.failureThreshold) {
                    serviceState.circuitState = 'OPEN';
                    this.stats.circuitBreakerTrips++;
                    console.error(`🚨 Circuit breaker OPENED for ${serviceName} after ${serviceState.failureCount} failures`);
                    
                    this.emit('circuit_breaker_opened', {
                        serviceName,
                        failureCount: serviceState.failureCount
                    });
                }
                
                // Check if we should retry
                if (attempt <= this.retryConfig.maxRetries && this.shouldRetry(error)) {
                    const delay = this.calculateDelay(attempt);
                    console.log(`🔄 Retrying ${serviceName} operation in ${delay}ms...`);
                    
                    await this.delay(delay);
                } else {
                    break;
                }
            }
        }
        
        // All retries failed
        this.stats.failedOperations++;
        
        // Queue operation for later retry if appropriate
        if (this.shouldQueue(lastError)) {
            await this.queueOperation(serviceName, operation, operationData);
        }
        
        this.emit('operation_failed', {
            serviceName,
            attempts: attempt,
            error: lastError,
            operationData
        });
        
        throw lastError;
    }

    /**
     * Get or create service state
     */
    getServiceState(serviceName) {
        if (!this.serviceStates.has(serviceName)) {
            this.serviceStates.set(serviceName, {
                circuitState: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
                failureCount: 0,
                lastFailureTime: 0,
                halfOpenCalls: 0
            });
        }
        return this.serviceStates.get(serviceName);
    }

    /**
     * Calculate delay with exponential backoff and jitter
     */
    calculateDelay(attempt) {
        const exponentialDelay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        const cappedDelay = Math.min(exponentialDelay, this.retryConfig.maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitter = cappedDelay * this.retryConfig.jitterFactor * Math.random();
        
        return Math.floor(cappedDelay + jitter);
    }

    /**
     * Determine if error should trigger retry
     */
    shouldRetry(error) {
        const retryableErrors = [
            'NETWORK_ERROR',
            'TIMEOUT',
            'RATE_LIMITED',
            'TEMPORARY_FAILURE',
            'CONNECTION_ERROR',
            'BUSY'
        ];
        
        const nonRetryableErrors = [
            'INVALID_SIGNATURE',
            'INSUFFICIENT_FUNDS',
            'INVALID_ACCOUNT_ID',
            'AUTHORIZATION_FAILED',
            'INVALID_TRANSACTION'
        ];
        
        // Check error message for known patterns
        const errorMessage = error.message.toLowerCase();
        
        if (nonRetryableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()))) {
            return false;
        }
        
        if (retryableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()))) {
            return true;
        }
        
        // Default retry for network-related errors
        if (errorMessage.includes('network') || 
            errorMessage.includes('timeout') || 
            errorMessage.includes('connection') ||
            errorMessage.includes('unavailable')) {
            return true;
        }
        
        return false;
    }

    /**
     * Determine if operation should be queued
     */
    shouldQueue(error) {
        // Queue operations that might succeed later
        const queueableErrors = [
            'NETWORK_ERROR',
            'TIMEOUT',
            'RATE_LIMITED',
            'SERVICE_UNAVAILABLE',
            'BUSY'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return queueableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()));
    }

    /**
     * Queue operation for later retry
     */
    async queueOperation(serviceName, operation, operationData) {
        if (this.messageQueue.length >= this.maxQueueSize) {
            console.warn(`⚠️ Message queue full (${this.maxQueueSize}), dropping oldest message`);
            this.messageQueue.shift();
        }
        
        const queuedOperation = {
            id: `${serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            serviceName,
            operation,
            operationData,
            queuedAt: Date.now(),
            attempts: 0,
            maxAttempts: 3,
            nextRetryAt: Date.now() + 60000 // Retry in 1 minute
        };
        
        this.messageQueue.push(queuedOperation);
        this.stats.queuedOperations++;
        
        console.log(`📥 Queued ${serviceName} operation for later retry (queue size: ${this.messageQueue.length})`);
        
        this.emit('operation_queued', {
            serviceName,
            queueSize: this.messageQueue.length,
            operationData
        });
    }

    /**
     * Start queue processor
     */
    startQueueProcessor() {
        if (this.queueProcessor) {
            return;
        }
        
        this.isProcessingQueue = true;
        this.queueProcessor = setInterval(async () => {
            await this.processQueue();
        }, 30000); // Process queue every 30 seconds
        
        console.log('🔄 Queue processor started');
    }

    /**
     * Process queued operations
     */
    async processQueue() {
        if (!this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }
        
        const now = Date.now();
        const operationsToProcess = this.messageQueue.filter(op => op.nextRetryAt <= now);
        
        if (operationsToProcess.length === 0) {
            return;
        }
        
        console.log(`🔄 Processing ${operationsToProcess.length} queued operations`);
        
        for (const queuedOp of operationsToProcess) {
            try {
                // Remove from queue
                const index = this.messageQueue.indexOf(queuedOp);
                if (index > -1) {
                    this.messageQueue.splice(index, 1);
                }
                
                queuedOp.attempts++;
                
                // Try to execute the operation
                const result = await queuedOp.operation();
                
                console.log(`✅ Queued operation ${queuedOp.id} executed successfully`);
                
                this.emit('queued_operation_success', {
                    operationId: queuedOp.id,
                    serviceName: queuedOp.serviceName,
                    attempts: queuedOp.attempts,
                    result
                });
                
            } catch (error) {
                console.warn(`⚠️ Queued operation ${queuedOp.id} failed (attempt ${queuedOp.attempts}):`, error.message);
                
                // Retry if under max attempts
                if (queuedOp.attempts < queuedOp.maxAttempts) {
                    queuedOp.nextRetryAt = now + (queuedOp.attempts * 120000); // Increase delay
                    this.messageQueue.push(queuedOp); // Re-queue
                    
                    console.log(`🔄 Re-queued operation ${queuedOp.id} for retry`);
                } else {
                    console.error(`❌ Queued operation ${queuedOp.id} failed permanently after ${queuedOp.attempts} attempts`);
                    
                    this.emit('queued_operation_failed', {
                        operationId: queuedOp.id,
                        serviceName: queuedOp.serviceName,
                        attempts: queuedOp.attempts,
                        error
                    });
                }
            }
        }
    }

    /**
     * Stop queue processor
     */
    stopQueueProcessor() {
        if (this.queueProcessor) {
            clearInterval(this.queueProcessor);
            this.queueProcessor = null;
        }
        this.isProcessingQueue = false;
        console.log('⏹️ Queue processor stopped');
    }

    /**
     * Get service health status
     */
    getServiceHealth(serviceName) {
        const serviceState = this.getServiceState(serviceName);
        
        return {
            serviceName,
            circuitState: serviceState.circuitState,
            failureCount: serviceState.failureCount,
            lastFailureTime: serviceState.lastFailureTime,
            isHealthy: serviceState.circuitState === 'CLOSED',
            nextRecoveryTime: serviceState.circuitState === 'OPEN' 
                ? serviceState.lastFailureTime + this.circuitBreaker.recoveryTimeout 
                : null
        };
    }

    /**
     * Get all services health
     */
    getAllServicesHealth() {
        const health = {};
        for (const serviceName of this.serviceStates.keys()) {
            health[serviceName] = this.getServiceHealth(serviceName);
        }
        return health;
    }

    /**
     * Reset circuit breaker for service
     */
    resetCircuitBreaker(serviceName) {
        const serviceState = this.getServiceState(serviceName);
        serviceState.circuitState = 'CLOSED';
        serviceState.failureCount = 0;
        serviceState.halfOpenCalls = 0;
        
        console.log(`🔄 Circuit breaker for ${serviceName} manually reset`);
        
        this.emit('circuit_breaker_reset', { serviceName });
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            queueSize: this.messageQueue.length,
            activeServices: this.serviceStates.size,
            servicesHealth: this.getAllServicesHealth(),
            config: {
                retry: this.retryConfig,
                circuitBreaker: this.circuitBreaker,
                maxQueueSize: this.maxQueueSize
            }
        };
    }

    /**
     * Clear message queue
     */
    clearQueue() {
        const clearedCount = this.messageQueue.length;
        this.messageQueue = [];
        
        console.log(`🗑️ Cleared ${clearedCount} queued operations`);
        
        this.emit('queue_cleared', { clearedCount });
        
        return clearedCount;
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        if (newConfig.retry) {
            this.retryConfig = { ...this.retryConfig, ...newConfig.retry };
        }
        
        if (newConfig.circuitBreaker) {
            this.circuitBreaker = { ...this.circuitBreaker, ...newConfig.circuitBreaker };
        }
        
        if (newConfig.maxQueueSize) {
            this.maxQueueSize = newConfig.maxQueueSize;
        }
        
        console.log('⚙️ Error handler configuration updated');
        
        this.emit('config_updated', newConfig);
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
            // Check queue size
            if (this.messageQueue.length > this.maxQueueSize * 0.8) {
                health.issues.push(`Queue nearly full: ${this.messageQueue.length}/${this.maxQueueSize}`);
                health.status = 'degraded';
            }

            // Check circuit breaker states
            const openCircuits = Array.from(this.serviceStates.entries())
                .filter(([_, state]) => state.circuitState === 'OPEN');
            
            if (openCircuits.length > 0) {
                health.issues.push(`${openCircuits.length} services have open circuit breakers`);
                health.status = 'degraded';
            }

            // Check error rate
            if (this.stats.totalOperations > 0) {
                const errorRate = this.stats.failedOperations / this.stats.totalOperations;
                if (errorRate > 0.2) { // More than 20% error rate
                    health.issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
                    health.status = 'degraded';
                }
            }

            // Check queue processor
            if (!this.isProcessingQueue) {
                health.issues.push('Queue processor not running');
                health.status = 'degraded';
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
     * Utility delay function
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Close and cleanup
     */
    async close() {
        try {
            console.log('🔄 Closing Hedera Error Handler...');
            
            this.stopQueueProcessor();
            
            // Process remaining queue items
            if (this.messageQueue.length > 0) {
                console.log(`🔄 Processing ${this.messageQueue.length} remaining queued operations...`);
                await this.processQueue();
            }
            
            this.removeAllListeners();
            
            console.log('✅ Hedera Error Handler closed');
        } catch (error) {
            console.error('❌ Error closing Hedera Error Handler:', error);
        }
    }
}

export default HederaErrorHandler;