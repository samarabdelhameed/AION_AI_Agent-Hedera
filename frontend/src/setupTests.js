/**
 * @fileoverview Test Setup Configuration
 * @description Global test setup for React Testing Library and Jest
 * @author AION Team
 * @version 2.0.0
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn()
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch if not already mocked
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock console methods in test environment
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Start MSW server
  server.listen({
    onUnhandledRequest: 'error'
  });

  // Suppress console errors/warnings in tests unless explicitly needed
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || 
       args[0].includes('React does not recognize'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterEach(() => {
  // Reset MSW handlers
  server.resetHandlers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => {
  // Stop MSW server
  server.close();
  
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock Hedera API responses
  mockHederaResponse: (data, success = true) => ({
    success,
    data: success ? data : undefined,
    error: success ? undefined : data
  }),
  
  // Create mock user event
  createMockEvent: (type, properties = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    ...properties
  }),
  
  // Mock React Query client
  createMockQueryClient: () => {
    const { QueryClient } = require('react-query');
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  }
};

// Environment variables for tests
process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';
process.env.REACT_APP_HCS_TOPIC_ID = '0.0.4696950';
process.env.REACT_APP_TOKEN_ID = '0.0.4696949';
process.env.NODE_ENV = 'test';

// Suppress specific warnings in test environment
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  
  // Suppress React Query devtools warnings
  if (typeof message === 'string' && message.includes('React Query DevTools')) {
    return;
  }
  
  // Suppress act() warnings for async operations we can't control
  if (typeof message === 'string' && message.includes('act(')) {
    return;
  }
  
  originalConsoleWarn.apply(console, args);
};

// Add custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithObjectContaining(received, expected) {
    const pass = received.mock.calls.some(call =>
      call.some(arg => 
        typeof arg === 'object' && 
        Object.keys(expected).every(key => arg[key] === expected[key])
      )
    );
    
    return {
      pass,
      message: () => pass
        ? `expected function not to have been called with object containing ${JSON.stringify(expected)}`
        : `expected function to have been called with object containing ${JSON.stringify(expected)}`
    };
  }
});

// Performance monitoring in tests
if (process.env.MEASURE_PERFORMANCE === 'true') {
  const { performance } = require('perf_hooks');
  
  global.measurePerformance = (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  };
}

// Debug utilities for tests
global.debug = {
  logRenderTree: (container) => {
    console.log(container.innerHTML);
  },
  
  logQueries: (screen) => {
    console.log('Available queries:', Object.keys(screen));
  },
  
  waitAndLog: async (fn, timeout = 1000) => {
    try {
      const result = await fn();
      console.log('Success:', result);
      return result;
    } catch (error) {
      console.log('Error after timeout:', error.message);
      throw error;
    }
  }
};