#!/usr/bin/env node

/**
 * @fileoverview Test script for Authentication and Authorization System
 * @description Comprehensive testing of JWT authentication and role-based access control
 * @author AION Team
 * @version 2.0.0
 */

const axios = require('axios');
const chalk = require('chalk');

class AuthenticationTester {
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
        
        // Test credentials
        this.testUsers = {
            admin: {
                username: 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'AIONAdmin2024!',
                expectedRole: 'admin'
            },
            apiUser: {
                username: 'api_user',
                password: process.env.API_USER_PASSWORD || 'AIONApi2024!',
                expectedRole: 'api_user'
            }
        };
        
        this.tokens = {};
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
    async testEndpoint(method, endpoint, data = null, headers = {}, expectedStatus = 200) {
        try {
            const config = {
                method: method.toLowerCase(),
                url: endpoint,
                headers: headers,
                timeout: 5000
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
                error: null
            };
        } catch (error) {
            return {
                success: expectedStatus === (error.response?.status || 0),
                status: error.response?.status || 0,
                data: error.response?.data || null,
                error: error.message
            };
        }
    }

    /**
     * Test Authentication Endpoints
     */
    async testAuthenticationEndpoints() {
        console.log(chalk.blue('\n=== Testing Authentication Endpoints ==='));

        // Test login with valid credentials
        const loginData = {
            username: this.testUsers.admin.username,
            password: this.testUsers.admin.password
        };

        const loginResult = await this.testEndpoint('POST', '/api/auth/login', loginData);
        this.logResult(
            'POST /api/auth/login (valid credentials)',
            loginResult.success && loginResult.data?.data?.accessToken,
            loginResult.error
        );

        if (loginResult.success && loginResult.data?.data?.accessToken) {
            this.tokens.admin = loginResult.data.data.accessToken;
            
            // Verify token structure
            const tokenParts = this.tokens.admin.split('.');
            this.logResult(
                'JWT token structure validation',
                tokenParts.length === 3,
                tokenParts.length !== 3 ? 'Invalid JWT structure' : ''
            );
            
            // Verify user data in response
            const userData = loginResult.data.data.user;
            this.logResult(
                'Login response includes user data',
                userData && userData.username === this.testUsers.admin.username,
                !userData ? 'Missing user data' : ''
            );
        }

        // Test login with invalid credentials
        const invalidLoginData = {
            username: this.testUsers.admin.username,
            password: 'wrong_password'
        };

        const invalidLoginResult = await this.testEndpoint('POST', '/api/auth/login', invalidLoginData, {}, 401);
        this.logResult(
            'POST /api/auth/login (invalid credentials)',
            invalidLoginResult.success,
            invalidLoginResult.error
        );

        // Test login with missing credentials
        const missingCredsResult = await this.testEndpoint('POST', '/api/auth/login', {}, {}, 400);
        this.logResult(
            'POST /api/auth/login (missing credentials)',
            missingCredsResult.success,
            missingCredsResult.error
        );

        // Test refresh token (if we have one)
        if (loginResult.data?.data?.refreshToken) {
            const refreshData = {
                refreshToken: loginResult.data.data.refreshToken
            };

            const refreshResult = await this.testEndpoint('POST', '/api/auth/refresh', refreshData);
            this.logResult(
                'POST /api/auth/refresh (valid token)',
                refreshResult.success && refreshResult.data?.data?.accessToken,
                refreshResult.error
            );
        }

        // Test refresh with invalid token
        const invalidRefreshData = {
            refreshToken: 'invalid_refresh_token'
        };

        const invalidRefreshResult = await this.testEndpoint('POST', '/api/auth/refresh', invalidRefreshData, {}, 400);
        this.logResult(
            'POST /api/auth/refresh (invalid token)',
            invalidRefreshResult.success,
            invalidRefreshResult.error
        );
    }

    /**
     * Test Authorization and Profile Endpoints
     */
    async testAuthorizationEndpoints() {
        console.log(chalk.blue('\n=== Testing Authorization Endpoints ==='));

        if (!this.tokens.admin) {
            console.log(chalk.yellow('⚠️  Skipping authorization tests - no admin token available'));
            return;
        }

        const authHeaders = {
            'Authorization': `Bearer ${this.tokens.admin}`
        };

        // Test profile endpoint
        const profileResult = await this.testEndpoint('GET', '/api/auth/profile', null, authHeaders);
        this.logResult(
            'GET /api/auth/profile (authenticated)',
            profileResult.success && profileResult.data?.data?.username,
            profileResult.error
        );

        // Test profile without token
        const noTokenProfileResult = await this.testEndpoint('GET', '/api/auth/profile', null, {}, 401);
        this.logResult(
            'GET /api/auth/profile (no token)',
            noTokenProfileResult.success,
            noTokenProfileResult.error
        );

        // Test profile with invalid token
        const invalidTokenHeaders = {
            'Authorization': 'Bearer invalid_token'
        };

        const invalidTokenResult = await this.testEndpoint('GET', '/api/auth/profile', null, invalidTokenHeaders, 401);
        this.logResult(
            'GET /api/auth/profile (invalid token)',
            invalidTokenResult.success,
            invalidTokenResult.error
        );

        // Test profile update
        const updateData = {
            email: 'updated@aion-ai.com'
        };

        const updateResult = await this.testEndpoint('PUT', '/api/auth/profile', updateData, authHeaders);
        this.logResult(
            'PUT /api/auth/profile (update email)',
            updateResult.success,
            updateResult.error
        );
    }

    /**
     * Test Admin Endpoints
     */
    async testAdminEndpoints() {
        console.log(chalk.blue('\n=== Testing Admin Endpoints ==='));

        if (!this.tokens.admin) {
            console.log(chalk.yellow('⚠️  Skipping admin tests - no admin token available'));
            return;
        }

        const authHeaders = {
            'Authorization': `Bearer ${this.tokens.admin}`
        };

        // Test list users
        const usersResult = await this.testEndpoint('GET', '/api/auth/users', null, authHeaders);
        this.logResult(
            'GET /api/auth/users (admin access)',
            usersResult.success && Array.isArray(usersResult.data?.data?.users),
            usersResult.error
        );

        // Test create user
        const newUserData = {
            username: 'test_user',
            email: 'test@aion-ai.com',
            password: 'TestPassword123!',
            role: 'viewer'
        };

        const createUserResult = await this.testEndpoint('POST', '/api/auth/users', newUserData, authHeaders);
        this.logResult(
            'POST /api/auth/users (create user)',
            createUserResult.success,
            createUserResult.error
        );

        // Test sessions endpoint
        const sessionsResult = await this.testEndpoint('GET', '/api/auth/sessions', null, authHeaders);
        this.logResult(
            'GET /api/auth/sessions (admin access)',
            sessionsResult.success && Array.isArray(sessionsResult.data?.data?.sessions),
            sessionsResult.error
        );

        // Test metrics endpoint
        const metricsResult = await this.testEndpoint('GET', '/api/auth/metrics', null, authHeaders);
        this.logResult(
            'GET /api/auth/metrics (admin access)',
            metricsResult.success && metricsResult.data?.data?.totalUsers !== undefined,
            metricsResult.error
        );
    }

    /**
     * Test Role-Based Access Control
     */
    async testRoleBasedAccess() {
        console.log(chalk.blue('\n=== Testing Role-Based Access Control ==='));

        // Login as API user (non-admin)
        const apiLoginData = {
            username: this.testUsers.apiUser.username,
            password: this.testUsers.apiUser.password
        };

        const apiLoginResult = await this.testEndpoint('POST', '/api/auth/login', apiLoginData);
        this.logResult(
            'Login as API user',
            apiLoginResult.success && apiLoginResult.data?.data?.accessToken,
            apiLoginResult.error
        );

        if (apiLoginResult.success && apiLoginResult.data?.data?.accessToken) {
            this.tokens.apiUser = apiLoginResult.data.data.accessToken;
            
            const apiAuthHeaders = {
                'Authorization': `Bearer ${this.tokens.apiUser}`
            };

            // Test that API user can access their profile
            const apiProfileResult = await this.testEndpoint('GET', '/api/auth/profile', null, apiAuthHeaders);
            this.logResult(
                'API user can access own profile',
                apiProfileResult.success,
                apiProfileResult.error
            );

            // Test that API user cannot access admin endpoints
            const apiUsersResult = await this.testEndpoint('GET', '/api/auth/users', null, apiAuthHeaders, 403);
            this.logResult(
                'API user cannot access admin endpoints',
                apiUsersResult.success,
                apiUsersResult.error
            );

            // Test that API user cannot create users
            const createUserData = {
                username: 'unauthorized_user',
                email: 'unauthorized@test.com',
                password: 'Password123!',
                role: 'viewer'
            };

            const unauthorizedCreateResult = await this.testEndpoint('POST', '/api/auth/users', createUserData, apiAuthHeaders, 403);
            this.logResult(
                'API user cannot create users',
                unauthorizedCreateResult.success,
                unauthorizedCreateResult.error
            );
        }
    }

    /**
     * Test Protected Vault Endpoints
     */
    async testProtectedVaultEndpoints() {
        console.log(chalk.blue('\n=== Testing Protected Vault Endpoints ==='));

        // Test vault status without authentication (should work with optional auth)
        const publicVaultResult = await this.testEndpoint('GET', '/api/vault/status');
        this.logResult(
            'GET /api/vault/status (no auth - public access)',
            publicVaultResult.success,
            publicVaultResult.error
        );

        if (this.tokens.admin) {
            const authHeaders = {
                'Authorization': `Bearer ${this.tokens.admin}`
            };

            // Test vault status with authentication
            const authVaultResult = await this.testEndpoint('GET', '/api/vault/status', null, authHeaders);
            this.logResult(
                'GET /api/vault/status (authenticated)',
                authVaultResult.success,
                authVaultResult.error
            );

            // Test deposit endpoint (requires authentication)
            const depositData = {
                amount: '1000000000000000000',
                asset: 'ETH',
                userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
                hederaAccountId: '0.0.123456'
            };

            const depositResult = await this.testEndpoint('POST', '/api/vault/deposit', depositData, authHeaders);
            this.logResult(
                'POST /api/vault/deposit (authenticated)',
                depositResult.success,
                depositResult.error
            );

            // Test deposit without authentication (should fail)
            const unauthDepositResult = await this.testEndpoint('POST', '/api/vault/deposit', depositData, {}, 401);
            this.logResult(
                'POST /api/vault/deposit (no auth)',
                unauthDepositResult.success,
                unauthDepositResult.error
            );
        }
    }

    /**
     * Test Logout Functionality
     */
    async testLogout() {
        console.log(chalk.blue('\n=== Testing Logout Functionality ==='));

        if (this.tokens.admin) {
            const authHeaders = {
                'Authorization': `Bearer ${this.tokens.admin}`
            };

            // Test logout
            const logoutResult = await this.testEndpoint('POST', '/api/auth/logout', {}, authHeaders);
            this.logResult(
                'POST /api/auth/logout',
                logoutResult.success,
                logoutResult.error
            );

            // Test that token is invalidated after logout
            const postLogoutResult = await this.testEndpoint('GET', '/api/auth/profile', null, authHeaders, 401);
            this.logResult(
                'Token invalidated after logout',
                postLogoutResult.success,
                postLogoutResult.error
            );
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(chalk.yellow('🔐 Starting Authentication System Tests\n'));
        console.log(chalk.gray(`Base URL: ${this.baseURL}`));
        console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

        try {
            await this.testAuthenticationEndpoints();
            await this.testAuthorizationEndpoints();
            await this.testAdminEndpoints();
            await this.testRoleBasedAccess();
            await this.testProtectedVaultEndpoints();
            await this.testLogout();

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
            console.log(chalk.green('\n🎉 All authentication tests passed!'));
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const baseURL = args[0] || 'http://localhost:3000';
    
    const tester = new AuthenticationTester(baseURL);
    
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

module.exports = { AuthenticationTester };