#!/usr/bin/env node

/**
 * Fix Key Format Issues
 * Properly converts and validates Hedera key format
 */

const { PrivateKey, AccountId, Client, AccountBalanceQuery } = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.hedera' });

async function fixKeyFormat() {
    console.log('🔧 Fixing Hedera key format...');
    
    const ethPrivateKey = process.env.PRIVATE_KEY;
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    
    console.log(`📋 Account ID: ${accountId}`);
    console.log(`🔑 Ethereum Key: ${ethPrivateKey}`);
    
    try {
        // Method 1: Try ECDSA format (for Hedera accounts created with Ethereum keys)
        console.log('🔄 Trying ECDSA format...');
        const ecdsaKey = PrivateKey.fromStringECDSA(ethPrivateKey);
        
        console.log(`✅ ECDSA Key: ${ecdsaKey.toString()}`);
        console.log(`📋 ECDSA Public Key: ${ecdsaKey.publicKey.toString()}`);
        
        // Test the key
        const client = Client.forTestnet();
        client.setOperator(AccountId.fromString(accountId), ecdsaKey);
        
        const balance = await new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client);
            
        console.log(`💰 Balance test successful: ${balance.hbars.toString()}`);
        
        client.close();
        
        return {
            format: 'ECDSA',
            privateKey: ecdsaKey.toString(),
            publicKey: ecdsaKey.publicKey.toString(),
            success: true
        };
        
    } catch (ecdsaError) {
        console.log(`❌ ECDSA failed: ${ecdsaError.message}`);
        
        try {
            // Method 2: Try ED25519 format
            console.log('🔄 Trying ED25519 format...');
            const ed25519Key = PrivateKey.fromStringED25519(ethPrivateKey);
            
            console.log(`✅ ED25519 Key: ${ed25519Key.toString()}`);
            console.log(`📋 ED25519 Public Key: ${ed25519Key.publicKey.toString()}`);
            
            // Test the key
            const client = Client.forTestnet();
            client.setOperator(AccountId.fromString(accountId), ed25519Key);
            
            const balance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(client);
                
            console.log(`💰 Balance test successful: ${balance.hbars.toString()}`);
            
            client.close();
            
            return {
                format: 'ED25519',
                privateKey: ed25519Key.toString(),
                publicKey: ed25519Key.publicKey.toString(),
                success: true
            };
            
        } catch (ed25519Error) {
            console.log(`❌ ED25519 failed: ${ed25519Error.message}`);
            
            try {
                // Method 3: Try DER format
                console.log('🔄 Trying DER format...');
                const derKey = PrivateKey.fromStringDer(ethPrivateKey);
                
                console.log(`✅ DER Key: ${derKey.toString()}`);
                console.log(`📋 DER Public Key: ${derKey.publicKey.toString()}`);
                
                // Test the key
                const client = Client.forTestnet();
                client.setOperator(AccountId.fromString(accountId), derKey);
                
                const balance = await new AccountBalanceQuery()
                    .setAccountId(accountId)
                    .execute(client);
                    
                console.log(`💰 Balance test successful: ${balance.hbars.toString()}`);
                
                client.close();
                
                return {
                    format: 'DER',
                    privateKey: derKey.toString(),
                    publicKey: derKey.publicKey.toString(),
                    success: true
                };
                
            } catch (derError) {
                console.log(`❌ DER failed: ${derError.message}`);
                
                // Method 4: Generate new key and show instructions
                console.log('🔄 All formats failed. Generating new key...');
                const newKey = PrivateKey.generateECDSA();
                
                console.log('⚠️  Could not use your existing key. Generated new ECDSA key:');
                console.log(`🔑 New Private Key: ${newKey.toString()}`);
                console.log(`📋 New Public Key: ${newKey.publicKey.toString()}`);
                console.log('');
                console.log('📝 To use this key:');
                console.log('1. Create a new Hedera account with this public key');
                console.log('2. Or import this private key into your existing account');
                
                return {
                    format: 'NEW_ECDSA',
                    privateKey: newKey.toString(),
                    publicKey: newKey.publicKey.toString(),
                    success: false,
                    message: 'Generated new key - manual setup required'
                };
            }
        }
    }
}

async function main() {
    console.log('🎯 Hedera Key Format Fixer');
    console.log('=' .repeat(50));
    
    const result = await fixKeyFormat();
    
    console.log('=' .repeat(50));
    console.log('📋 Result:');
    console.log(`   Format: ${result.format}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Private Key: ${result.privateKey}`);
    
    if (result.success) {
        console.log('');
        console.log('✅ Key format fixed! Updating .env.hedera...');
        
        const fs = require('fs');
        let envContent = fs.readFileSync('.env.hedera', 'utf8');
        
        // Update the private key
        envContent = envContent.replace(
            /HEDERA_PRIVATE_KEY=.*/,
            `HEDERA_PRIVATE_KEY=${result.privateKey}`
        );
        
        fs.writeFileSync('.env.hedera', envContent);
        console.log('✅ Updated .env.hedera with correct key format');
        
        // Save result
        fs.writeFileSync('scripts/key-fix-result.json', JSON.stringify(result, null, 2));
        console.log('💾 Saved result to scripts/key-fix-result.json');
        
    } else {
        console.log('');
        console.log('❌ Could not fix key format automatically');
        console.log('💡 Manual intervention required');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { fixKeyFormat };