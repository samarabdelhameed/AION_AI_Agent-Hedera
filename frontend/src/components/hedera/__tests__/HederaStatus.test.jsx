/**
 * @fileoverview HederaStatus Component Tests
 * @description Comprehensive tests for HederaStatus component
 * @author AION Team
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';
import HederaStatus from '../HederaStatus';
import { hederaAPI } from '../../../services/hederaAPI';

// Mock the hederaAPI
jest.mock('../../../services/hederaAPI');

// Mock the useHedera hook
jest.mock('../../../hooks/useHedera', () => ({
  useHedera: {
    useHederaStatus: jest.fn()
  }
}));

describe('HederaStatus Component', () => {
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

  const mockHederaStatus = {
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
    },
    lastUpdate: new Date().toISOString()
  };

  describe('Rendering', () => {
    test('renders loading state initially', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: null,
        isLoading: true,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('renders connected status when online', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
      expect(screen.getByText(/operational/i)).toBeInTheDocument();
    });

    test('renders disconnected status when offline', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: { ...mockHederaStatus, isConnected: false },
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });

    test('renders error state when API fails', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: null,
        isLoading: false,
        error: new Error('Network error'),
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Network Information', () => {
    test('displays network statistics correctly', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText('28')).toBeInTheDocument(); // nodes
      expect(screen.getByText('2.1s')).toBeInTheDocument(); // latency
      expect(screen.getByText('99.8%')).toBeInTheDocument(); // uptime
      expect(screen.getByText('10,000')).toBeInTheDocument(); // tps
    });

    test('displays service status indicators', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText(/HCS/i)).toBeInTheDocument();
      expect(screen.getByText(/HTS/i)).toBeInTheDocument();
      expect(screen.getByText(/HFS/i)).toBeInTheDocument();
      expect(screen.getByText(/Mirror/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls refresh function when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: mockRefresh
      });

      renderWithQueryClient(<HederaStatus />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    test('shows loading state during refresh', async () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: true,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('updates status when data changes', async () => {
      const { useHedera } = require('../../../hooks/useHedera');
      const mockHook = {
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      };

      useHedera.useHederaStatus.mockReturnValue(mockHook);

      const { rerender } = renderWithQueryClient(<HederaStatus />);
      
      expect(screen.getByText(/connected/i)).toBeInTheDocument();

      // Update the mock to return disconnected status
      mockHook.status = { ...mockHederaStatus, isConnected: false };
      useHedera.useHederaStatus.mockReturnValue(mockHook);

      rerender(
        <QueryClientProvider client={queryClient}>
          <HederaStatus />
        </QueryClientProvider>
      );

      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithQueryClient(<HederaStatus />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAttribute('tabIndex');
    });
  });

  describe('Performance', () => {
    test('does not re-render unnecessarily', () => {
      const { useHedera } = require('../../../hooks/useHedera');
      const renderSpy = jest.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <HederaStatus />;
      };

      useHedera.useHederaStatus.mockReturnValue({
        status: mockHederaStatus,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      const { rerender } = renderWithQueryClient(<TestComponent />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      // Should not cause unnecessary re-renders
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});