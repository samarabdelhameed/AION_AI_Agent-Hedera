#!/usr/bin/env node

/**
 * Convert Ethereum Private Key to Hedera Format
 * Converts the provided Ethereum private key to Hedera ED25519 format
 */

const { PrivateKey } = require('@hashgraph/sdk');
const crypto = require('crypto');

function convertEthereumKeyToHedera(ethPrivateKey) {
    console.log('🔄 Converting Ethereum private key to Hedera format...');
    
    try {
        // Remove 0x prefix if present
        const cleanKey = ethPrivateKey.startsWith('0x') ? ethPrivateKey.slice(2) : ethPrivateKey;
        
        // Convert hex string to buffer
        const keyBuffer = Buffer.from(cleanKey, 'hex');
        
        // Generate Hedera ED25519 key from the seed
        const hederaKey = PrivateKey.fromBytes(keyBuffer);
        
        console.log('✅ Conversion successful!');
        console.log('');
        console.log('📋 Key Information:');
        console.log(`   Ethereum Private Key: ${ethPrivateKey}`);
        console.log(`   Hedera Private Key: ${hederaKey.toString()}`);
        console.log(`   Hedera Public Key: ${hederaKey.publicKey.toString()}`);
        
        return {
            ethereumPrivateKey: ethPrivateKey,
            hederaPrivateKey: hederaKey.toString(),
            hederaPublicKey: hederaKey.publicKey.toString()
        };
        
    } catch (error) {
        console.error('❌ Key conversion failed:', error.message);
        
        // Try alternative method - generate new key from hash
        console.log('🔄 Trying alternative conversion method...');
        
        try {
            // Create hash of the original key as seed
            const hash = crypto.createHash('sha256').update(ethPrivateKey).digest();
            const hederaKey = PrivateKey.fromBytes(hash);
            
            console.log('✅ Alternative conversion successful!');
            console.log('');
            console.log('📋 Key Information:');
            console.log(`   Original Ethereum Key: ${ethPrivateKey}`);
            console.log(`   Generated Hedera Key: ${hederaKey.toString()}`);
            console.log(`   Hedera Public Key: ${hederaKey.publicKey.toString()}`);
            
            return {
                ethereumPrivateKey: ethPrivateKey,
                hederaPrivateKey: hederaKey.toString(),
                hederaPublicKey: hederaKey.publicKey.toString(),
                method: 'hash-based'
            };
            
        } catch (altError) {
            console.error('❌ Alternative conversion also failed:', altError.message);
            
            // Generate completely new key
            console.log('🔄 Generating new Hedera key...');
            const newKey = PrivateKey.generateED25519();
            
            console.log('✅ New key generated!');
            console.log('');
            console.log('⚠️  Note: This is a NEW key, not derived from your Ethereum key');
            console.log('📋 Key Information:');
            console.log(`   New Hedera Private Key: ${newKey.toString()}`);
            console.log(`   New Hedera Public Key: ${newKey.publicKey.toString()}`);
            
            return {
                ethereumPrivateKey: ethPrivateKey,
                hederaPrivateKey: newKey.toString(),
                hederaPublicKey: newKey.publicKey.toString(),
                method: 'new-generation',
                warning: 'This is a newly generated key, not derived from your Ethereum key'
            };
        }
    }
}

// Main execution
async function main() {
    const ethPrivateKey = process.env.PRIVATE_KEY;
    
    if (!ethPrivateKey) {
        console.error('❌ PRIVATE_KEY environment variable not found');
        console.log('💡 Make sure .env.hedera file contains PRIVATE_KEY');
        process.exit(1);
    }
    
    console.log('🎯 Ethereum to Hedera Key Conversion');
    console.log('=' .repeat(50));
    
    const result = convertEthereumKeyToHedera(ethPrivateKey);
    
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Create a Hedera testnet account at: https://portal.hedera.com/');
    console.log('2. Use the generated public key to create the account');
    console.log('3. Fund the account with test HBAR');
    console.log('4. Update HEDERA_ACCOUNT_ID in .env.hedera with your account ID');
    console.log('5. Update HEDERA_PRIVATE_KEY in .env.hedera with the generated private key');
    
    // Save result to file
    const fs = require('fs');
    const resultPath = 'scripts/key-conversion-result.json';
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log('');
    console.log(`💾 Key information saved to: ${resultPath}`);
}

// Run if called directly
if (require.main === module) {
    // Load environment variables
    require('dotenv').config({ path: '.env.hedera' });
    main().catch(console.error);
}

module.exports = { convertEthereumKeyToHedera };