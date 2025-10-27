# AION AI Agent - Hedera Integration

Advanced AI-powered DeFi yield optimization platform with Hedera blockchain integration for transparent decision logging and model metadata management.

## 🌟 Features

### Core AI Capabilities
- **Intelligent Yield Optimization**: AI-driven strategy selection across multiple DeFi protocols
- **Real-time Market Analysis**: Continuous monitoring of market conditions and opportunities
- **Risk Management**: Advanced risk assessment and portfolio balancing
- **Performance Tracking**: Comprehensive analytics and reporting

### Hedera Integration
- **🔗 Hedera Consensus Service (HCS)**: Immutable logging of all AI decisions
- **📁 Hedera File Service (HFS)**: Decentralized storage of AI model metadata
- **🪙 Hedera Token Service (HTS)**: Native token management and operations
- **⚡ Real-time Monitoring**: Cross-chain event coordination between BSC and Hedera
- **🛡️ Advanced Error Handling**: Circuit breaker pattern with exponential backoff

### Technical Architecture
- **Cross-chain Coordination**: Seamless integration between BSC and Hedera networks
- **Microservices Architecture**: Modular, scalable service design
- **Comprehensive Testing**: 37+ integration tests covering all scenarios
- **Production Ready**: Advanced error handling, monitoring, and recovery mechanisms

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0+
- Foundry (for smart contracts)
- Hedera testnet account with HBAR balance

### Installation

```bash
# Clone repository
git clone https://github.com/samarabdelhameed/AION_AI_Agent-Hedera.git
cd AION_AI_Agent-Hedera

# Install dependencies
cd mcp_agent && npm install
cd ../contracts && forge install
```

### Configuration

```bash
# Setup environment
cd mcp_agent
cp .env.example .env.hedera
# Edit .env.hedera with your Hedera credentials

# Validate configuration
npm run validate:config
```

### Deployment

```bash
# Deploy contracts to Hedera testnet
cd contracts
make -f Makefile.hedera deploy-hedera

# Initialize Hedera services
cd ../mcp_agent
npm run setup:hedera

# Start MCP Agent
npm start
```

## 📖 Documentation

- **[Complete Setup Guide](docs/HEDERA_SETUP_GUIDE.md)** - Detailed installation and configuration
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and components
- **[Integration Guide](docs/INTEGRATION.md)** - How to integrate with existing systems

## 🏗️ Architecture

### Service Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Agent     │    │  Hedera Network │    │   BSC Network   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │AI Decision  │ │◄──►│ │    HCS      │ │    │ │Vault Contract│ │
│ │Logger       │ │    │ │   Topic     │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Model Meta   │ │◄──►│ │    HFS      │ │    │ │HTS Tokens   │ │
│ │Manager      │ │    │ │   Storage   │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │                 │
│ │Real-time    │ │◄──►│ │   Mirror    │ │    │                 │
│ │Monitor      │ │    │ │   Node      │ │    │                 │
│ └─────────────┘ │    │ └─────────────┘ │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Services

1. **HederaService**: Core Hedera SDK integration
2. **AIDecisionLogger**: Real-time event monitoring and HCS logging
3. **ModelMetadataManager**: AI model versioning and HFS storage
4. **RealTimeEventMonitor**: Cross-chain event coordination
5. **HederaErrorHandler**: Advanced error handling and recovery

## 🔧 API Endpoints

### Hedera Integration

```bash
# Service status
GET /api/hedera/status

# Decision logging
POST /api/hedera/log-decision

# Model metadata
POST /api/hedera/store-model

# Event monitoring
POST /api/hedera/monitoring/start
POST /api/hedera/monitoring/stop
GET /api/hedera/monitoring/stats

# Error handling
GET /api/hedera/error-handler/stats
POST /api/hedera/error-handler/reset-circuit/:service
POST /api/hedera/error-handler/clear-queue
```

### Enhanced AI Decision

```bash
# AI decision with automatic Hedera logging
POST /api/decide
{
  "currentStrategy": "venus",
  "amount": "1000000000000000000"
}
```

## 🧪 Testing

### Run All Tests

```bash
# Contract tests
cd contracts && make -f Makefile.hedera test-hedera

# Integration tests
cd mcp_agent && npm run test:hedera

# End-to-end tests
npm run test:integration
```

### Test Coverage

- **37 Integration Tests**: Complete end-to-end scenarios
- **Real Data Testing**: No mocks - uses actual networks
- **Error Scenarios**: Circuit breaker, retry mechanisms, queue management
- **Performance Tests**: Concurrent operations and load testing
- **Cross-chain Tests**: BSC ↔ Hedera coordination

## 📊 Monitoring & Analytics

### Real-time Dashboards

- **Service Health**: Monitor all Hedera services
- **Decision Logs**: View all AI decisions on HCS
- **Model Versions**: Track AI model evolution on HFS
- **Error Analytics**: Circuit breaker status and error rates
- **Performance Metrics**: Response times and throughput

### Example Monitoring

```bash
# Check service health
curl http://localhost:3002/api/health

# View Hedera services status
curl http://localhost:3002/api/hedera/status

# Monitor error handler
curl http://localhost:3002/api/hedera/error-handler/stats
```

## 🛡️ Security & Reliability

### Error Handling Features

- **Circuit Breaker Pattern**: Prevents cascade failures
- **Exponential Backoff**: Intelligent retry mechanisms
- **Message Queuing**: Handles temporary service outages
- **Health Monitoring**: Continuous service health checks
- **Graceful Degradation**: Continues operation during partial failures

### Security Measures

- **Private Key Management**: Secure credential handling
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data validation
- **Audit Trails**: Complete operation logging
- **Access Control**: Role-based permissions

## 🚀 Production Deployment

### Environment Setup

```bash
# Production environment
HEDERA_NETWORK=mainnet
HEDERA_ACCOUNT_ID=0.0.YOUR_MAINNET_ACCOUNT
HEDERA_PRIVATE_KEY=0xYOUR_MAINNET_KEY

# Performance tuning
HEDERA_POLL_INTERVAL=3000
EVENT_QUEUE_SIZE=5000
MAX_RETRY_ATTEMPTS=10
CIRCUIT_BREAKER_THRESHOLD=10
```

### Scaling Considerations

- **Horizontal Scaling**: Multiple MCP Agent instances
- **Load Balancing**: Distribute requests across instances
- **Database Clustering**: Scale metadata storage
- **Caching Strategy**: Optimize performance with Redis
- **Monitoring**: Comprehensive observability stack

## 📈 Performance Metrics

### Benchmarks

- **Decision Logging**: < 2 seconds to HCS
- **Model Storage**: < 5 seconds to HFS
- **Event Processing**: 1000+ events/minute
- **Error Recovery**: < 30 seconds circuit breaker reset
- **Cross-chain Coordination**: < 10 seconds BSC ↔ Hedera

### Optimization Features

- **Batch Processing**: Group operations for efficiency
- **Connection Pooling**: Optimize network resources
- **Intelligent Caching**: Reduce redundant operations
- **Async Processing**: Non-blocking operations
- **Resource Management**: Efficient memory and CPU usage

## 🤝 Contributing

### Development Setup

```bash
# Setup development environment
npm run setup:dev

# Run linting
npm run lint

# Format code
npm run format

# Run all tests
npm run test:all
```

### Contribution Guidelines

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Complete Setup Guide](docs/HEDERA_SETUP_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/samarabdelhameed/AION_AI_Agent-Hedera/issues)
- **Community**: [Discord Server](https://discord.gg/aion)
- **Email**: support@aion.ai

## 🎯 Roadmap

### Q4 2024
- ✅ Hedera HCS integration
- ✅ Hedera HFS integration  
- ✅ Real-time event monitoring
- ✅ Advanced error handling

### Q1 2025
- 🔄 Mainnet deployment
- 🔄 Advanced AI models
- 🔄 Multi-chain expansion
- 🔄 Governance token

### Q2 2025
- 📋 Mobile application
- 📋 Institutional features
- 📋 API marketplace
- 📋 Advanced analytics

---

**Built with ❤️ by the AION Team**

*Revolutionizing DeFi through AI and blockchain transparency*