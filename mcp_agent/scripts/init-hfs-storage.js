#!/usr/bin/env node

/**
 * Initialize HFS Storage Script
 * Creates initial model metadata file on HFS
 */

import ModelMetadataManager from '../services/modelMetadataManager.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.hedera' });

async function initializeHFSStorage() {
    const modelManager = new ModelMetadataManager();
    
    try {
        console.log('🚀 Initializing HFS Storage...');
        
        // Initialize model metadata manager
        await modelManager.initialize();
        console.log('✓ Model Metadata Manager initialized');
        
        // Create initial model metadata
        const initialModel = {
            version: 'v1.0.0',
            architecture: {
                type: 'neural_network',
                description: 'AION AI Model for DeFi Yield Optimization',
                layers: ['input', 'hidden_1', 'hidden_2', 'output'],
                parameters: {
                    inputSize: 10,
                    hiddenSize: 64,
                    outputSize: 4,
                    totalParams: 5000
                },
                framework: 'tensorflow'
            },
            training: {
                dataset: {
                    name: 'defi_market_data_v1',
                    size: 100000,
                    features: [
                        'price_change',
                        'volume',
                        'volatility',
                        'liquidity',
                        'apy_venus',
                        'apy_pancake',
                        'apy_beefy',
                        'apy_aave',
                        'risk_score',
                        'market_sentiment'
                    ],
                    startDate: '2024-01-01',
                    endDate: '2024-10-01',
                    hash: 'sha256:abc123def456...'
                },
                hyperparameters: {
                    learningRate: 0.001,
                    epochs: 100,
                    batchSize: 32,
                    optimizer: 'adam',
                    lossFunction: 'mse',
                    dropout: 0.2,
                    regularization: 'l2'
                },
                duration: 7200, // 2 hours in seconds
                computeResources: {
                    gpus: 1,
                    memory: '16GB',
                    cpus: 8
                }
            },
            performance: {
                accuracy: 0.92,
                precision: 0.89,
                recall: 0.94,
                f1Score: 0.91,
                auc: 0.96,
                backtestReturn: 0.18,
                sharpeRatio: 1.85,
                maxDrawdown: 0.08,
                winRate: 0.73,
                avgReturn: 0.012,
                crossValidationScore: 0.88,
                validationMethod: 'k_fold',
                testSetSize: 0.2
            },
            features: {
                inputFeatures: [
                    'price_change',
                    'volume',
                    'volatility',
                    'liquidity',
                    'apy_venus',
                    'apy_pancake',
                    'apy_beefy',
                    'apy_aave',
                    'risk_score',
                    'market_sentiment'
                ],
                featureImportance: {
                    'apy_venus': 0.25,
                    'apy_pancake': 0.22,
                    'volatility': 0.18,
                    'risk_score': 0.15,
                    'liquidity': 0.12,
                    'apy_beefy': 0.08
                },
                engineeredFeatures: [
                    'apy_spread',
                    'risk_adjusted_return',
                    'momentum_indicator'
                ]
            },
            deployment: {
                environment: 'testnet',
                deployedBy: 'AION_Setup_Script',
                version: '1.0.0',
                status: 'active'
            },
            compliance: {
                dataPrivacy: 'compliant',
                auditTrail: [
                    {
                        timestamp: Date.now(),
                        action: 'model_created',
                        user: 'setup_script',
                        details: 'Initial model metadata creation'
                    }
                ],
                approvals: [
                    {
                        approver: 'AI_Team',
                        timestamp: Date.now(),
                        status: 'approved'
                    }
                ],
                riskAssessment: 'low'
            },
            metadata: {
                creator: 'AION_AI_Team',
                description: 'Initial AION AI model for DeFi yield optimization on Hedera testnet',
                tags: ['defi', 'ai', 'yield_optimization', 'hedera', 'testnet'],
                license: 'proprietary',
                documentation: 'https://docs.aion.ai/models/v1.0.0'
            }
        };
        
        console.log('📝 Creating initial model metadata...');
        const result = await modelManager.storeModelMetadata(initialModel);
        
        console.log('✅ HFS Storage Initialized Successfully!');
        console.log(`File ID: ${result.fileId}`);
        console.log(`Version: ${result.version}`);
        console.log(`Checksum: ${result.checksum}`);
        console.log(`Size: ${result.size || 'N/A'} bytes`);
        
        // Test retrieval
        console.log('\n🧪 Testing file retrieval...');
        const retrieved = await modelManager.retrieveModelMetadata(result.fileId);
        
        if (retrieved.success) {
            console.log('✓ File retrieval test successful');
            console.log(`  Source: ${retrieved.source}`);
            console.log(`  Model Version: ${retrieved.metadata.version}`);
        } else {
            console.warn('⚠️ File retrieval test failed');
        }
        
        // Get model reference for HCS
        const modelReference = modelManager.getModelReferenceForHCS();
        if (modelReference) {
            console.log('\n📋 Model Reference for HCS:');
            console.log(`  HFS File ID: ${modelReference.hfsFileId}`);
            console.log(`  Version: ${modelReference.version}`);
            console.log(`  Checksum: ${modelReference.checksum}`);
        }
        
        console.log('\n📋 Configuration:');
        console.log(`Add this to your .env.hedera file:`);
        console.log(`HFS_FILE_ID=${result.fileId}`);
        
        // Get statistics
        const stats = modelManager.getStatistics();
        console.log('\n📊 Statistics:');
        console.log(`  Total Versions: ${stats.totalVersions}`);
        console.log(`  Current Version: ${stats.currentVersion}`);
        console.log(`  Cache Size: ${stats.cacheSize}`);
        
    } catch (error) {
        console.error('❌ Failed to initialize HFS storage:', error.message);
        process.exit(1);
    } finally {
        await modelManager.close();
    }
}

// Run the script
initializeHFSStorage();