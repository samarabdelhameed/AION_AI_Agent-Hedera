/**
 * @fileoverview Jest Global Setup
 * @description Global setup before all tests
 * @author AION Team
 * @version 2.0.0
 */

module.exports = async () => {
    console.log('🧪 Setting up test environment...');
    
    // Set global test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise
    
    // Mock external services for testing
    process.env.MOCK_HEDERA_SERVICE = 'true';
    process.env.MOCK_WEB3_SERVICE = 'true';
    
    console.log('✅ Test environment setup complete');
};