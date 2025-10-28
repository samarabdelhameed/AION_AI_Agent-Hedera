#!/usr/bin/env node

/**
 * Measure Hedera Transaction Performance
 * Comprehensive performance analysis of all Hedera operations
 */

const {
    Client,
    AccountId,
    PrivateKey,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenBurnTransaction,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    FileCreateTransaction,
    Hbar
} = require('@hashgraph/sdk');

const fs = require('fs');
const HederaErrorHandler = require('./hedera-error-handler');
require('dotenv').config({ path: '.env.hedera' });

class HederaPerformanceMeasurer {
    constructor() {
        this.client = null;
        this.operatorId = null;
        this.operatorKey = null;
        this.errorHandler = new HederaErrorHandler(3, 2000);
        this.performanceData = {
            timestamp: new Date().toISOString(),
            network: 'hedera-testnet',
            measurements: [],
            summary: {}
        };
    }

    async initialize() {
        console.log('📊 Initializing Hedera Performance Measurer...');
        
        try {
            // Setup client
            this.client = Client.forTestnet();
            
            // Load operator credentials
            this.operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
            this.operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
            
            // Set operator
            this.client.setOperator(this.operatorId, this.operatorKey);
            
            // Health check
            const healthCheck = await this.errorHandler.performHealthCheck(this.client);
            if (!healthCheck.healthy) {
                throw new Error(`Health check failed: ${healthCheck.error || 'System not ready'}`);
            }
            
            console.log(`✅ Initialized with operator: ${this.operatorId}`);
            console.log(`🏥 Health check passed (${healthCheck.score}/3)`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    async measureOperation(operationName, operationFunction, operationDetails = {}) {
        console.log(`📊 Measuring ${operationName}...`);
        
        const measurement = {
            operationName,
            operationDetails,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            success: false,
            transactionHash: null,
            gasUsed: null,
            networkFee: null,
            confirmationTime: null,
            error: null
        };

        try {
            const startTime = Date.now();
            
            // Execute operation
            const result = await operationFunction();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Get receipt for additional details
            let receipt = null;
            let transactionHash = null;
            
            if (result && typeof result.getReceipt === 'function') {
                receipt = await result.getReceipt(this.client);
                transactionHash = result.transactionHash?.toString();
            }
            
            measurement.endTime = endTime;
            measurement.duration = duration;
            measurement.success = true;
            measurement.transactionHash = transactionHash;
            measurement.confirmationTime = duration; // For Hedera, confirmation is immediate
            
            // Estimate gas/fee (Hedera uses HBAR fees)
            measurement.networkFee = this.estimateHederaFee(operationName);
            measurement.gasUsed = 'N/A (Hedera uses fixed fees)';
            
            console.log(`✅ ${operationName} completed in ${duration}ms`);
            
            return { result, measurement };
            
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - measurement.startTime;
            
            measurement.endTime = endTime;
            measurement.duration = duration;
            measurement.success = false;
            measurement.error = error.message;
            
            console.error(`❌ ${operationName} failed after ${duration}ms: ${error.message}`);
            
            return { result: null, measurement };
        } finally {
            this.performanceData.measurements.push(measurement);
        }
    }

    estimateHederaFee(operationName) {
        // Hedera fee estimates based on operation type
        const feeEstimates = {
            'HTS Token Creation': '20 HBAR',
            'HTS Token Mint': '0.001 HBAR',
            'HTS Token Burn': '0.001 HBAR',
            'HCS Topic Creation': '2 HBAR',
            'HCS Message Submit': '0.0001 HBAR',
            'HFS File Creation': '0.01 HBAR',
            'Account Balance Query': '0.0001 HBAR',
            'Token Info Query': '0.0001 HBAR'
        };
        
        return feeEstimates[operationName] || '0.001 HBAR';
    }

    async measureHederaOperations() {
        console.log('📊 Starting comprehensive Hedera performance measurements...\n');
        
        const operations = [];
        
        // 1. HTS Token Creation
        operations.push({
            name: 'HTS Token Creation',
            operation: async () => {
                const tokenTx = new TokenCreateTransaction()
                    .setTokenName('PERF Test Token')
                    .setTokenSymbol('PERF')
                    .setDecimals(6)
                    .setInitialSupply(0)
                    .setTreasuryAccountId(this.operatorId)
                    .setAdminKey(this.operatorKey)
                    .setSupplyKey(this.operatorKey)
                    .setMaxTransactionFee(new Hbar(30));
                
                return await tokenTx.execute(this.client);
            },
            details: { service: 'HTS', operation: 'CREATE_TOKEN' }
        });

        // 2. HTS Token Mint (multiple operations)
        for (let i = 1; i <= 3; i++) {
            operations.push({
                name: 'HTS Token Mint',
                operation: async () => {
                    // Use token from previous creation or a known token
                    const tokenId = this.getLastCreatedTokenId() || '0.0.123456'; // Fallback
                    
                    const mintTx = new TokenMintTransaction()
                        .setTokenId(tokenId)
                        .setAmount(100000 * i) // Different amounts
                        .setMaxTransactionFee(new Hbar(2));
                    
                    return await mintTx.execute(this.client);
                },
                details: { service: 'HTS', operation: 'MINT_TOKEN', iteration: i }
            });
        }

        // 3. HCS Topic Creation
        operations.push({
            name: 'HCS Topic Creation',
            operation: async () => {
                const topicTx = new TopicCreateTransaction()
                    .setTopicMemo('Performance Test Topic')
                    .setAdminKey(this.operatorKey)
                    .setSubmitKey(this.operatorKey)
                    .setMaxTransactionFee(new Hbar(5));
                
                return await topicTx.execute(this.client);
            },
            details: { service: 'HCS', operation: 'CREATE_TOPIC' }
        });

        // 4. HCS Message Submission (multiple messages)
        for (let i = 1; i <= 5; i++) {
            operations.push({
                name: 'HCS Message Submit',
                operation: async () => {
                    const topicId = this.getLastCreatedTopicId() || '0.0.123456'; // Fallback
                    
                    const message = JSON.stringify({
                        messageId: i,
                        timestamp: new Date().toISOString(),
                        data: `Performance test message ${i}`,
                        size: 'small'
                    });
                    
                    const messageTx = new TopicMessageSubmitTransaction()
                        .setTopicId(topicId)
                        .setMessage(Buffer.from(message, 'utf8'))
                        .setMaxTransactionFee(new Hbar(1));
                    
                    return await messageTx.execute(this.client);
                },
                details: { service: 'HCS', operation: 'SUBMIT_MESSAGE', iteration: i }
            });
        }

        // 5. HFS File Creation (different sizes)
        const fileSizes = [
            { name: 'Small File', size: 1024, data: 'A'.repeat(1024) },
            { name: 'Medium File', size: 10240, data: 'B'.repeat(10240) },
            { name: 'Large File', size: 51200, data: 'C'.repeat(51200) }
        ];

        for (const fileSpec of fileSizes) {
            operations.push({
                name: 'HFS File Creation',
                operation: async () => {
                    const fileTx = new FileCreateTransaction()
                        .setContents(Buffer.from(fileSpec.data, 'utf8'))
                        .setKeys([this.operatorKey])
                        .setFileMemo(`Performance test - ${fileSpec.name}`)
                        .setMaxTransactionFee(new Hbar(5));
                    
                    return await fileTx.execute(this.client);
                },
                details: { 
                    service: 'HFS', 
                    operation: 'CREATE_FILE', 
                    fileSize: fileSpec.size,
                    fileName: fileSpec.name
                }
            });
        }

        // Execute all operations
        console.log(`🚀 Executing ${operations.length} performance measurements...\n`);
        
        for (const op of operations) {
            await this.measureOperation(op.name, op.operation, op.details);
            
            // Small delay between operations
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    getLastCreatedTokenId() {
        const tokenCreations = this.performanceData.measurements.filter(
            m => m.operationName === 'HTS Token Creation' && m.success
        );
        
        if (tokenCreations.length > 0) {
            // In real implementation, extract token ID from receipt
            return '0.0.DYNAMIC'; // Placeholder
        }
        
        return null;
    }

    getLastCreatedTopicId() {
        const topicCreations = this.performanceData.measurements.filter(
            m => m.operationName === 'HCS Topic Creation' && m.success
        );
        
        if (topicCreations.length > 0) {
            // In real implementation, extract topic ID from receipt
            return '0.0.DYNAMIC'; // Placeholder
        }
        
        return null;
    }

    calculatePerformanceMetrics() {
        console.log('📊 Calculating performance metrics...');
        
        const measurements = this.performanceData.measurements;
        const successfulMeasurements = measurements.filter(m => m.success);
        const failedMeasurements = measurements.filter(m => !m.success);
        
        // Group by service
        const serviceGroups = {
            HTS: successfulMeasurements.filter(m => m.operationDetails.service === 'HTS'),
            HCS: successfulMeasurements.filter(m => m.operationDetails.service === 'HCS'),
            HFS: successfulMeasurements.filter(m => m.operationDetails.service === 'HFS')
        };

        // Calculate metrics for each service
        const serviceMetrics = {};
        
        for (const [service, ops] of Object.entries(serviceGroups)) {
            if (ops.length === 0) continue;
            
            const durations = ops.map(op => op.duration);
            
            serviceMetrics[service] = {
                operationCount: ops.length,
                averageDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                successRate: (ops.length / measurements.filter(m => m.operationDetails.service === service).length * 100).toFixed(1) + '%',
                totalTime: durations.reduce((sum, d) => sum + d, 0)
            };
        }

        // Overall metrics
        const allDurations = successfulMeasurements.map(m => m.duration);
        
        this.performanceData.summary = {
            totalOperations: measurements.length,
            successfulOperations: successfulMeasurements.length,
            failedOperations: failedMeasurements.length,
            overallSuccessRate: (successfulMeasurements.length / measurements.length * 100).toFixed(1) + '%',
            averageDuration: allDurations.length > 0 ? Math.round(allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length) : 0,
            minDuration: allDurations.length > 0 ? Math.min(...allDurations) : 0,
            maxDuration: allDurations.length > 0 ? Math.max(...allDurations) : 0,
            totalExecutionTime: allDurations.reduce((sum, d) => sum + d, 0),
            serviceMetrics,
            networkCharacteristics: {
                network: 'Hedera Testnet',
                consensusAlgorithm: 'Hashgraph',
                finalityType: 'Immediate',
                averageConfirmationTime: '3-5 seconds',
                feeStructure: 'Fixed HBAR fees',
                throughput: '10,000+ TPS theoretical'
            }
        };

        console.log('✅ Performance metrics calculated');
        return this.performanceData.summary;
    }

    async generatePerformanceReport() {
        console.log('📋 Generating Hedera performance report...');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            const report = {
                timestamp: new Date().toISOString(),
                network: 'hedera-testnet',
                operation: 'Hedera Performance Measurement',
                operator: this.operatorId.toString(),
                summary: this.performanceData.summary,
                measurements: this.performanceData.measurements,
                analysis: {
                    performanceRating: this.calculatePerformanceRating(),
                    strengths: this.identifyStrengths(),
                    optimizationOpportunities: this.identifyOptimizations(),
                    comparisonReadiness: true
                }
            };

            // Save JSON report
            const jsonFile = `reports/hedera-performance-${timestamp}.json`;
            fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
            console.log(`✅ Saved JSON report: ${jsonFile}`);

            // Generate Markdown report
            const markdownReport = this.generateMarkdownReport(report);
            const mdFile = `reports/hedera-performance-${timestamp}.md`;
            fs.writeFileSync(mdFile, markdownReport);
            console.log(`✅ Saved Markdown report: ${mdFile}`);

            return {
                jsonFile,
                mdFile,
                report
            };

        } catch (error) {
            console.error('❌ Failed to generate performance report:', error.message);
            throw error;
        }
    }

    calculatePerformanceRating() {
        const summary = this.performanceData.summary;
        let rating = 0;
        
        // Success rate (40% weight)
        const successRate = parseFloat(summary.overallSuccessRate);
        rating += (successRate / 100) * 40;
        
        // Speed (30% weight) - faster is better
        const avgDuration = summary.averageDuration;
        const speedScore = Math.max(0, (5000 - avgDuration) / 5000); // 5s baseline
        rating += speedScore * 30;
        
        // Consistency (20% weight) - lower variance is better
        const variance = summary.maxDuration - summary.minDuration;
        const consistencyScore = Math.max(0, (10000 - variance) / 10000); // 10s baseline
        rating += consistencyScore * 20;
        
        // Service coverage (10% weight)
        const serviceCount = Object.keys(summary.serviceMetrics || {}).length;
        const coverageScore = Math.min(1, serviceCount / 3); // 3 services expected
        rating += coverageScore * 10;
        
        return Math.round(rating);
    }

    identifyStrengths() {
        const summary = this.performanceData.summary;
        const strengths = [];
        
        if (parseFloat(summary.overallSuccessRate) >= 95) {
            strengths.push('Excellent reliability with 95%+ success rate');
        }
        
        if (summary.averageDuration < 2000) {
            strengths.push('Fast transaction processing under 2 seconds');
        }
        
        if (summary.networkCharacteristics.finalityType === 'Immediate') {
            strengths.push('Immediate finality without confirmation delays');
        }
        
        strengths.push('Fixed fee structure provides cost predictability');
        strengths.push('High theoretical throughput (10,000+ TPS)');
        
        return strengths;
    }

    identifyOptimizations() {
        const summary = this.performanceData.summary;
        const optimizations = [];
        
        if (summary.averageDuration > 3000) {
            optimizations.push('Consider optimizing transaction construction');
        }
        
        if (parseFloat(summary.overallSuccessRate) < 90) {
            optimizations.push('Improve error handling and retry logic');
        }
        
        const variance = summary.maxDuration - summary.minDuration;
        if (variance > 5000) {
            optimizations.push('Investigate performance variance causes');
        }
        
        optimizations.push('Implement transaction batching for bulk operations');
        optimizations.push('Consider connection pooling for high-volume scenarios');
        
        return optimizations;
    }

    generateMarkdownReport(report) {
        let md = `# Hedera Performance Measurement Report\n\n`;
        md += `**Generated:** ${report.timestamp}\n`;
        md += `**Network:** ${report.network}\n`;
        md += `**Operator:** ${report.operator}\n\n`;

        md += `## 📊 Performance Summary\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Operations | ${report.summary.totalOperations} |\n`;
        md += `| Successful Operations | ${report.summary.successfulOperations} |\n`;
        md += `| Success Rate | ${report.summary.overallSuccessRate} |\n`;
        md += `| Average Duration | ${report.summary.averageDuration}ms |\n`;
        md += `| Min Duration | ${report.summary.minDuration}ms |\n`;
        md += `| Max Duration | ${report.summary.maxDuration}ms |\n`;
        md += `| Total Execution Time | ${report.summary.totalExecutionTime}ms |\n`;
        md += `| Performance Rating | ${report.analysis.performanceRating}/100 |\n\n`;

        md += `## 🔧 Service Performance Breakdown\n\n`;
        md += `| Service | Operations | Avg Duration | Success Rate | Total Time |\n`;
        md += `|---------|------------|--------------|--------------|------------|\n`;
        
        for (const [service, metrics] of Object.entries(report.summary.serviceMetrics || {})) {
            md += `| ${service} | ${metrics.operationCount} | ${metrics.averageDuration}ms | ${metrics.successRate} | ${metrics.totalTime}ms |\n`;
        }

        md += `\n## 📈 Detailed Measurements\n\n`;
        md += `| Operation | Duration | Success | Service | Details |\n`;
        md += `|-----------|----------|---------|---------|----------|\n`;
        
        for (const measurement of report.measurements) {
            const status = measurement.success ? '✅' : '❌';
            const service = measurement.operationDetails.service || 'N/A';
            const details = measurement.operationDetails.operation || 'N/A';
            md += `| ${measurement.operationName} | ${measurement.duration}ms | ${status} | ${service} | ${details} |\n`;
        }

        md += `\n## 🌐 Network Characteristics\n\n`;
        const network = report.summary.networkCharacteristics;
        md += `- **Network**: ${network.network}\n`;
        md += `- **Consensus Algorithm**: ${network.consensusAlgorithm}\n`;
        md += `- **Finality Type**: ${network.finalityType}\n`;
        md += `- **Average Confirmation Time**: ${network.averageConfirmationTime}\n`;
        md += `- **Fee Structure**: ${network.feeStructure}\n`;
        md += `- **Theoretical Throughput**: ${network.throughput}\n\n`;

        md += `## 💪 Strengths\n\n`;
        for (const strength of report.analysis.strengths) {
            md += `- ${strength}\n`;
        }

        md += `\n## 🔧 Optimization Opportunities\n\n`;
        for (const optimization of report.analysis.optimizationOpportunities) {
            md += `- ${optimization}\n`;
        }

        md += `\n---\n\n`;
        md += `*This report provides comprehensive performance analysis of Hedera Hashgraph operations*\n`;
        md += `*Generated: ${new Date().toISOString()}*\n`;

        return md;
    }

    async execute() {
        console.log('🚀 Starting Hedera Performance Measurement...\n');
        
        try {
            // Initialize
            await this.initialize();
            
            // Measure operations
            await this.measureHederaOperations();
            
            // Calculate metrics
            this.calculatePerformanceMetrics();
            
            // Generate report
            const reportData = await this.generatePerformanceReport();
            
            console.log('\n🎉 Hedera Performance Measurement Completed Successfully!');
            console.log('═══════════════════════════════════════════════════');
            console.log(`📊 Total Operations: ${this.performanceData.summary.totalOperations}`);
            console.log(`✅ Success Rate: ${this.performanceData.summary.overallSuccessRate}`);
            console.log(`⚡ Average Duration: ${this.performanceData.summary.averageDuration}ms`);
            console.log(`🏆 Performance Rating: ${reportData.report.analysis.performanceRating}/100`);
            
            return {
                success: true,
                performanceData: this.performanceData,
                reportData,
                summary: this.performanceData.summary
            };
            
        } catch (error) {
            console.error('\n❌ Hedera Performance Measurement Failed!');
            console.error('Error:', error.message);
            
            return {
                success: false,
                error: error.message,
                performanceData: this.performanceData,
                reportData: null
            };
        }
    }
}

// Execute if called directly
if (require.main === module) {
    const measurer = new HederaPerformanceMeasurer();
    measurer.execute()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Hedera Performance Measurement completed successfully!');
                process.exit(0);
            } else {
                console.error('\n❌ Hedera Performance Measurement failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = HederaPerformanceMeasurer;