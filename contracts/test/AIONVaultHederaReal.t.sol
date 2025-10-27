// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/AIONVaultHedera.sol";

contract AIONVaultHederaRealTest is Test {
    AIONVaultHedera public vault;
    address public owner;
    address public aiAgent;
    address public user1;
    address public user2;
    address public strategy1;
    address public strategy2;

    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares);
    event AIRebalance(
        address indexed agent,
        uint256 timestamp,
        string decisionCid,
        uint256 fromStrategy,
        uint256 toStrategy,
        uint256 amount
    );
    event StrategyChanged(address indexed oldStrategy, address indexed newStrategy);
    event AIAgentUpdated(address indexed oldAgent, address indexed newAgent);

    function setUp() public {
        owner = address(this);
        aiAgent = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);
        strategy1 = address(0x4);
        strategy2 = address(0x5);
        
        vault = new AIONVaultHedera(owner, aiAgent);
        
        // Add some HBAR to test accounts
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(address(vault), 0);
    }

    function testInitialState() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.aiAgent(), aiAgent);
        assertEq(vault.totalDeposits(), 0);
        assertFalse(vault.isShareTokenActive());
        assertEq(vault.getTotalShares(), 0);
        assertEq(vault.getVaultBalance(), 0);
        assertEq(vault.currentStrategy(), address(0));
        assertFalse(vault.paused());
    }

    function testOwnershipAndAccessControl() public {
        assertEq(vault.owner(), owner);
        
        // Test that non-owner cannot call owner functions
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.setAIAgent(address(0x999));
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.addApprovedStrategy(strategy1);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.pause();
    }

    function testAIAgentManagement() public {
        address newAgent = address(0x999);
        
        // Test invalid address
        vm.expectRevert("Invalid agent address");
        vault.setAIAgent(address(0));
        
        // Test valid update
        vm.expectEmit(true, true, false, false);
        emit AIAgentUpdated(aiAgent, newAgent);
        
        vault.setAIAgent(newAgent);
        assertEq(vault.aiAgent(), newAgent);
    }

    function testRecordAIDecision() public {
        // Test only AI agent can call
        vm.prank(user1);
        vm.expectRevert("Only AI agent");
        vault.recordAIDecision("test-cid", 1, 2, 1000);
        
        // Test successful call by AI agent
        vm.prank(aiAgent);
        vm.expectEmit(true, false, false, true);
        emit AIRebalance(aiAgent, block.timestamp, "test-cid", 1, 2, 1000);

        vault.recordAIDecision("test-cid", 1, 2, 1000);
    }

    function testStrategyManagement() public {
        // Initially no strategies approved
        assertFalse(vault.approvedStrategies(strategy1));
        
        // Add approved strategy
        vault.addApprovedStrategy(strategy1);
        assertTrue(vault.approvedStrategies(strategy1));
        
        // Remove approved strategy
        vault.removeApprovedStrategy(strategy1);
        assertFalse(vault.approvedStrategies(strategy1));
        
        // Test access control
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.addApprovedStrategy(strategy1);
    }

    function testStrategyChangeWithTimeLock() public {
        // Add approved strategy
        vault.addApprovedStrategy(strategy1);
        
        // Test unapproved strategy
        vm.expectRevert("Strategy not approved");
        vault.proposeStrategyChange(strategy2);
        
        // Propose strategy change
        vm.expectEmit(true, true, false, false);
        emit StrategyChanged(address(0), strategy1);
        vault.proposeStrategyChange(strategy1);
        
        // Check pending strategy
        assertEq(vault.pendingStrategy(), strategy1);
        assertTrue(vault.pendingStrategyChangeTime() > block.timestamp);
        
        // Try to execute immediately (should fail)
        vm.expectRevert("Time lock not expired");
        vault.executeStrategyChange();
        
        // Fast forward time
        vm.warp(block.timestamp + 24 hours + 1);
        
        // Now execute should work
        vault.executeStrategyChange();
        assertEq(vault.currentStrategy(), strategy1);
        assertEq(vault.pendingStrategy(), address(0));
        assertEq(vault.pendingStrategyChangeTime(), 0);
        
        // Test same strategy error
        vm.expectRevert("Same strategy");
        vault.proposeStrategyChange(strategy1);
    }

    function testExecuteStrategyChangeErrors() public {
        // Test no pending strategy
        vm.expectRevert("No pending strategy");
        vault.executeStrategyChange();
    }

    function testPauseUnpause() public {
        assertFalse(vault.paused());
        
        // Test pause
        vault.pause();
        assertTrue(vault.paused());
        
        // Test unpause
        vault.unpause();
        assertFalse(vault.paused());
        
        // Test access control
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.pause();
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.unpause();
    }

    function testDepositRequirements() public {
        // Test deposit without token initialized
        vm.prank(user1);
        vm.expectRevert("Share token not initialized");
        vault.deposit{value: 1 ether}();
        
        // Test zero amount deposit (would fail after token init)
        vm.prank(user1);
        vm.expectRevert("Deposit amount must be positive");
        vault.deposit{value: 0}();
    }

    function testWithdrawRequirements() public {
        // Test zero shares
        vm.prank(user1);
        vm.expectRevert("Shares must be positive");
        vault.withdraw(0);
        
        // Test insufficient shares
        vm.prank(user1);
        vm.expectRevert("Insufficient shares");
        vault.withdraw(1000);
    }

    function testInitializeShareTokenAccess() public {
        // Test only owner can initialize
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.initializeShareToken("AION", "AION", 18);
        
        // Owner can call (will revert due to HTS precompile, but access control passes)
        vm.expectRevert(); // Expect revert due to HTS call
        vault.initializeShareToken("AION Shares", "AION", 18);
    }

    function testEmergencyWithdrawAccess() public {
        // Test only owner can call emergency withdraw
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.emergencyWithdraw(user1);
        
        // Test emergency withdraw only when paused
        vm.expectRevert(abi.encodeWithSignature("ExpectedPause()"));
        vault.emergencyWithdraw(user1);
    }

    function testGetters() public view {
        assertEq(vault.getTotalShares(), 0);
        assertEq(vault.getShareBalance(user1), 0);
        assertEq(vault.getVaultBalance(), 0);
        assertFalse(vault.isShareTokenActive());
        assertEq(vault.userDeposits(user1), 0);
        assertEq(vault.totalDeposits(), 0);
        assertEq(vault.STRATEGY_CHANGE_DELAY(), 24 hours);
    }

    function testReceiveHBAR() public {
        uint256 amount = 1 ether;
        uint256 initialBalance = vault.getVaultBalance();
        
        // Send HBAR to contract
        payable(address(vault)).transfer(amount);
        
        assertEq(vault.getVaultBalance(), initialBalance + amount);
    }

    function testContractIntegration() public view {
        // Test that all components are properly initialized
        assertTrue(address(vault) != address(0));
        assertTrue(address(vault.htsManager()) != address(0));
        
        // Test HTS manager is owned by vault
        HTSTokenManager htsManager = vault.htsManager();
        assertEq(htsManager.owner(), address(vault));
        assertFalse(htsManager.isTokenActive());
        assertEq(htsManager.getTotalShares(), 0);
    }

    function testEventDefinitions() public {
        // Test that all events are properly defined by checking contract compilation
        assertTrue(address(vault) != address(0));
    }

    function testConstants() public view {
        assertEq(vault.STRATEGY_CHANGE_DELAY(), 24 hours);
    }

    function testStateVariables() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.aiAgent(), aiAgent);
        assertEq(vault.totalDeposits(), 0);
        assertEq(vault.currentStrategy(), address(0));
        assertEq(vault.pendingStrategy(), address(0));
        assertEq(vault.pendingStrategyChangeTime(), 0);
        assertFalse(vault.paused());
    }
}