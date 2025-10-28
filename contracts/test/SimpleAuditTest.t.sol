// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/AIONVaultHedera.sol";

contract SimpleAuditTest is Test {
    AIONVaultHedera public vault;
    address public owner;
    address public aiAgent;
    address public user1;
    
    function setUp() public {
        owner = address(this);
        aiAgent = address(0x1);
        user1 = address(0x2);
        
        vault = new AIONVaultHedera(owner);
        vault.setAIAgent(aiAgent);
        vault.initializeShareToken("AION Shares", "AION", 18);
        
        vm.deal(user1, 10 ether);
    }

    function testBasicAuditFunctions() public {
        // Test basic functionality
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
        
        // Test getAIDecisions
        (AIONVaultHedera.AIDecision[] memory decisions, uint256 totalCount) = vault.getAIDecisions(1, 1);
        
        assertEq(totalCount, 1);
        assertEq(decisions.length, 1);
        assertEq(decisions[0].decisionType, "rebalance");
    }

    function testModelSnapshot() public {
        vm.startPrank(aiAgent);
        
        vault.createModelSnapshot(
            "v1.0.0",
            "hfs_model_file_1",
            keccak256("model_data"),
            8500,
            "Test model"
        );
        
        vault.activateModelSnapshot(1);
        
        vm.stopPrank();
        
        (AIONVaultHedera.ModelSnapshot memory snapshot, bool isValid,) = vault.getLatestModelSnapshot();
        
        assertTrue(isValid);
        assertEq(snapshot.version, "v1.0.0");
        assertTrue(snapshot.active);
    }

    function testUserActivity() public {
        vm.prank(user1);
        vault.deposit{value: 1 ether}();
        
        (address[] memory users, uint256 totalUsers) = vault.getUsers(0, 10);
        
        assertEq(totalUsers, 1);
        assertEq(users[0], user1);
    }
}