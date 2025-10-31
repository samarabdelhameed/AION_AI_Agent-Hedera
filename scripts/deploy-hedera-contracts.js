#!/usr/bin/env node

/**
 * @fileoverview Hedera Smart Contract Deployment Script
 * @description Deploy AION smart contracts to Hedera Testnet with verification
 * @author AION Team
 * @version 2.0.0
 */

const { spawn, execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class HederaContractDeployer {
    constructor() {
        this.deploymentResults = {
            contracts: {},
            transactions: [],
            verification: {},
            errors: []
        };
        
        this.contractOrder = [
            'HederaIntegration',
            'AIONVault',
            'SecurityManager',
            'SecurityMonitor',
            'AuditTrail'
        ];
        
        this.hederaConfig = {
            network: 'testnet',
            operatorId: process.env.HEDERA_OPERATOR_ID || '0.0.4696947',
            operatorKey: process.env.HEDERA_OPERATOR_PRIVATE_KEY,
            gasLimit: 3000000,
            maxFee: 100 // HBAR
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
     * Check prerequisites
     */
    async checkPrerequisites() {
        this.log('🔍 Checking deployment prerequisites...', 'header');
        
        const checks = [];
        
        // Check Foundry installation
        try {
            execSync('forge --version', { stdio: 'pipe' });
            this.log('✅ Foundry is installed', 'success');
            checks.push(true);
        } catch (error) {
            this.log('❌ Foundry is not installed', 'error');
            this.log('Install from: https://getfoundry.sh/', 'info');
            checks.push(false);
        }

        // Check Hedera environment variables
        if (this.hederaConfig.operatorKey) {
            this.log('✅ Hedera operator key configured', 'success');
            checks.push(true);
        } else {
            this.log('❌ HEDERA_OPERATOR_PRIVATE_KEY not set', 'error');
            checks.push(false);
        }

        // Check contract files exist
        const contractsDir = path.join('contracts', 'src');
        try {
            await fs.access(contractsDir);
            this.log('✅ Contracts directory found', 'success');
            checks.push(true);
        } catch (error) {
            this.log('❌ Contracts directory not found', 'error');
            checks.push(false);
        }

        // Check foundry.toml
        try {
            await fs.access('foundry.toml');
            this.log('✅ Foundry configuration found', 'success');
            checks.push(true);
        } catch (error) {
            this.log('⚠️  Foundry configuration not found, using defaults', 'warning');
            await this.createFoundryConfig();
            checks.push(true);
        }

        return checks.every(check => check);
    }

    /**
     * Create Foundry configuration for Hedera
     */
    async createFoundryConfig() {
        const foundryConfig = `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200
via_ir = true

[profile.hedera]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 1000
via_ir = true
gas_limit = 3000000

[rpc_endpoints]
hedera_testnet = "https://testnet.hashio.io/api"
hedera_mainnet = "https://mainnet.hashio.io/api"

[etherscan]
hedera_testnet = { key = "\\${HEDERA_API_KEY}", url = "https://hashscan.io/testnet/" }
`;

        await fs.writeFile('foundry.toml', foundryConfig);
        this.log('📝 Created Foundry configuration for Hedera', 'info');
    }

    /**
     * Compile contracts
     */
    async compileContracts() {
        this.log('🔨 Compiling smart contracts...', 'header');
        
        return new Promise((resolve, reject) => {
            const process = spawn('forge', ['build', '--profile', 'hedera'], {
                cwd: '.',
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log(data.toString().trim());
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    this.log('✅ Contracts compiled successfully', 'success');
                    resolve({ success: true, stdout, stderr });
                } else {
                    this.log('❌ Contract compilation failed', 'error');
                    if (stderr) console.log(chalk.red(stderr));
                    reject(new Error(`Compilation failed with code ${code}`));
                }
            });
        });
    }

    /**
     * Deploy a single contract
     */
    async deployContract(contractName, constructorArgs = []) {
        this.log(`🚀 Deploying ${contractName}...`, 'info');
        
        const deployArgs = [
            'create',
            `src/${contractName}.sol:${contractName}`,
            '--rpc-url', 'https://testnet.hashio.io/api',
            '--private-key', this.hederaConfig.operatorKey,
            '--gas-limit', this.hederaConfig.gasLimit.toString(),
            '--legacy' // Use legacy transactions for Hedera compatibility
        ];

        if (constructorArgs.length > 0) {
            deployArgs.push('--constructor-args', ...constructorArgs);
        }

        return new Promise((resolve, reject) => {
            const process = spawn('forge', deployArgs, {
                cwd: '.',
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    // Parse deployment result
                    const addressMatch = stdout.match(/Deployed to: (0x[a-fA-F0-9]{40})/);
                    const txHashMatch = stdout.match(/Transaction hash: (0x[a-fA-F0-9]{64})/);
                    
                    if (addressMatch && txHashMatch) {
                        const result = {
                            contractName,
                            address: addressMatch[1],
                            transactionHash: txHashMatch[1],
                            deployedAt: new Date().toISOString(),
                            network: 'hedera-testnet'
                        };
                        
                        this.deploymentResults.contracts[contractName] = result;
                        this.deploymentResults.transactions.push(result);
                        
                        this.log(`✅ ${contractName} deployed to: ${result.address}`, 'success');
                        this.log(`📝 Transaction: ${result.transactionHash}`, 'info');
                        
                        resolve(result);
                    } else {
                        reject(new Error('Could not parse deployment result'));
                    }
                } else {
                    this.log(`❌ Failed to deploy ${contractName}`, 'error');
                    if (stderr) console.log(chalk.red(stderr));
                    reject(new Error(`Deployment failed with code ${code}: ${stderr}`));
                }
            });
        });
    }

    /**
     * Deploy all contracts in order
     */
    async deployAllContracts() {
        this.log('🚀 Starting contract deployment to Hedera Testnet...', 'header');
        
        const deploymentPlan = {
            'HederaIntegration': [],
            'AIONVault': [], // Will be updated with HederaIntegration address
            'SecurityManager': [],
            'SecurityMonitor': [],
            'AuditTrail': []
        };

        for (const contractName of this.contractOrder) {
            try {
                let constructorArgs = deploymentPlan[contractName];
                
                // Update constructor args based on previous deployments
                if (contractName === 'AIONVault' && this.deploymentResults.contracts['HederaIntegration']) {
                    constructorArgs = [this.deploymentResults.contracts['HederaIntegration'].address];
                }
                
                const result = await this.deployContract(contractName, constructorArgs);
                
                // Wait a bit between deployments to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                this.log(`❌ Failed to deploy ${contractName}: ${error.message}`, 'error');
                this.deploymentResults.errors.push({
                    contract: contractName,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                
                // Continue with other contracts
                continue;
            }
        }
    }

    /**
     * Verify contracts on Hedera explorer
     */
    async verifyContracts() {
        this.log('🔍 Verifying contracts on Hedera explorer...', 'header');
        
        for (const [contractName, deployment] of Object.entries(this.deploymentResults.contracts)) {
            try {
                this.log(`🔍 Verifying ${contractName}...`, 'info');
                
                const verifyArgs = [
                    'verify-contract',
                    deployment.address,
                    `src/${contractName}.sol:${contractName}`,
                    '--chain', 'hedera-testnet',
                    '--etherscan-api-key', process.env.HEDERA_API_KEY || 'dummy'
                ];

                const result = await new Promise((resolve, reject) => {
                    const process = spawn('forge', verifyArgs, {
                        cwd: '.',
                        stdio: 'pipe'
                    });

                    let stdout = '';
                    let stderr = '';

                    process.stdout.on('data', (data) => {
                        stdout += data.toString();
                    });

                    process.stderr.on('data', (data) => {
                        stderr += data.toString();
                    });

                    process.on('close', (code) => {
                        resolve({ code, stdout, stderr });
                    });
                });

                if (result.code === 0) {
                    this.log(`✅ ${contractName} verified successfully`, 'success');
                    this.deploymentResults.verification[contractName] = {
                        status: 'verified',
                        timestamp: new Date().toISOString()
                    };
                } else {
                    this.log(`⚠️  ${contractName} verification failed (may already be verified)`, 'warning');
                    this.deploymentResults.verification[contractName] = {
                        status: 'failed',
                        error: result.stderr,
                        timestamp: new Date().toISOString()
                    };
                }
                
            } catch (error) {
                this.log(`❌ Error verifying ${contractName}: ${error.message}`, 'error');
                this.deploymentResults.verification[contractName] = {
                    status: 'error',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        }
    }

    /**
     * Generate deployment report
     */
    async generateDeploymentReport() {
        this.log('📊 Generating deployment report...', 'header');
        
        const report = {
            deployment: {
                network: 'hedera-testnet',
                timestamp: new Date().toISOString(),
                deployer: this.hederaConfig.operatorId,
                totalContracts: Object.keys(this.deploymentResults.contracts).length,
                successfulDeployments: Object.keys(this.deploymentResults.contracts).length,
                failedDeployments: this.deploymentResults.errors.length
            },
            contracts: this.deploymentResults.contracts,
            transactions: this.deploymentResults.transactions,
            verification: this.deploymentResults.verification,
            errors: this.deploymentResults.errors,
            explorerLinks: {}
        };

        // Generate explorer links
        for (const [contractName, deployment] of Object.entries(this.deploymentResults.contracts)) {
            report.explorerLinks[contractName] = {
                contract: `https://hashscan.io/testnet/contract/${deployment.address}`,
                transaction: `https://hashscan.io/testnet/transaction/${deployment.transactionHash}`
            };
        }

        // Save report
        const reportPath = path.join('contracts', 'deployment-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`📄 Deployment report saved to: ${reportPath}`, 'success');
        
        return report;
    }

    /**
     * Update environment configuration
     */
    async updateEnvironmentConfig() {
        this.log('🔧 Updating environment configuration...', 'info');
        
        const envUpdates = [];
        
        for (const [contractName, deployment] of Object.entries(this.deploymentResults.contracts)) {
            const envVarName = `HEDERA_${contractName.toUpperCase()}_ADDRESS`;
            envUpdates.push(`${envVarName}=${deployment.address}`);
        }
        
        // Update .env.example
        try {
            let envExample = await fs.readFile('.env.example', 'utf8');
            
            for (const update of envUpdates) {
                const [key, value] = update.split('=');
                const regex = new RegExp(`^${key}=.*$`, 'm');
                
                if (regex.test(envExample)) {
                    envExample = envExample.replace(regex, update);
                } else {
                    envExample += `\\n${update}`;
                }
            }
            
            await fs.writeFile('.env.example', envExample);
            this.log('✅ Updated .env.example with contract addresses', 'success');
            
        } catch (error) {
            this.log('⚠️  Could not update .env.example', 'warning');
        }
        
        // Create deployment addresses file
        const addressesFile = {
            network: 'hedera-testnet',
            chainId: 296, // Hedera testnet chain ID
            contracts: {}
        };
        
        for (const [contractName, deployment] of Object.entries(this.deploymentResults.contracts)) {
            addressesFile.contracts[contractName] = deployment.address;
        }
        
        await fs.writeFile(
            path.join('contracts', 'addresses.json'),
            JSON.stringify(addressesFile, null, 2)
        );
        
        this.log('✅ Created contracts/addresses.json', 'success');
    }

    /**
     * Print deployment summary
     */
    printSummary(report) {
        this.log('\\n' + '='.repeat(60), 'header');
        this.log('              HEDERA DEPLOYMENT SUMMARY', 'header');
        this.log('='.repeat(60), 'header');

        this.log(`\\n📈 Deployment Results:`, 'info');
        this.log(`  Network: ${report.deployment.network}`);
        this.log(`  Total Contracts: ${report.deployment.totalContracts}`);
        this.log(`  ${chalk.green('Successful:')} ${report.deployment.successfulDeployments}`);
        this.log(`  ${chalk.red('Failed:')} ${report.deployment.failedDeployments}`);

        if (Object.keys(report.contracts).length > 0) {
            this.log(`\\n📋 Deployed Contracts:`, 'info');
            for (const [contractName, deployment] of Object.entries(report.contracts)) {
                this.log(`  ${chalk.green('✓')} ${contractName}:`);
                this.log(`    Address: ${deployment.address}`);
                this.log(`    Explorer: ${report.explorerLinks[contractName].contract}`);
            }
        }

        if (Object.keys(report.verification).length > 0) {
            this.log(`\\n🔍 Verification Status:`, 'info');
            for (const [contractName, verification] of Object.entries(report.verification)) {
                const status = verification.status === 'verified' ? chalk.green('✓') : chalk.yellow('⚠');
                this.log(`  ${status} ${contractName}: ${verification.status}`);
            }
        }

        if (report.errors.length > 0) {
            this.log(`\\n❌ Deployment Errors:`, 'error');
            report.errors.forEach(error => {
                this.log(`  • ${error.contract}: ${error.error}`);
            });
        }

        this.log('\\n' + '='.repeat(60), 'header');
        
        if (report.deployment.failedDeployments === 0) {
            this.log('🎉 All contracts deployed successfully to Hedera Testnet!', 'success');
        } else {
            this.log('⚠️  Some contracts failed to deploy. Check errors above.', 'warning');
        }
    }

    /**
     * Run complete deployment process
     */
    async deploy() {
        try {
            // Check prerequisites
            const prereqsOk = await this.checkPrerequisites();
            if (!prereqsOk) {
                this.log('❌ Prerequisites not met. Please fix the issues above.', 'error');
                process.exit(1);
            }

            // Compile contracts
            await this.compileContracts();

            // Deploy contracts
            await this.deployAllContracts();

            // Verify contracts (optional, may fail)
            await this.verifyContracts();

            // Update configuration
            await this.updateEnvironmentConfig();

            // Generate report
            const report = await this.generateDeploymentReport();

            // Print summary
            this.printSummary(report);

            return report.deployment.failedDeployments === 0;

        } catch (error) {
            this.log(`❌ Deployment failed: ${error.message}`, 'error');
            console.error(error);
            return false;
        }
    }
}

// CLI execution
if (require.main === module) {
    const deployer = new HederaContractDeployer();
    
    deployer.deploy()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Deployment script failed:'), error);
            process.exit(1);
        });
}

module.exports = HederaContractDeployer;