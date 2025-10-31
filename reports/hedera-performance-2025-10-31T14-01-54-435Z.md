# Hedera Performance Measurement Report

**Generated:** 2025-10-31T14:01:54.435Z
**Network:** hedera-testnet
**Operator:** 0.0.7149926

## 📊 Performance Summary

| Metric | Value |
|--------|-------|
| Total Operations | 13 |
| Successful Operations | 3 |
| Success Rate | 23.1% |
| Average Duration | 450ms |
| Min Duration | 371ms |
| Max Duration | 533ms |
| Total Execution Time | 1350ms |
| Performance Rating | 66/100 |

## 🔧 Service Performance Breakdown

| Service | Operations | Avg Duration | Success Rate | Total Time |
|---------|------------|--------------|--------------|------------|
| HTS | 1 | 533ms | 25.0% | 533ms |
| HCS | 1 | 446ms | 16.7% | 446ms |
| HFS | 1 | 371ms | 33.3% | 371ms |

## 📈 Detailed Measurements

| Operation | Duration | Success | Service | Details |
|-----------|----------|---------|---------|----------|
| HTS Token Creation | 533ms | ✅ | HTS | CREATE_TOKEN |
| HTS Token Mint | 2ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 0ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 0ms | ❌ | HTS | MINT_TOKEN |
| HCS Topic Creation | 446ms | ✅ | HCS | CREATE_TOPIC |
| HCS Message Submit | 2ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 1ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 1ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HFS File Creation | 371ms | ✅ | HFS | CREATE_FILE |
| HFS File Creation | 612ms | ❌ | HFS | CREATE_FILE |
| HFS File Creation | 1174ms | ❌ | HFS | CREATE_FILE |

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
*Generated: 2025-10-31T14:01:54.437Z*
