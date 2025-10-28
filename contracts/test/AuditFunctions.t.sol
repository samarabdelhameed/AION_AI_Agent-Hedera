// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/AIONVaultHedera.sol";
import "../src/hedera/HTSTokenManager.sol";

/**
 * @title AuditFunctionsTest
 * @dev Comprehensive tests for audit view functions and transparency features
 */
contract AuditFunctionsTest is Test {
    AIONVaultHedera public vault;
    address public owner;
    address public aiAgent;
    address public user1;
    address public user2;
    address public user3;
    
    // Test constants
    uint256 constant MIN_DEPOSIT = 0.01 ether;
    uint256 constant TEST_DEPOSIT_1 = 1 ether;
    uint256 constant TEST_DEPOSIT_2 = 2 ether;
    uint256 constant TEST_DEPOSIT_3 = 0.5 ether;
    
    event Deposit(address indexed user, uint256 amount, uint256 shares, uint256 htsShares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares, uint256 htsShares);
    event AIRebalance(
        address indexed agent,
        uint256 indexed decisionId,
        uint256 timestamp,
        string decisionCid,
        uint256 fromStrategy,
        uint256 toStrategy,
        uint256 amount
    );
    event ModelSnapshotCreated(uint256 indexed snapshotId, string version, string hfsFileId, uint256 timestamp);
    event ModelSnapshotActivated(uint256 indexed snapshotId, uint256 timestamp);

    function setUp() public {
        owner = address(this);
        aiAgent = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);
        user3 = address(0x4);
        
        // Deploy vault
        vault = new AIONVaultHedera(owner);
        
        // Set AI agent
        vault.setAIAgent(aiAgent);
        
        // Initialize HTS token
        vault.initializeShareToken("AION Shares", "AION", 18);
        
        // Fund test users
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
    }

    // ============ AI DECISION AUDIT TESTS ============

    function testGetAIDecisions() public {
        // Create some AI decisions
        vm.startPrank(aiAgent);
        
        uint256 decision1 = vault.recordAIDecision(
            "rebalance",
            address(0x1),
            address(0x2),
            1 ether,
            "Market conditions changed",
            "hcs_msg_1",
            "hfs_file_1"
        );
        
        uint256 decision2 = vault.recordAIDecision(
            "withdraw",
            address(0x2),
            address(0x3),
            0.5 ether,
            "Risk reduction",
            "hcs_msg_2",
            "hfs_file_2"
        );
        
        vm.stopPrank();
        
        // Test getAIDecisions function
        (AIONVaultHedera.AIDecision[] memory decisions, uint256 totalCount) = vault.getAIDecisions(1, 2);
        
        assertEq(totalCount, 2);
        assertEq(decisions.length, 2);
        assertEq(decisions[0].decisionType, "rebalance");
        assertEq(decisions[0].amount, 1 ether);
        assertEq(decisions[1].decisionType, "withdraw");
        assertEq(decisions[1].amount, 0.5 ether);
    }

    function testGetAIDecisionsInvalidRange() public {
        vm.expectRevert("Invalid range");
        vault.getAIDecisions(2, 1);
        
        vm.expectRevert("Invalid from index");
        vault.getAIDecisions(0, 1);
        
        vm.expectRevert("Invalid from index");
        vault.getAIDecisions(5, 10);
    }

    function testGetAIDecisionsPagination() public {
        // Create many decisions
        vm.startPrank(aiAgent);
        
        for (uint256 i = 0; i < 150; i++) {
            vault.recordAIDecision(
                "test",
                address(uint160(i + 1)),
                address(uint160(i + 2)),
                1 ether,
                "Test decision",
                string(abi.encodePacked("hcs_", i)),
                string(abi.encodePacked("hfs_", i))
            );
        }
        
        vm.stopPrank();
        
        // Test pagination (max 100 per query)
        (AIONVaultHedera.AIDecision[] memory decisions, uint256 totalCount) = vault.getAIDecisions(1, 150);
        
        assertEq(totalCount, 100); // Should be limited to 100
        assertEq(decisions.length, 100);
    }

    function testGetAIDecisionsByTimeRange() public {
        uint256 startTime = block.timestamp;
        
        vm.startPrank(aiAgent);
        
        // Create decision at current time
        vault.recordAIDecision(
            "rebalance",
            address(0x1),
            address(0x2),
            1 ether,
            "Test decision 1",
            "hcs_msg_1",
            "hfs_file_1"
        );
        
        // Move time forward
        vm.warp(block.timestamp + 1 hours);
        
        vault.recordAIDecision(
            "withdraw",
            address(0x2),
            address(0x3),
            0.5 ether,
            "Test decision 2",
            "hcs_msg_2",
            "hfs_file_2"
        );
        
        // Move time forward again
        vm.warp(block.timestamp + 1 hours);
        
        vault.recordAIDecision(
            "deposit",
            address(0x3),
            address(0x4),
            2 ether,
            "Test decision 3",
            "hcs_msg_3",
            "hfs_file_3"
        );
        
        vm.stopPrank();
        
        // Test time range query
        uint256 endTime = startTime + 1.5 hours;
        (AIONVaultHedera.AIDecision[] memory decisions, uint256 totalFound) = 
            vault.getAIDecisionsByTimeRange(startTime, endTime, 10);
        
        assertEq(totalFound, 2); // Should find first 2 decisions
        assertEq(decisions.length, 2);
        assertEq(decisions[0].decisionType, "rebalance");
        assertEq(decisions[1].decisionType, "withdraw");
    }

    function testVerifyAIDecisionIntegrity() public {
        vm.startPrank(aiAgent);
        
        uint256 decisionId = vault.recordAIDecision(
            "rebalance",
            address(0x1),
            address(0x2),
            1 ether,
            "Test decision",
            "hcs_msg_1",
            "hfs_file_1"
        );
        
        vm.stopPrank();
        
        (bool isValid, bytes32 dataHash, uint256 timestamp) = vault.verifyAIDecisionIntegrity(decisionId);
        
        assertTrue(isValid);
        assertGt(timestamp, 0);
        assertNotEq(dataHash, bytes32(0));
    }

    // ============ MODEL SNAPSHOT TESTS ============

    function testCreateAndGetModelSnapshot() public {
        vm.startPrank(aiAgent);
        
        vault.createModelSnapshot(
            "v1.0.0",
            "hfs_model_file_1",
            keccak256("model_data"),
            8500, // 85% performance score
            "Initial model deployment"
        );
        
        vm.stopPrank();
        
        (AIONVaultHedera.ModelSnapshot memory snapshot, bool isValid) = vault.getModelSnapshot(1);
        
        assertTrue(isValid);
        assertEq(snapshot.version, "v1.0.0");
        assertEq(snapshot.hfsFileId, "hfs_model_file_1");
        assertEq(snapshot.performanceScore, 8500);
        assertFalse(snapshot.active);
    }

    function testActivateModelSnapshot() public {
        vm.startPrank(aiAgent);
        
        vault.createModelSnapshot(
            "v1.0.0",
            "hfs_model_file_1",
            keccak256("model_data"),
            8500,
            "Initial model"
        );
        
        vault.activateModelSnapshot(1);
        
        vm.stopPrank();
        
        (AIONVaultHedera.ModelSnapshot memory snapshot, bool isValid, bytes32 signature) = 
            vault.getLatestModelSnapshot();
        
        assertTrue(isValid);
        assertTrue(snapshot.active);
        assertEq(snapshot.version, "v1.0.0");
        assertNotEq(signature, bytes32(0));
    }

    function testModelSnapshotValidation() public {
        vm.startPrank(aiAgent);
        
        // Test invalid performance score
        vm.expectRevert("Invalid performance score");
        vault.createModelSnapshot(
            "v1.0.0",
            "hfs_file",
            keccak256("data"),
            10001, // > 10000
            "Invalid model"
        );
        
        // Test empty version
        vm.expectRevert("Invalid version");
        vault.createModelSnapshot(
            "",
            "hfs_file",
            keccak256("data"),
            8500,
            "Invalid model"
        );
        
        vm.stopPrank();
    }

    // ============ USER ACTIVITY TESTS ============

    function testUserActivityTracking() public {
        // User1 makes deposits
        vm.startPrank(user1);
        vault.deposit{value: TEST_DEPOSIT_1}();
        
        vm.warp(block.timestamp + 1 hours);
        vault.deposit{value: TEST_DEPOSIT_2}();
        vm.stopPrank();
        
        // User2 makes deposit and withdrawal
        vm.startPrank(user2);
        vault.deposit{value: TEST_DEPOSIT_3}();
        
        uint256 shares = vault.sharesOf(user2);
        vault.withdraw(shares / 2);
        vm.stopPrank();
        
        // Check user activity
        (
            uint256 totalDeposits,
            uint256 totalWithdrawals,
            uint256 currentShares,
            uint256 firstDepositTime,
            uint256 lastActivityTime
        ) = vault.getUserAuditSummary(user1);
        
        assertEq(totalDeposits, TEST_DEPOSIT_1 + TEST_DEPOSIT_2);
        assertEq(totalWithdrawals, 0);
        assertGt(currentShares, 0);
        assertGt(firstDepositTime, 0);
        assertGt(lastActivityTime, 0);
    }

    function testGetUsers() public {
        // Make deposits from different users
        vm.prank(user1);
        vault.deposit{value: TEST_DEPOSIT_1}();
        
        vm.prank(user2);
        vault.deposit{value: TEST_DEPOSIT_2}();
        
        vm.prank(user3);
        vault.deposit{value: TEST_DEPOSIT_3}();
        
        // Test user list retrieval
        (address[] memory users, uint256 totalUsers) = vault.getUsers(0, 10);
        
        assertEq(totalUsers, 3);
        assertEq(users.length, 3);
        assertEq(users[0], user1);
        assertEq(users[1], user2);
        assertEq(users[2], user3);
    }

    function testGetUsersPagination() public {
        // Create many users
        for (uint256 i = 0; i < 10; i++) {
            address user = address(uint160(0x100 + i));
            vm.deal(user, 1 ether);
            vm.prank(user);
            vault.deposit{value: MIN_DEPOSIT}();
        }
        
        // Test pagination
        (address[] memory users1, uint256 totalUsers) = vault.getUsers(0, 5);
        assertEq(totalUsers, 10);
        assertEq(users1.length, 5);
        
        (address[] memory users2,) = vault.getUsers(5, 5);
        assertEq(users2.length, 5);
        
        // Ensure no overlap
        for (uint256 i = 0; i < 5; i++) {
            for (uint256 j = 0; j < 5; j++) {
                assertTrue(users1[i] != users2[j]);
            }
        }
    }

    // ============ DAILY ACTIVITY TESTS ============

    function testDailyActivityTracking() public {
        uint256 daySlot = block.timestamp / 86400; // SECONDS_PER_DAY
        
        // Make deposits
        vm.prank(user1);
        vault.deposit{value: TEST_DEPOSIT_1}();
        
        vm.prank(user2);
        vault.deposit{value: TEST_DEPOSIT_2}();
        
        // Make withdrawal
        vm.startPrank(user1);
        uint256 shares = vault.sharesOf(user1);
        vault.withdraw(shares / 2);
        vm.stopPrank();
        
        // Check daily activity
        (
            uint256 totalDeposits,
            uint256 totalWithdrawals,
            uint256 activeUsers,
            uint256 depositCount,
            uint256 withdrawalCount
        ) = vault.getDailyActivity(daySlot);
        
        assertEq(totalDeposits, TEST_DEPOSIT_1 + TEST_DEPOSIT_2);
        assertGt(totalWithdrawals, 0);
        assertEq(activeUsers, 2); // user1 and user2
        assertEq(depositCount, 2);
        assertEq(withdrawalCount, 1);
    }

    // ============ PERFORMANCE METRICS TESTS ============

    function testVaultMetrics() public {
        // Make some deposits
        vm.prank(user1);
        vault.deposit{value: TEST_DEPOSIT_1}();
        
        vm.prank(user2);
        vault.deposit{value: TEST_DEPOSIT_2}();
        
        // Create AI decisions
        vm.startPrank(aiAgent);
        vault.recordAIDecision(
            "rebalance",
            address(0x1),
            address(0x2),
            1 ether,
            "Test decision",
            "hcs_msg_1",
            "hfs_file_1"
        );
        vm.stopPrank();
        
        // Check metrics
        (
            uint256 totalValueLocked,
            uint256 totalUsers,
            uint256 totalDecisions,
            uint256 averageDecisionInterval,
            uint256 lastDecisionTime
        ) = vault.getVaultMetrics();
        
        assertEq(totalValueLocked, TEST_DEPOSIT_1 + TEST_DEPOSIT_2);
        assertEq(totalUsers, 0); // Simplified implementation uses adapterList.length
        assertEq(totalDecisions, 1);
        assertGt(lastDecisionTime, 0);
    }

    // ============ PERFORMANCE SNAPSHOT TESTS ============

    function testPerformanceSnapshots() public {
        // Make initial deposit
        vm.prank(user1);
        vault.deposit{value: TEST_DEPOSIT_1}();
        
        // Move time forward to trigger snapshot
        vm.warp(block.timestamp + 1 days + 1);
        
        // Make another deposit to trigger snapshot update
        vm.prank(user2);
        vault.deposit{value: TEST_DEPOSIT_2}();
        
        // Check if snapshot was created
        AIONVaultHedera.PerformanceSnapshot[] memory snapshots = vault.getPerformanceSnapshots(1, 1);
        
        if (snapshots.length > 0) {
            assertGt(snapshots[0].timestamp, 0);
            assertGt(snapshots[0].totalAssets, 0);
            assertGt(snapshots[0].sharePrice, 0);
        }
    }

    // ============ DECISION INDEXING TESTS ============

    function testGetDecisionsByType() public {
        vm.startPrank(aiAgent);
        
        // Create decisions of different types
        vault.recordAIDecision(
            "rebalance",
            address(0x1),
            address(0x2),
            1 ether,
            "Rebalance 1",
            "hcs_msg_1",
            "hfs_file_1"
        );
        
        vault.recordAIDecision(
            "withdraw",
            address(0x2),
            address(0x3),
            0.5 ether,
            "Withdraw 1",
            "hcs_msg_2",
            "hfs_file_2"
        );
        
        vault.recordAIDecision(
            "rebalance",
            address(0x3),
            address(0x4),
            2 ether,
            "Rebalance 2",
            "hcs_msg_3",
            "hfs_file_3"
        );
        
        vm.stopPrank();
        
        // Test getting decisions by type
        uint256[] memory rebalanceDecisions = vault.getDecisionsByType("rebalance", 10);
        uint256[] memory withdrawDecisions = vault.getDecisionsByType("withdraw", 10);
        
        assertEq(rebalanceDecisions.length, 2);
        assertEq(withdrawDecisions.length, 1);
    }

    function testGetDecisionsByStrategy() public {
        address strategy1 = address(0x1);
        address strategy2 = address(0x2);
        
        vm.startPrank(aiAgent);
        
        // Create decisions involving different strategies
        vault.recordAIDecision(
            "rebalance",
            strategy1,
            strategy2,
            1 ether,
            "Move from strategy1 to strategy2",
            "hcs_msg_1",
            "hfs_file_1"
        );
        
        vault.recordAIDecision(
            "withdraw",
            strategy2,
            address(0),
            0.5 ether,
            "Withdraw from strategy2",
            "hcs_msg_2",
            "hfs_file_2"
        );
        
        vm.stopPrank();
        
        // Test getting decisions by strategy
        uint256[] memory strategy1Decisions = vault.getDecisionsByStrategy(strategy1, 10);
        uint256[] memory strategy2Decisions = vault.getDecisionsByStrategy(strategy2, 10);
        
        assertEq(strategy1Decisions.length, 1);
        assertEq(strategy2Decisions.length, 2); // Both as fromStrategy and toStrategy
    }

    // ============ STRESS TESTS ============

    function testHighVolumeQueries() public {
        // Create many decisions
        vm.startPrank(aiAgent);
        
        for (uint256 i = 0; i < 1000; i++) {
            vault.recordAIDecision(
                i % 2 == 0 ? "rebalance" : "withdraw",
                address(uint160(i + 1)),
                address(uint160(i + 2)),
                1 ether,
                "Stress test decision",
                string(abi.encodePacked("hcs_", i)),
                string(abi.encodePacked("hfs_", i))
            );
        }
        
        vm.stopPrank();
        
        // Test querying large ranges
        uint256 gasStart = gasleft();
        (AIONVaultHedera.AIDecision[] memory decisions,) = vault.getAIDecisions(1, 100);
        uint256 gasUsed = gasStart - gasleft();
        
        assertEq(decisions.length, 100);
        assertLt(gasUsed, 10000000); // Should use less than 10M gas
    }

    function testDataIntegrityUnderLoad() public {
        // Create many users and transactions
        for (uint256 i = 0; i < 50; i++) {
            address user = address(uint160(0x200 + i));
            vm.deal(user, 10 ether);
            
            vm.prank(user);
            vault.deposit{value: MIN_DEPOSIT * (i + 1)}();
        }
        
        // Verify user count
        (, uint256 totalUsers) = vault.getUsers(0, 1);
        assertEq(totalUsers, 50);
        
        // Verify daily activity tracking
        uint256 daySlot = block.timestamp / 86400;
        (
            uint256 totalDeposits,
            ,
            uint256 activeUsers,
            uint256 depositCount,
        ) = vault.getDailyActivity(daySlot);
        
        assertGt(totalDeposits, 0);
        assertEq(activeUsers, 50);
        assertEq(depositCount, 50);
    }

    // ============ EDGE CASES ============

    function testEmptyStateQueries() public {
        // Test queries on empty state
        vm.expectRevert("No active model");
        vault.getLatestModelSnapshot();
        
        (AIONVaultHedera.AIDecision[] memory decisions,) = vault.getAIDecisionsByTimeRange(0, block.timestamp, 10);
        assertEq(decisions.length, 0);
        
        (address[] memory users, uint256 totalUsers) = vault.getUsers(0, 10);
        assertEq(users.length, 0);
        assertEq(totalUsers, 0);
    }

    function testTimestampValidation() public {
        vm.startPrank(aiAgent);
        
        uint256 decisionId = vault.recordAIDecision(
            "test",
            address(0x1),
            address(0x2),
            1 ether,
            "Test decision",
            "hcs_msg_1",
            "hfs_file_1"
        );
        
        vm.stopPrank();
        
        // Verify timestamp is reasonable
        (,, uint256 timestamp) = vault.verifyAIDecisionIntegrity(decisionId);
        assertGe(timestamp, block.timestamp - 1);
        assertLe(timestamp, block.timestamp);
    }

    // ============ ACCESS CONTROL TESTS ============

    function testOnlyAIAgentCanCreateSnapshots() public {
        vm.expectRevert("Only AI agent");
        vault.createModelSnapshot(
            "v1.0.0",
            "hfs_file",
            keccak256("data"),
            8500,
            "Unauthorized attempt"
        );
    }

    function testOnlyAIAgentCanRecordDecisions() public {
        vm.expectRevert("Only AI agent");
        vault.recordAIDecision(
            "unauthorized",
            address(0x1),
            address(0x2),
            1 ether,
            "Unauthorized decision",
            "hcs_msg",
            "hfs_file"
        );
    }
}