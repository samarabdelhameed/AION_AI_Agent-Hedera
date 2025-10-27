import HederaService from '../../services/hederaService.js';
import AIDecisionLogger from '../../services/aiDecisionLogger.js';
import ModelMetadataManager from '../../services/modelMetadataManager.js';
import RealTimeEventMonitor from '../../services/realTimeEventMonitor.js';
import HederaErrorHandler from '../../services/hederaErrorHandler.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env.hedera' });

describe('Agent Hedera Integration Tests - End-to-End', () => {
    let hederaService;
    let aiDecisionLogger;
    let modelMetadataManager;
    let realTimeEventMonitor;
    let errorHandler;
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
        // Initialize all services
        hederaService = new HederaService();
        aiDecisionLogger = new AIDecisionLogger(web3Provider, contractAddress, []);
        modelMetadataManager = new ModelMetadataManager();
        errorHandler = new HederaErrorHandler();
        
        realTimeEventMonitor = new RealTimeEventMonitor(
            web3Provider,
            hederaService,
            aiDecisionLogger,
            modelMetadataManager
        );
    });

    afterEach(async () => {
        // Cleanup all services
        if (realTimeEventMonitor) {
            await realTimeEventMonitor.close();
        }
        if (aiDecisionLogger) {
            await aiDecisionLogger.close();
        }
        if (modelMetadataManager) {
            await modelMetadataManager.close();
        }
        if (hederaService) {
            await hederaService.close();
        }
        if (errorHandler) {
            await errorHandler.close();
        }
    });

    describe('End-to-End Decision Flow', () => {
        test('should complete full decision logging workflow', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping E2E test - Hedera credentials not set');
                return;
            }

            // Step 1: Initialize all services
            await hederaService.initialize();
            await modelMetadataManager.initialize();
            await aiDecisionLogger.initialize();
            await realTimeEventMonitor.initialize();
            
            expect(hederaService.initialized).toBe(true);
            expect(modelMetadataManager.initialized).toBe(true);

            // Step 2: Store model metadata
            const modelData = {
                version: 'v1.0.0',
                architecture: {
                    type: 'neural_network',
                    layers: ['dense', 'dropout', 'dense']
                },
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

            const modelResult = await modelMetadataManager.storeModelMetadata(modelData);
            expect(modelResult.success).toBe(true);
            expect(modelResult.version).toBe('v1.0.0');

            // Step 3: Create decision data
            const decisionData = {
                txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                blockNumber: 1000,
                logIndex: 0,
                type: 'ai_rebalance',
                agent: '0x1234567890123456789012345678901234567890',
                decisionId: `decision_${Date.now()}`,
                timestamp: Date.now(),
                decisionCid: `Qm${Math.random().toString(36).substr(2, 44)}`,
                fromStrategy: '1',
                toStrategy: '2',
                amount: '1000000000000000000',
                reason: 'Higher yield opportunity detected'
            };

            // Step 4: Log decision to HCS with model reference
            const modelReference = modelMetadataManager.getModelReferenceForHCS();
            if (modelReference) {
                decisionData.hfsFileId = modelReference.hfsFileId;
                decisionData.modelVersion = modelReference.version;
                decisionData.modelChecksum = modelReference.checksum;
            }

            const hcsResult = await hederaService.submitDecisionToHCS(decisionData);
            expect(hcsResult).toHaveProperty('topicId');
            expect(hcsResult).toHaveProperty('sequenceNumber');
            expect(hcsResult).toHaveProperty('transactionId');

            // Step 5: Verify decision was logged
            expect(hcsResult.messageSize).toBeGreaterThan(0);
            expect(hcsResult.timestamp).toBeDefined();
        }, 60000);

        test('should handle decision flow with error recovery', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping error recovery test - Hedera credentials not set');
                return;
            }

            // Initialize services
            await hederaService.initialize();
            await modelMetadataManager.initialize();
            
            // Test error handler functionality
            const errorStats = hederaService.getErrorHandlerStats();
            expect(errorStats).toHaveProperty('totalOperations');
            expect(errorStats).toHaveProperty('successfulOperations');
            expect(errorStats).toHaveProperty('failedOperations');

            // Create invalid decision data to trigger error handling
            const invalidDecisionData = {
                // Missing required fields to trigger validation errors
                type: 'invalid_decision'
            };

            try {
                await hederaService.submitDecisionToHCS(invalidDecisionData);
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                // Error is expected
                expect(error).toBeInstanceOf(Error);
            }

            // Verify error was tracked
            const updatedStats = hederaService.getErrorHandlerStats();
            expect(updatedStats.totalOperations).toBeGreaterThan(errorStats.totalOperations);
        }, 30000);
    });

    describe('Real-time Event Monitoring Integration', () => {
        test('should initialize and configure event monitoring', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping event monitoring test - Hedera credentials not set');
                return;
            }

            // Initialize services
            await hederaService.initialize();
            await aiDecisionLogger.initialize();
            await realTimeEventMonitor.initialize();

            // Add contract for monitoring
            const vaultABI = [
                "event AIRebalance(address indexed agent, uint256 timestamp, string decisionCid, uint256 fromStrategy, uint256 toStrategy, uint256 amount)"
            ];

            const addResult = await realTimeEventMonitor.addContract(
                contractAddress,
                vaultABI,
                ['AIRebalance']
            );

            expect(addResult.success).toBe(true);
            expect(addResult.contractAddress).toBe(contractAddress);
            expect(addResult.eventNames).toContain('AIRebalance');

            // Start monitoring
            const monitoringResult = await realTimeEventMonitor.startMonitoring(5000);
            expect(monitoringResult.status).toBe('monitoring_started');
            expect(monitoringResult.pollInterval).toBe(5000);

            // Get statistics
            const stats = realTimeEventMonitor.getStatistics();
            expect(stats.isMonitoring).toBe(true);
            expect(stats.monitoredContracts).toContain(contractAddress);

            // Stop monitoring
            const stopResult = await realTimeEventMonitor.stopMonitoring();
            expect(stopResult.status).toBe('monitoring_stopped');
        }, 30000);

        test('should process simulated events correctly', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping event processing test - Hedera credentials not set');
                return;
            }

            // Initialize services
            await hederaService.initialize();
            await realTimeEventMonitor.initialize();

            // Create simulated event data
            const simulatedEvent = {
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

            // Parse event
            const parsedEvent = await realTimeEventMonitor.parseEvent(
                simulatedEvent,
                'AIRebalance',
                contractAddress
            );

            expect(parsedEvent.eventName).toBe('AIRebalance');
            expect(parsedEvent.contractAddress).toBe(contractAddress);
            expect(parsedEvent.transactionHash).toBe(simulatedEvent.transactionHash);
            expect(parsedEvent.args.agent).toBe(simulatedEvent.args.agent);

            // Process event
            const processResult = await realTimeEventMonitor.processEvent(parsedEvent);
            expect(processResult.success).toBe(true);
            expect(processResult.eventData.status).toBe('completed');
        }, 30000);
    });

    describe('Cross-Chain Coordination', () => {
        test('should coordinate between BSC and Hedera networks', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping cross-chain test - Hedera credentials not set');
                return;
            }

            // Test Web3 provider connectivity
            try {
                const blockNumber = await web3Provider.getBlockNumber();
                expect(typeof blockNumber).toBe('number');
                expect(blockNumber).toBeGreaterThan(0);

                const network = await web3Provider.getNetwork();
                expect(network).toHaveProperty('chainId');
            } catch (error) {
                console.warn('⚠️ Web3 provider not available:', error.message);
                return; // Skip test if network unavailable
            }

            // Initialize Hedera services
            await hederaService.initialize();
            await modelMetadataManager.initialize();

            // Simulate cross-chain decision flow
            const bscTransactionData = {
                txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                blockNumber: await web3Provider.getBlockNumber(),
                chainId: (await web3Provider.getNetwork()).chainId.toString(),
                contractAddress: contractAddress
            };

            const hederaDecisionData = {
                ...bscTransactionData,
                type: 'cross_chain_rebalance',
                agent: '0x1234567890123456789012345678901234567890',
                decisionId: `cross_chain_${Date.now()}`,
                timestamp: Date.now(),
                reason: 'Cross-chain yield optimization'
            };

            // Add model reference
            const modelReference = modelMetadataManager.getModelReferenceForHCS();
            if (modelReference) {
                hederaDecisionData.hfsFileId = modelReference.hfsFileId;
                hederaDecisionData.modelVersion = modelReference.version;
            }

            // Submit to Hedera
            const hcsResult = await hederaService.submitDecisionToHCS(hederaDecisionData);
            expect(hcsResult).toHaveProperty('topicId');
            expect(hcsResult).toHaveProperty('sequenceNumber');

            // Verify cross-chain data integrity
            expect(hcsResult.messageSize).toBeGreaterThan(0);
        }, 45000);
    });

    describe('Error Handling and Recovery', () => {
        test('should handle service failures gracefully', async () => {
            // Initialize error handler
            errorHandler.initialize();

            // Test retry mechanism
            let attemptCount = 0;
            const flakyOperation = async () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('NETWORK_ERROR: Temporary failure');
                }
                return { success: true, attempt: attemptCount };
            };

            const result = await errorHandler.executeWithRetry('test_service', flakyOperation);
            expect(result.success).toBe(true);
            expect(result.attempt).toBe(3);

            // Verify statistics
            const stats = errorHandler.getStatistics();
            expect(stats.totalOperations).toBeGreaterThan(0);
            expect(stats.successfulOperations).toBeGreaterThan(0);
        });

        test('should implement circuit breaker pattern', async () => {
            // Initialize error handler
            errorHandler.initialize();

            // Simulate multiple failures to trigger circuit breaker
            const alwaysFailingOperation = async () => {
                throw new Error('SERVICE_UNAVAILABLE: Service down');
            };

            // Trigger multiple failures
            for (let i = 0; i < 6; i++) {
                try {
                    await errorHandler.executeWithRetry('failing_service', alwaysFailingOperation);
                } catch (error) {
                    // Expected to fail
                }
            }

            // Circuit breaker should now be open
            const serviceHealth = errorHandler.getServiceHealth('failing_service');
            expect(serviceHealth.circuitState).toBe('OPEN');
            expect(serviceHealth.isHealthy).toBe(false);

            // Reset circuit breaker
            errorHandler.resetCircuitBreaker('failing_service');
            const resetHealth = errorHandler.getServiceHealth('failing_service');
            expect(resetHealth.circuitState).toBe('CLOSED');
        });

        test('should queue operations when services are unavailable', async () => {
            // Initialize error handler
            errorHandler.initialize();

            const queueableOperation = async () => {
                throw new Error('RATE_LIMITED: Service temporarily unavailable');
            };

            try {
                await errorHandler.executeWithRetry('rate_limited_service', queueableOperation, { test: 'data' });
            } catch (error) {
                // Expected to fail and queue
            }

            // Check that operation was queued
            const stats = errorHandler.getStatistics();
            expect(stats.queueSize).toBeGreaterThan(0);

            // Clear queue
            const clearedCount = errorHandler.clearQueue();
            expect(clearedCount).toBeGreaterThan(0);

            const updatedStats = errorHandler.getStatistics();
            expect(updatedStats.queueSize).toBe(0);
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle multiple concurrent operations', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping performance test - Hedera credentials not set');
                return;
            }

            // Initialize services
            await hederaService.initialize();
            await modelMetadataManager.initialize();

            // Create multiple concurrent decision submissions
            const concurrentOperations = [];
            const operationCount = 5;

            for (let i = 0; i < operationCount; i++) {
                const decisionData = {
                    txHash: `0x${i.toString().padStart(64, '0')}`,
                    blockNumber: 1000 + i,
                    logIndex: i,
                    type: 'concurrent_test',
                    agent: '0x1234567890123456789012345678901234567890',
                    decisionId: `concurrent_${i}_${Date.now()}`,
                    timestamp: Date.now() + i,
                    reason: `Concurrent operation ${i}`
                };

                concurrentOperations.push(
                    hederaService.submitDecisionToHCS(decisionData)
                );
            }

            // Execute all operations concurrently
            const results = await Promise.allSettled(concurrentOperations);

            // Verify results
            const successfulOperations = results.filter(r => r.status === 'fulfilled');
            expect(successfulOperations.length).toBeGreaterThan(0);

            // Check that each successful operation has required properties
            successfulOperations.forEach(result => {
                expect(result.value).toHaveProperty('topicId');
                expect(result.value).toHaveProperty('sequenceNumber');
            });
        }, 60000);

        test('should maintain performance under load', async () => {
            // Initialize error handler for performance testing
            errorHandler.initialize();

            const startTime = Date.now();
            const operationCount = 100;
            const operations = [];

            // Create fast operations for performance testing
            const fastOperation = async () => {
                await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
                return { success: true, timestamp: Date.now() };
            };

            // Execute operations
            for (let i = 0; i < operationCount; i++) {
                operations.push(
                    errorHandler.executeWithRetry('performance_test', fastOperation)
                );
            }

            const results = await Promise.all(operations);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Verify performance
            expect(results.length).toBe(operationCount);
            expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

            const stats = errorHandler.getStatistics();
            expect(stats.totalOperations).toBeGreaterThanOrEqual(operationCount);
            expect(stats.successfulOperations).toBeGreaterThanOrEqual(operationCount);

            console.log(`✅ Performance test: ${operationCount} operations in ${totalTime}ms`);
        });
    });

    describe('Health Monitoring', () => {
        test('should provide comprehensive health status', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping health monitoring test - Hedera credentials not set');
                return;
            }

            // Initialize services
            await hederaService.initialize();
            await modelMetadataManager.initialize();
            await aiDecisionLogger.initialize();
            await realTimeEventMonitor.initialize();

            // Check individual service health
            const hederaHealth = await hederaService.healthCheck();
            expect(hederaHealth).toHaveProperty('timestamp');
            expect(hederaHealth).toHaveProperty('client');
            expect(hederaHealth).toHaveProperty('errors');

            const modelHealth = await modelMetadataManager.healthCheck();
            expect(modelHealth).toHaveProperty('status');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(modelHealth.status);

            const loggerHealth = await aiDecisionLogger.healthCheck();
            expect(loggerHealth).toHaveProperty('status');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(loggerHealth.status);

            const monitorHealth = await realTimeEventMonitor.healthCheck();
            expect(monitorHealth).toHaveProperty('status');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(monitorHealth.status);

            // Verify all services are reporting health status
            expect(hederaHealth.timestamp).toBeDefined();
            expect(modelHealth.timestamp).toBeDefined();
            expect(loggerHealth.timestamp).toBeDefined();
            expect(monitorHealth.timestamp).toBeDefined();
        }, 30000);

        test('should track service statistics accurately', async () => {
            if (!process.env.HEDERA_ACCOUNT_ID) {
                console.log('⏭️ Skipping statistics test - Hedera credentials not set');
                return;
            }

            // Initialize services
            await hederaService.initialize();
            await modelMetadataManager.initialize();

            // Get initial statistics
            const initialHederaStats = hederaService.getStatistics();
            const initialModelStats = modelMetadataManager.getStatistics();

            expect(initialHederaStats).toHaveProperty('initialized');
            expect(initialHederaStats).toHaveProperty('uptime');
            expect(initialModelStats).toHaveProperty('totalVersions');
            expect(initialModelStats).toHaveProperty('cacheSize');

            // Perform operations to update statistics
            const modelData = {
                version: 'v1.0.1',
                architecture: { type: 'test_model' },
                performance: { accuracy: 0.9 }
            };

            await modelMetadataManager.storeModelMetadata(modelData);

            // Verify statistics updated
            const updatedModelStats = modelMetadataManager.getStatistics();
            expect(updatedModelStats.totalVersions).toBeGreaterThan(initialModelStats.totalVersions);
        }, 30000);
    });
});