#!/usr/bin/env node

/**
 * @fileoverview Comprehensive API Test Suite
 * @description Complete testing suite for all API endpoints with authentication, error handling, and integration tests
 * @author AION Team
 * @version 2.0.0
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs').promises;

class ComprehensiveAPITester {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: baseURL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            categories: {},
            details: []
        };
        
        // Test credentials and tokens
        this.credentials = {
            admin: {
                username: 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'AIONAdmin2024!',
                token: null
            },
            apiUser: {
                username: 'api_user',
                password: process.env.API_USER_PASSWORD || 'AIONApi2024!',
                token: null
            }
        };
        
        // Test data
        this.testData = {
            validUser: {
                username: 'test_user_' + Date.now(),
                email: 'test@aion-ai.com',
                password: 'TestPassword123!',
                role: 'trader',
                hederaAccountId: '0.0.999999'
            },
            validDeposit: {
                amount: '1000000000000000000', // 1 ETH
                asset: 'ETH',
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
                hederaAccountId: '0.0.123456',
                slippage: 0.005
            },
            validStrategy: {
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
            }
        };
    }

    /**
     * Log test result with category tracking
     */
    logResult(testName, success, category = 'general', details = '') {
        this.testResults.total++;
        
        if (!this.testResults.categories[category]) {
            this.testResults.categories[category] = { passed: 0, failed: 0, total: 0 };
        }
        
        this.testResults.categories[category].total++;
        
        if (success) {
            this.testResults.passed++;
            this.testResults.categories[category].passed++;
            console.log(chalk.green(`✓ [${category.toUpperCase()}] ${testName}`));
        } else {
            this.testResults.failed++;
            this.testResults.categories[category].failed++;
            console.log(chalk.red(`✗ [${category.toUpperCase()}] ${testName}`));
            if (details) {
                console.log(chalk.red(`  Error: ${details}`));
            }
        }
        
        this.testResults.details.push({
            test: testName,
            category: category,
            success: success,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Test API endpoint with comprehensive error handling
     */
    async testEndpoint(method, endpoint, data = null, headers = {}, expectedStatus = 200, category = 'general') {
        try {
            const config = {
                method: method.toLowerCase(),
                url: endpoint,
                headers: headers,
                timeout: 10000
            };
            
            if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
                config.data = data;
            }
            
            const response = await this.client(config);
            
            const success = response.status === expectedStatus;
            return {
                success: success,
                status: response.status,
                data: response.data,
                headers: response.headers,
                error: null
            };
        } catch (error) {
            const actualStatus = error.response?.status || 0;
            const success = expectedStatus === actualStatus;
            
            return {
                success: success,
                status: actualStatus,
                data: error.response?.data || null,
                headers: error.response?.headers || {},
                error: error.message
            };
        }
    }

    /**
     * Authenticate users and get tokens
     */
    async authenticateUsers() {
        console.log(chalk.blue('\n=== Authenticating Test Users ==='));

        // Authenticate admin user
        const adminLoginResult = await this.testEndpoint(
            'POST', 
            '/api/auth/login', 
            {
                username: this.credentials.admin.username,
                password: this.credentials.admin.password
            },
            {},
            200,
            'auth'
        );

        this.logResult(
            'Admin user authentication',
            adminLoginResult.success && adminLoginResult.data?.data?.accessToken,
            'auth',
            adminLoginResult.error
        );

        if (adminLoginResult.success && adminLoginResult.data?.data?.accessToken) {
            this.credentials.admin.token = adminLoginResult.data.data.accessToken;
        }

        // Authenticate API user
        const apiLoginResult = await this.testEndpoint(
            'POST',
            '/api/auth/login',
            {
                username: this.credentials.apiUser.username,
                password: this.credentials.apiUser.password
            },
            {},
            200,
            'auth'
        );

        this.logResult(
            'API user authentication',
            apiLoginResult.success && apiLoginResult.data?.data?.accessToken,
            'auth',
            apiLoginResult.error
        );

        if (apiLoginResult.success && apiLoginResult.data?.data?.accessToken) {
            this.credentials.apiUser.token = apiLoginResult.data.data.accessToken;
        }
    }

    /**
     * Test Authentication Endpoints
     */
    async testAuthenticationEndpoints() {
        console.log(chalk.blue('\n=== Testing Authentication Endpoints ==='));

        // Test invalid login
        const invalidLoginResult = await this.testEndpoint(
            'POST',
            '/api/auth/login',
            { username: 'invalid', password: 'invalid' },
            {},
            401,
            'auth'
        );

        this.logResult(
            'Invalid login rejection',
            invalidLoginResult.success,
            'auth',
            invalidLoginResult.error
        );

        // Test missing credentials
        const missingCredsResult = await this.testEndpoint(
            'POST',
            '/api/auth/login',
            {},
            {},
            400,
            'auth'
        );

        this.logResult(
            'Missing credentials validation',
            missingCredsResult.success,
            'auth',
            missingCredsResult.error
        );

        // Test profile access with valid token
        if (this.credentials.admin.token) {
            const profileResult = await this.testEndpoint(
                'GET',
                '/api/auth/profile',
                null,
                { 'Authorization': `Bearer ${this.credentials.admin.token}` },
                200,
                'auth'
            );

            this.logResult(
                'Profile access with valid token',
                profileResult.success && profileResult.data?.data?.username,
                'auth',
                profileResult.error
            );
        }

        // Test profile access without token
        const noTokenResult = await this.testEndpoint(
            'GET',
            '/api/auth/profile',
            null,
            {},
            401,
            'auth'
        );

        this.logResult(
            'Profile access without token',
            noTokenResult.success,
            'auth',
            noTokenResult.error
        );

        // Test profile access with invalid token
        const invalidTokenResult = await this.testEndpoint(
            'GET',
            '/api/auth/profile',
            null,
            { 'Authorization': 'Bearer invalid_token' },
            401,
            'auth'
        );

        this.logResult(
            'Profile access with invalid token',
            invalidTokenResult.success,
            'auth',
            invalidTokenResult.error
        );
    }

    /**
     * Test Authorization and Role-Based Access
     */
    async testAuthorizationEndpoints() {
        console.log(chalk.blue('\n=== Testing Authorization and RBAC ==='));

        if (!this.credentials.admin.token || !this.credentials.apiUser.token) {
            console.log(chalk.yellow('⚠️  Skipping authorization tests - missing tokens'));
            return;
        }

        const adminHeaders = { 'Authorization': `Bearer ${this.credentials.admin.token}` };
        const apiHeaders = { 'Authorization': `Bearer ${this.credentials.apiUser.token}` };

        // Test admin access to user management
        const adminUsersResult = await this.testEndpoint(
            'GET',
            '/api/auth/users',
            null,
            adminHeaders,
            200,
            'rbac'
        );

        this.logResult(
            'Admin access to user management',
            adminUsersResult.success && Array.isArray(adminUsersResult.data?.data?.users),
            'rbac',
            adminUsersResult.error
        );

        // Test non-admin access to user management (should fail)
        const nonAdminUsersResult = await this.testEndpoint(
            'GET',
            '/api/auth/users',
            null,
            apiHeaders,
            403,
            'rbac'
        );

        this.logResult(
            'Non-admin denied user management access',
            nonAdminUsersResult.success,
            'rbac',
            nonAdminUsersResult.error
        );

        // Test user creation by admin
        const createUserResult = await this.testEndpoint(
            'POST',
            '/api/auth/users',
            this.testData.validUser,
            adminHeaders,
            200,
            'rbac'
        );

        this.logResult(
            'Admin can create users',
            createUserResult.success,
            'rbac',
            createUserResult.error
        );

        // Test user creation by non-admin (should fail)
        const nonAdminCreateResult = await this.testEndpoint(
            'POST',
            '/api/auth/users',
            {
                username: 'unauthorized_user',
                email: 'unauthorized@test.com',
                password: 'Password123!',
                role: 'viewer'
            },
            apiHeaders,
            403,
            'rbac'
        );

        this.logResult(
            'Non-admin denied user creation',
            nonAdminCreateResult.success,
            'rbac',
            nonAdminCreateResult.error
        );
    }

    /**
     * Test Vault Endpoints
     */
    async testVaultEndpoints() {
        console.log(chalk.blue('\n=== Testing Vault Endpoints ==='));

        // Test public vault status (no auth required)
        const publicStatusResult = await this.testEndpoint(
            'GET',
            '/api/vault/status',
            null,
            {},
            200,
            'vault'
        );

        this.logResult(
            'Public vault status access',
            publicStatusResult.success && publicStatusResult.data?.data?.vault,
            'vault',
            publicStatusResult.error
        );

        // Test vault info
        const vaultInfoResult = await this.testEndpoint(
            'GET',
            '/api/vault/info',
            null,
            {},
            200,
            'vault'
        );

        this.logResult(
            'Vault info access',
            vaultInfoResult.success && vaultInfoResult.data?.data?.hedera,
            'vault',
            vaultInfoResult.error
        );

        if (this.credentials.admin.token) {
            const authHeaders = { 'Authorization': `Bearer ${this.credentials.admin.token}` };

            // Test authenticated vault status
            const authStatusResult = await this.testEndpoint(
                'GET',
                '/api/vault/status',
                null,
                authHeaders,
                200,
                'vault'
            );

            this.logResult(
                'Authenticated vault status',
                authStatusResult.success,
                'vault',
                authStatusResult.error
            );

            // Test vault deposit
            const depositResult = await this.testEndpoint(
                'POST',
                '/api/vault/deposit',
                this.testData.validDeposit,
                authHeaders,
                200,
                'vault'
            );

            this.logResult(
                'Vault deposit operation',
                depositResult.success && depositResult.data?.data?.depositId,
                'vault',
                depositResult.error
            );

            // Test vault withdrawal
            const withdrawData = {
                shares: '500000000000000000', // 0.5 shares
                asset: 'ETH',
                userAddress: this.testData.validDeposit.userAddress,
                hederaAccountId: this.testData.validDeposit.hederaAccountId,
                slippage: 0.005
            };

            const withdrawResult = await this.testEndpoint(
                'POST',
                '/api/vault/withdraw',
                withdrawData,
                authHeaders,
                200,
                'vault'
            );

            this.logResult(
                'Vault withdrawal operation',
                withdrawResult.success && withdrawResult.data?.data?.withdrawalId,
                'vault',
                withdrawResult.error
            );

            // Test positions
            const positionsResult = await this.testEndpoint(
                'GET',
                '/api/vault/positions?userAddress=' + this.testData.validDeposit.userAddress,
                null,
                authHeaders,
                200,
                'vault'
            );

            this.logResult(
                'User positions retrieval',
                positionsResult.success && positionsResult.data?.data?.shares,
                'vault',
                positionsResult.error
            );

            // Test history
            const historyResult = await this.testEndpoint(
                'GET',
                '/api/vault/history?limit=10',
                null,
                authHeaders,
                200,
                'vault'
            );

            this.logResult(
                'Transaction history retrieval',
                historyResult.success && Array.isArray(historyResult.data?.data?.transactions),
                'vault',
                historyResult.error
            );
        }

        // Test unauthorized deposit (no token)
        const unauthDepositResult = await this.testEndpoint(
            'POST',
            '/api/vault/deposit',
            this.testData.validDeposit,
            {},
            401,
            'vault'
        );

        this.logResult(
            'Unauthorized deposit rejection',
            unauthDepositResult.success,
            'vault',
            unauthDepositResult.error
        );
    }

    /**
     * Test Execute Endpoints
     */
    async testExecuteEndpoints() {
        console.log(chalk.blue('\n=== Testing Execute Endpoints ==='));

        if (!this.credentials.admin.token) {
            console.log(chalk.yellow('⚠️  Skipping execute tests - no admin token'));
            return;
        }

        const authHeaders = { 'Authorization': `Bearer ${this.credentials.admin.token}` };

        // Test strategy execution
        const executeResult = await this.testEndpoint(
            'POST',
            '/api/execute/strategy',
            this.testData.validStrategy,
            authHeaders,
            200,
            'execute'
        );

        this.logResult(
            'Strategy execution',
            executeResult.success && executeResult.data?.data?.executionId,
            'execute',
            executeResult.error
        );

        // Test dry run execution
        const dryRunData = { ...this.testData.validStrategy, dryRun: true };
        const dryRunResult = await this.testEndpoint(
            'POST',
            '/api/execute/strategy',
            dryRunData,
            authHeaders,
            200,
            'execute'
        );

        this.logResult(
            'Dry run strategy execution',
            dryRunResult.success,
            'execute',
            dryRunResult.error
        );

        // Test unauthorized execution
        const unauthExecuteResult = await this.testEndpoint(
            'POST',
            '/api/execute/strategy',
            this.testData.validStrategy,
            {},
            401,
            'execute'
        );

        this.logResult(
            'Unauthorized execution rejection',
            unauthExecuteResult.success,
            'execute',
            unauthExecuteResult.error
        );
    }

    /**
     * Test Hedera Endpoints
     */
    async testHederaEndpoints() {
        console.log(chalk.blue('\n=== Testing Hedera Endpoints ==='));

        // Test public health endpoint
        const healthResult = await this.testEndpoint(
            'GET',
            '/api/hedera/health',
            null,
            {},
            200,
            'hedera'
        );

        this.logResult(
            'Hedera health check',
            healthResult.success && healthResult.data?.data,
            'hedera',
            healthResult.error
        );

        // Test status endpoint
        const statusResult = await this.testEndpoint(
            'GET',
            '/api/hedera/status',
            null,
            {},
            200,
            'hedera'
        );

        this.logResult(
            'Hedera status check',
            statusResult.success && statusResult.data?.data?.status,
            'hedera',
            statusResult.error
        );

        if (this.credentials.admin.token) {
            const authHeaders = { 'Authorization': `Bearer ${this.credentials.admin.token}` };

            // Test AI decisions endpoint
            const decisionsResult = await this.testEndpoint(
                'GET',
                '/api/hedera/decisions',
                null,
                authHeaders,
                200,
                'hedera'
            );

            this.logResult(
                'AI decisions retrieval',
                decisionsResult.success && decisionsResult.data?.data?.decisions !== undefined,
                'hedera',
                decisionsResult.error
            );

            // Test log AI decision
            const decisionData = {
                type: 'test_decision',
                action: 'test_action',
                confidence: 0.85,
                reasoning: 'Test decision for API testing',
                context: { test: true },
                parameters: { testParam: 'value' }
            };

            const logDecisionResult = await this.testEndpoint(
                'POST',
                '/api/hedera/decisions',
                decisionData,
                authHeaders,
                200,
                'hedera'
            );

            this.logResult(
                'AI decision logging',
                logDecisionResult.success && logDecisionResult.data?.data?.decisionId,
                'hedera',
                logDecisionResult.error
            );

            // Test HCS message submission
            const hcsData = {
                message: {
                    type: 'test_message',
                    timestamp: Date.now(),
                    data: { test: 'API testing message' }
                }
            };

            const hcsResult = await this.testEndpoint(
                'POST',
                '/api/hedera/hcs/submit',
                hcsData,
                authHeaders,
                200,
                'hedera'
            );

            this.logResult(
                'HCS message submission',
                hcsResult.success,
                'hedera',
                hcsResult.error
            );

            // Test model metadata storage
            const modelData = {
                name: 'Test-Model',
                type: 'neural_network',
                version: '1.0.0-test',
                description: 'Test model for API testing',
                architecture: { layers: 3, neurons: 64 },
                performance: { accuracy: 0.95 }
            };

            const modelResult = await this.testEndpoint(
                'POST',
                '/api/hedera/models',
                modelData,
                authHeaders,
                200,
                'hedera'
            );

            this.logResult(
                'Model metadata storage',
                modelResult.success && modelResult.data?.data?.modelId,
                'hedera',
                modelResult.error
            );
        }
    }

    /**
     * Test Error Handling
     */
    async testErrorHandling() {
        console.log(chalk.blue('\n=== Testing Error Handling ==='));

        // Test invalid JSON
        try {
            await this.client.post('/api/auth/login', 'invalid json', {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            this.logResult(
                'Invalid JSON handling',
                error.response?.status === 400,
                'error',
                error.response?.status !== 400 ? 'Expected 400 status' : ''
            );
        }

        // Test invalid endpoint
        const invalidEndpointResult = await this.testEndpoint(
            'GET',
            '/api/nonexistent/endpoint',
            null,
            {},
            404,
            'error'
        );

        this.logResult(
            'Invalid endpoint handling',
            invalidEndpointResult.success,
            'error',
            invalidEndpointResult.error
        );

        // Test invalid method
        const invalidMethodResult = await this.testEndpoint(
            'DELETE',
            '/api/auth/login',
            null,
            {},
            404,
            'error'
        );

        this.logResult(
            'Invalid method handling',
            invalidMethodResult.success,
            'error',
            invalidMethodResult.error
        );

        // Test malformed data
        const malformedDataResult = await this.testEndpoint(
            'POST',
            '/api/vault/deposit',
            {
                amount: 'not_a_number',
                asset: 'INVALID_ASSET',
                userAddress: 'invalid_address'
            },
            this.credentials.admin.token ? { 'Authorization': `Bearer ${this.credentials.admin.token}` } : {},
            400,
            'error'
        );

        this.logResult(
            'Malformed data validation',
            malformedDataResult.success,
            'error',
            malformedDataResult.error
        );
    }

    /**
     * Test Rate Limiting
     */
    async testRateLimiting() {
        console.log(chalk.blue('\n=== Testing Rate Limiting ==='));

        // Test multiple rapid requests to login endpoint
        const rapidRequests = [];
        for (let i = 0; i < 15; i++) {
            rapidRequests.push(
                this.testEndpoint(
                    'POST',
                    '/api/auth/login',
                    { username: 'test', password: 'test' },
                    {},
                    401, // We expect 401 for invalid credentials, but some might be 429 for rate limit
                    'rate-limit'
                )
            );
        }

        const results = await Promise.all(rapidRequests);
        const rateLimitedRequests = results.filter(r => r.status === 429);

        this.logResult(
            'Rate limiting enforcement',
            rateLimitedRequests.length > 0,
            'rate-limit',
            rateLimitedRequests.length === 0 ? 'No rate limiting detected' : `${rateLimitedRequests.length} requests rate limited`
        );
    }

    /**
     * Test Integration Scenarios
     */
    async testIntegrationScenarios() {
        console.log(chalk.blue('\n=== Testing Integration Scenarios ==='));

        if (!this.credentials.admin.token) {
            console.log(chalk.yellow('⚠️  Skipping integration tests - no admin token'));
            return;
        }

        const authHeaders = { 'Authorization': `Bearer ${this.credentials.admin.token}` };

        // Test complete user journey: deposit -> check position -> withdraw
        console.log(chalk.gray('  Testing complete user journey...'));

        // 1. Deposit
        const depositResult = await this.testEndpoint(
            'POST',
            '/api/vault/deposit',
            this.testData.validDeposit,
            authHeaders,
            200,
            'integration'
        );

        // 2. Check positions
        const positionsResult = await this.testEndpoint(
            'GET',
            '/api/vault/positions?userAddress=' + this.testData.validDeposit.userAddress,
            null,
            authHeaders,
            200,
            'integration'
        );

        // 3. Execute strategy
        const strategyResult = await this.testEndpoint(
            'POST',
            '/api/execute/strategy',
            this.testData.validStrategy,
            authHeaders,
            200,
            'integration'
        );

        // 4. Check history
        const historyResult = await this.testEndpoint(
            'GET',
            '/api/vault/history?limit=5',
            null,
            authHeaders,
            200,
            'integration'
        );

        const journeySuccess = depositResult.success && positionsResult.success && 
                              strategyResult.success && historyResult.success;

        this.logResult(
            'Complete user journey (deposit -> position -> strategy -> history)',
            journeySuccess,
            'integration',
            !journeySuccess ? 'One or more steps failed' : ''
        );

        // Test AI decision workflow
        console.log(chalk.gray('  Testing AI decision workflow...'));

        // 1. Log decision
        const decisionData = {
            type: 'integration_test',
            action: 'test_workflow',
            confidence: 0.9,
            reasoning: 'Integration test decision',
            context: { integrationTest: true }
        };

        const logResult = await this.testEndpoint(
            'POST',
            '/api/hedera/decisions',
            decisionData,
            authHeaders,
            200,
            'integration'
        );

        // 2. Retrieve decision
        let getResult = { success: false };
        if (logResult.success && logResult.data?.data?.decisionId) {
            getResult = await this.testEndpoint(
                'GET',
                `/api/hedera/decisions/${logResult.data.data.decisionId}`,
                null,
                authHeaders,
                200,
                'integration'
            );
        }

        // 3. Log outcome
        let outcomeResult = { success: false };
        if (logResult.success && logResult.data?.data?.decisionId) {
            outcomeResult = await this.testEndpoint(
                'POST',
                `/api/hedera/decisions/${logResult.data.data.decisionId}/outcome`,
                { success: true, result: 'Integration test completed' },
                authHeaders,
                200,
                'integration'
            );
        }

        const aiWorkflowSuccess = logResult.success && getResult.success && outcomeResult.success;

        this.logResult(
            'AI decision workflow (log -> retrieve -> outcome)',
            aiWorkflowSuccess,
            'integration',
            !aiWorkflowSuccess ? 'AI workflow steps failed' : ''
        );
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(chalk.yellow('🧪 Starting Comprehensive API Test Suite\n'));
        console.log(chalk.gray(`Base URL: ${this.baseURL}`));
        console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

        try {
            // Authentication setup
            await this.authenticateUsers();

            // Core API tests
            await this.testAuthenticationEndpoints();
            await this.testAuthorizationEndpoints();
            await this.testVaultEndpoints();
            await this.testExecuteEndpoints();
            await this.testHederaEndpoints();

            // Error and edge case tests
            await this.testErrorHandling();
            await this.testRateLimiting();

            // Integration tests
            await this.testIntegrationScenarios();

            // Generate reports
            await this.generateReports();
            this.printSummary();

        } catch (error) {
            console.error(chalk.red('\n❌ Test suite failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Generate detailed test reports
     */
    async generateReports() {
        const report = {
            summary: {
                total: this.testResults.total,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                successRate: ((this.testResults.passed / this.testResults.total) * 100).toFixed(1)
            },
            categories: this.testResults.categories,
            details: this.testResults.details,
            timestamp: new Date().toISOString(),
            baseURL: this.baseURL
        };

        try {
            await fs.writeFile(
                'comprehensive-api-test-report.json',
                JSON.stringify(report, null, 2)
            );
            console.log(chalk.blue('\n📄 Detailed report saved to: comprehensive-api-test-report.json'));
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Could not save detailed report:', error.message));
        }
    }

    /**
     * Print comprehensive test summary
     */
    printSummary() {
        console.log(chalk.blue('\n=== Comprehensive Test Summary ==='));
        
        // Overall results
        console.log(chalk.green(`✓ Passed: ${this.testResults.passed}`));
        console.log(chalk.red(`✗ Failed: ${this.testResults.failed}`));
        console.log(chalk.blue(`📊 Total: ${this.testResults.total}`));
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(chalk.yellow(`📈 Success Rate: ${successRate}%`));

        // Category breakdown
        console.log(chalk.blue('\n=== Results by Category ==='));
        for (const [category, results] of Object.entries(this.testResults.categories)) {
            const categoryRate = ((results.passed / results.total) * 100).toFixed(1);
            const status = results.failed === 0 ? chalk.green('✓') : chalk.red('✗');
            console.log(`${status} ${category.toUpperCase()}: ${results.passed}/${results.total} (${categoryRate}%)`);
        }

        // Final result
        if (this.testResults.failed > 0) {
            console.log(chalk.red('\n❌ Some tests failed. Check the details above.'));
            process.exit(1);
        } else {
            console.log(chalk.green('\n🎉 All tests passed! API is fully functional.'));
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const baseURL = args[0] || 'http://localhost:3000';
    
    const tester = new ComprehensiveAPITester(baseURL);
    
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

module.exports = { ComprehensiveAPITester };