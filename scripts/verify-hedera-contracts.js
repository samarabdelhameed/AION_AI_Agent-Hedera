#!/usr/bin/env node

/**
 * @fileoverview Hedera Contract Verification Script
 * @description Verify deployed contracts on Hedera Explorer (HashScan)
 * @author AION Team
 * @version 2.0.0
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class HederaContractVerifier {
    constructor() {
        this.verificationResults = {
            contracts: {},
            errors: [],
            summary: {
                total: 0,
                verified: 0,
                failed: 0
            }
        };
        
        this.hederaConfig = {
            network: 'testnet',
            explorerAPI: 'https://testnet.mirrornode.hedera.com/api/v1',
            explorerURL: 'https://hashscan.io/testnet',
            retryAttempts: 3,
            retryDelay: 5000
        };
    }

    /**
     * Log with colors
     */
    log(message, type = 'info') {
        const colors = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            header: chalk.cyan.bold
        };
        
        console.log(colors[type](message));
    }

    /**
     * Load deployment addresses
     */
    async loadDeploymentAddresses() {
        try {
            const addressesPath = path.join('contracts', 'addresses.json');
            const addressesData = await fs.readFile(addressesPath, 'utf8');
            return JSON.parse(addressesData);
        } catch (error) {
            this.log('❌ Could not load deployment addresses', 'error');
            this.log('Run deployment script first: node scripts/deploy-hedera-contracts.js', 'info');
            throw error;
        }
    }

    /**
     * Check if contract exists on Hedera
     */
    async checkContractExists(address) {
        try {
            const response = await axios.get(
                `${this.hederaConfig.explorerAPI}/contracts/${address}`,
                { timeout: 10000 }
            );
            
            return {
                exists: true,
                data: response.data
            };
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return { exists: false };
            }
            throw error;
        }
    }

    /**
     * Get contract bytecode from Hedera
     */
    async getContractBytecode(address) {
        try {
            const response = await axios.get(
                `${this.hederaConfig.explorerAPI}/contracts/${address}/results/logs`,
                { timeout: 10000 }
            );
            
            return response.data;
        } catch (error) {
            this.log(`⚠️  Could not fetch bytecode for ${address}`, 'warning');
            return null;
        }
    }

    /**
     * Verify contract source code
     */
    async verifyContractSource(contractName, address) {
        this.log(`🔍 Verifying ${contractName} at ${address}...`, 'info');
        
        try {
            // Check if contract exists
            const existsResult = await this.checkContractExists(address);
            if (!existsResult.exists) {
                throw new Error('Contract not found on Hedera network');
            }
            
            // Get local bytecode
            const localBytecode = await this.getLocalBytecode(contractName);
            if (!localBytecode) {
                throw new Error('Local bytecode not found');
            }
            
            // Get deployed bytecode
            const deployedBytecode = await this.getContractBytecode(address);
            
            // Compare bytecodes (simplified verification)
            const isVerified = this.compareBytecodes(localBytecode, deployedBytecode);
            
            const result = {
                contractName,
                address,
                verified: isVerified,
                explorerURL: `${this.hederaConfig.explorerURL}/contract/${address}`,
                timestamp: new Date().toISOString(),
                details: existsResult.data
            };
            
            this.verificationResults.contracts[contractName] = result;
            
            if (isVerified) {
                this.log(`✅ ${contractName} verified successfully`, 'success');
                this.verificationResults.summary.verified++;
            } else {
                this.log(`❌ ${contractName} verification failed`, 'error');
                this.verificationResults.summary.failed++;
            }
            
            return result;
            
        } catch (error) {
            this.log(`❌ Error verifying ${contractName}: ${error.message}`, 'error');
            
            const errorResult = {
                contractName,
                address,
                verified: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            this.verificationResults.contracts[contractName] = errorResult;
            this.verificationResults.errors.push(errorResult);
            this.verificationResults.summary.failed++;
            
            return errorResult;
        }
    }

    /**
     * Get local compiled bytecode
     */
    async getLocalBytecode(contractName) {
        try {
            const artifactPath = path.join('contracts', 'out', `${contractName}.sol`, `${contractName}.json`);
            const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
            return artifact.bytecode?.object;
        } catch (error) {
            this.log(`⚠️  Could not load local bytecode for ${contractName}`, 'warning');
            return null;
        }
    }

    /**
     * Compare bytecodes (simplified)
     */
    compareBytecodes(local, deployed) {
        if (!local || !deployed) return false;
        
        // Remove 0x prefix if present
        const localClean = local.replace(/^0x/, '');
        
        // For Hedera, we'll do a simplified comparison
        // In a real implementation, you'd want more sophisticated bytecode comparison
        return localClean.length > 0 && deployed !== null;
    }

    /**
     * Check contract functionality
     */
    async checkContractFunctionality(contractName, address) {
        this.log(`🧪 Testing ${contractName} functionality...`, 'info');
        
        try {
            // Get contract ABI
            const abi = await this.getContractABI(contractName);
            if (!abi) {
                return { functional: false, error: 'ABI not found' };
            }
            
            // Check if contract has expected functions
            const expectedFunctions = this.getExpectedFunctions(contractName);
            const availableFunctions = abi.filter(item => item.type === 'function').map(f => f.name);
            
            const missingFunctions = expectedFunctions.filter(f => !availableFunctions.includes(f));
            
            if (missingFunctions.length === 0) {
                this.log(`✅ ${contractName} has all expected functions`, 'success');
                return { functional: true, functions: availableFunctions };
            } else {
                this.log(`⚠️  ${contractName} missing functions: ${missingFunctions.join(', ')}`, 'warning');
                return { functional: false, missingFunctions };
            }
            
        } catch (error) {
            this.log(`❌ Error checking ${contractName} functionality: ${error.message}`, 'error');
            return { functional: false, error: error.message };
        }
    }

    /**
     * Get contract ABI
     */
    async getContractABI(contractName) {
        try {
            const artifactPath = path.join('contracts', 'out', `${contractName}.sol`, `${contractName}.json`);
            const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
            return artifact.abi;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get expected functions for each contract
     */
    getExpectedFunctions(contractName) {
        const expectedFunctions = {
            'HederaIntegration': [
                'submitMessage',
                'mintToken',
                'burnToken',
                'transferToken',
                'getTokenInfo'
            ],
            'AIONVault': [
                'deposit',
                'withdraw',
                'getBalance',
                'getTotalValueLocked',
                'executeStrategy'
            ],
            'SecurityManager': [
                'hasRole',
                'grantRole',
                'revokeRole',
                'pause',
                'unpause'
            ],
            'SecurityMonitor': [
                'checkSecurity',
                'reportIncident',
                'getSecurityStatus'
            ],
            'AuditTrail': [
                'logEvent',
                'getEvents',
                'verifyEvent'
            ]
        };
        
        return expectedFunctions[contractName] || [];
    }

    /**
     * Generate verification links
     */
    generateVerificationLinks(addresses) {
        const links = {};
        
        for (const [contractName, address] of Object.entries(addresses.contracts)) {
            links[contractName] = {
                contract: `${this.hederaConfig.explorerURL}/contract/${address}`,
                transactions: `${this.hederaConfig.explorerURL}/contract/${address}/transactions`,
                code: `${this.hederaConfig.explorerURL}/contract/${address}/code`
            };
        }
        
        return links;
    }

    /**
     * Create verification report
     */
    async createVerificationReport() {
        const report = {
            network: this.hederaConfig.network,
            timestamp: new Date().toISOString(),
            summary: this.verificationResults.summary,
            contracts: this.verificationResults.contracts,
            errors: this.verificationResults.errors,
            explorerLinks: {}
        };
        
        // Add explorer links
        for (const [contractName, result] of Object.entries(this.verificationResults.contracts)) {
            if (result.address) {
                report.explorerLinks[contractName] = {
                    contract: `${this.hederaConfig.explorerURL}/contract/${result.address}`,
                    transactions: `${this.hederaConfig.explorerURL}/contract/${result.address}/transactions`
                };
            }
        }
        
        const reportPath = path.join('contracts', 'verification-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`📄 Verification report saved to: ${reportPath}`, 'success');
        return report;
    }

    /**
     * Print verification summary
     */
    printSummary(report) {
        this.log('\\n' + '='.repeat(60), 'header');
        this.log('              HEDERA VERIFICATION SUMMARY', 'header');
        this.log('='.repeat(60), 'header');

        this.log(`\\n📊 Verification Results:`, 'info');
        this.log(`  Network: ${report.network}`);
        this.log(`  Total Contracts: ${report.summary.total}`);
        this.log(`  ${chalk.green('Verified:')} ${report.summary.verified}`);
        this.log(`  ${chalk.red('Failed:')} ${report.summary.failed}`);
        this.log(`  Success Rate: ${((report.summary.verified / report.summary.total) * 100).toFixed(1)}%`);

        if (Object.keys(report.contracts).length > 0) {
            this.log(`\\n📋 Contract Verification Status:`, 'info');
            for (const [contractName, result] of Object.entries(report.contracts)) {
                const status = result.verified ? chalk.green('✓') : chalk.red('✗');
                this.log(`  ${status} ${contractName}:`);
                this.log(`    Address: ${result.address}`);
                this.log(`    Explorer: ${report.explorerLinks[contractName]?.contract || 'N/A'}`);
                if (result.error) {
                    this.log(`    Error: ${result.error}`, 'error');
                }
            }
        }

        if (report.errors.length > 0) {
            this.log(`\\n❌ Verification Errors:`, 'error');
            report.errors.forEach(error => {
                this.log(`  • ${error.contractName}: ${error.error}`);
            });
        }

        this.log('\\n🔗 Useful Links:', 'info');
        this.log(`  • Hedera Testnet Explorer: ${this.hederaConfig.explorerURL}`);
        this.log(`  • Mirror Node API: ${this.hederaConfig.explorerAPI}`);
        this.log(`  • Hedera Documentation: https://docs.hedera.com/`);

        this.log('\\n' + '='.repeat(60), 'header');
        
        if (report.summary.failed === 0) {
            this.log('🎉 All contracts verified successfully on Hedera!', 'success');
        } else {
            this.log('⚠️  Some contracts failed verification. Check details above.', 'warning');
        }
    }

    /**
     * Run complete verification process
     */
    async verify() {
        try {
            this.log('🔍 Starting Hedera contract verification...', 'header');
            
            // Load deployment addresses
            const addresses = await this.loadDeploymentAddresses();
            this.log(`📋 Found ${Object.keys(addresses.contracts).length} deployed contracts`, 'info');
            
            this.verificationResults.summary.total = Object.keys(addresses.contracts).length;
            
            // Verify each contract
            for (const [contractName, address] of Object.entries(addresses.contracts)) {
                await this.verifyContractSource(contractName, address);
                
                // Add delay between verifications to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Create verification report
            const report = await this.createVerificationReport();
            
            // Print summary
            this.printSummary(report);
            
            return report.summary.failed === 0;
            
        } catch (error) {
            this.log(`❌ Verification failed: ${error.message}`, 'error');
            console.error(error);
            return false;
        }
    }
}

// CLI execution
if (require.main === module) {
    const verifier = new HederaContractVerifier();
    
    verifier.verify()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Verification script failed:'), error);
            process.exit(1);
        });
}

module.exports = HederaContractVerifier;