// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/hedera/HTSTokenManager.sol";
import "../src/hedera/AIONVaultHedera.sol";
import "../lib/hedera/IHederaTokenService.sol";
import "../lib/hedera/HederaResponseCodes.sol";

/**
 * @title GasProfiler
 * @dev Comprehensive gas profiling and performance analysis for Hedera integration
 */
contract GasProfiler is Script {
    
    struct GasReport {
        string operation;
        uint256 gasUsed;
        uint256 gasPrice;
        uint256 totalCost;
        bool success;
        string notes;
    }
    
    struct PerformanceMetrics {
        uint256 totalOperations;
        uint256 totalGasUsed;
        uint256 averageGasPerOperation;
        uint256 minGas;
        uint256 maxGas;
        uint256 totalCostInHbar;
    }
    
    GasReport[] public gasReports;
    PerformanceMetrics public metrics;
    
    HTSTokenManager public tokenManager;
    AIONVaultHedera public vault;
    
    // Test configuration
    address public constant TEST_USER = address(0x1234567890123456789012345678901234567890);
    uint256 public constant GAS_PRICE = 1000000000; // 1 gwei equivalent
    uint256 public constant HBAR_TO_TINYBAR = 100000000; // 1 HBAR = 100M tinybars
    
    function run() external {
        vm.startBroadcast();
        
        console.log("=== HEDERA GAS PROFILING AND PERFORMANCE ANALYSIS ===");
        console.log("");
        
        // Initialize contracts
        initializeContracts();
        
        // Run gas profiling tests
        profileContractDeployment();
        profileTokenOperations();
        profileVaultOperations();
        profileBatchOperations();
        
        // Generate performance report
        generatePerformanceReport();
        
        vm.stopBroadcast();
    }
    
    /**
     * Initialize contracts for testing
     */
    function initializeContracts() internal {
        console.log("1. Initializing contracts for gas profiling...");
        
        uint256 gasBefore = gasleft();
        tokenManager = new HTSTokenManager(msg.sender);
        uint256 gasAfter = gasleft();
        
        recordGasUsage(
            "HTSTokenManager Deployment",
            gasBefore - gasAfter,
            true,
            "Contract deployment gas cost"
        );
        
        gasBefore = gasleft();
        vault = new AIONVaultHedera(msg.sender);
        gasAfter = gasleft();
        
        recordGasUsage(
            "AIONVaultHedera Deployment",
            gasBefore - gasAfter,
            true,
            "Vault contract deployment"
        );
        
        console.log("Contracts initialized successfully");
        console.log("");
    }
    
    /**
     * Profile contract deployment costs
     */
    function profileContractDeployment() internal {
        console.log("2. Profiling contract deployment costs...");
        
        // Profile multiple deployments to get average
        uint256 totalGas = 0;
        uint256 deployments = 3;
        
        for (uint256 i = 0; i < deployments; i++) {
            uint256 gasBefore = gasleft();
            HTSTokenManager tempManager = new HTSTokenManager(msg.sender);
            uint256 gasAfter = gasleft();
            
            uint256 gasUsed = gasBefore - gasAfter;
            totalGas += gasUsed;
            
            recordGasUsage(
                string(abi.encodePacked("HTSTokenManager Deployment #", vm.toString(i + 1))),
                gasUsed,
                true,
                "Repeated deployment for averaging"
            );
        }
        
        uint256 averageDeploymentGas = totalGas / deployments;
        recordGasUsage(
            "Average HTSTokenManager Deployment",
            averageDeploymentGas,
            true,
            "Average across multiple deployments"
        );
        
        console.log("Contract deployment profiling completed");
        console.log("");
    }
    
    /**
     * Profile HTS token operations
     */
    function profileTokenOperations() internal {
        console.log("3. Profiling HTS token operations...");
        
        // Mock HTS responses for gas measurement
        vm.mockCall(
            address(0x167), // HTS precompile
            abi.encodeWithSelector(IHederaTokenService.createFungibleToken.selector),
            abi.encode(HederaResponseCodes.SUCCESS, address(0x1001))
        );
        
        vm.mockCall(
            address(0x167),
            abi.encodeWithSelector(IHederaTokenService.mintToken.selector),
            abi.encode(HederaResponseCodes.SUCCESS, int64(1000000), new int64[](0))
        );
        
        vm.mockCall(
            address(0x167),
            abi.encodeWithSelector(IHederaTokenService.burnToken.selector),
            abi.encode(HederaResponseCodes.SUCCESS, int64(500000))
        );
        
        vm.mockCall(
            address(0x167),
            abi.encodeWithSelector(IHederaTokenService.associateToken.selector),
            abi.encode(HederaResponseCodes.SUCCESS)
        );
        
        // Profile token creation
        uint256 gasBefore = gasleft();
        tokenManager.createShareToken("AION Shares", "AION", 18, 0);
        uint256 gasAfter = gasleft();
        
        recordGasUsage(
            "HTS Token Creation",
            gasBefore - gasAfter,
            true,
            "Create fungible token with metadata"
        );
        
        // Profile token minting
        gasBefore = gasleft();
        tokenManager.mintShares(TEST_USER, 1000000);
        gasAfter = gasleft();
        
        recordGasUsage(
            "HTS Token Minting",
            gasBefore - gasAfter,
            true,
            "Mint 1M tokens to user"
        );
        
        // Profile token burning
        gasBefore = gasleft();
        tokenManager.burnShares(TEST_USER, 500000);
        gasAfter = gasleft();
        
        recordGasUsage(
            "HTS Token Burning",
            gasBefore - gasAfter,
            true,
            "Burn 500K tokens from user"
        );
        
        console.log("HTS token operations profiling completed");
        console.log("");
    }
    
    /**
     * Profile vault operations
     */
    function profileVaultOperations() internal {
        console.log("4. Profiling vault operations...");
        
        // Set AI agent (assuming there's a setter function or it's set in constructor)
        // For testing purposes, we'll skip the AI agent setup
        
        // Profile AI decision recording
        uint256 gasBefore = gasleft();
        vault.recordAIDecision(
            "rebalance",
            address(0x1234567890123456789012345678901234567890),
            address(0x0987654321098765432109876543210987654321),
            1000000,
            "Optimizing yield allocation",
            "hcs_msg_123",
            "hfs_file_456"
        );
        uint256 gasAfter = gasleft();
        
        recordGasUsage(
            "AI Decision Recording",
            gasBefore - gasAfter,
            true,
            "Record AI decision with metadata"
        );
        
        // Profile pause/unpause operations
        gasBefore = gasleft();
        vault.pause();
        gasAfter = gasleft();
        
        recordGasUsage(
            "Vault Pause",
            gasBefore - gasAfter,
            true,
            "Emergency pause operation"
        );
        
        gasBefore = gasleft();
        vault.unpause();
        gasAfter = gasleft();
        
        recordGasUsage(
            "Vault Unpause",
            gasBefore - gasAfter,
            true,
            "Resume operations"
        );
        
        console.log("Vault operations profiling completed");
        console.log("");
    }
    
    /**
     * Profile batch operations
     */
    function profileBatchOperations() internal {
        console.log("5. Profiling batch operations...");
        
        // Profile multiple mint operations
        uint256 gasBefore = gasleft();
        for (uint256 i = 0; i < 5; i++) {
            tokenManager.mintShares(address(uint160(0x1000 + i)), 100000);
        }
        uint256 gasAfter = gasleft();
        
        recordGasUsage(
            "Batch Minting (5 operations)",
            gasBefore - gasAfter,
            true,
            "5 sequential mint operations"
        );
        
        // Profile multiple AI decisions
        gasBefore = gasleft();
        for (uint256 i = 0; i < 3; i++) {
            vault.recordAIDecision(
                "rebalance",
                address(uint160(0x1000 + i)),
                address(uint160(0x2000 + i)),
                100000 * (i + 1),
                "Batch optimization",
                string(abi.encodePacked("hcs_batch_", vm.toString(i))),
                string(abi.encodePacked("hfs_batch_", vm.toString(i)))
            );
        }
        gasAfter = gasleft();
        
        recordGasUsage(
            "Batch AI Decisions (3 operations)",
            gasBefore - gasAfter,
            true,
            "3 sequential AI decision recordings"
        );
        
        console.log("Batch operations profiling completed");
        console.log("");
    }
    
    /**
     * Record gas usage for an operation
     */
    function recordGasUsage(
        string memory operation,
        uint256 gasUsed,
        bool success,
        string memory notes
    ) internal {
        uint256 totalCost = gasUsed * GAS_PRICE;
        
        gasReports.push(GasReport({
            operation: operation,
            gasUsed: gasUsed,
            gasPrice: GAS_PRICE,
            totalCost: totalCost,
            success: success,
            notes: notes
        }));
        
        console.log(string(abi.encodePacked(
            "  ", operation, ": ", vm.toString(gasUsed), " gas"
        )));
    }
    
    /**
     * Generate comprehensive performance report
     */
    function generatePerformanceReport() internal {
        console.log("6. Generating performance report...");
        
        calculateMetrics();
        displaySummary();
        generateComparisonReport();
        saveReportToFile();
        
        console.log("Performance analysis completed!");
    }
    
    /**
     * Calculate performance metrics
     */
    function calculateMetrics() internal {
        uint256 totalGas = 0;
        uint256 minGas = type(uint256).max;
        uint256 maxGas = 0;
        uint256 successfulOps = 0;
        
        for (uint256 i = 0; i < gasReports.length; i++) {
            GasReport memory report = gasReports[i];
            
            if (report.success) {
                totalGas += report.gasUsed;
                successfulOps++;
                
                if (report.gasUsed < minGas) {
                    minGas = report.gasUsed;
                }
                
                if (report.gasUsed > maxGas) {
                    maxGas = report.gasUsed;
                }
            }
        }
        
        metrics = PerformanceMetrics({
            totalOperations: successfulOps,
            totalGasUsed: totalGas,
            averageGasPerOperation: successfulOps > 0 ? totalGas / successfulOps : 0,
            minGas: minGas == type(uint256).max ? 0 : minGas,
            maxGas: maxGas,
            totalCostInHbar: (totalGas * GAS_PRICE) / HBAR_TO_TINYBAR
        });
    }
    
    /**
     * Display performance summary
     */
    function displaySummary() internal view {
        console.log("");
        console.log("=== PERFORMANCE SUMMARY ===");
        console.log(string(abi.encodePacked("Total Operations: ", vm.toString(metrics.totalOperations))));
        console.log(string(abi.encodePacked("Total Gas Used: ", vm.toString(metrics.totalGasUsed))));
        console.log(string(abi.encodePacked("Average Gas/Operation: ", vm.toString(metrics.averageGasPerOperation))));
        console.log(string(abi.encodePacked("Min Gas: ", vm.toString(metrics.minGas))));
        console.log(string(abi.encodePacked("Max Gas: ", vm.toString(metrics.maxGas))));
        console.log(string(abi.encodePacked("Total Cost (HBAR): ", vm.toString(metrics.totalCostInHbar))));
        console.log("");
    }
    
    /**
     * Generate comparison report between HSCS and BSC
     */
    function generateComparisonReport() internal view {
        console.log("=== HEDERA vs BSC COMPARISON ===");
        
        // Estimated BSC gas costs for comparison
        uint256 bscTokenCreation = 2000000; // ~2M gas on BSC
        uint256 bscTokenMint = 100000;      // ~100K gas on BSC
        uint256 bscTokenBurn = 80000;       // ~80K gas on BSC
        
        // Find corresponding Hedera operations
        uint256 hederaTokenCreation = 0;
        uint256 hederaTokenMint = 0;
        uint256 hederaTokenBurn = 0;
        
        for (uint256 i = 0; i < gasReports.length; i++) {
            GasReport memory report = gasReports[i];
            
            if (keccak256(bytes(report.operation)) == keccak256(bytes("HTS Token Creation"))) {
                hederaTokenCreation = report.gasUsed;
            } else if (keccak256(bytes(report.operation)) == keccak256(bytes("HTS Token Minting"))) {
                hederaTokenMint = report.gasUsed;
            } else if (keccak256(bytes(report.operation)) == keccak256(bytes("HTS Token Burning"))) {
                hederaTokenBurn = report.gasUsed;
            }
        }
        
        console.log("Operation Comparison (Gas Usage):");
        console.log(string(abi.encodePacked(
            "Token Creation - Hedera: ", vm.toString(hederaTokenCreation),
            " | BSC: ", vm.toString(bscTokenCreation),
            " | Savings: ", vm.toString(bscTokenCreation > hederaTokenCreation ? bscTokenCreation - hederaTokenCreation : 0)
        )));
        
        console.log(string(abi.encodePacked(
            "Token Minting - Hedera: ", vm.toString(hederaTokenMint),
            " | BSC: ", vm.toString(bscTokenMint),
            " | Savings: ", vm.toString(bscTokenMint > hederaTokenMint ? bscTokenMint - hederaTokenMint : 0)
        )));
        
        console.log(string(abi.encodePacked(
            "Token Burning - Hedera: ", vm.toString(hederaTokenBurn),
            " | BSC: ", vm.toString(bscTokenBurn),
            " | Savings: ", vm.toString(bscTokenBurn > hederaTokenBurn ? bscTokenBurn - hederaTokenBurn : 0)
        )));
        
        console.log("");
    }
    
    /**
     * Save detailed report to file
     */
    function saveReportToFile() internal {
        string memory report = generateDetailedReport();
        
        // Write to file (in actual deployment, this would save to filesystem)
        console.log("Detailed report generated (would be saved to gas-analysis-report.md)");
        console.log("Report preview:");
        console.log(report);
    }
    
    /**
     * Generate detailed markdown report
     */
    function generateDetailedReport() internal view returns (string memory) {
        string memory report = "# Hedera Gas Analysis Report\n\n";
        report = string(abi.encodePacked(report, "## Summary\n"));
        report = string(abi.encodePacked(report, "- Total Operations: ", vm.toString(metrics.totalOperations), "\n"));
        report = string(abi.encodePacked(report, "- Total Gas Used: ", vm.toString(metrics.totalGasUsed), "\n"));
        report = string(abi.encodePacked(report, "- Average Gas: ", vm.toString(metrics.averageGasPerOperation), "\n"));
        report = string(abi.encodePacked(report, "- Cost in HBAR: ", vm.toString(metrics.totalCostInHbar), "\n\n"));
        
        report = string(abi.encodePacked(report, "## Detailed Operations\n"));
        
        for (uint256 i = 0; i < gasReports.length; i++) {
            GasReport memory gasReport = gasReports[i];
            report = string(abi.encodePacked(
                report,
                "- ", gasReport.operation, ": ", vm.toString(gasReport.gasUsed), " gas\n"
            ));
        }
        
        return report;
    }
    
    /**
     * Get gas report by index
     */
    function getGasReport(uint256 index) external view returns (GasReport memory) {
        require(index < gasReports.length, "Index out of bounds");
        return gasReports[index];
    }
    
    /**
     * Get total number of reports
     */
    function getReportCount() external view returns (uint256) {
        return gasReports.length;
    }
}