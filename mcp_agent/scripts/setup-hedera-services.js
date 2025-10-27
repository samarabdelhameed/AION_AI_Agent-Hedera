#!/usr/bin/env node

/**
 * Hedera Services Setup Script
 * Creates HCS topic, initializes HFS storage, and configures testnet account
 */

import HederaService from '../services/hederaService.js';
import ModelMetadataManager from '../services/modelMetadataManager.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '../.env.hedera' });

class HederaServicesSetup {
    constructor() {
        this.hederaService = new HederaService();
        this.modelMetadataManager = new ModelMetadataManager();
        this.config = {
            topicMemo: process.env.HCS_TOPIC_MEMO || 'AION AI Decision Log',
            fileName: process.env.HFS_FILE_NAME || 'aion-model-metadata.json',
            hbarAmount: process.env.HBAR_AMOUNT || '100',
            testMode: process.env.TEST_MODE === 'true'
        };
        this.results = {};
    }

    async run() {
        try {
            console.log('🚀 Starting Hedera Services Setup...\n');
            
            await this.validateEnvironment();
            await this.initializeServices();
            await this.createHCSTopic();
            await this.initializeHFSStorage();
            await this.testServices();
            await this.saveConfiguration();
            
            console.log('\n✅ Hedera Services Setup Complete!');
            this.printSummary();
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async validateEnvironment() {
        console.log('🔍 Validating environment configuration...');
        
        const required = [
            'HEDERA_ACCOUNT_ID',
            'HEDERA_PRIVATE_KEY',
            'HEDERA_NETWORK'
        ];
        
        const missing = required.filter(key => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        console.log('✓ Environment configuration valid');
        console.log(`  Network: ${process.env.HEDERA_NETWORK}`);
        console.log(`  Account: ${process.env.HEDERA_ACCOUNT_ID}`);
        console.log(`  Test Mode: ${this.config.testMode}\n`);
    }

    async initializeServices() {
        console.log('🔧 Initializing Hedera services...');
        
        try {
            await this.hederaService.initialize();
            console.log('✓ HederaService initialized');
            
            await this.modelMetadataManager.initialize();
            console.log('✓ ModelMetadataManager initialized');
            
            // Check account balance
            const health = await this.hederaService.healthCheck();
            if (health.balance) {
                console.log(`✓ Account balance: ${health.balance}`);
            }
            
        } catch (error) {
            throw new Error(`Service initialization failed: ${error.message}`);
        }
        
        console.log('');
    }

    async createHCSTopic() {
        console.log('📝 Creating HCS topic for decision logging...');
        
        try {
            // Check if topic already exists
            if (process.env.HCS_TOPIC_ID) {
                console.log(`✓ Using existing HCS topic: ${process.env.HCS_TOPIC_ID}`);
                this.results.hcsTopicId = process.env.HCS_TOPIC_ID;
                return;
            }
            
            const topicId = await this.hederaService.createHCSTopic(this.config.topicMemo);
            this.results.hcsTopicId = topicId;
            
            console.log(`✓ HCS topic created: ${topicId}`);
            console.log(`  Memo: ${this.config.topicMemo}`);
            
            // Test topic by submitting a test message
            const testDecision = {
                txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                blockNumber: 0,
                logIndex: 0,
                type: 'setup_test',
                agent: process.env.AI_AGENT_ADDRESS || '0x0000000000000000000000000000000000000000',
                decisionId: `setup_test_${Date.now()}`,
                timestamp: Date.now(),
                reason: 'HCS topic setup test'
            };
            
            const result = await this.hederaService.submitDecisionToHCS(testDecision);
            console.log(`✓ Test message submitted: sequence ${result.sequenceNumber}`);
            
        } catch (error) {
            throw new Error(`HCS topic creation failed: ${error.message}`);
        }
        
        console.log('');
    }

    async initializeHFSStorage() {
        console.log('📁 Initializing HFS storage for model metadata...');
        
        try {
            // Create initial model metadata
            const initialModelData = {
                version: 'v1.0.0',
                architecture: {
                    type: 'neural_network',
                    description: 'Initial AION AI model for DeFi yield optimization'
                },
                training: {
                    dataset: {
                        name: 'initial_setup',
                        size: 0,
                        features: ['setup', 'test']
                    },
                    hyperparameters: {
                        learningRate: 0.001,
                        epochs: 0,
                        batchSize: 32
                    }
                },
                performance: {
                    accuracy: 0.0,
                    precision: 0.0,
                    recall: 0.0,
                    backtestReturn: 0.0,
                    sharpeRatio: 0.0
                },
                metadata: {
                    creator: 'AION_Setup_Script',
                    description: 'Initial model metadata for HFS setup',
                    tags: ['setup', 'initial', 'test'],
                    environment: 'testnet'
                }
            };
            
            const result = await this.modelMetadataManager.storeModelMetadata(initialModelData);
            this.results.hfsFileId = result.fileId;
            
            console.log(`✓ HFS file created: ${result.fileId}`);
            console.log(`  Version: ${result.version}`);
            console.log(`  Checksum: ${result.checksum}`);
            
            // Test retrieval
            const retrieved = await this.modelMetadataManager.retrieveModelMetadata(result.fileId);
            if (retrieved.success) {
                console.log('✓ HFS file retrieval test successful');
            }
            
        } catch (error) {
            throw new Error(`HFS storage initialization failed: ${error.message}`);
        }
        
        console.log('');
    }

    async testServices() {
        console.log('🧪 Testing Hedera services integration...');
        
        try {
            // Test HCS with model reference
            const modelReference = this.modelMetadataManager.getModelReferenceForHCS();
            
            const testDecisionWithModel = {
                txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
                blockNumber: 1,
                logIndex: 0,
                type: 'integration_test',
                agent: process.env.AI_AGENT_ADDRESS || '0x0000000000000000000000000000000000000000',
                decisionId: `integration_test_${Date.now()}`,
                timestamp: Date.now(),
                reason: 'HCS-HFS integration test',
                hfsFileId: modelReference?.hfsFileId,
                modelVersion: modelReference?.version,
                modelChecksum: modelReference?.checksum
            };
            
            const hcsResult = await this.hederaService.submitDecisionToHCS(testDecisionWithModel);
            console.log(`✓ HCS-HFS integration test successful: sequence ${hcsResult.sequenceNumber}`);
            
            // Test service health
            const hederaHealth = await this.hederaService.healthCheck();
            const modelHealth = await this.modelMetadataManager.healthCheck();
            
            console.log(`✓ Hedera service health: ${hederaHealth.errors.length === 0 ? 'healthy' : 'degraded'}`);
            console.log(`✓ Model manager health: ${modelHealth.status}`);
            
            // Get statistics
            const hederaStats = this.hederaService.getStatistics();
            const modelStats = this.modelMetadataManager.getStatistics();
            
            console.log(`✓ Services operational - HCS messages: ${hederaStats.uptime > 0 ? 'active' : 'inactive'}`);
            console.log(`✓ Model versions: ${modelStats.totalVersions}`);
            
        } catch (error) {
            throw new Error(`Service testing failed: ${error.message}`);
        }
        
        console.log('');
    }

    async saveConfiguration() {
        console.log('💾 Saving configuration...');
        
        try {
            // Update .env.hedera file
            const envPath = path.resolve('../.env.hedera');
            let envContent = '';
            
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }
            
            // Update or add HCS_TOPIC_ID
            if (this.results.hcsTopicId) {
                if (envContent.includes('HCS_TOPIC_ID=')) {
                    envContent = envContent.replace(/HCS_TOPIC_ID=.*/, `HCS_TOPIC_ID=${this.results.hcsTopicId}`);
                } else {
                    envContent += `\nHCS_TOPIC_ID=${this.results.hcsTopicId}`;
                }
            }
            
            // Update or add HFS_FILE_ID
            if (this.results.hfsFileId) {
                if (envContent.includes('HFS_FILE_ID=')) {
                    envContent = envContent.replace(/HFS_FILE_ID=.*/, `HFS_FILE_ID=${this.results.hfsFileId}`);
                } else {
                    envContent += `\nHFS_FILE_ID=${this.results.hfsFileId}`;
                }
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('✓ Environment file updated');
            
            // Create setup summary
            const summary = {
                timestamp: new Date().toISOString(),
                network: process.env.HEDERA_NETWORK,
                account: process.env.HEDERA_ACCOUNT_ID,
                services: {
                    hcs: {
                        topicId: this.results.hcsTopicId,
                        memo: this.config.topicMemo
                    },
                    hfs: {
                        fileId: this.results.hfsFileId,
                        fileName: this.config.fileName
                    }
                },
                configuration: {
                    testMode: this.config.testMode,
                    hbarAmount: this.config.hbarAmount
                }
            };
            
            fs.writeFileSync('hedera-setup-summary.json', JSON.stringify(summary, null, 2));
            console.log('✓ Setup summary saved to hedera-setup-summary.json');
            
        } catch (error) {
            console.warn('⚠️ Configuration save failed:', error.message);
        }
        
        console.log('');
    }

    printSummary() {
        console.log('📋 Setup Summary:');
        console.log('================');
        console.log(`Network: ${process.env.HEDERA_NETWORK}`);
        console.log(`Account: ${process.env.HEDERA_ACCOUNT_ID}`);
        
        if (this.results.hcsTopicId) {
            console.log(`HCS Topic: ${this.results.hcsTopicId}`);
        }
        
        if (this.results.hfsFileId) {
            console.log(`HFS File: ${this.results.hfsFileId}`);
        }
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Start MCP Agent: npm start');
        console.log('2. Deploy vault contracts to Hedera testnet');
        console.log('3. Run integration tests: npm run test:hedera');
        console.log('4. Test end-to-end decision flow');
    }

    async cleanup() {
        try {
            if (this.hederaService) {
                await this.hederaService.close();
            }
            if (this.modelMetadataManager) {
                await this.modelMetadataManager.close();
            }
        } catch (error) {
            console.warn('⚠️ Cleanup warning:', error.message);
        }
    }
}

// Handle script execution
async function main() {
    const setup = new HederaServicesSetup();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        await setup.cleanup();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Terminating...');
        await setup.cleanup();
        process.exit(0);
    });
    
    try {
        await setup.run();
        await setup.cleanup();
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        await setup.cleanup();
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default HederaServicesSetup;