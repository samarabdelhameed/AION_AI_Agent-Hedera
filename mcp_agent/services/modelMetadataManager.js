import HederaService from './hederaService.js';
import { FileContentsQuery, FileInfoQuery } from '@hashgraph/sdk';

/**
 * Model Metadata Manager Service
 * Manages AI model metadata storage on HFS with versioning and caching
 */
class ModelMetadataManager {
    constructor() {
        this.hederaService = new HederaService();
        this.modelCache = new Map(); // Local cache for model metadata
        this.versionHistory = new Map(); // Version history tracking
        this.currentModelVersion = null;
        this.initialized = false;
    }

    /**
     * Initialize the model metadata manager
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Model Metadata Manager...');
            
            // Initialize Hedera service
            await this.hederaService.initialize();
            
            // Load existing model versions from cache file if exists
            await this.loadVersionHistory();
            
            this.initialized = true;
            console.log('✅ Model Metadata Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Model Metadata Manager:', error);
            throw error;
        }
    }

    /**
     * Store new model metadata on HFS
     */
    async storeModelMetadata(modelData) {
        if (!this.initialized) {
            throw new Error('Model Metadata Manager not initialized');
        }

        try {
            console.log(`💾 Storing model metadata version: ${modelData.version}`);

            // Validate model data
            this.validateModelData(modelData);

            // Prepare comprehensive metadata
            const metadata = this.prepareModelMetadata(modelData);

            // Store on HFS using Hedera service
            const hfsResult = await this.hederaService.storeModelWithRetry(metadata, 3, 2000);

            // Update version history
            const versionInfo = {
                version: metadata.version,
                fileId: hfsResult.fileId,
                checksum: hfsResult.checksum,
                timestamp: hfsResult.timestamp,
                size: hfsResult.size || 0,
                previousVersion: this.currentModelVersion,
                metadata: metadata
            };

            this.versionHistory.set(metadata.version, versionInfo);
            this.currentModelVersion = metadata.version;

            // Cache the metadata locally
            this.modelCache.set(hfsResult.fileId, metadata);
            this.modelCache.set(`version:${metadata.version}`, metadata);

            // Save version history to persistent storage
            await this.saveVersionHistory();

            console.log(`✅ Model metadata stored successfully: ${hfsResult.fileId}`);

            return {
                success: true,
                version: metadata.version,
                fileId: hfsResult.fileId,
                checksum: hfsResult.checksum,
                timestamp: hfsResult.timestamp,
                previousVersion: versionInfo.previousVersion
            };
        } catch (error) {
            console.error('❌ Failed to store model metadata:', error);
            throw error;
        }
    }

    /**
     * Retrieve model metadata from HFS with caching
     */
    async retrieveModelMetadata(fileId, useCache = true) {
        if (!this.initialized) {
            throw new Error('Model Metadata Manager not initialized');
        }

        try {
            // Check cache first if enabled
            if (useCache && this.modelCache.has(fileId)) {
                console.log(`📋 Retrieved model metadata from cache: ${fileId}`);
                return {
                    success: true,
                    source: 'cache',
                    metadata: this.modelCache.get(fileId)
                };
            }

            console.log(`📁 Retrieving model metadata from HFS: ${fileId}`);

            // Retrieve from HFS
            const fileContents = await this.hederaService.client.query(
                new FileContentsQuery().setFileId(fileId)
            );

            const metadata = JSON.parse(fileContents.toString());

            // Validate retrieved metadata
            this.validateRetrievedMetadata(metadata);

            // Update cache
            this.modelCache.set(fileId, metadata);
            if (metadata.version) {
                this.modelCache.set(`version:${metadata.version}`, metadata);
            }

            console.log(`✅ Model metadata retrieved successfully: ${metadata.version}`);

            return {
                success: true,
                source: 'hfs',
                metadata: metadata,
                fileId: fileId
            };
        } catch (error) {
            console.error(`❌ Failed to retrieve model metadata from ${fileId}:`, error);
            throw error;
        }
    }

    /**
     * Get current model version metadata
     */
    async getCurrentModelMetadata() {
        if (!this.currentModelVersion) {
            throw new Error('No current model version available');
        }

        const versionInfo = this.versionHistory.get(this.currentModelVersion);
        if (!versionInfo) {
            throw new Error(`Version info not found for: ${this.currentModelVersion}`);
        }

        return await this.retrieveModelMetadata(versionInfo.fileId);
    }

    /**
     * Get model metadata by version
     */
    async getModelMetadataByVersion(version) {
        const versionInfo = this.versionHistory.get(version);
        if (!versionInfo) {
            throw new Error(`Model version not found: ${version}`);
        }

        return await this.retrieveModelMetadata(versionInfo.fileId);
    }

    /**
     * Get HFS file ID for current model (for HCS logging)
     */
    getCurrentModelFileId() {
        if (!this.currentModelVersion) {
            return null;
        }

        const versionInfo = this.versionHistory.get(this.currentModelVersion);
        return versionInfo ? versionInfo.fileId : null;
    }

    /**
     * Get model reference for HCS decision logs
     */
    getModelReferenceForHCS() {
        const fileId = this.getCurrentModelFileId();
        const versionInfo = this.versionHistory.get(this.currentModelVersion);

        if (!fileId || !versionInfo) {
            return null;
        }

        return {
            hfsFileId: fileId,
            version: this.currentModelVersion,
            checksum: versionInfo.checksum,
            timestamp: versionInfo.timestamp
        };
    }

    /**
     * Prepare comprehensive model metadata
     */
    prepareModelMetadata(modelData) {
        const timestamp = Date.now();
        
        return {
            // Version information
            version: modelData.version || this.generateVersionNumber(),
            previousVersion: this.currentModelVersion,
            createdAt: timestamp,
            
            // Model architecture
            architecture: {
                type: modelData.architecture?.type || 'neural_network',
                layers: modelData.architecture?.layers || [],
                parameters: modelData.architecture?.parameters || {},
                framework: modelData.architecture?.framework || 'tensorflow'
            },
            
            // Training information
            training: {
                dataset: {
                    name: modelData.training?.dataset?.name || 'defi_market_data',
                    size: modelData.training?.dataset?.size || 0,
                    features: modelData.training?.dataset?.features || [],
                    startDate: modelData.training?.dataset?.startDate,
                    endDate: modelData.training?.dataset?.endDate,
                    hash: modelData.training?.dataset?.hash
                },
                hyperparameters: {
                    learningRate: modelData.training?.hyperparameters?.learningRate || 0.001,
                    epochs: modelData.training?.hyperparameters?.epochs || 100,
                    batchSize: modelData.training?.hyperparameters?.batchSize || 32,
                    optimizer: modelData.training?.hyperparameters?.optimizer || 'adam',
                    lossFunction: modelData.training?.hyperparameters?.lossFunction || 'mse'
                },
                duration: modelData.training?.duration || 0,
                computeResources: modelData.training?.computeResources || {}
            },
            
            // Performance metrics
            performance: {
                accuracy: modelData.performance?.accuracy || 0,
                precision: modelData.performance?.precision || 0,
                recall: modelData.performance?.recall || 0,
                f1Score: modelData.performance?.f1Score || 0,
                auc: modelData.performance?.auc || 0,
                
                // DeFi-specific metrics
                backtestReturn: modelData.performance?.backtestReturn || 0,
                sharpeRatio: modelData.performance?.sharpeRatio || 0,
                maxDrawdown: modelData.performance?.maxDrawdown || 0,
                winRate: modelData.performance?.winRate || 0,
                avgReturn: modelData.performance?.avgReturn || 0,
                
                // Validation metrics
                crossValidationScore: modelData.performance?.crossValidationScore || 0,
                validationMethod: modelData.performance?.validationMethod || 'k_fold',
                testSetSize: modelData.performance?.testSetSize || 0.2
            },
            
            // Feature importance
            features: {
                inputFeatures: modelData.features?.inputFeatures || [],
                featureImportance: modelData.features?.featureImportance || {},
                engineeredFeatures: modelData.features?.engineeredFeatures || []
            },
            
            // Model artifacts
            artifacts: {
                modelSize: modelData.artifacts?.modelSize || 0,
                weightsChecksum: modelData.artifacts?.weightsChecksum,
                configChecksum: modelData.artifacts?.configChecksum,
                exportFormat: modelData.artifacts?.exportFormat || 'tensorflow_saved_model'
            },
            
            // Deployment information
            deployment: {
                environment: modelData.deployment?.environment || 'production',
                deployedAt: timestamp,
                deployedBy: modelData.deployment?.deployedBy || 'AION_AI_Agent',
                version: modelData.deployment?.version || '1.0.0',
                status: 'active'
            },
            
            // Compliance and audit
            compliance: {
                dataPrivacy: modelData.compliance?.dataPrivacy || 'compliant',
                auditTrail: modelData.compliance?.auditTrail || [],
                approvals: modelData.compliance?.approvals || [],
                riskAssessment: modelData.compliance?.riskAssessment || 'low'
            },
            
            // Metadata
            metadata: {
                creator: modelData.metadata?.creator || 'AION_AI_System',
                description: modelData.metadata?.description || 'AI model for DeFi yield optimization',
                tags: modelData.metadata?.tags || ['defi', 'ai', 'yield_optimization'],
                license: modelData.metadata?.license || 'proprietary',
                checksum: this.generateMetadataChecksum(modelData)
            }
        };
    }

    /**
     * Validate model data before storage
     */
    validateModelData(modelData) {
        const required = ['version'];
        const missing = required.filter(field => !modelData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required model data fields: ${missing.join(', ')}`);
        }

        // Validate version format
        if (!/^v?\d+\.\d+\.\d+/.test(modelData.version)) {
            throw new Error(`Invalid version format: ${modelData.version}`);
        }
    }

    /**
     * Validate retrieved metadata
     */
    validateRetrievedMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Invalid metadata format');
        }

        if (!metadata.version) {
            throw new Error('Metadata missing version information');
        }

        if (!metadata.metadata?.checksum) {
            console.warn('⚠️ Metadata missing checksum - integrity cannot be verified');
        }
    }

    /**
     * Generate version number
     */
    generateVersionNumber() {
        const now = new Date();
        const major = now.getFullYear() - 2023; // Start from 2024 = v1
        const minor = now.getMonth() + 1;
        const patch = now.getDate();
        return `v${major}.${minor}.${patch}`;
    }

    /**
     * Generate metadata checksum
     */
    generateMetadataChecksum(modelData) {
        const crypto = require('crypto');
        const checksumInput = JSON.stringify({
            version: modelData.version,
            architecture: modelData.architecture,
            performance: modelData.performance,
            training: modelData.training
        });
        return crypto.createHash('sha256').update(checksumInput).digest('hex');
    }

    /**
     * Get version history
     */
    getVersionHistory() {
        return Array.from(this.versionHistory.entries()).map(([version, info]) => ({
            version,
            fileId: info.fileId,
            timestamp: info.timestamp,
            checksum: info.checksum,
            size: info.size,
            previousVersion: info.previousVersion
        }));
    }

    /**
     * Get model statistics
     */
    getStatistics() {
        const versions = this.getVersionHistory();
        const cacheSize = this.modelCache.size;
        
        return {
            totalVersions: versions.length,
            currentVersion: this.currentModelVersion,
            cacheSize: cacheSize,
            latestVersion: versions.length > 0 ? versions[versions.length - 1] : null,
            hederaServiceStatus: this.hederaService.getStatus()
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.modelCache.clear();
        console.log('🗑️ Model metadata cache cleared');
    }

    /**
     * Load version history from persistent storage
     */
    async loadVersionHistory() {
        try {
            // In a production environment, this would load from a persistent store
            // For now, we'll initialize empty
            console.log('📋 Loading version history...');
            
            // TODO: Implement persistent storage loading
            // This could be from a local file, database, or another HFS file
            
            console.log('✅ Version history loaded');
        } catch (error) {
            console.warn('⚠️ Could not load version history:', error.message);
        }
    }

    /**
     * Save version history to persistent storage
     */
    async saveVersionHistory() {
        try {
            // In a production environment, this would save to a persistent store
            console.log('💾 Saving version history...');
            
            const historyData = {
                currentVersion: this.currentModelVersion,
                versions: Object.fromEntries(this.versionHistory),
                lastUpdated: Date.now()
            };
            
            // TODO: Implement persistent storage saving
            // This could be to a local file, database, or another HFS file
            
            console.log('✅ Version history saved');
        } catch (error) {
            console.warn('⚠️ Could not save version history:', error.message);
        }
    }

    /**
     * Health check for model metadata manager
     */
    async healthCheck() {
        const health = {
            timestamp: Date.now(),
            status: 'healthy',
            issues: []
        };

        try {
            // Check Hedera service health
            const hederaHealth = await this.hederaService.healthCheck();
            if (hederaHealth.errors.length > 0) {
                health.issues.push(...hederaHealth.errors);
                health.status = 'degraded';
            }

            // Check current model availability
            if (!this.currentModelVersion) {
                health.issues.push('No current model version available');
                health.status = 'degraded';
            }

            // Check cache size
            if (this.modelCache.size > 1000) {
                health.issues.push(`Large cache size: ${this.modelCache.size} entries`);
            }

            // Check version history
            if (this.versionHistory.size === 0) {
                health.issues.push('No version history available');
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
     * Close and cleanup resources
     */
    async close() {
        try {
            console.log('🔄 Closing Model Metadata Manager...');
            
            // Save version history before closing
            await this.saveVersionHistory();
            
            // Clear cache
            this.clearCache();
            
            // Close Hedera service
            await this.hederaService.close();
            
            this.initialized = false;
            console.log('✅ Model Metadata Manager closed');
        } catch (error) {
            console.error('❌ Error closing Model Metadata Manager:', error);
        }
    }
}

export default ModelMetadataManager;