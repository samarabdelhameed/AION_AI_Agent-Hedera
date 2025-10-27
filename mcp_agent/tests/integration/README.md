# Hedera Integration Tests

## Overview
Comprehensive integration tests for Hedera services including HCS (Hedera Consensus Service) and HFS (Hedera File Service) functionality.

## Test Coverage
- **HederaService**: Core SDK operations, health checks, retry mechanisms
- **AIDecisionLogger**: Event monitoring, HCS logging, queue management  
- **ModelMetadataManager**: HFS storage, version management, caching
- **Cross-Service Integration**: End-to-end workflows and data validation
- **Error Handling**: Graceful failures and recovery mechanisms

## Running Tests

### Prerequisites
```bash
# Set Hedera credentials in .env.hedera
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=your_private_key_here
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```

### Execute Tests
```bash
# Run Hedera integration tests
npm run test:hedera

# Run with coverage
npm run test:coverage

# Run all integration tests
npm test -- tests/integration/
```

## Test Structure
- **Real Data Testing**: No mocks - uses actual Hedera testnet and BSC testnet
- **Environment Validation**: Graceful handling when credentials unavailable
- **Comprehensive Coverage**: 25 test cases covering all service functionality
- **Performance Testing**: Network connectivity and response time validation

## Key Features Tested
✅ Hedera SDK initialization and configuration  
✅ HCS topic creation and message submission  
✅ HFS file storage and metadata management  
✅ AI decision event monitoring and logging  
✅ Model version control and caching  
✅ Cross-service data flow integration  
✅ Error handling and retry mechanisms  
✅ Health checks and service statistics  

## Notes
- Tests automatically skip Hedera operations if credentials not configured
- Uses real blockchain networks for authentic integration testing
- Includes cleanup procedures to prevent resource leaks
- Validates data structures and business logic without mocking