// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../libraries/HederaOperations.sol";
import "../libraries/HederaResponseCodes.sol";
import "../interfaces/IHederaTokenService.sol";
import "../interfaces/IHederaConsensusService.sol";

/**
 * @title HederaIntegration
 * @dev Core integration contract for Hedera services (HTS, HCS, HFS, HSCS)
 * @notice Provides unified interface for all Hedera operations with security and error handling
 * @author AION Team
 */
abstract contract HederaIntegration is AccessControl, ReentrancyGuard, Pausable {
    using Address for address;

    // ========== ROLES ==========
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ========== HEDERA CONFIGURATION ==========
    struct HederaConfig {
        address htsPrecompile;      // HTS precompiled contract address
        bytes32 hcsTopicId;         // HCS topic for AI decisions
        bytes32 hcsAuditTopicId;    // HCS topic for audit trail
        bytes32 hfsModelFileId;     // HFS file for AI model metadata
        bytes32 hfsBridgeFileId;    // HFS file for bridge configuration
        address htsShareTokenId;    // HTS token for vault shares
        bool enabled;               // Master enable/disable switch
        uint256 hcsSubmissionTimeout; // Timeout for HCS submissions
        uint256 maxRetries;         // Maximum retry attempts
    }

    HederaConfig public hederaConfig;

    // ========== STATE VARIABLES ==========
    mapping(bytes32 => uint256) public hcsMessageSequences;
    mapping(bytes32 => bytes32) public hfsFileHashes;
    mapping(address => uint256) public htsTokenBalances;
    
    // Operation tracking
    uint256 public totalHCSSubmissions;
    uint256 public totalHFSOperations;
    uint256 public totalHTSOperations;
    uint256 public failedOperations;
    
    // Emergency controls
    bool public emergencyPaused;
    uint256 public lastHealthCheck;
    uint256 public constant HEALTH_CHECK_INTERVAL = 1 hours;

    // ========== EVENTS ==========
    
    // HCS Events
    event HCSMessageSubmitted(
        bytes32 indexed topicId,
        uint256 indexed sequenceNumber,
        bytes32 messageHash,
        address indexed submitter,
        uint256 timestamp
    );
    
    event AIDecisionLogged(
        bytes32 indexed topicId,
        string decisionType,
        bytes32 modelHash,
        uint256 confidence,
        address indexed agent,
        uint256 timestamp
    );

    // HFS Events
    event HFSFileCreated(
        bytes32 indexed fileId,
        bytes32 contentHash,
        uint256 size,
        string fileType,
        uint256 timestamp
    );
    
    event HFSFileUpdated(
        bytes32 indexed fileId,
        bytes32 oldHash,
        bytes32 newHash,
        uint256 timestamp
    );

    // HTS Events
    event HTSTokenMinted(
        address indexed tokenId,
        address indexed recipient,
        uint256 amount,
        bytes32 transactionHash,
        uint256 timestamp
    );
    
    event HTSTokenBurned(
        address indexed tokenId,
        address indexed account,
        uint256 amount,
        bytes32 transactionHash,
        uint256 timestamp
    );
    
    event HTSTokenTransferred(
        address indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    // Configuration Events
    event HederaConfigUpdated(
        address indexed updater,
        string configType,
        bytes32 oldValue,
        bytes32 newValue,
        uint256 timestamp
    );
    
    event HederaServiceEnabled(bool enabled, uint256 timestamp);
    event EmergencyPauseActivated(address indexed activator, uint256 timestamp);
    event HealthCheckPerformed(bool healthy, uint256 timestamp);

    // Error Events
    event HederaOperationFailed(
        string operationType,
        int256 responseCode,
        string errorMessage,
        uint256 timestamp
    );

    // ========== MODIFIERS ==========
    
    modifier onlyAIAgent() virtual {
        require(hasRole(AI_AGENT_ROLE, msg.sender), "HederaIntegration: caller is not AI agent");
        _;
    }
    
    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "HederaIntegration: caller is not operator");
        _;
    }
    
    modifier onlyEmergency() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "HederaIntegration: caller is not emergency role");
        _;
    }
    
    modifier hederaEnabled() {
        require(hederaConfig.enabled && !emergencyPaused, "HederaIntegration: Hedera services disabled");
        _;
    }
    
    modifier validHederaResponse(int256 responseCode) {
        require(responseCode == 22, "HederaIntegration: Hedera operation failed"); // SUCCESS = 22
        _;
    }

    modifier healthCheckRequired() {
        if (block.timestamp >= lastHealthCheck + HEALTH_CHECK_INTERVAL) {
            _performHealthCheck();
        }
        _;
    }

    // ========== CONSTRUCTOR ==========
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        lastHealthCheck = block.timestamp;
    }

    // ========== HEDERA CONFIGURATION ==========
    
    /**
     * @dev Initialize Hedera configuration
     * @param config HederaConfig struct with all service parameters
     */
    function initializeHedera(HederaConfig memory config) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(config.htsPrecompile != address(0), "HederaIntegration: Invalid HTS precompile");
        require(config.hcsTopicId != bytes32(0), "HederaIntegration: Invalid HCS topic");
        require(config.htsShareTokenId != address(0), "HederaIntegration: Invalid HTS token");
        
        hederaConfig = config;
        
        emit HederaConfigUpdated(
            msg.sender,
            "full_config",
            bytes32(0),
            keccak256(abi.encode(config)),
            block.timestamp
        );
    }

    /**
     * @dev Update specific Hedera configuration parameters
     */
    function updateHederaConfig(
        string memory configType,
        bytes32 newValue
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 oldValue;
        
        if (keccak256(bytes(configType)) == keccak256("hcsTopicId")) {
            oldValue = hederaConfig.hcsTopicId;
            hederaConfig.hcsTopicId = newValue;
        } else if (keccak256(bytes(configType)) == keccak256("hcsAuditTopicId")) {
            oldValue = hederaConfig.hcsAuditTopicId;
            hederaConfig.hcsAuditTopicId = newValue;
        } else if (keccak256(bytes(configType)) == keccak256("hfsModelFileId")) {
            oldValue = hederaConfig.hfsModelFileId;
            hederaConfig.hfsModelFileId = newValue;
        } else if (keccak256(bytes(configType)) == keccak256("hfsBridgeFileId")) {
            oldValue = hederaConfig.hfsBridgeFileId;
            hederaConfig.hfsBridgeFileId = newValue;
        } else {
            revert("HederaIntegration: Invalid config type");
        }
        
        emit HederaConfigUpdated(msg.sender, configType, oldValue, newValue, block.timestamp);
    }

    // ========== HCS OPERATIONS ==========
    
    /**
     * @dev Submit message to HCS topic using real Hedera precompiled contract
     * @param topicId HCS topic identifier
     * @param message Message content to submit
     * @return success Whether the operation succeeded
     * @return sequenceNumber Message sequence number from HCS
     */
    function submitToHCS(
        bytes32 topicId,
        bytes memory message
    ) internal hederaEnabled healthCheckRequired returns (bool success, uint256 sequenceNumber) {
        require(message.length > 0, "HederaIntegration: Empty message");
        require(message.length <= 6144, "HederaIntegration: Message too large"); // HCS limit
        
        // Use HederaOperations library for safe submission with retry logic
        HederaOperations.RetryConfig memory retryConfig = HederaOperations.defaultRetryConfig();
        HederaOperations.OperationResult memory result = HederaOperations.safeSubmitMessage(
            topicId,
            message,
            retryConfig
        );
        
        if (result.success) {
            sequenceNumber = hcsMessageSequences[topicId] + 1;
            hcsMessageSequences[topicId] = sequenceNumber;
            totalHCSSubmissions++;
            
            bytes32 messageHash = keccak256(message);
            
            emit HCSMessageSubmitted(
                topicId,
                sequenceNumber,
                messageHash,
                msg.sender,
                block.timestamp
            );
            
            // Submit audit trail for successful HCS operation
            submitAuditTrail("HCS_MESSAGE_SUBMITTED", abi.encode(topicId, messageHash, sequenceNumber));
            
            return (true, sequenceNumber);
        } else {
            failedOperations++;
            _handleHederaError("HCS_SUBMIT", result.responseCode, result.errorMessage);
            return (false, 0);
        }
    }

    /**
     * @dev Log AI decision to HCS
     * @param decisionType Type of AI decision (rebalance, strategy_change, etc.)
     * @param modelHash Hash of the AI model used
     * @param confidence Confidence level of the decision (0-10000 basis points)
     * @param decisionData Additional decision data
     */
    function logAIDecision(
        string memory decisionType,
        bytes32 modelHash,
        uint256 confidence,
        bytes memory decisionData
    ) external onlyAIAgent hederaEnabled nonReentrant {
        require(confidence <= 10000, "HederaIntegration: Invalid confidence level");
        
        // Prepare decision message
        bytes memory message = abi.encode(
            decisionType,
            modelHash,
            confidence,
            msg.sender,
            block.timestamp,
            decisionData
        );
        
        (bool success, uint256 sequenceNumber) = submitToHCS(hederaConfig.hcsTopicId, message);
        require(success, "HederaIntegration: Failed to log AI decision");
        
        emit AIDecisionLogged(
            hederaConfig.hcsTopicId,
            decisionType,
            modelHash,
            confidence,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Submit audit trail message to HCS
     * @param operation Operation type being audited
     * @param operationData Data related to the operation
     */
    function submitAuditTrail(
        string memory operation,
        bytes memory operationData
    ) internal hederaEnabled {
        bytes memory auditMessage = abi.encode(
            operation,
            msg.sender,
            block.timestamp,
            operationData
        );
        
        submitToHCS(hederaConfig.hcsAuditTopicId, auditMessage);
    }

    // ========== HFS OPERATIONS ==========
    
    /**
     * @dev Create or update file on HFS
     * @param fileId HFS file identifier
     * @param content File content
     * @param fileType Type of file (model, config, etc.)
     * @return success Whether the operation succeeded
     */
    function updateHFSFile(
        bytes32 fileId,
        bytes memory content,
        string memory fileType
    ) internal hederaEnabled returns (bool success) {
        require(content.length > 0, "HederaIntegration: Empty content");
        require(content.length <= 1048576, "HederaIntegration: Content too large"); // 1MB limit
        
        bytes32 oldHash = hfsFileHashes[fileId];
        bytes32 newHash = keccak256(content);
        
        // This would integrate with actual HFS precompiled contract
        // For now, we simulate the operation
        
        hfsFileHashes[fileId] = newHash;
        totalHFSOperations++;
        
        if (oldHash == bytes32(0)) {
            emit HFSFileCreated(fileId, newHash, content.length, fileType, block.timestamp);
        } else {
            emit HFSFileUpdated(fileId, oldHash, newHash, block.timestamp);
        }
        
        return true;
    }

    /**
     * @dev Update AI model metadata on HFS
     * @param modelVersion Version of the AI model
     * @param modelHash Hash of the model
     * @param performanceMetrics Performance metrics of the model
     */
    function updateModelMetadata(
        string memory modelVersion,
        bytes32 modelHash,
        bytes memory performanceMetrics
    ) external onlyAIAgent hederaEnabled {
        bytes memory metadata = abi.encode(
            modelVersion,
            modelHash,
            performanceMetrics,
            block.timestamp,
            msg.sender
        );
        
        bool success = updateHFSFile(hederaConfig.hfsModelFileId, metadata, "ai_model");
        require(success, "HederaIntegration: Failed to update model metadata");
    }

    // ========== HTS OPERATIONS ==========
    
    /**
     * @dev Mint HTS tokens (share tokens) using real Hedera precompiled contract
     * @param recipient Address to receive the tokens
     * @param amount Amount of tokens to mint
     * @return success Whether the operation succeeded
     */
    function mintShareTokens(
        address recipient,
        uint256 amount
    ) internal hederaEnabled returns (bool success) {
        require(recipient != address(0), "HederaIntegration: Invalid recipient");
        require(amount > 0, "HederaIntegration: Invalid amount");
        
        // Use HederaOperations library for safe minting with retry logic
        HederaOperations.RetryConfig memory retryConfig = HederaOperations.defaultRetryConfig();
        HederaOperations.OperationResult memory result = HederaOperations.safeTokenMint(
            hederaConfig.htsShareTokenId,
            recipient,
            amount,
            retryConfig
        );
        
        if (result.success) {
            htsTokenBalances[recipient] += amount;
            totalHTSOperations++;
            
            bytes32 txHash = keccak256(abi.encode(recipient, amount, block.timestamp, result.gasUsed));
            
            emit HTSTokenMinted(
                hederaConfig.htsShareTokenId,
                recipient,
                amount,
                txHash,
                block.timestamp
            );
            
            // Log to HCS for audit trail
            bytes memory auditData = abi.encode(
                "HTS_MINT",
                hederaConfig.htsShareTokenId,
                recipient,
                amount,
                txHash,
                result.gasUsed
            );
            submitAuditTrail("HTS_TOKEN_MINTED", auditData);
            
            return true;
        } else {
            failedOperations++;
            _handleHederaError("HTS_MINT", result.responseCode, result.errorMessage);
            return false;
        }
    }

    /**
     * @dev Burn HTS tokens (share tokens) using real Hedera precompiled contract
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @return success Whether the operation succeeded
     */
    function burnShareTokens(
        address account,
        uint256 amount
    ) internal hederaEnabled returns (bool success) {
        require(account != address(0), "HederaIntegration: Invalid account");
        require(amount > 0, "HederaIntegration: Invalid amount");
        require(htsTokenBalances[account] >= amount, "HederaIntegration: Insufficient balance");
        
        // Use HederaOperations library for safe burning with retry logic
        HederaOperations.RetryConfig memory retryConfig = HederaOperations.defaultRetryConfig();
        HederaOperations.OperationResult memory result = HederaOperations.safeTokenBurn(
            hederaConfig.htsShareTokenId,
            account,
            amount,
            retryConfig
        );
        
        if (result.success) {
            htsTokenBalances[account] -= amount;
            totalHTSOperations++;
            
            bytes32 txHash = keccak256(abi.encode(account, amount, block.timestamp, result.gasUsed));
            
            emit HTSTokenBurned(
                hederaConfig.htsShareTokenId,
                account,
                amount,
                txHash,
                block.timestamp
            );
            
            // Log to HCS for audit trail
            bytes memory auditData = abi.encode(
                "HTS_BURN",
                hederaConfig.htsShareTokenId,
                account,
                amount,
                txHash,
                result.gasUsed
            );
            submitAuditTrail("HTS_TOKEN_BURNED", auditData);
            
            return true;
        } else {
            failedOperations++;
            _handleHederaError("HTS_BURN", result.responseCode, result.errorMessage);
            return false;
        }
    }

    /**
     * @dev Transfer HTS tokens between accounts
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     * @return success Whether the operation succeeded
     */
    function transferShareTokens(
        address from,
        address to,
        uint256 amount
    ) internal hederaEnabled returns (bool success) {
        require(from != address(0) && to != address(0), "HederaIntegration: Invalid addresses");
        require(amount > 0, "HederaIntegration: Invalid amount");
        require(htsTokenBalances[from] >= amount, "HederaIntegration: Insufficient balance");
        
        htsTokenBalances[from] -= amount;
        htsTokenBalances[to] += amount;
        totalHTSOperations++;
        
        emit HTSTokenTransferred(
            hederaConfig.htsShareTokenId,
            from,
            to,
            amount,
            block.timestamp
        );
        
        return true;
    }

    // ========== SECURITY & EMERGENCY FUNCTIONS ==========
    
    /**
     * @dev Emergency pause all Hedera operations
     */
    function emergencyPause() external onlyEmergency {
        emergencyPaused = true;
        _pause();
        emit EmergencyPauseActivated(msg.sender, block.timestamp);
    }

    /**
     * @dev Resume Hedera operations after emergency
     */
    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        emergencyPaused = false;
        _unpause();
    }

    /**
     * @dev Enable or disable Hedera services
     * @param enabled Whether to enable Hedera services
     */
    function setHederaEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        hederaConfig.enabled = enabled;
        emit HederaServiceEnabled(enabled, block.timestamp);
    }

    /**
     * @dev Perform health check on Hedera services
     */
    function _performHealthCheck() internal {
        lastHealthCheck = block.timestamp;
        
        // Calculate health metrics
        uint256 totalOperations = totalHCSSubmissions + totalHFSOperations + totalHTSOperations;
        bool healthy = totalOperations == 0 || (failedOperations * 10000 / totalOperations) < 500; // <5% failure rate
        
        emit HealthCheckPerformed(healthy, block.timestamp);
        
        if (!healthy && hederaConfig.enabled) {
            // Auto-disable if health check fails
            hederaConfig.enabled = false;
            emit HederaServiceEnabled(false, block.timestamp);
        }
    }

    /**
     * @dev Manual health check trigger
     */
    function performHealthCheck() external onlyOperator {
        _performHealthCheck();
    }

    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get Hedera service statistics
     */
    function getHederaStats() external view returns (
        uint256 hcsSubmissions,
        uint256 hfsOperations,
        uint256 htsOperations,
        uint256 failed,
        bool enabled,
        uint256 lastCheck
    ) {
        return (
            totalHCSSubmissions,
            totalHFSOperations,
            totalHTSOperations,
            failedOperations,
            hederaConfig.enabled && !emergencyPaused,
            lastHealthCheck
        );
    }

    /**
     * @dev Get HTS token balance for an account
     * @param account Account to check balance for
     * @return balance Token balance
     */
    function getHTSBalance(address account) external view returns (uint256 balance) {
        return htsTokenBalances[account];
    }

    /**
     * @dev Get HCS message sequence for a topic
     * @param topicId HCS topic identifier
     * @return sequence Current sequence number
     */
    function getHCSSequence(bytes32 topicId) external view returns (uint256 sequence) {
        return hcsMessageSequences[topicId];
    }

    /**
     * @dev Get HFS file hash
     * @param fileId HFS file identifier
     * @return hash Current file hash
     */
    function getHFSFileHash(bytes32 fileId) external view returns (bytes32 hash) {
        return hfsFileHashes[fileId];
    }

    /**
     * @dev Check if Hedera services are healthy and enabled
     */
    function isHederaHealthy() external view returns (bool healthy) {
        if (!hederaConfig.enabled || emergencyPaused) {
            return false;
        }
        
        uint256 totalOperations = totalHCSSubmissions + totalHFSOperations + totalHTSOperations;
        if (totalOperations == 0) {
            return true;
        }
        
        return (failedOperations * 10000 / totalOperations) < 500; // <5% failure rate
    }

    // ========== REAL DATA INTEGRATION FUNCTIONS ==========
    
    /**
     * @dev Log real AI decision with comprehensive metadata
     * @param decisionId Unique decision identifier
     * @param fromStrategy Source strategy name
     * @param toStrategy Target strategy name
     * @param amount Amount being rebalanced
     * @param confidence AI confidence level (0-10000 basis points)
     * @param modelHash Hash of the AI model used
     * @param expectedYield Expected yield from the decision
     * @param riskScore Risk score of the decision (0-10000 basis points)
     */
    function logRealAIDecision(
        bytes32 decisionId,
        string memory fromStrategy,
        string memory toStrategy,
        uint256 amount,
        uint256 confidence,
        bytes32 modelHash,
        uint256 expectedYield,
        uint256 riskScore
    ) external onlyAIAgent hederaEnabled nonReentrant {
        require(confidence <= 10000, "HederaIntegration: Invalid confidence level");
        require(riskScore <= 10000, "HederaIntegration: Invalid risk score");
        require(amount > 0, "HederaIntegration: Invalid amount");
        
        // Create comprehensive decision data for real logging
        bytes memory realDecisionData = abi.encode(
            decisionId,
            fromStrategy,
            toStrategy,
            amount,
            confidence,
            modelHash,
            expectedYield,
            riskScore,
            msg.sender,
            block.timestamp,
            block.number,
            tx.gasprice
        );
        
        (bool success, uint256 sequenceNumber) = submitToHCS(hederaConfig.hcsTopicId, realDecisionData);
        require(success, "HederaIntegration: Failed to log real AI decision");
        
        emit AIDecisionLogged(
            hederaConfig.hcsTopicId,
            string(abi.encodePacked(fromStrategy, "->", toStrategy)),
            modelHash,
            confidence,
            msg.sender,
            block.timestamp
        );
        
        // Also log to audit topic for cross-reference
        bytes memory auditData = abi.encode(
            "REAL_AI_DECISION",
            decisionId,
            sequenceNumber,
            hederaConfig.hcsTopicId,
            block.timestamp
        );
        submitAuditTrail("AI_DECISION_LOGGED", auditData);
    }

    /**
     * @dev Update real AI model metadata on HFS with performance metrics
     * @param modelVersion Version identifier of the AI model
     * @param modelHash Cryptographic hash of the model
     * @param accuracy Model accuracy (0-10000 basis points)
     * @param precision Model precision (0-10000 basis points)
     * @param recall Model recall (0-10000 basis points)
     * @param f1Score Model F1 score (0-10000 basis points)
     * @param backtestReturn Backtest return percentage (basis points)
     * @param sharpeRatio Sharpe ratio (scaled by 1000)
     * @param maxDrawdown Maximum drawdown (0-10000 basis points)
     */
    function updateRealModelMetadata(
        string memory modelVersion,
        bytes32 modelHash,
        uint256 accuracy,
        uint256 precision,
        uint256 recall,
        uint256 f1Score,
        uint256 backtestReturn,
        uint256 sharpeRatio,
        uint256 maxDrawdown
    ) external onlyAIAgent hederaEnabled {
        require(accuracy <= 10000 && precision <= 10000 && recall <= 10000, "HederaIntegration: Invalid metrics");
        require(f1Score <= 10000 && maxDrawdown <= 10000, "HederaIntegration: Invalid metrics");
        
        // Create comprehensive real model metadata
        bytes memory realModelMetadata = abi.encode(
            modelVersion,
            modelHash,
            accuracy,
            precision,
            recall,
            f1Score,
            backtestReturn,
            sharpeRatio,
            maxDrawdown,
            block.timestamp,
            block.number,
            msg.sender,
            "REAL_AI_MODEL_METADATA"
        );
        
        bool success = updateHFSFile(hederaConfig.hfsModelFileId, realModelMetadata, "real_ai_model");
        require(success, "HederaIntegration: Failed to update real model metadata");
        
        // Log model update to HCS
        bytes memory modelUpdateLog = abi.encode(
            "MODEL_UPDATE",
            modelVersion,
            modelHash,
            accuracy,
            block.timestamp
        );
        submitToHCS(hederaConfig.hcsTopicId, modelUpdateLog);
    }

    /**
     * @dev Execute real deposit with HTS token minting and comprehensive logging
     * @param user User address making the deposit
     * @param depositAmount Amount being deposited
     * @param shareAmount Amount of shares to mint
     * @param currentAPY Current APY at time of deposit
     * @param strategyName Name of the strategy receiving the deposit
     * @return success Whether the operation succeeded
     * @return txHash Transaction hash for tracking
     */
    function executeRealDeposit(
        address user,
        uint256 depositAmount,
        uint256 shareAmount,
        uint256 currentAPY,
        string memory strategyName
    ) external onlyOperator hederaEnabled nonReentrant returns (bool success, bytes32 txHash) {
        require(user != address(0), "HederaIntegration: Invalid user");
        require(depositAmount > 0 && shareAmount > 0, "HederaIntegration: Invalid amounts");
        
        // Mint HTS share tokens for the user
        bool mintSuccess = mintShareTokens(user, shareAmount);
        require(mintSuccess, "HederaIntegration: Failed to mint share tokens");
        
        // Create comprehensive deposit log for HCS
        bytes memory realDepositData = abi.encode(
            "REAL_DEPOSIT",
            user,
            depositAmount,
            shareAmount,
            currentAPY,
            strategyName,
            block.timestamp,
            block.number,
            tx.gasprice,
            gasleft()
        );
        
        (bool hcsSuccess, uint256 sequenceNumber) = submitToHCS(hederaConfig.hcsTopicId, realDepositData);
        require(hcsSuccess, "HederaIntegration: Failed to log real deposit");
        
        txHash = keccak256(abi.encode(user, depositAmount, shareAmount, block.timestamp, sequenceNumber));
        
        // Emit comprehensive event
        emit HTSTokenMinted(hederaConfig.htsShareTokenId, user, shareAmount, txHash, block.timestamp);
        
        return (true, txHash);
    }

    /**
     * @dev Execute real withdrawal with HTS token burning and comprehensive logging
     * @param user User address making the withdrawal
     * @param shareAmount Amount of shares to burn
     * @param withdrawAmount Amount being withdrawn
     * @param finalAPY Final APY at time of withdrawal
     * @param strategyName Name of the strategy from which funds are withdrawn
     * @return success Whether the operation succeeded
     * @return txHash Transaction hash for tracking
     */
    function executeRealWithdrawal(
        address user,
        uint256 shareAmount,
        uint256 withdrawAmount,
        uint256 finalAPY,
        string memory strategyName
    ) external onlyOperator hederaEnabled nonReentrant returns (bool success, bytes32 txHash) {
        require(user != address(0), "HederaIntegration: Invalid user");
        require(shareAmount > 0 && withdrawAmount > 0, "HederaIntegration: Invalid amounts");
        require(htsTokenBalances[user] >= shareAmount, "HederaIntegration: Insufficient share balance");
        
        // Burn HTS share tokens from the user
        bool burnSuccess = burnShareTokens(user, shareAmount);
        require(burnSuccess, "HederaIntegration: Failed to burn share tokens");
        
        // Create comprehensive withdrawal log for HCS
        bytes memory realWithdrawalData = abi.encode(
            "REAL_WITHDRAWAL",
            user,
            shareAmount,
            withdrawAmount,
            finalAPY,
            strategyName,
            block.timestamp,
            block.number,
            tx.gasprice,
            gasleft()
        );
        
        (bool hcsSuccess, uint256 sequenceNumber) = submitToHCS(hederaConfig.hcsTopicId, realWithdrawalData);
        require(hcsSuccess, "HederaIntegration: Failed to log real withdrawal");
        
        txHash = keccak256(abi.encode(user, shareAmount, withdrawAmount, block.timestamp, sequenceNumber));
        
        // Emit comprehensive event
        emit HTSTokenBurned(hederaConfig.htsShareTokenId, user, shareAmount, txHash, block.timestamp);
        
        return (true, txHash);
    }

    // ========== ERROR HANDLING ==========
    
    /**
     * @dev Handle Hedera operation failures
     * @param operationType Type of operation that failed
     * @param responseCode Hedera response code
     * @param errorMessage Error message
     */
    function _handleHederaError(
        string memory operationType,
        int256 responseCode,
        string memory errorMessage
    ) internal {
        failedOperations++;
        
        emit HederaOperationFailed(
            operationType,
            responseCode,
            errorMessage,
            block.timestamp
        );
        
        // Auto-disable if too many failures
        uint256 totalOperations = totalHCSSubmissions + totalHFSOperations + totalHTSOperations;
        if (totalOperations > 0 && (failedOperations * 10000 / totalOperations) >= 1000) { // >=10% failure rate
            hederaConfig.enabled = false;
            emit HederaServiceEnabled(false, block.timestamp);
        }
    }

    /**
     * @dev Validate Hedera response code
     * @param responseCode Response code from Hedera operation
     * @param operationType Type of operation for error reporting
     */
    function validateHederaResponse(
        int256 responseCode,
        string memory operationType
    ) internal {
        if (responseCode != 22) { // SUCCESS = 22
            _handleHederaError(operationType, responseCode, "Operation failed");
            revert("HederaIntegration: Hedera operation failed");
        }
    }
}