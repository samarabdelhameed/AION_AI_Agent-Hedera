# AION Hedera Integration - Complete Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying the complete AION AI Agent system with Hedera integration, including smart contracts, MCP agent, and transparency dashboard.

## 🎯 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Foundry**: Latest version for smart contract deployment
- **Git**: For repository management
- **Docker**: Optional, for containerized deployment

### Hedera Requirements
- **Hedera Testnet Account**: With sufficient HBAR balance (minimum 100 HBAR)
- **Private Key**: For account operations
- **Account ID**: Your Hedera account identifier

### Network Access
- **Internet Connection**: For Hedera testnet access
- **RPC Access**: Hedera JSON-RPC endpoint access
- **Mirror Node Access**: For historical data queries

## 🚀 Quick Start

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/your-org/AION_AI_Agent-Hedera.git
cd AION_AI_Agent-Hedera

# Install dependencies
npm install
cd contracts && npm install
cd ../mcp_agent && npm install
cd ../frontend && npm install
cd ..
```

### 2. Environment Configuration
```bash
# Copy environment templates
cp .env.hedera.example .env.hedera
cp contracts/.env.hedera.example contracts/.env.hedera
cp mcp_agent/.env.example mcp_agent/.env
cp frontend/.env.example frontend/.env.local

# Edit environment files with your Hedera credentials
```

### 3. Quick Deploy Script
```bash
# Run the complete deployment script
chmod +x scripts/deploy-complete-system.js
node scripts/deploy-complete-system.js
```

## 📝 Detailed Deployment Steps

### Step 1: Hedera Account Setup

#### 1.1 Create Hedera Testnet Account
1. Visit [Hedera Portal](https://portal.hedera.com/)
2. Create a new testnet account
3. Fund account with testnet HBAR from [faucet](https://portal.hedera.com/faucet)
4. Note down your Account ID and Private Key

#### 1.2 Verify Account Balance
```bash
# Check account balance
node scripts/check-hedera-balance.js
```

### Step 2: Environment Configuration

#### 2.1 Main Environment File (.env.hedera)
```env
# Hedera Network Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

# Hedera Services
HEDERA_RPC_URL=https://testnet.hashio.io/api
HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# Optional: Custom endpoints
HEDERA_CONSENSUS_NODE_ENDPOINT=0.testnet.hedera.com:50211
HEDERA_CONSENSUS_NODE_ACCOUNT_ID=0.0.3
```

#### 2.2 Smart Contracts Environment (contracts/.env.hedera)
```env
# Deployment Configuration
DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
HEDERA_RPC_URL=https://testnet.hashio.io/api
HEDERA_CHAIN_ID=296

# Contract Configuration
INITIAL_OWNER=0.0.YOUR_ACCOUNT_ID
AI_AGENT_ADDRESS=0.0.YOUR_AI_AGENT_ACCOUNT

# HTS Configuration
HTS_TOKEN_NAME=AION Vault Shares
HTS_TOKEN_SYMBOL=AION
HTS_TOKEN_DECIMALS=18
```

#### 2.3 MCP Agent Environment (mcp_agent/.env)
```env
# Hedera Configuration
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
HEDERA_NETWORK=testnet

# Service Configuration
HCS_TOPIC_ID=0.0.TOPIC_ID_HERE
HFS_FILE_ID=0.0.FILE_ID_HERE
VAULT_CONTRACT_ADDRESS=0xVAULT_ADDRESS_HERE

# Agent Configuration
AI_AGENT_ENABLED=true
DECISION_INTERVAL=3600
LOG_LEVEL=info
```

#### 2.4 Frontend Environment (frontend/.env.local)
```env
REACT_APP_VAULT_ADDRESS=0xVAULT_ADDRESS_HERE
REACT_APP_HCS_TOPIC_ID=0.0.TOPIC_ID_HERE
REACT_APP_HEDERA_NETWORK=testnet
REACT_APP_RPC_URL=https://testnet.hashio.io/api
REACT_APP_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
```

### Step 3: Smart Contract Deployment

#### 3.1 Prepare Foundry Environment
```bash
cd contracts

# Install Foundry dependencies
forge install

# Compile contracts
forge build

# Run tests to ensure everything works
forge test
```

#### 3.2 Deploy Core Contracts
```bash
# Deploy HTS Token Manager
forge script script/DeployHederaVault.s.sol \
    --rpc-url $HEDERA_RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --verify

# Note the deployed contract addresses
```

#### 3.3 Initialize Hedera Services
```bash
# Set up HCS topics and HFS files
forge script script/SetupHederaServices.s.sol \
    --rpc-url $HEDERA_RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast

# This will create:
# - HCS topic for AI decisions
# - HFS file for model metadata
# - Configure vault with Hedera services
```

#### 3.4 Verify Deployment
```bash
# Verify contract deployment
forge verify-contract \
    --chain-id 296 \
    --compiler-version v0.8.20 \
    CONTRACT_ADDRESS \
    src/hedera/AIONVaultHedera.sol:AIONVaultHedera

# Test contract functionality
forge test --match-contract AIONVaultHederaTest -vv
```

### Step 4: MCP Agent Setup

#### 4.1 Install Dependencies
```bash
cd mcp_agent
npm install

# Install additional Hedera dependencies
npm install @hashgraph/sdk
```

#### 4.2 Initialize Hedera Services
```bash
# Initialize HFS storage
node scripts/init-hfs-storage.js

# Set up Hedera services
node scripts/setup-hedera-services.js

# Validate configuration
node scripts/validate-config.js
```

#### 4.3 Start MCP Agent
```bash
# Start in development mode
npm run dev

# Or start in production mode
npm start

# Check agent status
curl http://localhost:3000/health
```

### Step 5: Frontend Deployment

#### 5.1 Build Frontend
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

#### 5.2 Deploy Frontend
```bash
# Serve locally
npm run preview

# Or deploy to hosting service
# Example: Vercel
npx vercel --prod

# Example: Netlify
npx netlify deploy --prod --dir=build
```

### Step 6: System Integration Testing

#### 6.1 End-to-End Testing
```bash
# Run comprehensive integration tests
cd mcp_agent
npm run test:e2e

# Test user journey
npm run test:user-journey

# Test performance and reliability
npm run test:performance
```

#### 6.2 Verify All Components
```bash
# Check smart contract
curl -X POST $HEDERA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"CONTRACT_ADDRESS","data":"0x..."},"latest"],"id":1}'

# Check MCP agent
curl http://localhost:3000/api/status

# Check frontend
curl http://localhost:3000
```

## 🔧 Configuration Options

### Smart Contract Configuration

#### Vault Parameters
```solidity
// Minimum deposit amount
uint256 public minDepositBNB = 0.01 ether;

// Minimum yield claim amount  
uint256 public minYieldClaimBNB = 0.001 ether;

// Strategy lock duration
uint256 public constant STRATEGY_LOCK_DURATION = 1 hours;
```

#### HTS Token Configuration
```solidity
// Token properties
string memory name = "AION Vault Shares";
string memory symbol = "AION";
uint32 decimals = 18;
uint256 initialSupply = 0;
```

### MCP Agent Configuration

#### Decision Making Parameters
```javascript
const config = {
  decisionInterval: 3600, // 1 hour
  riskThreshold: 0.05,    // 5%
  maxPositionSize: 0.3,   // 30%
  rebalanceThreshold: 0.1 // 10%
};
```

#### Hedera Service Settings
```javascript
const hederaConfig = {
  network: 'testnet',
  maxRetries: 3,
  retryDelay: 1000,
  messageTimeout: 30000
};
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Insufficient HBAR Balance
**Error**: "Insufficient account balance"
**Solution**: 
```bash
# Check balance
node scripts/check-hedera-balance.js

# Get more HBAR from faucet
# Visit: https://portal.hedera.com/faucet
```

#### 2. Contract Deployment Fails
**Error**: "Transaction reverted"
**Solution**:
```bash
# Check gas settings
forge script --gas-limit 3000000 ...

# Verify account permissions
# Ensure account has contract creation permissions
```

#### 3. HCS Topic Creation Fails
**Error**: "Topic creation failed"
**Solution**:
```bash
# Check topic creation permissions
# Verify account has sufficient HBAR for topic creation
# Topic creation requires ~1 HBAR
```

#### 4. MCP Agent Connection Issues
**Error**: "Failed to connect to Hedera"
**Solution**:
```bash
# Check network connectivity
ping testnet.hedera.com

# Verify credentials
node scripts/test-hedera-connection.js

# Check firewall settings
```

#### 5. Frontend Build Errors
**Error**: "Module not found"
**Solution**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check environment variables
cat .env.local
```

### Debug Commands

#### Smart Contracts
```bash
# Debug contract deployment
forge script --debug script/DeployHederaVault.s.sol

# Trace transaction
forge run --debug 0xTRANSACTION_HASH

# Check contract state
cast call CONTRACT_ADDRESS "totalAssets()"
```

#### MCP Agent
```bash
# Enable debug logging
DEBUG=* npm start

# Check service health
curl http://localhost:3000/debug/health

# View recent logs
tail -f logs/mcp-agent.log
```

#### Frontend
```bash
# Debug build issues
npm run build -- --verbose

# Check bundle size
npm run analyze

# Test production build locally
npm run preview
```

## 📊 Monitoring and Maintenance

### Health Checks

#### Automated Monitoring
```bash
# Set up monitoring script
chmod +x scripts/health-check.sh
./scripts/health-check.sh

# Add to crontab for regular checks
crontab -e
# Add: */5 * * * * /path/to/health-check.sh
```

#### Manual Checks
```bash
# Check contract status
cast call $VAULT_ADDRESS "totalAssets()"

# Check HCS topic
node scripts/check-hcs-topic.js

# Check agent status
curl http://localhost:3000/health
```

### Backup and Recovery

#### Configuration Backup
```bash
# Backup environment files
tar -czf config-backup.tar.gz .env* */.*env*

# Backup deployment artifacts
tar -czf deployment-backup.tar.gz contracts/broadcast/
```

#### Recovery Procedures
```bash
# Restore from backup
tar -xzf config-backup.tar.gz

# Redeploy if necessary
node scripts/deploy-complete-system.js
```

## 🔒 Security Considerations

### Private Key Management
- **Never commit private keys** to version control
- Use **environment variables** for sensitive data
- Consider **hardware wallets** for production
- Implement **key rotation** policies

### Network Security
- Use **HTTPS** for all communications
- Implement **rate limiting** on APIs
- Monitor for **unusual activity**
- Keep **dependencies updated**

### Smart Contract Security
- **Audit contracts** before mainnet deployment
- Use **multi-signature** wallets for admin functions
- Implement **emergency pause** mechanisms
- Monitor **contract interactions**

## 📈 Performance Optimization

### Smart Contract Optimization
```bash
# Optimize gas usage
forge test --gas-report

# Analyze storage layout
forge inspect AIONVaultHedera storage-layout
```

### MCP Agent Optimization
```javascript
// Connection pooling
const pool = new ConnectionPool({
  maxConnections: 10,
  timeout: 30000
});

// Caching strategy
const cache = new LRUCache({
  max: 1000,
  ttl: 300000 // 5 minutes
});
```

### Frontend Optimization
```bash
# Bundle analysis
npm run build
npm run analyze

# Performance testing
npm run lighthouse
```

## 🎯 Production Deployment

### Mainnet Considerations
1. **Thorough Testing**: Complete testnet validation
2. **Security Audit**: Professional smart contract audit
3. **Gradual Rollout**: Phased deployment approach
4. **Monitoring Setup**: Comprehensive monitoring
5. **Backup Strategy**: Robust backup and recovery

### Scaling Considerations
- **Load Balancing**: Multiple MCP agent instances
- **Database Optimization**: Efficient data storage
- **CDN Integration**: Frontend asset delivery
- **Caching Strategy**: Multi-layer caching

## 📞 Support and Resources

### Documentation
- [Hedera Documentation](https://docs.hedera.com/)
- [Foundry Book](https://book.getfoundry.sh/)
- [React Documentation](https://reactjs.org/docs/)

### Community Support
- [Hedera Discord](https://discord.gg/hedera)
- [GitHub Issues](https://github.com/your-org/AION_AI_Agent-Hedera/issues)
- [Developer Forums](https://hedera.com/discord)

### Professional Support
- Smart contract auditing services
- Hedera integration consulting
- Performance optimization services

---

## ✅ Deployment Checklist

- [ ] Hedera testnet account created and funded
- [ ] Environment variables configured
- [ ] Smart contracts compiled and tested
- [ ] Contracts deployed to testnet
- [ ] HCS topics and HFS files created
- [ ] MCP agent configured and running
- [ ] Frontend built and deployed
- [ ] End-to-end testing completed
- [ ] Monitoring and alerts configured
- [ ] Documentation updated
- [ ] Team trained on operations

**Deployment Complete! 🎉**

Your AION Hedera integration is now live and ready for demonstration.