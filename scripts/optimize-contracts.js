#!/usr/bin/env node

/**
 * @fileoverview Contract Optimization Script
 * @description Optimize smart contracts for Hedera deployment
 * @author AION Team
 * @version 2.0.0
 */

const { spawn, execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class ContractOptimizer {
    constructor() {
        this.optimizationResults = {
            contracts: {},
            gasEstimates: {},
            sizeLimits: {},
            recommendations: []
        };
        
        this.hederaLimits = {
            maxContractSize: 24576, // 24KB limit for Hedera
            maxGasLimit: 3000000,
            recommendedGasLimit: 2000000
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
     * Analyze contract sizes
     */
    async analyzeContractSizes() {
        this.log('📏 Analyzing contract sizes...', 'header');
        
        const outDir = path.join('contracts', 'out');
        
        try {
            const contracts = await fs.readdir(outDir);
            
            for (const contractDir of contracts) {
                const contractPath = path.join(outDir, contractDir);
                const stat = await fs.stat(contractPath);
                
                if (stat.isDirectory()) {
                    const jsonFiles = await fs.readdir(contractPath);
                    const jsonFile = jsonFiles.find(f => f.endsWith('.json'));
                    
                    if (jsonFile) {
                        const contractData = JSON.parse(
                            await fs.readFile(path.join(contractPath, jsonFile), 'utf8')
                        );
                        
                        if (contractData.bytecode && contractData.bytecode.object) {
                            const bytecodeSize = Buffer.from(
                                contractData.bytecode.object.replace('0x', ''), 
                                'hex'
                            ).length;
                            
                            const contractName = contractDir.replace('.sol', '');
                            this.optimizationResults.contracts[contractName] = {
                                size: bytecodeSize,
                                sizeKB: (bytecodeSize / 1024).toFixed(2),
                                withinLimit: bytecodeSize <= this.hederaLimits.maxContractSize,
                                utilizationPercent: ((bytecodeSize / this.hederaLimits.maxContractSize) * 100).toFixed(1)
                            };
                            
                            const status = bytecodeSize <= this.hederaLimits.maxContractSize ? '✅' : '❌';
                            this.log(
                                `${status} ${contractName}: ${(bytecodeSize / 1024).toFixed(2)} KB (${((bytecodeSize / this.hederaLimits.maxContractSize) * 100).toFixed(1)}% of limit)`,
                                bytecodeSize <= this.hederaLimits.maxContractSize ? 'success' : 'error'
                            );
                            
                            if (bytecodeSize > this.hederaLimits.maxContractSize) {
                                this.optimizationResults.recommendations.push({
                                    contract: contractName,
                                    issue: 'Contract size exceeds Hedera limit',
                                    recommendation: 'Consider splitting contract or optimizing code'
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.log(`❌ Error analyzing contract sizes: ${error.message}`, 'error');
        }
    }

    /**
     * Estimate gas costs
     */
    async estimateGasCosts() {
        this.log('⛽ Estimating gas costs...', 'header');
        
        return new Promise((resolve) => {
            const process = spawn('forge', ['test', '--gas-report'], {
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
                    this.parseGasReport(stdout);
                    this.log('✅ Gas estimation completed', 'success');
                } else {
                    this.log('⚠️  Gas estimation failed, continuing...', 'warning');
                }
                resolve();
            });
        });
    }

    /**
     * Parse gas report from forge output
     */
    parseGasReport(output) {
        const lines = output.split('\\n');
        let inGasReport = false;
        
        for (const line of lines) {
            if (line.includes('gas report')) {
                inGasReport = true;
                continue;
            }
            
            if (inGasReport && line.includes('|')) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 4 && parts[0] && !parts[0].includes('Contract')) {
                    const contractName = parts[0];
                    const avgGas = parseInt(parts[2]) || 0;
                    
                    if (avgGas > 0) {
                        this.optimizationResults.gasEstimates[contractName] = {
                            averageGas: avgGas,
                            withinLimit: avgGas <= this.hederaLimits.recommendedGasLimit,
                            utilizationPercent: ((avgGas / this.hederaLimits.maxGasLimit) * 100).toFixed(1)
                        };
                        
                        const status = avgGas <= this.hederaLimits.recommendedGasLimit ? '✅' : '⚠️';
                        this.log(
                            `${status} ${contractName}: ${avgGas.toLocaleString()} gas (${((avgGas / this.hederaLimits.maxGasLimit) * 100).toFixed(1)}% of limit)`,
                            avgGas <= this.hederaLimits.recommendedGasLimit ? 'success' : 'warning'
                        );
                        
                        if (avgGas > this.hederaLimits.recommendedGasLimit) {
                            this.optimizationResults.recommendations.push({
                                contract: contractName,
                                issue: 'High gas usage detected',
                                recommendation: 'Consider optimizing contract logic or splitting functions'
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * Run optimization compilation
     */
    async runOptimizedCompilation() {
        this.log('🔧 Running optimized compilation...', 'header');
        
        return new Promise((resolve, reject) => {
            const process = spawn('forge', [
                'build',
                '--optimize',
                '--optimizer-runs', '1000',
                '--via-ir'
            ], {
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
                    this.log('✅ Optimized compilation completed', 'success');
                    resolve({ success: true, stdout, stderr });
                } else {
                    this.log('❌ Optimized compilation failed', 'error');
                    if (stderr) console.log(chalk.red(stderr));
                    reject(new Error(`Compilation failed with code ${code}`));
                }
            });
        });
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations() {
        this.log('💡 Generating optimization recommendations...', 'header');
        
        // Check for large contracts
        for (const [contractName, data] of Object.entries(this.optimizationResults.contracts)) {
            if (data.size > this.hederaLimits.maxContractSize * 0.8) {
                this.optimizationResults.recommendations.push({
                    contract: contractName,
                    issue: 'Contract approaching size limit',
                    recommendation: 'Consider using libraries or proxy patterns'
                });
            }
        }
        
        // Check for high gas usage
        for (const [contractName, data] of Object.entries(this.optimizationResults.gasEstimates)) {
            if (data.averageGas > this.hederaLimits.recommendedGasLimit) {
                this.optimizationResults.recommendations.push({
                    contract: contractName,
                    issue: 'High gas consumption',
                    recommendation: 'Optimize loops, reduce storage operations, use events instead of storage'
                });
            }
        }
        
        // General recommendations
        this.optimizationResults.recommendations.push(
            {
                contract: 'All',
                issue: 'Hedera-specific optimization',
                recommendation: 'Use packed structs to reduce storage costs'
            },
            {
                contract: 'All',
                issue: 'Gas optimization',
                recommendation: 'Use immutable variables where possible'
            },
            {
                contract: 'All',
                issue: 'Size optimization',
                recommendation: 'Remove unused imports and functions'
            }
        );
    }

    /**
     * Create optimization report
     */
    async createOptimizationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            hederaLimits: this.hederaLimits,
            analysis: {
                contractSizes: this.optimizationResults.contracts,
                gasEstimates: this.optimizationResults.gasEstimates,
                recommendations: this.optimizationResults.recommendations
            },
            summary: {
                totalContracts: Object.keys(this.optimizationResults.contracts).length,
                contractsWithinSizeLimit: Object.values(this.optimizationResults.contracts)
                    .filter(c => c.withinLimit).length,
                contractsWithinGasLimit: Object.values(this.optimizationResults.gasEstimates)
                    .filter(g => g.withinLimit).length,
                totalRecommendations: this.optimizationResults.recommendations.length
            }
        };
        
        const reportPath = path.join('contracts', 'optimization-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`📄 Optimization report saved to: ${reportPath}`, 'success');
        return report;
    }

    /**
     * Print optimization summary
     */
    printSummary(report) {
        this.log('\\n' + '='.repeat(60), 'header');
        this.log('              CONTRACT OPTIMIZATION SUMMARY', 'header');
        this.log('='.repeat(60), 'header');

        this.log(`\\n📊 Analysis Results:`, 'info');
        this.log(`  Total Contracts: ${report.summary.totalContracts}`);
        this.log(`  ${chalk.green('Within Size Limit:')} ${report.summary.contractsWithinSizeLimit}/${report.summary.totalContracts}`);
        this.log(`  ${chalk.green('Within Gas Limit:')} ${report.summary.contractsWithinGasLimit}/${Object.keys(report.analysis.gasEstimates).length}`);
        this.log(`  Total Recommendations: ${report.summary.totalRecommendations}`);

        if (Object.keys(report.analysis.contractSizes).length > 0) {
            this.log(`\\n📏 Contract Sizes:`, 'info');
            for (const [contractName, data] of Object.entries(report.analysis.contractSizes)) {
                const status = data.withinLimit ? chalk.green('✓') : chalk.red('✗');
                this.log(`  ${status} ${contractName}: ${data.sizeKB} KB (${data.utilizationPercent}%)`);
            }
        }

        if (Object.keys(report.analysis.gasEstimates).length > 0) {
            this.log(`\\n⛽ Gas Estimates:`, 'info');
            for (const [contractName, data] of Object.entries(report.analysis.gasEstimates)) {
                const status = data.withinLimit ? chalk.green('✓') : chalk.yellow('⚠');
                this.log(`  ${status} ${contractName}: ${data.averageGas.toLocaleString()} gas (${data.utilizationPercent}%)`);
            }
        }

        if (report.analysis.recommendations.length > 0) {
            this.log(`\\n💡 Optimization Recommendations:`, 'warning');
            const contractRecommendations = {};
            
            report.analysis.recommendations.forEach(rec => {
                if (!contractRecommendations[rec.contract]) {
                    contractRecommendations[rec.contract] = [];
                }
                contractRecommendations[rec.contract].push(rec);
            });
            
            for (const [contractName, recommendations] of Object.entries(contractRecommendations)) {
                this.log(`\\n  📋 ${contractName}:`, 'info');
                recommendations.forEach(rec => {
                    this.log(`    • ${rec.issue}: ${rec.recommendation}`);
                });
            }
        }

        this.log('\\n' + '='.repeat(60), 'header');
        
        const allWithinLimits = report.summary.contractsWithinSizeLimit === report.summary.totalContracts;
        if (allWithinLimits) {
            this.log('🎉 All contracts are optimized for Hedera deployment!', 'success');
        } else {
            this.log('⚠️  Some contracts need optimization before deployment.', 'warning');
        }
    }

    /**
     * Run complete optimization analysis
     */
    async optimize() {
        try {
            this.log('🚀 Starting contract optimization analysis...', 'header');
            
            // Run optimized compilation
            await this.runOptimizedCompilation();
            
            // Analyze contract sizes
            await this.analyzeContractSizes();
            
            // Estimate gas costs
            await this.estimateGasCosts();
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Create report
            const report = await this.createOptimizationReport();
            
            // Print summary
            this.printSummary(report);
            
            return report.summary.contractsWithinSizeLimit === report.summary.totalContracts;
            
        } catch (error) {
            this.log(`❌ Optimization analysis failed: ${error.message}`, 'error');
            console.error(error);
            return false;
        }
    }
}

// CLI execution
if (require.main === module) {
    const optimizer = new ContractOptimizer();
    
    optimizer.optimize()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Optimization script failed:'), error);
            process.exit(1);
        });
}

module.exports = ContractOptimizer;