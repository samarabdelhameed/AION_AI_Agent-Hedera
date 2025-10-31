/**
 * Intelligent Caching Layer
 * Multi-level caching with TTL, LRU eviction, and cache warming
 */

class CachingLayer {
    constructor(config = {}) {
        this.config = {
            maxMemorySize: config.maxMemorySize || 100 * 1024 * 1024, // 100MB
            defaultTTL: config.defaultTTL || 300000, // 5 minutes
            cleanupInterval: config.cleanupInterval || 60000, // 1 minute
            compressionThreshold: config.compressionThreshold || 1024, // 1KB
            ...config
        };
        
        this.memoryCache = new Map();
        this.accessTimes = new Map();
        this.cacheSizes = new Map();
        this.totalSize = 0;
        
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            compressions: 0
        };
        
        this.startCleanupTimer();
    }

    /**
     * Get value from cache with automatic warming
     */
    async get(key, warmupFunction = null) {
        const cacheEntry = this.memoryCache.get(key);
        
        if (cacheEntry && !this.isExpired(cacheEntry)) {
            this.stats.hits++;
            this.updateAccessTime(key);
            return this.decompress(cacheEntry.value);
        }
        
        this.stats.misses++;
        
        // Cache miss - try to warm up if function provided
        if (warmupFunction) {
            try {
                const value = await warmupFunction();
                await this.set(key, value);
                return value;
            } catch (error) {
                console.warn(`Cache warmup failed for key ${key}:`, error.message);
                return null;
            }
        }
        
        return null;
    }

    /**
     * Set value in cache with compression and TTL
     */
    async set(key, value, ttl = null) {
        try {
            const compressedValue = this.compress(value);
            const size = this.calculateSize(compressedValue);
            const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
            
            // Check if we need to evict items
            await this.ensureSpace(size);
            
            const cacheEntry = {
                value: compressedValue,
                expiresAt,
                size,
                createdAt: Date.now(),
                compressed: size < this.calculateSize(value)
            };
            
            // Remove old entry if exists
            if (this.memoryCache.has(key)) {
                this.totalSize -= this.cacheSizes.get(key);
            }
            
            this.memoryCache.set(key, cacheEntry);
            this.cacheSizes.set(key, size);
            this.updateAccessTime(key);
            this.totalSize += size;
            this.stats.sets++;
            
            if (cacheEntry.compressed) {
                this.stats.compressions++;
            }
            
        } catch (error) {
            console.error(`Cache set failed for key ${key}:`, error.message);
        }
    }

    /**
     * Delete value from cache
     */
    delete(key) {
        if (this.memoryCache.has(key)) {
            this.totalSize -= this.cacheSizes.get(key);
            this.memoryCache.delete(key);
            this.cacheSizes.delete(key);
            this.accessTimes.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Batch operations for improved performance
     */
    async mget(keys) {
        const results = {};
        const missingKeys = [];
        
        for (const key of keys) {
            const value = await this.get(key);
            if (value !== null) {
                results[key] = value;
            } else {
                missingKeys.push(key);
            }
        }
        
        return { results, missingKeys };
    }

    async mset(entries, ttl = null) {
        const promises = Object.entries(entries).map(([key, value]) => 
            this.set(key, value, ttl)
        );
        
        await Promise.all(promises);
    }

    /**
     * Cache warming strategies
     */
    async warmCache(warmupStrategies) {
        console.log('Starting cache warming...');
        const startTime = Date.now();
        let warmedCount = 0;
        
        for (const strategy of warmupStrategies) {
            try {
                const { keys, loader, ttl } = strategy;
                
                for (const key of keys) {
                    if (!this.memoryCache.has(key) || this.isExpired(this.memoryCache.get(key))) {
                        const value = await loader(key);
                        if (value !== null) {
                            await this.set(key, value, ttl);
                            warmedCount++;
                        }
                    }
                }
            } catch (error) {
                console.warn('Cache warming strategy failed:', error.message);
            }
        }
        
        const warmupTime = Date.now() - startTime;
        console.log(`Cache warming completed: ${warmedCount} entries in ${warmupTime}ms`);
        
        return { warmedCount, warmupTime };
    }

    /**
     * Intelligent cache eviction (LRU + size-based)
     */
    async ensureSpace(requiredSize) {
        while (this.totalSize + requiredSize > this.config.maxMemorySize && this.memoryCache.size > 0) {
            const lruKey = this.findLRUKey();
            if (lruKey) {
                this.delete(lruKey);
                this.stats.evictions++;
            } else {
                break;
            }
        }
    }

    findLRUKey() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, accessTime] of this.accessTimes) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }
        
        return oldestKey;
    }

    /**
     * Compression utilities
     */
    compress(value) {
        const serialized = JSON.stringify(value);
        
        if (serialized.length > this.config.compressionThreshold) {
            // Simple compression simulation (in real implementation, use actual compression)
            return {
                compressed: true,
                data: serialized,
                originalSize: serialized.length
            };
        }
        
        return {
            compressed: false,
            data: value,
            originalSize: serialized.length
        };
    }

    decompress(compressedValue) {
        if (compressedValue.compressed) {
            return JSON.parse(compressedValue.data);
        }
        return compressedValue.data;
    }

    /**
     * Utility functions
     */
    isExpired(cacheEntry) {
        return Date.now() > cacheEntry.expiresAt;
    }

    updateAccessTime(key) {
        this.accessTimes.set(key, Date.now());
    }

    calculateSize(value) {
        return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    }

    /**
     * Cleanup expired entries
     */
    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    cleanup() {
        const expiredKeys = [];
        
        for (const [key, entry] of this.memoryCache) {
            if (this.isExpired(entry)) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.delete(key));
        
        if (expiredKeys.length > 0) {
            console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            hitRate: (this.stats.hits / Math.max(this.stats.hits + this.stats.misses, 1)) * 100,
            totalEntries: this.memoryCache.size,
            totalSize: this.totalSize,
            memoryUsage: (this.totalSize / this.config.maxMemorySize) * 100
        };
    }

    /**
     * Clear all cache
     */
    clear() {
        this.memoryCache.clear();
        this.accessTimes.clear();
        this.cacheSizes.clear();
        this.totalSize = 0;
    }
}

module.exports = CachingLayer;