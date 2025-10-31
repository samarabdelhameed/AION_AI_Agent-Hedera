// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/security/SecurityManager.sol";
import "../src/security/SecurityMonitor.sol";
import "../src/security/AuditTrail.sol";
import "../src/hedera/HederaIntegration.sol";

/**
 * @title SecuritySuite Test
 * @dev Comprehensive test suite for all security mechanisms
 */
contract SecuritySuiteTest is Test {
    SecurityManager public securityManager;
    SecurityMonitor public securityMonitor;
    AuditTrail public auditTrail;
    
    address public owner;
    address public securityAdmin;
    address public emergencyRole;
    address public auditor;
    address public operator;
    address public aiAgent;
    address public user1;
    address public user2;
    address public maliciousUser;
    
    // Test constants
    uint256 constant LARGE_AMOUNT = 100 ether;
    uint256 constant SMALL_AMOUNT = 1 ether;
    
    event ThreatDetected(uint256 indexed alertId, address indexed target, string threatType, uint256 severity, uint256 timestamp);
    event AddressBlacklisted(address indexed addr, address indexed admin, string reason, uint256 timestamp);
    event AuditEntryCreated(uint256 indexed entryId, address indexed actor, string action, string category, bool success, uint256 timestamp);
    event EmergencyPauseActivated(address indexed pauser, string reason, uint256 duration, uint256 timestamp);

    function setUp() public {
        owner = address(this);
        securityAdmin = makeAddr("securityAdmin");
        emergencyRole = makeAddr("emergencyRole");
        auditor = makeAddr("auditor");
        operator = makeAddr("operator");
        aiAgent = makeAddr("aiAgent");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        maliciousUser = makeAddr("maliciousUser");
        
        // Deploy contracts
        securityManager = new SecurityManager();
        securityMonitor = new SecurityMonitor(address(securityManager));
        auditTrail = new AuditTrail();
        
        // Setup roles
        securityManager.grantRole(securityManager.SECURITY_ADMIN_ROLE(), securityAdmin);
        securityManager.grantRole(securityManager.EMERGENCY_ROLE(), emergencyRole);
        securityManager.grantRole(securityManager.AUDITOR_ROLE(), auditor);
        securityManager.grantRole(securityManager.OPERATOR_ROLE(), operator);
        securityManager.grantRole(securityManager.AI_AGENT_ROLE(), aiAgent);
        
        securityMonitor.grantRole(securityMonitor.MONITOR_ROLE(), address(this));
        securityMonitor.grantRole(securityMonitor.ANALYST_ROLE(), auditor);
        
        auditTrail.grantRole(auditTrail.LOGGER_ROLE(), address(this));
        auditTrail.grantRole(auditTrail.AUDITOR_ROLE(), auditor);
        auditTrail.grantRole(auditTrail.COMPLIANCE_ROLE(), auditor);
        
        // Fund test accounts
        vm.deal(user1, 1000 ether);
        vm.deal(user2, 1000 ether);
        vm.deal(maliciousUser, 1000 ether);
    }

    // ========== SECURITY MANAGER TESTS ==========
    
    function testSecurityManagerDeployment() public {
        assertTrue(securityManager.hasRole(securityManager.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(securityManager.hasRole(securityManager.SECURITY_ADMIN_ROLE(), owner));
        assertTrue(securityManager.hasRole(securityManager.EMERGENCY_ROLE(), owner));
        
        SecurityManager.SecurityConfig memory config = securityManager.getSecurityConfig();
        assertEq(config.maxTransactionAmount, 100 ether);
        assertEq(config.dailyTransactionLimit, 1000 ether);
        assertTrue(config.emergencyPauseEnabled);
    }

    function testUpdateSecurityConfig() public {
        vm.prank(securityAdmin);
        securityManager.updateSecurityConfig("maxTransactionAmount", 200 ether);
        
        SecurityManager.SecurityConfig memory config = securityManager.getSecurityConfig();
        assertEq(config.maxTransactionAmount, 200 ether);
    }

    function testBlacklistAddress() public {
        vm.prank(securityAdmin);
        securityManager.blacklistAddress(maliciousUser, "Suspicious activity detected");
        
        assertTrue(securityManager.isBlacklisted(maliciousUser));
        assertFalse(securityManager.isBlacklisted(user1));
    }

    function testWhitelistAddress() public {
        vm.prank(securityAdmin);
        securityManager.whitelistAddress(user1, "Trusted user");
        
        assertTrue(securityManager.isWhitelisted(user1));
        assertFalse(securityManager.isWhitelisted(user2));
    }

    function testTransactionValidation() public {
        // Valid transaction
        bool valid = securityManager.validateTransaction(user1, SMALL_AMOUNT, "DEPOSIT");
        assertTrue(valid);
        
        // Blacklist user and test
        vm.prank(securityAdmin);
        securityManager.blacklistAddress(maliciousUser, "Test blacklist");
        
        vm.expectRevert("SecurityManager: address is blacklisted");
        securityManager.validateTransaction(maliciousUser, SMALL_AMOUNT, "DEPOSIT");
    }

    function testTransactionLimits() public {
        // Test maximum transaction amount
        vm.expectRevert("SecurityManager: transaction limits exceeded");
        securityManager.validateTransaction(user1, 150 ether, "DEPOSIT");
        
        // Test daily limit (simulate multiple transactions)
        securityManager.validateTransaction(user1, 50 ether, "DEPOSIT");
        securityManager.validateTransaction(user1, 40 ether, "DEPOSIT");
        
        // This should still pass as we're under daily limit
        securityManager.validateTransaction(user1, 30 ether, "DEPOSIT");
    }

    function testMultiSigOperations() public {
        vm.prank(operator);
        bytes32 proposalId = securityManager.proposeMultiSig("EMERGENCY_PAUSE", abi.encode("Test emergency"));
        
        // Check initial approval
        (uint256 approvals, bool executed) = securityManager.getMultiSigStatus(proposalId);
        assertEq(approvals, 1);
        assertFalse(executed);
        
        // Add second approval from different operator
        address operator2 = makeAddr("operator2");
        securityManager.grantRole(securityManager.OPERATOR_ROLE(), operator2);
        
        vm.prank(operator2);
        securityManager.approveMultiSig(proposalId);
        
        (approvals, executed) = securityManager.getMultiSigStatus(proposalId);
        assertEq(approvals, 2);
        assertFalse(executed);
    }

    function testEmergencyPause() public {
        vm.prank(emergencyRole);
        securityManager.activateEmergencyPause("Security breach detected");
        
        assertTrue(securityManager.paused());
        
        (bool isPaused, uint256 startTime, address pauser, bool isPermanent) = securityManager.getEmergencyPauseStatus();
        assertTrue(isPaused);
        assertEq(pauser, emergencyRole);
        assertFalse(isPermanent);
        assertGt(startTime, 0);
    }

    function testPermanentPause() public {
        securityManager.activatePermanentPause("Critical security issue");
        
        assertTrue(securityManager.paused());
        
        (bool isPaused, , , bool isPermanent) = securityManager.getEmergencyPauseStatus();
        assertTrue(isPaused);
        assertTrue(isPermanent);
    }

    function testUnauthorizedAccess() public {
        // Test unauthorized security config update
        vm.prank(user1);
        vm.expectRevert();
        securityManager.updateSecurityConfig("maxTransactionAmount", 200 ether);
        
        // Test unauthorized blacklisting
        vm.prank(user1);
        vm.expectRevert();
        securityManager.blacklistAddress(user2, "Unauthorized attempt");
        
        // Test unauthorized emergency pause
        vm.prank(user1);
        vm.expectRevert();
        securityManager.activateEmergencyPause("Unauthorized pause");
    }

    // ========== SECURITY MONITOR TESTS ==========
    
    function testSecurityMonitorDeployment() public {
        assertTrue(securityMonitor.hasRole(securityMonitor.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(securityMonitor.hasRole(securityMonitor.MONITOR_ROLE(), owner));
        
        SecurityMonitor.SecurityMetrics memory metrics = securityMonitor.getSecurityMetrics();
        assertEq(metrics.totalTransactions, 0);
        assertEq(metrics.threatAlertsGenerated, 0);
    }

    function testTransactionMonitoring() public {
        securityMonitor.monitorTransaction(user1, SMALL_AMOUNT, "DEPOSIT", abi.encode("test"));
        
        SecurityMonitor.SecurityMetrics memory metrics = securityMonitor.getSecurityMetrics();
        assertEq(metrics.totalTransactions, 1);
        
        SecurityMonitor.RiskProfile memory profile = securityMonitor.getUserRiskProfile(user1);
        assertEq(profile.transactionCount, 1);
        assertEq(profile.totalVolume, SMALL_AMOUNT);
    }

    function testThreatAlertCreation() public {
        vm.expectEmit(true, true, false, true);
        emit ThreatDetected(1, maliciousUser, "SUSPICIOUS_PATTERN", 7, block.timestamp);
        
        uint256 alertId = securityMonitor.createThreatAlert(
            maliciousUser,
            "SUSPICIOUS_PATTERN",
            7,
            "Multiple rapid transactions detected"
        );
        
        assertEq(alertId, 1);
        
        SecurityMonitor.ThreatAlert memory alert = securityMonitor.getThreatAlert(alertId);
        assertEq(alert.target, maliciousUser);
        assertEq(alert.severity, 7);
        assertFalse(alert.resolved);
    }

    function testThreatAlertResolution() public {
        uint256 alertId = securityMonitor.createThreatAlert(
            maliciousUser,
            "SUSPICIOUS_PATTERN",
            5,
            "Test alert"
        );
        
        vm.prank(auditor);
        securityMonitor.resolveThreatAlert(alertId, "False positive");
        
        SecurityMonitor.ThreatAlert memory alert = securityMonitor.getThreatAlert(alertId);
        assertTrue(alert.resolved);
        assertEq(alert.resolver, auditor);
    }

    function testRiskProfiling() public {
        // Grant monitor role to this contract for risk profiling
        securityMonitor.grantRole(securityMonitor.MONITOR_ROLE(), address(securityMonitor));
        
        // First blacklist the user to increase risk score significantly
        vm.prank(securityAdmin);
        securityManager.blacklistAddress(maliciousUser, "High risk user");
        
        // Simulate multiple large transactions to increase risk score
        securityMonitor.monitorTransaction(maliciousUser, 80 ether, "DEPOSIT", abi.encode("large"));
        securityMonitor.monitorTransaction(maliciousUser, 90 ether, "WITHDRAWAL", abi.encode("large"));
        securityMonitor.monitorTransaction(maliciousUser, 95 ether, "DEPOSIT", abi.encode("large"));
        
        SecurityMonitor.RiskProfile memory profile = securityMonitor.getUserRiskProfile(maliciousUser);
        assertGt(profile.riskScore, 50); // Should have elevated risk score due to blacklisting + large amounts
        assertEq(profile.transactionCount, 3);
    }

    function testHighRiskUserDetection() public {
        // First blacklist the user to increase risk score
        vm.prank(securityAdmin);
        securityManager.blacklistAddress(maliciousUser, "Test");
        
        // Monitor transaction to trigger risk calculation
        securityMonitor.monitorTransaction(maliciousUser, LARGE_AMOUNT, "DEPOSIT", abi.encode("test"));
        
        SecurityMonitor.RiskProfile memory profile = securityMonitor.getUserRiskProfile(maliciousUser);
        assertTrue(profile.isHighRisk);
        
        address[] memory highRiskUsers = securityMonitor.getHighRiskUsers();
        assertEq(highRiskUsers.length, 1);
        assertEq(highRiskUsers[0], maliciousUser);
    }

    function testPatternDetection() public {
        // Grant monitor role to this contract for pattern detection
        securityMonitor.grantRole(securityMonitor.MONITOR_ROLE(), address(securityMonitor));
        
        // Simulate rapid transactions to trigger pattern detection
        for (uint i = 0; i < 12; i++) {
            securityMonitor.monitorTransaction(maliciousUser, 1 ether, "DEPOSIT", abi.encode(i));
        }
        
        // Should have created threat alert for rapid transactions
        uint256[] memory userAlerts = securityMonitor.getUserThreatAlerts(maliciousUser);
        assertGt(userAlerts.length, 0);
    }

    function testMonitoringConfiguration() public {
        securityMonitor.updateMonitoringConfig(80, 9, false);
        
        // Test that monitoring is disabled
        securityMonitor.monitorTransaction(user1, SMALL_AMOUNT, "DEPOSIT", abi.encode("test"));
        
        SecurityMonitor.SecurityMetrics memory metrics = securityMonitor.getSecurityMetrics();
        // Should not increment if monitoring is disabled
        assertEq(metrics.totalTransactions, 0);
    }

    // ========== AUDIT TRAIL TESTS ==========
    
    function testAuditTrailDeployment() public {
        assertTrue(auditTrail.hasRole(auditTrail.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(auditTrail.hasRole(auditTrail.LOGGER_ROLE(), owner));
        
        (uint256 totalEntries, , , ) = auditTrail.getAuditStatistics();
        assertEq(totalEntries, 1); // Deployment entry
    }

    function testAuditEntryCreation() public {
        vm.expectEmit(true, true, false, true);
        emit AuditEntryCreated(2, user1, "DEPOSIT", "TRANSACTION", true, block.timestamp);
        
        uint256 entryId = auditTrail.createAuditEntry(
            user1,
            "DEPOSIT",
            "TRANSACTION",
            abi.encode(SMALL_AMOUNT),
            true,
            "User deposit successful"
        );
        
        assertEq(entryId, 2); // Second entry (first was deployment)
        
        AuditTrail.AuditEntry memory entry = auditTrail.getAuditEntry(entryId);
        assertEq(entry.actor, user1);
        assertEq(entry.action, "DEPOSIT");
        assertEq(entry.category, "TRANSACTION");
        assertTrue(entry.success);
    }

    function testBatchAuditEntries() public {
        address[] memory actors = new address[](3);
        string[] memory actions = new string[](3);
        string[] memory categories = new string[](3);
        bytes[] memory dataArray = new bytes[](3);
        bool[] memory successes = new bool[](3);
        string[] memory reasons = new string[](3);
        
        actors[0] = user1;
        actors[1] = user2;
        actors[2] = maliciousUser;
        
        actions[0] = "DEPOSIT";
        actions[1] = "WITHDRAWAL";
        actions[2] = "BLOCKED";
        
        categories[0] = "TRANSACTION";
        categories[1] = "TRANSACTION";
        categories[2] = "SECURITY";
        
        dataArray[0] = abi.encode(10 ether);
        dataArray[1] = abi.encode(5 ether);
        dataArray[2] = abi.encode("Blacklisted");
        
        successes[0] = true;
        successes[1] = true;
        successes[2] = false;
        
        reasons[0] = "Successful deposit";
        reasons[1] = "Successful withdrawal";
        reasons[2] = "Transaction blocked";
        
        uint256[] memory entryIds = auditTrail.createBatchAuditEntries(
            actors,
            actions,
            categories,
            dataArray,
            successes,
            reasons
        );
        
        assertEq(entryIds.length, 3);
        
        // Verify entries
        AuditTrail.AuditEntry memory entry1 = auditTrail.getAuditEntry(entryIds[0]);
        assertEq(entry1.actor, user1);
        assertTrue(entry1.success);
        
        AuditTrail.AuditEntry memory entry3 = auditTrail.getAuditEntry(entryIds[2]);
        assertEq(entry3.actor, maliciousUser);
        assertFalse(entry3.success);
    }

    function testAuditEntryQueries() public {
        // Create test entries
        auditTrail.createAuditEntry(user1, "DEPOSIT", "TRANSACTION", abi.encode(10 ether), true, "Test 1");
        auditTrail.createAuditEntry(user1, "WITHDRAWAL", "TRANSACTION", abi.encode(5 ether), true, "Test 2");
        auditTrail.createAuditEntry(user2, "DEPOSIT", "TRANSACTION", abi.encode(20 ether), true, "Test 3");
        
        // Test query by actor
        AuditTrail.AuditEntry[] memory userEntries = auditTrail.getEntriesByActor(user1, 10);
        assertEq(userEntries.length, 2);
        
        // Test query by action
        AuditTrail.AuditEntry[] memory depositEntries = auditTrail.getEntriesByAction("DEPOSIT", 10);
        assertEq(depositEntries.length, 2);
        
        // Test query by category
        AuditTrail.AuditEntry[] memory transactionEntries = auditTrail.getEntriesByCategory("TRANSACTION", 10);
        assertEq(transactionEntries.length, 3);
    }

    function testComplianceReporting() public {
        // Create test entries
        auditTrail.createAuditEntry(user1, "DEPOSIT", "TRANSACTION", abi.encode(10 ether), true, "Test 1");
        auditTrail.createAuditEntry(user2, "WITHDRAWAL", "TRANSACTION", abi.encode(5 ether), false, "Test 2");
        auditTrail.createAuditEntry(user1, "DEPOSIT", "TRANSACTION", abi.encode(15 ether), true, "Test 3");
        
        // Use a very wide time range to ensure all entries are included
        uint256 startTime = 1; // Start from timestamp 1
        uint256 endTime = block.timestamp + 365 days; // Far future end time
        
        AuditTrail.AuditFilter memory filter = AuditTrail.AuditFilter({
            startTime: 0,
            endTime: 0,
            actor: address(0),
            action: "",
            category: "",
            successOnly: false,
            failedOnly: false
        });
        
        vm.prank(auditor);
        uint256 reportId = auditTrail.generateComplianceReport(startTime, endTime, filter);
        
        AuditTrail.ComplianceReport memory report = auditTrail.getComplianceReport(reportId);
        assertGe(report.totalEntries, 1); // At least 1 entry (deployment entry)
        assertTrue(report.finalized);
    }

    function testAuditConfiguration() public {
        auditTrail.updateAuditConfig("maxEntriesPerDay", 5000);
        auditTrail.toggleHederaLogging(false);
        auditTrail.toggleAutoVerification(false);
        
        (uint256 totalEntries, uint256 verifiedEntries, , bool hederaEnabled) = auditTrail.getAuditStatistics();
        assertFalse(hederaEnabled);
        
        // Create entry and check it's not auto-verified
        uint256 entryId = auditTrail.createAuditEntry(user1, "TEST", "TEST", abi.encode("test"), true, "Test");
        AuditTrail.AuditEntry memory entry = auditTrail.getAuditEntry(entryId);
        assertFalse(entry.verified);
    }

    function testAuditStatistics() public {
        // Create various entries
        auditTrail.createAuditEntry(user1, "DEPOSIT", "TRANSACTION", abi.encode(10 ether), true, "Test");
        auditTrail.createAuditEntry(user1, "DEPOSIT", "TRANSACTION", abi.encode(20 ether), true, "Test");
        auditTrail.createAuditEntry(user2, "WITHDRAWAL", "TRANSACTION", abi.encode(5 ether), true, "Test");
        
        assertEq(auditTrail.getActionCount("DEPOSIT"), 2);
        assertEq(auditTrail.getCategoryCount("TRANSACTION"), 3);
        assertEq(auditTrail.getActorCount(user1), 2);
        assertEq(auditTrail.getActorCount(user2), 1);
    }

    // ========== INTEGRATION TESTS ==========
    
    function testSecurityIntegration() public {
        // Simulate a complete security scenario
        
        // 1. Monitor suspicious transaction
        securityMonitor.monitorTransaction(maliciousUser, LARGE_AMOUNT, "DEPOSIT", abi.encode("suspicious"));
        
        // 2. Create threat alert
        uint256 alertId = securityMonitor.createThreatAlert(
            maliciousUser,
            "LARGE_TRANSACTION",
            8,
            "Unusually large transaction from new user"
        );
        
        // 3. Log security action
        auditTrail.createAuditEntry(
            address(securityMonitor),
            "THREAT_DETECTED",
            "SECURITY",
            abi.encode(alertId, maliciousUser, "LARGE_TRANSACTION"),
            true,
            "Threat alert created for suspicious activity"
        );
        
        // 4. Blacklist user
        vm.prank(securityAdmin);
        securityManager.blacklistAddress(maliciousUser, "Threat detected");
        
        // 5. Log blacklisting action
        auditTrail.createAuditEntry(
            securityAdmin,
            "ADDRESS_BLACKLISTED",
            "SECURITY",
            abi.encode(maliciousUser, "Threat detected"),
            true,
            "User blacklisted due to security threat"
        );
        
        // 6. Verify final state
        assertTrue(securityManager.isBlacklisted(maliciousUser));
        
        SecurityMonitor.ThreatAlert memory alert = securityMonitor.getThreatAlert(alertId);
        assertEq(alert.target, maliciousUser);
        assertEq(alert.severity, 8);
        
        (uint256 totalEntries, , , ) = auditTrail.getAuditStatistics();
        assertGe(totalEntries, 3); // Should have at least 3 audit entries
    }

    function testEmergencyResponse() public {
        // Simulate emergency response scenario
        
        // 1. Detect critical threat
        uint256 alertId = securityMonitor.createThreatAlert(
            maliciousUser,
            "SYSTEM_COMPROMISE",
            10,
            "Potential system compromise detected"
        );
        
        // 2. Activate emergency pause
        vm.prank(emergencyRole);
        securityManager.activateEmergencyPause("Critical security threat detected");
        
        // 3. Log emergency action
        auditTrail.createAuditEntry(
            emergencyRole,
            "EMERGENCY_PAUSE_ACTIVATED",
            "EMERGENCY",
            abi.encode(alertId, "Critical security threat"),
            true,
            "Emergency pause activated due to critical threat"
        );
        
        // 4. Verify system is paused
        assertTrue(securityManager.paused());
        
        // 5. Generate compliance report with very wide time range
        vm.prank(auditor);
        AuditTrail.AuditFilter memory filter = AuditTrail.AuditFilter({
            startTime: 0,
            endTime: 0,
            actor: address(0),
            action: "",
            category: "EMERGENCY",
            successOnly: false,
            failedOnly: false
        });
        
        uint256 reportId = auditTrail.generateComplianceReport(
            1, // Start from timestamp 1
            block.timestamp + 365 days, // Far future end time
            filter
        );
        
        AuditTrail.ComplianceReport memory report = auditTrail.getComplianceReport(reportId);
        assertTrue(report.finalized); // Just verify the report was created
    }

    function testAccessControlIntegration() public {
        // Test that all security components respect access controls
        
        // Test SecurityManager access control
        vm.prank(user1);
        vm.expectRevert();
        securityManager.blacklistAddress(user2, "Unauthorized");
        
        // Test SecurityMonitor access control
        vm.prank(user1);
        vm.expectRevert();
        securityMonitor.createThreatAlert(user2, "TEST", 5, "Unauthorized");
        
        // Test AuditTrail access control
        vm.prank(user1);
        vm.expectRevert();
        auditTrail.createAuditEntry(user2, "TEST", "TEST", abi.encode("test"), true, "Unauthorized");
        
        // Verify authorized access works
        vm.prank(securityAdmin);
        securityManager.blacklistAddress(maliciousUser, "Authorized action");
        assertTrue(securityManager.isBlacklisted(maliciousUser));
    }

    receive() external payable {}
}