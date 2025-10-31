# AION HFS Model Metadata Storage Report

**Generated:** 2025-10-31T14:01:21.913Z
**Network:** hedera-testnet
**Operator:** 0.0.7149926

## 📊 Storage Summary

| Metric | Value |
|--------|-------|
| Total Files Stored | 6 |
| Total Size | 9270 bytes |
| All Files Verified | ✅ Yes |
| Storage Success | ✅ Yes |

## 📁 Stored Files

| File Name | File ID | Size | Memo |
|-----------|---------|------|------|
| ai-model-metadata-compact.json | `0.0.7168312` | 1826 bytes | AION AI Model Metadata - Compact System Information |
| model-aion-yield-optimizer-v2.1.3.json | `0.0.7168314` | 1940 bytes | AION AI Model: AION Yield Optimization Engine v2.1.3 |
| model-aion-risk-assessor-v1.8.2.json | `0.0.7168316` | 1826 bytes | AION AI Model: AION Risk Assessment Model v1.8.2 |
| model-aion-market-predictor-v3.0.1.json | `0.0.7168318` | 1837 bytes | AION AI Model: AION Market Prediction Engine v3.0.1 |
| ai-models-summary.json | `0.0.7168320` | 292 bytes | AION AI Models Summary - Performance Overview |
| hfs-file-index.json | `0.0.7168322` | 1549 bytes | AION HFS File Index - Complete File Registry |

## 🔗 Hedera Explorer Links

### File Explorer Links
- **ai-model-metadata-compact.json**: [0.0.7168312](https://hashscan.io/testnet/file/0.0.7168312)
- **model-aion-yield-optimizer-v2.1.3.json**: [0.0.7168314](https://hashscan.io/testnet/file/0.0.7168314)
- **model-aion-risk-assessor-v1.8.2.json**: [0.0.7168316](https://hashscan.io/testnet/file/0.0.7168316)
- **model-aion-market-predictor-v3.0.1.json**: [0.0.7168318](https://hashscan.io/testnet/file/0.0.7168318)
- **ai-models-summary.json**: [0.0.7168320](https://hashscan.io/testnet/file/0.0.7168320)
- **hfs-file-index.json**: [0.0.7168322](https://hashscan.io/testnet/file/0.0.7168322)

### Transaction Explorer Links
- **ai-model-metadata-compact.json**: [B)	>�R���c��n�&��{@�����9�.&����B�X?1%�����L�](https://hashscan.io/testnet/transaction/B)	>�R���c��n�&��{@�����9�.&����B�X?1%�����L�)
- **model-aion-yield-optimizer-v2.1.3.json**: [t��5`�$({㾓�Tݛ�e�ꀐU�ݺ\��"�W���T���ּ-3](https://hashscan.io/testnet/transaction/t��5`�$({㾓�Tݛ�e�ꀐU�ݺ\��"�W���T���ּ-3)
- **model-aion-risk-assessor-v1.8.2.json**: ["]�%h{��*i�h�wT����?�a�3����o�}oK�Ӏ�2b�)�](https://hashscan.io/testnet/transaction/"]�%h{��*i�h�wT����?�a�3����o�}oK�Ӏ�2b�)�)
- **model-aion-market-predictor-v3.0.1.json**: [�WT��&�f���3@W�a��(�%G�-�va�k���^��J4U�`](https://hashscan.io/testnet/transaction/�WT��&�f���3@W�a��(�%G�-�va�k���^��J4U�`)
- **ai-models-summary.json**: [처�bs��>㩻�!	w���Ɋ��#7�X0�%0f����zuֹb�^](https://hashscan.io/testnet/transaction/처�bs��>㩻�!	w���Ɋ��#7�X0�%0f����zuֹb�^)
- **hfs-file-index.json**: [h�ߏ43���
���jOl7o��Q���s�#d����lHP��ch��](https://hashscan.io/testnet/transaction/h�ߏ43���
���jOl7o��Q���s�#d����lHP��ch��)

## 🔐 Verification Details

- **Method:** SHA256 content hashing
- **All Checks Passed:** ✅ Yes
- **Verification Time:** 2025-10-31T14:01:21.913Z

## 🚀 Usage Instructions

To retrieve any file from HFS:

```javascript
const { FileContentsQuery } = require('@hashgraph/sdk');

// Example: Retrieve main metadata file
const fileContents = await new FileContentsQuery()
    .setFileId("0.0.7168312")
    .execute(client);

const metadata = JSON.parse(fileContents.toString('utf8'));
```

---

*This report was generated automatically by the AION HFS Metadata Storage system*
*Timestamp: 2025-10-31T14:01:21.916Z*
