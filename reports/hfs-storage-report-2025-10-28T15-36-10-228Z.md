# AION HFS Model Metadata Storage Report

**Generated:** 2025-10-28T15:36:10.228Z
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
| ai-model-metadata-compact.json | `0.0.7152123` | 1826 bytes | AION AI Model Metadata - Compact System Information |
| model-aion-yield-optimizer-v2.1.3.json | `0.0.7152127` | 1940 bytes | AION AI Model: AION Yield Optimization Engine v2.1.3 |
| model-aion-risk-assessor-v1.8.2.json | `0.0.7152128` | 1826 bytes | AION AI Model: AION Risk Assessment Model v1.8.2 |
| model-aion-market-predictor-v3.0.1.json | `0.0.7152131` | 1837 bytes | AION AI Model: AION Market Prediction Engine v3.0.1 |
| ai-models-summary.json | `0.0.7152132` | 292 bytes | AION AI Models Summary - Performance Overview |
| hfs-file-index.json | `0.0.7152133` | 1549 bytes | AION HFS File Index - Complete File Registry |

## 🔗 Hedera Explorer Links

### File Explorer Links
- **ai-model-metadata-compact.json**: [0.0.7152123](https://hashscan.io/testnet/file/0.0.7152123)
- **model-aion-yield-optimizer-v2.1.3.json**: [0.0.7152127](https://hashscan.io/testnet/file/0.0.7152127)
- **model-aion-risk-assessor-v1.8.2.json**: [0.0.7152128](https://hashscan.io/testnet/file/0.0.7152128)
- **model-aion-market-predictor-v3.0.1.json**: [0.0.7152131](https://hashscan.io/testnet/file/0.0.7152131)
- **ai-models-summary.json**: [0.0.7152132](https://hashscan.io/testnet/file/0.0.7152132)
- **hfs-file-index.json**: [0.0.7152133](https://hashscan.io/testnet/file/0.0.7152133)

### Transaction Explorer Links
- **ai-model-metadata-compact.json**: [���Ǡ����P�ϼ������$�����)�z����h���t��~H�6](https://hashscan.io/testnet/transaction/���Ǡ����P�ϼ������$�����)�z����h���t��~H�6)
- **model-aion-yield-optimizer-v2.1.3.json**: [#�،���5�l��2Ԧ���9�бWv� e�Z+�����\�=���](https://hashscan.io/testnet/transaction/#�،���5�l��2Ԧ���9�бWv� e�Z+�����\�=���)
- **model-aion-risk-assessor-v1.8.2.json**: [v�$�+|�ra�$j��6�}���/�d�*�G�	��֟Ab��CϏ���2](https://hashscan.io/testnet/transaction/v�$�+|�ra�$j��6�}���/�d�*�G�	��֟Ab��CϏ���2)
- **model-aion-market-predictor-v3.0.1.json**: [�� !���I�|�Z.�+G�}0A<E����d��Y�c���"k|�,@](https://hashscan.io/testnet/transaction/�� !���I�|�Z.�+G�}0A<E����d��Y�c���"k|�,@)
- **ai-models-summary.json**: [~�`�I=oN�����n6���Doj%��4��{��p�ց�](https://hashscan.io/testnet/transaction/~�`�I=oN�����n6���Doj%��4��{��p�ց�)
- **hfs-file-index.json**: [ ��Z��������-�y}�m�ܨ ���Ι�����ke[��5�)�J4@)](https://hashscan.io/testnet/transaction/ ��Z��������-�y}�m�ܨ ���Ι�����ke[��5�)�J4@))

## 🔐 Verification Details

- **Method:** SHA256 content hashing
- **All Checks Passed:** ✅ Yes
- **Verification Time:** 2025-10-28T15:36:10.229Z

## 🚀 Usage Instructions

To retrieve any file from HFS:

```javascript
const { FileContentsQuery } = require('@hashgraph/sdk');

// Example: Retrieve main metadata file
const fileContents = await new FileContentsQuery()
    .setFileId("0.0.7152123")
    .execute(client);

const metadata = JSON.parse(fileContents.toString('utf8'));
```

---

*This report was generated automatically by the AION HFS Metadata Storage system*
*Timestamp: 2025-10-28T15:36:10.229Z*
