#!/usr/bin/env node

/**
 * Create Test Accounts for Verification
 * Creates additional test accounts needed for comprehensive verification
 */

const {
    Client,
    AccountCreateTransaction,
    AccountBalanceQuery,
    PrivateKey,
    Hbar,
    TransferTransaction
} = require('@hashgraph/sdk');

const fs = require('fs');
require('dotenv').config({ path: '.env.hedera' });

class TestAccountCreator {
    constructor() {
        this.client = null;
        this.operatorId = null;
        this.operatorKey = null;
        this.createdAccounts = [];
    }

    async initialize() {
        console.log('🚀 Initializing Test Account Creator...');
        
        try {
            // Setup client
            this.client = Client.forTestnet();
            
            // Load operator credentials
            const hederaAccountId = process.env.HEDERA_ACCOUNT_ID;
            const hederaPrivateKey = process.env.HEDERA_PRIVATE_KEY;
            
            if (!hederaAccountId || !hederaPrivateKey) {
                throw new Error('Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY');
            }
            
            this.operatorId = hederaAccountId;
            this.operatorKey = PrivateKey.fromString(hederaPrivateKey);
            
            // Set operator
            this.client.setOperator(this.operatorId, this.operatorKey);
            
            console.log(`✅ Initialized with operator: ${this.operatorId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return false;
        }
    }

    async createTestAccount(name, initialBalance, role) {
        console.log(`🔄 Creating ${name} account...`);
        
        try {
            // Generate new key pair
            const newAccountPrivateKey = PrivateKey.generateED25519();
            const newAccountPublicKey = newAccountPrivateKey.publicKey;
            
            // Create account transaction
            const newAccount = await new AccountCreateTransaction()
                .setKey(newAccountPublicKey)
                .setInitialBalance(initialBalance)
                .setMaxTransactionFee(new Hbar(2))
                .execute(this.client);
            
            // Get receipt
            const getReceipt = await newAccount.getReceipt(this.client);
            const newAccountId = getReceipt.accountId;
            
            const accountInfo = {
                name: name,
                accountId: newAccountId.toString(),
                privateKey: newAccountPrivateKey.toString(),
                publicKey: newAccountPublicKey.toString(),
                role: role,
                initialBalance: initialBalance.toString(),
                createdAt: new Date().toISOString()
            };
            
            this.createdAccounts.push(accountInfo);
            
            console.log(`✅ Created ${name}: ${newAccountId}`);
            console.log(`   Balance: ${initialBalance.toString()}`);
            console.log(`   Role: ${role}`);
            
            return accountInfo;
            
        } catch (error) {
            console.error(`❌ Failed to create ${name}:`, error.message);
            throw error;
        }
    }

    async createAllTestAccounts() {
        console.log('👥 Creating all test accounts...');
        
        const accountConfigs = [
            {
                name: 'user1',
                initialBalance: new Hbar(50),
                role: 'Test user for deposits and HTS operations'
            },
            {
                name: 'user2',
                initialBalance: new Hbar(30),
                role: 'Test user for withdrawals and burn operations'
            },
            {
                name: 'aiAgent',
                initialBalance: new Hbar(25),
                role: 'AI agent for rebalancing and HCS logging'
            },
            {
                name: 'treasury',
                initialBalance: new Hbar(20),
                role: 'Treasury account for HTS token management'
            }
        ];
        
        for (const config of accountConfigs) {
            await this.createTestAccount(config.name, config.initialBalance, config.role);
            
            // Wait a bit between account creations
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`✅ Created ${this.createdAccounts.length} test accounts`);
        return this.createdAccounts;
    }

    async validateAccountBalances() {
        console.log('💰 Validating account balances...');
        
        for (const account of this.createdAccounts) {
            try {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(account.accountId)
                    .execute(this.client);
                
                console.log(`✅ ${account.name} (${account.accountId}): ${balance.hbars.toString()}`);
                
                // Update account info with current balance
                account.currentBalance = balance.hbars.toString();
                
            } catch (error) {
                console.error(`❌ Failed to check balance for ${account.name}:`, error.message);
            }
        }
    }

    async saveAccountsToFile() {
        console.log('💾 Saving account information...');
        
        const accountsData = {
            createdAt: new Date().toISOString(),
            operatorAccount: this.operatorId,
            network: 'testnet',
            accounts: this.createdAccounts,
            summary: {
                totalAccounts: this.createdAccounts.length,
                totalInitialBalance: this.createdAccounts.reduce((sum, acc) => {
                    return sum + parseFloat(acc.initialBalance.replace(' ℏ', ''));
                }, 0) + ' ℏ'
            }
        };
        
        // Save to JSON file
        const accountsPath = 'scripts/test-accounts.json';
        fs.writeFileSync(accountsPath, JSON.stringify(accountsData, null, 2));
        console.log(`✅ Saved account data to: ${accountsPath}`);
        
        // Update .env.hedera file
        await this.updateEnvironmentFile();
        
        return accountsData;
    }

    async updateEnvironmentFile() {
        console.log('📝 Updating environment file with test accounts...');
        
        let envContent = fs.readFileSync('.env.hedera', 'utf8');
        
        // Add test account information
        const testAccountsSection = `
# Test Accounts (Generated ${new Date().toISOString()})
${this.createdAccounts.map(account => `
${account.name.toUpperCase()}_ACCOUNT_ID=${account.accountId}
${account.name.toUpperCase()}_PRIVATE_KEY=${account.privateKey}
${account.name.toUpperCase()}_PUBLIC_KEY=${account.publicKey}`).join('')}

# Account Summary
TOTAL_TEST_ACCOUNTS=${this.createdAccounts.length}
TEST_ACCOUNTS_CREATED=${Date.now()}
`;
        
        // Append to env file
        envContent += testAccountsSection;
        fs.writeFileSync('.env.hedera', envContent);
        
        console.log('✅ Updated .env.hedera with test account information');
    }

    async cleanup() {
        if (this.client) {
            this.client.close();
        }
    }
}

// Main execution
async function main() {
    const creator = new TestAccountCreator();
    
    try {
        console.log('🎯 Creating Test Accounts for Hedera Verification');
        console.log('=' .repeat(60));
        
        // Initialize
        const initialized = await creator.initialize();
        if (!initialized) {
            process.exit(1);
        }
        
        // Create all test accounts
        await creator.createAllTestAccounts();
        
        // Validate balances
        await creator.validateAccountBalances();
        
        // Save to file
        const accountsData = await creator.saveAccountsToFile();
        
        console.log('=' .repeat(60));
        console.log('🎉 Test account creation completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log(`   Created: ${accountsData.summary.totalAccounts} accounts`);
        console.log(`   Total Balance: ${accountsData.summary.totalInitialBalance}`);
        console.log('');
        console.log('📁 Generated Files:');
        console.log('   scripts/test-accounts.json - Account details');
        console.log('   .env.hedera - Updated with account IDs');
        console.log('');
        console.log('🚀 Ready for verification operations!');
        
    } catch (error) {
        console.error('💥 Test account creation failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await creator.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = TestAccountCreator;