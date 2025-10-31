#!/usr/bin/env node

/**
 * @fileoverview Test script for updated API endpoints with Hedera integration
 * @description Comprehensive testing of vault and execute endpoints
 * @author AION Team
 * @version 2.0.0
 */

const axios = require('axios');
const chalk = require('chalk');

class UpdatedAPITester {
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
     * Test Vault Endpoints
     */
    async testVaultEndpoints() {
        console.log(chalk.blue('\n=== Testing Vault Endpoints with Hedera Integration ==='));

        // Test vault status
        const statusResult = await this.testEndpoint('GET', '/api/vault/status');
        this.logResult(
            'GET /api/vault/status',
            statusResult.success && statusResult.data?.data?.hedera,
            statusResult.error
        );

        // Test vault info
        const infoResult = await this.testEndpoint('GET', '/api/vault/info');
        this.logResult(
            'GET /api/vault/info',
            infoResult.success && infoResult.data?.data?.hedera,
            infoResult.error
        );

        // Test deposit with Hedera integration
        const depositData = {
            amount: '100000000000000000000', // 100 ETH
            asset: 'ETH',
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
            hederaAccountId: '0.0.123456',
            slippage: 0.005
        };

        const depositResult = await this.testEndpoint('POST', '/api/vault/deposit', depositData);
        this.logResult(
            'POST /api/vault/deposit (with Hedera)',
            depositResult.success && depositResult.data?.data?.hedera,
            depositResult.error
        );

        // Test withdrawal with Hedera integration
        const withdrawData = {
            shares: '40000000000000000000', // 40 shares
            asset: 'ETH',
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
            hederaAccountId: '0.0.123456',
            slippage: 0.005
        };

        const withdrawResult = await this.testEndpoint('POST', '/api/vault/withdraw', withdrawData);
        this.logResult(
            'POST /api/vault/withdraw (with Hedera)',
            withdrawResult.success && withdrawResult.data?.data?.hedera,
            withdrawResult.error
        );

        // Test positions
        const positionsResult = await this.testEndpoint('GET', '/api/vault/positions?userAddress=0x742d35Cc6634C0532925a3b8D4C9db96590c6C87&hederaAccountId=0.0.123456');
        this.logResult(
            'GET /api/vault/positions (with Hedera)',
            positionsResult.success && positionsResult.data?.data?.hederaBalance,
            positionsResult.error
        );

        // Test history
        const historyResult = await this.testEndpoint('GET', '/api/vault/history?userAddress=0x742d35Cc6634C0532925a3b8D4C9db96590c6C87&limit=10');
        this.logResult(
            'GET /api/vault/history',
            historyResult.success,
            historyResult.error
        );
    }

    /**
     * Test Execute Endpoints
     */
    async testExecuteEndpoints() {
        console.log(chalk.blue('\n=== Testing Execute Endpoints with Hedera Integration ==='));

        // Test strategy execution with Hedera logging
        const executeData = {
            strategyId: 'yield-farming-v2',
            parameters: {
                targetAPY: 0.15,
                riskLevel: 'medium',
                assets: ['ETH', 'USDC'],
                allocation: { 'ETH': 0.6, 'USDC': 0.4 }
            },
            dryRun: false,
            maxSlippage: 0.01,
            userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
            hederaAccountId: '0.0.123456'
        };

        const executeResult = await this.testEndpoint('POST', '/api/execute/strategy', executeData);
        this.logResult(
            'POST /api/execute/strategy (with Hedera logging)',
            executeResult.success && executeResult.data?.data?.aiDecisionId,
            executeResult.error
        );

        // Test dry run execution
        const dryRunData = {
            ...executeData,
            dryRun: true
        };

        const dryRunResult = await this.testEndpoint('POST', '/api/execute/strategy', dryRunData);
        this.logResult(
            'POST /api/execute/strategy (dry run)',
            dryRunResult.success,
            dryRunResult.error
        );
    }

    /**
     * Test Integration Features
     */
    async testIntegrationFeatures() {
        console.log(chalk.blue('\n=== Testing Hedera Integration Features ==='));

        // Test that vault status includes Hedera information
        const statusResult = await this.testEndpoint('GET', '/api/vault/status');
        if (statusResult.success) {
            const hederaData = statusResult.data?.data?.hedera;
            this.logResult(
                'Vault status includes Hedera integration data',
                !!(hederaData && hederaData.services && hederaData.crossChain),
                'Missing Hedera integration data'
            );

            this.logResult(
                'HTS token information present',
                !!(hederaData?.services?.hts?.tokenId),
                'Missing HTS token information'
            );

            this.logResult(
                'HCS topic information present',
                !!(hederaData?.services?.hcs?.topicId),
                'Missing HCS topic information'
            );
        }

        // Test that vault info includes comprehensive Hedera details
        const infoResult = await this.testEndpoint('GET', '/api/vault/info');
        if (infoResult.success) {
            const hederaInfo = infoResult.data?.data?.hedera;
            this.logResult(
                'Vault info includes detailed Hedera configuration',
                !!(hederaInfo && hederaInfo.token && hederaInfo.consensus),
                'Missing detailed Hedera configuration'
            );
        }

        // Test AI decision integration
        const aiResult = await this.testEndpoint('GET', '/api/vault/status');
        if (aiResult.success) {
            const aiData = aiResult.data?.data?.ai;
            this.logResult(
                'AI insights included in vault status',
                !!(aiData && (aiData.recentDecisions || aiData.performance)),
                'Missing AI insights data'
            );
        }
    }

    /**
     * Test Error Handling
     */
    async testErrorHandling() {
        console.log(chalk.blue('\n=== Testing Error Handling ==='));

        // Test invalid deposit data
        const invalidDepositData = {
            amount: 'invalid_amount',
            asset: 'INVALID_ASSET'
        };

        const invalidDepositResult = await this.testEndpoint('POST', '/api/vault/deposit', invalidDepositData, 400);
        this.logResult(
            'POST /api/vault/deposit (invalid data)',
            invalidDepositResult.status === 400,
            invalidDepositResult.error
        );

        // Test missing required fields
        const incompleteData = {
            strategyId: 'test-strategy'
            // Missing required parameters field
        };

        const incompleteResult = await this.testEndpoint('POST', '/api/execute/strategy', incompleteData, 400);
        this.logResult(
            'POST /api/execute/strategy (missing fields)',
            incompleteResult.status === 400,
            incompleteResult.error
        );

        // Test positions without required parameters
        const noParamsResult = await this.testEndpoint('GET', '/api/vault/positions', null, 400);
        this.logResult(
            'GET /api/vault/positions (no parameters)',
            noParamsResult.status === 400,
            noParamsResult.error
        );
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(chalk.yellow('🚀 Starting Updated API Endpoint Tests\n'));
        console.log(chalk.gray(`Base URL: ${this.baseURL}`));
        console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

        try {
            await this.testVaultEndpoints();
            await this.testExecuteEndpoints();
            await this.testIntegrationFeatures();
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
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const baseURL = args[0] || 'http://localhost:3000';
    
    const tester = new UpdatedAPITester(baseURL);
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error(chalk.red('Test execution failed:'), error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { UpdatedAPITester };