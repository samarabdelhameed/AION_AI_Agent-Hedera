// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/hedera/AIONVaultHedera.sol";

/**
 * @title SimpleHederaTest
 * @dev Simple test suite for AIONVaultHedera with real scenarios
 */
contract SimpleHederaTest is Test {
    AIONVaultHedera public vault;

    // Test accounts
    address public owner;
    address public aiAgent;
    address public user1;
    address public user2;

    // Test constants with real values
    uint256 constant MIN_DEPOSIT = 0.001 ether;
    uint256 constant MEDIUM_DEPOSIT = 1 ether;
    uint256 constant LARGE_DEPOSIT = 10 ether;

    // Events for testing
    event Deposit(
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint256 htsShares
    );
    event Withdraw(
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint256 htsShares
    );
    event AIRebalance(
        address indexed agent,
        uint256 indexed decisionId,
        uint256 timestamp,
        string decisionCid,
        uint256 fromStrategy,
        uint256 toStrategy,
        uint256 amount
    );

    function setUp() public {
        owner = address(this);
        aiAgent = makeAddr("aiAgent");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy vault
        vault = new AIONVaultHedera(owner);

        // Set up AI agent
        vault.setAIAgent(aiAgent);

        // Fund test accounts with realistic amounts
        vm.deal(user1, 100 ether);
        vm.deal(user2, 50 ether);
        vm.deal(aiAgent, 10 ether);

        // Initialize HTS share token (skip on non-Hedera chains)
        try
            vault.initializeShareToken("AION Vault Shares", "AION", 18)
        {} catch {
            // Ignore in local EVM where Hedera precompile is unavailable
        }
    }

    function testBasicDepositWithdraw() public {
        // Skip if HTS not initialized (local testing)
        if (!vault.htsTokenManager().isTokenActive()) {
            vm.skip(true);
            return;
        }
        
        uint256 depositAmount = MEDIUM_DEPOSIT;

        // Test deposit
        vm.prank(user1);
        vault.deposit{value: depositAmount}();

        // Verify deposit
        assertGt(vault.sharesOf(user1), 0, "User should have shares");
        assertEq(
            vault.principalOf(user1),
            depositAmount,
            "Principal should match deposit"
        );

        // Test withdrawal
        uint256 userShares = vault.sharesOf(user1);
        vm.prank(user1);
        vault.withdraw(userShares);

        // Verify withdrawal
        assertEq(vault.sharesOf(user1), 0, "User should have no shares");
        assertEq(vault.principalOf(user1), 0, "Principal should be zero");
    }

    function testMultipleUsersDeposit() public {
        // Skip if HTS not initialized (local testing)
        if (!vault.htsTokenManager().isTokenActive()) {
            vm.skip(true);
            return;
        }
        
        // User 1 deposits
        vm.prank(user1);
        vault.deposit{value: LARGE_DEPOSIT}();

        // User 2 deposits
        vm.prank(user2);
        vault.deposit{value: MEDIUM_DEPOSIT}();

        // Verify both users have shares
        assertGt(vault.sharesOf(user1), 0, "User1 should have shares");
        assertGt(vault.sharesOf(user2), 0, "User2 should have shares");

        // User1 should have more shares (larger deposit)
        assertTrue(
            vault.sharesOf(user1) > vault.sharesOf(user2),
            "User1 should have more shares"
        );

        // Verify total shares
        uint256 totalShares = vault.totalShares();
        assertEq(
            totalShares,
            vault.sharesOf(user1) + vault.sharesOf(user2),
            "Total shares should match sum"
        );
    }

    function testAIDecisionLogging() public {
        // Skip if HTS not initialized (local testing)
        if (!vault.htsTokenManager().isTokenActive()) {
            vm.skip(true);
            return;
        }
        
        // Make initial deposit
        vm.prank(user1);
        vault.deposit{value: MEDIUM_DEPOSIT}();

        // AI agent records a decision
        vm.prank(aiAgent);
        uint256 decisionId = vault.recordAIDecision(
            "REBALANCE_STRATEGY",
            address(0), // fromStrategy
            address(0x123), // toStrategy
            5 ether, // amount
            "Market conditions favor higher yield strategy",
            "hcs_msg_123", // hcsMessageId
            "hfs_file_456" // hfsFileId
        );

        // Verify decision was recorded
        assertGt(decisionId, 0, "Decision ID should be valid");
        assertEq(vault.aiDecisionCount(), 1, "Should have 1 AI decision");

        // Get decision details
        AIONVaultHedera.AIDecision memory decision = vault.getAIDecision(
            decisionId
        );

        assertEq(
            decision.decisionType,
            "REBALANCE_STRATEGY",
            "Decision type should match"
        );
        assertEq(
            decision.toStrategy,
            address(0x123),
            "To strategy should match"
        );
        assertEq(decision.amount, 5 ether, "Amount should match");
    }

    function testRealWorldScenario() public {
        // Skip if HTS not initialized (local testing)
        if (!vault.htsTokenManager().isTokenActive()) {
            vm.skip(true);
            return;
        }
        
        // Phase 1: Multiple users deposit different amounts
        vm.prank(user1);
        vault.deposit{value: 25 ether}(); // Whale deposit

        vm.prank(user2);
        vault.deposit{value: 5 ether}(); // Retail deposit

        // Phase 2: AI makes rebalancing decision
        vm.prank(aiAgent);
        vault.recordAIDecision(
            "MARKET_REBALANCE",
            address(0x100), // Venus strategy
            address(0x200), // PancakeSwap strategy
            15 ether, // amount to rebalance
            "Market volatility increased, moving to higher yield strategy",
            "hcs_rebalance_001",
            "hfs_model_v2"
        );

        // Phase 3: Partial withdrawals
        uint256 user1Shares = vault.sharesOf(user1);
        uint256 user2Shares = vault.sharesOf(user2);

        vm.prank(user1);
        vault.withdraw(user1Shares / 4); // Withdraw 25%

        vm.prank(user2);
        vault.withdraw(user2Shares / 2); // Withdraw 50%

        // Phase 4: Verify final state
        assertGt(vault.sharesOf(user1), 0, "User1 should still have shares");
        assertGt(vault.sharesOf(user2), 0, "User2 should still have shares");
        assertEq(vault.aiDecisionCount(), 1, "Should have 1 AI decision");

        // Verify proportional withdrawals
        assertTrue(
            vault.sharesOf(user1) > vault.sharesOf(user2),
            "User1 should have more shares"
        );
    }

    function testPerformanceMetrics() public {
        // Skip if HTS not initialized (local testing)
        if (!vault.htsTokenManager().isTokenActive()) {
            vm.skip(true);
            return;
        }
        
        // Test with realistic performance data
        uint256 startTime = block.timestamp;

        // Execute operations
        vm.prank(user1);
        vault.deposit{value: 10 ether}();

        vm.prank(user2);
        vault.deposit{value: 15 ether}();

        // AI decision
        vm.prank(aiAgent);
        vault.recordAIDecision(
            "PERFORMANCE_OPTIMIZATION",
            address(0),
            address(0x300),
            12 ether,
            "Optimizing for higher APY",
            "hcs_perf_001",
            "hfs_perf_model"
        );

        uint256 endTime = block.timestamp;

        // Verify metrics
        assertGt(endTime, startTime, "Time should have passed");
        assertGt(vault.totalShares(), 0, "Should have total shares");
        assertEq(vault.aiDecisionCount(), 1, "Should have AI decision");

        // Test vault metrics
        (
            uint256 totalValueLocked,
            uint256 totalUsers,
            uint256 totalDecisions,
            uint256 averageDecisionInterval,
            uint256 lastDecisionTime
        ) = vault.getVaultMetrics();

        assertGt(totalValueLocked, 0, "Should have TVL");
        assertGt(totalDecisions, 0, "Should have decisions");
        assertGt(lastDecisionTime, 0, "Should have last decision time");
    }

    function testErrorHandling() public {
        // Test deposit below minimum
        vm.prank(user1);
        vm.expectRevert("Below minimum deposit");
        vault.deposit{value: 0.0001 ether}();

        // Test withdrawal without shares
        vm.prank(user2);
        vm.expectRevert("Insufficient shares");
        vault.withdraw(1000);

        // Test unauthorized AI decision
        vm.prank(user1);
        vm.expectRevert("Only AI agent");
        vault.recordAIDecision(
            "UNAUTHORIZED_DECISION",
            address(0),
            address(0x400),
            1 ether,
            "This should fail",
            "hcs_unauth",
            "hfs_unauth"
        );
    }

    function testEmergencyPause() public {
        // Skip if HTS not initialized (local testing)
        if (!vault.htsTokenManager().isTokenActive()) {
            vm.skip(true);
            return;
        }
        
        // Make deposit first
        vm.prank(user1);
        vault.deposit{value: MEDIUM_DEPOSIT}();

        // Pause vault
        vault.pause();

        // Test that operations are blocked
        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        vault.deposit{value: MEDIUM_DEPOSIT}();

        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        vault.withdraw(vault.sharesOf(user1));

        // Unpause and test normal operation
        vault.unpause();

        vm.prank(user1);
        vault.withdraw(vault.sharesOf(user1));

        assertEq(
            vault.sharesOf(user1),
            0,
            "Should be able to withdraw after unpause"
        );
    }

    function testDataIntegrity() public {
        // Skip if HTS not initialized (local testing)
        if (!vault.htsTokenManager().isTokenActive()) {
            vm.skip(true);
            return;
        }
        
        uint256 initialBalance = address(vault).balance;
        uint256 depositAmount = 20 ether;

        vm.prank(user1);
        vault.deposit{value: depositAmount}();

        // Verify balance changes
        assertEq(
            address(vault).balance,
            initialBalance + depositAmount,
            "Vault balance should increase"
        );
        assertEq(
            vault.sharesOf(user1),
            depositAmount,
            "User shares should equal deposit (first deposit)"
        );
        assertEq(
            vault.totalShares(),
            depositAmount,
            "Total shares should match"
        );

        // Test withdrawal integrity
        vm.prank(user1);
        vault.withdraw(vault.sharesOf(user1));

        assertEq(vault.sharesOf(user1), 0, "User should have no shares");
        assertEq(vault.totalShares(), 0, "Total shares should be zero");
        // Note: Withdraw amount verification would require the function to return the amount
    }

    receive() external payable {}
}
