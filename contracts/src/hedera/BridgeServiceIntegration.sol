// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BridgeAdapter.sol";
import "./HashportBridgeService.sol";
import "./LayerZeroBridgeService.sol";
import "../interfaces/IBridgeService.sol";

/**
 * @title BridgeServiceIntegration
 * @dev Integration layer between BridgeAdapter and various bridge services
 * @notice Manages multiple bridge services and routes operations accordingly
 */
contract BridgeServiceIntegration is Ownable, ReentrancyGuard {
    
    // Bridge service types
    enum BridgeServiceType {
        Hashport,
        LayerZero,
        Custom
    }
    
    // Bridge service configuration
    struct ServiceConfig {
        IBridgeService service;
        BridgeServiceType serviceType;
        bool active;
        uint256 priority;           // Higher number = higher priority
        uint256[] supportedChains;
        uint256 addedAt;
    }
    
    // State variables
    BridgeAdapter public immutable bridgeAdapter;
    mapping(address => ServiceConfig) public bridgeServices;
    mapping(uint256 => address[]) public chainToServices; // chainId => service addresses
    address[] public serviceList;
    
    // Default service selection
    address public defaultService;
    mapping(uint256 => address) public preferredServiceByChain;
    
    // Events
    event BridgeServiceAdded(
        address indexed service,
        BridgeServiceType serviceType,
        uint256 priority,
        uint256[] supportedChains
    );
    
    event BridgeServiceUpdated(
        address indexed service,
        bool active,
        uint256 priority
    );
    
    event BridgeServiceRemoved(address indexed service);
    
    event DefaultServiceUpdated(address indexed oldService, address indexed newService);
    
    event PreferredServiceUpdated(uint256 indexed chainId, address indexed service);
    
    event BridgeOperationRouted(
        bytes32 indexed operationId,
        address indexed service,
        uint256 targetChainId,
        BridgeServiceType serviceType
    );
    
    constructor(
        address initialOwner,
        address _bridgeAdapter
    ) Ownable(initialOwner) {
        require(_bridgeAdapter != address(0), "Invalid bridge adapter");
        bridgeAdapter = BridgeAdapter(_bridgeAdapter);
    }
    
    /**
     * @dev Add a new bridge service
     */
    function addBridgeService(
        address service,
        BridgeServiceType serviceType,
        uint256 priority,
        uint256[] calldata supportedChains
    ) external onlyOwner {
        require(service != address(0), "Invalid service address");
        require(!bridgeServices[service].active, "Service already exists");
        require(supportedChains.length > 0, "No supported chains");
        
        // Validate service interface
        require(_validateServiceInterface(service), "Invalid service interface");
        
        // Add service configuration
        bridgeServices[service] = ServiceConfig({
            service: IBridgeService(service),
            serviceType: serviceType,
            active: true,
            priority: priority,
            supportedChains: supportedChains,
            addedAt: block.timestamp
        });
        
        serviceList.push(service);
        
        // Update chain mappings
        for (uint256 i = 0; i < supportedChains.length; i++) {
            chainToServices[supportedChains[i]].push(service);
        }
        
        // Set as default if first service
        if (defaultService == address(0)) {
            defaultService = service;
        }
        
        emit BridgeServiceAdded(service, serviceType, priority, supportedChains);
    }
    
    /**
     * @dev Update bridge service configuration
     */
    function updateBridgeService(
        address service,
        bool active,
        uint256 priority
    ) external onlyOwner {
        require(bridgeServices[service].service != IBridgeService(address(0)), "Service not found");
        
        bridgeServices[service].active = active;
        bridgeServices[service].priority = priority;
        
        emit BridgeServiceUpdated(service, active, priority);
    }
    
    /**
     * @dev Remove bridge service
     */
    function removeBridgeService(address service) external onlyOwner {
        require(bridgeServices[service].active, "Service not active");
        
        // Remove from service list
        for (uint256 i = 0; i < serviceList.length; i++) {
            if (serviceList[i] == service) {
                serviceList[i] = serviceList[serviceList.length - 1];
                serviceList.pop();
                break;
            }
        }
        
        // Remove from chain mappings
        uint256[] memory supportedChains = bridgeServices[service].supportedChains;
        for (uint256 i = 0; i < supportedChains.length; i++) {
            address[] storage services = chainToServices[supportedChains[i]];
            for (uint256 j = 0; j < services.length; j++) {
                if (services[j] == service) {
                    services[j] = services[services.length - 1];
                    services.pop();
                    break;
                }
            }
        }
        
        // Clear service configuration
        delete bridgeServices[service];
        
        // Update default service if needed
        if (defaultService == service) {
            defaultService = serviceList.length > 0 ? serviceList[0] : address(0);
        }
        
        emit BridgeServiceRemoved(service);
    }
    
    /**
     * @dev Set default bridge service
     */
    function setDefaultService(address service) external onlyOwner {
        require(bridgeServices[service].active, "Service not active");
        
        address oldService = defaultService;
        defaultService = service;
        
        emit DefaultServiceUpdated(oldService, service);
    }
    
    /**
     * @dev Set preferred service for specific chain
     */
    function setPreferredServiceByChain(uint256 chainId, address service) external onlyOwner {
        require(bridgeServices[service].active, "Service not active");
        require(_serviceSupportsChain(service, chainId), "Service doesn't support chain");
        
        preferredServiceByChain[chainId] = service;
        
        emit PreferredServiceUpdated(chainId, service);
    }
    
    /**
     * @dev Route bridge operation to appropriate service
     */
    function routeBridgeOperation(
        uint256 targetChainId,
        address targetToken,
        address recipient,
        uint256 amount,
        bytes calldata payload
    ) external payable nonReentrant returns (bytes32 messageId, address usedService) {
        // Select best service for the operation
        address selectedService = _selectBestService(targetChainId);
        require(selectedService != address(0), "No available service for chain");
        
        ServiceConfig memory config = bridgeServices[selectedService];
        require(config.active, "Selected service not active");
        
        // Route to selected service
        messageId = config.service.sendCrossChainMessage{value: msg.value}(
            targetChainId,
            targetToken,
            recipient,
            amount,
            payload
        );
        
        emit BridgeOperationRouted(
            messageId,
            selectedService,
            targetChainId,
            config.serviceType
        );
        
        return (messageId, selectedService);
    }
    
    /**
     * @dev Estimate fee for bridge operation
     */
    function estimateBridgeFee(
        uint256 targetChainId,
        uint256 gasLimit,
        bytes calldata payload
    ) external view returns (uint256 fee, address service) {
        address selectedService = _selectBestService(targetChainId);
        if (selectedService == address(0)) {
            return (0, address(0));
        }
        
        ServiceConfig memory config = bridgeServices[selectedService];
        uint256 estimatedFee = config.service.estimateFee(targetChainId, gasLimit, payload);
        
        return (estimatedFee, selectedService);
    }
    
    /**
     * @dev Get available services for chain
     */
    function getServicesForChain(uint256 chainId) external view returns (address[] memory services) {
        address[] memory chainServices = chainToServices[chainId];
        uint256 activeCount = 0;
        
        // Count active services
        for (uint256 i = 0; i < chainServices.length; i++) {
            if (bridgeServices[chainServices[i]].active) {
                activeCount++;
            }
        }
        
        // Build active services array
        services = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < chainServices.length; i++) {
            if (bridgeServices[chainServices[i]].active) {
                services[index] = chainServices[i];
                index++;
            }
        }
        
        return services;
    }
    
    /**
     * @dev Get service configuration
     */
    function getServiceConfig(address service) external view returns (ServiceConfig memory config) {
        return bridgeServices[service];
    }
    
    /**
     * @dev Get all active services
     */
    function getActiveServices() external view returns (address[] memory services) {
        uint256 activeCount = 0;
        
        // Count active services
        for (uint256 i = 0; i < serviceList.length; i++) {
            if (bridgeServices[serviceList[i]].active) {
                activeCount++;
            }
        }
        
        // Build active services array
        services = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < serviceList.length; i++) {
            if (bridgeServices[serviceList[i]].active) {
                services[index] = serviceList[i];
                index++;
            }
        }
        
        return services;
    }
    
    /**
     * @dev Check if service supports chain
     */
    function serviceSupportsChain(address service, uint256 chainId) external view returns (bool) {
        return _serviceSupportsChain(service, chainId);
    }
    
    /**
     * @dev Get service statistics
     */
    function getServiceStats(address service) external view returns (
        uint256 totalChains,
        uint256 totalMessages,
        bool isActive,
        BridgeServiceType serviceType
    ) {
        ServiceConfig memory config = bridgeServices[service];
        
        totalChains = config.supportedChains.length;
        isActive = config.active;
        serviceType = config.serviceType;
        
        // Calculate total messages across all supported chains
        for (uint256 i = 0; i < config.supportedChains.length; i++) {
            totalMessages += config.service.getMessageCount(config.supportedChains[i]);
        }
        
        return (totalChains, totalMessages, isActive, serviceType);
    }
    
    // Internal functions
    
    /**
     * @dev Select best service for target chain
     */
    function _selectBestService(uint256 targetChainId) internal view returns (address) {
        // Check for preferred service first
        address preferred = preferredServiceByChain[targetChainId];
        if (preferred != address(0) && bridgeServices[preferred].active) {
            return preferred;
        }
        
        // Find service with highest priority that supports the chain
        address[] memory chainServices = chainToServices[targetChainId];
        address bestService = address(0);
        uint256 highestPriority = 0;
        
        for (uint256 i = 0; i < chainServices.length; i++) {
            address service = chainServices[i];
            ServiceConfig memory config = bridgeServices[service];
            
            if (config.active && config.priority > highestPriority) {
                bestService = service;
                highestPriority = config.priority;
            }
        }
        
        // Fallback to default service if it supports the chain
        if (bestService == address(0) && defaultService != address(0)) {
            if (_serviceSupportsChain(defaultService, targetChainId) && 
                bridgeServices[defaultService].active) {
                return defaultService;
            }
        }
        
        return bestService;
    }
    
    /**
     * @dev Check if service supports specific chain
     */
    function _serviceSupportsChain(address service, uint256 chainId) internal view returns (bool) {
        uint256[] memory supportedChains = bridgeServices[service].supportedChains;
        
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == chainId) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Validate service interface
     */
    function _validateServiceInterface(address service) internal view returns (bool) {
        try IBridgeService(service).isChainSupported(1) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Emergency pause all services
     */
    function emergencyPauseAllServices() external onlyOwner {
        for (uint256 i = 0; i < serviceList.length; i++) {
            address service = serviceList[i];
            if (bridgeServices[service].active) {
                try IBridgeService(service).pauseBridge() {
                    // Service paused successfully
                } catch {
                    // Service doesn't support pausing or failed
                }
            }
        }
    }
    
    /**
     * @dev Emergency unpause all services
     */
    function emergencyUnpauseAllServices() external onlyOwner {
        for (uint256 i = 0; i < serviceList.length; i++) {
            address service = serviceList[i];
            if (bridgeServices[service].active) {
                try IBridgeService(service).unpauseBridge() {
                    // Service unpaused successfully
                } catch {
                    // Service doesn't support unpausing or failed
                }
            }
        }
    }
}