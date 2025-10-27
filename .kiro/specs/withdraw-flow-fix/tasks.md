# Implementation Plan

- [x] 1. Fix core action routing in ExecutePage
  - Update `handleExecuteGasless` function to properly route based on `formData.action`
  - Replace the current if/else logic with a proper switch statement
  - Add console logging for action routing debugging
  - _Requirements: 1.1, 1.2_

- [x] 2. Enhance withdrawWithWallet function with proper ERC4626 support
  - Add user shares validation before attempting withdrawal
  - Implement proper ERC4626 withdraw function with assets parameter
  - Add fallback to redeem function if withdraw fails
  - Add proper error handling for insufficient shares
  - _Requirements: 1.3, 1.4, 4.1, 4.3_

- [x] 3. Fix minimum requirement banner logic
  - Update MinDepositNotice component to be action-aware
  - Add getMinWithdrawWei function call for withdraw actions
  - Hide banner for withdraw if no minimum withdraw requirement exists
  - Add loading and error states for minimum requirement fetching
  - _Requirements: 2.1_

- [x] 4. Update result screen and success messages
  - Create getActionLabel helper function for dynamic labels
  - Update ExecutionProgress component to use action-based labels
  - Update success toast messages to reflect actual action performed
  - Fix "Transaction Successful" message to show correct action type
  - _Requirements: 2.2, 2.3_

- [x] 5. Fix timeline activity recording
  - Update appendLocalActivity calls in both depositWithWallet and withdrawWithWallet
  - Ensure withdraw activities are recorded with type 'withdraw'
  - Set negative amounts for withdraw transactions
  - Add action parameter to activity description
  - _Requirements: 2.4, 2.5_

- [x] 6. Fix expected balance calculations in simulation
  - Create getExpectedBalance helper function with direction-aware math
  - Update simulation result calculation to handle both deposit and withdraw
  - Fix "Expected new balance" display in Confirm step
  - Ensure vault balance decreases and wallet balance increases for withdrawals
  - _Requirements: 3.3, 3.5_

- [x] 7. Implement proper post-transaction state updates
  - Add comprehensive refetch logic after successful transactions
  - Update useWalletOnchain, useVaultOnchain, and useRealData hooks
  - Ensure Dashboard vault position reflects decreased balances after withdraw
  - Remove any cached/mock data that might override live data
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 8. Add withdraw-specific error handling and validation
  - Create WITHDRAW_ERRORS constant with user-friendly messages
  - Add validateWithdrawParams function for pre-transaction validation
  - Implement proper error parsing for contract revert reasons
  - Add insufficient shares validation before transaction submission
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 9. Update ActivityTimeline component for correct withdraw display
  - Ensure determineTransactionType function correctly identifies withdrawals
  - Update getActivityIcon to show downward arrow for withdrawals
  - Update getActivityColor to use red color for withdraw transactions
  - Fix timeline entry labels to show "Withdraw" instead of "Deposit"
  - _Requirements: 2.4, 2.5_

- [x] 10. Add comprehensive logging and debugging
  - Add detailed console logging throughout the withdraw flow
  - Log action routing decisions in handleExecuteGasless
  - Log contract function calls and parameters
  - Add transaction hash and receipt logging for debugging
  - _Requirements: 4.5_

- [x] 11. Create unit tests for withdraw functionality
  - Write tests for action routing logic in ExecutePage
  - Test withdrawWithWallet function with mock contract calls
  - Test error handling for insufficient shares scenarios
  - Test UI label updates based on selected action
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12. Add integration tests for end-to-end withdraw flow
  - Test complete withdraw flow from Parameters to Result
  - Verify correct contract function is called on-chain
  - Test timeline integration and activity recording
  - Test state updates and balance refetching after withdrawal
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_