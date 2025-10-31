#!/usr/bin/env node

/**
 * Hedera Connection Test Script
 * Tests the connection to Hedera testnet and validates configuration
 */

import { Client, AccountId, PrivateKey, AccountBalanceQuery, AccountInfoQuery } from '@hashgraph/sdk';
import { config } from 'dotenv';
import chalk from 'chalk';

// Load environment variables
config({ path: '.env.hedera' });

class HederaConnectionTest {
    constructor() {
        this.client = null;
        this.testResults = {
            connection: false,
            authentication: false,
            balance: false,
            networkInfo: false,
            accountInfo: false
        };
    }

    /**
     * Test basic connection to Hedera testnet
     */
    async testConnection() {
        console.log(chalk.blue('🔗 Testing Hedera testnet connection...'));
        
        try {
            this.client = Client.forTestnet();
            
            // Set operator if credentials are available
            const accountId = process.env.HEDERA_ACCOUNT_ID;
            const privateKey = process.env.HEDERA_PRIVATE_KEY;
            
            if (!accountId || !privateKey) {
                console.log(chalk.yellow('⚠️ No operator credentials found in .env.hedera'));
                console.log(chalk.yellow('Please set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY'));
                return false;
            }
            
            this.client.setOperator(
                AccountId.fromString(accountId),
                PrivateKey.fromString(privateKey)
            );
            
            this.testResults.connection = true;
            this.testResults.authentication = true;
            
            console.log(chalk.green('✅ Connection established'));
            console.log(chalk.green(`✅ Authenticated with account: ${accountId}`));
            
            return true;
            
        } catch (error) {
            console.log(chalk.red('❌ Connection failed:'), error.message);
            return false;
        }
    }

    /**
     * Test account balance query
     */
    async testBalanceQuery() {
        console.log(chalk.blue('💰 Testing account balance query...'));
        
        try {
            const accountId = this.client.operatorAccountId;
            const balance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const hbarBalance = balance.hbars.toString();
            const tinybars = balance.hbars.toTinybars().toString();
            
            console.log(chalk.green('✅ Balance query successful'));
            console.log(chalk.cyan(`   HBAR Balance: ${hbarBalance}`));
            console.log(chalk.cyan(`   Tinybars: ${tinybars}`));
            
            // Check if balance is sufficient for testing
            const minBalance = 5; // 5 HBAR minimum
            const currentBalance = balance.hbars.toTinybars().toNumber() / 100000000;
            
            if (currentBalance >= minBalance) {
                console.log(chalk.green(`✅ Sufficient balance for testing (${currentBalance} HBAR >= ${minBalance} HBAR)`));
                this.testResults.balance = true;
            } else {
                console.log(chalk.yellow(`⚠️ Low balance detected (${currentBalance} HBAR < ${minBalance} HBAR)`));
                console.log(chalk.yellow('Consider funding your account for comprehensive testing'));
            }
            
            return true;
            
        } catch (error) {
            console.log(chalk.red('❌ Balance query failed:'), error.message);
            return false;
        }
    }

    /**
     * Test account info query
     */
    async testAccountInfo() {
        console.log(chalk.blue('ℹ️ Testing account info query...'));
        
        try {
            const accountId = this.client.operatorAccountId;
            const accountInfo = await new AccountInfoQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            console.log(chalk.green('✅ Account info query successful'));
            console.log(chalk.cyan(`   Account ID: ${accountInfo.accountId.toString()}`));
            console.log(chalk.cyan(`   Key: ${accountInfo.key.toString().substring(0, 20)}...`));
            console.log(chalk.cyan(`   Balance: ${accountInfo.balance.toString()}`));
            console.log(chalk.cyan(`   Auto Renew Period: ${accountInfo.autoRenewPeriod.seconds} seconds`));
            
            this.testResults.accountInfo = true;
            return true;
            
        } catch (error) {
            console.log(chalk.red('❌ Account info query failed:'), error.message);
            return false;
        }
    }

    /**
     * Test network information
     */
    async testNetworkInfo() {
        console.log(chalk.blue('🌐 Testing network information...'));
        
        try {
            // Get network information
            const network = this.client._network;
            const networkNodes = Object.keys(network);
            
            console.log(chalk.green('✅ Network info retrieved'));
            console.log(chalk.cyan(`   Network: Hedera Testnet`));
            console.log(chalk.cyan(`   Available Nodes: ${networkNodes.length}`));
            console.log(chalk.cyan(`   Sample Nodes: ${networkNodes.slice(0, 3).join(', ')}`));
            
            this.testResults.networkInfo = true;
            return true;
            
        } catch (error) {
            console.log(chalk.red('❌ Network info test failed:'), error.message);
            return false;
        }
    }

    /**
     * Test environment configuration
     */
    testEnvironmentConfig() {
        console.log(chalk.blue('⚙️ Testing environment configuration...'));
        
        const requiredVars = [
            'HEDERA_NETWORK',
            'HEDERA_ACCOUNT_ID',
            'HEDERA_PRIVATE_KEY',
            'HEDERA_RPC_URL'
        ];
        
        const optionalVars = [
            'HCS_TOPIC_ID',
            'HFS_FILE_ID',
            'HTS_TOKEN_ID',
            'TREASURY_ACCOUNT_ID',
            'AI_AGENT_ACCOUNT_ID'
        ];
        
        console.log(chalk.cyan('📋 Required Environment Variables:'));
        let allRequired = true;
        
        for (const varName of requiredVars) {
            const value = process.env[varName];
            if (value) {
                console.log(chalk.green(`   ✅ ${varName}: ${this.maskSensitive(varName, value)}`));
            } else {
                console.log(chalk.red(`   ❌ ${varName}: Not set`));
                allRequired = false;
            }
        }
        
        console.log(chalk.cyan('\\n📋 Optional Environment Variables:'));
        for (const varName of optionalVars) {
            const value = process.env[varName];
            if (value) {
                console.log(chalk.green(`   ✅ ${varName}: ${this.maskSensitive(varName, value)}`));
            } else {
                console.log(chalk.yellow(`   ⚠️ ${varName}: Not set (will be created during setup)`));
            }
        }
        
        return allRequired;
    }

    /**
     * Mask sensitive information in environment variables
     */
    maskSensitive(varName, value) {
        const sensitiveVars = ['PRIVATE_KEY', 'HEDERA_PRIVATE_KEY'];
        
        if (sensitiveVars.some(sensitive => varName.includes(sensitive))) {
            return value.substring(0, 8) + '...' + value.substring(value.length - 4);
        }
        
        return value;
    }

    /**
     * Generate test report
     */
    generateTestReport() {
        console.log('\\n' + chalk.bold('📊 HEDERA CONNECTION TEST REPORT'));
        console.log('=' .repeat(50));
        
        const tests = [
            { name: 'Connection', result: this.testResults.connection },
            { name: 'Authentication', result: this.testResults.authentication },
            { name: 'Balance Query', result: this.testResults.balance },
            { name: 'Account Info', result: this.testResults.accountInfo },
            { name: 'Network Info', result: this.testResults.networkInfo }
        ];
        
        let passedTests = 0;
        
        for (const test of tests) {
            const status = test.result ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
            console.log(`   ${test.name}: ${status}`);
            if (test.result) passedTests++;
        }
        
        console.log('\\n' + chalk.bold('📈 SUMMARY:'));
        console.log(`   Tests Passed: ${passedTests}/${tests.length}`);
        console.log(`   Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);
        
        if (passedTests === tests.length) {
            console.log(chalk.green('\\n🎉 All tests passed! Hedera integration is ready.'));
        } else {
            console.log(chalk.yellow('\\n⚠️ Some tests failed. Please check configuration and network connectivity.'));
        }
        
        console.log('\\n' + chalk.bold('🔗 USEFUL RESOURCES:'));
        console.log('   Hedera Portal: https://portal.hedera.com');
        console.log('   Testnet Faucet: https://portal.hedera.com/faucet');
        console.log('   Explorer: https://hashscan.io/testnet');
        console.log('   Documentation: https://docs.hedera.com');
        
        return passedTests === tests.length;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.client) {
            this.client.close();
        }
    }

    /**
     * Run all connection tests
     */
    async runTests() {
        console.log(chalk.bold('🧪 Starting Hedera Connection Tests...'));
        console.log('=' .repeat(50));
        
        try {
            // Test environment configuration first
            const configValid = this.testEnvironmentConfig();
            if (!configValid) {
                console.log(chalk.red('\\n❌ Environment configuration incomplete. Please check .env.hedera file.'));
                return false;
            }
            
            console.log('\\n');
            
            // Test connection
            const connected = await this.testConnection();
            if (!connected) {
                return false;
            }
            
            // Run other tests
            await this.testBalanceQuery();
            await this.testAccountInfo();
            await this.testNetworkInfo();
            
            // Generate report
            const allPassed = this.generateTestReport();
            
            return allPassed;
            
        } catch (error) {
            console.log(chalk.red('❌ Test execution failed:'), error.message);
            return false;
        } finally {
            this.cleanup();
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new HederaConnectionTest();
    tester.runTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export default HederaConnectionTest;