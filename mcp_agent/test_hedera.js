import HederaService from './services/hederaService.js';

async function testHederaService() {
    console.log('🧪 Testing Hedera Service Integration...\n');
    
    const hederaService = new HederaService();
    
    try {
        // Test 1: Initialize service
        console.log('1️⃣ Testing service initialization...');
        const initialized = await hederaService.initialize();
        console.log('Status:', hederaService.getStatus());
        console.log('✅ Initialization test completed\n');
        
        // Test 2: Test decision data structure
        console.log('2️⃣ Testing decision data structure...');
        const mockDecisionData = {
            txHash: '0x1234567890abcdef',
            type: 'rebalance',
            fromStrategy: 'Venus',
            toStrategy: 'PancakeSwap',
            amount: '1000000000000000000',
            reason: 'Higher yield opportunity detected',
            modelHash: 'Qm1234567890abcdef',
            modelVersion: 'v2.1.3',
            hfsFileId: '0.0.123456',
            expectedYield: '12.5%',
            riskScore: 0.3,
            confidence: 0.95
        };
        console.log('Mock decision data:', JSON.stringify(mockDecisionData, null, 2));
        console.log('✅ Decision data structure test completed\n');
        
        // Test 3: Test model metadata structure
        console.log('3️⃣ Testing model metadata structure...');
        const mockModelMetadata = {
            version: 'v2.1.3',
            checksum: 'sha256:abc123def456',
            trainingStartDate: '2024-01-01',
            trainingEndDate: '2024-01-31',
            trainingSamples: 50000,
            accuracy: 0.94,
            precision: 0.92,
            recall: 0.96,
            learningRate: 0.001,
            epochs: 100,
            batchSize: 32
        };
        console.log('Mock model metadata:', JSON.stringify(mockModelMetadata, null, 2));
        console.log('✅ Model metadata structure test completed\n');
        
        // Test 4: Test monitoring setup
        console.log('4️⃣ Testing vault monitoring setup...');
        const monitoringResult = await hederaService.monitorVaultEvents(
            '0x1234567890123456789012345678901234567890',
            (event) => console.log('Event received:', event)
        );
        console.log('Monitoring result:', monitoringResult);
        console.log('✅ Monitoring setup test completed\n');
        
        console.log('🎉 All Hedera service tests completed successfully!');
        console.log('Final status:', hederaService.getStatus());
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await hederaService.close();
    }
}

// Run tests if this file is executed directly
testHederaService();

export default testHederaService;