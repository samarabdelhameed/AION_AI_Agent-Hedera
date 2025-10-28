// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridgeService
 * @dev Interface for cross-chain bridge services (Hashport, LayerZero, etc.)
 * @notice Standardized interface for different bridge implementations
 */
interface IBridgeService {
    
    // Structs
    struct BridgeConfig {
        uint256 chainId;            // Target chain ID
        address endpoint;           // Bridge endpoint address
        uint256 fee;                // Bridge fee
        uint256 gasLimit;           // Gas limit for cross-chain execution
        bool active;                // Whether bridge is active
    }
    
    struct CrossChainMessage {
        uint256 sourceChainId;      // Source chain ID
        uint256 targetChainId;      // Target chain ID
        address sourceToken;        // Source token address
        address targetToken;        // Target token address
        address sender;             // Message sender
        address recipient;          // Message recipient
        uint256 amount;             // Token amount
        bytes payload;              // Additional payload data
        uint256 nonce;              // Message nonce
    }
    
    // Events
    event BridgeConfigUpdated(
        uint256 indexed chainId,
        address endpoint,
        uint256 fee,
        uint256 gasLimit,
        bool active
    );
    
    event CrossChainMessageSent(
        bytes32 indexed messageId,
        uint256 indexed sourceChainId,
        uint256 indexed targetChainId,
        address sender,
        address recipient,
        uint256 amount
    );
    
    event CrossChainMessageReceived(
        bytes32 indexed messageId,
        uint256 indexed sourceChainId,
        address recipient,
        uint256 amount,
        bool success
    );
    
    event BridgeFeePaid(
        bytes32 indexed messageId,
        address indexed payer,
        uint256 fee
    );
    
    // Core Bridge Functions
    
    /**
     * @dev Send cross-chain message
     * @param targetChainId Target chain ID
     * @param targetToken Target token address
     * @param recipient Recipient address on target chain
     * @param amount Token amount to bridge
     * @param payload Additional payload data
     * @return messageId Unique message identifier
     */
    function sendCrossChainMessage(
        uint256 targetChainId,
        address targetToken,
        address recipient,
        uint256 amount,
        bytes calldata payload
    ) external payable returns (bytes32 messageId);
    
    /**
     * @dev Receive and process cross-chain message
     * @param message Cross-chain message data
     * @param proof Merkle proof or signature for validation
     */
    function receiveCrossChainMessage(
        CrossChainMessage calldata message,
        bytes calldata proof
    ) external;
    
    /**
     * @dev Estimate bridge fee for cross-chain operation
     * @param targetChainId Target chain ID
     * @param gasLimit Gas limit for execution
     * @param payload Message payload
     * @return fee Estimated bridge fee
     */
    function estimateFee(
        uint256 targetChainId,
        uint256 gasLimit,
        bytes calldata payload
    ) external view returns (uint256 fee);
    
    /**
     * @dev Check if chain is supported
     * @param chainId Chain ID to check
     * @return supported Whether chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool supported);
    
    /**
     * @dev Get bridge configuration for chain
     * @param chainId Chain ID
     * @return config Bridge configuration
     */
    function getBridgeConfig(uint256 chainId) external view returns (BridgeConfig memory config);
    
    /**
     * @dev Verify cross-chain message authenticity
     * @param message Cross-chain message
     * @param proof Validation proof
     * @return valid Whether message is valid
     */
    function verifyMessage(
        CrossChainMessage calldata message,
        bytes calldata proof
    ) external view returns (bool valid);
    
    // Configuration Functions
    
    /**
     * @dev Set bridge configuration for chain
     * @param chainId Chain ID
     * @param endpoint Bridge endpoint address
     * @param fee Bridge fee
     * @param gasLimit Gas limit
     * @param active Whether bridge is active
     */
    function setBridgeConfig(
        uint256 chainId,
        address endpoint,
        uint256 fee,
        uint256 gasLimit,
        bool active
    ) external;
    
    /**
     * @dev Pause bridge operations
     */
    function pauseBridge() external;
    
    /**
     * @dev Unpause bridge operations
     */
    function unpauseBridge() external;
    
    // Query Functions
    
    /**
     * @dev Get supported chain IDs
     * @return chainIds Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory chainIds);
    
    /**
     * @dev Get message status
     * @param messageId Message identifier
     * @return status Message status (0: pending, 1: completed, 2: failed)
     */
    function getMessageStatus(bytes32 messageId) external view returns (uint8 status);
    
    /**
     * @dev Get total messages sent to chain
     * @param chainId Chain ID
     * @return count Total message count
     */
    function getMessageCount(uint256 chainId) external view returns (uint256 count);
}