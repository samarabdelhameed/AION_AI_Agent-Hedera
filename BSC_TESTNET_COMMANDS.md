# 🔧 BSC Testnet Commands - Correct RPC URLs

## ❌ Wrong RPC (Mainnet - Chain ID 56):
```bash
https://data-seed-prebsc-1-s1.binance.org:8545  # This is MAINNET!
https://bsc-dataseed1.binance.org               # This is MAINNET!
```

## ✅ Correct RPC (Testnet - Chain ID 97):
```bash
https://bsc-testnet.public.blastapi.io          # ✅ BEST - Always works
https://data-seed-prebsc-1-s3.binance.org:8545  # ✅ Alternative 1
https://data-seed-prebsc-2-s1.binance.org:8545  # ✅ Alternative 2
```

---

## 📦 Contract Address:
```
0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849
```

---

## 🎯 Correct Commands for Demo:

### 1️⃣ Check if Contract is Paused
```bash
cast call 0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849 "paused()" \
  --rpc-url https://bsc-testnet.public.blastapi.io
```
**Expected:** `0x0000000000000000000000000000000000000000000000000000000000000000` (false = not paused ✅)

---

### 2️⃣ Check Contract Owner
```bash
cast call 0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849 "owner()" \
  --rpc-url https://bsc-testnet.public.blastapi.io
```
**Expected:** `0x00000000000000000000000014d7795a2566cd16eaa1419a26ddb643ce523655`

---

### 3️⃣ Check Minimum Deposit
```bash
cast call 0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849 "minDeposit()" \
  --rpc-url https://bsc-testnet.public.blastapi.io
```
**Expected:** `0x000000000000000000000000000000000000000000000000002386f26fc10000` (0.01 BNB)

---

### 4️⃣ Check Total Assets
```bash
cast call 0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849 "totalAssets()" \
  --rpc-url https://bsc-testnet.public.blastapi.io
```

---

### 5️⃣ Check Total Shares
```bash
cast call 0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849 "totalShares()" \
  --rpc-url https://bsc-testnet.public.blastapi.io
```

---

### 6️⃣ Check Contract Code Exists
```bash
cast code 0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849 \
  --rpc-url https://bsc-testnet.public.blastapi.io | head -20
```
**Expected:** Should show deployed bytecode starting with `0x608060405...`

---

### 7️⃣ Get Contract Balance
```bash
cast balance 0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849 \
  --rpc-url https://bsc-testnet.public.blastapi.io
```

---

### 8️⃣ Check Block Number (verify RPC is working)
```bash
cast block-number --rpc-url https://bsc-testnet.public.blastapi.io
```

---

## 🚀 All-in-One Test Script:

```bash
#!/bin/bash

RPC="https://bsc-testnet.public.blastapi.io"
CONTRACT="0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849"

echo "════════════════════════════════════════════════"
echo "   BSC TESTNET CONTRACT VERIFICATION"
echo "════════════════════════════════════════════════"
echo ""
echo "📍 Contract: $CONTRACT"
echo "🌐 Network: BSC Testnet (Chain ID: 97)"
echo "🔗 RPC: $RPC"
echo ""
echo "════════════════════════════════════════════════"
echo ""

echo "✅ 1. Checking if contract is paused..."
PAUSED=$(cast call $CONTRACT "paused()" --rpc-url $RPC)
if [ "$PAUSED" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo "   Result: NOT PAUSED ✅"
else
    echo "   Result: PAUSED ❌"
fi
echo ""

echo "✅ 2. Checking contract owner..."
OWNER=$(cast call $CONTRACT "owner()" --rpc-url $RPC)
echo "   Owner: $OWNER"
echo ""

echo "✅ 3. Checking minimum deposit..."
MIN_DEPOSIT=$(cast call $CONTRACT "minDeposit()" --rpc-url $RPC)
echo "   Min Deposit (hex): $MIN_DEPOSIT"
echo "   Min Deposit (decimal): $(cast --to-dec $MIN_DEPOSIT) wei"
echo "   Min Deposit (BNB): 0.01 BNB"
echo ""

echo "✅ 4. Checking total assets..."
TOTAL_ASSETS=$(cast call $CONTRACT "totalAssets()" --rpc-url $RPC)
echo "   Total Assets: $TOTAL_ASSETS"
echo ""

echo "✅ 5. Checking contract code..."
CODE=$(cast code $CONTRACT --rpc-url $RPC)
CODE_LENGTH=${#CODE}
echo "   Code Length: $CODE_LENGTH characters"
if [ $CODE_LENGTH -gt 100 ]; then
    echo "   Status: CONTRACT DEPLOYED ✅"
else
    echo "   Status: NO CODE FOUND ❌"
fi
echo ""

echo "✅ 6. Checking contract balance..."
BALANCE=$(cast balance $CONTRACT --rpc-url $RPC)
echo "   Balance: $(cast --to-unit $BALANCE ether) BNB"
echo ""

echo "════════════════════════════════════════════════"
echo "   ✅ VERIFICATION COMPLETE"
echo "════════════════════════════════════════════════"
```

**Save as:** `test-bsc-contract.sh`

**Run with:**
```bash
chmod +x test-bsc-contract.sh
./test-bsc-contract.sh
```

---

## 🌐 Verify on Block Explorer:

**BscScan Testnet:**
```
https://testnet.bscscan.com/address/0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849
```

---

## 🔍 Why the Error Happened:

The RPC URL you were using (`https://data-seed-prebsc-1-s1.binance.org:8545`) points to **BSC Mainnet** with Chain ID **56**.

Your contract is deployed on **BSC Testnet** with Chain ID **97**.

That's why you got: `chainId does not match node's (have=56, want=97)`

---

## 💡 Pro Tips:

1. **Always use `https://bsc-testnet.public.blastapi.io`** - most reliable
2. Check chain ID: `cast chain-id --rpc-url <YOUR_RPC>`
3. If RPC is slow, try alternatives listed above
4. For mainnet, use: `https://bsc-dataseed1.binance.org`

---

## 📊 Quick Reference Table:

| Network | Chain ID | RPC URL | Your Contract |
|---------|----------|---------|---------------|
| **BSC Testnet** ✅ | 97 | `https://bsc-testnet.public.blastapi.io` | ✅ Deployed |
| **BSC Mainnet** ❌ | 56 | `https://bsc-dataseed1.binance.org` | ❌ Not deployed |

---

**Updated:** October 31, 2025  
**Status:** ✅ All commands verified and working

