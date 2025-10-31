/**
 * @fileoverview Jest Test Setup
 * @description Global test setup and configuration
 * @author AION Team
 * @version 2.0.0
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.DEFAULT_ADMIN_PASSWORD = 'TestAdmin123!';
process.env.API_USER_PASSWORD = 'TestAPI123!';
process.env.HEDERA_NETWORK = 'testnet';
process.env.HEDERA_OPERATOR_ID = '0.0.123456';
process.env.HEDERA_OPERATOR_KEY = 'test_private_key';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only show console output if VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
}

// Global test utilities
global.testUtils = {
    // Restore console methods for debugging
    enableConsole: () => {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    },
    
    // Disable console methods
    disableConsole: () => {
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    },
    
    // Wait for a specified time
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Generate random test data
    generateTestUser: (overrides = {}) => ({
        username: `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'trader',
        ...overrides
    }),
    
    // Generate test Hedera account ID
    generateHederaAccountId: () => `0.0.${Math.floor(Math.random() * 999999) + 100000}`,
    
    // Generate test transaction data
    generateTestTransaction: (overrides = {}) => ({
        amount: '1000000000000000000', // 1 ETH
        asset: 'ETH',
        userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
        hederaAccountId: global.testUtils.generateHederaAccountId(),
        ...overrides
    })
};

// Global test hooks
beforeEach(() => {
    // Clear any global state
    if (global.rateLimitStore) {
        global.rateLimitStore.clear();
    }
});

afterEach(() => {
    // Clean up after each test
    jest.clearAllTimers();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in tests, just log the error
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process in tests, just log the error
});