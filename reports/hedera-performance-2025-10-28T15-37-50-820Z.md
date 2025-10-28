# Hedera Performance Measurement Report

**Generated:** 2025-10-28T15:37:50.820Z
**Network:** hedera-testnet
**Operator:** 0.0.7149926

## 📊 Performance Summary

| Metric | Value |
|--------|-------|
| Total Operations | 13 |
| Successful Operations | 3 |
| Success Rate | 23.1% |
| Average Duration | 1045ms |
| Min Duration | 449ms |
| Max Duration | 1638ms |
| Total Execution Time | 3136ms |
| Performance Rating | 61/100 |

## 🔧 Service Performance Breakdown

| Service | Operations | Avg Duration | Success Rate | Total Time |
|---------|------------|--------------|--------------|------------|
| HTS | 1 | 449ms | 25.0% | 449ms |
| HCS | 1 | 1638ms | 16.7% | 1638ms |
| HFS | 1 | 1049ms | 33.3% | 1049ms |

## 📈 Detailed Measurements

| Operation | Duration | Success | Service | Details |
|-----------|----------|---------|---------|----------|
| HTS Token Creation | 449ms | ✅ | HTS | CREATE_TOKEN |
| HTS Token Mint | 2ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 0ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 0ms | ❌ | HTS | MINT_TOKEN |
| HCS Topic Creation | 1638ms | ✅ | HCS | CREATE_TOPIC |
| HCS Message Submit | 1ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 1ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HFS File Creation | 1049ms | ✅ | HFS | CREATE_FILE |
| HFS File Creation | 341ms | ❌ | HFS | CREATE_FILE |
| HFS File Creation | 738ms | ❌ | HFS | CREATE_FILE |

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
*Generated: 2025-10-28T15:37:50.823Z*
