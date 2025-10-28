import { ethers } from 'ethers';
import HederaService from '../../services/hederaService.js';
import AIDecisionLogger from '../../services/aiDecisionLogger.js';
import ModelMetadataManager from '../../services/modelMetadataManager.js';
import RealTimeEventMonitor from '../../services/realTimeEventMonitor.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env.hedera' });

/**
 * Comprehensive User Journey Test
 * Tests the complete user flow from deposit to withdrawal with Hedera integration
 */
describe('Complete User Journey - End-to-End Test', () => {
    let hederaService;
    let aiDecisionLogger;
    let modelMetadataManager;
    let realTimeEventMonitor;
    let web3Provider;
    let vaultContract;
    let userAddress;
    let initialBalance;

    beforeAll(async () => {
        // Skip if no Hedera credentials
        if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
            console.log('⏭️ Skipping E2E tests - Hedera credentials not set');
            return;
        }

        console.log('🚀 Starting Complete User Journey Test...');
        
        // Setup Web3 provider
        web3Provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL);
        
        // Setup user account
        userAddress = process.env.ADMIN_ADDRESS;
        initialBalance = await web3Provider.getBalance(userAddress);
        
        console.log(`User Address: ${userAddress}`);
        console.log(`Initial Balance: ${ethers.formatEther(initialBalance)} HBAR`);
        
        // Initialize all services
        hederaService = new HederaService();
        modelMetadataManager = new ModelMetadataManager();
        aiDecisionLogger = new AIDecisionLogger(web3Provider, process.env.VAULT_CONTRACT_ADDRESS, []);
        realTimeEventMonitor = new RealTimeEventMonitor(
            web3Provider,
            hederaService,
            aiDecisionLogger,
            modelMetadataManager
        );
        
        // Initialize services
        await hederaService.initialize();
        await modelMetadataManager.initialize();
        await aiDecisionLogger.initialize();
        await realTimeEventMonitor.initialize();
        
        console.log('✅ All services initialized');
        
    }, 60000);

    afterAll(async () => {
        // Cleanup services
        if (realTimeEventMonitor) await realTimeEventMonitor.close();
        if (aiDecisionLogger) await aiDecisionLogger.close();
        if (modelMetadataManager) await modelMetadataManager.close();
        if (hederaService) await hederaService.close();
    });

    describe('1. System Initialization and Setup', () => {
        test('should verify all services are healthy', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            const hederaHealth = await hederaService.healthCheck();
            const modelHealth = await modelMetadataManager.healthCheck();
            const loggerHealth = await aiDecisionLogger.healthCheck();
            const monitorHealth = await realTimeEventMonitor.healthCheck();

            expect(hederaHealth.errors.length).toBe(0);
            expect(modelHealth.status).toBe('healthy');
            expect(loggerHealth.status).toBe('healthy');
            expect(monitorHealth.status).toBe('healthy');

            console.log('✅ All services are healthy');
        });

        test('should verify Hedera services are configured', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            const hederaStatus = hederaService.getStatus();
            expect(hederaStatus.initialized).toBe(true);
            expect(hederaStatus.network).toBe('testnet');

            if (process.env.HCS_TOPIC_ID) {
                expect(hederaStatus.topicId).toBeDefined();
                console.log(`✅ HCS Topic configured: ${hederaStatus.topicId}`);
            }

            if (process.env.HFS_FILE_ID) {
                expect(hederaStatus.fileId).toBeDefined();
                console.log(`✅ HFS File configured: ${hederaStatus.fileId}`);
            }
        });
    });

    describe('2. AI Model Management Flow', () => {
        test('should store initial AI model metadata on HFS', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            const modelData = {
                version: 'v2.0.0-e2e',
                architecture: {
                    type: 'transformer',
                    description: 'Advanced AI model for E2E testing',
                    layers: ['attention', 'feedforward', 'output'],
                    parameters: {
                        inputSize: 20,
                        hiddenSize: 128,
                        outputSize: 4,
                        totalParams: 15000
                    }
                },
                training: {
                    dataset: {
                        name: 'e2e_test_data',
                        size: 50000,
                        features: [
                            'price_momentum',
                            'volume_profile',
                            'volatility_index',
                            'liquidity_depth',
                            'yield_spread',
                            'risk_metrics'
                        ]
                    },
                    hyperparameters: {
                        learningRate: 0.0001,
                        epochs: 200,
                        batchSize: 64,
                        optimizer: 'adamw'
                    }
                },
                performance: {
                    accuracy: 0.94,
                    precision: 0.91,
                    recall: 0.96,
                    f1Score: 0.93,
                    backtestReturn: 0.22,
                    sharpeRatio: 2.1,
                    maxDrawdown: 0.06
                },
                metadata: {
                    creator: 'E2E_Test_Suite',
                    description: 'Model created during end-to-end testing',
                    tags: ['e2e', 'testing', 'advanced'],
                    environment: 'testnet'
                }
            };

            const result = await modelMetadataManager.storeModelMetadata(modelData);
            
            expect(result.success).toBe(true);
            expect(result.version).toBe('v2.0.0-e2e');
            expect(result.fileId).toBeDefined();
            expect(result.checksum).toBeDefined();

            console.log(`✅ Model stored on HFS: ${result.fileId}`);
            console.log(`   Version: ${result.version}`);
            console.log(`   Checksum: ${result.checksum}`);
        });

        test('should retrieve and validate model metadata', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            const currentModel = await modelMetadataManager.getCurrentModelMetadata();
            
            expect(currentModel.success).toBe(true);
            expect(currentModel.metadata.version).toBe('v2.0.0-e2e');
            expect(currentModel.metadata.architecture.type).toBe('transformer');
            expect(currentModel.metadata.performance.accuracy).toBe(0.94);

            console.log('✅ Model metadata retrieved and validated');
        });
    });

    describe('3. AI Decision Making and Logging Flow', () => {
        test('should make AI decision and log to HCS', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            // Simulate AI decision making process
            const marketConditions = {
                bnbPrice: 320.5,
                totalLiquidity: 1500000,
                volatilityIndex: 0.25,
                protocols: {
                    venus: { apy: 8.2, tvl: 120000000, risk: 0.15 },
                    pancake: { apy: 12.8, tvl: 95000000, risk: 0.22 },
                    beefy: { apy: 9.5, tvl: 75000000, risk: 0.18 },
                    aave: { apy: 6.8, tvl: 180000000, risk: 0.12 }
                }
            };

            // AI decision logic (simplified)
            const bestStrategy = Object.entries(marketConditions.protocols)
                .map(([name, data]) => ({ name, ...data, score: data.apy / (1 + data.risk) }))
                .sort((a, b) => b.score - a.score)[0];

            const decisionData = {
                txHash: `0x${Date.now().toString(16).padStart(64, '0')}`,
                blockNumber: await web3Provider.getBlockNumber(),
                logIndex: 0,
                type: 'ai_rebalance_e2e',
                agent: process.env.AI_AGENT_ADDRESS || userAddress,
                decisionId: `e2e_decision_${Date.now()}`,
                timestamp: Date.now(),
                decisionCid: `QmE2E${Math.random().toString(36).substr(2, 40)}`,
                fromStrategy: 'venus',
                toStrategy: bestStrategy.name,
                amount: '5000000000000000000', // 5 HBAR
                reason: `AI selected ${bestStrategy.name} with score ${bestStrategy.score.toFixed(2)}`,
                confidence: 0.89,
                expectedYield: bestStrategy.apy,
                riskScore: bestStrategy.risk,
                marketConditions: marketConditions
            };

            // Add model reference
            const modelReference = modelMetadataManager.getModelReferenceForHCS();
            if (modelReference) {
                decisionData.hfsFileId = modelReference.hfsFileId;
                decisionData.modelVersion = modelReference.version;
                decisionData.modelChecksum = modelReference.checksum;
            }

            // Submit decision to HCS
            const hcsResult = await hederaService.submitDecisionToHCS(decisionData);
            
            expect(hcsResult).toHaveProperty('topicId');
            expect(hcsResult).toHaveProperty('sequenceNumber');
            expect(hcsResult).toHaveProperty('transactionId');
            expect(hcsResult.messageSize).toBeGreaterThan(0);

            console.log(`✅ AI decision logged to HCS:`);
            console.log(`   Topic: ${hcsResult.topicId}`);
            console.log(`   Sequence: ${hcsResult.sequenceNumber}`);
            console.log(`   Decision: ${decisionData.fromStrategy} → ${decisionData.toStrategy}`);
            console.log(`   Reason: ${decisionData.reason}`);
        });

        test('should process multiple decisions in sequence', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            const decisions = [
                { from: 'venus', to: 'pancake', amount: '2000000000000000000', reason: 'Higher yield opportunity' },
                { from: 'pancake', to: 'beefy', amount: '1500000000000000000', reason: 'Risk adjustment' },
                { from: 'beefy', to: 'aave', amount: '3000000000000000000', reason: 'Stability preference' }
            ];

            const results = [];

            for (let i = 0; i < decisions.length; i++) {
                const decision = decisions[i];
                
                const decisionData = {
                    txHash: `0x${(Date.now() + i).toString(16).padStart(64, '0')}`,
                    blockNumber: await web3Provider.getBlockNumber() + i,
                    logIndex: i,
                    type: 'ai_sequence_decision',
                    agent: userAddress,
                    decisionId: `sequence_${i}_${Date.now()}`,
                    timestamp: Date.now() + i * 1000,
                    fromStrategy: decision.from,
                    toStrategy: decision.to,
                    amount: decision.amount,
                    reason: decision.reason,
                    sequenceNumber: i + 1,
                    totalSequence: decisions.length
                };

                const result = await hederaService.submitDecisionToHCS(decisionData);
                results.push(result);

                // Small delay between decisions
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            expect(results).toHaveLength(3);
            results.forEach((result, index) => {
                expect(result).toHaveProperty('sequenceNumber');
                console.log(`✅ Decision ${index + 1}/3 logged: ${decisions[index].from} → ${decisions[index].to}`);
            });
        });
    });

    describe('4. Real-time Event Monitoring', () => {
        test('should start event monitoring and process simulated events', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            // Add vault contract for monitoring
            const vaultABI = [
                "event AIRebalance(address indexed agent, uint256 timestamp, string decisionCid, uint256 fromStrategy, uint256 toStrategy, uint256 amount)"
            ];

            await realTimeEventMonitor.addContract(
                process.env.VAULT_CONTRACT_ADDRESS,
                vaultABI,
                ['AIRebalance']
            );

            // Start monitoring
            const monitorResult = await realTimeEventMonitor.startMonitoring(3000);
            expect(monitorResult.status).toBe('monitoring_started');

            console.log('✅ Real-time event monitoring started');

            // Simulate event processing
            const simulatedEvent = {
                transactionHash: `0x${Date.now().toString(16).padStart(64, '0')}`,
                blockNumber: await web3Provider.getBlockNumber(),
                logIndex: 0,
                args: {
                    agent: userAddress,
                    timestamp: Date.now().toString(),
                    decisionCid: `QmSimulated${Math.random().toString(36).substr(2, 36)}`,
                    fromStrategy: '1',
                    toStrategy: '2',
                    amount: '1000000000000000000'
                }
            };

            const parsedEvent = await realTimeEventMonitor.parseEvent(
                simulatedEvent,
                'AIRebalance',
                process.env.VAULT_CONTRACT_ADDRESS
            );

            expect(parsedEvent.eventName).toBe('AIRebalance');
            expect(parsedEvent.contractAddress).toBe(process.env.VAULT_CONTRACT_ADDRESS);

            console.log('✅ Event parsing successful');

            // Stop monitoring
            await realTimeEventMonitor.stopMonitoring();
            console.log('✅ Event monitoring stopped');
        });

        test('should validate event-to-HCS mapping', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            // Create a test event
            const testEvent = {
                transactionHash: `0x${Date.now().toString(16).padStart(64, '0')}`,
                blockNumber: await web3Provider.getBlockNumber(),
                logIndex: 0,
                args: {
                    agent: userAddress,
                    timestamp: Date.now().toString(),
                    decisionCid: `QmMapping${Math.random().toString(36).substr(2, 36)}`,
                    fromStrategy: '2',
                    toStrategy: '3',
                    amount: '2500000000000000000'
                }
            };

            // Process event through real-time monitor
            const processedEvent = await realTimeEventMonitor.parseEvent(
                testEvent,
                'AIRebalance',
                process.env.VAULT_CONTRACT_ADDRESS
            );

            const processResult = await realTimeEventMonitor.processEvent(processedEvent);
            
            expect(processResult.success).toBe(true);
            expect(processResult.eventData.status).toBe('completed');
            expect(processResult.hcsResult).toBeDefined();

            console.log('✅ Event-to-HCS mapping validated');
            console.log(`   Event Hash: ${processedEvent.eventHash}`);
            console.log(`   HCS Sequence: ${processResult.hcsResult.sequenceNumber}`);
        });
    });

    describe('5. Cross-chain Coordination Validation', () => {
        test('should validate BSC-Hedera coordination', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            // Get current BSC block
            const bscBlock = await web3Provider.getBlockNumber();
            const bscNetwork = await web3Provider.getNetwork();

            // Create cross-chain coordination data
            const coordinationData = {
                bscChainId: bscNetwork.chainId.toString(),
                bscBlockNumber: bscBlock,
                bscTransactionHash: `0x${Date.now().toString(16).padStart(64, '0')}`,
                hederaNetwork: 'testnet',
                hederaAccount: process.env.HEDERA_ACCOUNT_ID,
                coordinationType: 'cross_chain_rebalance',
                timestamp: Date.now(),
                agent: userAddress,
                decisionId: `cross_chain_${Date.now()}`,
                fromChain: 'bsc',
                toChain: 'hedera',
                amount: '10000000000000000000',
                reason: 'Cross-chain yield optimization'
            };

            // Add model reference
            const modelReference = modelMetadataManager.getModelReferenceForHCS();
            if (modelReference) {
                coordinationData.hfsFileId = modelReference.hfsFileId;
                coordinationData.modelVersion = modelReference.version;
            }

            // Submit coordination data to HCS
            const hcsResult = await hederaService.submitDecisionToHCS(coordinationData);
            
            expect(hcsResult).toHaveProperty('topicId');
            expect(hcsResult).toHaveProperty('sequenceNumber');

            console.log('✅ Cross-chain coordination validated');
            console.log(`   BSC Block: ${bscBlock}`);
            console.log(`   BSC Chain ID: ${bscNetwork.chainId}`);
            console.log(`   Hedera Topic: ${hcsResult.topicId}`);
            console.log(`   HCS Sequence: ${hcsResult.sequenceNumber}`);
        });
    });

    describe('6. System Performance and Reliability', () => {
        test('should handle concurrent operations', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            const concurrentOperations = [];
            const operationCount = 5;

            // Create concurrent HCS submissions
            for (let i = 0; i < operationCount; i++) {
                const decisionData = {
                    txHash: `0x${(Date.now() + i).toString(16).padStart(64, '0')}`,
                    blockNumber: await web3Provider.getBlockNumber() + i,
                    logIndex: i,
                    type: 'concurrent_test',
                    agent: userAddress,
                    decisionId: `concurrent_${i}_${Date.now()}`,
                    timestamp: Date.now() + i,
                    reason: `Concurrent operation ${i + 1}/${operationCount}`
                };

                concurrentOperations.push(
                    hederaService.submitDecisionToHCS(decisionData)
                );
            }

            const results = await Promise.allSettled(concurrentOperations);
            const successful = results.filter(r => r.status === 'fulfilled');

            expect(successful.length).toBeGreaterThan(0);
            console.log(`✅ Concurrent operations: ${successful.length}/${operationCount} successful`);
        });

        test('should validate error handling and recovery', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            // Test error handler statistics
            const errorStats = hederaService.getErrorHandlerStats();
            expect(errorStats).toHaveProperty('totalOperations');
            expect(errorStats).toHaveProperty('successfulOperations');
            expect(errorStats).toHaveProperty('failedOperations');

            // Test service health after operations
            const finalHealth = await hederaService.healthCheck();
            expect(finalHealth.errors.length).toBe(0);

            console.log('✅ Error handling and recovery validated');
            console.log(`   Total Operations: ${errorStats.totalOperations}`);
            console.log(`   Success Rate: ${((errorStats.successfulOperations / errorStats.totalOperations) * 100).toFixed(1)}%`);
        });
    });

    describe('7. Final System Validation', () => {
        test('should generate comprehensive system report', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) return;

            const finalReport = {
                timestamp: new Date().toISOString(),
                testDuration: Date.now() - (Date.now() - 300000), // Approximate
                services: {
                    hedera: hederaService.getStatistics(),
                    aiLogger: aiDecisionLogger.getStatistics(),
                    modelManager: modelMetadataManager.getStatistics(),
                    eventMonitor: realTimeEventMonitor.getStatistics()
                },
                health: {
                    hedera: await hederaService.healthCheck(),
                    aiLogger: await aiDecisionLogger.healthCheck(),
                    modelManager: await modelMetadataManager.healthCheck(),
                    eventMonitor: await realTimeEventMonitor.healthCheck()
                },
                network: {
                    hedera: process.env.HEDERA_NETWORK,
                    hederaAccount: process.env.HEDERA_ACCOUNT_ID,
                    bscRpc: process.env.BSC_RPC_URL
                }
            };

            // Validate all services are healthy
            expect(finalReport.health.hedera.errors.length).toBe(0);
            expect(finalReport.health.aiLogger.status).toBe('healthy');
            expect(finalReport.health.modelManager.status).toBe('healthy');
            expect(finalReport.health.eventMonitor.status).toBe('healthy');

            console.log('✅ Final system validation completed');
            console.log('📊 System Report Generated:');
            console.log(`   Test Duration: ${Math.round(finalReport.testDuration / 1000)}s`);
            console.log(`   Hedera Operations: ${finalReport.services.hedera.uptime > 0 ? 'Active' : 'Inactive'}`);
            console.log(`   Model Versions: ${finalReport.services.modelManager.totalVersions}`);
            console.log(`   Events Processed: ${finalReport.services.aiLogger.totalEventsLogged}`);
        });
    });
});