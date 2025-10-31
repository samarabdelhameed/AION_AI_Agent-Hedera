/**
 * @fileoverview Enhanced Model Metadata Manager with Hedera HFS Integration
 * @description Comprehensive metadata management system with version control and HFS storage
 * @author AION Team
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Enhanced Model Metadata Manager with Hedera HFS integration
 */
class ModelMetadataManager extends EventEmitter {
    constructor(config = {}) {
        super();
        
        // Configuration
        this.config = {
            // Hedera integration
            hederaService: config.hederaService || null,
            hfsModelFileId: config.hfsModelFileId || process.env.HEDERA_HFS_MODEL_FILE_ID,
            hfsBridgeFileId: config.hfsBridgeFileId || process.env.HEDERA_HFS_BRIDGE_FILE_ID,
            
            // Storage settings
            enableHFSStorage: config.enableHFSStorage !== false,
            enableLocalStorage: config.enableLocalStorage !== false,
            localStoragePath: config.localStoragePath || './data/models',
            
            // Version control
            enableVersionControl: config.enableVersionControl !== false,
            maxVersions: config.maxVersions || 10,
            compressionEnabled: config.compressionEnabled !== false,
            
            // Metadata settings
            metadataFormat: config.metadataFormat || 'json',
            includePerformanceMetrics: config.includePerformanceMetrics !== false,
            includeTrainingData: config.includeTrainingData !== false,
            
            // Caching
            enableCaching: config.enableCaching !== false,
            cacheTimeout: config.cacheTimeout || 300000, // 5 minutes
            maxCacheSize: config.maxCacheSize || 100,
            
            // Performance
            enableMetrics: config.enableMetrics !== false,
            metricsInterval: config.metricsInterval || 60000 // 1 minute
        };
        
        // State management
        this.isInitialized = false;
        this.modelRegistry = new Map();
        this.versionHistory = new Map();
        this.metadataCache = new Map();
        
        // Metrics
        this.metrics = {
            totalModels: 0,
            totalVersions: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hfsOperations: 0,
            localOperations: 0,
            lastUpdateTime: null
        };
        
        // Performance tracking
        this.performanceData = {
            retrievalTimes: [],
            storageTimes: [],
            compressionRatios: []
        };
        
        // Initialize manager
        this.initialize();
    }
    
    /**
     * Initialize the Model Metadata Manager
     */
    async initialize() {
        try {
            console.log('🤖 Initializing Enhanced Model Metadata Manager...');
            
            // Validate configuration
            this.validateConfiguration();
            
            // Setup local storage
            if (this.config.enableLocalStorage) {
                await this.setupLocalStorage();
            }
            
            // Initialize Hedera HFS integration
            if (this.config.enableHFSStorage && this.config.hederaService) {
                await this.initializeHFSIntegration();
            }
            
            // Load existing metadata
            await this.loadExistingMetadata();
            
            // Start metrics collection
            if (this.config.enableMetrics) {
                this.startMetricsCollection();
            }
            
            this.isInitialized = true;
            this.emit('initialized', { timestamp: Date.now() });
            
            console.log('✅ Model Metadata Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Model Metadata Manager:', error);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Validate configuration
     */
    validateConfiguration() {
        if (this.config.enableHFSStorage && !this.config.hederaService) {
            console.warn('⚠️ HFS storage enabled but no HederaService provided');
        }
        
        if (!this.config.enableHFSStorage && !this.config.enableLocalStorage) {
            throw new Error('At least one storage method must be enabled');
        }
        
        if (this.config.maxVersions <= 0) {
            throw new Error('Max versions must be a positive number');
        }
    }
    
    /**
     * Setup local storage directory
     */
    async setupLocalStorage() {
        try {
            await fs.mkdir(this.config.localStoragePath, { recursive: true });
            await fs.mkdir(path.join(this.config.localStoragePath, 'versions'), { recursive: true });
            await fs.mkdir(path.join(this.config.localStoragePath, 'cache'), { recursive: true });
            
            console.log(`📁 Local storage setup at: ${this.config.localStoragePath}`);
            
        } catch (error) {
            console.error('❌ Failed to setup local storage:', error);
            throw error;
        }
    }
    
    /**
     * Initialize Hedera HFS integration
     */
    async initializeHFSIntegration() {
        try {
            if (!this.config.hederaService.isConnected) {
                console.warn('⚠️ HederaService not connected, HFS operations may fail');
            }
            
            // Verify HFS file IDs exist
            if (!this.config.hfsModelFileId) {
                console.warn('⚠️ No HFS model file ID provided');
            }
            
            console.log('🔗 Hedera HFS integration initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize HFS integration:', error);
            throw error;
        }
    }
    
    /**
     * Load existing metadata from storage
     */
    async loadExistingMetadata() {
        try {
            // Load from local storage
            if (this.config.enableLocalStorage) {
                await this.loadLocalMetadata();
            }
            
            console.log(`📊 Loaded metadata for ${this.modelRegistry.size} models`);
            
        } catch (error) {
            console.error('❌ Failed to load existing metadata:', error);
            // Don't throw - continue with empty registry
        }
    }
    
    // ========== Core Metadata Management ==========
    
    /**
     * Store model metadata
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Model metadata
     * @param {object} options - Storage options
     * @returns {Promise<string>} Version ID
     */
    async storeModelMetadata(modelId, metadata, options = {}) {
        try {
            const startTime = Date.now();
            
            // Validate metadata
            this.validateMetadata(metadata);
            
            // Generate version ID
            const versionId = this.generateVersionId(modelId, metadata);
            
            // Prepare metadata entry
            const metadataEntry = this.prepareMetadataEntry(modelId, metadata, versionId, options);
            
            // Store in registry
            this.modelRegistry.set(modelId, metadataEntry);
            
            // Update version history
            await this.updateVersionHistory(modelId, metadataEntry);
            
            // Store to HFS if enabled
            if (this.config.enableHFSStorage && this.config.hederaService) {
                await this.storeToHFS(modelId, metadataEntry);
            }
            
            // Store locally if enabled
            if (this.config.enableLocalStorage) {
                await this.storeLocally(modelId, metadataEntry);
            }
            
            // Update cache
            if (this.config.enableCaching) {
                this.updateCache(modelId, metadataEntry);
            }
            
            // Update metrics
            this.metrics.totalModels = this.modelRegistry.size;
            this.metrics.lastUpdateTime = Date.now();
            const storageTime = Date.now() - startTime;
            this.performanceData.storageTimes.push(storageTime);
            
            this.emit('metadataStored', { modelId, versionId, storageTime });
            
            console.log(`💾 Stored metadata for model ${modelId} (version: ${versionId})`);
            
            return versionId;
            
        } catch (error) {
            console.error('❌ Failed to store model metadata:', error);
            this.emit('storageError', { modelId, error });
            throw error;
        }
    }
    
    /**
     * Retrieve model metadata
     * @param {string} modelId - Model identifier
     * @param {object} options - Retrieval options
     * @returns {Promise<object|null>} Model metadata
     */
    async retrieveModelMetadata(modelId, options = {}) {
        try {
            const startTime = Date.now();
            
            // Check cache first
            if (this.config.enableCaching && !options.bypassCache) {
                const cached = this.getCachedMetadata(modelId);
                if (cached) {
                    this.metrics.cacheHits++;
                    this.emit('cacheHit', { modelId });
                    return cached;
                }
                this.metrics.cacheMisses++;
            }
            
            // Try local registry first
            let metadata = this.modelRegistry.get(modelId);
            
            if (!metadata) {
                // Try loading from local storage
                if (this.config.enableLocalStorage) {
                    metadata = await this.loadFromLocal(modelId);
                }
                
                // Try loading from HFS
                if (!metadata && this.config.enableHFSStorage && this.config.hederaService) {
                    metadata = await this.loadFromHFS(modelId);
                }
            }
            
            if (metadata) {
                // Update cache
                if (this.config.enableCaching) {
                    this.updateCache(modelId, metadata);
                }
                
                // Update registry if loaded from storage
                if (!this.modelRegistry.has(modelId)) {
                    this.modelRegistry.set(modelId, metadata);
                }
            }
            
            const retrievalTime = Date.now() - startTime;
            this.performanceData.retrievalTimes.push(retrievalTime);
            
            this.emit('metadataRetrieved', { modelId, found: !!metadata, retrievalTime });
            
            return metadata || null;
            
        } catch (error) {
            console.error('❌ Failed to retrieve model metadata:', error);
            this.emit('retrievalError', { modelId, error });
            return null;
        }
    }
    
    /**
     * List all models
     * @param {object} filters - Filter criteria
     * @returns {Promise<Array>} List of models
     */
    async listModels(filters = {}) {
        try {
            const models = Array.from(this.modelRegistry.values());
            
            return models.filter(model => {
                if (filters.type && model.type !== filters.type) return false;
                if (filters.version && model.version !== filters.version) return false;
                if (filters.status && model.status !== filters.status) return false;
                if (filters.minAccuracy && model.performance?.accuracy < filters.minAccuracy) return false;
                if (filters.createdAfter && model.createdAt < filters.createdAfter) return false;
                if (filters.createdBefore && model.createdAt > filters.createdBefore) return false;
                
                return true;
            }).map(model => ({
                modelId: model.modelId,
                name: model.name,
                type: model.type,
                version: model.version,
                status: model.status,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt,
                performance: model.performance
            }));
            
        } catch (error) {
            console.error('❌ Failed to list models:', error);
            return [];
        }
    }
    
    // ========== Local Storage Operations ==========
    
    /**
     * Store metadata locally
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Metadata to store
     */
    async storeLocally(modelId, metadata) {
        try {
            const filePath = path.join(this.config.localStoragePath, `${modelId}.json`);
            const content = JSON.stringify(metadata, null, 2);
            
            await fs.writeFile(filePath, content, 'utf8');
            
            // Store version
            if (this.config.enableVersionControl) {
                const versionPath = path.join(
                    this.config.localStoragePath,
                    'versions',
                    `${modelId}-${metadata.versionId}.json`
                );
                await fs.writeFile(versionPath, content, 'utf8');
            }
            
            this.metrics.localOperations++;
            
            console.log(`💾 Stored metadata locally: ${filePath}`);
            
        } catch (error) {
            console.error('❌ Failed to store locally:', error);
            throw error;
        }
    }
    
    /**
     * Load metadata from local storage
     * @param {string} modelId - Model identifier
     * @returns {Promise<object|null>} Metadata
     */
    async loadFromLocal(modelId) {
        try {
            const filePath = path.join(this.config.localStoragePath, `${modelId}.json`);
            const content = await fs.readFile(filePath, 'utf8');
            
            return JSON.parse(content);
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Failed to load from local storage:', error);
            }
            return null;
        }
    }
    
    /**
     * Load local metadata registry
     */
    async loadLocalMetadata() {
        try {
            const files = await fs.readdir(this.config.localStoragePath);
            const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('-'));
            
            for (const file of jsonFiles) {
                const modelId = path.basename(file, '.json');
                const metadata = await this.loadFromLocal(modelId);
                
                if (metadata) {
                    this.modelRegistry.set(modelId, metadata);
                }
            }
            
            console.log(`📁 Loaded ${jsonFiles.length} models from local storage`);
            
        } catch (error) {
            console.error('❌ Failed to load local metadata:', error);
        }
    }
    
    // ========== HFS Storage Operations ==========
    
    /**
     * Store metadata to Hedera HFS
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Metadata to store
     */
    async storeToHFS(modelId, metadata) {
        try {
            // Prepare HFS content
            const hfsContent = this.prepareHFSContent(modelId, metadata);
            
            // Compress if enabled
            const content = this.config.compressionEnabled ? 
                this.compressContent(hfsContent) : hfsContent;
            
            // Store to HFS
            let fileId;
            if (this.config.hfsModelFileId) {
                // Append to existing file
                await this.config.hederaService.appendToHFSFile(
                    this.config.hfsModelFileId,
                    content
                );
                fileId = this.config.hfsModelFileId;
            } else {
                // Create new file
                fileId = await this.config.hederaService.createHFSFile(
                    content,
                    { memo: `Model metadata for ${modelId}` }
                );
                this.config.hfsModelFileId = fileId;
            }
            
            this.metrics.hfsOperations++;
            
            console.log(`🔗 Stored metadata to HFS: ${fileId}`);
            
        } catch (error) {
            console.error('❌ Failed to store to HFS:', error);
            throw error;
        }
    }
    
    /**
     * Load metadata from HFS
     * @param {string} modelId - Model identifier
     * @returns {Promise<object|null>} Metadata
     */
    async loadFromHFS(modelId) {
        try {
            console.log(`🔗 Loading metadata from HFS for model: ${modelId}`);
            return null; // Placeholder
            
        } catch (error) {
            console.error('❌ Failed to load from HFS:', error);
            return null;
        }
    }
    
    // ========== Utility Methods ==========
    
    /**
     * Validate metadata structure
     * @param {object} metadata - Metadata to validate
     */
    validateMetadata(metadata) {
        const required = ['name', 'type', 'version'];
        const missing = required.filter(field => !metadata[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required metadata fields: ${missing.join(', ')}`);
        }
        
        if (metadata.type && !['neural_network', 'decision_tree', 'ensemble', 'transformer'].includes(metadata.type)) {
            console.warn(`⚠️ Unknown model type: ${metadata.type}`);
        }
    }
    
    /**
     * Generate version ID
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Metadata
     * @returns {string} Version ID
     */
    generateVersionId(modelId, metadata) {
        const data = `${modelId}-${metadata.version}-${Date.now()}-${JSON.stringify(metadata.parameters || {})}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
    
    /**
     * Prepare metadata entry
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Raw metadata
     * @param {string} versionId - Version ID
     * @param {object} options - Options
     * @returns {object} Prepared metadata entry
     */
    prepareMetadataEntry(modelId, metadata, versionId, options) {
        return {
            modelId: modelId,
            versionId: versionId,
            name: metadata.name,
            type: metadata.type,
            version: metadata.version,
            description: metadata.description || '',
            
            // Model architecture
            architecture: metadata.architecture || {},
            parameters: metadata.parameters || {},
            hyperparameters: metadata.hyperparameters || {},
            
            // Training information
            trainingData: this.config.includeTrainingData ? metadata.trainingData || {} : null,
            trainingConfig: metadata.trainingConfig || {},
            
            // Performance metrics
            performance: this.config.includePerformanceMetrics ? metadata.performance || {} : null,
            
            // Status and lifecycle
            status: metadata.status || 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            
            // Version control
            changes: metadata.changes || [],
            parentVersion: metadata.parentVersion || null,
            
            // Storage metadata
            size: this.calculateMetadataSize(metadata),
            checksum: this.calculateChecksum(metadata),
            
            // Additional metadata
            tags: metadata.tags || [],
            author: metadata.author || 'AION_AI_Agent',
            environment: process.env.NODE_ENV || 'development',
            
            // Custom fields
            ...metadata.custom
        };
    }
    
    /**
     * Update version history
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Metadata entry
     */
    async updateVersionHistory(modelId, metadata) {
        try {
            let history = this.versionHistory.get(modelId) || [];
            
            // Add new version
            history.push({
                versionId: metadata.versionId,
                version: metadata.version,
                createdAt: metadata.createdAt,
                changes: metadata.changes,
                performance: metadata.performance,
                size: metadata.size,
                checksum: metadata.checksum
            });
            
            // Limit history size
            if (history.length > this.config.maxVersions) {
                history = history.slice(-this.config.maxVersions);
            }
            
            this.versionHistory.set(modelId, history);
            this.metrics.totalVersions = Array.from(this.versionHistory.values())
                .reduce((total, versions) => total + versions.length, 0);
            
        } catch (error) {
            console.error('❌ Failed to update version history:', error);
        }
    }
    
    /**
     * Calculate metadata size
     * @param {object} metadata - Metadata
     * @returns {number} Size in bytes
     */
    calculateMetadataSize(metadata) {
        return Buffer.byteLength(JSON.stringify(metadata), 'utf8');
    }
    
    /**
     * Calculate metadata checksum
     * @param {object} metadata - Metadata
     * @returns {string} Checksum
     */
    calculateChecksum(metadata) {
        return crypto.createHash('md5').update(JSON.stringify(metadata)).digest('hex');
    }
    
    /**
     * Prepare content for HFS storage
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Metadata
     * @returns {Buffer} HFS content
     */
    prepareHFSContent(modelId, metadata) {
        const hfsEntry = {
            timestamp: Date.now(),
            modelId: modelId,
            metadata: metadata,
            version: '2.0.0'
        };
        
        return Buffer.from(JSON.stringify(hfsEntry), 'utf8');
    }
    
    /**
     * Compress content
     * @param {Buffer} content - Content to compress
     * @returns {Buffer} Compressed content
     */
    compressContent(content) {
        // Placeholder for compression logic
        const compressionRatio = content.length / (content.length * 0.7);
        this.performanceData.compressionRatios.push(compressionRatio);
        
        return content; // Return original for now
    }
    
    // ========== Caching ==========
    
    /**
     * Get cached metadata
     * @param {string} modelId - Model identifier
     * @returns {object|null} Cached metadata
     */
    getCachedMetadata(modelId) {
        const cached = this.metadataCache.get(modelId);
        
        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
            return cached.data;
        }
        
        this.metadataCache.delete(modelId);
        return null;
    }
    
    /**
     * Update cache
     * @param {string} modelId - Model identifier
     * @param {object} metadata - Metadata to cache
     */
    updateCache(modelId, metadata) {
        // Limit cache size
        if (this.metadataCache.size >= this.config.maxCacheSize) {
            const oldestKey = this.metadataCache.keys().next().value;
            this.metadataCache.delete(oldestKey);
        }
        
        this.metadataCache.set(modelId, {
            data: metadata,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.metadataCache.clear();
        console.log('🗑️ Metadata cache cleared');
    }
    
    // ========== Metrics and Monitoring ==========
    
    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        setInterval(() => {
            this.collectMetrics();
        }, this.config.metricsInterval);
        
        console.log(`📊 Metrics collection started (${this.config.metricsInterval}ms interval)`);
    }
    
    /**
     * Collect and emit metrics
     */
    collectMetrics() {
        const currentTime = Date.now();
        
        const metricsData = {
            ...this.metrics,
            timestamp: currentTime,
            cacheSize: this.metadataCache.size,
            registrySize: this.modelRegistry.size,
            versionHistorySize: this.versionHistory.size,
            performance: {
                averageRetrievalTime: this.calculateAverageTime(this.performanceData.retrievalTimes),
                averageStorageTime: this.calculateAverageTime(this.performanceData.storageTimes),
                averageCompressionRatio: this.calculateAverageRatio(this.performanceData.compressionRatios),
                cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?
                    (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0
            }
        };
        
        this.emit('metrics', metricsData);
    }
    
    /**
     * Calculate average time
     * @param {Array} times - Array of times
     * @returns {number} Average time
     */
    calculateAverageTime(times) {
        if (times.length === 0) return 0;
        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }
    
    /**
     * Calculate average ratio
     * @param {Array} ratios - Array of ratios
     * @returns {number} Average ratio
     */
    calculateAverageRatio(ratios) {
        if (ratios.length === 0) return 0;
        return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    }
    
    /**
     * Get current metrics
     * @returns {object} Current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.metadataCache.size,
            registrySize: this.modelRegistry.size,
            versionHistorySize: this.versionHistory.size,
            performance: {
                averageRetrievalTime: this.calculateAverageTime(this.performanceData.retrievalTimes),
                averageStorageTime: this.calculateAverageTime(this.performanceData.storageTimes),
                cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?
                    (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0
            }
        };
    }
    
    /**
     * Get service status
     * @returns {object} Service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            configuration: {
                enableHFSStorage: this.config.enableHFSStorage,
                enableLocalStorage: this.config.enableLocalStorage,
                enableVersionControl: this.config.enableVersionControl,
                enableCaching: this.config.enableCaching,
                maxVersions: this.config.maxVersions
            },
            metrics: this.getMetrics(),
            health: {
                hederaConnected: this.config.hederaService ? this.config.hederaService.isConnected : false,
                localStorageAccessible: this.config.enableLocalStorage,
                cacheHealthy: this.metadataCache.size < this.config.maxCacheSize
            }
        };
    }
    
    /**
     * Gracefully shutdown the manager
     */
    async shutdown() {
        try {
            console.log('🛑 Shutting down Model Metadata Manager...');
            
            // Save current state to local storage
            if (this.config.enableLocalStorage) {
                for (const [modelId, metadata] of this.modelRegistry) {
                    await this.storeLocally(modelId, metadata);
                }
            }
            
            // Clear data structures
            this.modelRegistry.clear();
            this.versionHistory.clear();
            this.metadataCache.clear();
            
            this.isInitialized = false;
            this.emit('shutdown', { timestamp: Date.now() });
            
            console.log('✅ Model Metadata Manager shutdown complete');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            throw error;
        }
    }
}

export default ModelMetadataManager;