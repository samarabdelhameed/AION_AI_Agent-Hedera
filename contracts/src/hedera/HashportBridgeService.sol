// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../interfaces/IBridgeService.sol";

/**
 * @title HashportBridgeService
 * @dev Hashport-style bridge service implementation for cross-chain operations
 * @notice Implements Hashport bridge protocol for Hedera ↔ EVM chains
 */
contract HashportBridgeService is IBridgeService, Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // Constants
    uint256 public constant MAX_GAS_LIMIT = 1000000;
    uint256 public constant MIN_GAS_LIMIT = 100000;
    uint256 public constant MESSAGE_TIMEOUT = 24 hours;
    
    // State variables
    mapping(uint256 => BridgeConfig) public bridgeConfigs;
    mapping(bytes32 => CrossChainMessage) public messages;
    mapping(bytes32 => uint8) public messageStatus; // 0: pending, 1: completed, 2: failed
    mapping(uint256 => uint256) public messageCounters;
    mapping(address => bool) public validators;
    
    uint256[] public supportedChains;
    address public feeCollector;
    uint256 public validatorThreshold = 1; // Minimum validators required
    uint256 public messageNonce;
    
    // Hashport-specific
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => mapping(uint256 => uint256)) public userNonces;
    
    // Events
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event ValidatorThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event MessageProcessed(bytes32 indexed messageId, bool success);
    
    // Modifiers
    modifier onlyValidator() {
        require(validators[msg.sender], "Not a validator");
        _;
    }
    
    modifier validChainId(uint256 chainId) {
        require(isChainSupported(chainId), "Unsupported chain");
        _;
    }
    
    constructor(
        address initialOwner,
        address _feeCollector
    ) Ownable(initialOwner) {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
        
        // Initialize supported chains
        supportedChains.push(1);   // Ethereum
        supportedChains.push(56);  // BSC
        supportedChains.push(295); // Hedera
        
        // Set default bridge configurations
        _initializeDefaultConfigs();
    }
    
    /**
     * @dev Send cross-chain message (Hashport style)
     */
    function sendCrossChainMessage(
        uint256 targetChainId,
        address targetToken,
        address recipient,
        uint256 amount,
        bytes calldata payload
    ) external payable override nonReentrant whenNotPaused validChainId(targetChainId) returns (bytes32 messageId) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        BridgeConfig memory config = bridgeConfigs[targetChainId];
        require(config.active, "Bridge not active for target chain");
        
        // Calculate and validate fee
        uint256 requiredFee = estimateFee(targetChainId, config.gasLimit, payload);
        require(msg.value >= requiredFee, "Insufficient bridge fee");
        
        // Generate message ID (Hashport style)
        messageId = keccak256(abi.encodePacked(
            block.chainid,
            targetChainId,
            msg.sender,
            recipient,
            amount,
            userNonces[msg.sender][targetChainId]++,
            block.timestamp
        ));
        
        // Create cross-chain message
        messages[messageId] = CrossChainMessage({
            sourceChainId: block.chainid,
            targetChainId: targetChainId,
            sourceToken: msg.sender, // Assuming sender is token contract
            targetToken: targetToken,
            sender: tx.origin,       // Original user
            recipient: recipient,
            amount: amount,
            payload: payload,
            nonce: messageNonce++
        });
        
        messageStatus[messageId] = 0; // Pending
        messageCounters[targetChainId]++;
        
        // Collect bridge fee
        if (msg.value > 0) {
            payable(feeCollector).transfer(msg.value);
            emit BridgeFeePaid(messageId, msg.sender, msg.value);
        }
        
        emit CrossChainMessageSent(
            messageId,
            block.chainid,
            targetChainId,
            tx.origin,
            recipient,
            amount
        );
        
        return messageId;
    }
    
    /**
     * @dev Receive and process cross-chain message (Hashport style)
     */
    function receiveCrossChainMessage(
        CrossChainMessage calldata message,
        bytes calldata proof
    ) external override onlyValidator nonReentrant whenNotPaused {
        // Generate message ID
        bytes32 messageId = keccak256(abi.encodePacked(
            message.sourceChainId,
            message.targetChainId,
            message.sender,
            message.recipient,
            message.amount,
            message.nonce
        ));
        
        require(!processedMessages[messageId], "Message already processed");
        require(message.targetChainId == block.chainid, "Invalid target chain");
        
        // Verify message authenticity
        require(verifyMessage(message, proof), "Invalid message proof");
        
        // Mark as processed
        processedMessages[messageId] = true;
        messages[messageId] = message;
        
        bool success = false;
        
        try this._executeMessage(message) {
            messageStatus[messageId] = 1; // Completed
            success = true;
        } catch {
            messageStatus[messageId] = 2; // Failed
        }
        
        emit CrossChainMessageReceived(
            messageId,
            message.sourceChainId,
            message.recipient,
            message.amount,
            success
        );
        
        emit MessageProcessed(messageId, success);
    }
    
    /**
     * @dev Execute cross-chain message (internal)
     */
    function _executeMessage(CrossChainMessage calldata message) external {
        require(msg.sender == address(this), "Internal function");
        
        // Execute the cross-chain operation
        // This would typically involve minting tokens or calling target contract
        if (message.payload.length > 0) {
            // Execute payload on target contract
            (bool success,) = message.targetToken.call(message.payload);
            require(success, "Payload execution failed");
        }
        
        // Additional logic for token operations would go here
        // For example, minting tokens to recipient
    }
    
    /**
     * @dev Estimate bridge fee
     */
    function estimateFee(
        uint256 targetChainId,
        uint256 gasLimit,
        bytes calldata payload
    ) public view override returns (uint256 fee) {
        BridgeConfig memory config = bridgeConfigs[targetChainId];
        
        // Base fee calculation (Hashport style)
        uint256 baseFee = config.fee;
        uint256 gasFee = (gasLimit * 20 gwei); // Estimated gas cost
        uint256 payloadFee = payload.length * 100; // Per-byte payload fee
        
        return baseFee + gasFee + payloadFee;
    }
    
    /**
     * @dev Check if chain is supported
     */
    function isChainSupported(uint256 chainId) public view override returns (bool supported) {
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == chainId) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Get bridge configuration for chain
     */
    function getBridgeConfig(uint256 chainId) external view override returns (BridgeConfig memory config) {
        return bridgeConfigs[chainId];
    }
    
    /**
     * @dev Verify cross-chain message authenticity (Hashport style)
     */
    function verifyMessage(
        CrossChainMessage calldata message,
        bytes calldata proof
    ) public view override returns (bool valid) {
        // Create message hash
        bytes32 messageHash = keccak256(abi.encode(
            message.sourceChainId,
            message.targetChainId,
            message.sourceToken,
            message.targetToken,
            message.sender,
            message.recipient,
            message.amount,
            message.nonce
        ));
        
        // For Hashport, proof would be validator signatures
        // Simplified validation - in production would verify multiple validator signatures
        if (proof.length >= 65) {
            bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
            address signer = ethSignedHash.recover(proof);
            return validators[signer];
        }
        
        return false;
    }
    
    /**
     * @dev Set bridge configuration for chain
     */
    function setBridgeConfig(
        uint256 chainId,
        address endpoint,
        uint256 fee,
        uint256 gasLimit,
        bool active
    ) external override onlyOwner {
        require(gasLimit >= MIN_GAS_LIMIT && gasLimit <= MAX_GAS_LIMIT, "Invalid gas limit");
        
        bridgeConfigs[chainId] = BridgeConfig({
            chainId: chainId,
            endpoint: endpoint,
            fee: fee,
            gasLimit: gasLimit,
            active: active
        });
        
        // Add to supported chains if not already present
        if (active && !isChainSupported(chainId)) {
            supportedChains.push(chainId);
        }
        
        emit BridgeConfigUpdated(chainId, endpoint, fee, gasLimit, active);
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
     * @dev Get supported chain IDs
     */
    function getSupportedChains() external view override returns (uint256[] memory chainIds) {
        return supportedChains;
    }
    
    /**
     * @dev Get message status
     */
    function getMessageStatus(bytes32 messageId) external view override returns (uint8 status) {
        return messageStatus[messageId];
    }
    
    /**
     * @dev Get total messages sent to chain
     */
    function getMessageCount(uint256 chainId) external view override returns (uint256 count) {
        return messageCounters[chainId];
    }
    
    /**
     * @dev Add validator
     */
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "Invalid validator");
        require(!validators[validator], "Validator already exists");
        
        validators[validator] = true;
        emit ValidatorAdded(validator);
    }
    
    /**
     * @dev Remove validator
     */
    function removeValidator(address validator) external onlyOwner {
        require(validators[validator], "Validator does not exist");
        
        validators[validator] = false;
        emit ValidatorRemoved(validator);
    }
    
    /**
     * @dev Set validator threshold
     */
    function setValidatorThreshold(uint256 threshold) external onlyOwner {
        require(threshold > 0, "Invalid threshold");
        uint256 oldThreshold = validatorThreshold;
        validatorThreshold = threshold;
        emit ValidatorThresholdUpdated(oldThreshold, threshold);
    }
    
    /**
     * @dev Set fee collector
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }
    
    /**
     * @dev Emergency withdraw fees
     */
    function emergencyWithdrawFees(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        
        payable(recipient).transfer(amount);
    }
    
    /**
     * @dev Initialize default bridge configurations
     */
    function _initializeDefaultConfigs() internal {
        // Ethereum mainnet
        bridgeConfigs[1] = BridgeConfig({
            chainId: 1,
            endpoint: address(0), // Would be actual Hashport endpoint
            fee: 0.01 ether,
            gasLimit: 200000,
            active: true
        });
        
        // BSC mainnet
        bridgeConfigs[56] = BridgeConfig({
            chainId: 56,
            endpoint: address(0), // Would be actual Hashport endpoint
            fee: 0.005 ether,
            gasLimit: 200000,
            active: true
        });
        
        // Hedera mainnet
        bridgeConfigs[295] = BridgeConfig({
            chainId: 295,
            endpoint: address(0), // Would be actual Hashport endpoint
            fee: 0.001 ether,
            gasLimit: 200000,
            active: true
        });
    }
    
    /**
     * @dev Receive function to accept bridge fees
     */
    receive() external payable {
        // Accept bridge fees
    }
}