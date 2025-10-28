// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IBridgeService.sol";

// LayerZero-style endpoint interface (simplified)
interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
    
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint nativeFee, uint zroFee);
}

/**
 * @title LayerZeroBridgeService
 * @dev LayerZero-style bridge service implementation for cross-chain operations
 * @notice Implements LayerZero-like protocol for omnichain operations
 */
contract LayerZeroBridgeService is IBridgeService, Ownable, ReentrancyGuard, Pausable {
    
    // LayerZero-style constants
    uint16 public constant LZ_VERSION = 1;
    uint256 public constant DEFAULT_PAYLOAD_SIZE_LIMIT = 10000;

    
    // State variables
    mapping(uint256 => BridgeConfig) public bridgeConfigs;
    mapping(uint256 => uint16) public chainIdToLzChainId; // EVM chainId to LayerZero chainId
    mapping(uint16 => uint256) public lzChainIdToChainId; // LayerZero chainId to EVM chainId
    mapping(bytes32 => CrossChainMessage) public messages;
    mapping(bytes32 => uint8) public messageStatus;
    mapping(uint256 => uint256) public messageCounters;
    
    ILayerZeroEndpoint public lzEndpoint;
    address public trustedRemote;
    uint256[] public supportedChains;
    uint256 public messageNonce;
    
    // LayerZero-specific
    mapping(uint16 => bytes) public trustedRemoteLookup;
    mapping(uint16 => uint256) public payloadSizeLimitLookup;
    
    // Events
    event SetTrustedRemote(uint16 _remoteChainId, bytes _path);
    event SetTrustedRemoteAddress(uint16 _remoteChainId, bytes _remoteAddress);
    event MessageFailed(uint16 _srcChainId, bytes _srcAddress, uint64 _nonce, bytes _payload, bytes _reason);
    event RetryMessageSuccess(uint16 _srcChainId, bytes _srcAddress, uint64 _nonce, bytes32 _payloadHash);
    
    // Modifiers
    modifier onlyEndpoint() {
        require(msg.sender == address(lzEndpoint), "Only LayerZero endpoint");
        _;
    }
    
    constructor(
        address initialOwner,
        address _lzEndpoint
    ) Ownable(initialOwner) {
        require(_lzEndpoint != address(0), "Invalid LayerZero endpoint");
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        
        // Initialize chain ID mappings (LayerZero style)
        _initializeChainMappings();
        
        // Initialize supported chains
        supportedChains.push(1);   // Ethereum
        supportedChains.push(56);  // BSC
        supportedChains.push(295); // Hedera
        
        // Set default configurations
        _initializeDefaultConfigs();
    }
    
    /**
     * @dev Send cross-chain message (LayerZero style)
     */
    function sendCrossChainMessage(
        uint256 targetChainId,
        address targetToken,
        address recipient,
        uint256 amount,
        bytes calldata payload
    ) external payable override nonReentrant whenNotPaused returns (bytes32 messageId) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(isChainSupported(targetChainId), "Unsupported chain");
        
        uint16 dstChainId = chainIdToLzChainId[targetChainId];
        require(dstChainId != 0, "Invalid destination chain");
        
        BridgeConfig memory config = bridgeConfigs[targetChainId];
        require(config.active, "Bridge not active for target chain");
        
        // Generate message ID
        messageId = keccak256(abi.encodePacked(
            block.chainid,
            targetChainId,
            msg.sender,
            recipient,
            amount,
            messageNonce++,
            block.timestamp
        ));
        
        // Create cross-chain message
        CrossChainMessage memory message = CrossChainMessage({
            sourceChainId: block.chainid,
            targetChainId: targetChainId,
            sourceToken: msg.sender,
            targetToken: targetToken,
            sender: tx.origin,
            recipient: recipient,
            amount: amount,
            payload: payload,
            nonce: messageNonce - 1
        });
        
        messages[messageId] = message;
        messageStatus[messageId] = 0; // Pending
        messageCounters[targetChainId]++;
        
        // Encode LayerZero payload
        bytes memory lzPayload = abi.encode(
            messageId,
            message.sender,
            message.recipient,
            message.amount,
            message.sourceToken,
            message.targetToken,
            payload
        );
        
        // Get trusted remote path
        bytes memory trustedRemote = trustedRemoteLookup[dstChainId];
        require(trustedRemote.length > 0, "No trusted remote");
        
        // Estimate and validate fee
        bytes memory adapterParams = abi.encodePacked(LZ_VERSION, config.gasLimit);
        (uint256 nativeFee,) = lzEndpoint.estimateFees(
            dstChainId,
            address(this),
            lzPayload,
            false,
            adapterParams
        );
        
        require(msg.value >= nativeFee, "Insufficient fee");
        
        // Send LayerZero message
        lzEndpoint.send{value: msg.value}(
            dstChainId,
            trustedRemote,
            lzPayload,
            payable(tx.origin),
            address(0),
            adapterParams
        );
        
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
     * @dev Receive LayerZero message
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external onlyEndpoint {
        // Verify trusted remote
        bytes memory trustedRemote = trustedRemoteLookup[_srcChainId];
        require(
            _srcAddress.length == trustedRemote.length && 
            keccak256(_srcAddress) == keccak256(trustedRemote),
            "Invalid source"
        );
        
        // Decode payload
        (
            bytes32 messageId,
            address sender,
            address recipient,
            uint256 amount,
            address sourceToken,
            address targetToken,
            bytes memory payload
        ) = abi.decode(_payload, (bytes32, address, address, uint256, address, address, bytes));
        
        // Create message struct
        uint256 sourceChainId = lzChainIdToChainId[_srcChainId];
        CrossChainMessage memory message = CrossChainMessage({
            sourceChainId: sourceChainId,
            targetChainId: block.chainid,
            sourceToken: sourceToken,
            targetToken: targetToken,
            sender: sender,
            recipient: recipient,
            amount: amount,
            payload: payload,
            nonce: _nonce
        });
        
        messages[messageId] = message;
        
        bool success = false;
        
        try this._executeMessage(message) {
            messageStatus[messageId] = 1; // Completed
            success = true;
        } catch Error(string memory reason) {
            messageStatus[messageId] = 2; // Failed
            emit MessageFailed(_srcChainId, _srcAddress, _nonce, _payload, bytes(reason));
        } catch (bytes memory reason) {
            messageStatus[messageId] = 2; // Failed
            emit MessageFailed(_srcChainId, _srcAddress, _nonce, _payload, reason);
        }
        
        emit CrossChainMessageReceived(
            messageId,
            sourceChainId,
            recipient,
            amount,
            success
        );
    }
    
    /**
     * @dev Receive and process cross-chain message (compatibility with IBridgeService)
     */
    function receiveCrossChainMessage(
        CrossChainMessage calldata message,
        bytes calldata proof
    ) external override {
        // This function is for compatibility with IBridgeService interface
        // In LayerZero, messages are received via lzReceive
        revert("Use lzReceive for LayerZero messages");
    }
    
    /**
     * @dev Execute cross-chain message (internal)
     */
    function _executeMessage(CrossChainMessage calldata message) external {
        require(msg.sender == address(this), "Internal function");
        
        // Execute the cross-chain operation
        if (message.payload.length > 0) {
            (bool success,) = message.targetToken.call(message.payload);
            require(success, "Payload execution failed");
        }
    }
    
    /**
     * @dev Estimate bridge fee (LayerZero style)
     */
    function estimateFee(
        uint256 targetChainId,
        uint256 gasLimit,
        bytes calldata payload
    ) public view override returns (uint256 fee) {
        uint16 dstChainId = chainIdToLzChainId[targetChainId];
        if (dstChainId == 0) return 0;
        
        bytes memory lzPayload = abi.encode(
            bytes32(0), // placeholder messageId
            address(0), // placeholder sender
            address(0), // placeholder recipient
            uint256(0), // placeholder amount
            address(0), // placeholder sourceToken
            address(0), // placeholder targetToken
            payload
        );
        
        bytes memory adapterParams = abi.encodePacked(LZ_VERSION, gasLimit);
        
        try lzEndpoint.estimateFees(
            dstChainId,
            address(this),
            lzPayload,
            false,
            adapterParams
        ) returns (uint256 nativeFee, uint256) {
            return nativeFee;
        } catch {
            return 0;
        }
    }
    
    /**
     * @dev Check if chain is supported
     */
    function isChainSupported(uint256 chainId) public view override returns (bool supported) {
        return chainIdToLzChainId[chainId] != 0;
    }
    
    /**
     * @dev Get bridge configuration for chain
     */
    function getBridgeConfig(uint256 chainId) external view override returns (BridgeConfig memory config) {
        return bridgeConfigs[chainId];
    }
    
    /**
     * @dev Verify cross-chain message authenticity (LayerZero handles this)
     */
    function verifyMessage(
        CrossChainMessage calldata,
        bytes calldata
    ) public pure override returns (bool valid) {
        // LayerZero handles message verification internally
        return true;
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
        bridgeConfigs[chainId] = BridgeConfig({
            chainId: chainId,
            endpoint: endpoint,
            fee: fee,
            gasLimit: gasLimit,
            active: active
        });
        
        emit BridgeConfigUpdated(chainId, endpoint, fee, gasLimit, active);
    }
    
    /**
     * @dev Set trusted remote for LayerZero chain
     */
    function setTrustedRemote(uint16 _remoteChainId, bytes calldata _path) external onlyOwner {
        trustedRemoteLookup[_remoteChainId] = _path;
        emit SetTrustedRemote(_remoteChainId, _path);
    }
    
    /**
     * @dev Set trusted remote address
     */
    function setTrustedRemoteAddress(uint16 _remoteChainId, bytes calldata _remoteAddress) external onlyOwner {
        trustedRemoteLookup[_remoteChainId] = abi.encodePacked(_remoteAddress, address(this));
        emit SetTrustedRemoteAddress(_remoteChainId, _remoteAddress);
    }
    
    /**
     * @dev Set payload size limit
     */
    function setPayloadSizeLimit(uint16 _dstChainId, uint256 _size) external onlyOwner {
        payloadSizeLimitLookup[_dstChainId] = _size;
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
     * @dev Initialize chain ID mappings
     */
    function _initializeChainMappings() internal {
        // Map EVM chain IDs to LayerZero chain IDs
        chainIdToLzChainId[1] = 101;    // Ethereum -> LZ Ethereum
        chainIdToLzChainId[56] = 102;   // BSC -> LZ BSC
        chainIdToLzChainId[295] = 165;  // Hedera -> LZ Hedera (hypothetical)
        
        // Reverse mapping
        lzChainIdToChainId[101] = 1;
        lzChainIdToChainId[102] = 56;
        lzChainIdToChainId[165] = 295;
    }
    
    /**
     * @dev Initialize default bridge configurations
     */
    function _initializeDefaultConfigs() internal {
        // Ethereum
        bridgeConfigs[1] = BridgeConfig({
            chainId: 1,
            endpoint: address(lzEndpoint),
            fee: 0,
            gasLimit: 200000,
            active: true
        });
        
        // BSC
        bridgeConfigs[56] = BridgeConfig({
            chainId: 56,
            endpoint: address(lzEndpoint),
            fee: 0,
            gasLimit: 200000,
            active: true
        });
        
        // Hedera
        bridgeConfigs[295] = BridgeConfig({
            chainId: 295,
            endpoint: address(lzEndpoint),
            fee: 0,
            gasLimit: 200000,
            active: true
        });
        
        // Set default payload size limits
        payloadSizeLimitLookup[101] = DEFAULT_PAYLOAD_SIZE_LIMIT; // Ethereum
        payloadSizeLimitLookup[102] = DEFAULT_PAYLOAD_SIZE_LIMIT; // BSC
        payloadSizeLimitLookup[165] = DEFAULT_PAYLOAD_SIZE_LIMIT; // Hedera
    }
}