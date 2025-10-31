#!/usr/bin/env node

/**
 * @fileoverview Complete Hedera Deployment Pipeline
 * @description End-to-end deployment pipeline for AION smart contracts on Hedera
 * @author AION Team
 * @version 2.0.0
 */

const chalk = require('chalk');
const ContractOptimizer = require('./optimize-contracts');
const HederaContractDeployer = require('./deploy-hedera-contracts');
const HederaContractVerifier = require('./verify-hedera-contracts');

class CompleteHederaDeployment {
    constructor() {
        this.deploymentPipeline = {
            optimization: { status: 'pending', duration: 0 },
            deployment: { status: 'pending', duration: 0 },
            verification: { status: 'pending', duration: 0 }
        };
        
        this.startTime = Date.now();
    }

    /**
     * Log with colors and timestamps
     */
    log(message, type = 'info') {
        const colors = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            header: chalk.cyan.bold
        };
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${colors[type](message)}`);
    }

    /**
     * Update pipeline status
     */
    updatePipelineStatus(stage, status, duration = 0) {
        this.deploymentPipeline[stage] = { status, duration };
        
        const statusIcon = {
            pending: '⏳',
            running: '🔄',
            success: '✅',
            failed: '❌'
        };
        
        this.log(`${statusIcon[status]} ${stage.toUpperCase()}: ${status}${duration ? ` (${duration}ms)` : ''}`, 
                 status === 'success' ? 'success' : status === 'failed' ? 'error' : 'info');
    }

    /**
     * Run optimization phase
     */
    async runOptimization() {
        this.log('🔧 Starting contract optimization phase...', 'header');
        this.updatePipelineStatus('optimization', 'running');
        
        const startTime = Date.now();
        
        try {
            const optimizer = new ContractOptimizer();
            const success = await optimizer.optimize();
            
            const duration = Date.now() - startTime;
            
            if (success) {
                this.updatePipelineStatus('optimization', 'success', duration);
                return true;
            } else {
                this.updatePipelineStatus('optimization', 'failed', duration);
                this.log('⚠️  Optimization completed with warnings. Proceeding with deployment...', 'warning');
                return true; // Continue even with warnings
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.updatePipelineStatus('optimization', 'failed', duration);
            this.log(`❌ Optimization failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Run deployment phase
     */
    async runDeployment() {
        this.log('🚀 Starting contract deployment phase...', 'header');
        this.updatePipelineStatus('deployment', 'running');
        
        const startTime = Date.now();
        
        try {
            const deployer = new HederaContractDeployer();
            const success = await deployer.deploy();
            
            const duration = Date.now() - startTime;
            
            if (success) {
                this.updatePipelineStatus('deployment', 'success', duration);
                return true;
            } else {
                this.updatePipelineStatus('deployment', 'failed', duration);
                return false;
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.updatePipelineStatus('deployment', 'failed', duration);
            this.log(`❌ Deployment failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Run verification phase
     */
    async runVerification() {
        this.log('🔍 Starting contract verification phase...', 'header');
        this.updatePipelineStatus('verification', 'running');
        
        const startTime = Date.now();
        
        try {
            // Wait a bit for contracts to be indexed
            this.log('⏳ Waiting for contracts to be indexed on Hedera...', 'info');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            const verifier = new HederaContractVerifier();
            const success = await verifier.verify();
            
            const duration = Date.now() - startTime;
            
            if (success) {
                this.updatePipelineStatus('verification', 'success', duration);
                return true;
            } else {
                this.updatePipelineStatus('verification', 'failed', duration);
                this.log('⚠️  Verification completed with some failures', 'warning');
                return true; // Don't fail the entire pipeline for verification issues
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.updatePipelineStatus('verification', 'failed', duration);
            this.log(`❌ Verification failed: ${error.message}`, 'error');
            return true; // Don't fail the entire pipeline for verification issues
        }
    }

    /**
     * Print pipeline summary
     */
    printPipelineSummary() {
        const totalDuration = Date.now() - this.startTime;
        
        this.log('\\n' + '='.repeat(70), 'header');
        this.log('                    HEDERA DEPLOYMENT PIPELINE SUMMARY', 'header');
        this.log('='.repeat(70), 'header');

        this.log(`\\n⏱️  Total Pipeline Duration: ${(totalDuration / 1000).toFixed(2)} seconds`, 'info');

        this.log(`\\n📊 Pipeline Stages:`, 'info');
        
        Object.entries(this.deploymentPipeline).forEach(([stage, data]) => {
            const statusIcon = {
                pending: '⏳',
                running: '🔄',
                success: '✅',
                failed: '❌'
            };
            
            const statusColor = data.status === 'success' ? 'success' : 
                              data.status === 'failed' ? 'error' : 'info';
            
            this.log(`  ${statusIcon[data.status]} ${stage.toUpperCase()}: ${data.status} ${data.duration ? `(${(data.duration / 1000).toFixed(2)}s)` : ''}`, statusColor);
        });

        const successfulStages = Object.values(this.deploymentPipeline).filter(s => s.status === 'success').length;
        const totalStages = Object.keys(this.deploymentPipeline).length;
        
        this.log(`\\n📈 Success Rate: ${successfulStages}/${totalStages} stages (${((successfulStages / totalStages) * 100).toFixed(1)}%)`, 'info');

        // Deployment status
        const deploymentSuccessful = this.deploymentPipeline.deployment.status === 'success';
        
        if (deploymentSuccessful) {
            this.log('\\n🎉 Deployment Pipeline Completed Successfully!', 'success');
            this.log('\\n📋 Next Steps:', 'info');
            this.log('  • Check contracts on HashScan: https://hashscan.io/testnet', 'info');
            this.log('  • Update frontend configuration with new contract addresses', 'info');
            this.log('  • Run integration tests with deployed contracts', 'info');
            this.log('  • Monitor contract performance and gas usage', 'info');
        } else {
            this.log('\\n❌ Deployment Pipeline Failed', 'error');
            this.log('\\n🔧 Troubleshooting:', 'warning');
            this.log('  • Check Hedera testnet status', 'info');
            this.log('  • Verify operator account has sufficient HBAR', 'info');
            this.log('  • Review contract compilation errors', 'info');
            this.log('  • Check network connectivity', 'info');
        }

        this.log('\\n📄 Reports Generated:', 'info');
        this.log('  • contracts/optimization-report.json', 'info');
        this.log('  • contracts/deployment-report.json', 'info');
        this.log('  • contracts/verification-report.json', 'info');
        this.log('  • contracts/addresses.json', 'info');

        this.log('\\n' + '='.repeat(70), 'header');
    }

    /**
     * Check prerequisites for deployment
     */
    async checkPrerequisites() {
        this.log('🔍 Checking deployment prerequisites...', 'header');
        
        const checks = [];
        
        // Check environment variables
        const requiredEnvVars = [
            'HEDERA_OPERATOR_ID',
            'HEDERA_OPERATOR_PRIVATE_KEY'
        ];
        
        for (const envVar of requiredEnvVars) {
            if (process.env[envVar]) {
                this.log(`✅ ${envVar} is set`, 'success');
                checks.push(true);
            } else {
                this.log(`❌ ${envVar} is not set`, 'error');
                checks.push(false);
            }
        }
        
        // Check if we're on testnet
        if (process.env.HEDERA_NETWORK === 'mainnet') {
            this.log('⚠️  WARNING: Deploying to MAINNET! This will cost real HBAR.', 'warning');
            this.log('Set HEDERA_NETWORK=testnet for testnet deployment', 'info');
        } else {
            this.log('✅ Deploying to testnet', 'success');
        }
        
        return checks.every(check => check);
    }

    /**
     * Run complete deployment pipeline
     */
    async runPipeline() {
        try {
            this.log('🚀 Starting Complete Hedera Deployment Pipeline...', 'header');
            this.log(`📅 Started at: ${new Date().toISOString()}`, 'info');
            
            // Check prerequisites
            const prereqsOk = await this.checkPrerequisites();
            if (!prereqsOk) {
                this.log('❌ Prerequisites not met. Please fix the issues above.', 'error');
                return false;
            }
            
            // Phase 1: Optimization
            const optimizationSuccess = await this.runOptimization();
            if (!optimizationSuccess) {
                this.log('❌ Pipeline failed at optimization stage', 'error');
                return false;
            }
            
            // Phase 2: Deployment
            const deploymentSuccess = await this.runDeployment();
            if (!deploymentSuccess) {
                this.log('❌ Pipeline failed at deployment stage', 'error');
                return false;
            }
            
            // Phase 3: Verification (optional, doesn't fail pipeline)
            await this.runVerification();
            
            // Print summary
            this.printPipelineSummary();
            
            return deploymentSuccess;
            
        } catch (error) {
            this.log(`❌ Pipeline failed with error: ${error.message}`, 'error');
            console.error(error);
            return false;
        }
    }
}

// CLI execution
if (require.main === module) {
    const pipeline = new CompleteHederaDeployment();
    
    // Handle process interruption
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\\n⚠️  Pipeline interrupted by user'));
        process.exit(1);
    });
    
    pipeline.runPipeline()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Pipeline execution failed:'), error);
            process.exit(1);
        });
}

module.exports = CompleteHederaDeployment;