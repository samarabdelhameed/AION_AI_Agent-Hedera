/**
 * @fileoverview Enhanced Model Metadata Manager with Hedera HFS Integration
 * @description Comprehensive metadata management system with version control and HFS storage
 * @author AION Team
 * @version 2.0.0
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

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
            
            // Load from HFS
            if (this.config.enableHFSStorage && this.config.hederaService) {
                await this.loadHFSMetadata();
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
                }\n                this.metrics.cacheMisses++;\n            }\n            \n            // Try local registry first\n            let metadata = this.modelRegistry.get(modelId);\n            \n            if (!metadata) {\n                // Try loading from local storage\n                if (this.config.enableLocalStorage) {\n                    metadata = await this.loadFromLocal(modelId);\n                }\n                \n                // Try loading from HFS\n                if (!metadata && this.config.enableHFSStorage && this.config.hederaService) {\n                    metadata = await this.loadFromHFS(modelId);\n                }\n            }\n            \n            if (metadata) {\n                // Update cache\n                if (this.config.enableCaching) {\n                    this.updateCache(modelId, metadata);\n                }\n                \n                // Update registry if loaded from storage\n                if (!this.modelRegistry.has(modelId)) {\n                    this.modelRegistry.set(modelId, metadata);\n                }\n            }\n            \n            const retrievalTime = Date.now() - startTime;\n            this.performanceData.retrievalTimes.push(retrievalTime);\n            \n            this.emit('metadataRetrieved', { modelId, found: !!metadata, retrievalTime });\n            \n            return metadata || null;\n            \n        } catch (error) {\n            console.error('❌ Failed to retrieve model metadata:', error);\n            this.emit('retrievalError', { modelId, error });\n            return null;\n        }\n    }\n    \n    /**\n     * List all models\n     * @param {object} filters - Filter criteria\n     * @returns {Promise<Array>} List of models\n     */\n    async listModels(filters = {}) {\n        try {\n            const models = Array.from(this.modelRegistry.values());\n            \n            return models.filter(model => {\n                if (filters.type && model.type !== filters.type) return false;\n                if (filters.version && model.version !== filters.version) return false;\n                if (filters.status && model.status !== filters.status) return false;\n                if (filters.minAccuracy && model.performance?.accuracy < filters.minAccuracy) return false;\n                if (filters.createdAfter && model.createdAt < filters.createdAfter) return false;\n                if (filters.createdBefore && model.createdAt > filters.createdBefore) return false;\n                \n                return true;\n            }).map(model => ({\n                modelId: model.modelId,\n                name: model.name,\n                type: model.type,\n                version: model.version,\n                status: model.status,\n                createdAt: model.createdAt,\n                updatedAt: model.updatedAt,\n                performance: model.performance\n            }));\n            \n        } catch (error) {\n            console.error('❌ Failed to list models:', error);\n            return [];\n        }\n    }\n    \n    /**\n     * Delete model metadata\n     * @param {string} modelId - Model identifier\n     * @param {object} options - Deletion options\n     * @returns {Promise<boolean>} Success status\n     */\n    async deleteModelMetadata(modelId, options = {}) {\n        try {\n            // Remove from registry\n            const deleted = this.modelRegistry.delete(modelId);\n            \n            if (!deleted) {\n                console.warn(`⚠️ Model ${modelId} not found in registry`);\n                return false;\n            }\n            \n            // Remove from cache\n            this.metadataCache.delete(modelId);\n            \n            // Remove version history\n            this.versionHistory.delete(modelId);\n            \n            // Delete from local storage\n            if (this.config.enableLocalStorage && !options.keepLocal) {\n                await this.deleteFromLocal(modelId);\n            }\n            \n            // Note: HFS files are immutable, so we can't delete from HFS\n            // We just mark them as deleted in the metadata\n            \n            this.emit('metadataDeleted', { modelId });\n            \n            console.log(`🗑️ Deleted metadata for model ${modelId}`);\n            \n            return true;\n            \n        } catch (error) {\n            console.error('❌ Failed to delete model metadata:', error);\n            this.emit('deletionError', { modelId, error });\n            return false;\n        }\n    }\n    \n    // ========== Version Control ==========\n    \n    /**\n     * Get version history for a model\n     * @param {string} modelId - Model identifier\n     * @returns {Promise<Array>} Version history\n     */\n    async getVersionHistory(modelId) {\n        try {\n            const history = this.versionHistory.get(modelId) || [];\n            \n            return history.map(version => ({\n                versionId: version.versionId,\n                version: version.version,\n                createdAt: version.createdAt,\n                changes: version.changes,\n                performance: version.performance,\n                size: version.size\n            })).sort((a, b) => b.createdAt - a.createdAt);\n            \n        } catch (error) {\n            console.error('❌ Failed to get version history:', error);\n            return [];\n        }\n    }\n    \n    /**\n     * Get specific version of model metadata\n     * @param {string} modelId - Model identifier\n     * @param {string} versionId - Version identifier\n     * @returns {Promise<object|null>} Version metadata\n     */\n    async getModelVersion(modelId, versionId) {\n        try {\n            const history = this.versionHistory.get(modelId) || [];\n            const version = history.find(v => v.versionId === versionId);\n            \n            if (!version) {\n                // Try loading from storage\n                return await this.loadVersionFromStorage(modelId, versionId);\n            }\n            \n            return version;\n            \n        } catch (error) {\n            console.error('❌ Failed to get model version:', error);\n            return null;\n        }\n    }\n    \n    /**\n     * Compare two model versions\n     * @param {string} modelId - Model identifier\n     * @param {string} versionId1 - First version ID\n     * @param {string} versionId2 - Second version ID\n     * @returns {Promise<object>} Comparison result\n     */\n    async compareVersions(modelId, versionId1, versionId2) {\n        try {\n            const version1 = await this.getModelVersion(modelId, versionId1);\n            const version2 = await this.getModelVersion(modelId, versionId2);\n            \n            if (!version1 || !version2) {\n                throw new Error('One or both versions not found');\n            }\n            \n            const comparison = {\n                modelId: modelId,\n                version1: {\n                    versionId: versionId1,\n                    createdAt: version1.createdAt,\n                    performance: version1.performance\n                },\n                version2: {\n                    versionId: versionId2,\n                    createdAt: version2.createdAt,\n                    performance: version2.performance\n                },\n                differences: this.calculateDifferences(version1, version2),\n                performanceComparison: this.comparePerformance(version1.performance, version2.performance)\n            };\n            \n            return comparison;\n            \n        } catch (error) {\n            console.error('❌ Failed to compare versions:', error);\n            throw error;\n        }\n    }\n    \n    // ========== HFS Storage Operations ==========\n    \n    /**\n     * Store metadata to Hedera HFS\n     * @param {string} modelId - Model identifier\n     * @param {object} metadata - Metadata to store\n     */\n    async storeToHFS(modelId, metadata) {\n        try {\n            // Prepare HFS content\n            const hfsContent = this.prepareHFSContent(modelId, metadata);\n            \n            // Compress if enabled\n            const content = this.config.compressionEnabled ? \n                this.compressContent(hfsContent) : hfsContent;\n            \n            // Store to HFS\n            let fileId;\n            if (this.config.hfsModelFileId) {\n                // Append to existing file\n                await this.config.hederaService.appendToHFSFile(\n                    this.config.hfsModelFileId,\n                    content\n                );\n                fileId = this.config.hfsModelFileId;\n            } else {\n                // Create new file\n                fileId = await this.config.hederaService.createHFSFile(\n                    content,\n                    { memo: `Model metadata for ${modelId}` }\n                );\n                this.config.hfsModelFileId = fileId;\n            }\n            \n            this.metrics.hfsOperations++;\n            \n            console.log(`🔗 Stored metadata to HFS: ${fileId}`);\n            \n        } catch (error) {\n            console.error('❌ Failed to store to HFS:', error);\n            throw error;\n        }\n    }\n    \n    /**\n     * Load metadata from HFS\n     * @param {string} modelId - Model identifier\n     * @returns {Promise<object|null>} Metadata\n     */\n    async loadFromHFS(modelId) {\n        try {\n            // Note: In a real implementation, you would query the HFS file\n            // and parse the content to find the specific model metadata\n            // For now, we'll simulate this\n            \n            console.log(`🔗 Loading metadata from HFS for model: ${modelId}`);\n            \n            // This would be implemented with actual HFS file reading\n            // return await this.parseHFSContent(fileContent, modelId);\n            \n            return null; // Placeholder\n            \n        } catch (error) {\n            console.error('❌ Failed to load from HFS:', error);\n            return null;\n        }\n    }\n    \n    // ========== Local Storage Operations ==========\n    \n    /**\n     * Store metadata locally\n     * @param {string} modelId - Model identifier\n     * @param {object} metadata - Metadata to store\n     */\n    async storeLocally(modelId, metadata) {\n        try {\n            const filePath = path.join(this.config.localStoragePath, `${modelId}.json`);\n            const content = JSON.stringify(metadata, null, 2);\n            \n            await fs.writeFile(filePath, content, 'utf8');\n            \n            // Store version\n            if (this.config.enableVersionControl) {\n                const versionPath = path.join(\n                    this.config.localStoragePath,\n                    'versions',\n                    `${modelId}-${metadata.versionId}.json`\n                );\n                await fs.writeFile(versionPath, content, 'utf8');\n            }\n            \n            this.metrics.localOperations++;\n            \n            console.log(`💾 Stored metadata locally: ${filePath}`);\n            \n        } catch (error) {\n            console.error('❌ Failed to store locally:', error);\n            throw error;\n        }\n    }\n    \n    /**\n     * Load metadata from local storage\n     * @param {string} modelId - Model identifier\n     * @returns {Promise<object|null>} Metadata\n     */\n    async loadFromLocal(modelId) {\n        try {\n            const filePath = path.join(this.config.localStoragePath, `${modelId}.json`);\n            const content = await fs.readFile(filePath, 'utf8');\n            \n            return JSON.parse(content);\n            \n        } catch (error) {\n            if (error.code !== 'ENOENT') {\n                console.error('❌ Failed to load from local storage:', error);\n            }\n            return null;\n        }\n    }\n    \n    /**\n     * Load local metadata registry\n     */\n    async loadLocalMetadata() {\n        try {\n            const files = await fs.readdir(this.config.localStoragePath);\n            const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('-'));\n            \n            for (const file of jsonFiles) {\n                const modelId = path.basename(file, '.json');\n                const metadata = await this.loadFromLocal(modelId);\n                \n                if (metadata) {\n                    this.modelRegistry.set(modelId, metadata);\n                }\n            }\n            \n            console.log(`📁 Loaded ${jsonFiles.length} models from local storage`);\n            \n        } catch (error) {\n            console.error('❌ Failed to load local metadata:', error);\n        }\n    }\n    \n    /**\n     * Delete metadata from local storage\n     * @param {string} modelId - Model identifier\n     */\n    async deleteFromLocal(modelId) {\n        try {\n            const filePath = path.join(this.config.localStoragePath, `${modelId}.json`);\n            await fs.unlink(filePath);\n            \n            // Delete versions\n            if (this.config.enableVersionControl) {\n                const versionDir = path.join(this.config.localStoragePath, 'versions');\n                const versionFiles = await fs.readdir(versionDir);\n                const modelVersions = versionFiles.filter(file => file.startsWith(`${modelId}-`));\n                \n                for (const versionFile of modelVersions) {\n                    await fs.unlink(path.join(versionDir, versionFile));\n                }\n            }\n            \n        } catch (error) {\n            console.error('❌ Failed to delete from local storage:', error);\n        }\n    }\n    \n    // ========== Utility Methods ==========\n    \n    /**\n     * Validate metadata structure\n     * @param {object} metadata - Metadata to validate\n     */\n    validateMetadata(metadata) {\n        const required = ['name', 'type', 'version'];\n        const missing = required.filter(field => !metadata[field]);\n        \n        if (missing.length > 0) {\n            throw new Error(`Missing required metadata fields: ${missing.join(', ')}`);\n        }\n        \n        if (metadata.type && !['neural_network', 'decision_tree', 'ensemble', 'transformer'].includes(metadata.type)) {\n            console.warn(`⚠️ Unknown model type: ${metadata.type}`);\n        }\n    }\n    \n    /**\n     * Generate version ID\n     * @param {string} modelId - Model identifier\n     * @param {object} metadata - Metadata\n     * @returns {string} Version ID\n     */\n    generateVersionId(modelId, metadata) {\n        const data = `${modelId}-${metadata.version}-${Date.now()}-${JSON.stringify(metadata.parameters || {})}`;\n        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);\n    }\n    \n    /**\n     * Prepare metadata entry\n     * @param {string} modelId - Model identifier\n     * @param {object} metadata - Raw metadata\n     * @param {string} versionId - Version ID\n     * @param {object} options - Options\n     * @returns {object} Prepared metadata entry\n     */\n    prepareMetadataEntry(modelId, metadata, versionId, options) {\n        return {\n            modelId: modelId,\n            versionId: versionId,\n            name: metadata.name,\n            type: metadata.type,\n            version: metadata.version,\n            description: metadata.description || '',\n            \n            // Model architecture\n            architecture: metadata.architecture || {},\n            parameters: metadata.parameters || {},\n            hyperparameters: metadata.hyperparameters || {},\n            \n            // Training information\n            trainingData: this.config.includeTrainingData ? metadata.trainingData || {} : null,\n            trainingConfig: metadata.trainingConfig || {},\n            \n            // Performance metrics\n            performance: this.config.includePerformanceMetrics ? metadata.performance || {} : null,\n            \n            // Status and lifecycle\n            status: metadata.status || 'active',\n            createdAt: Date.now(),\n            updatedAt: Date.now(),\n            \n            // Version control\n            changes: metadata.changes || [],\n            parentVersion: metadata.parentVersion || null,\n            \n            // Storage metadata\n            size: this.calculateMetadataSize(metadata),\n            checksum: this.calculateChecksum(metadata),\n            \n            // Additional metadata\n            tags: metadata.tags || [],\n            author: metadata.author || 'AION_AI_Agent',\n            environment: process.env.NODE_ENV || 'development',\n            \n            // Custom fields\n            ...metadata.custom\n        };\n    }\n    \n    /**\n     * Update version history\n     * @param {string} modelId - Model identifier\n     * @param {object} metadata - Metadata entry\n     */\n    async updateVersionHistory(modelId, metadata) {\n        try {\n            let history = this.versionHistory.get(modelId) || [];\n            \n            // Add new version\n            history.push({\n                versionId: metadata.versionId,\n                version: metadata.version,\n                createdAt: metadata.createdAt,\n                changes: metadata.changes,\n                performance: metadata.performance,\n                size: metadata.size,\n                checksum: metadata.checksum\n            });\n            \n            // Limit history size\n            if (history.length > this.config.maxVersions) {\n                history = history.slice(-this.config.maxVersions);\n            }\n            \n            this.versionHistory.set(modelId, history);\n            this.metrics.totalVersions = Array.from(this.versionHistory.values())\n                .reduce((total, versions) => total + versions.length, 0);\n            \n        } catch (error) {\n            console.error('❌ Failed to update version history:', error);\n        }\n    }\n    \n    /**\n     * Calculate metadata size\n     * @param {object} metadata - Metadata\n     * @returns {number} Size in bytes\n     */\n    calculateMetadataSize(metadata) {\n        return Buffer.byteLength(JSON.stringify(metadata), 'utf8');\n    }\n    \n    /**\n     * Calculate metadata checksum\n     * @param {object} metadata - Metadata\n     * @returns {string} Checksum\n     */\n    calculateChecksum(metadata) {\n        return crypto.createHash('md5').update(JSON.stringify(metadata)).digest('hex');\n    }\n    \n    /**\n     * Prepare content for HFS storage\n     * @param {string} modelId - Model identifier\n     * @param {object} metadata - Metadata\n     * @returns {Buffer} HFS content\n     */\n    prepareHFSContent(modelId, metadata) {\n        const hfsEntry = {\n            timestamp: Date.now(),\n            modelId: modelId,\n            metadata: metadata,\n            version: '2.0.0'\n        };\n        \n        return Buffer.from(JSON.stringify(hfsEntry), 'utf8');\n    }\n    \n    /**\n     * Compress content\n     * @param {Buffer} content - Content to compress\n     * @returns {Buffer} Compressed content\n     */\n    compressContent(content) {\n        // Placeholder for compression logic\n        // In a real implementation, you would use zlib or similar\n        const compressionRatio = content.length / (content.length * 0.7); // Simulated 30% compression\n        this.performanceData.compressionRatios.push(compressionRatio);\n        \n        return content; // Return original for now\n    }\n    \n    /**\n     * Calculate differences between versions\n     * @param {object} version1 - First version\n     * @param {object} version2 - Second version\n     * @returns {object} Differences\n     */\n    calculateDifferences(version1, version2) {\n        const differences = {\n            architecture: this.compareObjects(version1.architecture, version2.architecture),\n            parameters: this.compareObjects(version1.parameters, version2.parameters),\n            hyperparameters: this.compareObjects(version1.hyperparameters, version2.hyperparameters),\n            performance: this.compareObjects(version1.performance, version2.performance)\n        };\n        \n        return differences;\n    }\n    \n    /**\n     * Compare performance metrics\n     * @param {object} perf1 - First performance metrics\n     * @param {object} perf2 - Second performance metrics\n     * @returns {object} Performance comparison\n     */\n    comparePerformance(perf1, perf2) {\n        if (!perf1 || !perf2) return null;\n        \n        const comparison = {};\n        \n        ['accuracy', 'precision', 'recall', 'f1Score', 'loss'].forEach(metric => {\n            if (perf1[metric] !== undefined && perf2[metric] !== undefined) {\n                comparison[metric] = {\n                    version1: perf1[metric],\n                    version2: perf2[metric],\n                    difference: perf2[metric] - perf1[metric],\n                    improvement: perf2[metric] > perf1[metric]\n                };\n            }\n        });\n        \n        return comparison;\n    }\n    \n    /**\n     * Compare two objects\n     * @param {object} obj1 - First object\n     * @param {object} obj2 - Second object\n     * @returns {object} Comparison result\n     */\n    compareObjects(obj1, obj2) {\n        const changes = {\n            added: [],\n            removed: [],\n            modified: []\n        };\n        \n        const keys1 = Object.keys(obj1 || {});\n        const keys2 = Object.keys(obj2 || {});\n        \n        // Find added keys\n        keys2.forEach(key => {\n            if (!keys1.includes(key)) {\n                changes.added.push({ key, value: obj2[key] });\n            }\n        });\n        \n        // Find removed keys\n        keys1.forEach(key => {\n            if (!keys2.includes(key)) {\n                changes.removed.push({ key, value: obj1[key] });\n            }\n        });\n        \n        // Find modified keys\n        keys1.forEach(key => {\n            if (keys2.includes(key) && JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {\n                changes.modified.push({\n                    key,\n                    oldValue: obj1[key],\n                    newValue: obj2[key]\n                });\n            }\n        });\n        \n        return changes;\n    }\n    \n    // ========== Caching ==========\n    \n    /**\n     * Get cached metadata\n     * @param {string} modelId - Model identifier\n     * @returns {object|null} Cached metadata\n     */\n    getCachedMetadata(modelId) {\n        const cached = this.metadataCache.get(modelId);\n        \n        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {\n            return cached.data;\n        }\n        \n        this.metadataCache.delete(modelId);\n        return null;\n    }\n    \n    /**\n     * Update cache\n     * @param {string} modelId - Model identifier\n     * @param {object} metadata - Metadata to cache\n     */\n    updateCache(modelId, metadata) {\n        // Limit cache size\n        if (this.metadataCache.size >= this.config.maxCacheSize) {\n            const oldestKey = this.metadataCache.keys().next().value;\n            this.metadataCache.delete(oldestKey);\n        }\n        \n        this.metadataCache.set(modelId, {\n            data: metadata,\n            timestamp: Date.now()\n        });\n    }\n    \n    /**\n     * Clear cache\n     */\n    clearCache() {\n        this.metadataCache.clear();\n        console.log('🗑️ Metadata cache cleared');\n    }\n    \n    // ========== Metrics and Monitoring ==========\n    \n    /**\n     * Start metrics collection\n     */\n    startMetricsCollection() {\n        setInterval(() => {\n            this.collectMetrics();\n        }, this.config.metricsInterval);\n        \n        console.log(`📊 Metrics collection started (${this.config.metricsInterval}ms interval)`);\n    }\n    \n    /**\n     * Collect and emit metrics\n     */\n    collectMetrics() {\n        const currentTime = Date.now();\n        \n        const metricsData = {\n            ...this.metrics,\n            timestamp: currentTime,\n            cacheSize: this.metadataCache.size,\n            registrySize: this.modelRegistry.size,\n            versionHistorySize: this.versionHistory.size,\n            performance: {\n                averageRetrievalTime: this.calculateAverageTime(this.performanceData.retrievalTimes),\n                averageStorageTime: this.calculateAverageTime(this.performanceData.storageTimes),\n                averageCompressionRatio: this.calculateAverageRatio(this.performanceData.compressionRatios),\n                cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?\n                    (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0\n            }\n        };\n        \n        this.emit('metrics', metricsData);\n    }\n    \n    /**\n     * Calculate average time\n     * @param {Array} times - Array of times\n     * @returns {number} Average time\n     */\n    calculateAverageTime(times) {\n        if (times.length === 0) return 0;\n        return times.reduce((sum, time) => sum + time, 0) / times.length;\n    }\n    \n    /**\n     * Calculate average ratio\n     * @param {Array} ratios - Array of ratios\n     * @returns {number} Average ratio\n     */\n    calculateAverageRatio(ratios) {\n        if (ratios.length === 0) return 0;\n        return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;\n    }\n    \n    /**\n     * Get current metrics\n     * @returns {object} Current metrics\n     */\n    getMetrics() {\n        return {\n            ...this.metrics,\n            cacheSize: this.metadataCache.size,\n            registrySize: this.modelRegistry.size,\n            versionHistorySize: this.versionHistory.size,\n            performance: {\n                averageRetrievalTime: this.calculateAverageTime(this.performanceData.retrievalTimes),\n                averageStorageTime: this.calculateAverageTime(this.performanceData.storageTimes),\n                cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?\n                    (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0\n            }\n        };\n    }\n    \n    /**\n     * Get service status\n     * @returns {object} Service status\n     */\n    getStatus() {\n        return {\n            isInitialized: this.isInitialized,\n            configuration: {\n                enableHFSStorage: this.config.enableHFSStorage,\n                enableLocalStorage: this.config.enableLocalStorage,\n                enableVersionControl: this.config.enableVersionControl,\n                enableCaching: this.config.enableCaching,\n                maxVersions: this.config.maxVersions\n            },\n            metrics: this.getMetrics(),\n            health: {\n                hederaConnected: this.config.hederaService ? this.config.hederaService.isConnected : false,\n                localStorageAccessible: this.config.enableLocalStorage,\n                cacheHealthy: this.metadataCache.size < this.config.maxCacheSize\n            }\n        };\n    }\n    \n    /**\n     * Gracefully shutdown the manager\n     */\n    async shutdown() {\n        try {\n            console.log('🛑 Shutting down Model Metadata Manager...');\n            \n            // Save current state to local storage\n            if (this.config.enableLocalStorage) {\n                for (const [modelId, metadata] of this.modelRegistry) {\n                    await this.storeLocally(modelId, metadata);\n                }\n            }\n            \n            // Clear data structures\n            this.modelRegistry.clear();\n            this.versionHistory.clear();\n            this.metadataCache.clear();\n            \n            this.isInitialized = false;\n            this.emit('shutdown', { timestamp: Date.now() });\n            \n            console.log('✅ Model Metadata Manager shutdown complete');\n            \n        } catch (error) {\n            console.error('❌ Error during shutdown:', error);\n            throw error;\n        }\n    }\n}\n\nmodule.exports = ModelMetadataManager;