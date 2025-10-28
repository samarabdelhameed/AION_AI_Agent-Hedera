#!/usr/bin/env node

/**
 * Execute BSC Comparison Operations
 * Performs equivalent operations on BSC testnet for performance comparison
 */

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config({ path: '.env.hedera' });

class BSCComparisonExecutor {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.comparisonData = {
            timestamp: new Date().toISOString(),
            network: 'bsc-testnet',
            measurements: [],
            summary: {}
        };
    }

    async initialize() {
        console.log('🔗 Initializing BSC Comparison Executor...');
        
        try {
            // Setup BSC testnet provider
            this.provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
            
            // Load wallet from private key
            const privateKey = process.env.PRIVATE_KEY;
            if (!privateKey) {
                throw new Error('PRIVATE_KEY not found in environment');
            }
            
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            
            // Check network
            const network = await this.provider.getNetwork();
            console.log(`✅ Connected to BSC Testnet (Chain ID: ${network.chainId})`);
            console.log(`💰 Wallet address: ${this.wallet.address}`);
            
            // Check balance
            const balance = await this.provider.getBalance(this.wallet.address);
            console.log(`💰 BNB balance: ${ethers.formatEther(balance)} BNB`);
            
            if (balance < ethers.parseEther('0.1')) {
                console.warn('⚠️ Low BNB balance, some operations may fail');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ BSC initialization failed:', error.message);
            throw error;
        }
    }

    async measureBSCOperation(operationName, operationFunction, operationDetails = {}) {
        console.log(`📊 Measuring BSC ${operationName}...`);
        
        const measurement = {
            operationName,
            operationDetails,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            success: false,
            transactionHash: null,
            gasUsed: null,
            gasPrice: null,
            networkFee: null,
            confirmationTime: null,
            blockNumber: null,
            error: null
        };

        try {
            const startTime = Date.now();
            
            // Execute operation
            const result = await operationFunction();
            
            let transactionHash = null;
            let receipt = null;
            
            if (result && result.hash) {
                transactionHash = result.hash;
                
                // Wait for confirmation
                const confirmationStart = Date.now();
                receipt = await result.wait();
                const confirmationTime = Date.now() - confirmationStart;
                
                measurement.confirmationTime = confirmationTime;
                measurement.blockNumber = receipt.blockNumber;
                measurement.gasUsed = receipt.gasUsed.toString();
                measurement.gasPrice = result.gasPrice?.toString() || 'N/A';
                
                // Calculate network fee
                if (receipt.gasUsed && result.gasPrice) {
                    const feeWei = receipt.gasUsed * result.gasPrice;
                    measurement.networkFee = ethers.formatEther(feeWei) + ' BNB';
                }
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            measurement.endTime = endTime;
            measurement.duration = duration;
            measurement.success = true;
            measurement.transactionHash = transactionHash;
            
            console.log(`✅ BSC ${operationName} completed in ${duration}ms`);
            
            return { result, measurement };
            
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - measurement.startTime;
            
            measurement.endTime = endTime;
            measurement.duration = duration;
            measurement.success = false;
            measurement.error = error.message;
            
            console.error(`❌ BSC ${operationName} failed after ${duration}ms: ${error.message}`);
            
            return { result: null, measurement };
        } finally {
            this.comparisonData.measurements.push(measurement);
        }
    }

    // Simple ERC20 token contract ABI for testing
    getERC20ABI() {
        return [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)',
            'function totalSupply() view returns (uint256)',
            'function balanceOf(address) view returns (uint256)',
            'function transfer(address to, uint256 amount) returns (bool)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'event Transfer(address indexed from, address indexed to, uint256 value)'
        ];
    }

    // Simple storage contract for message logging (similar to HCS)
    getStorageContractABI() {
        return [
            'function storeMessage(string memory message) public',
            'function getMessage(uint256 index) public view returns (string memory)',
            'function getMessageCount() public view returns (uint256)',
            'event MessageStored(uint256 indexed index, string message)'
        ];
    }

    async measureBSCOperations() {
        console.log('📊 Starting BSC performance measurements...\n');
        
        const operations = [];
        
        // 1. Simple BNB Transfer (equivalent to account operations)
        for (let i = 1; i <= 3; i++) {
            operations.push({
                name: 'BNB Transfer',
                operation: async () => {
                    const tx = await this.wallet.sendTransaction({
                        to: this.wallet.address, // Self-transfer for testing
                        value: ethers.parseEther('0.001'), // 0.001 BNB
                        gasLimit: 21000
                    });
                    return tx;
                },
                details: { service: 'BSC', operation: 'TRANSFER', iteration: i }
            });
        }

        // 2. Contract Interaction - Token queries (equivalent to HTS queries)
        const testTokenAddress = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // USDT testnet
        
        for (let i = 1; i <= 3; i++) {
            operations.push({
                name: 'Token Query',
                operation: async () => {
                    const tokenContract = new ethers.Contract(testTokenAddress, this.getERC20ABI(), this.provider);
                    
                    // Simulate multiple queries
                    const [name, symbol, decimals, totalSupply] = await Promise.all([
                        tokenContract.name(),
                        tokenContract.symbol(),
                        tokenContract.decimals(),
                        tokenContract.totalSupply()
                    ]);
                    
                    return { 
                        hash: 'QUERY_OPERATION', 
                        data: { name, symbol, decimals, totalSupply: totalSupply.toString() }
                    };
                },
                details: { service: 'BSC', operation: 'TOKEN_QUERY', iteration: i }
            });
        }

        // 3. Contract Deployment (equivalent to topic/file creation)
        operations.push({
            name: 'Contract Deployment',
            operation: async () => {
                // Simple storage contract bytecode
                const contractBytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b51461007657806347064d6a14610080575b600080fd5b6100746004803603602081101561005c57600080fd5b81019080803590602001909291905050506100b0565b005b61007e6100ca565b005b61009e6004803603602081101561009657600080fd5b8035906020019092919050505061010c565b60405180821515815260200191505060405180910390f35b8060008190555050565b3373ffffffffffffffffffffffffffffffffffffffff16ff5b60008082141561011f5760019050610123565b5060005b919050565b56fea2646970667358221220d85b6a81c6b5b5c6b5b5c6b5b5c6b5b5c6b5b5c6b5b5c6b5b5c6b5b5c6b5b564736f6c63430007060033';
                
                const tx = await this.wallet.sendTransaction({
                    data: contractBytecode,
                    gasLimit: 500000
                });
                
                return tx;
            },
            details: { service: 'BSC', operation: 'DEPLOY_CONTRACT' }
        });

        // 4. Message Storage (equivalent to HCS messages)
        for (let i = 1; i <= 5; i++) {
            operations.push({
                name: 'Message Storage',
                operation: async () => {
                    // Simulate storing data on-chain (like HCS messages)
                    const message = JSON.stringify({
                        messageId: i,
                        timestamp: new Date().toISOString(),
                        data: `BSC test message ${i}`,
                        comparison: 'hedera-hcs'
                    });
                    
                    // Store as transaction data
                    const tx = await this.wallet.sendTransaction({
                        to: this.wallet.address,
                        value: 0,
                        data: ethers.hexlify(ethers.toUtf8Bytes(message)),
                        gasLimit: 100000
                    });
                    
                    return tx;
                },
                details: { service: 'BSC', operation: 'STORE_MESSAGE', iteration: i }
            });
        }

        // 5. Batch Operations (equivalent to multiple HTS operations)
        operations.push({
            name: 'Batch Operations',
            operation: async () => {
                // Simulate batch processing with multiple calls
                const promises = [];
                
                for (let i = 0; i < 3; i++) {
                    promises.push(
                        this.provider.getBalance(this.wallet.address)
                    );
                }
                
                const results = await Promise.all(promises);
                
                return { 
                    hash: 'BATCH_OPERATION', 
                    data: { results: results.map(r => r.toString()) }
                };
            },
            details: { service: 'BSC', operation: 'BATCH_QUERY' }
        });

        // Execute all operations
        console.log(`🚀 Executing ${operations.length} BSC performance measurements...\n`);
        
        for (const op of operations) {
            await this.measureBSCOperation(op.name, op.operation, op.details);
            
            // Delay between operations to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    calculateBSCMetrics() {
        console.log('📊 Calculating BSC performance metrics...');
        
        const measurements = this.comparisonData.measurements;
        const successfulMeasurements = measurements.filter(m => m.success);
        const failedMeasurements = measurements.filter(m => !m.success);
        
        // Group by operation type
        const operationGroups = {};
        successfulMeasurements.forEach(m => {
            const opType = m.operationDetails.operation || m.operationName;
            if (!operationGroups[opType]) {
                operationGroups[opType] = [];
            }
            operationGroups[opType].push(m);
        });

        // Calculate metrics for each operation type
        const operationMetrics = {};
        
        for (const [opType, ops] of Object.entries(operationGroups)) {
            const durations = ops.map(op => op.duration);
            const confirmationTimes = ops.filter(op => op.confirmationTime).map(op => op.confirmationTime);
            const gasUsed = ops.filter(op => op.gasUsed).map(op => parseInt(op.gasUsed));
            
            operationMetrics[opType] = {
                operationCount: ops.length,
                averageDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                averageConfirmationTime: confirmationTimes.length > 0 ? 
                    Math.round(confirmationTimes.reduce((sum, d) => sum + d, 0) / confirmationTimes.length) : 0,
                averageGasUsed: gasUsed.length > 0 ? 
                    Math.round(gasUsed.reduce((sum, g) => sum + g, 0) / gasUsed.length) : 0,
                successRate: '100%' // Only successful operations in this group
            };
        }

        // Overall metrics
        const allDurations = successfulMeasurements.map(m => m.duration);
        const allConfirmationTimes = successfulMeasurements.filter(m => m.confirmationTime).map(m => m.confirmationTime);
        const allGasUsed = successfulMeasurements.filter(m => m.gasUsed).map(m => parseInt(m.gasUsed));
        
        this.comparisonData.summary = {
            totalOperations: measurements.length,
            successfulOperations: successfulMeasurements.length,
            failedOperations: failedMeasurements.length,
            overallSuccessRate: (successfulMeasurements.length / measurements.length * 100).toFixed(1) + '%',
            averageDuration: allDurations.length > 0 ? Math.round(allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length) : 0,
            minDuration: allDurations.length > 0 ? Math.min(...allDurations) : 0,
            maxDuration: allDurations.length > 0 ? Math.max(...allDurations) : 0,
            averageConfirmationTime: allConfirmationTimes.length > 0 ? 
                Math.round(allConfirmationTimes.reduce((sum, d) => sum + d, 0) / allConfirmationTimes.length) : 0,
            averageGasUsed: allGasUsed.length > 0 ? 
                Math.round(allGasUsed.reduce((sum, g) => sum + g, 0) / allGasUsed.length) : 0,
            totalExecutionTime: allDurations.reduce((sum, d) => sum + d, 0),
            operationMetrics,
            networkCharacteristics: {
                network: 'BSC Testnet',
                consensusAlgorithm: 'Proof of Staked Authority (PoSA)',
                finalityType: 'Probabilistic',
                averageBlockTime: '3 seconds',
                feeStructure: 'Gas-based (Gwei)',
                throughput: '100 TPS average'
            }
        };

        console.log('✅ BSC performance metrics calculated');
        return this.comparisonData.summary;
    }

    async generateBSCReport() {
        console.log('📋 Generating BSC comparison report...');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            const report = {
                timestamp: new Date().toISOString(),
                network: 'bsc-testnet',
                operation: 'BSC Performance Comparison',
                walletAddress: this.wallet.address,
                summary: this.comparisonData.summary,
                measurements: this.comparisonData.measurements,
                analysis: {
                    performanceRating: this.calculateBSCPerformanceRating(),
                    strengths: this.identifyBSCStrengths(),
                    challenges: this.identifyBSCChallenges(),
                    comparisonReadiness: true
                }
            };

            // Save JSON report
            const jsonFile = `reports/bsc-comparison-${timestamp}.json`;
            fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
            console.log(`✅ Saved JSON report: ${jsonFile}`);

            // Generate Markdown report
            const markdownReport = this.generateBSCMarkdownReport(report);
            const mdFile = `reports/bsc-comparison-${timestamp}.md`;
            fs.writeFileSync(mdFile, markdownReport);
            console.log(`✅ Saved Markdown report: ${mdFile}`);

            return {
                jsonFile,
                mdFile,
                report
            };

        } catch (error) {
            console.error('❌ Failed to generate BSC report:', error.message);
            throw error;
        }
    }

    calculateBSCPerformanceRating() {
        const summary = this.comparisonData.summary;
        let rating = 0;
        
        // Success rate (40% weight)
        const successRate = parseFloat(summary.overallSuccessRate);
        rating += (successRate / 100) * 40;
        
        // Speed (30% weight)
        const avgDuration = summary.averageDuration;
        const speedScore = Math.max(0, (10000 - avgDuration) / 10000); // 10s baseline for BSC
        rating += speedScore * 30;
        
        // Confirmation time (20% weight)
        const confirmationTime = summary.averageConfirmationTime;
        const confirmationScore = Math.max(0, (30000 - confirmationTime) / 30000); // 30s baseline
        rating += confirmationScore * 20;
        
        // Gas efficiency (10% weight)
        const avgGas = summary.averageGasUsed;
        const gasScore = avgGas > 0 ? Math.max(0, (1000000 - avgGas) / 1000000) : 0.5; // 1M gas baseline
        rating += gasScore * 10;
        
        return Math.round(rating);
    }

    identifyBSCStrengths() {
        const summary = this.comparisonData.summary;
        const strengths = [];
        
        if (parseFloat(summary.overallSuccessRate) >= 90) {
            strengths.push('Good reliability with 90%+ success rate');
        }
        
        if (summary.averageConfirmationTime < 15000) {
            strengths.push('Reasonable confirmation times under 15 seconds');
        }
        
        strengths.push('Mature ecosystem with extensive tooling');
        strengths.push('EVM compatibility enables easy migration');
        strengths.push('Large developer community and resources');
        
        return strengths;
    }

    identifyBSCChallenges() {
        const summary = this.comparisonData.summary;
        const challenges = [];
        
        if (summary.averageConfirmationTime > 5000) {
            challenges.push('Longer confirmation times compared to Hedera');
        }
        
        if (summary.averageGasUsed > 100000) {
            challenges.push('Higher gas consumption for complex operations');
        }
        
        challenges.push('Variable gas fees based on network congestion');
        challenges.push('Probabilistic finality requires multiple confirmations');
        challenges.push('Lower theoretical throughput compared to Hedera');
        
        return challenges;
    }

    generateBSCMarkdownReport(report) {
        let md = `# BSC Performance Comparison Report\n\n`;
        md += `**Generated:** ${report.timestamp}\n`;
        md += `**Network:** ${report.network}\n`;
        md += `**Wallet:** ${report.walletAddress}\n\n`;

        md += `## 📊 Performance Summary\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Operations | ${report.summary.totalOperations} |\n`;
        md += `| Successful Operations | ${report.summary.successfulOperations} |\n`;
        md += `| Success Rate | ${report.summary.overallSuccessRate} |\n`;
        md += `| Average Duration | ${report.summary.averageDuration}ms |\n`;
        md += `| Average Confirmation Time | ${report.summary.averageConfirmationTime}ms |\n`;
        md += `| Average Gas Used | ${report.summary.averageGasUsed} |\n`;
        md += `| Performance Rating | ${report.analysis.performanceRating}/100 |\n\n`;

        md += `## 🔧 Operation Performance Breakdown\n\n`;
        md += `| Operation | Count | Avg Duration | Avg Confirmation | Avg Gas | Success Rate |\n`;
        md += `|-----------|-------|--------------|------------------|---------|-------------|\n`;
        
        for (const [operation, metrics] of Object.entries(report.summary.operationMetrics || {})) {
            md += `| ${operation} | ${metrics.operationCount} | ${metrics.averageDuration}ms | ${metrics.averageConfirmationTime}ms | ${metrics.averageGasUsed} | ${metrics.successRate} |\n`;
        }

        md += `\n## 📈 Detailed Measurements\n\n`;
        md += `| Operation | Duration | Confirmation | Gas Used | Success |\n`;
        md += `|-----------|----------|--------------|----------|----------|\n`;
        
        for (const measurement of report.measurements) {
            const status = measurement.success ? '✅' : '❌';
            const confirmation = measurement.confirmationTime || 'N/A';
            const gas = measurement.gasUsed || 'N/A';
            md += `| ${measurement.operationName} | ${measurement.duration}ms | ${confirmation}ms | ${gas} | ${status} |\n`;
        }

        md += `\n## 🌐 Network Characteristics\n\n`;
        const network = report.summary.networkCharacteristics;
        md += `- **Network**: ${network.network}\n`;
        md += `- **Consensus Algorithm**: ${network.consensusAlgorithm}\n`;
        md += `- **Finality Type**: ${network.finalityType}\n`;
        md += `- **Average Block Time**: ${network.averageBlockTime}\n`;
        md += `- **Fee Structure**: ${network.feeStructure}\n`;
        md += `- **Throughput**: ${network.throughput}\n\n`;

        md += `## 💪 Strengths\n\n`;
        for (const strength of report.analysis.strengths) {
            md += `- ${strength}\n`;
        }

        md += `\n## 🔧 Challenges\n\n`;
        for (const challenge of report.analysis.challenges) {
            md += `- ${challenge}\n`;
        }

        md += `\n---\n\n`;
        md += `*This report provides BSC performance data for comparison with Hedera Hashgraph*\n`;
        md += `*Generated: ${new Date().toISOString()}*\n`;

        return md;
    }

    async execute() {
        console.log('🚀 Starting BSC Comparison Execution...\n');
        
        try {
            // Initialize
            await this.initialize();
            
            // Measure operations
            await this.measureBSCOperations();
            
            // Calculate metrics
            this.calculateBSCMetrics();
            
            // Generate report
            const reportData = await this.generateBSCReport();
            
            console.log('\n🎉 BSC Comparison Execution Completed Successfully!');
            console.log('═══════════════════════════════════════════════════');
            console.log(`📊 Total Operations: ${this.comparisonData.summary.totalOperations}`);
            console.log(`✅ Success Rate: ${this.comparisonData.summary.overallSuccessRate}`);
            console.log(`⚡ Average Duration: ${this.comparisonData.summary.averageDuration}ms`);
            console.log(`⏱️ Average Confirmation: ${this.comparisonData.summary.averageConfirmationTime}ms`);
            console.log(`⛽ Average Gas: ${this.comparisonData.summary.averageGasUsed}`);
            console.log(`🏆 Performance Rating: ${reportData.report.analysis.performanceRating}/100`);
            
            return {
                success: true,
                comparisonData: this.comparisonData,
                reportData,
                summary: this.comparisonData.summary
            };
            
        } catch (error) {
            console.error('\n❌ BSC Comparison Execution Failed!');
            console.error('Error:', error.message);
            
            return {
                success: false,
                error: error.message,
                comparisonData: this.comparisonData,
                reportData: null
            };
        }
    }
}

// Execute if called directly
if (require.main === module) {
    const executor = new BSCComparisonExecutor();
    executor.execute()
        .then(result => {
            if (result.success) {
                console.log('\n✅ BSC Comparison execution completed successfully!');
                process.exit(0);
            } else {
                console.error('\n❌ BSC Comparison execution failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = BSCComparisonExecutor;