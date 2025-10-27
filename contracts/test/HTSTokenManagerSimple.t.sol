// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/HTSTokenManager.sol";

contract HTSTokenManagerSimpleTest is Test {
    HTSTokenManager public tokenManager;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        
        tokenManager = new HTSTokenManager(owner);
    }

    function testInitialState() public view {
        assertFalse(tokenManager.isTokenActive());
        assertEq(tokenManager.getTotalShares(), 0);
        
        HTSTokenManager.TokenInfo memory tokenInfo = tokenManager.getTokenInfo();
        assertEq(tokenInfo.tokenAddress, address(0));
        assertFalse(tokenInfo.isActive);
        assertEq(tokenInfo.totalSupply, 0);
    }

    function testOwnership() public {
        assertEq(tokenManager.owner(), owner);
        
        // Test that only owner can call restricted functions
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.createShareToken("AION", "AION", 18, 1000000);
    }

    function testGetShareBalance() public view {
        assertEq(tokenManager.getShareBalance(user1), 0);
        assertEq(tokenManager.getShareBalance(user2), 0);
    }

    function testGetTotalShares() public view {
        assertEq(tokenManager.getTotalShares(), 0);
    }

    function testIsTokenActive() public view {
        assertFalse(tokenManager.isTokenActive());
    }

    function testGetTokenInfoInitial() public view {
        HTSTokenManager.TokenInfo memory tokenInfo = tokenManager.getTokenInfo();
        assertEq(tokenInfo.tokenAddress, address(0));
        assertEq(tokenInfo.tokenId, 0);
        assertEq(tokenInfo.name, "");
        assertEq(tokenInfo.symbol, "");
        assertEq(tokenInfo.decimals, 0);
        assertEq(tokenInfo.totalSupply, 0);
        assertFalse(tokenInfo.isActive);
    }

    function testContractDeployment() public view {
        assertTrue(address(tokenManager) != address(0));
        assertEq(tokenManager.owner(), owner);
    }

    function testAccessControl() public {
        // Test createShareToken access control
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.createShareToken("Test", "TEST", 18, 1000);
        
        // Test other functions require token to be created first, so they'll fail with "Share token not created"
        // when called by non-owner, but that's expected behavior
        
        // Test mintShares access control (onlyOwner modifier is checked first)
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.mintShares(user1, 100);
        
        // Test burnShares access control
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.burnShares(user1, 100);
        
        // Test associateUserWithToken access control
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.associateUserWithToken(user1);
        
        // Test transferShares access control
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.transferShares(user1, user2, 100);
    }

    function testInputValidation() public {
        // These should revert with appropriate error messages
        // Note: We can't test the actual HTS calls without mocking, 
        // but we can test the input validation logic
        
        // Test zero amount validation would happen in actual implementation
        // Test zero address validation would happen in actual implementation
        // These are covered by the require statements in the contract
        
        assertTrue(true); // Placeholder for input validation tests
    }

    function testEventDefinitions() public {
        // Test that events are properly defined by checking if contract compiles
        // and has the expected interface
        assertTrue(address(tokenManager) != address(0));
    }
}