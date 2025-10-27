# AION Hedera Integration Setup Guide

This guide provides step-by-step instructions for setting up the AION AI Agent with Hedera integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Hedera Account Configuration](#hedera-account-configuration)
4. [Contract Deployment](#contract-deployment)
5. [Service Initialization](#service-initialization)
6. [MCP Agent Configuration](#mcp-agent-configuration)
7. [Testing and Verification](#testing-and-verification)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Git
- Foundry (for smart contract deployment)

### Hedera Requirements

- Hedera testnet account with HBAR balance
- Private key for the account
- Access to Hedera testnet services

### Installation

```bash
# Clone the repository
git clone https://github.com/samarabdelhameed/AION_AI_Agent-Hedera.git
cd AION_AI_Agent-Hedera

# Install dependencies
cd mcp_agent && npm install
cd ../contracts && forge install
```

## Environment Setup

### 1. Create Environment Files

```bash
# Copy environment templates
cp contracts/.env.hedera.example contracts/.env.hedera
cp mcp_agent/.env.example mcp_agent/.env.hedera
```

### 2. Configure Hedera Environment

Edit `contracts/.env.hedera`:

```bash
# Hedera Network Configuration
HEDERA_NETWORK=testnet
HEDERA_RPC_URL=https://testnet.hashio.io/api
HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# Hedera Account Configuration (REQUIRED)
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
HEDERA_PUBLIC_KEY=0xYOUR_PUBLIC_KEY_HERE

# Deployment Configuration
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
ADMIN_ADDRESS=0xYOUR_ADMIN_ADDRESS_HERE
AI_AGENT_ADDRESS=0xYOUR_AI_AGENT_ADDRESS_HERE

# Vault Configuration
VAULT_NAME=AION Hedera Vault
VAULT_SYMBOL=AION-H
INITIAL_SUPPLY=1000000000000000000000000
TEST_MODE=true
```

### 3. Configure MCP Agent Environment

Edit `mcp_agent/.env.hedera`:

```bash
# Copy Hedera configuration from contracts/.env.hedera
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# MCP Agent Configuration
MCP_AGENT_PORT=3002
MCP_AGENT_HOST=0.0.0.0
ENABLE_HEDERA_INTEGRATION=true
HEDERA_POLL_INTERVAL=5000

# Service Configuration
ENABLE_REAL_TIME_MONITORING=true
EVENT_QUEUE_SIZE=1000
MAX_RETRY_ATTEMPTS=5
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
```

## Hedera Account Configuration

### 1. Create Hedera Testnet Account

1. Visit [Hedera Portal](https://portal.hedera.com/)
2. Create a new testnet account
3. Fund the account with testnet HBAR (minimum 100 HBAR recommended)
4. Note down your Account ID and Private Key

### 2. Verify Account Balance

```bash
cd contracts
make -f Makefile.hedera balance
```

### 3. Test Network Connectivity

```bash
cd contracts
make -f Makefile.hedera block-number
```

## Contract Deployment

### 1. Build Contracts

```bash
cd contracts
make -f Makefile.hedera build
```

### 2. Run Tests

```bash
cd contracts
make -f Makefile.hedera test-hedera
```

### 3. Deploy to Hedera Testnet

```bash
cd contracts
make -f Makefile.hedera deploy-hedera
```

This will deploy:
- `AIONVaultHedera` - Main vault contract
- `HTSTokenManager` - HTS token management
- `SafeHederaService` - Hedera service wrapper

### 4. Setup Hedera Services

```bash
cd contracts
make -f Makefile.hedera setup-services
```

### 5. Update Environment with Contract Addresses

After deployment, update your `.env.hedera` files with the deployed contract addresses:

```bash
VAULT_CONTRACT_ADDRESS=0xDEPLOYED_VAULT_ADDRESS
HTS_TOKEN_MANAGER_ADDRESS=0xDEPLOYED_TOKEN_MANAGER_ADDRESS
SAFE_HEDERA_SERVICE_ADDRESS=0xDEPLOYED_HEDERA_SERVICE_ADDRESS
```

## Service Initialization

### 1. Initialize Hedera Services

```bash
cd mcp_agent
npm run setup:hedera
```

This script will:
- Initialize HederaService
- Create HCS topic for decision logging
- Initialize HFS storage for model metadata
- Test service integration

### 2. Create HCS Topic (Alternative)

```bash
cd mcp_agent
npm run create:hcs-topic
```

### 3. Initialize HFS Storage (Alternative)

```bash
cd mcp_agent
npm run init:hfs-storage
```

### 4. Update Environment with Service IDs

After service initialization, update your `.env.hedera` files:

```bash
HCS_TOPIC_ID=0.0.CREATED_TOPIC_ID
HFS_FILE_ID=0.0.CREATED_FILE_ID
```

## MCP Agent Configuration

### 1. Start MCP Agent

```bash
cd mcp_agent
npm start
```

The agent will start with Hedera integration enabled.

### 2. Verify Hedera Integration

Check the startup logs for:
```
✅ Hedera Consensus Service (HCS) - Decision logging
✅ Hedera File Service (HFS) - Model metadata storage
✅ AI Decision Logger - Real-time event monitoring
✅ Model Metadata Manager - Version control & caching
✅ Real-time Event Monitor - Cross-chain coordination
```

### 3. Test API Endpoints

```bash
# Check Hedera service status
curl http://localhost:3002/api/hedera/status

# Check health
curl http://localhost:3002/api/health
```

## Testing and Verification

### 1. Run Integration Tests

```bash
cd mcp_agent
npm run test:hedera
```

### 2. Test Decision Flow

```bash
# Submit a test AI decision
curl -X POST http://localhost:3002/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "currentStrategy": "venus",
    "amount": "1000000000000000000"
  }'
```

### 3. Monitor Events

```bash
cd mcp_agent
npm run monitor:events
```

### 4. Check HCS Logs

Visit [Hedera Mirror Node Explorer](https://hashscan.io/testnet) and search for your HCS topic ID to view logged decisions.

## API Endpoints

### Hedera Integration Endpoints

- `GET /api/hedera/status` - Get Hedera services status
- `POST /api/hedera/log-decision` - Log decision to HCS
- `POST /api/hedera/store-model` - Store model metadata on HFS
- `POST /api/hedera/monitoring/start` - Start event monitoring
- `POST /api/hedera/monitoring/stop` - Stop event monitoring
- `GET /api/hedera/monitoring/stats` - Get monitoring statistics
- `GET /api/hedera/error-handler/stats` - Get error handler statistics
- `POST /api/hedera/error-handler/reset-circuit/:serviceName` - Reset circuit breaker
- `POST /api/hedera/error-handler/clear-queue` - Clear error queue

### Enhanced AI Decision Endpoint

- `POST /api/decide` - AI decision with automatic HCS logging

## Configuration Options

### Hedera Service Configuration

```javascript
// In your application
const hederaConfig = {
  network: 'testnet',
  accountId: '0.0.123456',
  privateKey: '0x...',
  services: {
    hcs: {
      topicId: '0.0.789012',
      enableLogging: true
    },
    hfs: {
      fileId: '0.0.345678',
      enableStorage: true
    }
  },
  monitoring: {
    pollInterval: 5000,
    enableRealTime: true
  }
};
```

### Error Handling Configuration

```javascript
const errorConfig = {
  retry: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000
  },
  queue: {
    maxSize: 1000,
    processingInterval: 30000
  }
};
```

## Troubleshooting

### Common Issues

#### 1. Hedera Service Initialization Failed

**Error**: `Failed to initialize Hedera service`

**Solutions**:
- Verify HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are correct
- Check account balance (minimum 10 HBAR required)
- Ensure network connectivity to Hedera testnet

#### 2. HCS Topic Creation Failed

**Error**: `Failed to create HCS topic`

**Solutions**:
- Check account has sufficient HBAR balance
- Verify account permissions
- Try with a different topic memo

#### 3. Contract Deployment Failed

**Error**: `Deployment failed`

**Solutions**:
- Verify Foundry is installed and updated
- Check RPC URL is accessible
- Ensure private key has sufficient balance

#### 4. Event Monitoring Not Working

**Error**: `Event monitoring failed to start`

**Solutions**:
- Verify contract address is correct
- Check Web3 provider connectivity
- Ensure contract ABI is correct

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm start
```

### Health Checks

Monitor service health:

```bash
# Check all services
curl http://localhost:3002/api/health

# Check Hedera services specifically
curl http://localhost:3002/api/hedera/status

# Check error handler statistics
curl http://localhost:3002/api/hedera/error-handler/stats
```

### Reset Services

If services are in a bad state:

```bash
# Reset circuit breakers
curl -X POST http://localhost:3002/api/hedera/error-handler/reset-circuit/hcs_submit
curl -X POST http://localhost:3002/api/hedera/error-handler/reset-circuit/hfs_store

# Clear error queue
curl -X POST http://localhost:3002/api/hedera/error-handler/clear-queue
```

## Performance Optimization

### 1. Batch Operations

Configure batch processing for better performance:

```javascript
const batchConfig = {
  batchSize: 10,
  batchTimeout: 5000,
  maxConcurrent: 5
};
```

### 2. Caching

Enable caching for model metadata:

```javascript
const cacheConfig = {
  enableCache: true,
  cacheSize: 100,
  cacheTTL: 3600000 // 1 hour
};
```

### 3. Connection Pooling

Use connection pooling for better resource management:

```javascript
const poolConfig = {
  maxConnections: 10,
  connectionTimeout: 30000,
  idleTimeout: 300000
};
```

## Security Considerations

### 1. Private Key Management

- Never commit private keys to version control
- Use environment variables or secure key management
- Rotate keys regularly

### 2. Network Security

- Use HTTPS for all API calls
- Implement rate limiting
- Monitor for suspicious activity

### 3. Access Control

- Implement proper authentication
- Use role-based access control
- Audit all operations

## Support

For additional support:

1. Check the [GitHub Issues](https://github.com/samarabdelhameed/AION_AI_Agent-Hedera/issues)
2. Review the [Hedera Documentation](https://docs.hedera.com/)
3. Join the [AION Community](https://discord.gg/aion)

## License

This project is licensed under the MIT License. See [LICENSE](../LICENSE) for details.