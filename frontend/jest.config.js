/**
 * @fileoverview Jest Configuration for Frontend Tests
 * @description Comprehensive Jest setup for React and Hedera integration testing
 * @author AION Team
 * @version 2.0.0
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.js'
  ],

  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },

  // File extensions to consider
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }],
    '^.+\\.css$': 'jest-transform-css',
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': 'jest-transform-file'
  },

  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(react-query|@testing-library)/)'
  ],

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/setupTests.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/components/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/hooks/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Global setup and teardown
  globalSetup: '<rootDir>/src/jest.globalSetup.js',
  globalTeardown: '<rootDir>/src/jest.globalTeardown.js',

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3001'
  },

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml'
    }]
  ],

  // Error on deprecated features
  errorOnDeprecated: true,

  // Notify mode
  notify: true,
  notifyMode: 'failure-change',

  // Bail on first test failure in CI
  bail: process.env.CI ? 1 : 0,

  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Max workers
  maxWorkers: process.env.CI ? 2 : '50%',

  // Snapshot serializers
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ]
};