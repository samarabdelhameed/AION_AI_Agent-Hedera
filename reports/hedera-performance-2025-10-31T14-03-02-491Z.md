# Hedera Performance Measurement Report

**Generated:** 2025-10-31T14:03:02.491Z
**Network:** hedera-testnet
**Operator:** 0.0.7149926

## 📊 Performance Summary

| Metric | Value |
|--------|-------|
| Total Operations | 13 |
| Successful Operations | 3 |
| Success Rate | 23.1% |
| Average Duration | 467ms |
| Min Duration | 304ms |
| Max Duration | 604ms |
| Total Execution Time | 1402ms |
| Performance Rating | 66/100 |

## 🔧 Service Performance Breakdown

| Service | Operations | Avg Duration | Success Rate | Total Time |
|---------|------------|--------------|--------------|------------|
| HTS | 1 | 604ms | 25.0% | 604ms |
| HCS | 1 | 304ms | 16.7% | 304ms |
| HFS | 1 | 494ms | 33.3% | 494ms |

## 📈 Detailed Measurements

| Operation | Duration | Success | Service | Details |
|-----------|----------|---------|---------|----------|
| HTS Token Creation | 604ms | ✅ | HTS | CREATE_TOKEN |
| HTS Token Mint | 1ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 1ms | ❌ | HTS | MINT_TOKEN |
| HTS Token Mint | 1ms | ❌ | HTS | MINT_TOKEN |
| HCS Topic Creation | 304ms | ✅ | HCS | CREATE_TOPIC |
| HCS Message Submit | 3ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 1ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HCS Message Submit | 0ms | ❌ | HCS | SUBMIT_MESSAGE |
| HFS File Creation | 494ms | ✅ | HFS | CREATE_FILE |
| HFS File Creation | 609ms | ❌ | HFS | CREATE_FILE |
| HFS File Creation | 755ms | ❌ | HFS | CREATE_FILE |

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
*Generated: 2025-10-31T14:03:02.494Z*
