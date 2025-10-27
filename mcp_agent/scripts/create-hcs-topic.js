#!/usr/bin/env node

/**
 * Create HCS Topic Script
 * Creates a new HCS topic for AI decision logging
 */

import HederaService from '../services/hederaService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.hedera' });

async function createHCSTopic() {
    const hederaService = new HederaService();
    
    try {
        console.log('🚀 Creating HCS Topic...');
        
        // Initialize Hedera service
        await hederaService.initialize();
        console.log('✓ Hedera service initialized');
        
        // Get topic memo from environment or use default
        const topicMemo = process.env.HCS_TOPIC_MEMO || 'AION AI Decision Log';
        
        // Create topic
        const topicId = await hederaService.createHCSTopic(topicMemo);
        
        console.log('✅ HCS Topic Created Successfully!');
        console.log(`Topic ID: ${topicId}`);
        console.log(`Memo: ${topicMemo}`);
        
        // Test the topic with a sample message
        console.log('\n🧪 Testing topic with sample message...');
        
        const testMessage = {
            txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
            blockNumber: 0,
            logIndex: 0,
            type: 'topic_creation_test',
            agent: process.env.AI_AGENT_ADDRESS || '0x0000000000000000000000000000000000000000',
            decisionId: `topic_test_${Date.now()}`,
            timestamp: Date.now(),
            reason: 'HCS topic creation test'
        };
        
        const result = await hederaService.submitDecisionToHCS(testMessage);
        console.log(`✓ Test message submitted successfully`);
        console.log(`  Sequence Number: ${result.sequenceNumber}`);
        console.log(`  Transaction ID: ${result.transactionId}`);
        
        console.log('\n📋 Configuration:');
        console.log(`Add this to your .env.hedera file:`);
        console.log(`HCS_TOPIC_ID=${topicId}`);
        
    } catch (error) {
        console.error('❌ Failed to create HCS topic:', error.message);
        process.exit(1);
    } finally {
        await hederaService.close();
    }
}

// Run the script
createHCSTopic();