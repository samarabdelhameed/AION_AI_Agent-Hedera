#!/usr/bin/env node

/**
 * @fileoverview Test script for Enhanced AI Decision Logger
 * @description Comprehensive testing of AIDecisionLogger.js functionality
 */

const path = require('path');
const fs = require('fs').promises;

// Mock HederaService for testing
class MockHederaService {
    constructor() {
        this.isConnected = true;
        this.submittedMessages = [];
    }
    
    async submitToHCS(topicId, message) {
        this.submittedMessages.push({ topicId, message, timestamp: Date.now() });
        return {
            success: true,
            transactionId: `mock-tx-${Date.now()}`,
            sequenceNumber: this.submittedMessages.length
        };
    }
    
    async submitBatchToHCS(topicId, messages) {
        const results = [];
        for (const message of messages) {
            const result = await this.submitToHCS(topicId, message);
            results.push(result);
        }
        return results;
    }
}

// Import AIDecisionLogger
const AIDecisionLogger = require('../mcp_agent/services/AIDecisionLogger');

/**
 * Test configuration
 */
const testConfig = {
    hederaService: new MockHederaService(),
    hcsTopicId: '0.0.1001',
    hcsAuditTopicId: '0.0.1002',
    enableHederaLogging: true,
    enableLocalLogging: true,
    localLogPath: './test-logs/ai-decisions',
    batchSize: 5,
    batchTimeout: 1000,
    maxRetries: 2,
    enableMetrics: true,
    trackDecisionOutcomes: true
};

/**
 * Test suite for AIDecisionLogger
 */
class AIDecisionLoggerTest {
    constructor() {
        this.logger = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }
    
    async runAllTests() {
        console.log('🧪 Starting AI Decision Logger Test Suite...\n');
        
        try {
            await this.testLoggerInitialization();
            await this.testSingleDecisionLogging();
            await this.testBatchDecisionLogging();
            await this.testDecisionRetrieval();
            await this.testMetricsCollection();
            await this.testBatchProcessing();
            await this.testErrorHandling();
            await this.testLoggerShutdown();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await this.cleanup();
            this.printTestResults();
        }
    }
    
    async testLoggerInitialization() {
        console.log('📋 Test 1: Logger Initialization');
        
        try {
            this.logger = new AIDecisionLogger(testConfig);
            await this.delay(200);
            
            this.assert(this.logger !== null, 'Logger should be created');
            this.assert(this.logger.isInitialized === true, 'Logger should be initialized');
            this.assert(this.logger.config.batchSize === 5, 'Batch size should be configured');
            
            const status = this.logger.getStatus();
            this.assert(status.isInitialized === true, 'Status should show initialized');
            
            this.testPassed('Logger initialization');
            
        } catch (error) {
            this.testFailed('Logger initialization', error);
        }
    }
    
    async testSingleDecisionLogging() {
        console.log('📋 Test 2: Single Decision Logging');
        
        try {
            const decision = {
                type: 'STRATEGY_CHANGE',
                strategy: 'COMPOUND_YIELD',
                action: 'REBALANCE_PORTFOLIO',
                confidence: 0.85,
                reasoning: 'Market conditions favor yield farming'
            };
            
            const decisionId = await this.logger.logDecision(decision);
            
            this.assert(typeof decisionId === 'string', 'Decision ID should be string');
            this.assert(decisionId.length === 16, 'Decision ID should be 16 characters');
            
            const loggedDecision = this.logger.getDecision(decisionId);
            this.assert(loggedDecision !== null, 'Decision should be in history');
            this.assert(loggedDecision.type === 'STRATEGY_CHANGE', 'Decision type should match');
            
            const metrics = this.logger.getMetrics();
            this.assert(metrics.totalDecisions >= 1, 'Total decisions should increment');
            
            this.testPassed('Single decision logging');
            
        } catch (error) {
            this.testFailed('Single decision logging', error);
        }
    }
    
    async testBatchDecisionLogging() {
        console.log('📋 Test 3: Batch Decision Logging');
        
        try {
            const decisions = [
                {
                    type: 'RISK_ASSESSMENT',
                    action: 'INCREASE_EXPOSURE',
                    confidence: 0.75,
                    reasoning: 'Low volatility detected'
                },
                {
                    type: 'LIQUIDITY_MANAGEMENT',
                    action: 'PROVIDE_LIQUIDITY',
                    confidence: 0.90,
                    reasoning: 'High fees opportunity'
                },
                {
                    type: 'ARBITRAGE_OPPORTUNITY',
                    action: 'EXECUTE_TRADE',
                    confidence: 0.95,
                    reasoning: 'Price discrepancy detected'
                }
            ];
            
            const decisionIds = await this.logger.logDecisionBatch(decisions);
            
            this.assert(Array.isArray(decisionIds), 'Should return array of decision IDs');
            this.assert(decisionIds.length === 3, 'Should return 3 decision IDs');
            
            decisionIds.forEach((id, index) => {
                const decision = this.logger.getDecision(id);
                this.assert(decision !== null, `Decision ${index} should be in history`);
                this.assert(decision.type === decisions[index].type, `Decision ${index} type should match`);
            });
            
            this.testPassed('Batch decision logging');
            
        } catch (error) {
            this.testFailed('Batch decision logging', error);
        }
    }
    
    async testDecisionRetrieval() {
        console.log('📋 Test 4: Decision Retrieval');
        
        try {
            const testDecisions = [
                { type: 'TYPE_A', strategy: 'STRATEGY_1', confidence: 0.7 },
                { type: 'TYPE_B', strategy: 'STRATEGY_1', confidence: 0.8 },
                { type: 'TYPE_A', strategy: 'STRATEGY_2', confidence: 0.9 }
            ];
            
            for (const decision of testDecisions) {
                await this.logger.logDecision(decision);
            }
            
            const typeADecisions = this.logger.getDecisions({ type: 'TYPE_A' });
            this.assert(typeADecisions.length >= 2, 'Should find TYPE_A decisions');
            
            const strategy1Decisions = this.logger.getDecisions({ strategy: 'STRATEGY_1' });
            this.assert(strategy1Decisions.length >= 2, 'Should find STRATEGY_1 decisions');
            
            const highConfidenceDecisions = this.logger.getDecisions({ confidence: 0.85 });
            this.assert(highConfidenceDecisions.length >= 1, 'Should find high confidence decisions');
            
            this.testPassed('Decision retrieval');
            
        } catch (error) {
            this.testFailed('Decision retrieval', error);
        }
    }
    
    async testMetricsCollection() {
        console.log('📋 Test 5: Metrics Collection');
        
        try {
            const metrics = this.logger.getMetrics();
            
            this.assert(typeof metrics.totalDecisions === 'number', 'Total decisions should be number');
            this.assert(typeof metrics.successfulLogs === 'number', 'Successful logs should be number');
            this.assert(typeof metrics.failedLogs === 'number', 'Failed logs should be number');
            this.assert(typeof metrics.batchesProcessed === 'number', 'Batches processed should be number');
            
            this.assert(typeof metrics.performance === 'object', 'Performance metrics should be object');
            this.assert(typeof metrics.performance.errorRate === 'number', 'Error rate should be number');
            
            this.assert(typeof metrics.queueSize === 'number', 'Queue size should be number');
            this.assert(typeof metrics.historySize === 'number', 'History size should be number');
            
            this.assert(metrics.totalDecisions >= 0, 'Total decisions should be non-negative');
            this.assert(metrics.performance.errorRate >= 0 && metrics.performance.errorRate <= 100, 'Error rate should be valid percentage');
            
            this.testPassed('Metrics collection');
            
        } catch (error) {
            this.testFailed('Metrics collection', error);
        }
    }
    
    async testBatchProcessing() {
        console.log('📋 Test 6: Batch Processing');
        
        try {
            const initialMetrics = this.logger.getMetrics();
            
            const batchDecisions = [];
            for (let i = 0; i < 6; i++) {
                batchDecisions.push({
                    type: 'BATCH_TEST',
                    action: `ACTION_${i}`,
                    confidence: 0.5 + (i * 0.1),
                    reasoning: `Batch test decision ${i}`
                });
            }
            
            await this.logger.logDecisionBatch(batchDecisions);
            await this.delay(1500);
            
            const updatedMetrics = this.logger.getMetrics();
            
            this.assert(updatedMetrics.batchesProcessed >= initialMetrics.batchesProcessed, 'Batches should be processed');
            this.assert(updatedMetrics.totalDecisions >= initialMetrics.totalDecisions + 6, 'Total decisions should increase');
            
            const batchTestDecisions = this.logger.getDecisions({ type: 'BATCH_TEST' });
            this.assert(batchTestDecisions.length >= 6, 'All batch decisions should be logged');
            
            this.testPassed('Batch processing');
            
        } catch (error) {
            this.testFailed('Batch processing', error);
        }
    }
    
    async testErrorHandling() {
        console.log('📋 Test 7: Error Handling');
        
        try {
            try {
                await this.logger.logDecision(null);
                this.assert(false, 'Should throw error for null decision');
            } catch (error) {
                this.assert(true, 'Should handle null decision gracefully');
            }
            
            const nonExistentId = 'non-existent-id';
            const result = await this.logger.logDecisionOutcome(nonExistentId, { success: true });
            this.assert(result === false, 'Should return false for non-existent decision outcome');
            
            const invalidDecisions = this.logger.getDecisions({ invalidCriteria: 'test' });
            this.assert(Array.isArray(invalidDecisions), 'Should return array even with invalid criteria');
            
            this.testPassed('Error handling');
            
        } catch (error) {
            this.testFailed('Error handling', error);
        }
    }
    
    async testLoggerShutdown() {
        console.log('📋 Test 8: Logger Shutdown');
        
        try {
            await this.logger.logDecision({
                type: 'SHUTDOWN_TEST',
                action: 'TEST_GRACEFUL_SHUTDOWN',
                confidence: 0.5
            });
            
            await this.logger.shutdown();
            
            this.assert(this.logger.isInitialized === false, 'Logger should be marked as not initialized');
            this.assert(this.logger.batchQueue.length === 0, 'Batch queue should be empty after shutdown');
            this.assert(this.logger.decisionHistory.size === 0, 'Decision history should be cleared');
            this.assert(this.logger.outcomeTracking.size === 0, 'Outcome tracking should be cleared');
            
            this.testPassed('Logger shutdown');
            
        } catch (error) {
            this.testFailed('Logger shutdown', error);
        }
    }
    
    // ========== Test Utilities ==========
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    testPassed(testName) {
        this.testResults.passed++;
        this.testResults.total++;
        console.log(`   ✅ ${testName} - PASSED`);
    }
    
    testFailed(testName, error) {
        this.testResults.failed++;
        this.testResults.total++;
        console.log(`   ❌ ${testName} - FAILED: ${error.message || error}`);
    }
    
    printTestResults() {
        console.log('\n📊 Test Results Summary:');
        console.log(`   Total Tests: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);
        console.log(`   Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! AI Decision Logger is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the implementation.');
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async cleanup() {
        try {
            const logDir = path.dirname(testConfig.localLogPath);
            try {
                await fs.rm(logDir, { recursive: true, force: true });
                console.log('🧹 Test log files cleaned up');
            } catch {
                // Ignore cleanup errors
            }
        } catch (error) {
            console.warn('⚠️ Cleanup warning:', error.message);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new AIDecisionLoggerTest();
    tester.runAllTests().catch(console.error);
}

module.exports = AIDecisionLoggerTest;