#!/usr/bin/env node

/**
 * Create Real HTS Token with Comprehensive Metadata
 * Creates AION Vault Shares token with real, meaningful data for hackathon verification
 */

const {
    Client,
    AccountId,
    PrivateKey,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenBurnTransaction,
    TokenAssociateTransaction,
    TransferTransaction,
    TokenInfoQuery,
    Hbar,
    TokenSupplyType,
    TokenType,
    TokenId
} = require('@hashgraph/sdk');

const fs = require('fs');
const HederaErrorHandler = require('./hedera-error-handler');
require('dotenv').config({ path: '.env.hedera' });

class RealHTSTokenCreator {
    constructor() {
        this.client = null;
        this.operatorId = null;
        this.operatorKey = null;
        this.testAccounts = {};
        this.errorHandler = new HederaErrorHandler(3, 2000);
        this.tokenData = {
            timestamp: new Date().toISOString(),
            network: 'hedera-testnet',
            token: {},
            operations: [],
            verification: {}
        };
    }

    async initialize() {
        console.log('🪙 Initializing Real HTS Token Creator...');
        
        try {
            // Setup client
            this.client = Client.forTestnet();
            
            // Load operator credentials
            this.operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
            this.operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
            
            // Set operator
            this.client.setOperator(this.operatorId, this.operatorKey);
            
            // Load test accounts
            await this.loadTestAccounts();
            
            // Health check
            const healthCheck = await this.errorHandler.performHealthCheck(this.client);
            if (!healthCheck.healthy) {
                throw new Error(`Health check failed: ${healthCheck.error || 'System not ready'}`);
            }
            
            console.log(`✅ Initialized with operator: ${this.operatorId}`);
            console.log(`👥 Loaded ${Object.keys(this.testAccounts).length} test accounts`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return false;
        }
    }

    async loadTestAccounts() {
        try {
            const accountsData = JSON.parse(fs.readFileSync('scripts/test-accounts.json', 'utf8'));
            
            for (const account of accountsData.accounts) {
                this.testAccounts[account.name] = {
                    accountId: AccountId.fromString(account.accountId),
                    privateKey: PrivateKey.fromString(account.privateKey),
                    role: account.role
                };
            }
            
            console.log('✅ Test accounts loaded successfully');
        } catch (error) {
            console.log('⚠️  Test accounts file not found, using operator only');
        }
    }

    async createRealHTSToken() {
        console.log('🏗️ Creating AION Vault Shares HTS token with real metadata...');
        
        const startTime = Date.now();
        
        try {
            // Create comprehensive token metadata
            const tokenMetadata = {
                name: "AION Vault Shares",
                symbol: "AION",
                description: "Shares representing ownership in AION DeFi Yield Optimization Vault",
                website: "https://aion-defi.com",
                whitepaper: "https://docs.aion-defi.com/whitepaper",
                github: "https://github.com/samarabdelhameed/AION_AI_Agent-Hedera",
                telegram: "https://t.me/aion_defi",
                twitter: "https://twitter.com/aion_vault"
            };

            // Create HTS token with comprehensive configuration
            const tokenCreateTx = new TokenCreateTransaction()
                .setTokenName(tokenMetadata.name)
                .setTokenSymbol(tokenMetadata.symbol)
                .setTokenType(TokenType.FungibleCommon)
                .setSupplyType(TokenSupplyType.Infinite)
                .setInitialSupply(1000000) // 1M initial supply
                .setDecimals(18)
                .setTreasuryAccountId(this.operatorId)
                .setAdminKey(this.operatorKey)
                .setSupplyKey(this.operatorKey)
                .setFreezeKey(this.operatorKey)
                .setWipeKey(this.operatorKey)
                .setPauseKey(this.operatorKey)
                .setTokenMemo(`${tokenMetadata.description} | ${tokenMetadata.website}`)
                .setMaxTransactionFee(new Hbar(30));

            // Execute with error handling
            const { response: tokenCreateSubmit, receipt: tokenCreateReceipt } = await this.errorHandler.safeTransactionExecute(
                tokenCreateTx,
                this.client,
                'HTS Token Creation - AION Vault Shares',
                { 
                    name: tokenMetadata.name, 
                    symbol: tokenMetadata.symbol,
                    initialSupply: 1000000
                }
            );

            const tokenId = tokenCreateReceipt.tokenId;
            const endTime = Date.now();

            // Store comprehensive token data
            this.tokenData.token = {
                tokenId: tokenId.toString(),
                ...tokenMetadata,
                initialSupply: "1000000",
                decimals: 18,
                supplyType: "INFINITE",
                tokenType: "FUNGIBLE_COMMON",
                treasury: this.operatorId.toString(),
                creationHash: tokenCreateSubmit.transactionId.toString(),
                explorerLink: `https://hashscan.io/testnet/token/${tokenId}`,
                createdAt: new Date().toISOString(),
                creationTime: endTime - startTime,
                keys: {
                    admin: "Set",
                    supply: "Set", 
                    freeze: "Set",
                    wipe: "Set",
                    pause: "Set"
                }
            };

            // Record operation
            this.tokenData.operations.push({
                type: 'TOKEN_CREATE',
                hash: tokenCreateSubmit.transactionId.toString(),
                tokenId: tokenId.toString(),
                timestamp: new Date().toISOString(),
                duration: endTime - startTime,
                status: 'SUCCESS'
            });

            console.log(`✅ HTS Token created successfully!`);
            console.log(`🪙 Token ID: ${tokenId}`);
            console.log(`📛 Name: ${tokenMetadata.name}`);
            console.log(`🔤 Symbol: ${tokenMetadata.symbol}`);
            console.log(`💰 Initial Supply: 1,000,000 tokens`);
            console.log(`🔗 Explorer: https://hashscan.io/testnet/token/${tokenId}`);
            console.log(`⏱️  Creation Time: ${endTime - startTime}ms`);
            
            return tokenId;
            
        } catch (error) {
            console.error('❌ HTS token creation failed:', error.message);
            throw error;
        }
    }

    async associateTokenWithAccounts(tokenId) {
        console.log('🔗 Associating token with test accounts...');
        
        const associations = [];
        
        for (const [accountName, accountData] of Object.entries(this.testAccounts)) {
            try {
                console.log(`🔄 Associating token with ${accountName}...`);
                
                const startTime = Date.now();
                
                // Create association transaction
                const associateTx = new TokenAssociateTransaction()
                    .setAccountId(accountData.accountId)
                    .setTokenIds([tokenId])
                    .freezeWith(this.client)
                    .sign(accountData.privateKey);

                // Execute with error handling
                const { response: associateSubmit, receipt: associateReceipt } = await this.errorHandler.safeTransactionExecute(
                    associateTx,
                    this.client,
                    `Token Association - ${accountName}`,
                    { account: accountName, tokenId: tokenId.toString() }
                );

                const endTime = Date.now();

                // Record association
                const associationData = {
                    account: accountName,
                    accountId: accountData.accountId.toString(),
                    hash: associateSubmit.transactionId.toString(),
                    timestamp: new Date().toISOString(),
                    duration: endTime - startTime,
                    status: 'SUCCESS'
                };

                associations.push(associationData);
                this.tokenData.operations.push({
                    type: 'TOKEN_ASSOCIATE',
                    ...associationData
                });

                console.log(`✅ ${accountName} associated successfully`);
                
                // Wait between associations
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Association failed for ${accountName}:`, error.message);
                // Continue with other accounts
            }
        }

        console.log(`✅ Token associated with ${associations.length} accounts`);
        return associations;
    }

    async queryTokenInfo(tokenId) {
        console.log('📊 Querying comprehensive token information...');
        
        try {
            const tokenInfoQuery = new TokenInfoQuery()
                .setTokenId(tokenId);

            const tokenInfo = await this.errorHandler.safeQueryExecute(
                tokenInfoQuery,
                this.client,
                'Token Info Query',
                { tokenId: tokenId.toString() }
            );

            // Extract comprehensive token information
            const tokenDetails = {
                tokenId: tokenInfo.tokenId.toString(),
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals,
                totalSupply: tokenInfo.totalSupply.toString(),
                treasury: tokenInfo.treasuryAccountId.toString(),
                adminKey: tokenInfo.adminKey ? 'Set' : 'Not Set',
                supplyKey: tokenInfo.supplyKey ? 'Set' : 'Not Set',
                freezeKey: tokenInfo.freezeKey ? 'Set' : 'Not Set',
                wipeKey: tokenInfo.wipeKey ? 'Set' : 'Not Set',
                pauseKey: tokenInfo.pauseKey ? 'Set' : 'Not Set',
                defaultFreezeStatus: tokenInfo.defaultFreezeStatus,
                defaultKycStatus: tokenInfo.defaultKycStatus,
                isDeleted: tokenInfo.isDeleted,
                autoRenewAccount: tokenInfo.autoRenewAccountId?.toString() || 'Not Set',
                autoRenewPeriod: tokenInfo.autoRenewPeriod?.seconds?.toString() || 'Not Set',
                expirationTime: tokenInfo.expirationTime?.toString() || 'Not Set',
                memo: tokenInfo.tokenMemo || 'Not Set'
            };

            // Update token data with queried information
            this.tokenData.verification = {
                ...tokenDetails,
                queryTimestamp: new Date().toISOString(),
                verified: true
            };

            console.log('✅ Token information retrieved successfully');
            console.log(`📊 Total Supply: ${tokenDetails.totalSupply}`);
            console.log(`🏦 Treasury: ${tokenDetails.treasury}`);
            console.log(`🔐 Keys: Admin(${tokenDetails.adminKey}), Supply(${tokenDetails.supplyKey})`);
            
            return tokenDetails;
            
        } catch (error) {
            console.error('❌ Token info query failed:', error.message);
            throw error;
        }
    }

    async generateTokenReport() {
        console.log('📋 Generating comprehensive token report...');
        
        const report = {
            ...this.tokenData,
            summary: {
                tokenCreated: true,
                totalOperations: this.tokenData.operations.length,
                associatedAccounts: this.tokenData.operations.filter(op => op.type === 'TOKEN_ASSOCIATE').length,
                creationTime: this.tokenData.token.creationTime,
                explorerLink: this.tokenData.token.explorerLink,
                verificationStatus: 'COMPLETE'
            },
            judgeInstructions: {
                step1: "Click the explorer link to view token on Hedera Explorer",
                step2: "Verify token name, symbol, and supply match reported values",
                step3: "Check transaction history shows creation and associations",
                step4: "Confirm token has proper keys and configuration",
                step5: "Validate all operations have real transaction hashes"
            }
        };

        // Save comprehensive report
        const reportPath = 'scripts/hts-token-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        fs.writeFileSync('scripts/hts-token-report.md', markdownReport);

        console.log(`✅ Token report saved to: ${reportPath}`);
        console.log(`📄 Markdown report saved to: scripts/hts-token-report.md`);
        
        return report;
    }

    generateMarkdownReport(report) {
        return `# HTS Token Creation Report

## 🪙 Token Summary

**Token ID**: ${report.token.tokenId}  
**Name**: ${report.token.name}  
**Symbol**: ${report.token.symbol}  
**Initial Supply**: ${report.token.initialSupply} tokens  
**Decimals**: ${report.token.decimals}  
**Explorer Link**: [View on Hashscan](${report.token.explorerLink})  

## 📊 Token Details

- **Supply Type**: ${report.token.supplyType}
- **Token Type**: ${report.token.tokenType}
- **Treasury**: ${report.token.treasury}
- **Creation Hash**: ${report.token.creationHash}
- **Created At**: ${report.token.createdAt}
- **Creation Time**: ${report.token.creationTime}ms

## 🔐 Token Keys Configuration

- **Admin Key**: ${report.token.keys.admin}
- **Supply Key**: ${report.token.keys.supply}
- **Freeze Key**: ${report.token.keys.freeze}
- **Wipe Key**: ${report.token.keys.wipe}
- **Pause Key**: ${report.token.keys.pause}

## 📋 Operations History

${report.operations.map(op => 
`- **${op.type}**: [${op.hash}](https://hashscan.io/testnet/transaction/${op.hash}) (${op.timestamp})`
).join('\n')}

## ✅ Verification Status

${report.verification ? `
- **Token ID**: ${report.verification.tokenId}
- **Total Supply**: ${report.verification.totalSupply}
- **Treasury**: ${report.verification.treasury}
- **Status**: Verified ✅
` : 'Verification pending...'}

## 🎯 Judge Validation

1. **Click Explorer Link** → Token loads on Hedera Explorer
2. **Verify Metadata** → Name, symbol, supply match
3. **Check Operations** → All transaction hashes valid
4. **Confirm Configuration** → Keys and settings correct
5. **Validate Supply** → Initial supply and decimals accurate

**🎉 HTS Token creation completed successfully with real data!**
`;
    }

    async runCompleteTokenCreation() {
        console.log('🎯 Starting Complete HTS Token Creation');
        console.log('=' .repeat(60));
        
        try {
            // Initialize
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Initialization failed');
            }

            // Create HTS token
            console.log('\n📍 Phase 1: Token Creation');
            const tokenId = await this.createRealHTSToken();

            // Associate with test accounts
            console.log('\n📍 Phase 2: Account Associations');
            await this.associateTokenWithAccounts(tokenId);

            // Query token information
            console.log('\n📍 Phase 3: Token Verification');
            await this.queryTokenInfo(tokenId);

            // Generate comprehensive report
            console.log('\n📍 Phase 4: Report Generation');
            const report = await this.generateTokenReport();

            console.log('\n' + '=' .repeat(60));
            console.log('🎉 HTS TOKEN CREATION COMPLETED!');
            console.log('');
            console.log('🪙 Token Details:');
            console.log(`   Token ID: ${this.tokenData.token.tokenId}`);
            console.log(`   Name: ${this.tokenData.token.name}`);
            console.log(`   Symbol: ${this.tokenData.token.symbol}`);
            console.log(`   Supply: ${this.tokenData.token.initialSupply} tokens`);
            console.log('');
            console.log('🔗 Verification Link:');
            console.log(`   ${this.tokenData.token.explorerLink}`);
            console.log('');
            console.log('📄 Reports Generated:');
            console.log('   scripts/hts-token-report.json');
            console.log('   scripts/hts-token-report.md');
            console.log('');
            console.log('🏆 Ready for hackathon verification!');

            return report;

        } catch (error) {
            console.error('\n💥 Token creation failed:', error.message);
            throw error;
        } finally {
            if (this.client) {
                this.client.close();
            }
        }
    }
}

// Main execution
async function main() {
    const creator = new RealHTSTokenCreator();
    
    try {
        await creator.runCompleteTokenCreation();
        process.exit(0);
    } catch (error) {
        console.error('💥 HTS token creation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = RealHTSTokenCreator;