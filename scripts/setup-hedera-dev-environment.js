#!/usr/bin/env node

/**
 * AION Hedera Development Environment Setup
 * This script sets up the complete Hedera development environment
 */

import { Client, AccountId, PrivateKey, Hbar, AccountCreateTransaction, AccountBalanceQuery } from '@hashgraph/sdk';
import { config } from 'dotenv';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.hedera' });

class HederaDevelopmentSetup {
    constructor() {
        this.client = null;
        this.accounts = {
            operator: null,
            treasury: null,
            aiAgent: null,
            user1: null,
            user2: null
        };
        this.services = {
            hcsTopicId: null,
            hfsFileId: null,
            htsTokenId: null
        };
    }

    /**
     * Initialize Hedera client for testnet
     */
    async initializeClient() {
        console.log('🔧 Initializing Hedera testnet client...');
        
        try {
            this.client = Client.forTestnet();
            
            // Check if we have operator credentials
            const accountId = process.env.HEDERA_ACCOUNT_ID;
            const privateKey = process.env.HEDERA_PRIVATE_KEY;
            
            if (accountId && privateKey) {
                this.client.setOperator(
                    AccountId.fromString(accountId),
                    PrivateKey.fromString(privateKey)
                );
                
                this.accounts.operator = {
                    accountId: AccountId.fromString(accountId),
                    privateKey: PrivateKey.fromString(privateKey)
                };
                
                console.log('✅ Using existing operator account:', accountId);
            } else {
                console.log('⚠️ No operator credentials found. Please set up your Hedera testnet account.');
                console.log('Visit: https://portal.hedera.com/register');
                return false;
            }
            
            // Set default fees
            this.client.setDefaultMaxTransactionFee(new Hbar(100));
            this.client.setDefaultMaxQueryPayment(new Hbar(50));
            
            // Test connection
            const balance = await new AccountBalanceQuery()
                .setAccountId(this.accounts.operator.accountId)
                .execute(this.client);
                
            console.log(`✅ Operator account balance: ${balance.hbars.toString()}`);
            
            if (balance.hbars.toTinybars().toNumber() < 1000000000) { // Less than 10 HBAR
                console.log('⚠️ Low balance detected. Consider funding your account for testing.');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Hedera client:', error.message);
            return false;
        }
    }

    /**
     * Create test accounts for development
     */
    async createTestAccounts() {
        console.log('👥 Creating test accounts...');
        
        const accountsToCreate = [
            { name: 'treasury', initialBalance: 50 },
            { name: 'aiAgent', initialBalance: 30 },
            { name: 'user1', initialBalance: 20 },
            { name: 'user2', initialBalance: 20 }
        ];
        
        for (const accountInfo of accountsToCreate) {
            try {
                console.log(`Creating ${accountInfo.name} account...`);
                
                // Generate new key pair
                const privateKey = PrivateKey.generateED25519();
                const publicKey = privateKey.publicKey;
                
                // Create account
                const createAccountTx = new AccountCreateTransaction()
                    .setKey(publicKey)
                    .setInitialBalance(new Hbar(accountInfo.initialBalance))
                    .setMaxTransactionFee(new Hbar(2));
                
                const txResponse = await createAccountTx.execute(this.client);
                const receipt = await txResponse.getReceipt(this.client);
                const accountId = receipt.accountId;
                
                this.accounts[accountInfo.name] = {
                    accountId: accountId,
                    privateKey: privateKey,
                    publicKey: publicKey
                };
                
                console.log(`✅ ${accountInfo.name} account created: ${accountId.toString()}`);
                
                // Small delay to avoid rate limiting
                await this.delay(1000);
                
            } catch (error) {
                console.error(`❌ Failed to create ${accountInfo.name} account:`, error.message);
            }
        }
    }

    /**
     * Update environment configuration with new accounts
     */
    async updateEnvironmentConfig() {
        console.log('📝 Updating environment configuration...');
        
        try {
            const envPath = '.env.hedera';
            let envContent = '';
            
            if (existsSync(envPath)) {
                envContent = readFileSync(envPath, 'utf8');
            }
            
            // Update or add account information
            const updates = {
                'HEDERA_NETWORK': 'testnet',
                'HEDERA_RPC_URL': 'https://testnet.hashio.io/api',
                'TREASURY_ACCOUNT_ID': this.accounts.treasury?.accountId?.toString() || '',
                'TREASURY_PRIVATE_KEY': this.accounts.treasury?.privateKey?.toString() || '',
                'AI_AGENT_ACCOUNT_ID': this.accounts.aiAgent?.accountId?.toString() || '',
                'AI_AGENT_PRIVATE_KEY': this.accounts.aiAgent?.privateKey?.toString() || '',
                'USER1_ACCOUNT_ID': this.accounts.user1?.accountId?.toString() || '',
                'USER1_PRIVATE_KEY': this.accounts.user1?.privateKey?.toString() || '',
                'USER2_ACCOUNT_ID': this.accounts.user2?.accountId?.toString() || '',
                'USER2_PRIVATE_KEY': this.accounts.user2?.privateKey?.toString() || '',
                'TOTAL_TEST_ACCOUNTS': Object.keys(this.accounts).filter(k => this.accounts[k]).length.toString(),
                'TEST_ACCOUNTS_CREATED': new Date().toISOString(),
                'VERIFICATION_TIMESTAMP': Date.now().toString()
            };
            
            // Update environment file
            for (const [key, value] of Object.entries(updates)) {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (envContent.match(regex)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\\n${key}=${value}`;
                }
            }
            
            writeFileSync(envPath, envContent);
            console.log('✅ Environment configuration updated');
            
        } catch (error) {
            console.error('❌ Failed to update environment configuration:', error.message);
        }
    }

    /**
     * Validate development environment
     */
    async validateEnvironment() {
        console.log('🔍 Validating development environment...');
        
        const validation = {
            client: false,
            operator: false,
            testAccounts: 0,
            balance: false,
            network: false
        };
        
        try {
            // Check client
            if (this.client) {
                validation.client = true;
                validation.network = true;
            }
            
            // Check operator
            if (this.accounts.operator) {
                validation.operator = true;
                
                // Check balance
                const balance = await new AccountBalanceQuery()
                    .setAccountId(this.accounts.operator.accountId)
                    .execute(this.client);
                    
                validation.balance = balance.hbars.toTinybars().toNumber() > 500000000; // > 5 HBAR
            }
            
            // Count test accounts
            validation.testAccounts = Object.keys(this.accounts)
                .filter(key => key !== 'operator' && this.accounts[key])
                .length;
            
            console.log('📊 Environment Validation Results:');
            console.log(`   Client: ${validation.client ? '✅' : '❌'}`);
            console.log(`   Operator: ${validation.operator ? '✅' : '❌'}`);
            console.log(`   Test Accounts: ${validation.testAccounts}/4`);
            console.log(`   Sufficient Balance: ${validation.balance ? '✅' : '❌'}`);
            console.log(`   Network: ${validation.network ? '✅ Testnet' : '❌'}`);
            
            return validation;
            
        } catch (error) {
            console.error('❌ Environment validation failed:', error.message);
            return validation;
        }
    }

    /**
     * Generate development summary report
     */
    generateSummaryReport() {
        console.log('\\n📋 HEDERA DEVELOPMENT ENVIRONMENT SETUP SUMMARY');
        console.log('=' .repeat(60));
        
        console.log('\\n🏗️ ACCOUNTS CREATED:');
        for (const [name, account] of Object.entries(this.accounts)) {
            if (account) {
                console.log(`   ${name.toUpperCase()}: ${account.accountId?.toString() || 'N/A'}`);
            }
        }
        
        console.log('\\n🔧 CONFIGURATION:');
        console.log(`   Network: Hedera Testnet`);
        console.log(`   RPC URL: https://testnet.hashio.io/api`);
        console.log(`   Environment File: .env.hedera`);
        
        console.log('\\n📚 NEXT STEPS:');
        console.log('   1. Run: npm run setup:hedera (if not done)');
        console.log('   2. Create HCS topic: npm run create:hcs-topic');
        console.log('   3. Initialize HFS storage: npm run init:hfs-storage');
        console.log('   4. Deploy smart contracts: npm run deploy:hedera');
        console.log('   5. Test integration: npm run test:hedera');
        
        console.log('\\n🔗 USEFUL LINKS:');
        console.log('   Hedera Portal: https://portal.hedera.com');
        console.log('   Testnet Explorer: https://hashscan.io/testnet');
        console.log('   Documentation: https://docs.hedera.com');
        
        console.log('\\n' + '=' .repeat(60));
    }

    /**
     * Utility function for delays
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.client) {
            this.client.close();
        }
    }

    /**
     * Main setup function
     */
    async setup() {
        console.log('🚀 Starting Hedera Development Environment Setup...');
        console.log('=' .repeat(60));
        
        try {
            // Step 1: Initialize client
            const clientInitialized = await this.initializeClient();
            if (!clientInitialized) {
                console.log('❌ Setup failed: Could not initialize Hedera client');
                return false;
            }
            
            // Step 2: Create test accounts
            await this.createTestAccounts();
            
            // Step 3: Update environment configuration
            await this.updateEnvironmentConfig();
            
            // Step 4: Validate environment
            const validation = await this.validateEnvironment();
            
            // Step 5: Generate summary
            this.generateSummaryReport();
            
            console.log('\\n🎉 Hedera development environment setup completed!');
            
            return validation.client && validation.operator;
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new HederaDevelopmentSetup();
    setup.setup().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export default HederaDevelopmentSetup;