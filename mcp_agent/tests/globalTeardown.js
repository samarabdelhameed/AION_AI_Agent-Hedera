/**
 * @fileoverview Jest Global Teardown
 * @description Global cleanup after all tests
 * @author AION Team
 * @version 2.0.0
 */

module.exports = async () => {
    console.log('🧹 Cleaning up test environment...');
    
    // Clean up any global resources
    if (global.testServer) {
        await global.testServer.close();
    }
    
    // Clear any global timers
    if (global.testTimers) {
        global.testTimers.forEach(timer => clearTimeout(timer));
    }
    
    console.log('✅ Test environment cleanup complete');
};