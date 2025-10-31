/**
 * @fileoverview Mock Service Worker Server
 * @description MSW server setup for API mocking in tests
 * @author AION Team
 * @version 2.0.0
 */

import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock data
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
  totalValueLocked: '2847291000000000000000',
  lastUpdate: new Date().toISOString()
};

const mockAIDecisions = [
  {
    id: 'decision_1',
    type: 'investment',
    action: 'optimize_yield_strategy',
    confidence: 0.92,
    outcome: 'success',
    reasoning: 'Market analysis indicates optimal conditions for yield farming strategy adjustment.',
    timestamp: '2024-10-29T10:00:00Z',
    hcsTransactionId: '0.0.4696947@1698580800.123456789',
    context: {
      market_conditions: 'bullish',
      risk_level: 'medium',
      expected_apy: 12.5,
      portfolio_balance: 2500
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

const mockAIAnalytics = {
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

const mockTransactions = [
  {
    id: 'tx_1',
    type: 'token_transfer',
    amount: '1000000000000000000',
    from: '0.0.4696950',
    to: '0.0.4696951',
    timestamp: '2024-10-29T10:00:00Z',
    status: 'success',
    transactionId: '0.0.4696947@1698580800.123456789'
  },
  {
    id: 'tx_2',
    type: 'token_mint',
    amount: '500000000000000000',
    recipient: '0.0.4696950',
    timestamp: '2024-10-29T09:45:00Z',
    status: 'success',
    transactionId: '0.0.4696947@1698579900.987654321'
  }
];

const mockNetworkStats = {
  totalTransactions: 1247892,
  activeNodes: 28,
  averageLatency: 2.1,
  uptime: 99.8,
  dailyVolume: '125000000000000000000',
  networkLoad: 45.2
};

const mockVaultInfo = {
  totalValueLocked: '2847291000000000000000',
  apy: 12.5,
  utilization: 78.3,
  totalDeposits: '5694582000000000000000',
  totalWithdrawals: '2847291000000000000000',
  netFlow: '2847291000000000000000',
  performance: {
    daily: 0.034,
    weekly: 0.24,
    monthly: 1.05,
    yearly: 12.5
  },
  fees: 0.25,
  lastUpdate: new Date().toISOString()
};

// Request handlers
const handlers = [
  // Hedera Status API
  rest.get('http://localhost:3000/api/hedera/status', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockHederaStatus
      })
    );
  }),

  // Hedera Ping API
  rest.get('http://localhost:3000/api/hedera/ping', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        timestamp: Date.now()
      })
    );
  }),

  // Token Info API
  rest.get('http://localhost:3000/api/hedera/token/info', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTokenInfo
      })
    );
  }),

  // Token Metrics API
  rest.get('http://localhost:3000/api/hedera/token/metrics', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTokenMetrics
      })
    );
  }),

  // Token Operations
  rest.post('http://localhost:3000/api/hedera/token/mint', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          transactionId: '0.0.4696947@' + Date.now() + '.123456789',
          amount: req.body.amount,
          recipient: req.body.recipient
        }
      })
    );
  }),

  rest.post('http://localhost:3000/api/hedera/token/burn', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          transactionId: '0.0.4696947@' + Date.now() + '.123456789',
          amount: req.body.amount
        }
      })
    );
  }),

  rest.post('http://localhost:3000/api/hedera/token/transfer', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          transactionId: '0.0.4696947@' + Date.now() + '.123456789',
          amount: req.body.amount,
          recipient: req.body.recipient
        }
      })
    );
  }),

  // AI Decisions API
  rest.get('http://localhost:3000/api/hedera/decisions', (req, res, ctx) => {
    const limit = parseInt(req.url.searchParams.get('limit')) || 10;
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockAIDecisions.slice(0, limit)
      })
    );
  }),

  rest.post('http://localhost:3000/api/hedera/decisions', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          decisionId: 'decision_' + Date.now(),
          hcsTransactionId: '0.0.4696947@' + Date.now() + '.123456789'
        }
      })
    );
  }),

  // AI Analytics API
  rest.get('http://localhost:3000/api/hedera/analytics', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockAIAnalytics
      })
    );
  }),

  // Transactions API
  rest.get('http://localhost:3000/api/hedera/transactions', (req, res, ctx) => {
    const limit = parseInt(req.url.searchParams.get('limit')) || 20;
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTransactions.slice(0, limit)
      })
    );
  }),

  // Network Stats API
  rest.get('http://localhost:3000/api/hedera/network-stats', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockNetworkStats
      })
    );
  }),

  // Vault APIs
  rest.get('http://localhost:3000/api/vault/info', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockVaultInfo
      })
    );
  }),

  rest.post('http://localhost:3000/api/vault/deposit', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          transactionId: '0.0.4696947@' + Date.now() + '.123456789',
          vaultShares: '950000000000000000',
          amount: req.body.amount
        }
      })
    );
  }),

  rest.post('http://localhost:3000/api/vault/withdraw', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          transactionId: '0.0.4696947@' + Date.now() + '.123456789',
          assetAmount: '525000000000000000',
          amount: req.body.amount
        }
      })
    );
  }),

  // Diagnostics API
  rest.post('http://localhost:3000/api/hedera/diagnostics', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          networkConnectivity: 'pass',
          hcsStatus: 'pass',
          htsStatus: 'pass',
          mirrorNodeStatus: 'pass',
          latencyTest: {
            status: 'pass',
            averageLatency: 2.1,
            maxLatency: 3.5
          },
          timestamp: new Date().toISOString()
        }
      })
    );
  }),

  // Error scenarios for testing
  rest.get('http://localhost:3000/api/hedera/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Internal server error'
      })
    );
  }),

  rest.get('http://localhost:3000/api/hedera/timeout', (req, res, ctx) => {
    return res(
      ctx.delay(10000), // 10 second delay to simulate timeout
      ctx.status(200),
      ctx.json({ success: true })
    );
  }),

  rest.get('http://localhost:3000/api/hedera/rate-limit', (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 60
      })
    );
  })
];

// Create and export the server
export const server = setupServer(...handlers);

// Export handlers for individual test customization
export { handlers };

// Export mock data for test assertions
export {
  mockHederaStatus,
  mockTokenInfo,
  mockTokenMetrics,
  mockAIDecisions,
  mockAIAnalytics,
  mockTransactions,
  mockNetworkStats,
  mockVaultInfo
};