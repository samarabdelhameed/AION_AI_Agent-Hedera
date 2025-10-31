/**
 * @fileoverview useHedera Hooks Tests
 * @description Comprehensive tests for Hedera integration hooks
 * @author AION Team
 * @version 2.0.0
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useHederaStatus, useHederaToken, useAIDecisions } from '../useHedera';
import { hederaAPI } from '../../services/hederaAPI';

// Mock the hederaAPI
jest.mock('../../services/hederaAPI');

describe('useHedera Hooks', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useHederaStatus', () => {
    const mockStatusData = {
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

    test('fetches status data successfully', async () => {
      hederaAPI.getNetworkStatus.mockResolvedValue(mockStatusData);

      const { result } = renderHook(() => useHederaStatus(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toEqual(mockStatusData);
      expect(result.current.error).toBeNull();
    });

    test('handles API errors gracefully', async () => {
      const errorMessage = 'Network connection failed';
      hederaAPI.getNetworkStatus.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useHederaStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.error).toEqual(expect.objectContaining({
        message: errorMessage
      }));
    });

    test('refreshes status when refreshStatus is called', async () => {
      hederaAPI.getNetworkStatus.mockResolvedValue(mockStatusData);

      const { result } = renderHook(() => useHederaStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the mock to track new calls
      hederaAPI.getNetworkStatus.mockClear();
      hederaAPI.getNetworkStatus.mockResolvedValue({
        ...mockStatusData,
        networkInfo: { ...mockStatusData.networkInfo, latency: 1.8 }
      });

      await act(async () => {
        result.current.refreshStatus();
      });

      expect(hederaAPI.getNetworkStatus).toHaveBeenCalledTimes(1);
    });

    test('updates connection status in real-time', async () => {
      hederaAPI.getNetworkStatus.mockResolvedValue(mockStatusData);
      hederaAPI.ping.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useHederaStatus(1000), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate connection loss
      hederaAPI.ping.mockResolvedValue({ success: false });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      }, { timeout: 2000 });
    });
  });

  describe('useHederaToken', () => {
    const mockTokenInfo = {
      tokenId: '0.0.4696949',
      name: 'AION Token',
      symbol: 'AION',
      decimals: 18,
      totalSupply: '1000000000000000000000000'
    };

    const mockTokenMetrics = {
      totalHolders: 1247,
      totalTransfers: 8934,
      dailyVolume: '125000000000000000000',
      marketCap: 2500000
    };

    test('fetches token data successfully', async () => {
      hederaAPI.getTokenInfo.mockResolvedValue(mockTokenInfo);
      hederaAPI.getTokenMetrics.mockResolvedValue(mockTokenMetrics);

      const { result } = renderHook(() => useHederaToken(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tokenInfo).toEqual(mockTokenInfo);
      expect(result.current.tokenMetrics).toEqual(mockTokenMetrics);
      expect(result.current.error).toBeNull();
    });

    test('handles token operation mutations', async () => {
      hederaAPI.getTokenInfo.mockResolvedValue(mockTokenInfo);
      hederaAPI.getTokenMetrics.mockResolvedValue(mockTokenMetrics);
      hederaAPI.mintToken.mockResolvedValue({
        success: true,
        transactionId: '0.0.4696947@1698580800.123456789'
      });

      const { result } = renderHook(() => useHederaToken(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.mintToken).toBe('function');
      expect(result.current.isMinting).toBe(false);

      await act(async () => {
        result.current.mintToken({
          amount: '1000000000000000000',
          recipient: '0.0.4696950'
        });
      });

      expect(hederaAPI.mintToken).toHaveBeenCalledWith(
        '1000000000000000000',
        '0.0.4696950'
      );
    });

    test('invalidates queries after successful mutations', async () => {
      hederaAPI.getTokenInfo.mockResolvedValue(mockTokenInfo);
      hederaAPI.getTokenMetrics.mockResolvedValue(mockTokenMetrics);
      hederaAPI.mintToken.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useHederaToken(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to track refetch calls
      hederaAPI.getTokenInfo.mockClear();
      hederaAPI.getTokenMetrics.mockClear();

      await act(async () => {
        result.current.mintToken({
          amount: '1000000000000000000',
          recipient: '0.0.4696950'
        });
      });

      // Should refetch data after successful mutation
      await waitFor(() => {
        expect(hederaAPI.getTokenInfo).toHaveBeenCalled();
        expect(hederaAPI.getTokenMetrics).toHaveBeenCalled();
      });
    });
  });

  describe('useAIDecisions', () => {
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

    const mockAnalytics = {
      totalDecisions: 892,
      successRate: 94.2,
      avgConfidence: 87.3,
      pendingDecisions: 23
    };

    test('fetches AI decisions successfully', async () => {
      hederaAPI.getAIDecisions.mockResolvedValue(mockDecisions);
      hederaAPI.getAIAnalytics.mockResolvedValue(mockAnalytics);

      const { result } = renderHook(() => useAIDecisions(10), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.decisions).toEqual(mockDecisions);
      expect(result.current.analytics).toEqual(mockAnalytics);
      expect(result.current.error).toBeNull();
    });

    test('logs new AI decisions', async () => {
      hederaAPI.getAIDecisions.mockResolvedValue(mockDecisions);
      hederaAPI.getAIAnalytics.mockResolvedValue(mockAnalytics);
      hederaAPI.logAIDecision.mockResolvedValue({
        success: true,
        decisionId: 'decision_2',
        hcsTransactionId: '0.0.4696947@1698580800.123456789'
      });

      const { result } = renderHook(() => useAIDecisions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newDecision = {
        type: 'risk_management',
        action: 'reduce_exposure',
        confidence: 0.87,
        reasoning: 'High volatility detected'
      };

      await act(async () => {
        result.current.logDecision(newDecision);
      });

      expect(hederaAPI.logAIDecision).toHaveBeenCalledWith(newDecision);
    });

    test('handles different limit parameters', async () => {
      hederaAPI.getAIDecisions.mockResolvedValue(mockDecisions);
      hederaAPI.getAIAnalytics.mockResolvedValue(mockAnalytics);

      const { result } = renderHook(() => useAIDecisions(5), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(hederaAPI.getAIDecisions).toHaveBeenCalledWith(5);
    });

    test('refreshes decisions and analytics together', async () => {
      hederaAPI.getAIDecisions.mockResolvedValue(mockDecisions);
      hederaAPI.getAIAnalytics.mockResolvedValue(mockAnalytics);

      const { result } = renderHook(() => useAIDecisions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks
      hederaAPI.getAIDecisions.mockClear();
      hederaAPI.getAIAnalytics.mockClear();

      await act(async () => {
        result.current.refreshDecisions();
      });

      expect(hederaAPI.getAIDecisions).toHaveBeenCalled();
      expect(hederaAPI.getAIAnalytics).toHaveBeenCalled();
    });
  });

  describe('Hook Integration', () => {
    test('multiple hooks can be used together', async () => {
      const mockStatusData = { isConnected: true };
      const mockTokenInfo = { tokenId: '0.0.4696949' };
      const mockDecisions = [{ id: 'decision_1' }];

      hederaAPI.getNetworkStatus.mockResolvedValue(mockStatusData);
      hederaAPI.getTokenInfo.mockResolvedValue(mockTokenInfo);
      hederaAPI.getTokenMetrics.mockResolvedValue({});
      hederaAPI.getAIDecisions.mockResolvedValue(mockDecisions);
      hederaAPI.getAIAnalytics.mockResolvedValue({});

      const { result } = renderHook(() => ({
        status: useHederaStatus(),
        token: useHederaToken(),
        decisions: useAIDecisions()
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.status.isLoading).toBe(false);
        expect(result.current.token.isLoading).toBe(false);
        expect(result.current.decisions.isLoading).toBe(false);
      });

      expect(result.current.status.status).toEqual(mockStatusData);
      expect(result.current.token.tokenInfo).toEqual(mockTokenInfo);
      expect(result.current.decisions.decisions).toEqual(mockDecisions);
    });

    test('hooks share query client cache', async () => {
      const mockStatusData = { isConnected: true };
      hederaAPI.getNetworkStatus.mockResolvedValue(mockStatusData);

      // First hook call
      const { result: result1 } = renderHook(() => useHederaStatus(), { wrapper });
      
      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      // Second hook call should use cached data
      const { result: result2 } = renderHook(() => useHederaStatus(), { wrapper });

      // Should immediately have data from cache
      expect(result2.current.status).toEqual(mockStatusData);
      expect(result2.current.isLoading).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('retries failed requests automatically', async () => {
      hederaAPI.getNetworkStatus
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ isConnected: true });

      const { result } = renderHook(() => useHederaStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should eventually succeed after retry
      expect(result.current.status).toEqual({ isConnected: true });
    });

    test('handles intermittent connection issues', async () => {
      hederaAPI.getNetworkStatus.mockResolvedValue({ isConnected: true });
      hederaAPI.ping
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValue({ success: true });

      const { result } = renderHook(() => useHederaStatus(100), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Should handle connection loss gracefully
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      }, { timeout: 200 });

      // Should recover connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      }, { timeout: 200 });
    });
  });
});