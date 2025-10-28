#!/usr/bin/env node

/**
 * Create HCS Topic for AI Decision Logging
 * Creates a dedicated Hedera Consensus Service topic for logging AI decisions
 */

const {
    Client,
    AccountId,
    PrivateKey,
    TopicCreateTransaction,
    TopicInfoQuery,
    Hbar
} = require('@hashgraph/sdk');

const fs = require('fs');
const HederaErrorHandler = require('./hedera-error-handler');
require('dotenv').config({ path: '.env.hedera' });

class HCSAITopicCreator {
    constructor() {
        this.client = null;
        this.operatorId = null;
        this.operatorKey = null;
        this.errorHandler = new HederaErrorHandler(3, 2000);
        this.topicData = {
            timestamp: new Date().toISOString(),
            network: 'hedera-testnet',
            topic: {},
            verification: {},
            summary: {}
        };
    }

    async initialize() {
        console.log('🧩 Initializing HCS AI Topic Creator...');
        
        try {
            // Setup client
            this.client = Client.forTestnet();
            
            // Load operator credentials
            this.operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
            this.operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
            
            // Set operator
            this.client.setOperator(this.operatorId, this.operatorKey);
            
            // Health check
            const healthCheck = await this.errorHandler.performHealthCheck(this.client);
            if (!healthCheck.healthy) {
                throw new Error(`Health check failed: ${healthCheck.error || 'System not ready'}`);
            }
            
            console.log(`✅ Initialized with operator: ${this.operatorId}`);
            console.log(`🏥 Health check passed (${healthCheck.score}/3)`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return false;
        }
    }

    async createAIDecisionTopic() {
        console.log('🏗️ Creating HCS topic for AI decision logging...');
        
        const startTime = Date.now();
        
        try {
            // Create comprehensive topic metadata
            const topicMetadata = {
                memo: "AION AI Decision Logging - Autonomous Yield Optimization Consensus",
                description: "Immutable log of AI-driven DeFi strategy decisions and rebalancing operations",
                purpose: "Transparency and auditability of automated yield optimization",
                version: "v1.0",
                protocol: "AION DeFi Vault",
                network: "Hedera Testnet"
            };

            // Create HCS topic with comprehensive configuration
            const topicCreateTx = new TopicCreateTransaction()
                .setTopicMemo(topicMetadata.memo)
                .setAdminKey(this.operatorKey)
                .setSubmitKey(this.operatorKey)
                .setAutoRenewAccountId(this.operatorId)
                .setAutoRenewPeriod(7776000) // 90 days in seconds
                .setMaxTransactionFee(new Hbar(10));

            // Execute with error handling
            const { response: topicCreateSubmit, receipt: topicCreateReceipt } = await this.errorHandler.safeTransactionExecute(
                topicCreateTx,
                this.client,
                'HCS Topic Creation - AI Decision Logging',
                { 
                    memo: topicMetadata.memo,
                    purpose: topicMetadata.purpose
                }
            );

            const topicId = topicCreateReceipt.topicId;
            const endTime = Date.now();

            // Store comprehensive topic data
            this.topicData.topic = {
                topicId: topicId.toString(),
                ...topicMetadata,
                adminKey: "Set (Operator)",
                submitKey: "Set (Operator)",
                autoRenewAccount: this.operatorId.toString(),
                autoRenewPeriod: "90 days",
                creationHash: topicCreateSubmit.transactionId.toString(),
                explorerLink: `https://hashscan.io/testnet/topic/${topicId}`,
                createdAt: new Date().toISOString(),
                creationTime: endTime - startTime,
                status: 'ACTIVE'
            };

            console.log(`✅ HCS Topic created successfully!`);
            console.log(`🧩 Topic ID: ${topicId}`);
            console.log(`📝 Memo: ${topicMetadata.memo}`);
            console.log(`🔑 Admin Key: Set (Operator controlled)`);
            console.log(`📤 Submit Key: Set (AI agent authorized)`);
            console.log(`🔗 Explorer: https://hashscan.io/testnet/topic/${topicId}`);
            console.log(`⏱️  Creation Time: ${endTime - startTime}ms`);
            
            return topicId;
            
        } catch (error) {
            console.error('❌ HCS topic creation failed:', error.message);
            throw error;
        }
    }

    async verifyTopicConfiguration(topicId) {
        console.log('🔍 Verifying topic configuration and accessibility...');
        
        try {
            const startTime = Date.now();
            
            // Query topic information
            const topicInfoQuery = new TopicInfoQuery()
                .setTopicId(topicId);

            const topicInfo = await this.errorHandler.safeQueryExecute(
                topicInfoQuery,
                this.client,
                'Topic Info Verification',
                { topicId: topicId.toString() }
            );

            const endTime = Date.now();

            // Extract comprehensive topic information
            const verificationData = {
                topicId: topicInfo.topicId.toString(),
                memo: topicInfo.topicMemo,
                adminKey: topicInfo.adminKey ? 'Set' : 'Not Set',
                submitKey: topicInfo.submitKey ? 'Set' : 'Not Set',
                autoRenewAccount: topicInfo.autoRenewAccountId?.toString() || 'Not Set',
                autoRenewPeriod: topicInfo.autoRenewPeriod?.seconds?.toString() || 'Not Set',
                expirationTime: topicInfo.expirationTime?.toString() || 'Not Set',
                sequenceNumber: topicInfo.sequenceNumber?.toString() || '0',
                runningHash: topicInfo.runningHash ? 'Present' : 'Not Present',
                queryTime: endTime - startTime,
                verifiedAt: new Date().toISOString(),
                accessible: true
            };

            this.topicData.verification = verificationData;

            console.log('✅ Topic verification completed successfully');
            console.log(`📊 Topic ID: ${verificationData.topicId}`);
            console.log(`📝 Memo: ${verificationData.memo}`);
            console.log(`🔐 Admin Key: ${verificationData.adminKey}`);
            console.log(`📤 Submit Key: ${verificationData.submitKey}`);
            console.log(`🔄 Auto Renew: ${verificationData.autoRenewAccount}`);
            console.log(`📈 Sequence Number: ${verificationData.sequenceNumber}`);
            console.log(`⏱️  Query Time: ${verificationData.queryTime}ms`);
            
            return verificationData;
            
        } catch (error) {
            console.error('❌ Topic verification failed:', error.message);
            
            // Record failed verification
            this.topicData.verification = {
                error: error.message,
                accessible: false,
                verifiedAt: new Date().toISOString()
            };
            
            throw error;
        }
    }

    async generateAIDecisionTemplate() {
        console.log('📋 Generating AI decision message template...');
        
        // Create comprehensive AI decision template
        const decisionTemplate = {
            messageFormat: "AION_AI_DECISION_V1",
            requiredFields: {
                timestamp: "ISO 8601 timestamp",
                sequenceNumber: "Message sequence number",
                decisionType: "REBALANCE | OPTIMIZE | EMERGENCY | DIVERSIFY",
                fromStrategy: "Source strategy name",
                toStrategy: "Target strategy name",
                amount: "Amount in wei (string)",
                amountFormatted: "Human readable amount",
                reason: "Decision rationale",
                confidence: "Confidence score (0-1)",
                expectedGain: "Expected benefit description",
                riskScore: "Risk assessment (0-1)",
                modelVersion: "AI model version",
                networkId: "hedera-testnet",
                vaultAddress: "Vault contract address"
            },
            optionalFields: {
                gasEstimate: "Estimated gas cost",
                marketConditions: "Current market analysis",
                historicalPerformance: "Past strategy performance",
                userImpact: "Impact on user positions",
                protocolHealth: "Protocol health scores"
            },
            exampleMessage: {
                messageFormat: "AION_AI_DECISION_V1",
                timestamp: new Date().toISOString(),
                sequenceNumber: 1,
                decisionType: "REBALANCE",
                fromStrategy: "Venus BNB Lending",
                toStrategy: "PancakeSwap BNB-BUSD LP",
                amount: "75000000000000000000",
                amountFormatted: "75 BNB",
                reason: "Higher APY detected: 12.3% vs 8.5%",
                confidence: 0.94,
                expectedGain: "3.8% additional yield annually",
                riskScore: 0.25,
                modelVersion: "v2.3.2",
                networkId: "hedera-testnet",
                vaultAddress: this.operatorId.toString(),
                marketConditions: {
                    bnbPrice: "$580.45",
                    volatility: "Medium",
                    liquidityDepth: "High"
                },
                historicalPerformance: {
                    venusAPY: "8.5%",
                    pancakeAPY: "12.3%",
                    riskAdjustedReturn: "10.8%"
                }
            }
        };

        // Save template for reference
        const templatePath = 'scripts/ai-decision-template.json';
        fs.writeFileSync(templatePath, JSON.stringify(decisionTemplate, null, 2));
        
        console.log(`✅ AI decision template saved to: ${templatePath}`);
        console.log(`📋 Message format: ${decisionTemplate.messageFormat}`);
        console.log(`🔢 Required fields: ${Object.keys(decisionTemplate.requiredFields).length}`);
        console.log(`➕ Optional fields: ${Object.keys(decisionTemplate.optionalFields).length}`);
        
        return decisionTemplate;
    }

    async generateTopicReport() {
        console.log('📋 Generating comprehensive topic report...');
        
        const report = {
            ...this.topicData,
            summary: {
                topicCreated: true,
                topicId: this.topicData.topic.topicId,
                explorerLink: this.topicData.topic.explorerLink,
                creationTime: this.topicData.topic.creationTime,
                verified: this.topicData.verification.accessible || false,
                readyForMessages: true,
                templateGenerated: true,
                reportGenerated: new Date().toISOString()
            },
            judgeInstructions: {
                step1: "Click the explorer link to view topic on Hedera Explorer",
                step2: "Verify topic memo matches AI decision logging purpose",
                step3: "Check topic has admin and submit keys configured",
                step4: "Confirm topic is accessible and ready for messages",
                step5: "Validate auto-renew settings for long-term operation"
            },
            nextSteps: {
                step1: "Submit AI decision messages to the topic",
                step2: "Verify message submission and consensus",
                step3: "Query topic messages for audit trail",
                step4: "Generate comprehensive decision log report"
            }
        };

        // Save comprehensive report
        const reportPath = 'scripts/hcs-ai-topic-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        fs.writeFileSync('scripts/hcs-ai-topic-report.md', markdownReport);

        console.log(`✅ Topic report saved to: ${reportPath}`);
        console.log(`📄 Markdown report saved to: scripts/hcs-ai-topic-report.md`);
        
        return report;
    }

    generateMarkdownReport(report) {
        return `# HCS AI Decision Topic Report

## 🧩 Topic Summary

**Topic ID**: ${report.topic.topicId}  
**Memo**: ${report.topic.memo}  
**Purpose**: ${report.topic.purpose}  
**Network**: ${report.topic.network}  
**Status**: ${report.topic.status}  
**Explorer Link**: [View on Hashscan](${report.topic.explorerLink})  

## 🏗️ Topic Configuration

- **Admin Key**: ${report.topic.adminKey}
- **Submit Key**: ${report.topic.submitKey}
- **Auto Renew Account**: ${report.topic.autoRenewAccount}
- **Auto Renew Period**: ${report.topic.autoRenewPeriod}
- **Creation Hash**: ${report.topic.creationHash}
- **Created At**: ${report.topic.createdAt}
- **Creation Time**: ${report.topic.creationTime}ms

## ✅ Verification Results

${report.verification.accessible ? `
- **Topic ID**: ${report.verification.topicId}
- **Memo**: ${report.verification.memo}
- **Admin Key**: ${report.verification.adminKey}
- **Submit Key**: ${report.verification.submitKey}
- **Sequence Number**: ${report.verification.sequenceNumber}
- **Running Hash**: ${report.verification.runningHash}
- **Query Time**: ${report.verification.queryTime}ms
- **Status**: ✅ Verified and Accessible
` : `
- **Status**: ❌ Verification Failed
- **Error**: ${report.verification.error}
`}

## 📋 AI Decision Message Format

The topic is configured to accept AI decision messages in the following format:

\`\`\`json
{
  "messageFormat": "AION_AI_DECISION_V1",
  "timestamp": "2024-10-28T12:00:00.000Z",
  "sequenceNumber": 1,
  "decisionType": "REBALANCE",
  "fromStrategy": "Venus BNB Lending",
  "toStrategy": "PancakeSwap BNB-BUSD LP",
  "amount": "75000000000000000000",
  "amountFormatted": "75 BNB",
  "reason": "Higher APY detected: 12.3% vs 8.5%",
  "confidence": 0.94,
  "expectedGain": "3.8% additional yield annually",
  "riskScore": 0.25,
  "modelVersion": "v2.3.2",
  "networkId": "hedera-testnet",
  "vaultAddress": "${report.topic.autoRenewAccount}"
}
\`\`\`

## 🎯 Judge Validation

1. **Click Explorer Link** → Topic loads on Hedera Explorer
2. **Verify Configuration** → Admin and submit keys are set
3. **Check Memo** → Purpose matches AI decision logging
4. **Confirm Accessibility** → Topic is ready for messages
5. **Validate Settings** → Auto-renew configured for longevity

## 🚀 Next Steps

1. **Submit AI Decisions** → Log real AI decision messages
2. **Verify Consensus** → Confirm messages reach consensus
3. **Query Messages** → Retrieve and validate message history
4. **Generate Audit Trail** → Create comprehensive decision log

**🎉 HCS Topic created successfully and ready for AI decision logging!**
`;
    }

    async runCompleteTopicCreation() {
        console.log('🎯 Starting Complete HCS AI Topic Creation');
        console.log('=' .repeat(60));
        
        try {
            // Initialize
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Initialization failed');
            }

            // Create HCS topic
            console.log('\n📍 Phase 1: Topic Creation');
            const topicId = await this.createAIDecisionTopic();

            // Verify topic configuration
            console.log('\n📍 Phase 2: Topic Verification');
            await this.verifyTopicConfiguration(topicId);

            // Generate AI decision template
            console.log('\n📍 Phase 3: Template Generation');
            await this.generateAIDecisionTemplate();

            // Generate comprehensive report
            console.log('\n📍 Phase 4: Report Generation');
            const report = await this.generateTopicReport();

            console.log('\n' + '=' .repeat(60));
            console.log('🎉 HCS AI TOPIC CREATION COMPLETED!');
            console.log('');
            console.log('🧩 Topic Details:');
            console.log(`   Topic ID: ${this.topicData.topic.topicId}`);
            console.log(`   Purpose: AI Decision Logging`);
            console.log(`   Status: ${this.topicData.topic.status}`);
            console.log(`   Verified: ${this.topicData.verification.accessible ? 'Yes' : 'No'}`);
            console.log('');
            console.log('🔗 Verification Link:');
            console.log(`   ${this.topicData.topic.explorerLink}`);
            console.log('');
            console.log('📄 Reports Generated:');
            console.log('   scripts/hcs-ai-topic-report.json');
            console.log('   scripts/hcs-ai-topic-report.md');
            console.log('   scripts/ai-decision-template.json');
            console.log('');
            console.log('🏆 Ready for AI decision message submission!');

            return report;

        } catch (error) {
            console.error('\n💥 Topic creation failed:', error.message);
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
    const creator = new HCSAITopicCreator();
    
    try {
        await creator.runCompleteTopicCreation();
        process.exit(0);
    } catch (error) {
        console.error('💥 HCS AI topic creation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = HCSAITopicCreator;