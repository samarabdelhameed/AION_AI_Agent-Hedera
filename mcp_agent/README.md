# AION MCP Agent Enhanced Server

Enhanced AION MCP Agent with comprehensive Hedera blockchain integration, providing advanced AI decision logging, model metadata management, and cross-chain operations.

## 🌟 Features

### Core Services
- **HederaService**: Complete Hedera blockchain integration (HCS, HTS, HFS)
- **AIDecisionLogger**: Advanced AI decision tracking and analysis
- **ModelMetadataManager**: ML model versioning and metadata storage
- **Web3Service**: Multi-chain Web3 operations and cross-chain bridging

### API Endpoints
- **Health & Status**: `/api/hedera/health`, `/api/hedera/status`, `/api/hedera/analytics`
- **AI Decisions**: `/api/hedera/decisions/*` - Log, retrieve, and analyze AI decisions
- **Token Operations**: `/api/hedera/token/*` - HTS token management (mint, burn, transfer)
- **Consensus Service**: `/api/hedera/hcs/*` - HCS message submission and batching
- **Model Management**: `/api/hedera/models/*` - Model metadata storage and versioning

### Security Features
- Rate limiting and request validation
- JWT authentication support
- CORS and security headers
- Error handling and logging
- Graceful shutdown handling

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Hedera testnet account and keys

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp ../.env.example .env
   # Edit .env with your Hedera credentials
   ```

3. **Start the server**:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

4. **Verify server is running**:
   ```bash
   curl http://localhost:3000/health
   ```

## 🔧 Configuration

### Environment Variables

```bash
# Hedera Configuration
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.123456
HEDERA_OPERATOR_KEY=your_private_key_here

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Optional: HCS Topic ID for AI decisions
HCS_TOPIC_ID=0.0.789012

# Optional: HTS Token ID for vault shares
HTS_TOKEN_ID=0.0.345678
```

### Service Configuration

The server automatically initializes all services with sensible defaults. You can customize service behavior by modifying the service constructors in `server/app.js`.

## 📚 API Documentation

### Health Endpoints

#### GET /health
Returns overall system health status.

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "hedera": true,
    "aiLogger": true,
    "modelManager": true,
    "web3": true
  }
}
```

#### GET /api/hedera/status
Returns detailed Hedera service status.

```json
{
  "success": true,
  "data": {
    "status": {
      "isConnected": true,
      "network": "testnet",
      "operatorId": "0.0.123456"
    },
    "metrics": {
      "totalTransactions": 150,
      "successRate": 0.98,
      "averageLatency": 2.5
    }
  }
}
```

### AI Decision Endpoints

#### POST /api/hedera/decisions
Log a new AI decision.

```json
{
  "type": "investment",
  "action": "buy_ethereum",
  "confidence": 0.85,
  "reasoning": "Strong technical indicators",
  "context": {
    "market": "crypto",
    "asset": "ETH",
    "price": 2500
  }
}
```

#### GET /api/hedera/decisions
Retrieve AI decisions with optional filtering.

Query parameters:
- `limit`: Number of decisions to return (default: 50)
- `offset`: Pagination offset (default: 0)
- `type`: Filter by decision type
- `startTime`: Filter by start timestamp
- `endTime`: Filter by end timestamp

### Token Endpoints

#### GET /api/hedera/token/:tokenId
Get HTS token information.

#### POST /api/hedera/token/:tokenId/mint
Mint new tokens.

```json
{
  "amount": "1000000000000000000",
  "metadata": {
    "reason": "vault_deposit",
    "timestamp": 1705312200000
  }
}
```

#### POST /api/hedera/token/:tokenId/transfer
Transfer tokens between accounts.

```json
{
  "fromAccountId": "0.0.123456",
  "toAccountId": "0.0.789012",
  "amount": "500000000000000000",
  "metadata": {
    "reason": "user_withdrawal"
  }
}
```

### HCS Endpoints

#### POST /api/hedera/hcs/submit
Submit a single message to HCS.

```json
{
  "topicId": "0.0.789012",
  "message": {
    "type": "ai_decision",
    "timestamp": 1705312200000,
    "data": {
      "decision": "rebalance_portfolio",
      "confidence": 0.92
    }
  }
}
```

#### POST /api/hedera/hcs/batch
Submit multiple messages to HCS.

```json
{
  "topicId": "0.0.789012",
  "messages": [
    {
      "type": "performance_metric",
      "data": { "metric": "accuracy", "value": 0.95 }
    },
    {
      "type": "model_update",
      "data": { "version": "2.1.0", "changes": "Improved accuracy" }
    }
  ]
}
```

### Model Management Endpoints

#### POST /api/hedera/models
Store model metadata.

```json
{
  "name": "AION-Decision-Engine",
  "type": "neural_network",
  "version": "2.1.0",
  "description": "Advanced AI decision engine",
  "architecture": {
    "layers": 12,
    "neurons": 2048,
    "activation": "relu"
  },
  "performance": {
    "accuracy": 0.95,
    "precision": 0.93,
    "recall": 0.97
  }
}
```

#### GET /api/hedera/models/:modelId
Retrieve model metadata.

#### GET /api/hedera/models
List all models with optional filtering.

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Individual Services
```bash
npm run test:hedera      # Test Hedera service
npm run test:ai-logger   # Test AI decision logger
npm run test:model-manager # Test model metadata manager
npm run test:web3        # Test Web3 service
```

### Test API Endpoints
```bash
npm run test:api         # Test all API endpoints
```

### Integration Tests
```bash
npm run test:integration # Test service integration
npm run test:simple      # Simple integration test
```

## 📊 Monitoring

### Health Checks
The server provides comprehensive health monitoring:

```bash
# Check overall health
curl http://localhost:3000/health

# Check Hedera service status
curl http://localhost:3000/api/hedera/status

# Get performance analytics
curl http://localhost:3000/api/hedera/analytics
```

### Logging
The server uses structured logging with different levels:
- `info`: General operational messages
- `warn`: Warning conditions
- `error`: Error conditions
- `debug`: Detailed debugging information

### Metrics
Each service provides metrics including:
- Transaction counts and success rates
- Response times and latency
- Error rates and types
- Resource usage statistics

## 🔒 Security

### Rate Limiting
API endpoints are protected with rate limiting:
- Default: 100 requests per minute per IP
- Configurable per endpoint
- Returns 429 status with retry-after header

### Input Validation
All API endpoints validate input data:
- JSON schema validation
- Type checking and sanitization
- Required field validation
- Range and format validation

### Error Handling
Comprehensive error handling:
- Structured error responses
- Error logging and tracking
- Graceful degradation
- Security-conscious error messages

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
NODE_ENV=production npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test files for usage examples

## 🔗 Related Projects

- [AION Frontend](../frontend/) - React frontend application
- [AION Contracts](../contracts/) - Smart contracts
- [AION Scripts](../scripts/) - Utility scripts