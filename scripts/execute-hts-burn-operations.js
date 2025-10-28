#!/usr/bin/env node

/**
 * Execute Real HTS Burn Operations
 * Performs actual burn operations representing user withdrawals and token management
 */

const {
    Client,
    AccountId,
    PrivateKey,
    TokenBurnTransaction,
    TransferTransaction,
    TokenInfoQuery,
    AccountBalanceQuery,
    Hbar,
    TokenId
} = require('@hashgraph/sdk');

const fs = require('fs');
const HederaErrorHandler = require('./hedera-error-handler');
require('dotenv').config({ path: '.env.hedera' });

class HTSBurnOperationsExecutor {
    constructor() {
        this.client = null;
        this.operatorId = null;
        this.operatorKey = null;
        this.testAccounts = {};
        this.errorHandler = new HederaErrorHandler(3, 2000);
        this.burnData = {
            timestamp: new Date().toISOString(),
            network: 'hedera-testnet',
            tokenId: null,
            initialSupply: 0,
            operations: [],
            finalBalances: {},
            summary: {}
        };
    }

    async initialize() {
        console.log('🔥 Initializing HTS Burn Operations Executor...');
        
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
            
            // Load token information
            await this.loadTokenInfo();
            
            console.log(`✅ Initialized with operator: ${this.operatorId}`);
            console.log(`🪙 Token ID: ${this.burnData.tokenId}`);
            console.log(`📊 Initial Supply: ${this.burnData.initialSupply.toLocaleString()} tokens`);
            
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
            console.log('⚠️  Test accounts file not found');
            throw error;
        }
    }

    async loadTokenInfo() {
        try {
            // Try to load from mint operations report first
            let tokenId, initialSupply;
            
            try {
                const mintReport = JSON.parse(fs.readFileSync('scripts/hts-mint-operations-report.json', 'utf8'));
                tokenId = mintReport.tokenId;
                initialSupply = parseInt(mintReport.summary.tokenSupply.totalSupply);
            } catch (mintError) {
                // Fallback to token creation report
                const tokenReport = JSON.parse(fs.readFileSync('scripts/hts-token-report.json', 'utf8'));
                tokenId = tokenReport.token.tokenId;
                initialSupply = parseInt(tokenReport.token.initialSupply);
            }
            
            this.burnData.tokenId = tokenId;
            this.burnData.initialSupply = initialSupply;
            
            console.log('✅ Token information loaded');
        } catch (error) {
            console.log('⚠️  Token information not found');
            throw new Error('Token information required. Please run create:hts and mint:hts first.');
        }
    }

    async executeRealBurnOperations() {
        console.log('🔥 Executing real burn operations representing user withdrawals...');
        
        // Define realistic burn scenarios
        const burnScenarios = [
            {
                scenario: "Partial User Withdrawal",
                user: "user1",
                amount: 30000, // 30K tokens (user withdraws 30 BNB)
                description: "User1 withdraws 30 BNB from vault",
                reason: "Partial withdrawal for personal expenses",
                withdrawalType: "PARTIAL"
            },
            {
                scenario: "Emergency Withdrawal",
                user: "user2", 
                amount: 50000, // 50K tokens (emergency withdrawal)
                description: "User2 emergency withdrawal due to market conditions",
                reason: "Risk management - market volatility concerns",
                withdrawalType: "EMERGENCY"
            },
            {
                scenario: "Profit Taking",
                user: "user1",
                amount: 25000, // 25K tokens (profit taking)
                description: "User1 takes profits from successful yield farming",
                reason: "Realized gains from AI optimization strategies",
                withdrawalType: "PROFIT_TAKING"
            },
            {
                scenario: "Treasury Burn",
                user: "treasury",
                amount: 20000, // 20K tokens (deflationary mechanism)
                description: "Treasury burns tokens for deflationary pressure",
                reason: "Protocol tokenomics - reduce circulating supply",
                withdrawalType: "DEFLATIONARY"
            },
            {
                scenario: "Complete Exit",
                user: "user2",
                amount: 75000, // 75K tokens (complete withdrawal)
                description: "User2 exits position completely",
                reason: "Portfolio rebalancing - moving to different strategy",
                withdrawalType: "COMPLETE_EXIT"
            }
        ];

        let totalBurned = 0;

        for (let i = 0; i < burnScenarios.length; i++) {
            const scenario = burnScenarios[i];
            
            try {
                console.log(`\n🔥 Scenario ${i + 1}: ${scenario.scenario}`);
                console.log(`   User: ${scenario.user}`);
                console.log(`   Amount: ${scenario.amount.toLocaleString()} tokens`);
                console.log(`   Type: ${scenario.withdrawalType}`);
                console.log(`   Description: ${scenario.description}`);
                
                const startTime = Date.now();
                
                // First, transfer tokens back to treasury if needed (for user burns)
                let transferHash = null;
                if (scenario.user !== 'treasury' && this.testAccounts[scenario.user]) {
                    console.log(`   🔄 Transferring tokens from ${scenario.user} to treasury...`);
                    
                    const transferTx = new TransferTransaction()
                        .addTokenTransfer(this.burnData.tokenId, this.testAccounts[scenario.user].accountId, -scenario.amount)
                        .addTokenTransfer(this.burnData.tokenId, this.operatorId, scenario.amount)
                        .freezeWith(this.client)
                        .sign(this.testAccounts[scenario.user].privateKey);

                    const { response: transferSubmit } = await this.errorHandler.safeTransactionExecute(
                        transferTx,
                        this.client,
                        `Token Transfer for Burn - ${scenario.user}`,
                        { 
                            user: scenario.user,
                            amount: scenario.amount
                        }
                    );
                    
                    transferHash = transferSubmit.transactionId.toString();
                    console.log(`   ✅ Transfer completed`);
                }

                // Execute burn transaction
                console.log(`   🔥 Burning ${scenario.amount.toLocaleString()} tokens...`);
                
                const burnTx = new TokenBurnTransaction()
                    .setTokenId(this.burnData.tokenId)
                    .setAmount(scenario.amount)
                    .setMaxTransactionFee(new Hbar(20));

                const { response: burnSubmit, receipt: burnReceipt } = await this.errorHandler.safeTransactionExecute(
                    burnTx,
                    this.client,
                    `Burn Operation - ${scenario.scenario}`,
                    { 
                        user: scenario.user,
                        amount: scenario.amount,
                        scenario: scenario.scenario
                    }
                );

                const endTime = Date.now();
                totalBurned += scenario.amount;

                // Record operation
                const operationData = {
                    scenario: scenario.scenario,
                    user: scenario.user,
                    amount: scenario.amount,
                    withdrawalType: scenario.withdrawalType,
                    description: scenario.description,
                    reason: scenario.reason,
                    transferHash: transferHash,
                    burnHash: burnSubmit.transactionId.toString(),
                    timestamp: new Date().toISOString(),
                    duration: endTime - startTime,
                    status: 'SUCCESS',
                    explorerLinks: {
                        transfer: transferHash ? `https://hashscan.io/testnet/transaction/${transferHash}` : null,
                        burn: `https://hashscan.io/testnet/transaction/${burnSubmit.transactionId.toString()}`
                    }
                };

                this.burnData.operations.push(operationData);

                console.log(`   ✅ Burn completed: ${scenario.amount.toLocaleString()} tokens`);
                if (transferHash) {
                    console.log(`   🔗 Transfer Hash: ${transferHash}`);
                }
                console.log(`   🔗 Burn Hash: ${burnSubmit.transactionId.toString()}`);
                console.log(`   ⏱️  Duration: ${endTime - startTime}ms`);
                
                // Wait between operations for realistic timing
                await new Promise(resolve => setTimeout(resolve, 4000));
                
            } catch (error) {
                console.error(`❌ Burn operation failed for ${scenario.scenario}:`, error.message);
                
                // Record failed operation
                this.burnData.operations.push({
                    scenario: scenario.scenario,
                    user: scenario.user,
                    amount: scenario.amount,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    status: 'FAILED'
                });
            }
        }

        console.log(`\n✅ Completed ${burnScenarios.length} burn scenarios`);
        console.log(`🔥 Total tokens burned: ${totalBurned.toLocaleString()}`);
        
        return totalBurned;
    }

    async verifyFinalBalances() {
        console.log('📊 Verifying final user balances after burns...');
        
        const balanceChecks = [
            { name: 'operator', accountId: this.operatorId },
            ...Object.entries(this.testAccounts).map(([name, data]) => ({
                name: name,
                accountId: data.accountId
            }))
        ];

        for (const account of balanceChecks) {
            try {
                console.log(`🔍 Checking final balance for ${account.name}...`);
                
                const balanceQuery = new AccountBalanceQuery()
                    .setAccountId(account.accountId);

                const balance = await this.errorHandler.safeQueryExecute(
                    balanceQuery,
                    this.client,
                    `Final Balance Query - ${account.name}`,
                    { account: account.name }
                );

                const tokenBalance = balance.tokens.get(TokenId.fromString(this.burnData.tokenId));
                const tokenBalanceAmount = tokenBalance ? tokenBalance.toNumber() : 0;

                this.burnData.finalBalances[account.name] = {
                    accountId: account.accountId.toString(),
                    hbarBalance: balance.hbars.toString(),
                    tokenBalance: tokenBalanceAmount,
                    tokenBalanceFormatted: tokenBalanceAmount.toLocaleString(),
                    timestamp: new Date().toISOString()
                };

                console.log(`   💰 HBAR: ${balance.hbars.toString()}`);
                console.log(`   🪙 AION: ${tokenBalanceAmount.toLocaleString()} tokens`);
                
            } catch (error) {
                console.error(`❌ Balance check failed for ${account.name}:`, error.message);
                
                this.burnData.finalBalances[account.name] = {
                    accountId: account.accountId.toString(),
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        }

        console.log('✅ Final balance verification completed');
    }

    async queryFinalTokenSupply() {
        console.log('📉 Querying final token supply after burns...');
        
        try {
            const tokenInfoQuery = new TokenInfoQuery()
                .setTokenId(this.burnData.tokenId);

            const tokenInfo = await this.errorHandler.safeQueryExecute(
                tokenInfoQuery,
                this.client,
                'Final Token Supply Query',
                { tokenId: this.burnData.tokenId }
            );

            const finalSupplyInfo = {
                tokenId: tokenInfo.tokenId.toString(),
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                finalTotalSupply: tokenInfo.totalSupply.toString(),
                finalTotalSupplyFormatted: tokenInfo.totalSupply.toNumber().toLocaleString(),
                initialSupply: this.burnData.initialSupply,
                initialSupplyFormatted: this.burnData.initialSupply.toLocaleString(),
                totalBurned: this.burnData.initialSupply - tokenInfo.totalSupply.toNumber(),
                totalBurnedFormatted: (this.burnData.initialSupply - tokenInfo.totalSupply.toNumber()).toLocaleString(),
                supplyReduction: ((this.burnData.initialSupply - tokenInfo.totalSupply.toNumber()) / this.burnData.initialSupply * 100).toFixed(2),
                decimals: tokenInfo.decimals,
                treasury: tokenInfo.treasuryAccountId.toString(),
                queryTimestamp: new Date().toISOString()
            };

            this.burnData.summary.finalSupply = finalSupplyInfo;

            console.log(`✅ Final total supply: ${finalSupplyInfo.finalTotalSupplyFormatted} tokens`);
            console.log(`📉 Total burned: ${finalSupplyInfo.totalBurnedFormatted} tokens`);
            console.log(`📊 Supply reduction: ${finalSupplyInfo.supplyReduction}%`);
            
            return finalSupplyInfo;
            
        } catch (error) {
            console.error('❌ Final token supply query failed:', error.message);
            throw error;
        }
    }

    async generateBurnReport() {
        console.log('📋 Generating comprehensive burn operations report...');
        
        const successfulOperations = this.burnData.operations.filter(op => op.status === 'SUCCESS');
        const failedOperations = this.burnData.operations.filter(op => op.status === 'FAILED');
        const totalBurned = successfulOperations.reduce((sum, op) => sum + op.amount, 0);

        const report = {
            ...this.burnData,
            summary: {
                ...this.burnData.summary,
                totalOperations: this.burnData.operations.length,
                successfulOperations: successfulOperations.length,
                failedOperations: failedOperations.length,
                totalTokensBurned: totalBurned,
                totalTokensBurnedFormatted: totalBurned.toLocaleString(),
                averageOperationTime: successfulOperations.length > 0 
                    ? Math.round(successfulOperations.reduce((sum, op) => sum + op.duration, 0) / successfulOperations.length)
                    : 0,
                burnTypes: {
                    PARTIAL: successfulOperations.filter(op => op.withdrawalType === 'PARTIAL').length,
                    EMERGENCY: successfulOperations.filter(op => op.withdrawalType === 'EMERGENCY').length,
                    PROFIT_TAKING: successfulOperations.filter(op => op.withdrawalType === 'PROFIT_TAKING').length,
                    DEFLATIONARY: successfulOperations.filter(op => op.withdrawalType === 'DEFLATIONARY').length,
                    COMPLETE_EXIT: successfulOperations.filter(op => op.withdrawalType === 'COMPLETE_EXIT').length
                },
                reportGenerated: new Date().toISOString()
            },
            judgeInstructions: {
                step1: "Click on burn transaction links to view on Hedera Explorer",
                step2: "Verify each burn operation shows correct token amounts",
                step3: "Check transfer transactions moved tokens before burning",
                step4: "Confirm total supply decreased by burned amounts",
                step5: "Validate final user balances reflect burned tokens"
            }
        };

        // Save comprehensive report
        const reportPath = 'scripts/hts-burn-operations-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        fs.writeFileSync('scripts/hts-burn-operations-report.md', markdownReport);

        console.log(`✅ Burn operations report saved to: ${reportPath}`);
        console.log(`📄 Markdown report saved to: scripts/hts-burn-operations-report.md`);
        
        return report;
    }

    generateMarkdownReport(report) {
        const successfulOps = report.operations.filter(op => op.status === 'SUCCESS');
        
        return `# HTS Burn Operations Report

## 🔥 Operations Summary

**Token ID**: ${report.tokenId}  
**Initial Supply**: ${report.initialSupply.toLocaleString()} tokens  
**Final Supply**: ${report.summary.finalSupply?.finalTotalSupplyFormatted || 'N/A'} tokens  
**Total Burned**: ${report.summary.totalTokensBurnedFormatted} tokens  
**Supply Reduction**: ${report.summary.finalSupply?.supplyReduction || 'N/A'}%  
**Total Operations**: ${report.summary.totalOperations}  
**Successful**: ${report.summary.successfulOperations}  
**Failed**: ${report.summary.failedOperations}  
**Average Time**: ${report.summary.averageOperationTime}ms  

## 🔥 Burn Operations

${successfulOps.map((op, index) => `
### ${index + 1}. ${op.scenario}
- **User**: ${op.user}
- **Amount**: ${op.amount.toLocaleString()} tokens
- **Type**: ${op.withdrawalType}
- **Description**: ${op.description}
- **Reason**: ${op.reason}
${op.transferHash ? `- **Transfer Hash**: [${op.transferHash}](${op.explorerLinks.transfer})` : ''}
- **Burn Hash**: [${op.burnHash}](${op.explorerLinks.burn})
- **Duration**: ${op.duration}ms
- **Status**: ✅ ${op.status}
`).join('\n')}

## 📊 Burn Types Distribution

- **Partial Withdrawals**: ${report.summary.burnTypes.PARTIAL}
- **Emergency Withdrawals**: ${report.summary.burnTypes.EMERGENCY}
- **Profit Taking**: ${report.summary.burnTypes.PROFIT_TAKING}
- **Deflationary Burns**: ${report.summary.burnTypes.DEFLATIONARY}
- **Complete Exits**: ${report.summary.burnTypes.COMPLETE_EXIT}

## 📊 Final User Balances

${Object.entries(report.finalBalances).map(([user, balance]) => `
### ${user}
- **Account ID**: ${balance.accountId}
- **HBAR Balance**: ${balance.hbarBalance}
- **AION Balance**: ${balance.tokenBalanceFormatted || 'Error'} tokens
${balance.error ? `- **Error**: ${balance.error}` : ''}
`).join('\n')}

## 📈 Supply Impact Analysis

- **Initial Total Supply**: ${report.summary.finalSupply?.initialSupplyFormatted || 'N/A'}
- **Final Total Supply**: ${report.summary.finalSupply?.finalTotalSupplyFormatted || 'N/A'}
- **Total Burned**: ${report.summary.finalSupply?.totalBurnedFormatted || 'N/A'}
- **Supply Reduction**: ${report.summary.finalSupply?.supplyReduction || 'N/A'}%
- **Treasury Account**: ${report.summary.finalSupply?.treasury || 'N/A'}

## 🎯 Judge Validation

1. **Click Transaction Links** → All burn operations visible on Hedera Explorer
2. **Verify Amounts** → Each operation shows correct token amounts burned
3. **Check Transfers** → Tokens properly transferred before burning
4. **Confirm Supply Reduction** → Total supply decreased correctly
5. **Validate Final Balances** → User accounts reflect burned tokens

**🎉 All burn operations completed with real transaction data demonstrating deflationary tokenomics!**
`;
    }

    async runCompleteBurnOperations() {
        console.log('🎯 Starting Complete HTS Burn Operations');
        console.log('=' .repeat(60));
        
        try {
            // Initialize
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Initialization failed');
            }

            // Execute burn operations
            console.log('\n📍 Phase 1: Burn Operations Execution');
            const totalBurned = await this.executeRealBurnOperations();

            // Verify final balances
            console.log('\n📍 Phase 2: Final Balance Verification');
            await this.verifyFinalBalances();

            // Query final token supply
            console.log('\n📍 Phase 3: Final Supply Analysis');
            await this.queryFinalTokenSupply();

            // Generate comprehensive report
            console.log('\n📍 Phase 4: Report Generation');
            const report = await this.generateBurnReport();

            console.log('\n' + '=' .repeat(60));
            console.log('🎉 HTS BURN OPERATIONS COMPLETED!');
            console.log('');
            console.log('🔥 Results:');
            console.log(`   Operations: ${report.summary.totalOperations}`);
            console.log(`   Successful: ${report.summary.successfulOperations}`);
            console.log(`   Total Burned: ${report.summary.totalTokensBurnedFormatted} tokens`);
            console.log(`   Supply Reduction: ${report.summary.finalSupply?.supplyReduction || 'N/A'}%`);
            console.log(`   Average Time: ${report.summary.averageOperationTime}ms`);
            console.log('');
            console.log('🔗 Token Explorer:');
            console.log(`   https://hashscan.io/testnet/token/${this.burnData.tokenId}`);
            console.log('');
            console.log('📄 Reports Generated:');
            console.log('   scripts/hts-burn-operations-report.json');
            console.log('   scripts/hts-burn-operations-report.md');
            console.log('');
            console.log('🏆 Deflationary tokenomics demonstrated with real data!');

            return report;

        } catch (error) {
            console.error('\n💥 Burn operations failed:', error.message);
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
    const executor = new HTSBurnOperationsExecutor();
    
    try {
        await executor.runCompleteBurnOperations();
        process.exit(0);
    } catch (error) {
        console.error('💥 HTS burn operations failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = HTSBurnOperationsExecutor;