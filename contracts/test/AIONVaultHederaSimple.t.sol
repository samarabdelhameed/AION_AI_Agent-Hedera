// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/AIONVaultHedera.sol";

contract AIONVaultHederaSimpleTest is Test {
    AIONVaultHedera public vault;
    address public owner;
    address public aiAgent;
    address public user1;
    address public user2;
    address public strategy1;

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
        
        vault = new AIONVaultHedera(owner, aiAgent);
        
        // Add some HBAR to test accounts
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
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

    function testOwnership() public {
        assertEq(vault.owner(), owner);
        
        // Test access control
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.setAIAgent(address(0x999));
    }

    function testAIAgentManagement() public {
        address newAgent = address(0x999);
        
        vm.expectEmit(true, true, false, false);
        emit AIAgentUpdated(aiAgent, newAgent);
        
        vault.setAIAgent(newAgent);
        assertEq(vault.aiAgent(), newAgent);
    }

    function testAIAgentValidation() public {
        vm.expectRevert("Invalid agent address");
        vault.setAIAgent(address(0));
    }

    function testRecordAIDecision() public {
        vm.prank(aiAgent);
        vm.expectEmit(true, false, false, true);
        emit AIRebalance(aiAgent, block.timestamp, "test-cid", 1, 2, 1000);

        vault.recordAIDecision("test-cid", 1, 2, 1000);
    }

    function testRecordAIDecisionOnlyAgent() public {
        vm.prank(user1);
        vm.expectRevert("Only AI agent");
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
    }

    function testStrategyManagementAccessControl() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.addApprovedStrategy(strategy1);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.removeApprovedStrategy(strategy1);
    }

    function testStrategyChangeProposal() public {
        vault.addApprovedStrategy(strategy1);
        
        // Propose strategy change
        vm.expectEmit(true, true, false, false);
        emit StrategyChanged(address(0), strategy1);
        vault.proposeStrategyChange(strategy1);
        
        // Check pending strategy
        assertEq(vault.pendingStrategy(), strategy1);
        assertTrue(vault.pendingStrategyChangeTime() > block.timestamp);
    }

    function testStrategyChangeUnapprovedStrategy() public {
        vm.expectRevert("Strategy not approved");
        vault.proposeStrategyChange(strategy1);
    }

    function testStrategyChangeSameStrategy() public {
        vault.addApprovedStrategy(strategy1);
        
        // Set current strategy
        vault.proposeStrategyChange(strategy1);
        vm.warp(block.timestamp + 24 hours + 1);
        vault.executeStrategyChange();
        
        // Try to propose same strategy
        vm.expectRevert("Same strategy");
        vault.proposeStrategyChange(strategy1);
    }

    function testStrategyChangeTimeLock() public {
        vault.addApprovedStrategy(strategy1);
        vault.proposeStrategyChange(strategy1);
        
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
    }

    function testExecuteStrategyChangeNoPending() public {
        vm.expectRevert("No pending strategy");
        vault.executeStrategyChange();
    }

    function testPauseUnpause() public {
        assertFalse(vault.paused());
        
        vault.pause();
        assertTrue(vault.paused());
        
        vault.unpause();
        assertFalse(vault.paused());
    }

    function testPauseAccessControl() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.pause();
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.unpause();
    }

    function testGetters() public view {
        assertEq(vault.getTotalShares(), 0);
        assertEq(vault.getShareBalance(user1), 0);
        assertEq(vault.getVaultBalance(), 0);
        assertFalse(vault.isShareTokenActive());
        
        // Test user deposits
        assertEq(vault.userDeposits(user1), 0);
        assertEq(vault.totalDeposits(), 0);
    }

    function testReceiveHBAR() public {
        uint256 amount = 1 ether;
        
        // Send HBAR to contract
        payable(address(vault)).transfer(amount);
        
        assertEq(vault.getVaultBalance(), amount);
    }

    function testConstants() public view {
        assertEq(vault.STRATEGY_CHANGE_DELAY(), 24 hours);
    }

    function testContractDeployment() public view {
        assertTrue(address(vault) != address(0));
        assertTrue(address(vault.htsManager()) != address(0));
    }

    function testHTSManagerIntegration() public view {
        // Test that HTS manager is properly initialized
        HTSTokenManager htsManager = vault.htsManager();
        assertEq(htsManager.owner(), address(vault));
        assertFalse(htsManager.isTokenActive());
        assertEq(htsManager.getTotalShares(), 0);
    }
}