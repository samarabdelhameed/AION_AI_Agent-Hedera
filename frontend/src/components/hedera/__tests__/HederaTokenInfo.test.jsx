/**
 * @fileoverview HederaTokenInfo Component Tests
 * @description Comprehensive tests for HederaTokenInfo component
 * @author AION Team
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';
import HederaTokenInfo from '../HederaTokenInfo';

// Mock the useHedera hook
jest.mock('../../../hooks/useHedera', () => ({
  useHedera: {
    useHederaToken: jest.fn()
  }
}));

describe('HederaTokenInfo Component', () => {
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

  const mockTokenInfo = {
    tokenId: '0.0.4696949',
    name: 'AION Token',
    symbol: 'AION',
    decimals: 18,
    totalSupply: '1000000000000000000000000',
    treasury: '0.0.4696950',
    adminKey: '0x...',
    supplyKey: '0x...',
    created: '2024-01-01T00:00:00Z'
  };

  const mockTokenMetrics = {
    totalHolders: 1247,
    totalTransfers: 8934,
    dailyVolume: '125000000000000000000',
    marketCap: 2500000,
    price: 0.0025,
    priceChange24h: 5.7,
    lastUpdate: new Date().toISOString()
  };

  describe('Rendering', () => {
    test('renders loading state initially', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: null,
        tokenMetrics: null,
        isLoading: true,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('renders token information correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText('AION Token')).toBeInTheDocument();
      expect(screen.getByText('AION')).toBeInTheDocument();
      expect(screen.getByText('0.0.4696949')).toBeInTheDocument();
    });

    test('renders token metrics correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText('1,247')).toBeInTheDocument(); // holders
      expect(screen.getByText('8,934')).toBeInTheDocument(); // transfers
      expect(screen.getByText(/\$2\.5M/)).toBeInTheDocument(); // market cap
    });

    test('renders error state when API fails', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: null,
        tokenMetrics: null,
        isLoading: false,
        error: new Error('Token fetch failed'),
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Token Operations', () => {
    test('displays mint button when operations are enabled', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn(),
        mintToken: jest.fn(),
        burnToken: jest.fn(),
        transferToken: jest.fn(),
        isMinting: false,
        isBurning: false,
        isTransferring: false
      });

      renderWithQueryClient(<HederaTokenInfo showOperations={true} />);
      
      expect(screen.getByRole('button', { name: /mint/i })).toBeInTheDocument();
    });

    test('calls mint function when mint button is clicked', async () => {
      const mockMint = jest.fn();
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn(),
        mintToken: mockMint,
        burnToken: jest.fn(),
        transferToken: jest.fn(),
        isMinting: false,
        isBurning: false,
        isTransferring: false
      });

      renderWithQueryClient(<HederaTokenInfo showOperations={true} />);
      
      const mintButton = screen.getByRole('button', { name: /mint/i });
      fireEvent.click(mintButton);
      
      // Should open mint dialog or form
      expect(screen.getByText(/mint tokens/i)).toBeInTheDocument();
    });

    test('shows loading state during token operations', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn(),
        mintToken: jest.fn(),
        burnToken: jest.fn(),
        transferToken: jest.fn(),
        isMinting: true,
        isBurning: false,
        isTransferring: false
      });

      renderWithQueryClient(<HederaTokenInfo showOperations={true} />);
      
      expect(screen.getByText(/minting/i)).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    test('formats large numbers correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: {
          ...mockTokenMetrics,
          totalHolders: 1500000, // 1.5M
          totalTransfers: 2500000 // 2.5M
        },
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText('1.5M')).toBeInTheDocument();
      expect(screen.getByText('2.5M')).toBeInTheDocument();
    });

    test('formats currency values correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: {
          ...mockTokenMetrics,
          price: 1.234567,
          marketCap: 1234567890
        },
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText(/\$1\.23/)).toBeInTheDocument(); // price
      expect(screen.getByText(/\$1\.23B/)).toBeInTheDocument(); // market cap
    });

    test('displays percentage changes with correct colors', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: {
          ...mockTokenMetrics,
          priceChange24h: 5.7 // positive change
        },
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      const changeElement = screen.getByText(/\+5\.7%/);
      expect(changeElement).toBeInTheDocument();
      expect(changeElement).toHaveClass('text-green-500');
    });
  });

  describe('Real-time Updates', () => {
    test('updates metrics when data changes', async () => {
      const { useHedera } = require('../../../hooks/useHedera');
      const mockHook = {
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      };

      useHedera.useHederaToken.mockReturnValue(mockHook);

      const { rerender } = renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText('1,247')).toBeInTheDocument();

      // Update the mock data
      mockHook.tokenMetrics = { ...mockTokenMetrics, totalHolders: 1300 };
      useHedera.useHederaToken.mockReturnValue(mockHook);

      rerender(
        <QueryClientProvider client={queryClient}>
          <HederaTokenInfo />
        </QueryClientProvider>
      );

      expect(screen.getByText('1,300')).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    test('renders HashScan explorer link', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      const explorerLink = screen.getByRole('link', { name: /view on explorer/i });
      expect(explorerLink).toHaveAttribute('href', expect.stringContaining('hashscan.io'));
      expect(explorerLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Accessibility', () => {
    test('has proper semantic structure', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByRole('region')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    test('has proper ARIA labels for interactive elements', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: mockTokenMetrics,
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo showOperations={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Error Handling', () => {
    test('handles partial data gracefully', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: mockTokenInfo,
        tokenMetrics: null, // Missing metrics
        isLoading: false,
        error: null,
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText('AION Token')).toBeInTheDocument();
      expect(screen.getByText(/no metrics available/i)).toBeInTheDocument();
    });

    test('handles network errors gracefully', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaToken.mockReturnValue({
        tokenInfo: null,
        tokenMetrics: null,
        isLoading: false,
        error: new Error('Network timeout'),
        refreshTokenInfo: jest.fn()
      });

      renderWithQueryClient(<HederaTokenInfo />);
      
      expect(screen.getByText(/failed to load token information/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});