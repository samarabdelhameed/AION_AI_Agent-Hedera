/**
 * @fileoverview Jest Configuration for AION MCP Agent Tests
 * @description Jest configuration for unit and integration tests
 * @author AION Team
 * @version 2.0.0
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],
    
    // Coverage collection
    collectCoverage: true,
    collectCoverageFrom: [
        'services/**/*.js',
        'server/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/coverage/**'
    ],
    
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    
    // Coverage directory
    coverageDirectory: 'coverage',
    
    // Coverage reporters
    coverageReporters: [
        'text',
        'text-summary',
        'lcov',
        'html'
    ],
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Test timeout
    testTimeout: 30000,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Verbose output
    verbose: true,
    
    // Transform files
    transform: {},
    
    // Module file extensions
    moduleFileExtensions: ['js', 'json'],
    
    // Test path ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/'
    ],
    
    // Global setup and teardown
    globalSetup: '<rootDir>/tests/globalSetup.js',
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    
    // Error handling
    errorOnDeprecated: true,
    
    // Reporters
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'coverage',
            outputName: 'junit.xml'
        }]
    ]
};