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

echo "✅ 7. Checking current block number..."
BLOCK=$(cast block-number --rpc-url $RPC)
echo "   Current Block: $BLOCK"
echo ""

echo "════════════════════════════════════════════════"
echo "   ✅ VERIFICATION COMPLETE"
echo "════════════════════════════════════════════════"
echo ""
echo "🔗 View on BscScan:"
echo "   https://testnet.bscscan.com/address/$CONTRACT"
echo ""

