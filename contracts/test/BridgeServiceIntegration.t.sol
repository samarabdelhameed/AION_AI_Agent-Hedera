// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/hedera/BridgeServiceIntegration.sol";
import "../src/hedera/BridgeAdapter.sol";
import "../src/hedera/HashportBridgeService.sol";
import "../src/hedera/LayerZeroBridgeService.sol";
import "../src/hedera/HTSTokenManager.sol";

contract BridgeServiceIntegrationTest is Test {
    BridgeServiceIntegration public integration;
    BridgeAdapter public bridgeAdapter;
    HTSTokenManager public htsTokenManager;
    HashportBridgeService public hashportService;
    LayerZeroBridgeService public layerZeroService;

    address public owner = address(0x1);
    address public user1 = address(0x3);
    address public feeCollector = address(0x4);
    address public mockLzEndpoint = address(0x5);

    uint256 public constant BSC_CHAIN_ID = 56;
    uint256 public constant ETH_CHAIN_ID = 1;
    uint256 public constant HEDERA_CHAIN_ID = 295;

    event BridgeServiceAdded(
        address indexed service,
        BridgeServiceIntegration.BridgeServiceType serviceType,
        uint256 priority,
        uint256[] supportedChains
    );

    event BridgeOperationRouted(
        bytes32 indexed operationId,
        address indexed service,
        uint256 targetChainId,
        BridgeServiceIntegration.BridgeServiceType serviceType
    );

    function setUp() public {
        vm.startPrank(owner);

        // Deploy HTS Token Manager
        htsTokenManager = new HTSTokenManager(owner);

        // Deploy Bridge Adapter
        bridgeAdapter = new BridgeAdapter(
            owner,
            owner,
            address(htsTokenManager)
        );

        // Deploy Bridge Service Integration
        integration = new BridgeServiceIntegration(
            owner,
            address(bridgeAdapter)
        );

        // Deploy Hashport Bridge Service
        hashportService = new HashportBridgeService(owner, feeCollector);

        // Deploy LayerZero Bridge Service (with mock endpoint)
        layerZeroService = new LayerZeroBridgeService(owner, mockLzEndpoint);

        vm.stopPrank();
    }

    function testAddBridgeService() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](2);
        supportedChains[0] = BSC_CHAIN_ID;
        supportedChains[1] = ETH_CHAIN_ID;

        // Test adding Hashport service
        vm.expectEmit(true, false, false, true);
        emit BridgeServiceAdded(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Verify service was added
        BridgeServiceIntegration.ServiceConfig memory config = integration
            .getServiceConfig(address(hashportService));
        assertEq(address(config.service), address(hashportService));
        assertTrue(config.active);
        assertEq(config.priority, 100);
        assertEq(
            uint256(config.serviceType),
            uint256(BridgeServiceIntegration.BridgeServiceType.Hashport)
        );

        // Verify default service was set
        assertEq(integration.defaultService(), address(hashportService));

        vm.stopPrank();
    }

    function testAddMultipleBridgeServices() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](2);
        supportedChains[0] = BSC_CHAIN_ID;
        supportedChains[1] = ETH_CHAIN_ID;

        // Add Hashport service with lower priority
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            50,
            supportedChains
        );

        // Add LayerZero service with higher priority
        integration.addBridgeService(
            address(layerZeroService),
            BridgeServiceIntegration.BridgeServiceType.LayerZero,
            100,
            supportedChains
        );

        // Verify both services are active
        address[] memory activeServices = integration.getActiveServices();
        assertEq(activeServices.length, 2);

        // Verify services for chain
        address[] memory bscServices = integration.getServicesForChain(
            BSC_CHAIN_ID
        );
        assertEq(bscServices.length, 2);

        vm.stopPrank();
    }

    function testUpdateBridgeService() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Add service
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Update service
        integration.updateBridgeService(address(hashportService), false, 200);

        // Verify update
        BridgeServiceIntegration.ServiceConfig memory config = integration
            .getServiceConfig(address(hashportService));
        assertFalse(config.active);
        assertEq(config.priority, 200);

        vm.stopPrank();
    }

    function testRemoveBridgeService() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Add service
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Verify service exists
        assertTrue(
            integration.getServiceConfig(address(hashportService)).active
        );

        // Remove service
        integration.removeBridgeService(address(hashportService));

        // Verify service was removed
        assertFalse(
            integration.getServiceConfig(address(hashportService)).active
        );

        // Verify no active services
        address[] memory activeServices = integration.getActiveServices();
        assertEq(activeServices.length, 0);

        vm.stopPrank();
    }

    function testSetPreferredServiceByChain() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](2);
        supportedChains[0] = BSC_CHAIN_ID;
        supportedChains[1] = ETH_CHAIN_ID;

        // Add services
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            50,
            supportedChains
        );

        integration.addBridgeService(
            address(layerZeroService),
            BridgeServiceIntegration.BridgeServiceType.LayerZero,
            100,
            supportedChains
        );

        // Set preferred service for BSC
        integration.setPreferredServiceByChain(
            BSC_CHAIN_ID,
            address(hashportService)
        );

        // Verify preferred service
        assertEq(
            integration.preferredServiceByChain(BSC_CHAIN_ID),
            address(hashportService)
        );

        vm.stopPrank();
    }

    function testEstimateBridgeFee() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Add service
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Estimate fee
        bytes memory payload = abi.encode("test payload");
        (uint256 fee, address service) = integration.estimateBridgeFee(
            BSC_CHAIN_ID,
            200000,
            payload
        );

        // Verify fee estimation
        assertTrue(fee > 0);
        assertEq(service, address(hashportService));

        vm.stopPrank();
    }

    function testGetServicesForChain() public {
        vm.startPrank(owner);

        uint256[] memory bscChains = new uint256[](1);
        bscChains[0] = BSC_CHAIN_ID;

        uint256[] memory ethChains = new uint256[](1);
        ethChains[0] = ETH_CHAIN_ID;

        // Add services for different chains
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            bscChains
        );

        integration.addBridgeService(
            address(layerZeroService),
            BridgeServiceIntegration.BridgeServiceType.LayerZero,
            100,
            ethChains
        );

        // Test BSC services
        address[] memory bscServices = integration.getServicesForChain(
            BSC_CHAIN_ID
        );
        assertEq(bscServices.length, 1);
        assertEq(bscServices[0], address(hashportService));

        // Test Ethereum services
        address[] memory ethServices = integration.getServicesForChain(
            ETH_CHAIN_ID
        );
        assertEq(ethServices.length, 1);
        assertEq(ethServices[0], address(layerZeroService));

        // Test unsupported chain
        address[] memory hederaServices = integration.getServicesForChain(
            HEDERA_CHAIN_ID
        );
        assertEq(hederaServices.length, 0);

        vm.stopPrank();
    }

    function testServiceSupportsChain() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Add service
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Test supported chain
        assertTrue(
            integration.serviceSupportsChain(
                address(hashportService),
                BSC_CHAIN_ID
            )
        );

        // Test unsupported chain
        assertFalse(
            integration.serviceSupportsChain(
                address(hashportService),
                ETH_CHAIN_ID
            )
        );

        vm.stopPrank();
    }

    function testGetServiceStats() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](2);
        supportedChains[0] = BSC_CHAIN_ID;
        supportedChains[1] = ETH_CHAIN_ID;

        // Add service
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Get service stats
        (
            uint256 totalChains,
            uint256 totalMessages,
            bool isActive,
            BridgeServiceIntegration.BridgeServiceType serviceType
        ) = integration.getServiceStats(address(hashportService));

        // Verify stats
        assertEq(totalChains, 2);
        assertEq(totalMessages, 0); // No messages sent yet
        assertTrue(isActive);
        assertEq(
            uint256(serviceType),
            uint256(BridgeServiceIntegration.BridgeServiceType.Hashport)
        );

        vm.stopPrank();
    }

    function test_RevertWhen_AddInvalidService() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Try to add invalid service (should fail with any error)
        vm.expectRevert();
        integration.addBridgeService(
            address(0x999), // Invalid address
            BridgeServiceIntegration.BridgeServiceType.Custom,
            100,
            supportedChains
        );

        vm.stopPrank();
    }

    function test_RevertWhen_AddDuplicateService() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Add service
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Try to add same service again (should fail)
        vm.expectRevert("Service already exists");
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        vm.stopPrank();
    }

    function test_RevertWhen_SetPreferredServiceUnsupportedChain() public {
        vm.startPrank(owner);

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Add service that doesn't support Ethereum
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        // Try to set as preferred for unsupported chain (should fail)
        vm.expectRevert("Service doesn't support chain");
        integration.setPreferredServiceByChain(
            ETH_CHAIN_ID,
            address(hashportService)
        );

        vm.stopPrank();
    }

    function testOnlyOwnerFunctions() public {
        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = BSC_CHAIN_ID;

        // Test that non-owner cannot call owner functions
        vm.startPrank(user1);

        vm.expectRevert();
        integration.addBridgeService(
            address(hashportService),
            BridgeServiceIntegration.BridgeServiceType.Hashport,
            100,
            supportedChains
        );

        vm.expectRevert();
        integration.updateBridgeService(address(hashportService), false, 200);

        vm.expectRevert();
        integration.removeBridgeService(address(hashportService));

        vm.expectRevert();
        integration.setDefaultService(address(hashportService));

        vm.expectRevert();
        integration.setPreferredServiceByChain(
            BSC_CHAIN_ID,
            address(hashportService)
        );

        vm.stopPrank();
    }
}
