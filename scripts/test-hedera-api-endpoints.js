#!/usr/bin/env node

/**
 * @fileoverview Test script for Hedera API endpoints
 * @description Comprehensive testing of all Hedera API endpoints
 * @author AION Team
 * @version 2.0.0
 */

const axios = require('axios');
const chalk = require('chalk');

class HederaAPITester {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    /**
     * Log test result
     */
    logResult(testName, success, details = '') {
        this.testResults.total++;
        if (success) {
            this.testResults.passed++;
            console.log(chalk.green(`✓ ${testName}`));
        } else {
            this.testResults.failed++;
            console.log(chalk.red(`✗ ${testName}`));
            if (details) {
                console.log(chalk.red(`  Error: ${details}`));
            }
        }
        
        this.testResults.details.push({
            test: testName,
            success: success,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Test API endpoint
     */
    async testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
        try {
            let response;
            
            switch (method.toUpperCase()) {
                case 'GET':
                    response = await this.client.get(endpoint);
                    break;
                case 'POST':
                    response = await this.client.post(endpoint, data);
                    break;
                case 'PUT':
                    response = await this.client.put(endpoint, data);
                    break;
                case 'DELETE':
                    response = await this.client.delete(endpoint);
                    break;
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }

            const success = response.status === expectedStatus;
            return {
                success: success,
                status: response.status,
                data: response.data,
                error: null
            };
        } catch (error) {
            return {
                success: false,
                status: error.response?.status || 0,
                data: error.response?.data || null,
                error: error.message
            };
        }
    }

    /**
     * Test Health and Status Endpoints
     */
    async testHealthEndpoints() {
        console.log(chalk.blue('\n=== Testing Health and Status Endpoints ==='));

        // Test health endpoint
        const healthResult = await this.testEndpoint('GET', '/api/hedera/health');
        this.logResult(
            'GET /api/hedera/health',
            healthResult.success,
            healthResult.error
        );

        // Test status endpoint
        const statusResult = await this.testEndpoint('GET', '/api/hedera/status');
        this.logResult(
            'GET /api/hedera/status',
            statusResult.success,
            statusResult.error
        );

        // Test analytics endpoint
        const analyticsResult = await this.testEndpoint('GET', '/api/hedera/analytics');
        this.logResult(
            'GET /api/hedera/analytics',
            analyticsResult.success,
            analyticsResult.error
        );
    }

    /**
     * Test Decision Endpoints
     */
    async testDecisionEndpoints() {
        console.log(chalk.blue('\n=== Testing Decision Endpoints ==='));

        // Test get decisions
        const getDecisionsResult = await this.testEndpoint('GET', '/api/hedera/decisions');
        this.logResult(
            'GET /api/hedera/decisions',
            getDecisionsResult.success,
            getDecisionsResult.error
        );

        // Test log decision
        const decisionData = {
            type: 'investment',
            action: 'buy_ethereum',
            confidence: 0.85,
            reasoning: 'Strong technical indicators and market sentiment',
            context: {
                market: 'crypto',
                asset: 'ETH',
                price: 2500
            },
            parameters: {
                amount: '1000',
                strategy: 'dca'
            }
        };

        const logDecisionResult = await this.testEndpoint('POST', '/api/hedera/decisions', decisionData);
        this.logResult(
            'POST /api/hedera/decisions',
            logDecisionResult.success,
            logDecisionResult.error
        );

        // If decision was logged successfully, test getting it by ID
        if (logDecisionResult.success && logDecisionResult.data?.data?.decisionId) {
            const decisionId = logDecisionResult.data.data.decisionId;
            
            const getDecisionResult = await this.testEndpoint('GET', `/api/hedera/decisions/${decisionId}`);
            this.logResult(
                `GET /api/hedera/decisions/${decisionId}`,
                getDecisionResult.success,
                getDecisionResult.error
            );

            // Test logging outcome
            const outcomeData = {
                result: 'success',
                actualReturn: 0.12,
                executionTime: Date.now(),
                notes: 'Trade executed successfully'
            };

            const logOutcomeResult = await this.testEndpoint('POST', `/api/hedera/decisions/${decisionId}/outcome`, outcomeData);
            this.logResult(
                `POST /api/hedera/decisions/${decisionId}/outcome`,
                logOutcomeResult.success,
                logOutcomeResult.error
            );
        }
    }

    /**
     * Test Token Endpoints
     */
    async testTokenEndpoints() {
        console.log(chalk.blue('\n=== Testing Token Endpoints ==='));

        const testTokenId = '0.0.123456';

        // Test get token info
        const getTokenResult = await this.testEndpoint('GET', `/api/hedera/token/${testTokenId}`);
        this.logResult(
            `GET /api/hedera/token/${testTokenId}`,
            getTokenResult.success,
            getTokenResult.error
        );

        // Test mint tokens
        const mintData = {
            amount: '1000000000000000000', // 1 token with 18 decimals
            metadata: {
                reason: 'test_mint',
                timestamp: Date.now()
            }
        };

        const mintResult = await this.testEndpoint('POST', `/api/hedera/token/${testTokenId}/mint`, mintData);
        this.logResult(
            `POST /api/hedera/token/${testTokenId}/mint`,
            mintResult.success,
            mintResult.error
        );

        // Test burn tokens
        const burnData = {
            amount: '500000000000000000', // 0.5 tokens
            metadata: {
                reason: 'test_burn',
                timestamp: Date.now()
            }
        };

        const burnResult = await this.testEndpoint('POST', `/api/hedera/token/${testTokenId}/burn`, burnData);
        this.logResult(
            `POST /api/hedera/token/${testTokenId}/burn`,
            burnResult.success,
            burnResult.error
        );

        // Test transfer tokens
        const transferData = {
            fromAccountId: '0.0.123456',
            toAccountId: '0.0.789012',
            amount: '250000000000000000', // 0.25 tokens
            metadata: {
                reason: 'test_transfer',
                timestamp: Date.now()
            }
        };

        const transferResult = await this.testEndpoint('POST', `/api/hedera/token/${testTokenId}/transfer`, transferData);
        this.logResult(
            `POST /api/hedera/token/${testTokenId}/transfer`,
            transferResult.success,
            transferResult.error
        );

        // Test associate token
        const associateData = {
            accountId: '0.0.789012'
        };

        const associateResult = await this.testEndpoint('POST', `/api/hedera/token/${testTokenId}/associate`, associateData);
        this.logResult(
            `POST /api/hedera/token/${testTokenId}/associate`,
            associateResult.success,
            associateResult.error
        );
    }

    /**
     * Test HCS Endpoints
     */
    async testHCSEndpoints() {
        console.log(chalk.blue('\n=== Testing HCS Endpoints ==='));

        // Test submit single message
        const messageData = {
            message: {
                type: 'ai_decision',
                timestamp: Date.now(),
                data: {
                    decision: 'buy_bitcoin',
                    confidence: 0.92,
                    reasoning: 'Strong bullish indicators'
                }
            }
        };

        const submitResult = await this.testEndpoint('POST', '/api/hedera/hcs/submit', messageData);
        this.logResult(
            'POST /api/hedera/hcs/submit',
            submitResult.success,
            submitResult.error
        );

        // Test submit batch messages
        const batchData = {
            messages: [
                {
                    type: 'performance_metric',
                    timestamp: Date.now(),
                    data: { metric: 'accuracy', value: 0.95 }
                },
                {
                    type: 'model_update',
                    timestamp: Date.now(),
                    data: { version: '2.1.0', changes: 'Improved decision accuracy' }
                },
                {
                    type: 'system_status',
                    timestamp: Date.now(),
                    data: { status: 'healthy', uptime: 99.9 }
                }
            ]
        };

        const batchResult = await this.testEndpoint('POST', '/api/hedera/hcs/batch', batchData);
        this.logResult(
            'POST /api/hedera/hcs/batch',
            batchResult.success,
            batchResult.error
        );
    }

    /**
     * Test Model Metadata Endpoints
     */
    async testModelEndpoints() {
        console.log(chalk.blue('\n=== Testing Model Metadata Endpoints ==='));

        // Test store model metadata
        const modelData = {
            name: 'AION-Decision-Engine',
            type: 'neural_network',
            version: '2.1.0',
            description: 'Advanced AI decision engine for DeFi strategies',
            architecture: {
                layers: 12,
                neurons: 2048,
                activation: 'relu',
                optimizer: 'adam'
            },
            parameters: {
                learning_rate: 0.001,
                batch_size: 32,
                epochs: 100
            },
            performance: {
                accuracy: 0.95,
                precision: 0.93,
                recall: 0.97,
                f1_score: 0.95
            }
        };

        const storeModelResult = await this.testEndpoint('POST', '/api/hedera/models', modelData);
        this.logResult(
            'POST /api/hedera/models',
            storeModelResult.success,
            storeModelResult.error
        );

        // If model was stored successfully, test retrieving it
        if (storeModelResult.success && storeModelResult.data?.data?.modelId) {
            const modelId = storeModelResult.data.data.modelId;
            
            const getModelResult = await this.testEndpoint('GET', `/api/hedera/models/${modelId}`);
            this.logResult(
                `GET /api/hedera/models/${modelId}`,
                getModelResult.success,
                getModelResult.error
            );

            const getVersionsResult = await this.testEndpoint('GET', `/api/hedera/models/${modelId}/versions`);
            this.logResult(
                `GET /api/hedera/models/${modelId}/versions`,
                getVersionsResult.success,
                getVersionsResult.error
            );
        }

        // Test list all models
        const listModelsResult = await this.testEndpoint('GET', '/api/hedera/models');
        this.logResult(
            'GET /api/hedera/models',
            listModelsResult.success,
            listModelsResult.error
        );
    }

    /**
     * Test Error Handling
     */
    async testErrorHandling() {
        console.log(chalk.blue('\n=== Testing Error Handling ==='));

        // Test invalid endpoint
        const invalidResult = await this.testEndpoint('GET', '/api/hedera/invalid', null, 404);
        this.logResult(
            'GET /api/hedera/invalid (404 expected)',
            invalidResult.status === 404,
            invalidResult.error
        );

        // Test invalid decision data
        const invalidDecisionData = {
            type: 'invalid',
            // Missing required fields
        };

        const invalidDecisionResult = await this.testEndpoint('POST', '/api/hedera/decisions', invalidDecisionData, 400);
        this.logResult(
            'POST /api/hedera/decisions (invalid data)',
            invalidDecisionResult.status === 400,
            invalidDecisionResult.error
        );

        // Test invalid token operation
        const invalidTokenData = {
            // Missing required amount field
            metadata: {}
        };

        const invalidTokenResult = await this.testEndpoint('POST', '/api/hedera/token/invalid/mint', invalidTokenData, 400);
        this.logResult(
            'POST /api/hedera/token/invalid/mint (invalid data)',
            invalidTokenResult.status === 400,
            invalidTokenResult.error
        );
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(chalk.yellow('🚀 Starting Hedera API Endpoint Tests\n'));
        console.log(chalk.gray(`Base URL: ${this.baseURL}`));
        console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

        try {
            await this.testHealthEndpoints();
            await this.testDecisionEndpoints();
            await this.testTokenEndpoints();
            await this.testHCSEndpoints();
            await this.testModelEndpoints();
            await this.testErrorHandling();

            this.printSummary();
        } catch (error) {
            console.error(chalk.red('\n❌ Test suite failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log(chalk.blue('\n=== Test Summary ==='));
        console.log(chalk.green(`✓ Passed: ${this.testResults.passed}`));
        console.log(chalk.red(`✗ Failed: ${this.testResults.failed}`));
        console.log(chalk.blue(`📊 Total: ${this.testResults.total}`));
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(chalk.yellow(`📈 Success Rate: ${successRate}%`));

        if (this.testResults.failed > 0) {
            console.log(chalk.red('\n❌ Some tests failed. Check the details above.'));
            process.exit(1);
        } else {
            console.log(chalk.green('\n🎉 All tests passed!'));
        }
    }

    /**
     * Save test results to file
     */
    async saveResults(filename = 'hedera-api-test-results.json') {
        const results = {
            summary: {
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                total: this.testResults.total,
                successRate: ((this.testResults.passed / this.testResults.total) * 100).toFixed(1)
            },
            details: this.testResults.details,
            timestamp: new Date().toISOString(),
            baseURL: this.baseURL
        };

        const fs = require('fs').promises;
        await fs.writeFile(filename, JSON.stringify(results, null, 2));
        console.log(chalk.blue(`\n📄 Test results saved to: ${filename}`));
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const baseURL = args[0] || 'http://localhost:3000';
    
    const tester = new HederaAPITester(baseURL);
    
    try {
        await tester.runAllTests();
        await tester.saveResults();
    } catch (error) {
        console.error(chalk.red('Test execution failed:'), error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { HederaAPITester };