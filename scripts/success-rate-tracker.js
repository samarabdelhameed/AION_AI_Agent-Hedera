#!/usr/bin/env node

/**
 * Success Rate Tracker
 * Tracks and analyzes success rates for different operations
 */

const fs = require('fs').promises;
const path = require('path');

class SuccessRateTracker {
    constructor() {
        this.operations = new Map();
        this.dataFile = path.join(__dirname, '../data/success-rates.json');
        this.isTracking = false;
    }

    async startTracking() {
        console.log('📈 Starting Success Rate Tracking...');
        
        this.isTracking = true;
        
        // Load existing data
        await this.loadData();
        
        // Start periodic analysis
        this.analysisInterval = setInterval(() => {
            this.analyzeSuccessRates();
        }, 10000); // Every 10 seconds
        
        console.log('✅ Success rate tracking started');
        
        return {
            status: 'started',
            timestamp: new Date().toISOString()
        };
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            
            // Convert back to Map
            this.operations = new Map(Object.entries(parsed.operations || {}));
            
            console.log(`📊 Loaded ${this.operations.size} operation types from storage`);
        } catch (error) {
            console.log('📝 No existing data found, starting fresh');
            this.operations = new Map();
        }
    }

    async saveData() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dataFile);
            await fs.mkdir(dataDir, { recursive: true });
            
            // Convert Map to object for JSON storage
            const dataToSave = {
                operations: Object.fromEntries(this.operations),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(this.dataFile, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error('❌ Error saving data:', error.message);
        }
    }

    recordOperation(operationType, success, metadata = {}) {
        if (!this.isTracking) return;
        
        const timestamp = new Date().toISOString();
        
        if (!this.operations.has(operationType)) {
            this.operations.set(operationType, {
                total: 0,
                successful: 0,
                failed: 0,
                history: [],
                metadata: {}
            });
        }
        
        const operation = this.operations.get(operationType);
        
        // Update counters
        operation.total++;
        if (success) {
            operation.successful++;
        } else {
            operation.failed++;
        }
        
        // Add to history
        operation.history.push({
            timestamp,
            success,
            metadata
        });
        
        // Keep only last 1000 entries per operation
        if (operation.history.length > 1000) {
            operation.history = operation.history.slice(-1000);
        }
        
        // Update metadata
        operation.metadata = {
            ...operation.metadata,
            lastOperation: timestamp,
            successRate: (operation.successful / operation.total) * 100
        };
        
        this.operations.set(operationType, operation);
        
        // Auto-save periodically
        if (operation.total % 10 === 0) {
            this.saveData();
        }
    }

    getSuccessRate(operationType, timeWindow = null) {
        if (!this.operations.has(operationType)) {
            return {
                rate: 0,
                total: 0,
                successful: 0,
                failed: 0
            };
        }
        
        const operation = this.operations.get(operationType);
        
        if (!timeWindow) {
            // Return overall success rate
            return {
                rate: operation.metadata.successRate,
                total: operation.total,
                successful: operation.successful,
                failed: operation.failed
            };
        }
        
        // Calculate success rate for specific time window
        const cutoffTime = Date.now() - timeWindow;
        const recentOperations = operation.history.filter(
            op => new Date(op.timestamp).getTime() > cutoffTime
        );
        
        const successful = recentOperations.filter(op => op.success).length;
        const total = recentOperations.length;
        const failed = total - successful;
        const rate = total > 0 ? (successful / total) * 100 : 0;
        
        return {
            rate,
            total,
            successful,
            failed,
            timeWindow: timeWindow / 1000 // Convert to seconds
        };
    }

    analyzeSuccessRates() {
        console.log('\n📊 Success Rate Analysis:');
        console.log('========================');
        
        for (const [operationType, operation] of this.operations) {
            const overall = this.getSuccessRate(operationType);
            const lastHour = this.getSuccessRate(operationType, 3600000); // 1 hour
            const last15Min = this.getSuccessRate(operationType, 900000); // 15 minutes
            
            console.log(`\n🔧 ${operationType}:`);
            console.log(`   Overall: ${overall.rate.toFixed(2)}% (${overall.successful}/${overall.total})`);
            console.log(`   Last Hour: ${lastHour.rate.toFixed(2)}% (${lastHour.successful}/${lastHour.total})`);
            console.log(`   Last 15min: ${last15Min.rate.toFixed(2)}% (${last15Min.successful}/${last15Min.total})`);
            
            // Alert on low success rates
            if (last15Min.total >= 5 && last15Min.rate < 90) {
                console.log(`   🚨 LOW SUCCESS RATE ALERT: ${last15Min.rate.toFixed(2)}% in last 15 minutes`);
            }
        }
    }

    getDetailedReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalOperationTypes: this.operations.size,
                overallStats: {}
            },
            operations: {}
        };
        
        let totalOperations = 0;
        let totalSuccessful = 0;
        
        for (const [operationType, operation] of this.operations) {
            totalOperations += operation.total;
            totalSuccessful += operation.successful;
            
            report.operations[operationType] = {
                overall: this.getSuccessRate(operationType),
                lastHour: this.getSuccessRate(operationType, 3600000),
                last15Minutes: this.getSuccessRate(operationType, 900000),
                last5Minutes: this.getSuccessRate(operationType, 300000),
                trends: this.calculateTrends(operationType),
                metadata: operation.metadata
            };
        }
        
        report.summary.overallStats = {
            totalOperations,
            totalSuccessful,
            totalFailed: totalOperations - totalSuccessful,
            overallSuccessRate: totalOperations > 0 ? (totalSuccessful / totalOperations) * 100 : 0
        };
        
        return report;
    }

    calculateTrends(operationType) {
        if (!this.operations.has(operationType)) {
            return { trend: 'no_data' };
        }
        
        const operation = this.operations.get(operationType);
        const now = Date.now();
        
        // Get success rates for different time periods
        const periods = [
            { name: 'last5min', duration: 300000 },
            { name: 'last15min', duration: 900000 },
            { name: 'lastHour', duration: 3600000 }
        ];
        
        const rates = periods.map(period => {
            const rate = this.getSuccessRate(operationType, period.duration);
            return {
                period: period.name,
                rate: rate.rate,
                total: rate.total
            };
        });
        
        // Determine trend
        let trend = 'stable';
        if (rates[0].total >= 3 && rates[1].total >= 5) {
            const shortTerm = rates[0].rate;
            const mediumTerm = rates[1].rate;
            
            if (shortTerm > mediumTerm + 5) {
                trend = 'improving';
            } else if (shortTerm < mediumTerm - 5) {
                trend = 'declining';
            }
        }
        
        return {
            trend,
            rates,
            analysis: this.getTrendAnalysis(trend, rates)
        };
    }

    getTrendAnalysis(trend, rates) {
        switch (trend) {
            case 'improving':
                return 'Success rate is improving in recent operations';
            case 'declining':
                return 'Success rate is declining - investigation may be needed';
            case 'stable':
                return 'Success rate is stable';
            default:
                return 'Insufficient data for trend analysis';
        }
    }

    // Simulate operations for testing
    simulateOperations() {
        const operationTypes = [
            'HEDERA_HTS_TRANSFER',
            'HEDERA_HCS_SUBMIT',
            'HEDERA_HFS_UPLOAD',
            'API_VAULT_BALANCE',
            'API_EXECUTE_STRATEGY',
            'DATABASE_QUERY',
            'EXTERNAL_API_CALL'
        ];
        
        console.log('🎭 Starting operation simulation...');
        
        const simulationInterval = setInterval(() => {
            // Simulate 1-5 operations per interval
            const numOps = Math.floor(Math.random() * 5) + 1;
            
            for (let i = 0; i < numOps; i++) {
                const operationType = operationTypes[Math.floor(Math.random() * operationTypes.length)];
                
                // Different success rates for different operations
                let successProbability = 0.95; // Default 95%
                
                switch (operationType) {
                    case 'HEDERA_HTS_TRANSFER':
                        successProbability = 0.98;
                        break;
                    case 'HEDERA_HCS_SUBMIT':
                        successProbability = 0.97;
                        break;
                    case 'EXTERNAL_API_CALL':
                        successProbability = 0.90;
                        break;
                    case 'DATABASE_QUERY':
                        successProbability = 0.99;
                        break;
                }
                
                const success = Math.random() < successProbability;
                const metadata = {
                    duration: Math.floor(Math.random() * 1000) + 50,
                    source: 'simulation'
                };
                
                this.recordOperation(operationType, success, metadata);
            }
        }, 2000); // Every 2 seconds
        
        return simulationInterval;
    }

    async stopTracking() {
        console.log('🛑 Stopping Success Rate Tracking...');
        
        this.isTracking = false;
        
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        
        // Save final data
        await this.saveData();
        
        // Generate final report
        const finalReport = this.getDetailedReport();
        
        console.log('✅ Success rate tracking stopped');
        
        return finalReport;
    }
}

// CLI interface
async function main() {
    const tracker = new SuccessRateTracker();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            await tracker.startTracking();
            
            // Keep the process running
            process.on('SIGINT', async () => {
                await tracker.stopTracking();
                process.exit(0);
            });
            
            // Keep alive
            setInterval(() => {}, 1000);
            break;
            
        case 'simulate':
            await tracker.startTracking();
            const simulationInterval = tracker.simulateOperations();
            
            console.log('🎭 Running simulation for 60 seconds...');
            
            setTimeout(async () => {
                clearInterval(simulationInterval);
                const report = await tracker.stopTracking();
                console.log('\n📊 Final Simulation Report:');
                console.log(JSON.stringify(report, null, 2));
                process.exit(0);
            }, 60000);
            break;
            
        case 'report':
            await tracker.loadData();
            const report = tracker.getDetailedReport();
            console.log('📊 Success Rate Report:');
            console.log(JSON.stringify(report, null, 2));
            break;
            
        case 'test':
            // Record some test operations
            await tracker.startTracking();
            
            console.log('🧪 Recording test operations...');
            
            // Record some test data
            for (let i = 0; i < 50; i++) {
                tracker.recordOperation('TEST_OPERATION', Math.random() > 0.1);
                tracker.recordOperation('HEDERA_TEST', Math.random() > 0.05);
            }
            
            const testReport = tracker.getDetailedReport();
            console.log('📊 Test Report:');
            console.log(JSON.stringify(testReport, null, 2));
            
            await tracker.stopTracking();
            break;
            
        default:
            console.log('Usage: node success-rate-tracker.js [start|simulate|report|test]');
            console.log('  start    - Start continuous tracking');
            console.log('  simulate - Run with simulated operations for 60 seconds');
            console.log('  report   - Show current success rate report');
            console.log('  test     - Run quick test with sample data');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = SuccessRateTracker;