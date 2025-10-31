// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SecurityManager.sol";

/**
 * @title SecurityMonitor
 * @dev Advanced security monitoring system with real-time threat detection
 * @notice Monitors system behavior and detects potential security threats
 * @author AION Team
 */
contract SecurityMonitor is AccessControl, ReentrancyGuard {
    
    // ========== ROLES ==========
    bytes32 public constant MONITOR_ROLE = keccak256("MONITOR_ROLE");
    bytes32 public constant ANALYST_ROLE = keccak256("ANALYST_ROLE");

    // ========== STRUCTS ==========
    
    struct ThreatAlert {
        uint256 id;
        address target;
        string threatType;
        uint256 severity; // 1-10 scale
        string description;
        uint256 timestamp;
        bool resolved;
        address resolver;
        uint256 resolvedAt;
    }
    
    struct SecurityMetrics {
        uint256 totalTransactions;
        uint256 blockedTransactions;
        uint256 suspiciousActivities;
        uint256 blacklistedAddresses;
        uint256 emergencyPauses;
        uint256 threatAlertsGenerated;
        uint256 lastUpdateTime;
    }
    
    struct RiskProfile {
        address user;
        uint256 riskScore; // 0-100 scale
        uint256 transactionCount;
        uint256 totalVolume;
        uint256 suspiciousCount;
        uint256 lastActivity;
        bool isHighRisk;
    }

    // ========== STATE VARIABLES ==========
    
    SecurityManager public securityManager;
    
    // Threat detection
    uint256 public threatAlertCount;
    mapping(uint256 => ThreatAlert) public threatAlerts;
    mapping(address => uint256[]) public userThreatAlerts;
    
    // Security metrics
    SecurityMetrics public securityMetrics;
    
    // Risk profiling
    mapping(address => RiskProfile) public riskProfiles;
    address[] public highRiskUsers;
    
    // Monitoring configuration
    uint256 public highRiskThreshold = 70;
    uint256 public criticalThreatThreshold = 8;
    bool public realTimeMonitoring = true;
    
    // Pattern detection
    mapping(bytes32 => uint256) public patternCounts;
    mapping(bytes32 => bool) public knownAttackPatterns;

    // ========== EVENTS ==========
    
    event ThreatDetected(
        uint256 indexed alertId,
        address indexed target,
        string threatType,
        uint256 severity,
        uint256 timestamp
    );
    
    event ThreatResolved(
        uint256 indexed alertId,
        address indexed resolver,
        uint256 timestamp
    );
    
    event HighRiskUserIdentified(
        address indexed user,
        uint256 riskScore,
        string reason,
        uint256 timestamp
    );
    
    event SecurityMetricsUpdated(
        uint256 totalTransactions,
        uint256 blockedTransactions,
        uint256 timestamp
    );
    
    event AttackPatternDetected(
        bytes32 indexed patternHash,
        address indexed attacker,
        string patternType,
        uint256 timestamp
    );

    // ========== CONSTRUCTOR ==========
    
    constructor(address _securityManager) {
        require(_securityManager != address(0), "SecurityMonitor: Invalid security manager");
        
        securityManager = SecurityManager(_securityManager);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MONITOR_ROLE, msg.sender);
        _grantRole(ANALYST_ROLE, msg.sender);
        
        // Initialize security metrics
        securityMetrics.lastUpdateTime = block.timestamp;
    }

    // ========== THREAT DETECTION ==========
    
    /**
     * @dev Monitor transaction and detect potential threats
     * @param user User performing the transaction
     * @param amount Transaction amount
     * @param transactionType Type of transaction
     * @param additionalData Additional transaction data
     */
    function monitorTransaction(
        address user,
        uint256 amount,
        string memory transactionType,
        bytes memory additionalData
    ) external onlyRole(MONITOR_ROLE) {
        if (!realTimeMonitoring) return;
        
        // Update security metrics
        securityMetrics.totalTransactions++;
        securityMetrics.lastUpdateTime = block.timestamp;
        
        // Update user risk profile
        _updateRiskProfile(user, amount, transactionType);
        
        // Detect suspicious patterns
        _detectSuspiciousPatterns(user, amount, transactionType, additionalData);
        
        // Check for known attack patterns
        _checkAttackPatterns(user, amount, transactionType, additionalData);
        
        emit SecurityMetricsUpdated(
            securityMetrics.totalTransactions,
            securityMetrics.blockedTransactions,
            block.timestamp
        );
    }

    /**
     * @dev Create threat alert
     * @param target Target address
     * @param threatType Type of threat
     * @param severity Severity level (1-10)
     * @param description Threat description
     * @return alertId Generated alert ID
     */
    function createThreatAlert(
        address target,
        string memory threatType,
        uint256 severity,
        string memory description
    ) external onlyRole(MONITOR_ROLE) returns (uint256 alertId) {
        require(severity >= 1 && severity <= 10, "SecurityMonitor: Invalid severity level");
        
        threatAlertCount++;
        alertId = threatAlertCount;
        
        threatAlerts[alertId] = ThreatAlert({
            id: alertId,
            target: target,
            threatType: threatType,
            severity: severity,
            description: description,
            timestamp: block.timestamp,
            resolved: false,
            resolver: address(0),
            resolvedAt: 0
        });
        
        userThreatAlerts[target].push(alertId);
        securityMetrics.threatAlertsGenerated++;
        
        emit ThreatDetected(alertId, target, threatType, severity, block.timestamp);
        
        // Auto-escalate critical threats
        if (severity >= criticalThreatThreshold) {
            _escalateCriticalThreat(alertId, target, threatType, description);
        }
        
        return alertId;
    }

    /**
     * @dev Resolve threat alert
     * @param alertId Alert ID to resolve
     * @param resolution Resolution description
     */
    function resolveThreatAlert(
        uint256 alertId,
        string memory resolution
    ) external onlyRole(ANALYST_ROLE) {
        require(alertId > 0 && alertId <= threatAlertCount, "SecurityMonitor: Invalid alert ID");
        require(!threatAlerts[alertId].resolved, "SecurityMonitor: Alert already resolved");
        
        threatAlerts[alertId].resolved = true;
        threatAlerts[alertId].resolver = msg.sender;
        threatAlerts[alertId].resolvedAt = block.timestamp;
        
        emit ThreatResolved(alertId, msg.sender, block.timestamp);
    }

    // ========== RISK PROFILING ==========
    
    /**
     * @dev Update user risk profile
     * @param user User address
     * @param amount Transaction amount
     * @param transactionType Type of transaction
     */
    function _updateRiskProfile(
        address user,
        uint256 amount,
        string memory transactionType
    ) internal {
        RiskProfile storage profile = riskProfiles[user];
        
        profile.user = user;
        profile.transactionCount++;
        profile.totalVolume += amount;
        profile.lastActivity = block.timestamp;
        
        // Calculate risk score based on various factors
        uint256 newRiskScore = _calculateRiskScore(user, amount, transactionType);
        profile.riskScore = newRiskScore;
        
        // Check if user becomes high risk
        bool wasHighRisk = profile.isHighRisk;
        profile.isHighRisk = newRiskScore >= highRiskThreshold;
        
        if (profile.isHighRisk && !wasHighRisk) {
            highRiskUsers.push(user);
            emit HighRiskUserIdentified(
                user,
                newRiskScore,
                "Risk threshold exceeded",
                block.timestamp
            );
        }
    }

    /**
     * @dev Calculate risk score for user
     * @param user User address
     * @param amount Transaction amount
     * @param transactionType Type of transaction
     * @return riskScore Calculated risk score (0-100)
     */
    function _calculateRiskScore(
        address user,
        uint256 amount,
        string memory transactionType
    ) internal view returns (uint256 riskScore) {
        RiskProfile memory profile = riskProfiles[user];
        
        // Base risk score
        riskScore = 10;
        
        // Large transaction penalty
        if (amount > 50 ether) {
            riskScore += 20;
        } else if (amount > 10 ether) {
            riskScore += 10;
        }
        
        // High frequency penalty
        if (profile.transactionCount > 100) {
            riskScore += 15;
        } else if (profile.transactionCount > 50) {
            riskScore += 10;
        }
        
        // Suspicious activity penalty
        if (profile.suspiciousCount > 0) {
            riskScore += profile.suspiciousCount * 5;
        }
        
        // Blacklist check
        if (securityManager.isBlacklisted(user)) {
            riskScore += 50;
        }
        
        // Whitelist bonus
        if (securityManager.isWhitelisted(user)) {
            riskScore = riskScore > 20 ? riskScore - 20 : 0;
        }
        
        // Cap at 100
        if (riskScore > 100) {
            riskScore = 100;
        }
        
        return riskScore;
    }

    // ========== PATTERN DETECTION ==========
    
    /**
     * @dev Detect suspicious transaction patterns
     * @param user User address
     * @param amount Transaction amount
     * @param transactionType Type of transaction
     * @param additionalData Additional transaction data
     */
    function _detectSuspiciousPatterns(
        address user,
        uint256 amount,
        string memory transactionType,
        bytes memory additionalData
    ) internal {
        // Pattern 1: Rapid successive transactions
        bytes32 rapidTxPattern = keccak256(abi.encode("RAPID_TX", user, block.timestamp / 300)); // 5-minute windows
        patternCounts[rapidTxPattern]++;
        
        if (patternCounts[rapidTxPattern] > 10) {
            this.createThreatAlert(
                user,
                "RAPID_TRANSACTIONS",
                6,
                "Multiple transactions in short time period"
            );
        }
        
        // Pattern 2: Round number amounts (potential automated attacks)
        if (amount % 1 ether == 0 && amount >= 10 ether) {
            bytes32 roundAmountPattern = keccak256(abi.encode("ROUND_AMOUNT", user));
            patternCounts[roundAmountPattern]++;
            
            if (patternCounts[roundAmountPattern] > 5) {
                this.createThreatAlert(
                    user,
                    "ROUND_AMOUNT_PATTERN",
                    4,
                    "Repeated round number transactions"
                );
            }
        }
        
        // Pattern 3: Large withdrawal after deposit (potential money laundering)
        if (keccak256(bytes(transactionType)) == keccak256("WITHDRAWAL")) {
            RiskProfile memory profile = riskProfiles[user];
            if (amount > profile.totalVolume / 2 && profile.transactionCount < 5) {
                this.createThreatAlert(
                    user,
                    "LARGE_WITHDRAWAL_NEW_USER",
                    7,
                    "Large withdrawal from new user account"
                );
            }
        }
    }

    /**
     * @dev Check for known attack patterns
     * @param user User address
     * @param amount Transaction amount
     * @param transactionType Type of transaction
     * @param additionalData Additional transaction data
     */
    function _checkAttackPatterns(
        address user,
        uint256 amount,
        string memory transactionType,
        bytes memory additionalData
    ) internal {
        // Create pattern hash
        bytes32 patternHash = keccak256(abi.encode(
            user,
            amount,
            transactionType,
            additionalData,
            block.timestamp / 3600 // Hour-based grouping
        ));
        
        if (knownAttackPatterns[patternHash]) {
            emit AttackPatternDetected(patternHash, user, transactionType, block.timestamp);
            
            this.createThreatAlert(
                user,
                "KNOWN_ATTACK_PATTERN",
                9,
                "Transaction matches known attack pattern"
            );
        }
    }

    /**
     * @dev Escalate critical threat
     * @param alertId Alert ID
     * @param target Target address
     * @param threatType Type of threat
     * @param description Threat description
     */
    function _escalateCriticalThreat(
        uint256 alertId,
        address target,
        string memory threatType,
        string memory description
    ) internal {
        // Auto-blacklist for critical threats
        // Note: This would need to be called through SecurityManager
        // securityManager.blacklistAddress(target, string(abi.encodePacked("Critical threat: ", description)));
        
        // Could also trigger emergency pause for severe threats
        if (keccak256(bytes(threatType)) == keccak256("SYSTEM_COMPROMISE")) {
            // Emergency pause would be triggered here
        }
    }

    // ========== CONFIGURATION ==========
    
    /**
     * @dev Update monitoring configuration
     * @param _highRiskThreshold New high risk threshold
     * @param _criticalThreatThreshold New critical threat threshold
     * @param _realTimeMonitoring Enable/disable real-time monitoring
     */
    function updateMonitoringConfig(
        uint256 _highRiskThreshold,
        uint256 _criticalThreatThreshold,
        bool _realTimeMonitoring
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_highRiskThreshold <= 100, "SecurityMonitor: Invalid high risk threshold");
        require(_criticalThreatThreshold >= 1 && _criticalThreatThreshold <= 10, "SecurityMonitor: Invalid critical threat threshold");
        
        highRiskThreshold = _highRiskThreshold;
        criticalThreatThreshold = _criticalThreatThreshold;
        realTimeMonitoring = _realTimeMonitoring;
    }

    /**
     * @dev Add known attack pattern
     * @param patternHash Hash of the attack pattern
     * @param description Description of the pattern
     */
    function addAttackPattern(
        bytes32 patternHash,
        string memory description
    ) external onlyRole(ANALYST_ROLE) {
        knownAttackPatterns[patternHash] = true;
    }

    /**
     * @dev Remove attack pattern
     * @param patternHash Hash of the attack pattern
     */
    function removeAttackPattern(bytes32 patternHash) external onlyRole(ANALYST_ROLE) {
        knownAttackPatterns[patternHash] = false;
    }

    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get threat alert details
     * @param alertId Alert ID
     * @return alert Threat alert details
     */
    function getThreatAlert(uint256 alertId) external view returns (ThreatAlert memory alert) {
        require(alertId > 0 && alertId <= threatAlertCount, "SecurityMonitor: Invalid alert ID");
        return threatAlerts[alertId];
    }

    /**
     * @dev Get user threat alerts
     * @param user User address
     * @return alertIds Array of alert IDs for the user
     */
    function getUserThreatAlerts(address user) external view returns (uint256[] memory alertIds) {
        return userThreatAlerts[user];
    }

    /**
     * @dev Get user risk profile
     * @param user User address
     * @return profile User risk profile
     */
    function getUserRiskProfile(address user) external view returns (RiskProfile memory profile) {
        return riskProfiles[user];
    }

    /**
     * @dev Get security metrics
     * @return metrics Current security metrics
     */
    function getSecurityMetrics() external view returns (SecurityMetrics memory metrics) {
        return securityMetrics;
    }

    /**
     * @dev Get high risk users
     * @return users Array of high risk user addresses
     */
    function getHighRiskUsers() external view returns (address[] memory users) {
        return highRiskUsers;
    }

    /**
     * @dev Get recent threat alerts
     * @param count Number of recent alerts to retrieve
     * @return alerts Array of recent threat alerts
     */
    function getRecentThreatAlerts(uint256 count) external view returns (ThreatAlert[] memory alerts) {
        if (threatAlertCount == 0) {
            return new ThreatAlert[](0);
        }
        
        uint256 actualCount = threatAlertCount > count ? count : threatAlertCount;
        uint256 startId = threatAlertCount > actualCount ? threatAlertCount - actualCount + 1 : 1;
        
        alerts = new ThreatAlert[](actualCount);
        
        for (uint256 i = 0; i < actualCount; i++) {
            alerts[i] = threatAlerts[startId + i];
        }
        
        return alerts;
    }

    /**
     * @dev Check if pattern is known attack
     * @param patternHash Pattern hash
     * @return isAttack Whether the pattern is a known attack
     */
    function isKnownAttackPattern(bytes32 patternHash) external view returns (bool isAttack) {
        return knownAttackPatterns[patternHash];
    }

    /**
     * @dev Get pattern count
     * @param patternHash Pattern hash
     * @return count Number of times pattern was detected
     */
    function getPatternCount(bytes32 patternHash) external view returns (uint256 count) {
        return patternCounts[patternHash];
    }
}