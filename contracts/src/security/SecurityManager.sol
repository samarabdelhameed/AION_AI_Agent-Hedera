// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title SecurityManager
 * @dev Enhanced security mechanisms for AION Vault with comprehensive access control and audit trails
 * @notice Provides multi-layered security with role-based access, emergency controls, and audit logging
 * @author AION Team
 */
contract SecurityManager is AccessControl, ReentrancyGuard, Pausable {
    using Address for address;

    // ========== ROLES ==========
    bytes32 public constant SECURITY_ADMIN_ROLE = keccak256("SECURITY_ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");

    // ========== SECURITY CONFIGURATION ==========
    struct SecurityConfig {
        uint256 maxTransactionAmount;      // Maximum transaction amount
        uint256 dailyTransactionLimit;     // Daily transaction limit per user
        uint256 emergencyPauseDuration;    // Emergency pause duration
        uint256 multiSigThreshold;         // Multi-signature threshold
        bool requiresMultiSig;             // Whether multi-sig is required
        bool emergencyPauseEnabled;        // Emergency pause functionality
        uint256 suspiciousActivityThreshold; // Threshold for suspicious activity
    }

    SecurityConfig public securityConfig;

    // ========== STATE VARIABLES ==========
    mapping(address => uint256) public dailyTransactionAmounts;
    mapping(address => uint256) public lastTransactionDay;
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => bool) public whitelistedAddresses;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public suspiciousActivityCount;
    
    // Multi-signature tracking
    mapping(bytes32 => uint256) public multiSigApprovals;
    mapping(bytes32 => mapping(address => bool)) public hasApproved;
    mapping(bytes32 => bool) public multiSigExecuted;
    
    // Emergency controls
    uint256 public emergencyPauseStartTime;
    address public emergencyPauser;
    bool public permanentPause;
    
    // Audit trail
    uint256 public auditLogCount;
    mapping(uint256 => AuditLog) public auditLogs;
    
    struct AuditLog {
        uint256 timestamp;
        address actor;
        string action;
        bytes data;
        bool success;
        string reason;
    }

    // ========== EVENTS ==========
    
    // Security Events
    event SecurityConfigUpdated(
        address indexed updater,
        string configType,
        uint256 oldValue,
        uint256 newValue,
        uint256 timestamp
    );
    
    event TransactionBlocked(
        address indexed user,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    
    event SuspiciousActivityDetected(
        address indexed user,
        string activityType,
        uint256 count,
        uint256 timestamp
    );
    
    event AddressBlacklisted(
        address indexed addr,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    event AddressWhitelisted(
        address indexed addr,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    // Multi-signature Events
    event MultiSigProposed(
        bytes32 indexed proposalId,
        address indexed proposer,
        string action,
        bytes data,
        uint256 timestamp
    );
    
    event MultiSigApproved(
        bytes32 indexed proposalId,
        address indexed approver,
        uint256 approvals,
        uint256 required,
        uint256 timestamp
    );
    
    event MultiSigExecuted(
        bytes32 indexed proposalId,
        address indexed executor,
        bool success,
        uint256 timestamp
    );
    
    // Emergency Events
    event EmergencyPauseActivated(
        address indexed pauser,
        string reason,
        uint256 duration,
        uint256 timestamp
    );
    
    event EmergencyPauseDeactivated(
        address indexed admin,
        uint256 timestamp
    );
    
    event PermanentPauseActivated(
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    // Audit Events
    event AuditLogCreated(
        uint256 indexed logId,
        address indexed actor,
        string action,
        bool success,
        uint256 timestamp
    );

    // ========== MODIFIERS ==========
    
    modifier onlySecurityAdmin() {
        require(hasRole(SECURITY_ADMIN_ROLE, msg.sender), "SecurityManager: caller is not security admin");
        _;
    }
    
    modifier onlyEmergencyRole() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "SecurityManager: caller is not emergency role");
        _;
    }
    
    modifier onlyAuditor() {
        require(hasRole(AUDITOR_ROLE, msg.sender), "SecurityManager: caller is not auditor");
        _;
    }
    
    modifier notBlacklisted(address addr) {
        require(!blacklistedAddresses[addr], "SecurityManager: address is blacklisted");
        _;
    }
    
    modifier withinTransactionLimits(address user, uint256 amount) {
        require(_checkTransactionLimits(user, amount), "SecurityManager: transaction limits exceeded");
        _;
    }
    
    modifier notPermanentlyPaused() {
        require(!permanentPause, "SecurityManager: permanently paused");
        _;
    }
    
    modifier validProposal(bytes32 proposalId) {
        require(!multiSigExecuted[proposalId], "SecurityManager: proposal already executed");
        _;
    }

    // ========== CONSTRUCTOR ==========
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SECURITY_ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
        
        // Initialize default security configuration
        securityConfig = SecurityConfig({
            maxTransactionAmount: 100 ether,
            dailyTransactionLimit: 1000 ether,
            emergencyPauseDuration: 24 hours,
            multiSigThreshold: 2,
            requiresMultiSig: false,
            emergencyPauseEnabled: true,
            suspiciousActivityThreshold: 5
        });
        
        _logAudit(msg.sender, "SECURITY_MANAGER_DEPLOYED", abi.encode(block.timestamp), true, "Initial deployment");
    }

    // ========== SECURITY CONFIGURATION ==========
    
    /**
     * @dev Update security configuration
     * @param configType Type of configuration to update
     * @param newValue New value for the configuration
     */
    function updateSecurityConfig(
        string memory configType,
        uint256 newValue
    ) external onlySecurityAdmin {
        uint256 oldValue;
        
        if (keccak256(bytes(configType)) == keccak256("maxTransactionAmount")) {
            oldValue = securityConfig.maxTransactionAmount;
            securityConfig.maxTransactionAmount = newValue;
        } else if (keccak256(bytes(configType)) == keccak256("dailyTransactionLimit")) {
            oldValue = securityConfig.dailyTransactionLimit;
            securityConfig.dailyTransactionLimit = newValue;
        } else if (keccak256(bytes(configType)) == keccak256("emergencyPauseDuration")) {
            oldValue = securityConfig.emergencyPauseDuration;
            securityConfig.emergencyPauseDuration = newValue;
        } else if (keccak256(bytes(configType)) == keccak256("multiSigThreshold")) {
            oldValue = securityConfig.multiSigThreshold;
            securityConfig.multiSigThreshold = newValue;
        } else if (keccak256(bytes(configType)) == keccak256("suspiciousActivityThreshold")) {
            oldValue = securityConfig.suspiciousActivityThreshold;
            securityConfig.suspiciousActivityThreshold = newValue;
        } else {
            revert("SecurityManager: Invalid config type");
        }
        
        emit SecurityConfigUpdated(msg.sender, configType, oldValue, newValue, block.timestamp);
        _logAudit(msg.sender, "SECURITY_CONFIG_UPDATED", abi.encode(configType, oldValue, newValue), true, "Configuration updated");
    }

    /**
     * @dev Toggle boolean security configurations
     * @param configType Type of configuration to toggle
     * @param enabled New boolean value
     */
    function toggleSecurityConfig(
        string memory configType,
        bool enabled
    ) external onlySecurityAdmin {
        if (keccak256(bytes(configType)) == keccak256("requiresMultiSig")) {
            securityConfig.requiresMultiSig = enabled;
        } else if (keccak256(bytes(configType)) == keccak256("emergencyPauseEnabled")) {
            securityConfig.emergencyPauseEnabled = enabled;
        } else {
            revert("SecurityManager: Invalid boolean config type");
        }
        
        _logAudit(msg.sender, "SECURITY_CONFIG_TOGGLED", abi.encode(configType, enabled), true, "Boolean configuration toggled");
    }

    // ========== ACCESS CONTROL ==========
    
    /**
     * @dev Add address to blacklist
     * @param addr Address to blacklist
     * @param reason Reason for blacklisting
     */
    function blacklistAddress(
        address addr,
        string memory reason
    ) external onlySecurityAdmin {
        require(addr != address(0), "SecurityManager: Invalid address");
        require(!hasRole(DEFAULT_ADMIN_ROLE, addr), "SecurityManager: Cannot blacklist admin");
        
        blacklistedAddresses[addr] = true;
        
        emit AddressBlacklisted(addr, msg.sender, reason, block.timestamp);
        _logAudit(msg.sender, "ADDRESS_BLACKLISTED", abi.encode(addr, reason), true, reason);
    }

    /**
     * @dev Remove address from blacklist
     * @param addr Address to remove from blacklist
     * @param reason Reason for removal
     */
    function removeFromBlacklist(
        address addr,
        string memory reason
    ) external onlySecurityAdmin {
        blacklistedAddresses[addr] = false;
        _logAudit(msg.sender, "ADDRESS_REMOVED_FROM_BLACKLIST", abi.encode(addr, reason), true, reason);
    }

    /**
     * @dev Add address to whitelist
     * @param addr Address to whitelist
     * @param reason Reason for whitelisting
     */
    function whitelistAddress(
        address addr,
        string memory reason
    ) external onlySecurityAdmin {
        require(addr != address(0), "SecurityManager: Invalid address");
        
        whitelistedAddresses[addr] = true;
        
        emit AddressWhitelisted(addr, msg.sender, reason, block.timestamp);
        _logAudit(msg.sender, "ADDRESS_WHITELISTED", abi.encode(addr, reason), true, reason);
    }

    /**
     * @dev Remove address from whitelist
     * @param addr Address to remove from whitelist
     * @param reason Reason for removal
     */
    function removeFromWhitelist(
        address addr,
        string memory reason
    ) external onlySecurityAdmin {
        whitelistedAddresses[addr] = false;
        _logAudit(msg.sender, "ADDRESS_REMOVED_FROM_WHITELIST", abi.encode(addr, reason), true, reason);
    }

    // ========== TRANSACTION VALIDATION ==========
    
    /**
     * @dev Validate transaction before execution
     * @param user User performing the transaction
     * @param amount Transaction amount
     * @param transactionType Type of transaction
     * @return valid Whether the transaction is valid
     */
    function validateTransaction(
        address user,
        uint256 amount,
        string memory transactionType
    ) external notBlacklisted(user) withinTransactionLimits(user, amount) returns (bool valid) {
        // Check if transaction was already processed (replay protection)
        bytes32 txHash = keccak256(abi.encode(user, amount, transactionType, block.timestamp, block.number));
        require(!processedTransactions[txHash], "SecurityManager: Transaction already processed");
        
        // Mark transaction as processed
        processedTransactions[txHash] = true;
        
        // Update daily transaction tracking
        _updateDailyTransactionAmount(user, amount);
        
        // Check for suspicious activity
        _checkSuspiciousActivity(user, amount, transactionType);
        
        _logAudit(user, "TRANSACTION_VALIDATED", abi.encode(amount, transactionType), true, "Transaction validation successful");
        
        return true;
    }

    /**
     * @dev Check transaction limits
     * @param user User performing the transaction
     * @param amount Transaction amount
     * @return valid Whether the transaction is within limits
     */
    function _checkTransactionLimits(address user, uint256 amount) internal view returns (bool valid) {
        // Check maximum transaction amount
        if (amount > securityConfig.maxTransactionAmount && !whitelistedAddresses[user]) {
            return false;
        }
        
        // Check daily transaction limit
        uint256 currentDay = block.timestamp / 1 days;
        if (lastTransactionDay[user] == currentDay) {
            if (dailyTransactionAmounts[user] + amount > securityConfig.dailyTransactionLimit && !whitelistedAddresses[user]) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @dev Update daily transaction amount for user
     * @param user User performing the transaction
     * @param amount Transaction amount
     */
    function _updateDailyTransactionAmount(address user, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        
        if (lastTransactionDay[user] != currentDay) {
            // Reset daily amount for new day
            dailyTransactionAmounts[user] = amount;
            lastTransactionDay[user] = currentDay;
        } else {
            // Add to existing daily amount
            dailyTransactionAmounts[user] += amount;
        }
    }

    /**
     * @dev Check for suspicious activity patterns
     * @param user User performing the transaction
     * @param amount Transaction amount
     * @param transactionType Type of transaction
     */
    function _checkSuspiciousActivity(
        address user,
        uint256 amount,
        string memory transactionType
    ) internal {
        bool suspicious = false;
        string memory reason = "";
        
        // Check for large transactions
        if (amount > securityConfig.maxTransactionAmount / 2) {
            suspicious = true;
            reason = "Large transaction amount";
        }
        
        // Check for rapid transactions (simplified)
        uint256 currentDay = block.timestamp / 1 days;
        if (lastTransactionDay[user] == currentDay && dailyTransactionAmounts[user] > securityConfig.dailyTransactionLimit / 2) {
            suspicious = true;
            reason = "High daily transaction volume";
        }
        
        if (suspicious) {
            suspiciousActivityCount[user]++;
            
            emit SuspiciousActivityDetected(
                user,
                transactionType,
                suspiciousActivityCount[user],
                block.timestamp
            );
            
            _logAudit(user, "SUSPICIOUS_ACTIVITY_DETECTED", abi.encode(amount, transactionType, reason), true, reason);
            
            // Auto-blacklist if threshold exceeded
            if (suspiciousActivityCount[user] >= securityConfig.suspiciousActivityThreshold) {
                blacklistedAddresses[user] = true;
                emit AddressBlacklisted(user, address(this), "Suspicious activity threshold exceeded", block.timestamp);
                _logAudit(address(this), "AUTO_BLACKLISTED", abi.encode(user, suspiciousActivityCount[user]), true, "Automatic blacklisting due to suspicious activity");
            }
        }
    }

    // ========== MULTI-SIGNATURE OPERATIONS ==========
    
    /**
     * @dev Propose a multi-signature operation
     * @param action Action to be performed
     * @param data Data for the action
     * @return proposalId Unique identifier for the proposal
     */
    function proposeMultiSig(
        string memory action,
        bytes memory data
    ) external onlyRole(OPERATOR_ROLE) returns (bytes32 proposalId) {
        proposalId = keccak256(abi.encode(action, data, block.timestamp, msg.sender));
        
        // First approval from proposer
        multiSigApprovals[proposalId] = 1;
        hasApproved[proposalId][msg.sender] = true;
        
        emit MultiSigProposed(proposalId, msg.sender, action, data, block.timestamp);
        _logAudit(msg.sender, "MULTISIG_PROPOSED", abi.encode(proposalId, action), true, "Multi-signature proposal created");
        
        return proposalId;
    }

    /**
     * @dev Approve a multi-signature proposal
     * @param proposalId Proposal identifier
     */
    function approveMultiSig(
        bytes32 proposalId
    ) external onlyRole(OPERATOR_ROLE) validProposal(proposalId) {
        require(!hasApproved[proposalId][msg.sender], "SecurityManager: Already approved");
        
        hasApproved[proposalId][msg.sender] = true;
        multiSigApprovals[proposalId]++;
        
        emit MultiSigApproved(
            proposalId,
            msg.sender,
            multiSigApprovals[proposalId],
            securityConfig.multiSigThreshold,
            block.timestamp
        );
        
        _logAudit(msg.sender, "MULTISIG_APPROVED", abi.encode(proposalId, multiSigApprovals[proposalId]), true, "Multi-signature approval added");
    }

    /**
     * @dev Execute a multi-signature proposal
     * @param proposalId Proposal identifier
     * @param target Target contract address
     * @param data Call data
     * @return success Whether the execution was successful
     */
    function executeMultiSig(
        bytes32 proposalId,
        address target,
        bytes memory data
    ) external onlyRole(OPERATOR_ROLE) validProposal(proposalId) returns (bool success) {
        require(multiSigApprovals[proposalId] >= securityConfig.multiSigThreshold, "SecurityManager: Insufficient approvals");
        
        multiSigExecuted[proposalId] = true;
        
        // Execute the call
        (success, ) = target.call(data);
        
        emit MultiSigExecuted(proposalId, msg.sender, success, block.timestamp);
        _logAudit(msg.sender, "MULTISIG_EXECUTED", abi.encode(proposalId, target, success), success, success ? "Multi-signature execution successful" : "Multi-signature execution failed");
        
        return success;
    }

    // ========== EMERGENCY CONTROLS ==========
    
    /**
     * @dev Activate emergency pause
     * @param reason Reason for emergency pause
     */
    function activateEmergencyPause(
        string memory reason
    ) external onlyEmergencyRole notPermanentlyPaused {
        require(securityConfig.emergencyPauseEnabled, "SecurityManager: Emergency pause disabled");
        
        _pause();
        emergencyPauseStartTime = block.timestamp;
        emergencyPauser = msg.sender;
        
        emit EmergencyPauseActivated(msg.sender, reason, securityConfig.emergencyPauseDuration, block.timestamp);
        _logAudit(msg.sender, "EMERGENCY_PAUSE_ACTIVATED", abi.encode(reason, securityConfig.emergencyPauseDuration), true, reason);
    }

    /**
     * @dev Deactivate emergency pause
     */
    function deactivateEmergencyPause() external onlySecurityAdmin {
        require(paused(), "SecurityManager: Not currently paused");
        
        _unpause();
        emergencyPauseStartTime = 0;
        emergencyPauser = address(0);
        
        emit EmergencyPauseDeactivated(msg.sender, block.timestamp);
        _logAudit(msg.sender, "EMERGENCY_PAUSE_DEACTIVATED", abi.encode(block.timestamp), true, "Emergency pause manually deactivated");
    }

    /**
     * @dev Activate permanent pause (irreversible)
     * @param reason Reason for permanent pause
     */
    function activatePermanentPause(
        string memory reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        permanentPause = true;
        _pause();
        
        emit PermanentPauseActivated(msg.sender, reason, block.timestamp);
        _logAudit(msg.sender, "PERMANENT_PAUSE_ACTIVATED", abi.encode(reason), true, reason);
    }

    /**
     * @dev Check if emergency pause has expired and auto-unpause
     */
    function checkEmergencyPauseExpiry() external {
        if (paused() && !permanentPause && emergencyPauseStartTime > 0) {
            if (block.timestamp >= emergencyPauseStartTime + securityConfig.emergencyPauseDuration) {
                _unpause();
                emergencyPauseStartTime = 0;
                emergencyPauser = address(0);
                
                emit EmergencyPauseDeactivated(address(this), block.timestamp);
                _logAudit(address(this), "EMERGENCY_PAUSE_AUTO_DEACTIVATED", abi.encode(block.timestamp), true, "Emergency pause automatically expired");
            }
        }
    }

    // ========== AUDIT TRAIL ==========
    
    /**
     * @dev Create audit log entry
     * @param actor Address performing the action
     * @param action Action being performed
     * @param data Additional data
     * @param success Whether the action was successful
     * @param reason Reason or description
     */
    function _logAudit(
        address actor,
        string memory action,
        bytes memory data,
        bool success,
        string memory reason
    ) internal {
        auditLogCount++;
        
        auditLogs[auditLogCount] = AuditLog({
            timestamp: block.timestamp,
            actor: actor,
            action: action,
            data: data,
            success: success,
            reason: reason
        });
        
        emit AuditLogCreated(auditLogCount, actor, action, success, block.timestamp);
    }

    /**
     * @dev Get audit log by ID
     * @param logId Audit log identifier
     * @return log Audit log entry
     */
    function getAuditLog(uint256 logId) external view onlyAuditor returns (AuditLog memory log) {
        require(logId > 0 && logId <= auditLogCount, "SecurityManager: Invalid log ID");
        return auditLogs[logId];
    }

    /**
     * @dev Get recent audit logs
     * @param count Number of recent logs to retrieve
     * @return logs Array of recent audit logs
     */
    function getRecentAuditLogs(uint256 count) external view onlyAuditor returns (AuditLog[] memory logs) {
        if (auditLogCount == 0) {
            return new AuditLog[](0);
        }
        
        uint256 actualCount = auditLogCount > count ? count : auditLogCount;
        uint256 startId = auditLogCount > actualCount ? auditLogCount - actualCount + 1 : 1;
        
        logs = new AuditLog[](actualCount);
        
        for (uint256 i = 0; i < actualCount; i++) {
            logs[i] = auditLogs[startId + i];
        }
        
        return logs;
    }

    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get security configuration
     * @return config Current security configuration
     */
    function getSecurityConfig() external view returns (SecurityConfig memory config) {
        return securityConfig;
    }

    /**
     * @dev Check if address is blacklisted
     * @param addr Address to check
     * @return blacklisted Whether the address is blacklisted
     */
    function isBlacklisted(address addr) external view returns (bool blacklisted) {
        return blacklistedAddresses[addr];
    }

    /**
     * @dev Check if address is whitelisted
     * @param addr Address to check
     * @return whitelisted Whether the address is whitelisted
     */
    function isWhitelisted(address addr) external view returns (bool whitelisted) {
        return whitelistedAddresses[addr];
    }

    /**
     * @dev Get user's daily transaction amount
     * @param user User address
     * @return amount Daily transaction amount
     * @return day Last transaction day
     */
    function getDailyTransactionAmount(address user) external view returns (uint256 amount, uint256 day) {
        return (dailyTransactionAmounts[user], lastTransactionDay[user]);
    }

    /**
     * @dev Get multi-signature proposal status
     * @param proposalId Proposal identifier
     * @return approvals Number of approvals
     * @return executed Whether the proposal was executed
     */
    function getMultiSigStatus(bytes32 proposalId) external view returns (uint256 approvals, bool executed) {
        return (multiSigApprovals[proposalId], multiSigExecuted[proposalId]);
    }

    /**
     * @dev Get emergency pause status
     * @return isPaused Whether emergency pause is active
     * @return startTime Emergency pause start time
     * @return pauser Address that activated the pause
     * @return isPermanent Whether the pause is permanent
     */
    function getEmergencyPauseStatus() external view returns (
        bool isPaused,
        uint256 startTime,
        address pauser,
        bool isPermanent
    ) {
        return (paused(), emergencyPauseStartTime, emergencyPauser, permanentPause);
    }

    /**
     * @dev Get audit statistics
     * @return totalLogs Total number of audit logs
     * @return lastLogTime Timestamp of last audit log
     */
    function getAuditStats() external view returns (uint256 totalLogs, uint256 lastLogTime) {
        return (auditLogCount, auditLogCount > 0 ? auditLogs[auditLogCount].timestamp : 0);
    }
}