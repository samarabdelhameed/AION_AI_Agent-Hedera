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
    event AIAgentUpdated(address indexed oldAgent, address indexed newAgent);

    function setUp() public {
        owner = address(this);
        aiAgent = address(0x1);
        user1 = address(0x2);
        user2 = address(0x3);
        
        vault = new AIONVaultHedera(owner);
        vault.setAIAgent(aiAgent);
    }

    function testInitialState() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.aiAgent(), aiAgent);
        assertEq(vault.totalShares(), 0);
        assertEq(vault.aiDecisionCount(), 0);
        assertFalse(vault.strategyLocked());
        assertFalse(vault.paused());
    }

    function testSetAIAgent() public {
        address newAgent = address(0x4);
        
        vm.expectEmit(true, true, false, false);
        emit AIAgentUpdated(aiAgent, newAgent);
        
        vault.setAIAgent(newAgent);
        assertEq(vault.aiAgent(), newAgent);
    }

    function testSetAIAgentOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.setAIAgent(address(0x4));
    }

    function testSetAIAgentZeroAddress() public {
        vm.expectRevert("Invalid AI agent");
        vault.setAIAgent(address(0));
    }

    function testInitializeShareTokenInterface() public view {
        // Test that the function exists and has correct interface
        // Note: Actual HTS integration would be tested on Hedera testnet
        HTSTokenManager tokenManager = vault.htsTokenManager();
        assertFalse(tokenManager.isTokenActive());
        
        // This test validates the interface exists and is callable
        // Actual token creation requires Hedera testnet environment
    }

    function testInitializeShareTokenOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.initializeShareToken("AION", "AION", 18);
    }

    function testRecordAIDecision() public {
        vm.prank(aiAgent);
        uint256 decisionId = vault.recordAIDecision(
            "rebalance",
            address(0x100),
            address(0x200),
            1000,
            "Higher yield opportunity",
            "hcs_message_123",
            "hfs_file_456"
        );

        assertEq(decisionId, 1);
        assertEq(vault.aiDecisionCount(), 1);

        AIONVaultHedera.AIDecision memory decision = vault.getAIDecision(1);
        assertEq(decision.decisionType, "rebalance");
        assertEq(decision.fromStrategy, address(0x100));
        assertEq(decision.toStrategy, address(0x200));
        assertEq(decision.amount, 1000);
        assertEq(decision.reason, "Higher yield opportunity");
        assertEq(decision.hcsMessageId, "hcs_message_123");
        assertEq(decision.hfsFileId, "hfs_file_456");
        assertTrue(decision.timestamp > 0);
    }

    function testRecordAIDecisionOnlyAIAgent() public {
        vm.prank(user1);
        vm.expectRevert("Only AI agent");
        vault.recordAIDecision(
            "rebalance",
            address(0x100),
            address(0x200),
            1000,
            "test",
            "hcs_123",
            "hfs_456"
        );
    }

    function testGetAIDecisions() public {
        vm.startPrank(aiAgent);
        
        // Record multiple decisions
        vault.recordAIDecision("rebalance", address(0x100), address(0x200), 1000, "reason1", "hcs1", "hfs1");
        vault.recordAIDecision("deposit", address(0x200), address(0x300), 2000, "reason2", "hcs2", "hfs2");
        vault.recordAIDecision("withdraw", address(0x300), address(0x400), 3000, "reason3", "hcs3", "hfs3");
        
        vm.stopPrank();

        // Test getting decisions in range (1-indexed, inclusive)
        (AIONVaultHedera.AIDecision[] memory decisions,) = vault.getAIDecisions(1, 3);
        assertEq(decisions.length, 3);
        assertEq(decisions[0].decisionType, "rebalance");
        assertEq(decisions[1].decisionType, "deposit");
        assertEq(decisions[2].decisionType, "withdraw");

        // Test getting single decision
        (decisions,) = vault.getAIDecisions(2, 2);
        assertEq(decisions.length, 1);
        assertEq(decisions[0].decisionType, "deposit");
    }

    function testGetAIDecisionsInvalidRange() public {
        vm.expectRevert("Invalid from index");
        vault.getAIDecisions(1, 1); // No decisions recorded yet

        vm.prank(aiAgent);
        vault.recordAIDecision("test", address(0), address(0), 0, "test", "hcs", "hfs");

        vm.expectRevert("Invalid range");
        vault.getAIDecisions(2, 1); // from > to

        vm.expectRevert("Invalid to index");
        vault.getAIDecisions(1, 5); // to > aiDecisionCount (only 1 decision exists)
    }

    function testGetLatestModelSnapshot() public {
        // Create and activate model snapshot
        vm.startPrank(aiAgent);
        vault.createModelSnapshot(
            "v1.0.0",
            "hfs_model_v1",
            keccak256("model_data"),
            9500, // 95% performance score
            "Production model v1"
        );
        vault.activateModelSnapshot(1); // Activate the first snapshot
        vm.stopPrank();

        // Now get the latest model snapshot
        (AIONVaultHedera.ModelSnapshot memory snapshot,,) = vault.getLatestModelSnapshot();
        string memory fileId = snapshot.hfsFileId;
        uint256 timestamp = snapshot.timestamp;
        assertEq(fileId, "hfs_model_v1");
        assertTrue(timestamp > 0);
        assertTrue(snapshot.active);
    }

    function testSetMinDepositBNB() public {
        uint256 newMinDeposit = 0.05 ether;
        vault.setMinDepositBNB(newMinDeposit);
        assertEq(vault.minDepositBNB(), newMinDeposit);
    }

    function testSetMinDepositBNBOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.setMinDepositBNB(0.05 ether);
    }

    function testSetMinYieldClaimBNB() public {
        uint256 newMinYieldClaim = 0.005 ether;
        vault.setMinYieldClaimBNB(newMinYieldClaim);
        assertEq(vault.minYieldClaimBNB(), newMinYieldClaim);
    }

    function testPauseUnpause() public {
        assertFalse(vault.paused());
        
        vault.pause();
        assertTrue(vault.paused());
        
        vault.unpause();
        assertFalse(vault.paused());
    }

    function testPauseOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vault.pause();
    }

    function testTotalAssetsInitial() public view {
        assertEq(vault.totalAssets(), 0);
    }

    function testShareValueInitial() public view {
        assertEq(vault.shareValue(user1), 0);
    }

    function testGettersInitialState() public view {
        assertEq(vault.totalShares(), 0);
        assertEq(vault.sharesOf(user1), 0);
        assertEq(vault.principalOf(user1), 0);
        assertEq(vault.aiDecisionCount(), 0);
        assertEq(vault.minDepositBNB(), 0.01 ether);
        assertEq(vault.minYieldClaimBNB(), 0.001 ether);
    }

    function testHTSTokenManagerIntegration() public view {
        // Test that HTS token manager is properly deployed and connected
        HTSTokenManager tokenManager = vault.htsTokenManager();
        assertTrue(address(tokenManager) != address(0));
        assertEq(tokenManager.owner(), address(vault));
        assertFalse(tokenManager.isTokenActive());
    }

    function testReceiveBNB() public {
        uint256 initialBalance = address(vault).balance;
        
        // Send BNB to vault
        payable(address(vault)).transfer(1 ether);
        
        assertEq(address(vault).balance, initialBalance + 1 ether);
    }

    function testStrategyLockConstants() public view {
        assertEq(vault.STRATEGY_LOCK_DURATION(), 1 hours);
    }
}