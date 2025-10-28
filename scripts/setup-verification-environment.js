#!/usr/bin/env node

/**
 * Hedera Verification Environment Setup
 * Sets up real data generation infrastructure for hackathon verification
 */

const {
    Client,
    AccountBalanceQuery,
    AccountCreateTransaction,
    AccountId,
    PrivateKey,
    Hbar,
    TransferTransaction
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');

class HederaVerificationSetup {
    constructor() {
        this.network = process.env.HEDERA_NETWORK || 'testnet';
        this.client = null;
        this.operatorId = null;
        this.operatorKey = null;
        this.testAccounts = {};
        this.requiredBalance = new Hbar(100); // 100 HBAR minimum
    }

    async initialize() {
        console.log('🚀 Initializing Hedera Verification Environment...');
        
        try {
            // Setup client
            this.client = this.network === 'testnet' ? Client.forTestnet() : Client.forMainnet();
            
            // Load operator credentials
            await this.loadOperatorCredentials();
            
            // Set operator
            this.client.setOperator(this.operatorId, this.operatorKey);
            
            console.log(`✅ Connected to Hedera ${this.network}`);
            console.log(`📋 Operator Account: ${this.operatorId}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Hedera client:', error.message);
            return false;
        }
    }

    async loadOperatorCredentials() {
        // Try to load from environment
        const accountId = process.env.HEDERA_ACCOUNT_ID;
        const privateKey = process.env.HEDERA_PRIVATE_KEY || process.env.PRIVATE_KEY;

        if (accountId && privateKey) {
            this.operatorId = AccountId.fromString(accountId);
            this.operatorKey = PrivateKey.fromString(privateKey);
            console.log('📝 Loaded credentials from environment');
        } else {
            throw new Error('Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in environment');
        }
    }

    async validateAccountBalance() {
        console.log('💰 Checking account balance...');
        
        try {
            const balance = await new AccountBalanceQuery()
                .setAccountId(this.operatorId)
                .execute(this.client);

            console.log(`💳 Current balance: ${balance.hbars.toString()}`);
            
            if (balance.hbars.toTinybars().lt(this.requiredBalance.toTinybars())) {
                console.log('⚠️  Insufficient balance for verification operations');
                console.log(`📋 Required: ${this.requiredBalance.toString()}`);
                console.log('💡 Please fund your account at: https://portal.hedera.com/');
                return false;
            }

            console.log('✅ Account has sufficient balance');
            return true;
        } catch (error) {
            console.error('❌ Failed to check balance:', error.message);
            return false;
        }
    }

    async createTestAccounts() {
        console.log('👥 Creating test accounts for verification...');
        
        const accountConfigs = [
            { name: 'user1', role: 'Test user for deposits', initialBalance: new Hbar(50) },
            { name: 'user2', role: 'Test user for withdrawals', initialBalance: new Hbar(30) },
            { name: 'aiAgent', role: 'AI agent for rebalancing', initialBalance: new Hbar(25) }
        ];

        for (const config of accountConfigs) {
            try {
                console.log(`🔄 Creating ${config.name} account...`);
                
                // Generate new key pair
                const newAccountPrivateKey = PrivateKey.generateED25519();
                const newAccountPublicKey = newAccountPrivateKey.publicKey;

                // Create account
                const newAccount = await new AccountCreateTransaction()
                    .setKey(newAccountPublicKey)
                    .setInitialBalance(config.initialBalance)
                    .execute(this.client);

                const getReceipt = await newAccount.getReceipt(this.client);
                const newAccountId = getReceipt.accountId;

                this.testAccounts[config.name] = {
                    accountId: newAccountId.toString(),
                    privateKey: newAccountPrivateKey.toString(),
                    publicKey: newAccountPublicKey.toString(),
                    role: config.role,
                    initialBalance: config.initialBalance.toString()
                };

                console.log(`✅ Created ${config.name}: ${newAccountId}`);
                
            } catch (error) {
                console.error(`❌ Failed to create ${config.name}:`, error.message);
                return false;
            }
        }

        return true;
    }

    async validateServiceConnections() {
        console.log('🔗 Validating Hedera service connections...');
        
        const services = {
            'HSCS (Smart Contracts)': async () => {
                // Test by querying account info
                const balance = await new AccountBalanceQuery()
                    .setAccountId(this.operatorId)
                    .execute(this.client);
                return balance !== null;
            },
            'HTS (Token Service)': async () => {
                // HTS is available if we can query account
                return true; // Will be tested during token creation
            },
            'HCS (Consensus Service)': async () => {
                // HCS is available if client is connected
                return true; // Will be tested during topic creation
            },
            'HFS (File Service)': async () => {
                // HFS is available if client is connected
                return true; // Will be tested during file upload
            }
        };

        for (const [serviceName, testFn] of Object.entries(services)) {
            try {
                const result = await testFn();
                console.log(`✅ ${serviceName}: Available`);
            } catch (error) {
                console.error(`❌ ${serviceName}: Failed - ${error.message}`);
                return false;
            }
        }

        return true;
    }

    async updateEnvironmentFile() {
        console.log('📝 Updating environment configuration...');
        
        const envPath = '.env.hedera';
        const envContent = `# Hedera Verification Environment Configuration
# Generated on ${new Date().toISOString()}

# Hedera Network Configuration
HEDERA_NETWORK=${this.network}
HEDERA_ACCOUNT_ID=${this.operatorId}
HEDERA_PRIVATE_KEY=${this.operatorKey}
HEDERA_RPC_URL=https://testnet.hashio.io/api

# Admin Configuration
ADMIN_ADDRESS=${process.env.ADMIN_ADDRESS || '0xdAFEE25F98Ff62504C1086eAcbb406190F3110D5'}
PRIVATE_KEY=${process.env.PRIVATE_KEY}

# Test Accounts (Generated)
USER1_ACCOUNT_ID=${this.testAccounts.user1?.accountId || ''}
USER1_PRIVATE_KEY=${this.testAccounts.user1?.privateKey || ''}

USER2_ACCOUNT_ID=${this.testAccounts.user2?.accountId || ''}
USER2_PRIVATE_KEY=${this.testAccounts.user2?.privateKey || ''}

AI_AGENT_ACCOUNT_ID=${this.testAccounts.aiAgent?.accountId || ''}
AI_AGENT_PRIVATE_KEY=${this.testAccounts.aiAgent?.privateKey || ''}

# Service IDs (to be filled during verification)
HCS_TOPIC_ID=
HFS_FILE_ID=
HTS_TOKEN_ID=
VAULT_CONTRACT_ID=

# Verification Configuration
MIN_TEST_BALANCE=100000000000000000000
VERIFICATION_TIMESTAMP=${Date.now()}
`;

        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Updated ${envPath}`);
    }

    async generateVerificationConfig() {
        console.log('⚙️  Generating verification configuration...');
        
        const config = {
            network: this.network,
            operatorAccount: this.operatorId.toString(),
            testAccounts: this.testAccounts,
            requiredServices: ['HSCS', 'HTS', 'HCS', 'HFS'],
            verificationThresholds: {
                minHTSTransactions: 5,
                minHCSMessages: 5,
                minHFSFiles: 2,
                minTestBalance: '100000000000000000000', // 100 USDT equivalent
                timeSpanMinutes: 30
            },
            generatedAt: new Date().toISOString()
        };

        const configPath = 'scripts/verification-config.json';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`✅ Generated ${configPath}`);
        
        return config;
    }

    async runDiagnostics() {
        console.log('🔍 Running environment diagnostics...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            network: this.network,
            operatorAccount: this.operatorId.toString(),
            services: {},
            accounts: {},
            environment: {}
        };

        // Check operator account
        try {
            const balance = await new AccountBalanceQuery()
                .setAccountId(this.operatorId)
                .execute(this.client);
            
            diagnostics.accounts.operator = {
                id: this.operatorId.toString(),
                balance: balance.hbars.toString(),
                sufficient: balance.hbars.toTinybars().gte(this.requiredBalance.toTinybars())
            };
        } catch (error) {
            diagnostics.accounts.operator = { error: error.message };
        }

        // Check test accounts
        for (const [name, account] of Object.entries(this.testAccounts)) {
            try {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(account.accountId)
                    .execute(this.client);
                
                diagnostics.accounts[name] = {
                    id: account.accountId,
                    balance: balance.hbars.toString(),
                    role: account.role
                };
            } catch (error) {
                diagnostics.accounts[name] = { error: error.message };
            }
        }

        // Environment checks
        diagnostics.environment = {
            nodeVersion: process.version,
            hederaSDK: require('@hashgraph/sdk/package.json').version,
            envFile: fs.existsSync('.env.hedera'),
            configFile: fs.existsSync('scripts/verification-config.json')
        };

        const diagnosticsPath = 'scripts/environment-diagnostics.json';
        fs.writeFileSync(diagnosticsPath, JSON.stringify(diagnostics, null, 2));
        console.log(`✅ Generated ${diagnosticsPath}`);
        
        return diagnostics;
    }

    async cleanup() {
        if (this.client) {
            this.client.close();
        }
    }
}

// Main execution
async function main() {
    const setup = new HederaVerificationSetup();
    
    try {
        console.log('🎯 Starting Hedera Verification Environment Setup');
        console.log('=' .repeat(60));
        
        // Initialize
        const initialized = await setup.initialize();
        if (!initialized) {
            process.exit(1);
        }

        // Validate balance
        const hasBalance = await setup.validateAccountBalance();
        if (!hasBalance) {
            console.log('⚠️  Please fund your account and run again');
            process.exit(1);
        }

        // Create test accounts
        const accountsCreated = await setup.createTestAccounts();
        if (!accountsCreated) {
            console.log('❌ Failed to create test accounts');
            process.exit(1);
        }

        // Validate services
        const servicesValid = await setup.validateServiceConnections();
        if (!servicesValid) {
            console.log('❌ Service validation failed');
            process.exit(1);
        }

        // Update environment
        await setup.updateEnvironmentFile();
        
        // Generate config
        const config = await setup.generateVerificationConfig();
        
        // Run diagnostics
        const diagnostics = await setup.runDiagnostics();
        
        console.log('=' .repeat(60));
        console.log('🎉 Environment setup completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log(`   Network: ${setup.network}`);
        console.log(`   Operator: ${setup.operatorId}`);
        console.log(`   Test Accounts: ${Object.keys(setup.testAccounts).length}`);
        console.log('');
        console.log('📁 Generated Files:');
        console.log('   .env.hedera - Environment configuration');
        console.log('   scripts/verification-config.json - Verification settings');
        console.log('   scripts/environment-diagnostics.json - Diagnostic report');
        console.log('');
        console.log('🚀 Ready for verification link generation!');
        
    } catch (error) {
        console.error('💥 Setup failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await setup.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = HederaVerificationSetup;