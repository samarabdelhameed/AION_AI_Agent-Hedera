/**
 * Parallel Loading Manager
 * Implements concurrent data loading and resource optimization
 */

class ParallelLoader {
    constructor(config = {}) {
        this.config = {
            maxConcurrency: config.maxConcurrency || 5,
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };
        
        this.activeRequests = new Map();
        this.requestQueue = [];
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            concurrentPeak: 0
        };
    }

    /**
     * Load multiple resources in parallel with concurrency control
     */
    async loadParallel(resources, options = {}) {
        const startTime = Date.now();
        const results = [];
        const errors = [];
        
        try {
            // Split resources into chunks based on concurrency limit
            const chunks = this.chunkArray(resources, this.config.maxConcurrency);
            
            for (const chunk of chunks) {
                const chunkPromises = chunk.map(resource => 
                    this.loadResource(resource, options)
                        .then(result => ({ success: true, data: result, resource }))
                        .catch(error => ({ success: false, error, resource }))
                );
                
                const chunkResults = await Promise.all(chunkPromises);
                
                chunkResults.forEach(result => {
                    if (result.success) {
                        results.push(result.data);
                    } else {
                        errors.push({ resource: result.resource, error: result.error });
                    }
                });
            }
            
            const totalTime = Date.now() - startTime;
            this.updateStats(resources.length, results.length, totalTime);
            
            return {
                success: true,
                results,
                errors,
                totalTime,
                successRate: (results.length / resources.length) * 100
            };
            
        } catch (error) {
            console.error('Parallel loading failed:', error);
            throw error;
        }
    }

    /**
     * Load individual resource with retry logic
     */
    async loadResource(resource, options = {}) {
        const requestId = this.generateRequestId();
        let attempt = 0;
        
        while (attempt < this.config.retryAttempts) {
            try {
                this.activeRequests.set(requestId, {
                    resource,
                    startTime: Date.now(),
                    attempt: attempt + 1
                });
                
                const result = await this.executeResourceLoad(resource, options);
                this.activeRequests.delete(requestId);
                
                return result;
                
            } catch (error) {
                attempt++;
                
                if (attempt >= this.config.retryAttempts) {
                    this.activeRequests.delete(requestId);
                    throw error;
                }
                
                // Wait before retry
                await this.delay(this.config.retryDelay * attempt);
            }
        }
    }

    /**
     * Execute actual resource loading
     */
    async executeResourceLoad(resource, options) {
        const { type, url, params } = resource;
        
        switch (type) {
            case 'api':
                return this.loadAPIResource(url, params, options);
            case 'hedera':
                return this.loadHederaResource(resource, options);
            case 'database':
                return this.loadDatabaseResource(resource, options);
            case 'file':
                return this.loadFileResource(resource, options);
            default:
                throw new Error(`Unknown resource type: ${type}`);
        }
    }

    /**
     * Load API resource
     */
    async loadAPIResource(url, params = {}, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        try {
            const response = await fetch(url, {
                method: params.method || 'GET',
                headers: params.headers || {},
                body: params.body ? JSON.stringify(params.body) : undefined,
                signal: controller.signal,
                ...options
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Load Hedera resource
     */
    async loadHederaResource(resource, options) {
        const { operation, params } = resource;
        
        // Simulate Hedera operation
        await this.delay(Math.random() * 1000 + 500); // 0.5-1.5s
        
        return {
            operation,
            result: 'success',
            data: params,
            timestamp: new Date(),
            transactionId: `0.0.${Date.now()}`
        };
    }

    /**
     * Load database resource
     */
    async loadDatabaseResource(resource, options) {
        const { query, params } = resource;
        
        // Simulate database query
        await this.delay(Math.random() * 500 + 100); // 0.1-0.6s
        
        return {
            query,
            params,
            rows: Math.floor(Math.random() * 100),
            timestamp: new Date()
        };
    }

    /**
     * Load file resource
     */
    async loadFileResource(resource, options) {
        const { path: filePath } = resource;
        
        // Simulate file loading
        await this.delay(Math.random() * 300 + 50); // 0.05-0.35s
        
        return {
            path: filePath,
            size: Math.floor(Math.random() * 10000),
            content: `File content for ${filePath}`,
            timestamp: new Date()
        };
    }

    /**
     * Preload critical resources
     */
    async preloadCriticalResources(criticalResources) {
        console.log('Preloading critical resources...');
        
        const preloadPromises = criticalResources.map(resource => 
            this.loadResource(resource, { priority: 'high' })
                .catch(error => {
                    console.warn(`Failed to preload ${resource.type}:`, error.message);
                    return null;
                })
        );
        
        const results = await Promise.all(preloadPromises);
        const successfulPreloads = results.filter(result => result !== null);
        
        console.log(`Preloaded ${successfulPreloads.length}/${criticalResources.length} critical resources`);
        
        return successfulPreloads;
    }

    /**
     * Utility functions
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Update performance statistics
     */
    updateStats(totalRequests, successfulRequests, responseTime) {
        this.stats.totalRequests += totalRequests;
        this.stats.successfulRequests += successfulRequests;
        this.stats.failedRequests += (totalRequests - successfulRequests);
        
        this.stats.avgResponseTime = (
            (this.stats.avgResponseTime * (this.stats.totalRequests - totalRequests) + responseTime) / 
            this.stats.totalRequests
        );
        
        this.stats.concurrentPeak = Math.max(this.stats.concurrentPeak, this.activeRequests.size);
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: (this.stats.successfulRequests / Math.max(this.stats.totalRequests, 1)) * 100,
            activeRequests: this.activeRequests.size,
            queueSize: this.requestQueue.length
        };
    }

    /**
     * Reset statistics
     */
    reset() {
        this.activeRequests.clear();
        this.requestQueue = [];
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            concurrentPeak: 0
        };
    }
}

module.exports = ParallelLoader;