// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/BridgeAdapter.sol";
import "../src/hedera/HTSTokenManager.sol";
import "../src/interfaces/IBridgeAdapter.sol";

contract BridgeAdapterTest is Test {
    BridgeAdapter public bridgeAdapter;
    HTSTokenManager public htsTokenManager;
    
    address public owner = address(0x1);
    address public bridgeService = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    
    address public htsToken = address(0x100);
    address public erc20Token = address(0x200);
    uint256 public constant BSC_CHAIN_ID = 56;
    uint256 public constant ETH_CHAIN_ID = 1;
    uint256 public constant HEDERA_CHAIN_ID = 295;
    
    event TokenMappingCreated(
        address indexed htsToken,
        address indexed erc20Token,
        uint256 indexed chainId,
        uint256 timestamp
    );
    
    event BridgeOperationInitiated(
        bytes32 indexed operationId,
        address indexed user,
        address sourceToken,
        address targetToken,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId
    );
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy HTS Token Manager
        htsTokenManager = new HTSTokenManager(owner);
        
        // Deploy Bridge Adapter
        bridgeAdapter = new BridgeAdapter(owner, bridgeService, address(htsTokenManager));
        
        vm.stopPrank();
    }
    
    function testCreateTokenMapping() public {
        vm.startPrank(owner);
        
        // Test successful token mapping creation
        vm.expectEmit(true, true, true, true);
        emit TokenMappingCreated(htsToken, erc20Token, BSC_CHAIN_ID, block.timestamp);
        
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        // Verify mapping was created
        IBridgeAdapter.TokenMapping memory mapping = bridgeAdapter.getTokenMapping(htsToken, BSC_CHAIN_ID);
        assertEq(mapping.htsToken, htsToken);
        assertEq(mapping.erc20Token, erc20Token);
        assertEq(mapping.chainId, BSC_CHAIN_ID);
        assertTrue(mapping.active);
        assertEq(mapping.totalBridged, 0);
        
        vm.stopPrank();
    }
    
    function testCreateTokenMappingFailures() public {
        vm.startPrank(owner);
        
        // Test invalid token addresses
        vm.expectRevert("Invalid token addresses");
        bridgeAdapter.createTokenMapping(address(0), erc20Token, BSC_CHAIN_ID);
        
        vm.expectRevert("Invalid token addresses");
        bridgeAdapter.createTokenMapping(htsToken, address(0), BSC_CHAIN_ID);
        
        // Test unsupported chain
        vm.expectRevert("Unsupported chain");
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, 999);
        
        // Create valid mapping first
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        // Test duplicate mapping
        vm.expectRevert("Mapping already exists");
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        vm.stopPrank();
    }
    
    function testBridgeToHedera() public {
        // Setup: Create token mapping
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        uint256 amount = 1 ether;
        
        vm.startPrank(user1);
        
        // Test successful bridge to Hedera
        bytes32 operationId = bridgeAdapter.bridgeToHedera(erc20Token, amount, user1);
        
        // Verify operation was created
        IBridgeAdapter.BridgeOperation memory operation = bridgeAdapter.getBridgeOperation(operationId);
        assertEq(operation.user, user1);
        assertEq(operation.sourceToken, erc20Token);
        assertEq(operation.targetToken, htsToken);
        assertEq(operation.amount, amount);
        assertEq(operation.sourceChainId, BSC_CHAIN_ID);
        assertEq(operation.targetChainId, HEDERA_CHAIN_ID);
        assertTrue(operation.status == IBridgeAdapter.BridgeStatus.Pending);
        
        vm.stopPrank();
    }
    
    function testBridgeToHederaFailures() public {
        vm.startPrank(user1);
        
        uint256 amount = 1 ether;
        
        // Test without token mapping
        vm.expectRevert("Token mapping not found or inactive");
        bridgeAdapter.bridgeToHedera(erc20Token, amount, user1);
        
        // Test invalid recipient
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        vm.expectRevert("Invalid recipient");
        bridgeAdapter.bridgeToHedera(erc20Token, amount, address(0));
        
        // Test amount too small
        vm.expectRevert("Invalid amount");
        bridgeAdapter.bridgeToHedera(erc20Token, 0.0001 ether, user1);
        
        // Test amount too large
        vm.expectRevert("Invalid amount");
        bridgeAdapter.bridgeToHedera(erc20Token, 2000000 ether, user1);
        
        vm.stopPrank();
    }
    
    function testBridgeFromHedera() public {
        // Setup: Create token mapping and mock HTS token manager
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        uint256 amount = 1 ether;
        
        // Mock HTS token manager to return sufficient balance
        vm.mockCall(
            address(htsTokenManager),
            abi.encodeWithSelector(HTSTokenManager.getTokenBalance.selector, user1),
            abi.encode(amount * 2)
        );
        
        vm.mockCall(
            address(htsTokenManager),
            abi.encodeWithSelector(HTSTokenManager.burnShares.selector, user1, amount),
            abi.encode(uint64(1000))
        );
        
        vm.startPrank(user1);
        
        // Test successful bridge from Hedera
        bytes32 operationId = bridgeAdapter.bridgeFromHedera(htsToken, amount, BSC_CHAIN_ID, user1);
        
        // Verify operation was created
        IBridgeAdapter.BridgeOperation memory operation = bridgeAdapter.getBridgeOperation(operationId);
        assertEq(operation.user, user1);
        assertEq(operation.sourceToken, htsToken);
        assertEq(operation.targetToken, erc20Token);
        assertEq(operation.amount, amount);
        assertEq(operation.sourceChainId, HEDERA_CHAIN_ID);
        assertEq(operation.targetChainId, BSC_CHAIN_ID);
        assertTrue(operation.status == IBridgeAdapter.BridgeStatus.Pending);
        
        vm.stopPrank();
    }
    
    function testCompleteBridgeOperation() public {
        // Setup: Create mapping and initiate bridge operation
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        uint256 amount = 1 ether;
        
        vm.prank(user1);
        bytes32 operationId = bridgeAdapter.bridgeToHedera(erc20Token, amount, user1);
        
        // Mock HTS token manager for minting
        vm.mockCall(
            address(htsTokenManager),
            abi.encodeWithSelector(HTSTokenManager.mintShares.selector, user1, amount),
            abi.encode(uint64(1000))
        );
        
        // Complete the operation
        bytes32 txHash = keccak256("test_tx_hash");
        
        vm.prank(bridgeService);
        bridgeAdapter.completeBridgeOperation(operationId, txHash);
        
        // Verify operation was completed
        IBridgeAdapter.BridgeOperation memory operation = bridgeAdapter.getBridgeOperation(operationId);
        assertTrue(operation.status == IBridgeAdapter.BridgeStatus.Completed);
        assertEq(operation.txHash, txHash);
        
        // Verify total bridged amount was updated
        uint256 totalBridged = bridgeAdapter.getTotalBridged(htsToken, BSC_CHAIN_ID);
        assertEq(totalBridged, amount);
    }
    
    function testCancelBridgeOperation() public {
        // Setup: Create mapping and initiate bridge operation
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        uint256 amount = 1 ether;
        
        vm.prank(user1);
        bytes32 operationId = bridgeAdapter.bridgeToHedera(erc20Token, amount, user1);
        
        // Cancel the operation
        string memory reason = "Network failure";
        
        vm.prank(bridgeService);
        bridgeAdapter.cancelBridgeOperation(operationId, reason);
        
        // Verify operation was cancelled
        IBridgeAdapter.BridgeOperation memory operation = bridgeAdapter.getBridgeOperation(operationId);
        assertTrue(operation.status == IBridgeAdapter.BridgeStatus.Failed);
    }
    
    function testValidateBridgeOperation() public {
        // Setup: Create token mapping
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        uint256 amount = 1 ether;
        
        // Test valid operation
        (bool valid, string memory reason) = bridgeAdapter.validateBridgeOperation(
            htsToken,
            BSC_CHAIN_ID,
            amount
        );
        assertTrue(valid);
        assertEq(reason, "");
        
        // Test invalid amount (too small)
        (valid, reason) = bridgeAdapter.validateBridgeOperation(
            htsToken,
            BSC_CHAIN_ID,
            0.0001 ether
        );
        assertFalse(valid);
        assertEq(reason, "Amount below minimum");
        
        // Test invalid amount (too large)
        (valid, reason) = bridgeAdapter.validateBridgeOperation(
            htsToken,
            BSC_CHAIN_ID,
            2000000 ether
        );
        assertFalse(valid);
        assertEq(reason, "Amount above maximum");
        
        // Test unsupported chain
        (valid, reason) = bridgeAdapter.validateBridgeOperation(
            htsToken,
            999,
            amount
        );
        assertFalse(valid);
        assertEq(reason, "Unsupported target chain");
    }
    
    function testBridgeLimits() public {
        // Setup: Create token mapping
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        // Set custom limits
        uint256 dailyLimit = 100 ether;
        uint256 singleOpLimit = 10 ether;
        
        vm.prank(owner);
        bridgeAdapter.setBridgeLimits(htsToken, dailyLimit, singleOpLimit);
        
        // Test single operation limit
        vm.prank(user1);
        vm.expectRevert("Single operation limit exceeded");
        bridgeAdapter.bridgeToHedera(erc20Token, 15 ether, user1);
        
        // Test valid operation within limits
        vm.prank(user1);
        bridgeAdapter.bridgeToHedera(erc20Token, 5 ether, user1);
    }
    
    function testPauseFunctionality() public {
        // Setup: Create token mapping
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        // Pause bridge
        vm.prank(owner);
        bridgeAdapter.pauseBridge();
        
        // Test that operations fail when paused
        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        bridgeAdapter.bridgeToHedera(erc20Token, 1 ether, user1);
        
        // Unpause bridge
        vm.prank(owner);
        bridgeAdapter.unpauseBridge();
        
        // Test that operations work after unpause
        vm.prank(user1);
        bridgeAdapter.bridgeToHedera(erc20Token, 1 ether, user1);
    }
    
    function testGetUserBridgeOperations() public {
        // Setup: Create token mapping
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        // Create multiple operations for user
        vm.startPrank(user1);
        
        bytes32 op1 = bridgeAdapter.bridgeToHedera(erc20Token, 1 ether, user1);
        bytes32 op2 = bridgeAdapter.bridgeToHedera(erc20Token, 2 ether, user1);
        
        vm.stopPrank();
        
        // Get user operations
        IBridgeAdapter.BridgeOperation[] memory operations = bridgeAdapter.getUserBridgeOperations(user1, 0, 10);
        
        assertEq(operations.length, 2);
        assertEq(operations[0].operationId, op1);
        assertEq(operations[1].operationId, op2);
        assertEq(operations[0].amount, 1 ether);
        assertEq(operations[1].amount, 2 ether);
    }
    
    function testBridgeFeeCalculation() public {
        uint256 amount = 100 ether;
        uint256 expectedFee = (amount * 100) / 10000; // 1% fee
        
        uint256 fee = bridgeAdapter.getBridgeFee(htsToken, BSC_CHAIN_ID, amount);
        assertEq(fee, expectedFee);
    }
    
    function testOnlyOwnerFunctions() public {
        // Test that non-owner cannot call owner functions
        vm.startPrank(user1);
        
        vm.expectRevert();
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        vm.expectRevert();
        bridgeAdapter.setBridgeLimits(htsToken, 100 ether, 10 ether);
        
        vm.expectRevert();
        bridgeAdapter.pauseBridge();
        
        vm.expectRevert();
        bridgeAdapter.setBridgeService(user2);
        
        vm.stopPrank();
    }
    
    function testOnlyBridgeServiceFunctions() public {
        // Setup: Create operation
        vm.prank(owner);
        bridgeAdapter.createTokenMapping(htsToken, erc20Token, BSC_CHAIN_ID);
        
        vm.prank(user1);
        bytes32 operationId = bridgeAdapter.bridgeToHedera(erc20Token, 1 ether, user1);
        
        // Test that non-bridge-service cannot complete operations
        vm.prank(user1);
        vm.expectRevert("Only bridge service");
        bridgeAdapter.completeBridgeOperation(operationId, bytes32(0));
        
        vm.prank(user1);
        vm.expectRevert("Only bridge service");
        bridgeAdapter.cancelBridgeOperation(operationId, "test");
    }
}