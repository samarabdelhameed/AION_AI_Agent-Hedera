/**
 * @fileoverview HederaAPI Service Tests
 * @description Comprehensive tests for Hedera API service
 * @author AION Team
 * @version 2.0.0
 */

import { hederaAPI } from '../hederaAPI';

// Mock fetch globally
global.fetch = jest.fn();

describe('HederaAPI Service', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Reset any environment variables
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Network Status API', () => {
    test('getNetworkStatus returns status data successfully', async () => {
      const mockResponse = {
        isConnected: true,
        networkInfo: {
          nodes: 28,
          latency: 2.1,
          uptime: 99.8,
          tps: 10000
        },
        services: {
          hcs: 'operational',
          hts: 'operational',
          hfs: 'operational',
          mirror: 'operational'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await hederaAPI.getNetworkStatus();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/status',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    test('getNetworkStatus handles API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Internal server error' })
      });

      await expect(hederaAPI.getNetworkStatus()).rejects.toThrow('Internal server error');
    });

    test('getNetworkStatus handles network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network connection failed'));

      await expect(hederaAPI.getNetworkStatus()).rejects.toThrow('Network connection failed');
    });

    test('ping checks connectivity', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, timestamp: Date.now() })
      });

      const result = await hederaAPI.ping();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/ping',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual({ success: true, timestamp: expect.any(Number) });
    });
  });

  describe('Token API', () => {
    test('getTokenInfo returns token data successfully', async () => {
      const mockTokenInfo = {
        tokenId: '0.0.4696949',
        name: 'AION Token',
        symbol: 'AION',
        decimals: 18,
        totalSupply: '1000000000000000000000000'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTokenInfo })
      });

      const result = await hederaAPI.getTokenInfo();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/token/info',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual(mockTokenInfo);
    });

    test('getTokenMetrics returns metrics data', async () => {
      const mockMetrics = {
        totalHolders: 1247,
        totalTransfers: 8934,
        dailyVolume: '125000000000000000000',
        marketCap: 2500000
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockMetrics })
      });

      const result = await hederaAPI.getTokenMetrics();

      expect(result).toEqual(mockMetrics);
    });

    test('mintToken executes mint operation', async () => {
      const mockResponse = {
        success: true,
        transactionId: '0.0.4696947@1698580800.123456789',
        amount: '1000000000000000000',
        recipient: '0.0.4696950'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await hederaAPI.mintToken('1000000000000000000', '0.0.4696950');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/token/mint',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            amount: '1000000000000000000',
            recipient: '0.0.4696950'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    test('burnToken executes burn operation', async () => {
      const mockResponse = {
        success: true,
        transactionId: '0.0.4696947@1698580800.123456789',
        amount: '500000000000000000'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await hederaAPI.burnToken('500000000000000000');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/token/burn',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount: '500000000000000000' })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    test('transferToken executes transfer operation', async () => {
      const mockResponse = {
        success: true,
        transactionId: '0.0.4696947@1698580800.123456789',
        amount: '250000000000000000',
        recipient: '0.0.4696951'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await hederaAPI.transferToken('250000000000000000', '0.0.4696951');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('AI Decisions API', () => {
    test('getAIDecisions returns decisions list', async () => {
      const mockDecisions = [
        {
          id: 'decision_1',
          type: 'investment',
          action: 'optimize_yield_strategy',
          confidence: 0.92,
          outcome: 'success',
          timestamp: '2024-10-29T10:00:00Z'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDecisions })
      });

      const result = await hederaAPI.getAIDecisions(10);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/decisions?limit=10',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual(mockDecisions);
    });

    test('getAIAnalytics returns analytics data', async () => {
      const mockAnalytics = {
        totalDecisions: 892,
        successRate: 94.2,
        avgConfidence: 87.3,
        pendingDecisions: 23
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAnalytics })
      });

      const result = await hederaAPI.getAIAnalytics();

      expect(result).toEqual(mockAnalytics);
    });

    test('logAIDecision submits new decision', async () => {
      const decisionData = {
        type: 'investment',
        action: 'optimize_yield_strategy',
        confidence: 0.92,
        reasoning: 'Market analysis indicates optimal conditions'
      };

      const mockResponse = {
        success: true,
        decisionId: 'decision_123',
        hcsTransactionId: '0.0.4696947@1698580800.123456789'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await hederaAPI.logAIDecision(decisionData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/decisions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(decisionData)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Transactions API', () => {
    test('getTransactions returns transaction list', async () => {
      const mockTransactions = [
        {
          id: 'tx_1',
          type: 'token_transfer',
          amount: '1000000000000000000',
          timestamp: '2024-10-29T10:00:00Z',
          status: 'success'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTransactions })
      });

      const result = await hederaAPI.getTransactions(20);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/transactions?limit=20',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual(mockTransactions);
    });

    test('getNetworkStats returns network statistics', async () => {
      const mockStats = {
        totalTransactions: 1247892,
        activeNodes: 28,
        averageLatency: 2.1,
        uptime: 99.8
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats })
      });

      const result = await hederaAPI.getNetworkStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('Vault Operations API', () => {
    test('getVaultInfo returns vault data', async () => {
      const mockVaultInfo = {
        totalValueLocked: '2847291000000000000000',
        apy: 12.5,
        utilization: 78.3,
        performance: {
          daily: 0.034,
          weekly: 0.24,
          monthly: 1.05
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockVaultInfo })
      });

      const result = await hederaAPI.getVaultInfo();

      expect(result).toEqual(mockVaultInfo);
    });

    test('deposit executes deposit operation', async () => {
      const depositData = {
        amount: '1000000000000000000',
        asset: 'USDC',
        hederaIntegration: {
          enabled: true,
          logToHCS: true,
          mintTokens: true
        }
      };

      const mockResponse = {
        success: true,
        transactionId: '0.0.4696947@1698580800.123456789',
        vaultShares: '950000000000000000'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await hederaAPI.deposit(depositData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/vault/deposit',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(depositData)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    test('withdraw executes withdrawal operation', async () => {
      const withdrawData = {
        amount: '500000000000000000',
        asset: 'USDC',
        hederaIntegration: {
          enabled: true,
          logToHCS: true,
          burnTokens: true
        }
      };

      const mockResponse = {
        success: true,
        transactionId: '0.0.4696947@1698580800.123456789',
        assetAmount: '525000000000000000'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse })
      });

      const result = await hederaAPI.withdraw(withdrawData);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Diagnostics API', () => {
    test('runDiagnostics executes diagnostic tests', async () => {
      const mockDiagnostics = {
        networkConnectivity: 'pass',
        hcsStatus: 'pass',
        htsStatus: 'pass',
        mirrorNodeStatus: 'pass',
        latencyTest: {
          status: 'pass',
          averageLatency: 2.1,
          maxLatency: 3.5
        },
        timestamp: '2024-10-29T10:00:00Z'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDiagnostics })
      });

      const result = await hederaAPI.runDiagnostics();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/hedera/diagnostics',
        expect.objectContaining({ method: 'POST' })
      );

      expect(result).toEqual(mockDiagnostics);
    });
  });

  describe('Error Handling', () => {
    test('handles HTTP error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Not found' })
      });

      await expect(hederaAPI.getNetworkStatus()).rejects.toThrow('Not found');
    });

    test('handles malformed JSON responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(hederaAPI.getNetworkStatus()).rejects.toThrow('Invalid JSON');
    });

    test('handles network timeouts', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(hederaAPI.getNetworkStatus()).rejects.toThrow('Request timeout');
    });
  });

  describe('Authentication', () => {
    test('includes authentication headers when token is available', async () => {
      // Mock localStorage
      const mockToken = 'mock-jwt-token';
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => mockToken)
        },
        writable: true
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      await hederaAPI.getNetworkStatus();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );
    });

    test('works without authentication token', async () => {
      // Mock localStorage with no token
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => null)
        },
        writable: true
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      await hederaAPI.getNetworkStatus();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    test('handles rate limit responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ 
          success: false, 
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      });

      await expect(hederaAPI.getNetworkStatus()).rejects.toThrow('Rate limit exceeded');
    });
  });
});