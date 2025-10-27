# Requirements Document

## Introduction

The Execute wizard has a critical bug where selecting "Withdraw" action actually executes a deposit transaction on-chain. This causes incorrect balance updates, wrong UI labels, and misleading transaction history. Users expect withdraw to reduce their vault position and increase their wallet balance, but currently it does the opposite.

## Requirements

### Requirement 1

**User Story:** As a user, I want the withdraw action to actually call the vault's withdraw function, so that my vault position decreases and wallet balance increases correctly.

#### Acceptance Criteria

1. WHEN user selects action = "withdraw" in Parameters step THEN the system SHALL route to withdraw execution path (not deposit)
2. WHEN withdraw transaction is submitted THEN the system SHALL call vault.withdraw() or vault.redeem() function on-chain
3. WHEN withdraw transaction succeeds THEN BscScan SHALL show function name as "withdraw" or "redeem" (not "deposit")
4. WHEN withdraw completes THEN user's vault shares SHALL decrease by the withdrawn amount
5. WHEN withdraw completes THEN user's wallet BNB balance SHALL increase by the withdrawn amount (minus gas)

### Requirement 2

**User Story:** As a user, I want the UI labels and messages to correctly reflect withdraw operations, so that I'm not confused by seeing "Deposit" when I performed a withdraw.

#### Acceptance Criteria

1. WHEN action is "withdraw" in Confirm step THEN minimum requirement banner SHALL show "Minimum withdraw requirement" or be hidden
2. WHEN withdraw transaction completes THEN Result screen SHALL display "Withdraw" (not "Deposit")
3. WHEN withdraw transaction completes THEN success toast SHALL show "Withdraw successful" message
4. WHEN withdraw is recorded in timeline THEN timeline entry SHALL show "Withdraw" with appropriate icon and color
5. WHEN viewing transaction history THEN withdraw transactions SHALL be labeled as "Withdraw" with downward arrow icon

### Requirement 3

**User Story:** As a user, I want the dashboard and vault position to update correctly after a withdraw, so that I can see my actual current balances.

#### Acceptance Criteria

1. WHEN withdraw transaction settles THEN Dashboard vault position SHALL show decreased total balance
2. WHEN withdraw transaction settles THEN Dashboard vault position SHALL show decreased shares amount
3. WHEN withdraw transaction settles THEN Dashboard wallet balance SHALL show increased BNB amount
4. WHEN withdraw transaction settles THEN all balance updates SHALL come from fresh on-chain data (not cached/mock data)
5. WHEN withdraw transaction settles THEN "Expected new balance" calculation SHALL be accurate for withdraw direction

### Requirement 4

**User Story:** As a developer, I want proper error handling and validation for withdraw operations, so that users get clear feedback when withdrawals fail.

#### Acceptance Criteria

1. WHEN user attempts to withdraw more than their vault balance THEN system SHALL show "INSUFFICIENT_SHARES" error
2. WHEN withdraw transaction reverts THEN system SHALL display parsed revert reason
3. WHEN vault doesn't support withdraw function THEN system SHALL fallback to redeem function
4. WHEN withdraw validation fails THEN system SHALL prevent transaction submission
5. WHEN withdraw operation encounters error THEN system SHALL log detailed error information for debugging

### Requirement 5

**User Story:** As a user, I want consistent behavior between deposit and withdraw flows, so that both operations work reliably and predictably.

#### Acceptance Criteria

1. WHEN action routing logic processes "deposit" THEN system SHALL call executeDeposit function
2. WHEN action routing logic processes "withdraw" THEN system SHALL call executeWithdraw function
3. WHEN either operation completes THEN system SHALL refetch all relevant on-chain data
4. WHEN either operation completes THEN system SHALL update UI state consistently
5. WHEN viewing transaction history THEN both deposit and withdraw operations SHALL be clearly distinguishable