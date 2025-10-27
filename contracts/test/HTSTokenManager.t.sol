// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/HTSTokenManager.sol";
import "@hedera/HederaResponseCodes.sol";

contract HTSTokenManagerTest is Test {
    HTSTokenManager public tokenManager;
    address public owner;
    address public user1;
    address public user2;

    event ShareTokenCreated(
        address indexed tokenAddress,
        int64 indexed tokenId,
        string name,
        string symbol
    );
    
    event SharesMinted(
        address indexed user,
        uint256 amount,
        uint64 newTotalSupply
    );
    
    event SharesBurned(
        address indexed user,
        uint256 amount,
        uint64 newTotalSupply
    );
    
    event TokenAssociated(
        address indexed account,
        address indexed token
    );

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        
        tokenManager = new HTSTokenManager(owner);
    }

    function testInitialState() public {
        assertFalse(tokenManager.isTokenActive());
        assertEq(tokenManager.getTotalShares(), 0);
        
        HTSTokenManager.TokenInfo memory tokenInfo = tokenManager.getTokenInfo();
        assertEq(tokenInfo.tokenAddress, address(0));
        assertFalse(tokenInfo.isActive);
    }

    function testCreateShareToken() public {
        string memory name = "AION Vault Shares";
        string memory symbol = "AION";
        uint32 decimals = 18;
        uint64 initialSupply = 1000000;

        // Mock the HTS precompile response
        vm.mockCall(
            address(0x167), // HTS precompile address
            abi.encodeWithSignature("createFungibleToken((string,string,address,string,bool,uint32,bool,(uint256,(bool,address,bytes,bytes,address))[],((uint32,address,uint32))),uint64,uint32)"),
            abi.encode(HederaResponseCodes.SUCCESS, address(0x123))
        );

        vm.expectEmit(true, true, false, true);
        emit ShareTokenCreated(address(0x123), int64(uint64(uint160(address(0x123)))), name, symbol);

        address tokenAddress = tokenManager.createShareToken(name, symbol, decimals, initialSupply);
        
        assertEq(tokenAddress, address(0x123));
        assertTrue(tokenManager.isTokenActive());
        assertEq(tokenManager.getTotalShares(), initialSupply);
        
        HTSTokenManager.TokenInfo memory tokenInfo = tokenManager.getTokenInfo();
        assertEq(tokenInfo.name, name);
        assertEq(tokenInfo.symbol, symbol);
        assertEq(tokenInfo.decimals, decimals);
        assertEq(tokenInfo.totalSupply, initialSupply);
        assertTrue(tokenInfo.isActive);
    }

    function testCreateShareTokenOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.createShareToken("AION", "AION", 18, 1000000);
    }

    function testCreateShareTokenAlreadyExists() public {
        // First creation
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("createFungibleToken((string,string,address,string,bool,uint32,bool,(uint256,(bool,address,bytes,bytes,address))[],((uint32,address,uint32))),uint64,uint32)"),
            abi.encode(HederaResponseCodes.SUCCESS, address(0x123))
        );
        
        tokenManager.createShareToken("AION", "AION", 18, 1000000);
        
        // Second creation should fail
        vm.expectRevert("Share token already exists");
        tokenManager.createShareToken("AION2", "AION2", 18, 1000000);
    }

    function testMintShares() public {
        // Setup token first
        _setupToken();
        
        uint256 mintAmount = 1000;
        uint64 expectedNewSupply = 1001000; // 1000000 + 1000

        // Mock mint response
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("mintToken(address,uint64,bytes[])"),
            abi.encode(HederaResponseCodes.SUCCESS, expectedNewSupply, new int64[](0))
        );

        vm.expectEmit(true, false, false, true);
        emit SharesMinted(user1, mintAmount, expectedNewSupply);

        uint64 newSupply = tokenManager.mintShares(user1, mintAmount);
        
        assertEq(newSupply, expectedNewSupply);
        assertEq(tokenManager.getShareBalance(user1), mintAmount);
        assertEq(tokenManager.getTotalShares(), expectedNewSupply);
    }

    function testMintSharesOnlyOwner() public {
        _setupToken();
        
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        tokenManager.mintShares(user1, 1000);
    }

    function testMintSharesInvalidInputs() public {
        _setupToken();
        
        // Zero amount
        vm.expectRevert("Amount must be positive");
        tokenManager.mintShares(user1, 0);
        
        // Zero address
        vm.expectRevert("Invalid user address");
        tokenManager.mintShares(address(0), 1000);
    }

    function testBurnShares() public {
        // Setup token and mint shares first
        _setupToken();
        _mintShares(user1, 1000);
        
        uint256 burnAmount = 500;
        uint64 expectedNewSupply = 1000500; // 1001000 - 500

        // Mock burn response
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("burnToken(address,uint64,int64[])"),
            abi.encode(HederaResponseCodes.SUCCESS, expectedNewSupply)
        );

        vm.expectEmit(true, false, false, true);
        emit SharesBurned(user1, burnAmount, expectedNewSupply);

        uint64 newSupply = tokenManager.burnShares(user1, burnAmount);
        
        assertEq(newSupply, expectedNewSupply);
        assertEq(tokenManager.getShareBalance(user1), 500); // 1000 - 500
        assertEq(tokenManager.getTotalShares(), expectedNewSupply);
    }

    function testBurnSharesInsufficientBalance() public {
        _setupToken();
        _mintShares(user1, 1000);
        
        vm.expectRevert("Insufficient shares");
        tokenManager.burnShares(user1, 1500); // More than balance
    }

    function testAssociateUserWithToken() public {
        _setupToken();
        
        // Mock associate response
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("associateToken(address,address)"),
            abi.encode(HederaResponseCodes.SUCCESS)
        );

        vm.expectEmit(true, true, false, false);
        emit TokenAssociated(user1, address(0x123));

        tokenManager.associateUserWithToken(user1);
    }

    function testTransferShares() public {
        _setupToken();
        _mintShares(user1, 1000);
        _mintShares(user2, 500);
        
        uint256 transferAmount = 300;

        // Mock crypto transfer response
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("cryptoTransfer(((address,int64,bool)[]))"),
            abi.encode(HederaResponseCodes.SUCCESS)
        );

        tokenManager.transferShares(user1, user2, transferAmount);
        
        assertEq(tokenManager.getShareBalance(user1), 700); // 1000 - 300
        assertEq(tokenManager.getShareBalance(user2), 800); // 500 + 300
        assertEq(tokenManager.getTotalShares(), 1001500); // Total unchanged
    }

    function testTransferSharesInsufficientBalance() public {
        _setupToken();
        _mintShares(user1, 1000);
        
        vm.expectRevert("Insufficient shares");
        tokenManager.transferShares(user1, user2, 1500);
    }

    function testGetters() public {
        _setupToken();
        _mintShares(user1, 1000);
        
        HTSTokenManager.TokenInfo memory tokenInfo = tokenManager.getTokenInfo();
        assertEq(tokenInfo.name, "AION Vault Shares");
        assertEq(tokenInfo.symbol, "AION");
        assertEq(tokenInfo.decimals, 18);
        assertTrue(tokenInfo.isActive);
        
        assertEq(tokenManager.getShareBalance(user1), 1000);
        assertEq(tokenManager.getTotalShares(), 1001000);
        assertTrue(tokenManager.isTokenActive());
    }

    // Helper functions
    function _setupToken() internal {
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("createFungibleToken((string,string,address,string,bool,uint32,bool,(uint256,(bool,address,bytes,bytes,address))[],((uint32,address,uint32))),uint64,uint32)"),
            abi.encode(HederaResponseCodes.SUCCESS, address(0x123))
        );
        
        tokenManager.createShareToken("AION Vault Shares", "AION", 18, 1000000);
    }
    
    function _mintShares(address user, uint256 amount) internal {
        uint64 newSupply = uint64(tokenManager.getTotalShares() + amount);
        
        vm.mockCall(
            address(0x167),
            abi.encodeWithSignature("mintToken(address,uint64,bytes[])"),
            abi.encode(HederaResponseCodes.SUCCESS, newSupply, new int64[](0))
        );
        
        tokenManager.mintShares(user, amount);
    }
}