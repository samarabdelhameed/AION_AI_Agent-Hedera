# Design Document

## Overview

The withdraw flow bug is caused by incorrect action routing in the ExecutePage component. Currently, the `handleExecuteGasless` function always defaults to deposit logic regardless of the selected action. This design addresses the complete withdraw flow from action selection to UI updates.

## Architecture

### Current Flow Issues
1. **Action Selection**: User selects "withdraw" in Parameters step ✅
2. **Action Routing**: `handleExecuteGasless` ignores action and defaults to deposit ❌
3. **Transaction Execution**: Always calls `depositWithWallet` ❌
4. **UI Updates**: Shows "Deposit" labels and increases balances ❌
5. **Timeline Recording**: Records as deposit transaction ❌

### Fixed Flow Design
1. **Action Selection**: User selects "withdraw" in Parameters step ✅
2. **Action Routing**: Route to appropriate execution function based on `formData.action`
3. **Transaction Execution**: Call `withdrawWithWallet` for withdraw actions
4. **UI Updates**: Show correct labels and decrease vault balances
5. **Timeline Recording**: Record as withdraw transaction with correct type

## Components and Interfaces

### 1. ExecutePage Component Updates

#### Action Routing Logic
```typescript
// Current problematic code in handleExecuteGasless:
if (formData.action === 'withdraw') {
  // This exists but has issues
} else {
  // Always defaults to deposit
}

// Fixed routing:
switch (formData.action) {
  case 'withdraw':
    receipt = await executeWithdrawFlow(params);
    break;
  case 'deposit':
    receipt = await executeDepositFlow(params);
    break;
  default:
    throw new Error(`Unsupported action: ${formData.action}`);
}
```

#### Minimum Requirement Banner Fix
```typescript
// Current: Always shows deposit minimum
<MinDepositNotice action={formData.action} />

// Fixed: Conditional display based on action
function MinDepositNotice({ action }: { action: string }) {
  if (action === 'deposit') {
    // Show minimum deposit requirement
  } else if (action === 'withdraw') {
    // Show minimum withdraw requirement or hide
  }
}
```

### 2. Transaction Execution Layer

#### Enhanced withdrawWithWallet Function
The existing `withdrawWithWallet` function needs improvements:

```typescript
export async function withdrawWithWallet({ 
  chainId, 
  vaultAddress, 
  amountWei, 
  receiver 
}: WithdrawParams) {
  // 1. Validate user has sufficient shares
  const userShares = await readContract(config, {
    address: vaultAddress,
    abi: contractConfig.vault.abi,
    functionName: 'balanceOf',
    args: [account],
  });

  // 2. Try ERC4626 withdraw (assets-based)
  try {
    const shares = await readContract(config, {
      address: vaultAddress,
      abi: contractConfig.vault.abi,
      functionName: 'previewWithdraw',
      args: [amountWei],
    });

    if (userShares < shares) {
      throw new Error('INSUFFICIENT_SHARES');
    }

    const hash = await writeContract(config, {
      address: vaultAddress,
      abi: contractConfig.vault.abi,
      functionName: 'withdraw',
      args: [amountWei, receiver || account, account],
      value: 0n, // No msg.value for withdraw
    });

    return await waitForTransactionReceipt(config, { hash });
  } catch (error) {
    // 3. Fallback to redeem (shares-based)
    const hash = await writeContract(config, {
      address: vaultAddress,
      abi: contractConfig.vault.abi,
      functionName: 'redeem',
      args: [userShares, receiver || account, account],
      value: 0n,
    });

    return await waitForTransactionReceipt(config, { hash });
  }
}
```

### 3. UI Label Management

#### Dynamic Labels Based on Action
```typescript
// Result screen labels
const getActionLabel = (action: string) => {
  switch (action) {
    case 'withdraw': return 'Withdraw';
    case 'deposit': return 'Deposit';
    case 'rebalance': return 'Rebalance';
    default: return 'Transaction';
  }
};

// Success message
const getSuccessMessage = (action: string) => {
  switch (action) {
    case 'withdraw': return 'Withdrawal completed successfully!';
    case 'deposit': return 'Deposit completed successfully!';
    default: return 'Transaction completed successfully!';
  }
};
```

#### Expected Balance Calculation
```typescript
// Current: Always adds to balance
expectedBalance: currentBalance + (amount * bnbPrice)

// Fixed: Direction-aware calculation
const getExpectedBalance = (action: string, currentBalance: number, amount: number, price: number) => {
  const changeAmount = amount * price;
  switch (action) {
    case 'deposit':
      return {
        vault: currentBalance + changeAmount,
        wallet: walletBalance - changeAmount
      };
    case 'withdraw':
      return {
        vault: currentBalance - changeAmount,
        wallet: walletBalance + changeAmount
      };
    default:
      return { vault: currentBalance, wallet: walletBalance };
  }
};
```

### 4. Timeline Integration

#### Activity Type Mapping
```typescript
// In appendLocalActivity calls
const getActivityType = (action: string): LocalActivity['type'] => {
  switch (action) {
    case 'withdraw': return 'withdraw';
    case 'deposit': return 'deposit';
    case 'rebalance': return 'rebalance';
    default: return 'deposit'; // fallback
  }
};

// Usage in transaction functions
appendLocalActivity({
  type: getActivityType(action), // Dynamic based on actual action
  status: 'completed',
  timestamp: new Date().toISOString(),
  amount: action === 'withdraw' ? -amount : amount, // Negative for withdrawals
  currency: 'BNB',
  txHash: receipt.transactionHash,
  description: `${action.charAt(0).toUpperCase() + action.slice(1)} operation`,
});
```

### 5. State Management and Refetching

#### Post-Transaction Updates
```typescript
// After successful transaction
const refreshData = async () => {
  // Refetch all relevant data
  await Promise.all([
    refetchWalletBalances(), // useWalletOnchain
    refetchVaultData(),      // useVaultOnchain  
    refetchRealData(),       // useRealData
    refetchPortfolioMetrics() // usePortfolioMetrics
  ]);
};

// Call after transaction settles
if (executionStatus === 'confirmed') {
  await refreshData();
}
```

## Data Models

### Transaction Parameters
```typescript
interface TransactionParams {
  action: 'deposit' | 'withdraw' | 'rebalance';
  chainId: number;
  vaultAddress: `0x${string}`;
  amountWei: bigint;
  receiver?: `0x${string}`;
}
```

### Enhanced Activity Type
```typescript
type LocalActivity = {
  id: string;
  type: 'deposit' | 'withdraw' | 'rebalance' | 'yield' | 'decision';
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  amount?: number; // Positive for deposits, negative for withdrawals
  currency?: string;
  txHash?: string;
  description?: string;
  action?: string; // Store original action for debugging
};
```

## Error Handling

### Withdraw-Specific Errors
```typescript
const WITHDRAW_ERRORS = {
  INSUFFICIENT_SHARES: 'You don\'t have enough vault shares to withdraw this amount',
  INSUFFICIENT_ASSETS: 'Vault doesn\'t have enough assets for this withdrawal',
  MIN_WITHDRAW_NOT_MET: 'Amount is below minimum withdrawal requirement',
  FUNCTION_NOT_SUPPORTED: 'Withdraw function not supported by this vault',
};

// Error handling in withdrawWithWallet
catch (error: any) {
  if (error.message?.includes('insufficient')) {
    throw new Error(WITHDRAW_ERRORS.INSUFFICIENT_SHARES);
  }
  // ... other error mappings
}
```

### Validation Layer
```typescript
const validateWithdrawParams = async (params: WithdrawParams) => {
  // Check user shares
  const userShares = await getUserShares(params.vaultAddress, params.account);
  const requiredShares = await previewWithdraw(params.vaultAddress, params.amountWei);
  
  if (userShares < requiredShares) {
    throw new Error(WITHDRAW_ERRORS.INSUFFICIENT_SHARES);
  }

  // Check minimum withdraw if exists
  try {
    const minWithdraw = await getMinWithdrawWei(params.chainId, params.vaultAddress);
    if (params.amountWei < minWithdraw) {
      throw new Error(WITHDRAW_ERRORS.MIN_WITHDRAW_NOT_MET);
    }
  } catch {
    // No minimum withdraw requirement
  }
};
```

## Testing Strategy

### Unit Tests
1. **Action Routing Tests**
   - Test `handleExecuteGasless` routes correctly based on `formData.action`
   - Test deposit action calls `depositWithWallet`
   - Test withdraw action calls `withdrawWithWallet`

2. **Transaction Function Tests**
   - Test `withdrawWithWallet` calls correct contract functions
   - Test fallback from `withdraw` to `redeem`
   - Test error handling for insufficient shares

3. **UI Label Tests**
   - Test labels change based on selected action
   - Test expected balance calculations for both directions
   - Test minimum requirement banner visibility

### Integration Tests
1. **End-to-End Withdraw Flow**
   - Select withdraw action → Confirm → Execute
   - Verify correct contract function called
   - Verify UI shows "Withdraw" labels
   - Verify balances decrease correctly

2. **Timeline Integration**
   - Verify withdraw transactions recorded as 'withdraw' type
   - Verify negative amounts for withdrawals
   - Verify correct icons and colors

### Manual Testing Scenarios
1. **Happy Path**: Withdraw 0.001 BNB from Venus
   - Expected: BscScan shows `withdraw` or `redeem` function
   - Expected: Result screen shows "Withdraw"
   - Expected: Vault balance decreases, wallet balance increases

2. **Error Cases**: 
   - Withdraw more than available shares
   - Withdraw from empty vault
   - Network errors during withdrawal

## Implementation Priority

### Phase 1: Core Fix (High Priority)
1. Fix action routing in `handleExecuteGasless`
2. Enhance `withdrawWithWallet` function
3. Fix minimum requirement banner logic
4. Update result screen labels

### Phase 2: UI Polish (Medium Priority)
1. Fix expected balance calculations
2. Update timeline activity recording
3. Add proper error messages
4. Implement state refetching

### Phase 3: Testing & Validation (Medium Priority)
1. Add comprehensive unit tests
2. Add integration tests
3. Manual testing scenarios
4. Performance optimization

This design ensures the withdraw flow works correctly from action selection through transaction execution to UI updates, matching the behavior users expect when they select "Withdraw".