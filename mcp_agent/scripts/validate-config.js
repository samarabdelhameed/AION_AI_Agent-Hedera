#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Validates environment configuration and service connectivity
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

// Load environment variables
dotenv.config({ path: '../.env.hedera' });

class ConfigValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.checks = [];
    }

    async validate() {
        console.log('🔍 Validating AION Hedera Integration Configuration...\n');
        
        this.validateEnvironmentFiles();
        this.validateHederaConfig();
        this.validateContractConfig();
        this.validateServiceConfig();
        await this.validateNetworkConnectivity();
        
        this.printResults();
        
        if (this.errors.length > 0) {
            process.exit(1);
        }
    }

    validateEnvironmentFiles() {
        console.log('📁 Checking environment files...');
        
        const requiredFiles = [
            '../.env.hedera',
            '../../contracts/.env.hedera'
        ];
        
        for (const file of requiredFiles) {
            const filePath = path.resolve(file);
            if (fs.existsSync(filePath)) {
                this.addCheck('✓', `Environment file exists: ${file}`);
            } else {
                this.addError(`Environment file missing: ${file}`);
            }
        }
        
        console.log('');
    }

    validateHederaConfig() {
        console.log('🔗 Validating Hedera configuration...');
        
        const required = [
            'HEDERA_NETWORK',
            'HEDERA_ACCOUNT_ID',
            'HEDERA_PRIVATE_KEY'
        ];
        
        for (const key of required) {
            if (process.env[key]) {
                this.addCheck('✓', `${key} is set`);
            } else {
                this.addError(`${key} is not set`);
            }
        }
        
        // Validate account ID format
        if (process.env.HEDERA_ACCOUNT_ID) {
            if (/^0\.0\.\d+$/.test(process.env.HEDERA_ACCOUNT_ID)) {
                this.addCheck('✓', 'HEDERA_ACCOUNT_ID format is valid');
            } else {
                this.addError('HEDERA_ACCOUNT_ID format is invalid (should be 0.0.xxxxx)');
            }
        }
        
        // Validate private key format
        if (process.env.HEDERA_PRIVATE_KEY) {
            if (/^0x[a-fA-F0-9]{64}$/.test(process.env.HEDERA_PRIVATE_KEY)) {
                this.addCheck('✓', 'HEDERA_PRIVATE_KEY format is valid');
            } else {
                this.addError('HEDERA_PRIVATE_KEY format is invalid (should be 0x followed by 64 hex characters)');
            }
        }
        
        // Validate network
        if (process.env.HEDERA_NETWORK) {
            if (['testnet', 'mainnet', 'previewnet'].includes(process.env.HEDERA_NETWORK)) {
                this.addCheck('✓', `HEDERA_NETWORK is valid: ${process.env.HEDERA_NETWORK}`);
            } else {
                this.addWarning(`HEDERA_NETWORK value may be invalid: ${process.env.HEDERA_NETWORK}`);
            }
        }
        
        console.log('');
    }

    validateContractConfig() {
        console.log('📜 Validating contract configuration...');
        
        const contractVars = [
            'VAULT_CONTRACT_ADDRESS',
            'HTS_TOKEN_MANAGER_ADDRESS',
            'SAFE_HEDERA_SERVICE_ADDRESS'
        ];
        
        let deployedContracts = 0;
        
        for (const key of contractVars) {
            if (process.env[key] && process.env[key] !== '') {
                if (/^0x[a-fA-F0-9]{40}$/.test(process.env[key])) {
                    this.addCheck('✓', `${key} is set and valid`);
                    deployedContracts++;
                } else {
                    this.addError(`${key} format is invalid (should be 0x followed by 40 hex characters)`);
                }
            } else {
                this.addWarning(`${key} is not set (contracts may not be deployed)`);
            }
        }
        
        if (deployedContracts === 0) {
            this.addWarning('No contracts appear to be deployed. Run deployment first.');
        } else if (deployedContracts < contractVars.length) {
            this.addWarning('Some contracts may not be deployed. Check deployment status.');
        }
        
        console.log('');
    }

    validateServiceConfig() {
        console.log('⚙️ Validating service configuration...');
        
        const serviceVars = [
            'HCS_TOPIC_ID',
            'HFS_FILE_ID'
        ];
        
        let configuredServices = 0;
        
        for (const key of serviceVars) {
            if (process.env[key] && process.env[key] !== '') {
                if (/^0\.0\.\d+$/.test(process.env[key])) {
                    this.addCheck('✓', `${key} is set and valid`);
                    configuredServices++;
                } else {
                    this.addError(`${key} format is invalid (should be 0.0.xxxxx)`);
                }
            } else {
                this.addWarning(`${key} is not set (services may not be initialized)`);
            }
        }
        
        if (configuredServices === 0) {
            this.addWarning('No Hedera services appear to be configured. Run service setup first.');
        }
        
        // Validate MCP Agent config
        const mcpVars = [
            'MCP_AGENT_PORT',
            'ENABLE_HEDERA_INTEGRATION'
        ];
        
        for (const key of mcpVars) {
            if (process.env[key]) {
                this.addCheck('✓', `${key} is set: ${process.env[key]}`);
            } else {
                this.addWarning(`${key} is not set (using default)`);
            }
        }
        
        console.log('');
    }

    async validateNetworkConnectivity() {
        console.log('🌐 Validating network connectivity...');
        
        // Test Hedera RPC
        if (process.env.HEDERA_RPC_URL) {
            try {
                const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL);
                const blockNumber = await provider.getBlockNumber();
                this.addCheck('✓', `Hedera RPC connectivity successful (block: ${blockNumber})`);
            } catch (error) {
                this.addError(`Hedera RPC connectivity failed: ${error.message}`);
            }
        } else {
            this.addWarning('HEDERA_RPC_URL not set, cannot test connectivity');
        }
        
        // Test BSC RPC (if configured)
        if (process.env.BSC_RPC_URL) {
            try {
                const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
                const blockNumber = await provider.getBlockNumber();
                this.addCheck('✓', `BSC RPC connectivity successful (block: ${blockNumber})`);
            } catch (error) {
                this.addWarning(`BSC RPC connectivity failed: ${error.message}`);
            }
        }
        
        console.log('');
    }

    addCheck(icon, message) {
        this.checks.push({ icon, message });
        console.log(`${icon} ${message}`);
    }

    addError(message) {
        this.errors.push(message);
        console.log(`❌ ${message}`);
    }

    addWarning(message) {
        this.warnings.push(message);
        console.log(`⚠️ ${message}`);
    }

    printResults() {
        console.log('📋 Validation Summary:');
        console.log('======================');
        console.log(`✅ Checks passed: ${this.checks.length}`);
        console.log(`⚠️ Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ Errors that must be fixed:');
            this.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ Warnings (recommended to fix):');
            this.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning}`);
            });
        }
        
        if (this.errors.length === 0) {
            console.log('\n🎉 Configuration validation passed!');
            console.log('\n🚀 Next steps:');
            
            if (this.warnings.some(w => w.includes('contracts may not be deployed'))) {
                console.log('1. Deploy contracts: cd contracts && make -f Makefile.hedera deploy-hedera');
            }
            
            if (this.warnings.some(w => w.includes('services may not be initialized'))) {
                console.log('2. Initialize services: npm run setup:hedera');
            }
            
            console.log('3. Start MCP Agent: npm start');
            console.log('4. Run integration tests: npm run test:hedera');
        } else {
            console.log('\n💡 Fix the errors above and run validation again.');
        }
    }
}

// Run validation
async function main() {
    const validator = new ConfigValidator();
    await validator.validate();
}

main().catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
});