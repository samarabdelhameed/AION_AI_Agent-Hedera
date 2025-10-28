#!/usr/bin/env node

/**
 * Test Hedera Connection
 * Tests connection to Hedera testnet and validates account setup
 */

const {
    Client,
    AccountBalanceQuery,
    AccountId,
    PrivateKey,
    Hbar
} = require('@hashgraph/sdk');

require('dotenv').config({ path: '.env.hedera' });

async function testHederaConnection() {
    console.log('🎯 Testing Hedera Connection');
    console.log('=' .repeat(50));
    
    try {
        // Setup client
        const client = Client.forTestnet();
        console.log('✅ Connected to Hedera testnet');
        
        // Load credentials
        const hederaPrivateKey = process.env.HEDERA_PRIVATE_KEY;
        const hederaAccountId = process.env.HEDERA_ACCOUNT_ID;
        
        if (!hederaPrivateKey) {
            console.error('❌ HEDERA_PRIVATE_KEY not found in environment');
            console.log('💡 Please update .env.hedera with your Hedera private key');
            return false;
        }
        
        if (!hederaAccountId || hederaAccountId === '0.0.YOUR_ACCOUNT_ID') {
            console.error('❌ HEDERA_ACCOUNT_ID not set or still placeholder');
            console.log('💡 Please update .env.hedera with your actual Hedera account ID');
            console.log('💡 You can find it in your Hedera portal or MetaMask');
            return false;
        }
        
        // Parse credentials
        const privateKey = PrivateKey.fromString(hederaPrivateKey);
        const accountId = AccountId.fromString(hederaAccountId);
        
        console.log(`📋 Account ID: ${accountId}`);
        console.log(`🔑 Private Key: ${hederaPrivateKey.substring(0, 20)}...`);
        
        // Set operator
        client.setOperator(accountId, privateKey);
        console.log('✅ Operator set successfully');
        
        // Check balance
        console.log('💰 Checking account balance...');
        const balance = await new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client);
        
        console.log(`💳 Current balance: ${balance.hbars.toString()}`);
        
        // Check if balance is sufficient
        const minRequired = new Hbar(10); // 10 HBAR minimum
        if (balance.hbars.toTinybars().lt(minRequired.toTinybars())) {
            console.log('⚠️  Balance is low for verification operations');
            console.log(`📋 Current: ${balance.hbars.toString()}`);
            console.log(`📋 Recommended: ${minRequired.toString()}`);
            console.log('💡 Please get more test HBAR from faucet');
            return false;
        }
        
        console.log('✅ Account has sufficient balance for verification');
        
        // Test network connectivity
        console.log('🌐 Testing network connectivity...');
        const networkMap = client.network;
        console.log(`✅ Connected to ${Object.keys(networkMap).length} nodes`);
        
        // Close client
        client.close();
        
        console.log('=' .repeat(50));
        console.log('🎉 Hedera connection test PASSED!');
        console.log('✅ Ready to proceed with verification setup');
        
        return true;
        
    } catch (error) {
        console.error('❌ Hedera connection test FAILED:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Check your HEDERA_ACCOUNT_ID is correct');
        console.log('2. Verify your HEDERA_PRIVATE_KEY is valid');
        console.log('3. Ensure your account has test HBAR');
        console.log('4. Check network connectivity');
        
        return false;
    }
}

// Main execution
async function main() {
    const success = await testHederaConnection();
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testHederaConnection };