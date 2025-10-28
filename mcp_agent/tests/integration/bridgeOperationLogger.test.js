/**
 * Bridge Operation Logger Integration Tests
 */

const { BridgeOperationLogger } = require('../../services/bridgeOperationLogger');
const { HederaService } = require('../../services/hederaService');
const { AIDecisionLogger } = require('../../services/aiDecisionLogger');

// Mock dependencies
jest.mock('../../services/hederaService');
jest.mock('../../services/aiDecisionLogger');

describe('BridgeOperationLogger Integration Tests', () => {
    let bridgeLogger;
    let mockHederaService;
    let mockAIDecisionLogger;

    beforeEach(() => {
        // Create mock services
        mockHederaService = {
            createHCSTopicForBridge: jest.fn().mockResolvedValue('0.0.123456'),
            submitMessageToHCS: jest.fn().mockResolvedValue({
                topicId: '0.0.123456',
                sequenceNumber: '1',
                transactionId: 'test-tx-id',
                timestamp: Date.now()
            }),
            getHCSMessages: jest.fn().mockResolvedValue({
                topicId: '0.0.123456',
                messages: [],
                status: 'success'
            }),
            healthCheck: jest.fn().mockResolvedValue(true)
        };

        mockAIDecisionLogger = {
            logDecision: jest.fn().mockResolvedValue('ai-message-id-123')
        };

        // Create bridge logger instance
        bridgeLogger = new BridgeOperationLogger(mockHederaService, mockAIDecisionLogger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize bridge topic on creation', async () => {
            expect(mockHederaService.createHCSTopicForBridge).toHaveBeenCalled();
            
            // Wait for initialization to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(bridgeLogger.getBridgeTopicId()).toBe('0.0.123456');
        });

        test('should handle initialization failure', async () => {
            const errorLogger = new BridgeOperationLogger(
                {
                    createHCSTopicForBridge: jest.fn().mockRejectedValue(new Error('HCS creation failed'))
                },
                mockAIDecisionLogger
            );

            await expect(errorLogger.initializeBridgeTopic()).rejects.toThrow('HCS creation failed');
        });
    });

    describe('Bridge Operation Logging', () => {
        beforeEach(async () => {
            // Ensure initialization is complete
            await bridgeLogger.initializeBridgeTopic();
        });

        test('should log bridge initiation to Hedera', async () => {
            const operationData = {
                operationId: 'op-123',
                user: '0x1234567890123456789012345678901234567890',
                sourceChainId: 56,
                targetChainId: 295,
                sourceToken: '0xSourceToken',
                targetToken: '0xTargetToken',
                amount: '1000000000000000000',
                recipient: '0x1234567890123456789012345678901234567890',
                bridgeService: 'hashport',
                txHash: '0xTxHash123',
                gasLimit: 200000,
                bridgeFee: '10000000000000000',
                payload: '0x'
            };

            const messageId = await bridgeLogger.logBridgeInitiation(operationData);

            expect(mockHederaService.submitMessageToHCS).toHaveBeenCalledWith(
                '0.0.123456',
                expect.stringContaining('"type":"bridge_to_hedera"')
            );
            expect(messageId).toBeDefined();
        });

        test('should log bridge from Hedera', async () => {
            const operationData = {
                operationId: 'op-456',
                user: '0x1234567890123456789012345678901234567890',
                sourceChainId: 295,
                targetChainId: 56,
                sourceToken: '0xSourceToken',
                targetToken: '0xTargetToken',
                amount: '1000000000000000000',
                recipient: '0x1234567890123456789012345678901234567890',
                bridgeService: 'layerzero',
                tokensBurned: '1000000000000000000',
                htsTokenId: '0.0.789012',
                gasLimit: 200000,
                bridgeFee: '10000000000000000'
            };

            const messageId = await bridgeLogger.logBridgeFromHedera(operationData);

            expect(mockHederaService.submitMessageToHCS).toHaveBeenCalledWith(
                '0.0.123456',
                expect.stringContaining('"type":"bridge_from_hedera"')
            );
            expect(messageId).toBeDefined();
        });

        test('should log bridge completion', async () => {
            const operationData = {
                operationId: 'op-123',
                user: '0x1234567890123456789012345678901234567890',
                amount: '1000000000000000000',
                targetChainId: 56,
                targetTxHash: '0xTargetTxHash',
                bridgeService: 'hashport',
                completionTime: Date.now(),
                tokensIssued: '1000000000000000000',
                finalAmount: '990000000000000000',
                fees: '10000000000000000'
            };

            const messageId = await bridgeLogger.logBridgeCompletion(operationData);

            expect(mockHederaService.submitMessageToHCS).toHaveBeenCalledWith(
                '0.0.123456',
                expect.stringContaining('"type":"bridge_completed"')
            );
            expect(messageId).toBeDefined();
        });

        test('should log bridge failure', async () => {
            const operationData = {
                operationId: 'op-789',
                user: '0x1234567890123456789012345678901234567890',
                amount: '1000000000000000000',
                reason: 'Insufficient liquidity',
                errorCode: 'BRIDGE_001',
                bridgeService: 'hashport',
                refunded: true,
                refundTxHash: '0xRefundTxHash',
                refundAmount: '1000000000000000000'
            };

            const messageId = await bridgeLogger.logBridgeFailure(operationData);

            expect(mockHederaService.submitMessageToHCS).toHaveBeenCalledWith(
                '0.0.123456',
                expect.stringContaining('"type":"bridge_failed"')
            );
            expect(messageId).toBeDefined();
        });

        test('should log bridge cancellation', async () => {
            const operationData = {
                operationId: 'op-999',
                user: '0x1234567890123456789012345678901234567890',
                amount: '1000000000000000000',
                reason: 'User requested cancellation',
                cancelledBy: 'user',
                bridgeService: 'layerzero',
                tokensReturned: true,
                refundTxHash: '0xRefundTxHash'
            };

            const messageId = await bridgeLogger.logBridgeCancellation(operationData);

            expect(mockHederaService.submitMessageToHCS).toHaveBeenCalledWith(
                '0.0.123456',
                expect.stringContaining('"type":"bridge_cancelled"')
            );
            expect(messageId).toBeDefined();
        });
    });

    describe('AI Decision Logging', () => {
        beforeEach(async () => {
            await bridgeLogger.initializeBridgeTopic();
        });

        test('should log AI decision related to bridge operations', async () => {
            const decisionData = {
                decisionId: 'ai-decision-123',
                bridgeOperationId: 'op-123',
                aiAgent: '0xAIAgent',
                decisionType: 'bridge_route_selection',
                recommendation: 'use_hashport',
                confidence: 0.95,
                reasoning: 'Lower fees and faster confirmation',
                sourceChain: 56,
                targetChain: 295,
                amount: '1000000000000000000',
                estimatedFee: '10000000000000000',
                selectedService: 'hashport',
                modelVersion: 'v2.1.0',
                hfsFileId: '0.0.345678',
                modelChecksum: 'abc123def456'
            };

            const result = await bridgeLogger.logBridgeAIDecision(decisionData);

            expect(mockHederaService.submitMessageToHCS).toHaveBeenCalledWith(
                '0.0.123456',
                expect.stringContaining('"type":"bridge_ai_decision"')
            );
            expect(mockAIDecisionLogger.logDecision).toHaveBeenCalled();
            expect(result.bridgeMessageId).toBeDefined();
            expect(result.aiMessageId).toBe('ai-message-id-123');
        });
    });

    describe('Bridge Operation Queries', () => {
        beforeEach(async () => {
            await bridgeLogger.initializeBridgeTopic();
        });

        test('should get bridge operation logs', async () => {
            const mockMessages = [
                {
                    contents: JSON.stringify({
                        type: 'bridge_to_hedera',
                        operationId: 'op-123',
                        timestamp: '2024-01-01T00:00:00.000Z'
                    })
                },
                {
                    contents: JSON.stringify({
                        type: 'bridge_completed',
                        operationId: 'op-123',
                        timestamp: '2024-01-01T00:05:00.000Z'
                    })
                }
            ];

            mockHederaService.getHCSMessages.mockResolvedValue({
                topicId: '0.0.123456',
                messages: mockMessages,
                status: 'success'
            });

            const logs = await bridgeLogger.getBridgeOperationLogs('op-123');

            expect(mockHederaService.getHCSMessages).toHaveBeenCalledWith('0.0.123456', 10);
            expect(logs).toHaveLength(2);
            expect(logs[0].operationId).toBe('op-123');
            expect(logs[1].operationId).toBe('op-123');
        });

        test('should get bridge statistics', async () => {
            const mockMessages = [
                {
                    contents: JSON.stringify({
                        type: 'bridge_to_hedera',
                        operationId: 'op-1',
                        targetChain: 295,
                        amount: '1000000000000000000',
                        timestamp: new Date().toISOString()
                    })
                },
                {
                    contents: JSON.stringify({
                        type: 'bridge_completed',
                        operationId: 'op-1',
                        timestamp: new Date().toISOString()
                    })
                },
                {
                    contents: JSON.stringify({
                        type: 'bridge_failed',
                        operationId: 'op-2',
                        timestamp: new Date().toISOString()
                    })
                }
            ];

            mockHederaService.getHCSMessages.mockResolvedValue({
                topicId: '0.0.123456',
                messages: mockMessages,
                status: 'success'
            });

            const stats = await bridgeLogger.getBridgeStatistics('24h');

            expect(stats.totalOperations).toBe(3);
            expect(stats.operationsByType['bridge_to_hedera']).toBe(1);
            expect(stats.operationsByType['bridge_completed']).toBe(1);
            expect(stats.operationsByType['bridge_failed']).toBe(1);
            expect(stats.operationsByChain[295]).toBe(1);
            expect(stats.successRate).toBe(50); // 1 completed out of 2 final states
        });
    });

    describe('Audit Trail Verification', () => {
        beforeEach(async () => {
            await bridgeLogger.initializeBridgeTopic();
        });

        test('should verify complete audit trail', async () => {
            const mockMessages = [
                {
                    contents: JSON.stringify({
                        type: 'bridge_to_hedera',
                        operationId: 'op-123',
                        user: '0x1234',
                        amount: '1000000000000000000',
                        timestamp: '2024-01-01T00:00:00.000Z'
                    })
                },
                {
                    contents: JSON.stringify({
                        type: 'bridge_completed',
                        operationId: 'op-123',
                        user: '0x1234',
                        amount: '1000000000000000000',
                        timestamp: '2024-01-01T00:05:00.000Z'
                    })
                }
            ];

            mockHederaService.getHCSMessages.mockResolvedValue({
                topicId: '0.0.123456',
                messages: mockMessages,
                status: 'success'
            });

            const verification = await bridgeLogger.verifyAuditTrail('op-123');

            expect(verification.valid).toBe(true);
            expect(verification.details.hasInitiation).toBe(true);
            expect(verification.details.hasCompletion).toBe(true);
            expect(verification.details.consistentAmounts).toBe(true);
            expect(verification.details.consistentUsers).toBe(true);
        });

        test('should detect incomplete audit trail', async () => {
            const mockMessages = [
                {
                    contents: JSON.stringify({
                        type: 'bridge_to_hedera',
                        operationId: 'op-456',
                        user: '0x1234',
                        amount: '1000000000000000000',
                        timestamp: '2024-01-01T00:00:00.000Z'
                    })
                }
                // Missing completion log
            ];

            mockHederaService.getHCSMessages.mockResolvedValue({
                topicId: '0.0.123456',
                messages: mockMessages,
                status: 'success'
            });

            const verification = await bridgeLogger.verifyAuditTrail('op-456');

            expect(verification.valid).toBe(false);
            expect(verification.details.hasInitiation).toBe(true);
            expect(verification.details.hasCompletion).toBe(false);
        });

        test('should detect inconsistent data', async () => {
            const mockMessages = [
                {
                    contents: JSON.stringify({
                        type: 'bridge_to_hedera',
                        operationId: 'op-789',
                        user: '0x1234',
                        amount: '1000000000000000000',
                        timestamp: '2024-01-01T00:00:00.000Z'
                    })
                },
                {
                    contents: JSON.stringify({
                        type: 'bridge_completed',
                        operationId: 'op-789',
                        user: '0x5678', // Different user
                        amount: '2000000000000000000', // Different amount
                        timestamp: '2024-01-01T00:05:00.000Z'
                    })
                }
            ];

            mockHederaService.getHCSMessages.mockResolvedValue({
                topicId: '0.0.123456',
                messages: mockMessages,
                status: 'success'
            });

            const verification = await bridgeLogger.verifyAuditTrail('op-789');

            expect(verification.valid).toBe(false);
            expect(verification.details.consistentAmounts).toBe(false);
            expect(verification.details.consistentUsers).toBe(false);
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await bridgeLogger.initializeBridgeTopic();
        });

        test('should handle HCS submission failure', async () => {
            mockHederaService.submitMessageToHCS.mockRejectedValue(new Error('HCS submission failed'));

            const operationData = {
                operationId: 'op-error',
                user: '0x1234567890123456789012345678901234567890',
                sourceChainId: 56,
                targetChainId: 295,
                amount: '1000000000000000000'
            };

            await expect(bridgeLogger.logBridgeInitiation(operationData)).rejects.toThrow('HCS submission failed');
        });

        test('should handle malformed HCS messages gracefully', async () => {
            const mockMessages = [
                { contents: 'invalid json' },
                { contents: JSON.stringify({ type: 'valid', operationId: 'op-123' }) }
            ];

            mockHederaService.getHCSMessages.mockResolvedValue({
                topicId: '0.0.123456',
                messages: mockMessages,
                status: 'success'
            });

            const logs = await bridgeLogger.getBridgeOperationLogs('op-123');

            expect(logs).toHaveLength(1);
            expect(logs[0].operationId).toBe('op-123');
        });
    });

    describe('Health Check', () => {
        test('should perform health check', async () => {
            await bridgeLogger.initializeBridgeTopic();

            const health = await bridgeLogger.healthCheck();

            expect(health.healthy).toBe(true);
            expect(health.details.hcsConnection).toBe(true);
            expect(health.details.bridgeTopicId).toBe('0.0.123456');
            expect(health.details.queueLength).toBe(0);
        });

        test('should detect unhealthy state', async () => {
            mockHederaService.healthCheck.mockResolvedValue(false);
            await bridgeLogger.initializeBridgeTopic();

            const health = await bridgeLogger.healthCheck();

            expect(health.healthy).toBe(false);
            expect(health.details.hcsConnection).toBe(false);
        });
    });

    describe('Queue Management', () => {
        beforeEach(async () => {
            await bridgeLogger.initializeBridgeTopic();
        });

        test('should process queued operations', async () => {
            const operationData = {
                operationId: 'op-queue-test',
                user: '0x1234567890123456789012345678901234567890',
                sourceChainId: 56,
                targetChainId: 295,
                amount: '1000000000000000000'
            };

            // Simulate HCS being temporarily unavailable
            mockHederaService.submitMessageToHCS
                .mockRejectedValueOnce(new Error('Temporary failure'))
                .mockResolvedValueOnce({
                    topicId: '0.0.123456',
                    sequenceNumber: '1',
                    transactionId: 'test-tx-id',
                    timestamp: Date.now()
                });

            // First call should fail and queue the operation
            await expect(bridgeLogger.logBridgeInitiation(operationData)).rejects.toThrow('Temporary failure');

            // Wait for queue processing
            await new Promise(resolve => setTimeout(resolve, 200));

            // Should have attempted to submit twice (initial + retry from queue)
            expect(mockHederaService.submitMessageToHCS).toHaveBeenCalledTimes(2);
        });
    });
});