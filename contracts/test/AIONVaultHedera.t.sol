// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/AIONVaultHedera.sol";
import "@hedera/HederaResponseCodes.sol";

contract AIONVaultHederaTest is Test {
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
    }

    function testInitializeShareToken() public {
        // Mock HTS response
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("createFungibleToken((string,string,address,string,bool,uint32,bool,(uint256,(bool,address,bytes,bytes,address))[],((uint32,address,uint32))),uint64,uint32)"),
            abi.encode(HederaResponseCodes.SUCCESS, address(0x123))
        );

        address tokenAddress = vault.initializeShareToken("AION Shares", "AION", 18);
        
        assertEq(tokenAddress, address(0x123));
        assertTrue(vault.isShareTokenActive());
        
        HTSTokenManager.TokenInfo memory tokenInfo = vault.getTokenInfo();
        assertEq(tokenInfo.name, "AION Shares");
        assertEq(tokenInfo.symbol, "AION");
        assertEq(tokenInfo.decimals, 18);
    }

    function testInitializeShareTokenOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.initializeShareToken("AION", "AION", 18);
    }

    function testDepositWithoutToken() public {
        vm.prank(user1);
        vm.expectRevert("Share token not initialized");
        vault.deposit{value: 1 ether}();
    }

    function testDepositSuccess() public {
        _setupToken();
        
        uint256 depositAmount = 1 ether;
        
        // Mock HTS operations
        _mockHTSOperations();

        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit Deposit(user1, depositAmount, depositAmount); // 1:1 ratio for first deposit

        uint256 shares = vault.deposit{value: depositAmount}();
        
        assertEq(shares, depositAmount);
        assertEq(vault.totalDeposits(), depositAmount);
        assertEq(vault.userDeposits(user1), depositAmount);
        assertEq(vault.getVaultBalance(), depositAmount);
    }

    function testDepositZeroAmount() public {
        _setupToken();
        
        vm.prank(user1);
        vm.expectRevert("Deposit amount must be positive");
        vault.deposit{value: 0}();
    }

    function testMultipleDeposits() public {
        _setupToken();
        _mockHTSOperations();
        
        // First deposit
        vm.prank(user1);
        vault.deposit{value: 1 ether}();
        
        // Second deposit (should get proportional shares)
        vm.prank(user2);
        vault.deposit{value: 1 ether}();
        
        assertEq(vault.totalDeposits(), 2 ether);
        assertEq(vault.userDeposits(user1), 1 ether);
        assertEq(vault.userDeposits(user2), 1 ether);
    }

    function testWithdrawSuccess() public {
        _setupToken();
        _mockHTSOperations();
        
        // Deposit first
        vm.prank(user1);
        uint256 shares = vault.deposit{value: 1 ether}();
        
        // Mock burn operation
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("burnToken(address,uint64,int64[])"),
            abi.encode(HederaResponseCodes.SUCCESS, uint64(0))
        );

        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit Withdraw(user1, 1 ether, shares);

        uint256 amount = vault.withdraw(shares);
        
        assertEq(amount, 1 ether);
        assertEq(vault.totalDeposits(), 0);
        assertEq(vault.userDeposits(user1), 0);
    }

    function testWithdrawInsufficientShares() public {
        _setupToken();
        _mockHTSOperations();
        
        vm.prank(user1);
        vault.deposit{value: 1 ether}();
        
        vm.prank(user1);
        vm.expectRevert("Insufficient shares");
        vault.withdraw(2 ether); // More than deposited
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
        // Add approved strategy
        vault.addApprovedStrategy(strategy1);
        assertTrue(vault.approvedStrategies(strategy1));
        
        // Remove approved strategy
        vault.removeApprovedStrategy(strategy1);
        assertFalse(vault.approvedStrategies(strategy1));
    }

    function testStrategyChangeWithTimeLock() public {
        vault.addApprovedStrategy(strategy1);
        
        // Propose strategy change
        vm.expectEmit(true, true, false, false);
        emit StrategyChanged(address(0), strategy1);
        vault.proposeStrategyChange(strategy1);
        
        // Try to execute immediately (should fail)
        vm.expectRevert("Time lock not expired");
        vault.executeStrategyChange();
        
        // Fast forward time
        vm.warp(block.timestamp + 24 hours + 1);
        
        // Now execute should work
        vault.executeStrategyChange();
        assertEq(vault.currentStrategy(), strategy1);
    }

    function testSetAIAgent() public {
        address newAgent = address(0x999);
        
        vm.expectEmit(true, true, false, false);
        emit AIAgentUpdated(aiAgent, newAgent);
        
        vault.setAIAgent(newAgent);
        assertEq(vault.aiAgent(), newAgent);
    }

    function testPauseUnpause() public {
        assertFalse(vault.paused());
        
        vault.pause();
        assertTrue(vault.paused());
        
        vault.unpause();
        assertFalse(vault.paused());
    }

    function testDepositWhenPaused() public {
        _setupToken();
        vault.pause();
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.deposit{value: 1 ether}();
    }

    function testEmergencyWithdraw() public {
        _setupToken();
        _mockHTSOperations();
        
        // User deposits
        vm.prank(user1);
        vault.deposit{value: 1 ether}();
        
        // Pause vault
        vault.pause();
        
        // Mock burn for emergency withdraw
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("burnToken(address,uint64,int64[])"),
            abi.encode(HederaResponseCodes.SUCCESS, uint64(0))
        );
        
        uint256 balanceBefore = user1.balance;
        vault.emergencyWithdraw(user1);
        
        assertEq(user1.balance, balanceBefore + 1 ether);
        assertEq(vault.userDeposits(user1), 0);
    }

    function testAccessControl() public {
        // Test owner-only functions
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.addApprovedStrategy(strategy1);
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.setAIAgent(address(0x999));
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.pause();
    }

    // Helper functions
    function _setupToken() internal {
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("createFungibleToken((string,string,address,string,bool,uint32,bool,(uint256,(bool,address,bytes,bytes,address))[],((uint32,address,uint32))),uint64,uint32)"),
            abi.encode(HederaResponseCodes.SUCCESS, address(0x123))
        );
        
        vault.initializeShareToken("AION Shares", "AION", 18);
    }
    
    function _mockHTSOperations() internal {
        // Mock associate token
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("associateToken(address,address)"),
            abi.encode(HederaResponseCodes.SUCCESS)
        );
        
        // Mock mint token
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("mintToken(address,uint64,bytes[])"),
            abi.encode(HederaResponseCodes.SUCCESS, uint64(1000000), new int64[](0))
        );
    }
}