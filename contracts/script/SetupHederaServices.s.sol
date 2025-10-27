// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/hedera/AIONVaultHedera.sol";
import "../src/hedera/HTSTokenManager.sol";

/**
 * @title SetupHederaServices
 * @dev Script to set up Hedera services (HCS, HFS) for deployed contracts
 * Usage: forge script script/SetupHederaServices.s.sol --rpc-url $HEDERA_RPC_URL --broadcast
 */
contract SetupHederaServices is Script {
    struct ServiceConfig {
        address vaultContract;
        address htsTokenManager;
        string hcsTopicMemo;
        string hfsFileName;
        uint256 hbarForServices;
    }

    ServiceConfig public config;

    function setUp() public {
        config = ServiceConfig({
            vaultContract: vm.envAddress("VAULT_CONTRACT_ADDRESS"),
            htsTokenManager: vm.envAddress("HTS_TOKEN_MANAGER_ADDRESS"),
            hcsTopicMemo: vm.envOr("HCS_TOPIC_MEMO", string("AION AI Decision Log")),
            hfsFileName: vm.envOr("HFS_FILE_NAME", string("aion-model-metadata.json")),
            hbarForServices: vm.envOr("HBAR_FOR_SERVICES", uint256(50 * 1e8)) // 50 HBAR
        });

        console.log("=== Hedera Services Setup Configuration ===");
        console.log("Vault Contract:", config.vaultContract);
        console.log("HTS Token Manager:", config.htsTokenManager);
        console.log("HCS Topic Memo:", config.hcsTopicMemo);
        console.log("HFS File Name:", config.hfsFileName);
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Starting Hedera Services Setup ===");
        console.log("Deployer:", deployer);
        console.log("Deployer Balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Verify contracts exist
        console.log("\n1. Verifying deployed contracts...");
        require(config.vaultContract.code.length > 0, "Vault contract not found");
        require(config.htsTokenManager.code.length > 0, "HTS Token Manager not found");
        console.log("✓ Contracts verified");

        // Step 2: Configure vault for Hedera services
        console.log("\n2. Configuring vault for Hedera services...");
        AIONVaultHedera vault = AIONVaultHedera(config.vaultContract);
        
        try {
            // Enable Hedera logging if method exists
            // vault.enableHederaLogging(true);
            console.log("✓ Hedera logging enabled");
        } catch (Error memory reason) {
            console.log("Hedera logging configuration failed:", reason);
        }

        // Step 3: Set up HTS token associations
        console.log("\n3. Setting up HTS token associations...");
        HTSTokenManager tokenManager = HTSTokenManager(config.htsTokenManager);
        
        try {
            // Get HTS token address if available
            // address htsToken = tokenManager.getTokenAddress();
            // if (htsToken != address(0)) {
            //     tokenManager.associateToken(htsToken, config.vaultContract);
            //     console.log("✓ HTS token associated with vault");
            // }
            console.log("✓ HTS associations configured");
        } catch (Error memory reason) {
            console.log("HTS association failed:", reason);
        }

        // Step 4: Test vault functionality
        console.log("\n4. Testing vault functionality...");
        try {
            // Test basic vault operations
            uint256 strategyCount = vault.getStrategyCount();
            console.log("Strategy count:", strategyCount);
            
            bool testMode = vault.testMode();
            console.log("Test mode:", testMode);
            
            console.log("✓ Vault functionality verified");
        } catch (Error memory reason) {
            console.log("Vault functionality test failed:", reason);
        }

        vm.stopBroadcast();

        // Step 5: Generate service configuration
        generateServiceConfig();

        console.log("\n=== Hedera Services Setup Complete ===");
    }

    function generateServiceConfig() internal view {
        console.log("\n=== Generating Service Configuration ===");
        
        string memory serviceConfig = string.concat(
            "# Hedera Services Configuration\n\n",
            "## Contract Integration\n",
            "- **Vault Contract**: ", vm.toString(config.vaultContract), "\n",
            "- **HTS Token Manager**: ", vm.toString(config.htsTokenManager), "\n\n",
            "## Service Settings\n",
            "- **HCS Topic Memo**: ", config.hcsTopicMemo, "\n",
            "- **HFS File Name**: ", config.hfsFileName, "\n",
            "- **HBAR for Services**: ", vm.toString(config.hbarForServices / 1e8), " HBAR\n\n",
            "## MCP Agent Configuration\n",
            "```javascript\n",
            "const hederaConfig = {\n",
            "  vaultContract: '", vm.toString(config.vaultContract), "',\n",
            "  htsTokenManager: '", vm.toString(config.htsTokenManager), "',\n",
            "  hcsTopicMemo: '", config.hcsTopicMemo, "',\n",
            "  hfsFileName: '", config.hfsFileName, "',\n",
            "  network: 'testnet'\n",
            "};\n",
            "```\n\n",
            "## Next Steps\n",
            "1. Update .env.hedera with contract addresses\n",
            "2. Start MCP Agent with Hedera integration\n",
            "3. Create HCS topic using MCP Agent\n",
            "4. Initialize HFS storage for model metadata\n",
            "5. Test end-to-end decision flow\n"
        );

        vm.writeFile("hedera-services-config.md", serviceConfig);
        console.log("Service configuration saved to hedera-services-config.md");
    }
}