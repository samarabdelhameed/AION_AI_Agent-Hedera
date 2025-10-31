# AION Hedera Integration Setup Guide

This guide walks you through setting up the complete Hedera development environment for AION AI Agent integration.

## 📋 Prerequisites

### 1. Hedera Testnet Account
- Visit [Hedera Portal](https://portal.hedera.com/register)
- Create a testnet account
- Fund your account with testnet HBAR from the [faucet](https://portal.hedera.com/faucet)
- Note down your Account ID and Private Key

### 2. System Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### 3. Environment Setup
- Clone the AION repository
- Install dependencies: `npm install`

## 🚀 Quick Start

### Step 1: Configure Environment
1. Copy the example environment file:
   ```bash
   cp .env.hedera.example .env.hedera
   ```

2. Edit `.env.hedera` with your Hedera testnet credentials:
   ```bash
   HEDERA_NETWORK=testnet
   HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
   HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
   HEDERA_RPC_URL=https://testnet.hashio.io/api
   ```

### Step 2: Test Connection
```bash
npm run test:hedera
```

This will verify:
- ✅ Connection to Hedera testnet
- ✅ Account authentication
- ✅ Account balance (minimum 5 HBAR recommended)
- ✅ Network information

### Step 3: Setup Development Environment
```bash
npm run setup:hedera
```

This will:
- Create test accounts (Treasury, AI Agent, User1, User2)
- Update environment configuration
- Validate the setup

### Step 4: Create Hedera Services
```bash
npm run setup:hedera-services
```

This will create:
- 📝 HCS Topic for AI decisions
- 📋 HCS Topic for audit trail
- 🌉 HFS File for bridge configuration
- 🤖 HFS File for AI model metadata
- 🪙 HTS Token for AION shares

## 🏗️ Architecture Overview

### Hedera Services Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEDERA HASHGRAPH SERVICES                   │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│      HTS        │      HCS        │      HFS        │   HSCS    │
│  Token Service  │ Consensus Service│  File Service   │ Contracts │
├─────────────────┼─────────────────┼─────────────────┼───────────┤
│ • AION Tokens   │ • AI Decisions  │ • Model Data    │ • Vault   │
│ • Mint/Burn     │ • Audit Trail   │ • Bridge Config │ • Logic   │
│ • Transfer      │ • Immutable Log │ • Metadata      │ • Security│
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### Service Responsibilities

#### HCS (Hedera Consensus Service)
- **AI Decision Topic**: Logs all AI rebalancing decisions
- **Audit Topic**: Records bridge operations and system events
- **Immutable Logging**: Provides tamper-proof audit trail

#### HFS (Hedera File Service)
- **Bridge Configuration**: Stores cross-chain bridge settings
- **AI Model Metadata**: Stores model versions and performance metrics
- **Decentralized Storage**: Ensures data availability and integrity

#### HTS (Hedera Token Service)
- **AION Share Token**: Represents user shares in the vault
- **Native Integration**: Leverages Hedera's native token capabilities
- **Efficient Operations**: Low-cost minting, burning, and transfers

#### HSCS (Hedera Smart Contract Service)
- **Vault Logic**: Core DeFi functionality
- **Bridge Contracts**: Cross-chain interoperability
- **Security Mechanisms**: Access control and emergency procedures

## 🔧 Configuration Details

### Environment Variables

#### Required Variables
```bash
HEDERA_NETWORK=testnet                    # Network (testnet/mainnet)
HEDERA_ACCOUNT_ID=0.0.123456             # Your operator account
HEDERA_PRIVATE_KEY=302e020100300506...    # Your private key
HEDERA_RPC_URL=https://testnet.hashio.io/api  # RPC endpoint
```

#### Service IDs (Generated after setup)
```bash
HCS_TOPIC_ID=                            # AI decision topic (will be created)
HCS_AUDIT_TOPIC_ID=                      # Audit trail topic (will be created)
HFS_BRIDGE_FILE_ID=                      # Bridge config file (will be created)
HFS_MODEL_FILE_ID=                       # AI model metadata (will be created)
HTS_SHARE_TOKEN_ID=                      # AION share token (will be created)
```

**Example of real deployed services**:
- HTS Token: `0.0.7150671` (AION Vault Shares - 3.5B supply)
- HCS Topic: `0.0.7150678` (AI Decision Logging - 16+ messages)

#### Test Accounts (Will be auto-generated during setup)
```bash
TREASURY_ACCOUNT_ID=                     # Treasury account
TREASURY_PRIVATE_KEY=                    # Treasury private key
AI_AGENT_ACCOUNT_ID=                     # AI agent account
AI_AGENT_PRIVATE_KEY=                    # AI agent private key
USER1_ACCOUNT_ID=                        # Test user 1
USER1_PRIVATE_KEY=                       # Test user 1 key
USER2_ACCOUNT_ID=                        # Test user 2
USER2_PRIVATE_KEY=                       # Test user 2 key
```

## 🧪 Testing

### Connection Test
```bash
npm run test:hedera
```

### Service Integration Test
```bash
npm run test:hedera-integration
```

### MCP Agent Test
```bash
cd mcp_agent && npm run test:hedera
```

## 📊 Monitoring and Verification

### Explorer Links
After setup, you can verify your services on [HashScan](https://hashscan.io/testnet):

- **HCS Topics**: `https://hashscan.io/testnet/topic/0.0.YOUR_TOPIC_ID`
- **HFS Files**: `https://hashscan.io/testnet/file/0.0.YOUR_FILE_ID`
- **HTS Tokens**: `https://hashscan.io/testnet/token/0.0.YOUR_TOKEN_ID`
- **Accounts**: `https://hashscan.io/testnet/account/0.0.YOUR_ACCOUNT_ID`

### Service Status Check
```bash
# Check all services status
npm run status

# Check specific service logs
npm run logs:mcp
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Insufficient Balance
**Error**: `INSUFFICIENT_ACCOUNT_BALANCE`
**Solution**: Fund your account with more HBAR from the [testnet faucet](https://portal.hedera.com/faucet)

#### 2. Invalid Account ID
**Error**: `INVALID_ACCOUNT_ID`
**Solution**: Verify your account ID format (should be `0.0.123456`)

#### 3. Network Connection Issues
**Error**: Connection timeout or network errors
**Solution**: 
- Check your internet connection
- Verify RPC URL: `https://testnet.hashio.io/api`
- Try different network endpoint

#### 4. Private Key Format
**Error**: `INVALID_PRIVATE_KEY`
**Solution**: Ensure private key is in correct format (DER-encoded hex string)

### Debug Mode
Enable debug logging:
```bash
DEBUG=hedera:* npm run test:hedera
```

### Reset Environment
If you need to start fresh:
```bash
# Remove existing configuration
rm .env.hedera

# Copy fresh template
cp .env.hedera.example .env.hedera

# Reconfigure and setup
npm run setup:hedera
```

## 🔗 Useful Resources

### Official Documentation
- [Hedera Documentation](https://docs.hedera.com)
- [Hedera SDK for JavaScript](https://docs.hedera.com/hedera/sdks-and-apis/sdks/javascript-sdk)
- [HCS Documentation](https://docs.hedera.com/hedera/core-concepts/consensus-service)
- [HFS Documentation](https://docs.hedera.com/hedera/core-concepts/file-service)
- [HTS Documentation](https://docs.hedera.com/hedera/core-concepts/token-service)

### Tools and Explorers
- [Hedera Portal](https://portal.hedera.com) - Account management
- [HashScan Explorer](https://hashscan.io/testnet) - Testnet explorer
- [Testnet Faucet](https://portal.hedera.com/faucet) - Get testnet HBAR
- [Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api) - Query historical data

### Community
- [Hedera Discord](https://discord.com/invite/hedera)
- [Hedera GitHub](https://github.com/hashgraph)
- [Developer Portal](https://hedera.com/developers)

## 📈 Performance Benchmarks

### Expected Performance (Testnet)
- **Transaction Finality**: ~3-5 seconds
- **HCS Message Submission**: ~2-3 seconds
- **HFS File Creation**: ~5-10 seconds
- **HTS Operations**: ~2-4 seconds

### Cost Estimates (Testnet)
- **HCS Message**: ~$0.0001 USD
- **HFS File (1KB)**: ~$0.05 USD
- **HTS Token Creation**: ~$1 USD
- **HTS Operations**: ~$0.001 USD

## 🚀 Next Steps

After completing the Hedera setup:

1. **Deploy Smart Contracts**: `npm run deploy:hedera`
2. **Start MCP Agent**: `npm run start:mcp`
3. **Run Integration Tests**: `npm run test:comprehensive`
4. **Launch Frontend**: `npm run start:frontend`

## 📝 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review the [official documentation](https://docs.hedera.com)
3. Join the [Hedera Discord](https://discord.com/invite/hedera)
4. Create an issue in the [AION repository](https://github.com/samarabdelhameed/AION_AI_Agent/issues)

---

**Happy Building! 🎉**