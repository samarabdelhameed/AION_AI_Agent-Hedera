# Hedera Performance Measurement Report

**Generated:** 2025-10-28T14:36:55.439Z
**Network:** hedera-testnet
**Operator:** 0.0.7149926

## 📊 Performance Summary

| Metric | Value |
|--------|-------|
| Total Operations | 13 |
| Successful Operations | 3 |
| Success Rate | 23.1% |
| Average Duration | 1089ms |
| Min Duration | 469ms |
| Max Duration | 2313ms |
| Total Execution Time | 3266ms |
| Performance Rating | 59/100 |

## 🔧 Service Performance Breakdown

| Service | Operations | Avg Duration | Success Rate | Total Time |
|---------|------------|--------------|--------------|------------|
| HTS | 1 | 484ms | 25.0% | 484ms |
| HCS | 1 | 469ms | 16.7% | 469ms |
| HFS | 1 | 2313ms | 33.3% | 2313ms |

## 📈 Detailed Measurements

| Operation | Duration | Success | Service | Details |
|-----------|----------|---------|---------|----------|
| HTS Token Creation | 484ms | ✅ | HTS | CREATE_TOKEN |
| HTS Token Mint | 0ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 0ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 0ms | ❌ | HTS | MINT_TOKEN |
| HCS Topic Creation | 469ms | ✅ | HCS | CREATE_TOPIC |
| HCS Message Submit | 1ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HFS File Creation | 2313ms | ✅ | HFS | CREATE_FILE |
| HFS File Creation | 652ms | ❌ | HFS | CREATE_FILE |
| HFS File Creation | 3386ms | ❌ | HFS | CREATE_FILE |

## 🌐 Network Characteristics

- **Network**: Hedera Testnet
- **Consensus Algorithm**: Hashgraph
- **Finality Type**: Immediate
- **Average Confirmation Time**: 3-5 seconds
- **Fee Structure**: Fixed HBAR fees
- **Theoretical Throughput**: 10,000+ TPS theoretical

## 💪 Strengths

- Fast transaction processing under 2 seconds
- Immediate finality without confirmation delays
- Fixed fee structure provides cost predictability
- High theoretical throughput (10,000+ TPS)

## 🔧 Optimization Opportunities

- Improve error handling and retry logic
- Implement transaction batching for bulk operations
- Consider connection pooling for high-volume scenarios

---

*This report provides comprehensive performance analysis of Hedera Hashgraph operations*
*Generated: 2025-10-28T14:36:55.440Z*
