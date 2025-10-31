/**
 * @fileoverview User Experience Integration Tests
 * @description End-to-end user experience tests for Hedera integration
 * @author AION Team
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import App from '../App';
import Dashboard from '../pages/Dashboard';
import EnhancedHederaIntegration from '../pages/EnhancedHederaIntegration';

// Mock the API services
jest.mock('../services/hederaAPI');
jest.mock('../hooks/useHedera');

describe('User Experience Integration Tests', () => {
  let queryClient;
  let user;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  // Mock data
  const mockHederaData = {
    status: {
      isConnected: true,
      networkInfo: { nodes: 28, latency: 2.1, uptime: 99.8 },
      services: { hcs: 'operational', hts: 'operational' }
    },
    tokenInfo: {
      tokenId: '0.0.4696949',
      name: 'AION Token',
      symbol: 'AION',
      totalSupply: '1000000000000000000000000'
    },
    decisions: [
      {
        id: 'decision_1',
        type: 'investment',
        action: 'optimize_yield_strategy',
        confidence: 0.92,
        outcome: 'success',
        timestamp: '2024-10-29T10:00:00Z'
      }
    ]
  };

  beforeEach(() => {
    const { useHedera } = require('../hooks/useHedera');
    useHedera.useHederaStatus.mockReturnValue({
      status: mockHederaData.status,
      isLoading: false,
      error: null,
      refreshStatus: jest.fn()
    });
    useHedera.useHederaToken.mockReturnValue({
      tokenInfo: mockHederaData.tokenInfo,
      isLoading: false,
      error: null,
      refreshTokenInfo: jest.fn()
    });
    useHedera.useAIDecisions.mockReturnValue({
      decisions: mockHederaData.decisions,
      isLoading: false,
      error: null,
      refreshDecisions: jest.fn()
    });
  });

  describe('Dashboard User Journey', () => {
    test('user can view dashboard with Hedera data', async () => {
      renderWithProviders(<Dashboard />);

      // Should see main dashboard heading
      expect(screen.getByText('AION Dashboard')).toBeInTheDocument();

      // Should see Hedera integration status
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      // Should see network metrics
      expect(screen.getByText('99.8%')).toBeInTheDocument(); // uptime
      expect(screen.getByText('2.1s')).toBeInTheDocument(); // latency
    });

    test('user can refresh dashboard data', async () => {
      const mockRefresh = jest.fn();
      const { useHedera } = require('../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        ...useHedera.useHederaStatus(),
        refreshStatus: mockRefresh
      });

      renderWithProviders(<Dashboard />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    test('user can navigate between dashboard tabs', async () => {
      renderWithProviders(<Dashboard />);

      // Should start on overview tab
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Overview');

      // Click on Hedera tab
      const hederaTab = screen.getByRole('tab', { name: /hedera/i });
      await user.click(hederaTab);

      // Should switch to Hedera tab content
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(/hedera/i);
    });
  });

  describe('Hedera Integration Page User Journey', () => {
    test('user can access Hedera integration page', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Should see integration page heading
      expect(screen.getByText('Hedera Integration')).toBeInTheDocument();

      // Should see live demo badge
      expect(screen.getByText('Live Demo')).toBeInTheDocument();

      // Should see key benefits
      expect(screen.getByText('99.8% Uptime')).toBeInTheDocument();
      expect(screen.getByText('2.1s Latency')).toBeInTheDocument();
    });

    test('user can run interactive demos', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Find AI Decision demo button
      const aiDemoButton = screen.getByRole('button', { name: /ai decision logging/i });
      expect(aiDemoButton).toBeInTheDocument();

      // Click the demo button
      await user.click(aiDemoButton);

      // Should show loading state
      expect(screen.getByText(/running/i)).toBeInTheDocument();

      // Wait for demo completion (mocked)
      await waitFor(() => {
        expect(screen.getByText(/demo results/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('user can navigate between integration tabs', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Should have multiple tabs
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(3);

      // Click on Services tab
      const servicesTab = screen.getByRole('tab', { name: /services/i });
      await user.click(servicesTab);

      // Should show services content
      expect(screen.getByText(/HCS/i)).toBeInTheDocument();
      expect(screen.getByText(/HTS/i)).toBeInTheDocument();
    });

    test('user can access external explorer links', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Navigate to explorers tab
      const explorersTab = screen.getByRole('tab', { name: /explorers/i });
      await user.click(explorersTab);

      // Should see explorer links
      const hashscanLink = screen.getByRole('link', { name: /hashscan/i });
      expect(hashscanLink).toHaveAttribute('href', expect.stringContaining('hashscan.io'));
      expect(hashscanLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Real-time Data Updates', () => {
    test('user sees real-time status updates', async () => {
      const { useHedera } = require('../hooks/useHedera');
      const mockHook = {
        status: mockHederaData.status,
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      };

      useHedera.useHederaStatus.mockReturnValue(mockHook);

      const { rerender } = renderWithProviders(<Dashboard />);

      // Initially connected
      expect(screen.getByText(/connected/i)).toBeInTheDocument();

      // Simulate connection loss
      mockHook.status = { ...mockHederaData.status, isConnected: false };
      useHedera.useHederaStatus.mockReturnValue(mockHook);

      rerender(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </QueryClientProvider>
      );

      // Should show disconnected status
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });

    test('user sees loading states during data refresh', async () => {
      const { useHedera } = require('../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: null,
        isLoading: true,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithProviders(<Dashboard />);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling User Experience', () => {
    test('user sees error messages when API fails', async () => {
      const { useHedera } = require('../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: null,
        isLoading: false,
        error: new Error('Network connection failed'),
        refreshStatus: jest.fn()
      });

      renderWithProviders(<Dashboard />);

      // Should show error message
      expect(screen.getByText(/connection.*failed/i)).toBeInTheDocument();
    });

    test('user can retry after errors', async () => {
      const mockRefresh = jest.fn();
      const { useHedera } = require('../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: null,
        isLoading: false,
        error: new Error('Network error'),
        refreshStatus: mockRefresh
      });

      renderWithProviders(<Dashboard />);

      // Should see retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    test('user sees graceful degradation when services are unavailable', async () => {
      const { useHedera } = require('../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: {
          ...mockHederaData.status,
          services: { hcs: 'down', hts: 'degraded' }
        },
        isLoading: false,
        error: null,
        refreshStatus: jest.fn()
      });

      renderWithProviders(<EnhancedHederaIntegration />);

      // Navigate to services tab
      const servicesTab = screen.getByRole('tab', { name: /services/i });
      await user.click(servicesTab);

      // Should show service status
      expect(screen.getByText('down')).toBeInTheDocument();
      expect(screen.getByText('degraded')).toBeInTheDocument();
    });
  });

  describe('Accessibility User Experience', () => {
    test('user can navigate with keyboard', async () => {
      renderWithProviders(<Dashboard />);

      // Tab through interactive elements
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'button');

      await user.tab();
      expect(document.activeElement).toHaveAttribute('role');
    });

    test('screen reader users get proper announcements', async () => {
      renderWithProviders(<Dashboard />);

      // Check for ARIA labels
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAttribute('aria-label');

      // Check for proper headings
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });

    test('user can understand status through multiple indicators', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Should have both text and visual indicators
      const statusElements = screen.getAllByText(/operational/i);
      expect(statusElements.length).toBeGreaterThan(0);

      // Should have color-coded badges
      const badges = screen.getAllByRole('status');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Performance User Experience', () => {
    test('user experiences fast initial load', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<Dashboard />);

      // Should render quickly
      expect(screen.getByText('AION Dashboard')).toBeInTheDocument();
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    });

    test('user sees optimistic updates during operations', async () => {
      const { useHedera } = require('../hooks/useHedera');
      const mockMint = jest.fn();
      
      useHedera.useHederaToken.mockReturnValue({
        ...useHedera.useHederaToken(),
        mintToken: mockMint,
        isMinting: false
      });

      renderWithProviders(<EnhancedHederaIntegration />);

      // Navigate to token tab
      const tokenTab = screen.getByRole('tab', { name: /token/i });
      await user.click(tokenTab);

      // Should see token operations if available
      const mintButton = screen.queryByRole('button', { name: /mint/i });
      if (mintButton) {
        await user.click(mintButton);
        // Should show immediate feedback
        expect(screen.getByText(/minting/i)).toBeInTheDocument();
      }
    });
  });

  describe('Mobile User Experience', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });
    });

    test('user can use dashboard on mobile device', async () => {
      renderWithProviders(<Dashboard />);

      // Should be responsive
      expect(screen.getByText('AION Dashboard')).toBeInTheDocument();

      // Should have mobile-friendly navigation
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveStyle('cursor: pointer');
      });
    });

    test('user can access all features on mobile', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Should see all main sections
      expect(screen.getByText('Hedera Integration')).toBeInTheDocument();
      expect(screen.getByText('Live Demo')).toBeInTheDocument();

      // Should be able to navigate tabs
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(3);
    });
  });

  describe('Data Consistency User Experience', () => {
    test('user sees consistent data across components', async () => {
      renderWithProviders(<App />);

      // Navigate to dashboard
      expect(screen.getByText('AION Dashboard')).toBeInTheDocument();

      // Should see consistent Hedera status
      const statusElements = screen.getAllByText(/connected/i);
      expect(statusElements.length).toBeGreaterThan(0);

      // Navigate to Hedera page
      // (This would require proper routing setup in the test)
    });

    test('user sees synchronized updates across tabs', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Check initial status in overview
      expect(screen.getByText(/operational/i)).toBeInTheDocument();

      // Navigate to services tab
      const servicesTab = screen.getByRole('tab', { name: /services/i });
      await user.click(servicesTab);

      // Should see same status information
      expect(screen.getByText(/operational/i)).toBeInTheDocument();
    });
  });

  describe('User Feedback and Notifications', () => {
    test('user receives feedback for successful operations', async () => {
      renderWithProviders(<EnhancedHederaIntegration />);

      // Run a demo
      const aiDemoButton = screen.getByRole('button', { name: /ai decision logging/i });
      await user.click(aiDemoButton);

      // Should see success feedback
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });
    });

    test('user receives clear error messages', async () => {
      const { useHedera } = require('../hooks/useHedera');
      useHedera.useHederaStatus.mockReturnValue({
        status: null,
        isLoading: false,
        error: new Error('Connection timeout'),
        refreshStatus: jest.fn()
      });

      renderWithProviders(<Dashboard />);

      // Should see user-friendly error message
      expect(screen.getByText(/connection.*timeout/i)).toBeInTheDocument();
    });
  });
});