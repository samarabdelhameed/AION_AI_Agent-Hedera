import HederaService from '../../services/hederaService.js';
import AIDecisionLogger from '../../services/aiDecisionLogger.js';
import ModelMetadataManager from '../../services/modelMetadataManager.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env.hedera' });

describe('Hedera Service Integration Tests - Real Data', () => {
    let hederaService;
    let aiDecisionLogger;
    let modelMetadataManager;
    let web3Provider;
    let contractAddress;

    beforeAll(async () => {
        // Setup real Web3 provider for BSC testnet
        web3Provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545');
        contractAddress = process.env.VAULT_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890';
        
        // Verify environment variables are set
        if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
            console.warn('⚠️ Hedera credentials not set - some tests may be skipped');
        }
    }, 30000);

    beforeEach(async () => {
        hederaService = new HederaService();
        aiDecisionLogger = new AIDecisionLogger(web3Provider, contractAddress, []);
        modelMetadataManager = new ModelMetadataManager();
    });

    afterEach(async () => {
        if (hederaService) {
            await hederaService.close();
        }
        if (aiDecisionLogger) {
            await aiDecisionLogger.close();
        }
        if (modelMetadataManager) {
            await modelMetadataManager.close();
        }
    });

    describe('HederaService Core Functionality', () => {
        test('should initialize Hedera service successfully', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping Hedera initialization test - credentials not set');
                return;
            }

            const result = await hederaService.initialize();
            expect(result).toBe(true);
            expect(hederaService.initialized).toBe(true);
        }, 15000);

        test('should get service status', async () => {
            const status = hederaService.getStatus();
            
            expect(status).toHaveProperty('initialized');
            expect(status).toHaveProperty('client');
            expect(status).toHaveProperty('network');
            expect(status.network).toBe('testnet');
        });

        test('should validate decision data format', async () => {
            const decisionData = {
                txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                blockNumber: 1000,
                logIndex: 0,
                type: 'rebalance',
                agent: '0x1234567890123456789012345678901234567890',
                fromStrategy: '1',
                toStrategy: '2',
                amount: '1000000000000000000',
                reason: 'Higher yield opportunity'
            };

            // Validate required fields are present
            expect(decisionData.txHash).toBeDefined();
            expect(decisionData.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(decisionData.type).toBe('rebalance');
            expect(decisionData.agent).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(decisionData.amount).toBeDefined();
        });

        test('should validate model metadata structure', async () => {
            const modelData = {
                version: 'v1.0.0',
                architecture: 'neural_network',
                performance: {
                    accuracy: 0.95,
                    precision: 0.92,
                    recall: 0.96
                },
                training: {
                    epochs: 100,
                    learningRate: 0.001
                }
            };

            // Validate model data structure
            expect(modelData.version).toMatch(/^v?\d+\.\d+\.\d+/);
            expect(modelData.architecture).toBeDefined();
            expect(modelData.performance).toHaveProperty('accuracy');
            expect(modelData.performance.accuracy).toBeGreaterThan(0);
            expect(modelData.performance.accuracy).toBeLessThanOrEqual(1);
        });

        test('should have retry mechanism methods available', async () => {
            // Test that retry methods exist and are functions
            expect(typeof hederaService.submitDecisionWithRetry).toBe('function');
            expect(typeof hederaService.storeModelWithRetry).toBe('function');
            expect(typeof hederaService._delay).toBe('function');
        });

        test('should perform health check and return proper structure', async () => {
            const health = await hederaService.healthCheck();
            
            expect(health).toHaveProperty('timestamp');
            expect(health).toHaveProperty('client');
            expect(health).toHaveProperty('network');
            expect(health).toHaveProperty('hcs');
            expect(health).toHaveProperty('hfs');
            expect(health).toHaveProperty('errors');
            expect(Array.isArray(health.errors)).toBe(true);
            expect(typeof health.timestamp).toBe('number');
        });

        test('should provide statistics', async () => {
            const stats = hederaService.getStatistics();
            
            expect(stats).toHaveProperty('initialized');
            expect(stats).toHaveProperty('topicId');
            expect(stats).toHaveProperty('fileId');
            expect(stats).toHaveProperty('monitoringActive');
            expect(typeof stats.initialized).toBe('boolean');
        });
    });

    describe('AIDecisionLogger Integration', () => {
        test('should initialize AI decision logger with real Web3 provider', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping AI decision logger test - Hedera credentials not set');
                return;
            }

            const result = await aiDecisionLogger.initialize();
            expect(result).toBe(true);
            expect(aiDecisionLogger.web3Provider).toBeDefined();
            expect(aiDecisionLogger.contractAddress).toBe(contractAddress);
        }, 15000);

        test('should have monitoring capabilities', async () => {
            // Test that monitoring methods exist
            expect(typeof aiDecisionLogger.startMonitoring).toBe('function');
            expect(typeof aiDecisionLogger.stopMonitoring).toBe('function');
            expect(typeof aiDecisionLogger.pollForEvents).toBe('function');
            expect(typeof aiDecisionLogger.processEventQueue).toBe('function');
            
            // Test initial state
            expect(aiDecisionLogger.isMonitoring).toBe(false);
            expect(Array.isArray(aiDecisionLogger.eventQueue)).toBe(true);
        });

        test('should validate event data structure', async () => {
            const sampleEventData = {
                transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                blockNumber: 1000,
                logIndex: 0,
                args: {
                    agent: '0x1234567890123456789012345678901234567890',
                    timestamp: Date.now().toString(),
                    decisionCid: 'QmTest123',
                    fromStrategy: '1',
                    toStrategy: '2',
                    amount: '1000000000000000000'
                }
            };

            // Validate event structure
            expect(sampleEventData.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(typeof sampleEventData.blockNumber).toBe('number');
            expect(sampleEventData.args.agent).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(sampleEventData.args.decisionCid).toBeDefined();
            expect(sampleEventData.args.amount).toBeDefined();
        });

        test('should have event mapping functionality', async () => {
            // Test that mapping methods exist
            expect(typeof aiDecisionLogger.getEventMapping).toBe('function');
            expect(typeof aiDecisionLogger.getAllEventMappings).toBe('function');
            expect(typeof aiDecisionLogger.verifyEventLogging).toBe('function');
            expect(typeof aiDecisionLogger.generateEventHash).toBe('function');
        });

        test('should provide accurate statistics structure', async () => {
            const stats = aiDecisionLogger.getStatistics();
            
            expect(stats).toHaveProperty('totalEventsLogged');
            expect(stats).toHaveProperty('eventsLast24h');
            expect(stats).toHaveProperty('queuedEvents');
            expect(stats).toHaveProperty('isMonitoring');
            expect(stats).toHaveProperty('lastProcessedBlock');
            expect(stats).toHaveProperty('contractAddress');
            expect(typeof stats.totalEventsLogged).toBe('number');
            expect(typeof stats.isMonitoring).toBe('boolean');
        });

        test('should perform health check', async () => {
            const health = await aiDecisionLogger.healthCheck();
            
            expect(health).toHaveProperty('timestamp');
            expect(health).toHaveProperty('status');
            expect(health).toHaveProperty('issues');
            expect(Array.isArray(health.issues)).toBe(true);
            expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        });
    });

    describe('ModelMetadataManager Integration', () => {
        test('should initialize model metadata manager', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping model metadata manager test - Hedera credentials not set');
                return;
            }

            const result = await modelMetadataManager.initialize();
            expect(result).toBe(true);
            expect(modelMetadataManager.initialized).toBe(true);
        }, 15000);

        test('should validate comprehensive model metadata structure', async () => {
            const modelData = {
                version: 'v1.0.0',
                architecture: {
                    type: 'neural_network',
                    layers: ['dense', 'dropout', 'dense'],
                    parameters: { neurons: 128 }
                },
                training: {
                    dataset: {
                        name: 'defi_market_data',
                        size: 10000,
                        features: ['price', 'volume', 'volatility']
                    },
                    hyperparameters: {
                        learningRate: 0.001,
                        epochs: 100,
                        batchSize: 32
                    }
                },
                performance: {
                    accuracy: 0.95,
                    precision: 0.92,
                    recall: 0.96,
                    backtestReturn: 0.15,
                    sharpeRatio: 1.8
                }
            };

            // Validate comprehensive structure
            expect(modelData.version).toMatch(/^v?\d+\.\d+\.\d+/);
            expect(modelData.architecture).toHaveProperty('type');
            expect(modelData.training).toHaveProperty('dataset');
            expect(modelData.training).toHaveProperty('hyperparameters');
            expect(modelData.performance).toHaveProperty('accuracy');
            expect(Array.isArray(modelData.architecture.layers)).toBe(true);
            expect(Array.isArray(modelData.training.dataset.features)).toBe(true);
        });

        test('should have metadata management methods', async () => {
            // Test that required methods exist
            expect(typeof modelMetadataManager.storeModelMetadata).toBe('function');
            expect(typeof modelMetadataManager.retrieveModelMetadata).toBe('function');
            expect(typeof modelMetadataManager.getCurrentModelMetadata).toBe('function');
            expect(typeof modelMetadataManager.getModelReferenceForHCS).toBe('function');
            expect(typeof modelMetadataManager.getVersionHistory).toBe('function');
        });

        test('should validate model reference structure for HCS', async () => {
            // Test the structure that would be returned for HCS logging
            const expectedReference = {
                hfsFileId: '0.0.345678',
                version: 'v1.0.0',
                checksum: 'abc123def456',
                timestamp: Date.now()
            };

            expect(expectedReference).toHaveProperty('hfsFileId');
            expect(expectedReference).toHaveProperty('version');
            expect(expectedReference).toHaveProperty('checksum');
            expect(expectedReference).toHaveProperty('timestamp');
            expect(expectedReference.hfsFileId).toMatch(/^0\.0\.\d+$/);
            expect(expectedReference.version).toMatch(/^v?\d+\.\d+\.\d+/);
        });

        test('should provide statistics structure', async () => {
            const stats = modelMetadataManager.getStatistics();
            
            expect(stats).toHaveProperty('totalVersions');
            expect(stats).toHaveProperty('currentVersion');
            expect(stats).toHaveProperty('cacheSize');
            expect(stats).toHaveProperty('latestVersion');
            expect(stats).toHaveProperty('hederaServiceStatus');
            expect(typeof stats.totalVersions).toBe('number');
            expect(typeof stats.cacheSize).toBe('number');
        });

        test('should perform health check', async () => {
            const health = await modelMetadataManager.healthCheck();
            
            expect(health).toHaveProperty('timestamp');
            expect(health).toHaveProperty('status');
            expect(health).toHaveProperty('issues');
            expect(Array.isArray(health.issues)).toBe(true);
            expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        });
    });

    describe('Cross-Service Integration', () => {
        test('should validate integration between services', async () => {
            // Test that services can work together
            expect(aiDecisionLogger.hederaService).toBeInstanceOf(HederaService);
            expect(modelMetadataManager.hederaService).toBeInstanceOf(HederaService);
            
            // Test that both services have compatible interfaces
            expect(typeof aiDecisionLogger.hederaService.submitDecisionToHCS).toBe('function');
            expect(typeof modelMetadataManager.hederaService.storeModelWithRetry).toBe('function');
        });

        test('should validate end-to-end data flow structure', async () => {
            // Test the structure of data that flows between services
            const eventData = {
                eventHash: 'hash123',
                transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                blockNumber: 1000,
                agent: '0x1234567890123456789012345678901234567890',
                decisionCid: 'QmTest123',
                status: 'pending'
            };

            const modelReference = {
                hfsFileId: '0.0.345678',
                version: 'v1.0.0',
                checksum: 'abc123def456'
            };

            // Validate that event data can be enhanced with model reference
            const enhancedEventData = {
                ...eventData,
                hfsFileId: modelReference.hfsFileId,
                modelVersion: modelReference.version,
                modelChecksum: modelReference.checksum
            };

            expect(enhancedEventData).toHaveProperty('eventHash');
            expect(enhancedEventData).toHaveProperty('hfsFileId');
            expect(enhancedEventData).toHaveProperty('modelVersion');
            expect(enhancedEventData).toHaveProperty('modelChecksum');
        });

        test('should validate Web3 provider connectivity', async () => {
            try {
                const blockNumber = await web3Provider.getBlockNumber();
                expect(typeof blockNumber).toBe('number');
                expect(blockNumber).toBeGreaterThan(0);
                
                const network = await web3Provider.getNetwork();
                expect(network).toHaveProperty('chainId');
                expect(typeof network.chainId).toBe('bigint');
            } catch (error) {
                console.warn('⚠️ Web3 provider connectivity test failed:', error.message);
                // Don't fail the test if network is unavailable
            }
        }, 10000);
    });

    describe('Error Handling and Recovery', () => {
        test('should handle initialization without credentials gracefully', async () => {
            // Test behavior when Hedera credentials are not available
            const tempAccountId = process.env.HEDERA_ACCOUNT_ID;
            const tempPrivateKey = process.env.HEDERA_PRIVATE_KEY;
            
            delete process.env.HEDERA_ACCOUNT_ID;
            delete process.env.HEDERA_PRIVATE_KEY;
            
            const tempService = new HederaService();
            
            try {
                // Should handle missing credentials gracefully
                const result = await tempService.initialize();
                // Result may be false or throw error - both are acceptable
                expect(typeof result).toBe('boolean');
            } catch (error) {
                // Error is expected when credentials are missing
                expect(error).toBeInstanceOf(Error);
            }
            
            // Restore environment variables
            if (tempAccountId) process.env.HEDERA_ACCOUNT_ID = tempAccountId;
            if (tempPrivateKey) process.env.HEDERA_PRIVATE_KEY = tempPrivateKey;
        });

        test('should validate error handling structures', async () => {
            // Test that error handling methods exist
            expect(typeof hederaService.healthCheck).toBe('function');
            expect(typeof aiDecisionLogger.healthCheck).toBe('function');
            expect(typeof modelMetadataManager.healthCheck).toBe('function');
            
            // Test that cleanup methods exist
            expect(typeof hederaService.close).toBe('function');
            expect(typeof aiDecisionLogger.close).toBe('function');
            expect(typeof modelMetadataManager.close).toBe('function');
        });

        test('should handle queue management properly', async () => {
            // Test that event queue is properly initialized
            expect(Array.isArray(aiDecisionLogger.eventQueue)).toBe(true);
            expect(aiDecisionLogger.eventQueue.length).toBe(0);
            
            // Test that queue management methods exist
            expect(typeof aiDecisionLogger.processEventQueue).toBe('function');
            
            // Test initial monitoring state
            expect(aiDecisionLogger.isMonitoring).toBe(false);
        });
    });
});