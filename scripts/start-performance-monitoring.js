#!/usr/bin/env node

/**
 * Start Performance Monitoring
 * Orchestrates all performance monitoring systems
 */

const PerformanceMonitoringSystem = require('./performance-monitoring-system');
const SuccessRateTracker = require('./success-rate-tracker');
const ResourceUsageMonitor = require('./resource-usage-monitor');

class PerformanceMonitoringOrchestrator {
    constructor() {
        this.performanceMonitor = new PerformanceMonitoringSystem();
        this.successRateTracker = new SuccessRateTracker();
        this.resourceMonitor = new ResourceUsageMonitor();
        
        this.isRunning = false;
        this.startTime = null;
    }

    async startAllMonitoring() {
        console.log('🚀 Starting Comprehensive Performance Monitoring System...\n');
        
        this.startTime = Date.now();
        this.isRunning = true;
        
        try {
            // Start all monitoring systems
            console.log('📊 Starting Performance Monitoring System...');
            await this.performanceMonitor.startMonitoring();
            
            console.log('📈 Starting Success Rate Tracker...');
            await this.successRateTracker.startTracking();
            
            console.log('💻 Starting Resource Usage Monitor...');
            await this.resourceMonitor.startMonitoring();
            
            // Start simulation for testing
            console.log('🎭 Starting operation simulation...');
            this.simulationInterval = this.successRateTracker.simulateOperations();
            
            console.log('\n✅ All monitoring systems started successfully!');
            console.log('📋 Monitoring Components:');
            console.log('   ✓ Performance Monitoring System');
            console.log('   ✓ Success Rate Tracker');
            console.log('   ✓ Resource Usage Monitor');
            console.log('   ✓ Operation Simulation');
            
            // Start periodic reporting
            this.startPeriodicReporting();
            
            return {
                status: 'success',
                startTime: new Date(this.startTime).toISOString(),
                components: [
                    'PerformanceMonitoringSystem',
                    'SuccessRateTracker', 
                    'ResourceUsageMonitor'
                ]
            };
            
        } catch (error) {
            console.error('❌ Failed to start monitoring systems:', error.message);
            await this.stopAllMonitoring();
            throw error;
        }
    }

    startPeriodicReporting() {
        // Generate comprehensive reports every 2 minutes
        this.reportingInterval = setInterval(async () => {
            await this.generateComprehensiveReport();
        }, 120000); // 2 minutes
        
        // Generate summary every 30 seconds
        this.summaryInterval = setInterval(async () => {
            await this.generateQuickSummary();
        }, 30000); // 30 seconds
    }

    async generateQuickSummary() {
        try {
            console.log('\n📊 Quick Performance Summary:');
            console.log('============================');
            
            // Get current metrics from each system
            const performanceMetrics = await this.performanceMonitor.getMetricsSummary();
            const successRateReport = this.successRateTracker.getDetailedReport();
            const resourceReport = await this.resourceMonitor.getResourceReport();
            
            // Display key metrics
            console.log(`🕒 Runtime: ${this.formatDuration(Date.now() - this.startTime)}`);
            
            if (performanceMetrics.lastHour) {
                console.log(`⚡ Avg Response Time: ${performanceMetrics.lastHour.avgResponseTime.toFixed(2)}ms`);
                console.log(`✅ Avg Success Rate: ${performanceMetrics.lastHour.avgSuccessRate.toFixed(2)}%`);
            }
            
            if (resourceReport.current) {
                console.log(`💻 CPU Usage: ${resourceReport.current.cpu.toFixed(2)}%`);
                console.log(`🧠 Memory Usage: ${resourceReport.current.memory.toFixed(2)}%`);
                console.log(`🌐 Network Latency: ${resourceReport.current.latency.toFixed(2)}ms`);
            }
            
            if (successRateReport.summary) {
                console.log(`🎯 Total Operations: ${successRateReport.summary.overallStats.totalOperations}`);
                console.log(`📈 Overall Success Rate: ${successRateReport.summary.overallStats.overallSuccessRate.toFixed(2)}%`);
            }
            
        } catch (error) {
            console.error('❌ Error generating quick summary:', error.message);
        }
    }

    async generateComprehensiveReport() {
        try {
            console.log('\n📋 Generating Comprehensive Performance Report...');
            
            // Collect data from all monitoring systems
            const performanceMetrics = await this.performanceMonitor.getMetricsSummary();
            const successRateReport = this.successRateTracker.getDetailedReport();
            const resourceReport = await this.resourceMonitor.getResourceReport();
            
            const comprehensiveReport = {
                timestamp: new Date().toISOString(),
                runtime: Date.now() - this.startTime,
                runtimeFormatted: this.formatDuration(Date.now() - this.startTime),
                performance: performanceMetrics,
                successRates: successRateReport,
                resources: resourceReport,
                summary: {
                    status: this.getOverallStatus(performanceMetrics, successRateReport, resourceReport),
                    recommendations: this.generateRecommendations(performanceMetrics, successRateReport, resourceReport)
                }
            };
            
            // Save report to file
            const reportPath = `./reports/performance-report-${Date.now()}.json`;
            await this.saveReport(reportPath, comprehensiveReport);
            
            console.log(`📄 Comprehensive report saved: ${reportPath}`);
            
            // Display key insights
            this.displayReportInsights(comprehensiveReport);
            
            return comprehensiveReport;
            
        } catch (error) {
            console.error('❌ Error generating comprehensive report:', error.message);
        }
    }

    getOverallStatus(performance, successRates, resources) {
        const issues = [];
        
        // Check performance issues
        if (performance.lastHour && performance.lastHour.avgResponseTime > 1000) {
            issues.push('High response times detected');
        }
        
        if (performance.lastHour && performance.lastHour.avgSuccessRate < 95) {
            issues.push('Low success rate detected');
        }
        
        // Check resource issues
        if (resources.alerts) {
            if (resources.alerts.cpu) issues.push('High CPU usage');
            if (resources.alerts.memory) issues.push('High memory usage');
            if (resources.alerts.latency) issues.push('High network latency');
        }
        
        // Check success rate issues
        if (successRates.summary && successRates.summary.overallStats.overallSuccessRate < 90) {
            issues.push('Overall success rate below threshold');
        }
        
        if (issues.length === 0) {
            return { status: 'healthy', issues: [] };
        } else if (issues.length <= 2) {
            return { status: 'warning', issues };
        } else {
            return { status: 'critical', issues };
        }
    }

    generateRecommendations(performance, successRates, resources) {
        const recommendations = [];
        
        // Performance recommendations
        if (performance.lastHour && performance.lastHour.avgResponseTime > 1000) {
            recommendations.push({
                category: 'Performance',
                priority: 'High',
                recommendation: 'Optimize API response times - consider caching, database optimization, or load balancing'
            });
        }
        
        // Resource recommendations
        if (resources.alerts) {
            if (resources.alerts.cpu) {
                recommendations.push({
                    category: 'Resources',
                    priority: 'Medium',
                    recommendation: 'High CPU usage detected - consider scaling up or optimizing CPU-intensive operations'
                });
            }
            
            if (resources.alerts.memory) {
                recommendations.push({
                    category: 'Resources',
                    priority: 'High',
                    recommendation: 'High memory usage detected - check for memory leaks or consider increasing available memory'
                });
            }
        }
        
        // Success rate recommendations
        if (successRates.summary && successRates.summary.overallStats.overallSuccessRate < 95) {
            recommendations.push({
                category: 'Reliability',
                priority: 'High',
                recommendation: 'Low success rate detected - investigate error patterns and implement retry mechanisms'
            });
        }
        
        // General recommendations
        if (recommendations.length === 0) {
            recommendations.push({
                category: 'General',
                priority: 'Low',
                recommendation: 'System is performing well - continue monitoring and consider proactive optimizations'
            });
        }
        
        return recommendations;
    }

    displayReportInsights(report) {
        console.log('\n🔍 Performance Insights:');
        console.log('========================');
        
        const status = report.summary.status;
        const statusIcon = status.status === 'healthy' ? '✅' : status.status === 'warning' ? '⚠️' : '❌';
        
        console.log(`${statusIcon} Overall Status: ${status.status.toUpperCase()}`);
        
        if (status.issues.length > 0) {
            console.log('🚨 Issues Detected:');
            status.issues.forEach(issue => {
                console.log(`   • ${issue}`);
            });
        }
        
        console.log('\n💡 Recommendations:');
        report.summary.recommendations.forEach((rec, index) => {
            const priorityIcon = rec.priority === 'High' ? '🔴' : rec.priority === 'Medium' ? '🟡' : '🟢';
            console.log(`   ${priorityIcon} [${rec.category}] ${rec.recommendation}`);
        });
    }

    async saveReport(filePath, report) {
        try {
            // Ensure reports directory exists
            const reportsDir = './reports';
            const fs = require('fs').promises;
            
            try {
                await fs.access(reportsDir);
            } catch (error) {
                await fs.mkdir(reportsDir, { recursive: true });
            }
            
            await fs.writeFile(filePath, JSON.stringify(report, null, 2));
        } catch (error) {
            console.error('❌ Error saving report:', error.message);
        }
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    async stopAllMonitoring() {
        console.log('\n🛑 Stopping All Performance Monitoring...');
        
        this.isRunning = false;
        
        try {
            // Stop periodic reporting
            if (this.reportingInterval) {
                clearInterval(this.reportingInterval);
            }
            
            if (this.summaryInterval) {
                clearInterval(this.summaryInterval);
            }
            
            if (this.simulationInterval) {
                clearInterval(this.simulationInterval);
            }
            
            // Stop all monitoring systems
            console.log('🛑 Stopping Performance Monitoring System...');
            await this.performanceMonitor.stopMonitoring();
            
            console.log('🛑 Stopping Success Rate Tracker...');
            await this.successRateTracker.stopTracking();
            
            console.log('🛑 Stopping Resource Usage Monitor...');
            await this.resourceMonitor.stopMonitoring();
            
            // Generate final comprehensive report
            console.log('📋 Generating final report...');
            const finalReport = await this.generateComprehensiveReport();
            
            console.log('\n✅ All monitoring systems stopped successfully');
            console.log(`📊 Total Runtime: ${this.formatDuration(Date.now() - this.startTime)}`);
            
            return finalReport;
            
        } catch (error) {
            console.error('❌ Error stopping monitoring systems:', error.message);
            throw error;
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            startTime: this.startTime ? new Date(this.startTime).toISOString() : null,
            runtime: this.startTime ? Date.now() - this.startTime : 0,
            runtimeFormatted: this.startTime ? this.formatDuration(Date.now() - this.startTime) : '0s'
        };
    }
}

// CLI interface
async function main() {
    const orchestrator = new PerformanceMonitoringOrchestrator();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            try {
                await orchestrator.startAllMonitoring();
                
                console.log('\n🔄 Performance monitoring is running. Press Ctrl+C to stop.');
                
                // Handle graceful shutdown
                process.on('SIGINT', async () => {
                    console.log('\n🛑 Received interrupt signal...');
                    await orchestrator.stopAllMonitoring();
                    process.exit(0);
                });
                
                process.on('SIGTERM', async () => {
                    console.log('\n🛑 Received terminate signal...');
                    await orchestrator.stopAllMonitoring();
                    process.exit(0);
                });
                
                // Keep process alive
                setInterval(() => {}, 5000);
                
            } catch (error) {
                console.error('❌ Failed to start monitoring:', error.message);
                process.exit(1);
            }
            break;
            
        case 'status':
            const status = orchestrator.getStatus();
            console.log('📊 Performance Monitoring Status:');
            console.log(JSON.stringify(status, null, 2));
            break;
            
        case 'test':
            console.log('🧪 Testing performance monitoring for 2 minutes...');
            try {
                await orchestrator.startAllMonitoring();
                
                // Run for 2 minutes
                setTimeout(async () => {
                    const finalReport = await orchestrator.stopAllMonitoring();
                    console.log('\n✅ Performance monitoring test completed');
                    process.exit(0);
                }, 120000); // 2 minutes
                
            } catch (error) {
                console.error('❌ Test failed:', error.message);
                process.exit(1);
            }
            break;
            
        default:
            console.log('Usage: node start-performance-monitoring.js [start|status|test]');
            console.log('  start  - Start comprehensive performance monitoring');
            console.log('  status - Show current monitoring status');
            console.log('  test   - Run monitoring for 2 minutes then stop');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = PerformanceMonitoringOrchestrator;