// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IBridgeAdapter.sol";
import "./HTSTokenManager.sol";

/**
 * @title BridgeAdapter
 * @dev Implementation of cross-chain bridge adapter for HTS ↔ ERC-20 token mapping
 * @notice Enables secure cross-chain operations between Hedera and EVM networks
 */
contract BridgeAdapter is IBridgeAdapter, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant MAX_BRIDGE_AMOUNT = 1000000 ether; // Maximum single bridge amount
    uint256 public constant MIN_BRIDGE_AMOUNT = 0.001 ether;   // Minimum single bridge amount
    uint256 public constant OPERATION_TIMEOUT = 24 hours;      // Bridge operation timeout
    
    // State variables
    mapping(bytes32 => TokenMapping) public tokenMappings;     // token+chainId hash => mapping
    mapping(bytes32 => BridgeOperation) public bridgeOperations; // operationId => operation
    mapping(address => bytes32[]) public userOperations;       // user => operationIds
    mapping(address => mapping(uint256 => uint256)) public dailyBridged; // token => day => amount
    mapping(address => uint256) public bridgeLimits;           // token => daily limit
    mapping(address => uint256) public singleOpLimits;         // token => single op limit
    mapping(address => uint256) public lockedTokens;           // token => locked amount
    
    // Bridge service configuration
    address public bridgeService;                              // Authorized bridge service
    HTSTokenManager public htsTokenManager;                    // HTS token manager
    uint256 public bridgeFeeRate = 100;                       // Bridge fee in basis points (1%)
    uint256 public operationCounter;                           // Operation counter for unique IDs
    
    // Events for audit trail
    event BridgeServiceUpdated(address indexed oldService, address indexed newService);
    event BridgeFeeUpdated(uint256 oldFee, uint256 newFee);
    event TokenMappingDeactivated(address indexed token, uint256 indexed chainId);
    event DailyLimitExceeded(address indexed token, address indexed user, uint256 amount, uint256 limit);
    
    // Modifiers
    modifier onlyBridgeService() {
        require(msg.sender == bridgeService, "Only bridge service");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        require(amount >= MIN_BRIDGE_AMOUNT && amount <= MAX_BRIDGE_AMOUNT, "Invalid amount");
        _;
    }
    
    modifier validChainId(uint256 chainId) {
        require(chainId == 1 || chainId == 56 || chainId == 295, "Unsupported chain"); // Ethereum, BSC, Hedera
        _;
    }
    
    constructor(
        address initialOwner,
        address _bridgeService,
        address _htsTokenManager
    ) Ownable(initialOwner) {
        require(_bridgeService != address(0), "Invalid bridge service");
        require(_htsTokenManager != address(0), "Invalid HTS manager");
        
        bridgeService = _bridgeService;
        htsTokenManager = HTSTokenManager(_htsTokenManager);
    }
    
    /**
     * @dev Create a new token mapping between HTS and ERC-20 tokens
     */
    function createTokenMapping(
        address htsToken,
        address erc20Token,
        uint256 chainId
    ) external override onlyOwner validChainId(chainId) {
        require(htsToken != address(0) && erc20Token != address(0), "Invalid token addresses");
        
        bytes32 mappingKey = _getMappingKey(htsToken, chainId);
        require(!tokenMappings[mappingKey].active, "Mapping already exists");
        
        tokenMappings[mappingKey] = TokenMapping({
            htsToken: htsToken,
            erc20Token: erc20Token,
            chainId: chainId,
            active: true,
            totalBridged: 0,
            createdAt: block.timestamp
        });
        
        // Set default limits
        bridgeLimits[htsToken] = 10000 ether;      // 10K daily limit
        singleOpLimits[htsToken] = 1000 ether;     // 1K single operation limit
        
        emit TokenMappingCreated(htsToken, erc20Token, chainId, block.timestamp);
    }
    
    /**
     * @dev Initiate bridge operation from ERC-20 to HTS
     */
    function bridgeToHedera(
        address erc20Token,
        uint256 amount,
        address recipient
    ) external override nonReentrant whenNotPaused validAmount(amount) returns (bytes32 operationId) {
        require(recipient != address(0), "Invalid recipient");
        
        // Find HTS token mapping
        bytes32 mappingKey = _findMappingByERC20(erc20Token);
        TokenMapping storage tokenMapping = tokenMappings[mappingKey];
        require(tokenMapping.active, "Token mapping not found or inactive");
        
        // Validate bridge limits
        _validateBridgeLimits(tokenMapping.htsToken, amount);
        
        // Generate operation ID
        operationId = _generateOperationId();
        
        // Create bridge operation
        bridgeOperations[operationId] = BridgeOperation({
            operationId: operationId,
            user: msg.sender,
            sourceToken: erc20Token,
            targetToken: tokenMapping.htsToken,
            amount: amount,
            sourceChainId: tokenMapping.chainId,
            targetChainId: 295, // Hedera
            status: BridgeStatus.Pending,
            timestamp: block.timestamp,
            txHash: bytes32(0),
            hcsMessageId: ""
        });
        
        userOperations[msg.sender].push(operationId);
        
        // Lock ERC-20 tokens (simulated - in real implementation would interact with source chain)
        lockedTokens[erc20Token] += amount;
        
        // Update daily bridged amount
        uint256 today = block.timestamp / 1 days;
        dailyBridged[tokenMapping.htsToken][today] += amount;
        
        emit BridgeOperationInitiated(
            operationId,
            msg.sender,
            erc20Token,
            tokenMapping.htsToken,
            amount,
            tokenMapping.chainId,
            295
        );
        
        emit TokensLocked(erc20Token, msg.sender, amount, operationId);
        
        return operationId;
    }
    
    /**
     * @dev Initiate bridge operation from HTS to ERC-20
     */
    function bridgeFromHedera(
        address htsToken,
        uint256 amount,
        uint256 targetChainId,
        address recipient
    ) external override nonReentrant whenNotPaused validAmount(amount) validChainId(targetChainId) returns (bytes32 operationId) {
        require(recipient != address(0), "Invalid recipient");
        
        // Find token mapping
        bytes32 mappingKey = _getMappingKey(htsToken, targetChainId);
        TokenMapping storage tokenMapping = tokenMappings[mappingKey];
        require(tokenMapping.active, "Token mapping not found or inactive");
        
        // Validate bridge limits
        _validateBridgeLimits(htsToken, amount);
        
        // Check user has sufficient HTS tokens (simplified check)
        // In production, would check actual HTS token balance
        require(amount > 0, "Invalid amount");
        
        // Generate operation ID
        operationId = _generateOperationId();
        
        // Create bridge operation
        bridgeOperations[operationId] = BridgeOperation({
            operationId: operationId,
            user: msg.sender,
            sourceToken: htsToken,
            targetToken: tokenMapping.erc20Token,
            amount: amount,
            sourceChainId: 295, // Hedera
            targetChainId: targetChainId,
            status: BridgeStatus.Pending,
            timestamp: block.timestamp,
            txHash: bytes32(0),
            hcsMessageId: ""
        });
        
        userOperations[msg.sender].push(operationId);
        
        // Burn HTS tokens
        htsTokenManager.burnShares(msg.sender, amount);
        
        // Update daily bridged amount
        uint256 today = block.timestamp / 1 days;
        dailyBridged[htsToken][today] += amount;
        
        emit BridgeOperationInitiated(
            operationId,
            msg.sender,
            htsToken,
            tokenMapping.erc20Token,
            amount,
            295,
            targetChainId
        );
        
        emit TokensBurned(htsToken, msg.sender, amount, operationId);
        
        return operationId;
    }
    
    /**
     * @dev Complete bridge operation (called by bridge service)
     */
    function completeBridgeOperation(
        bytes32 operationId,
        bytes32 txHash
    ) external override onlyBridgeService {
        BridgeOperation storage operation = bridgeOperations[operationId];
        require(operation.status == BridgeStatus.Pending, "Operation not pending");
        require(block.timestamp <= operation.timestamp + OPERATION_TIMEOUT, "Operation expired");
        
        operation.status = BridgeStatus.Completed;
        operation.txHash = txHash;
        
        // Handle token operations based on direction
        if (operation.targetChainId == 295) {
            // Bridging to Hedera - mint HTS tokens
            htsTokenManager.mintShares(operation.user, operation.amount);
            emit TokensMinted(operation.targetToken, operation.user, operation.amount, operationId);
        } else {
            // Bridging from Hedera - unlock ERC-20 tokens (simulated)
            lockedTokens[operation.sourceToken] -= operation.amount;
            emit TokensUnlocked(operation.targetToken, operation.user, operation.amount, operationId);
        }
        
        // Update total bridged amount
        bytes32 mappingKey = (operation.targetChainId == 295) 
            ? _getMappingKey(operation.targetToken, operation.sourceChainId)
            : _getMappingKey(operation.sourceToken, operation.targetChainId);
        tokenMappings[mappingKey].totalBridged += operation.amount;
        
        emit BridgeOperationCompleted(operationId, operation.user, operation.amount, txHash);
    }
    
    /**
     * @dev Cancel failed bridge operation
     */
    function cancelBridgeOperation(
        bytes32 operationId,
        string memory reason
    ) external override onlyBridgeService {
        BridgeOperation storage operation = bridgeOperations[operationId];
        require(operation.status == BridgeStatus.Pending, "Operation not pending");
        
        operation.status = BridgeStatus.Failed;
        
        // Refund tokens based on direction
        if (operation.sourceChainId == 295) {
            // Was bridging from Hedera - re-mint HTS tokens
            htsTokenManager.mintShares(operation.user, operation.amount);
            emit TokensMinted(operation.sourceToken, operation.user, operation.amount, operationId);
        } else {
            // Was bridging to Hedera - unlock ERC-20 tokens
            lockedTokens[operation.sourceToken] -= operation.amount;
            emit TokensUnlocked(operation.sourceToken, operation.user, operation.amount, operationId);
        }
        
        emit BridgeOperationFailed(operationId, operation.user, reason);
    }
    
    /**
     * @dev Validate bridge operation parameters
     */
    function validateBridgeOperation(
        address sourceToken,
        uint256 targetChainId,
        uint256 amount
    ) external view override returns (bool valid, string memory reason) {
        // Check amount limits
        if (amount < MIN_BRIDGE_AMOUNT) {
            return (false, "Amount below minimum");
        }
        if (amount > MAX_BRIDGE_AMOUNT) {
            return (false, "Amount above maximum");
        }
        
        // Check if contract is paused
        if (paused()) {
            return (false, "Bridge is paused");
        }
        
        // Check chain support
        if (targetChainId != 1 && targetChainId != 56 && targetChainId != 295) {
            return (false, "Unsupported target chain");
        }
        
        // Check token mapping exists
        bytes32 mappingKey = _getMappingKey(sourceToken, targetChainId);
        if (!tokenMappings[mappingKey].active) {
            return (false, "Token mapping not found or inactive");
        }
        
        // Check daily limits
        uint256 today = block.timestamp / 1 days;
        uint256 dailyAmount = dailyBridged[sourceToken][today];
        if (dailyAmount + amount > bridgeLimits[sourceToken]) {
            return (false, "Daily limit exceeded");
        }
        
        // Check single operation limit
        if (amount > singleOpLimits[sourceToken]) {
            return (false, "Single operation limit exceeded");
        }
        
        return (true, "");
    }
    
    /**
     * @dev Check if token mapping exists and is active
     */
    function isTokenMappingActive(
        address token,
        uint256 chainId
    ) external view override returns (bool exists, bool active) {
        bytes32 mappingKey = _getMappingKey(token, chainId);
        TokenMapping storage tokenMapping = tokenMappings[mappingKey];
        return (tokenMapping.htsToken != address(0), tokenMapping.active);
    }
    
    /**
     * @dev Get estimated bridge fee
     */
    function getBridgeFee(
        address sourceToken,
        uint256 targetChainId,
        uint256 amount
    ) external view override returns (uint256 fee) {
        // Simple fee calculation: percentage of amount
        return (amount * bridgeFeeRate) / 10000;
    }
    
    /**
     * @dev Get token mapping information
     */
    function getTokenMapping(
        address token,
        uint256 chainId
    ) external view override returns (TokenMapping memory tokenMapping) {
        bytes32 mappingKey = _getMappingKey(token, chainId);
        return tokenMappings[mappingKey];
    }
    
    /**
     * @dev Get bridge operation details
     */
    function getBridgeOperation(
        bytes32 operationId
    ) external view override returns (BridgeOperation memory operation) {
        return bridgeOperations[operationId];
    }
    
    /**
     * @dev Get user's bridge operations
     */
    function getUserBridgeOperations(
        address user,
        uint256 offset,
        uint256 limit
    ) external view override returns (BridgeOperation[] memory operations) {
        bytes32[] storage userOps = userOperations[user];
        
        if (offset >= userOps.length) {
            return new BridgeOperation[](0);
        }
        
        uint256 end = offset + limit;
        if (end > userOps.length) {
            end = userOps.length;
        }
        
        operations = new BridgeOperation[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            operations[i - offset] = bridgeOperations[userOps[i]];
        }
        
        return operations;
    }
    
    /**
     * @dev Get total bridged amount for token mapping
     */
    function getTotalBridged(
        address token,
        uint256 chainId
    ) external view override returns (uint256 totalBridged) {
        bytes32 mappingKey = _getMappingKey(token, chainId);
        return tokenMappings[mappingKey].totalBridged;
    }
    
    /**
     * @dev Pause bridge operations
     */
    function pauseBridge() external override onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause bridge operations
     */
    function unpauseBridge() external override onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Set bridge operation limits
     */
    function setBridgeLimits(
        address token,
        uint256 dailyLimit,
        uint256 singleOpLimit
    ) external override onlyOwner {
        require(dailyLimit >= singleOpLimit, "Daily limit must be >= single op limit");
        require(singleOpLimit >= MIN_BRIDGE_AMOUNT, "Single op limit too low");
        
        bridgeLimits[token] = dailyLimit;
        singleOpLimits[token] = singleOpLimit;
    }
    
    /**
     * @dev Emergency withdraw locked tokens
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external override onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(lockedTokens[token] >= amount, "Insufficient locked tokens");
        
        lockedTokens[token] -= amount;
        
        // In real implementation, would transfer tokens to recipient
        // IERC20(token).safeTransfer(recipient, amount);
        
        emit TokensUnlocked(token, recipient, amount, bytes32(0));
    }
    
    /**
     * @dev Set bridge service address
     */
    function setBridgeService(address _bridgeService) external onlyOwner {
        require(_bridgeService != address(0), "Invalid bridge service");
        address oldService = bridgeService;
        bridgeService = _bridgeService;
        emit BridgeServiceUpdated(oldService, _bridgeService);
    }
    
    /**
     * @dev Set bridge fee rate
     */
    function setBridgeFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee rate too high"); // Max 10%
        uint256 oldFee = bridgeFeeRate;
        bridgeFeeRate = _feeRate;
        emit BridgeFeeUpdated(oldFee, _feeRate);
    }
    
    /**
     * @dev Deactivate token mapping
     */
    function deactivateTokenMapping(address token, uint256 chainId) external onlyOwner {
        bytes32 mappingKey = _getMappingKey(token, chainId);
        require(tokenMappings[mappingKey].active, "Mapping not active");
        
        tokenMappings[mappingKey].active = false;
        emit TokenMappingDeactivated(token, chainId);
    }
    
    // Internal functions
    
    /**
     * @dev Generate unique operation ID
     */
    function _generateOperationId() internal returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            operationCounter++
        ));
    }
    
    /**
     * @dev Get mapping key for token and chain ID
     */
    function _getMappingKey(address token, uint256 chainId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(token, chainId));
    }
    
    /**
     * @dev Find mapping by ERC-20 token address
     */
    function _findMappingByERC20(address erc20Token) internal view returns (bytes32) {
        // In a real implementation, this would iterate through known mappings
        // For simplicity, we'll use a hash-based approach
        // This is a simplified version - production would need a more efficient lookup
        
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = 1;  // Ethereum
        chainIds[1] = 56; // BSC
        
        for (uint256 i = 0; i < chainIds.length; i++) {
            bytes32 mappingKey = _getMappingKey(erc20Token, chainIds[i]);
            if (tokenMappings[mappingKey].erc20Token == erc20Token) {
                return mappingKey;
            }
        }
        
        revert("ERC-20 token mapping not found");
    }
    
    /**
     * @dev Validate bridge limits
     */
    function _validateBridgeLimits(address token, uint256 amount) internal view {
        // Check single operation limit
        require(amount <= singleOpLimits[token], "Single operation limit exceeded");
        
        // Check daily limit
        uint256 today = block.timestamp / 1 days;
        uint256 dailyAmount = dailyBridged[token][today];
        require(dailyAmount + amount <= bridgeLimits[token], "Daily limit exceeded");
    }
}