/**
 * API Optimization Middleware
 * Request/response optimization, compression, and performance monitoring
 */

const DatabaseOptimizer = require('../utils/DatabaseOptimizer');
const HederaOptimizer = require('../utils/HederaOptimizer');
const ParallelLoader = require('../utils/ParallelLoader');
const CachingLayer = require('../utils/CachingLayer');

class OptimizationMiddleware {
    constructor() {
        this.dbOptimizer = new DatabaseOptimizer();
        this.hederaOptimizer = new HederaOptimizer();
        this.parallelLoader = new ParallelLoader();
        this.cache = new CachingLayer();
        
        this.requestStats = {
            totalRequests: 0,
            optimizedRequests: 0,
            avgResponseTime: 0,
            cacheHitRate: 0
        };
    }

    /**
     * Main optimization middleware
     */
    optimize() {
        return async (req, res, next) => {
            const startTime = Date.now();
            req.optimizationContext = {
                startTime,
                useCache: this.shouldUseCache(req),
                useBatching: this.shouldUseBatching(req),
                useParallel: this.shouldUseParallel(req)
            };
            
            // Add optimization helpers to request
            req.dbOptimizer = this.dbOptimizer;
            req.hederaOptimizer = this.hederaOptimizer;
            req.parallelLoader = this.parallelLoader;
            req.cache = this.cache;
            
            // Response optimization
            const originalSend = res.send;
            res.send = (data) => {
                const responseTime = Date.now() - startTime;
                this.updateStats(responseTime, req.optimizationContext);
                
                // Compress response if beneficial
                if (this.shouldCompress(data)) {
                    res.set('Content-Encoding', 'gzip');
                }
                
                return originalSend.call(res, data);
            };
            
            next();
        };
    }

    /**
     * Cache middleware for GET requests
     */
    cacheMiddleware() {
        return async (req, res, next) => {
            if (req.method !== 'GET' || !req.optimizationContext?.useCache) {
                return next();
            }
            
            const cacheKey = this.generateCacheKey(req);
            const cachedResponse = await this.cache.get(cacheKey);
            
            if (cachedResponse) {
                res.set('X-Cache', 'HIT');
                return res.json(cachedResponse);
            }
            
            // Store original send to cache response
            const originalSend = res.send;
            res.send = (data) => {
                if (res.statusCode === 200) {
                    this.cache.set(cacheKey, JSON.parse(data), 300000); // 5 min cache
                }
                res.set('X-Cache', 'MISS');
                return originalSend.call(res, data);
            };
            
            next();
        };
    }

    /**
     * Batch processing middleware
     */
    batchMiddleware() {
        return (req, res, next) => {
            if (!req.optimizationContext?.useBatching) {
                return next();
            }
            
            // Add batch processing helpers
            req.batchOperations = {
                database: [],
                hedera: [],
                api: []
            };
            
            req.addToBatch = (type, operation) => {
                if (req.batchOperations[type]) {
                    req.batchOperations[type].push(operation);
                }
            };
            
            req.executeBatch = async () => {
                const results = {};
                
                if (req.batchOperations.database.length > 0) {
                    results.database = await this.dbOptimizer.executeBatch(req.batchOperations.database);
                }
                
                if (req.batchOperations.hedera.length > 0) {
                    results.hedera = await this.hederaOptimizer.executeParallelTokenOperations(req.batchOperations.hedera);
                }
                
                return results;
            };
            
            next();
        };
    }

    /**
     * Parallel loading middleware
     */
    parallelMiddleware() {
        return (req, res, next) => {
            if (!req.optimizationContext?.useParallel) {
                return next();
            }
            
            req.loadParallel = async (resources, options = {}) => {
                return this.parallelLoader.loadParallel(resources, options);
            };
            
            next();
        };
    }

    /**
     * Performance monitoring middleware
     */
    monitoringMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                const stats = {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    responseTime,
                    cached: res.get('X-Cache') === 'HIT',
                    optimized: !!req.optimizationContext
                };
                
                this.logPerformanceMetric(stats);
            });
            
            next();
        };
    }

    /**
     * Utility functions
     */
    shouldUseCache(req) {
        return req.method === 'GET' && !req.url.includes('/real-time/');
    }

    shouldUseBatching(req) {
        return req.url.includes('/batch/') || req.body?.batch === true;
    }

    shouldUseParallel(req) {
        return req.url.includes('/parallel/') || req.body?.parallel === true;
    }

    shouldCompress(data) {
        return typeof data === 'string' && data.length > 1024;
    }

    generateCacheKey(req) {
        return `${req.method}:${req.url}:${JSON.stringify(req.query)}`;
    }

    updateStats(responseTime, context) {
        this.requestStats.totalRequests++;
        if (context.useCache || context.useBatching || context.useParallel) {
            this.requestStats.optimizedRequests++;
        }
        
        this.requestStats.avgResponseTime = (
            (this.requestStats.avgResponseTime * (this.requestStats.totalRequests - 1) + responseTime) / 
            this.requestStats.totalRequests
        );
    }

    logPerformanceMetric(stats) {
        if (stats.responseTime > 1000) {
            console.warn(`Slow request detected: ${stats.method} ${stats.url} - ${stats.responseTime}ms`);
        }
    }

    /**
     * Get optimization statistics
     */
    getStats() {
        return {
            ...this.requestStats,
            optimizationRate: (this.requestStats.optimizedRequests / Math.max(this.requestStats.totalRequests, 1)) * 100,
            database: this.dbOptimizer.getStats(),
            hedera: this.hederaOptimizer.getStats(),
            parallel: this.parallelLoader.getStats(),
            cache: this.cache.getStats()
        };
    }
}

module.exports = OptimizationMiddleware;