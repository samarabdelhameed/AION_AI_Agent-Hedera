/**
 * @fileoverview AIDecisionHistory Component Tests
 * @description Comprehensive tests for AIDecisionHistory component
 * @author AION Team
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';
import AIDecisionHistory from '../AIDecisionHistory';

// Mock the useHedera hook
jest.mock('../../../hooks/useHedera', () => ({
  useHedera: {
    useAIDecisions: jest.fn()
  }
}));

describe('AIDecisionHistory Component', () => {
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

  const renderWithQueryClient = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  const mockDecisions = [
    {
      id: 'decision_1',
      type: 'investment',
      action: 'optimize_yield_strategy',
      confidence: 0.92,
      outcome: 'success',
      reasoning: 'Market analysis indicates optimal conditions for yield farming.',
      timestamp: '2024-10-29T10:00:00Z',
      hcsTransactionId: '0.0.4696947@1698580800.123456789',
      context: {
        market_conditions: 'bullish',
        risk_level: 'medium',
        expected_apy: 12.5
      }
    },
    {
      id: 'decision_2',
      type: 'risk_management',
      action: 'reduce_exposure',
      confidence: 0.87,
      outcome: 'pending',
      reasoning: 'Detected increased volatility in target assets.',
      timestamp: '2024-10-29T09:30:00Z',
      hcsTransactionId: '0.0.4696947@1698578200.987654321',
      context: {
        volatility_score: 7.8,
        risk_level: 'high'
      }
    }
  ];

  const mockAnalytics = {
    totalDecisions: 892,
    successRate: 94.2,
    avgConfidence: 87.3,
    pendingDecisions: 23,
    decisionsByType: {
      investment: 342,
      risk_management: 267,
      portfolio_rebalancing: 189,
      yield_optimization: 94
    }
  };

  describe('Rendering', () => {
    test('renders loading state initially', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: [],
        analytics: null,
        isLoading: true,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('renders decision list correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      expect(screen.getByText('optimize_yield_strategy')).toBeInTheDocument();
      expect(screen.getByText('reduce_exposure')).toBeInTheDocument();
    });

    test('renders analytics when showAnalytics is true', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory showAnalytics={true} />);
      
      expect(screen.getByText('94.2%')).toBeInTheDocument(); // success rate
      expect(screen.getByText('87.3%')).toBeInTheDocument(); // avg confidence
      expect(screen.getByText('892')).toBeInTheDocument(); // total decisions
    });

    test('renders empty state when no decisions', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: [],
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      expect(screen.getByText(/no decisions available/i)).toBeInTheDocument();
    });
  });

  describe('Decision Display', () => {
    test('displays decision details correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      // Check first decision
      expect(screen.getByText('92%')).toBeInTheDocument(); // confidence
      expect(screen.getByText('investment')).toBeInTheDocument(); // type
      expect(screen.getByText(/Market analysis indicates/)).toBeInTheDocument(); // reasoning
    });

    test('displays outcome badges with correct colors', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      const successBadge = screen.getByText('success');
      const pendingBadge = screen.getByText('pending');
      
      expect(successBadge).toHaveClass('bg-green-500');
      expect(pendingBadge).toHaveClass('bg-yellow-500');
    });

    test('displays HCS transaction IDs as links', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      const hcsLinks = screen.getAllByText(/0\.0\.4696947@/);
      expect(hcsLinks).toHaveLength(2);
      
      hcsLinks.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining('hashscan.io'));
        expect(link.closest('a')).toHaveAttribute('target', '_blank');
      });
    });

    test('formats timestamps correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      // Should display relative time (e.g., "2 hours ago")
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    test('filters decisions by type', async () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      // Click on investment filter
      const investmentFilter = screen.getByRole('button', { name: /investment/i });
      fireEvent.click(investmentFilter);
      
      // Should only show investment decisions
      expect(screen.getByText('optimize_yield_strategy')).toBeInTheDocument();
      expect(screen.queryByText('reduce_exposure')).not.toBeInTheDocument();
    });

    test('sorts decisions by timestamp', async () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      const sortButton = screen.getByRole('button', { name: /sort/i });
      fireEvent.click(sortButton);
      
      // Should sort by newest first (default)
      const decisionElements = screen.getAllByTestId('decision-item');
      expect(decisionElements[0]).toHaveTextContent('optimize_yield_strategy');
    });
  });

  describe('User Interactions', () => {
    test('expands decision details when clicked', async () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      const firstDecision = screen.getByTestId('decision-item-decision_1');
      fireEvent.click(firstDecision);
      
      // Should show expanded details
      expect(screen.getByText(/market_conditions/i)).toBeInTheDocument();
      expect(screen.getByText(/expected_apy/i)).toBeInTheDocument();
    });

    test('calls refresh function when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: mockRefresh
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-time Updates', () => {
    test('updates when new decisions arrive', async () => {
      const { useHedera } = require('../../../hooks/useHedera');
      const mockHook = {
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      };

      useHedera.useAIDecisions.mockReturnValue(mockHook);

      const { rerender } = renderWithQueryClient(<AIDecisionHistory />);
      
      expect(screen.getAllByTestId('decision-item')).toHaveLength(2);

      // Add new decision
      const newDecision = {
        id: 'decision_3',
        type: 'yield_optimization',
        action: 'compound_rewards',
        confidence: 0.95,
        outcome: 'success',
        reasoning: 'Optimal time for reward compounding detected.',
        timestamp: '2024-10-29T11:00:00Z',
        hcsTransactionId: '0.0.4696947@1698584400.555666777'
      };

      mockHook.decisions = [newDecision, ...mockDecisions];
      useHedera.useAIDecisions.mockReturnValue(mockHook);

      rerender(
        <QueryClientProvider client={queryClient}>
          <AIDecisionHistory />
        </QueryClientProvider>
      );

      expect(screen.getAllByTestId('decision-item')).toHaveLength(3);
      expect(screen.getByText('compound_rewards')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('displays error message when API fails', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: [],
        analytics: null,
        isLoading: false,
        error: new Error('Failed to fetch decisions'),
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      expect(screen.getByText(/failed to load decisions/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    test('handles malformed decision data gracefully', () => {
      const malformedDecisions = [
        {
          id: 'decision_bad',
          // Missing required fields
          confidence: 'invalid',
          timestamp: 'invalid-date'
        }
      ];

      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: malformedDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      // Should not crash and show some fallback content
      expect(screen.getByText(/unknown/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    test('supports keyboard navigation', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: mockDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory />);
      
      const decisionItems = screen.getAllByTestId('decision-item');
      decisionItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Performance', () => {
    test('limits number of displayed decisions', () => {
      const manyDecisions = Array.from({ length: 100 }, (_, i) => ({
        ...mockDecisions[0],
        id: `decision_${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString()
      }));

      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useAIDecisions.mockReturnValue({
        decisions: manyDecisions,
        analytics: mockAnalytics,
        isLoading: false,
        error: null,
        refreshDecisions: jest.fn()
      });

      renderWithQueryClient(<AIDecisionHistory maxDecisions={10} />);
      
      // Should only display 10 decisions
      expect(screen.getAllByTestId('decision-item')).toHaveLength(10);
    });
  });
});