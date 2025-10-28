// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridgeAdapter
 * @dev Interface for cross-chain bridge adapter supporting HTS ↔ ERC-20 token mapping
 * @notice Enables cross-chain operations between Hedera and EVM networks (BSC, Ethereum)
 */
interface IBridgeAdapter {
    
    // Structs
    struct TokenMapping {
        address htsToken;           // Hedera HTS token address
        address erc20Token;         // ERC-20 token address on source chain
        uint256 chainId;            // Source chain ID (BSC: 56, Ethereum: 1)
        bool active;                // Whether mapping is active
        uint256 totalBridged;       // Total amount bridged
        uint256 createdAt;          // Mapping creation timestamp
    }
    
    struct BridgeOperation {
        bytes32 operationId;        // Unique operation identifier
        address user;               // User initiating the bridge
        address sourceToken;        // Source token address
        address targetToken;        // Target token address
        uint256 amount;             // Amount to bridge
        uint256 sourceChainId;      // Source chain ID
        uint256 targetChainId;      // Target chain ID
        BridgeStatus status;        // Current operation status
        uint256 timestamp;          // Operation timestamp
        bytes32 txHash;             // Transaction hash
        string hcsMessageId;        // HCS message ID for audit trail
    }
    
    enum BridgeStatus {
        Pending,
        InProgress,
        Completed,
        Failed,
        Cancelled
    }
    
    // Events
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
    
    event BridgeOperationCompleted(
        bytes32 indexed operationId,
        address indexed user,
        uint256 amount,
        bytes32 txHash
    );
    
    event BridgeOperationFailed(
        bytes32 indexed operationId,
        address indexed user,
        string reason
    );
    
    event TokensLocked(
        address indexed token,
        address indexed user,
        uint256 amount,
        bytes32 operationId
    );
    
    event TokensUnlocked(
        address indexed token,
        address indexed user,
        uint256 amount,
        bytes32 operationId
    );
    
    event TokensMinted(
        address indexed token,
        address indexed user,
        uint256 amount,
        bytes32 operationId
    );
    
    event TokensBurned(
        address indexed token,
        address indexed user,
        uint256 amount,
        bytes32 operationId
    );
    
    // Core Bridge Functions
    
    /**
     * @dev Create a new token mapping between HTS and ERC-20 tokens
     * @param htsToken Address of the HTS token on Hedera
     * @param erc20Token Address of the ERC-20 token on source chain
     * @param chainId Source chain ID
     */
    function createTokenMapping(
        address htsToken,
        address erc20Token,
        uint256 chainId
    ) external;
    
    /**
     * @dev Initiate bridge operation from ERC-20 to HTS
     * @param erc20Token Source ERC-20 token address
     * @param amount Amount to bridge
     * @param recipient Recipient address on Hedera
     * @return operationId Unique operation identifier
     */
    function bridgeToHedera(
        address erc20Token,
        uint256 amount,
        address recipient
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Initiate bridge operation from HTS to ERC-20
     * @param htsToken Source HTS token address
     * @param amount Amount to bridge
     * @param targetChainId Target chain ID
     * @param recipient Recipient address on target chain
     * @return operationId Unique operation identifier
     */
    function bridgeFromHedera(
        address htsToken,
        uint256 amount,
        uint256 targetChainId,
        address recipient
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Complete bridge operation (called by bridge service)
     * @param operationId Operation identifier
     * @param txHash Transaction hash from target chain
     */
    function completeBridgeOperation(
        bytes32 operationId,
        bytes32 txHash
    ) external;
    
    /**
     * @dev Cancel failed bridge operation
     * @param operationId Operation identifier
     * @param reason Cancellation reason
     */
    function cancelBridgeOperation(
        bytes32 operationId,
        string memory reason
    ) external;
    
    // Validation Functions
    
    /**
     * @dev Validate bridge operation parameters
     * @param sourceToken Source token address
     * @param targetChainId Target chain ID
     * @param amount Amount to bridge
     * @return valid Whether operation is valid
     * @return reason Validation failure reason (if invalid)
     */
    function validateBridgeOperation(
        address sourceToken,
        uint256 targetChainId,
        uint256 amount
    ) external view returns (bool valid, string memory reason);
    
    /**
     * @dev Check if token mapping exists and is active
     * @param token Token address
     * @param chainId Chain ID
     * @return exists Whether mapping exists
     * @return active Whether mapping is active
     */
    function isTokenMappingActive(
        address token,
        uint256 chainId
    ) external view returns (bool exists, bool active);
    
    /**
     * @dev Get estimated bridge fee
     * @param sourceToken Source token address
     * @param targetChainId Target chain ID
     * @param amount Amount to bridge
     * @return fee Bridge fee in native token
     */
    function getBridgeFee(
        address sourceToken,
        uint256 targetChainId,
        uint256 amount
    ) external view returns (uint256 fee);
    
    // Query Functions
    
    /**
     * @dev Get token mapping information
     * @param token Token address
     * @param chainId Chain ID
     * @return mapping Token mapping details
     */
    function getTokenMapping(
        address token,
        uint256 chainId
    ) external view returns (TokenMapping memory mapping);
    
    /**
     * @dev Get bridge operation details
     * @param operationId Operation identifier
     * @return operation Bridge operation details
     */
    function getBridgeOperation(
        bytes32 operationId
    ) external view returns (BridgeOperation memory operation);
    
    /**
     * @dev Get user's bridge operations
     * @param user User address
     * @param offset Pagination offset
     * @param limit Pagination limit
     * @return operations Array of bridge operations
     */
    function getUserBridgeOperations(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (BridgeOperation[] memory operations);
    
    /**
     * @dev Get total bridged amount for token mapping
     * @param token Token address
     * @param chainId Chain ID
     * @return totalBridged Total amount bridged
     */
    function getTotalBridged(
        address token,
        uint256 chainId
    ) external view returns (uint256 totalBridged);
    
    // Security Functions
    
    /**
     * @dev Pause bridge operations
     */
    function pauseBridge() external;
    
    /**
     * @dev Unpause bridge operations
     */
    function unpauseBridge() external;
    
    /**
     * @dev Set bridge operation limits
     * @param token Token address
     * @param dailyLimit Daily bridge limit
     * @param singleOpLimit Single operation limit
     */
    function setBridgeLimits(
        address token,
        uint256 dailyLimit,
        uint256 singleOpLimit
    ) external;
    
    /**
     * @dev Emergency withdraw locked tokens
     * @param token Token address
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external;
}