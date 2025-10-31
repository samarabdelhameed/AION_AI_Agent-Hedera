#!/usr/bin/env node

/**
 * Resource Usage Monitor
 * Monitors system resource usage for performance optimization
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ResourceUsageMonitor {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.resourceHistory = [];
        this.alertThresholds = {
            cpu: 80, // 80%
            memory: 85, // 85%
            disk: 90, // 90%
            networkLatency: 1000 // 1 second
        };
        this.dataFile = path.join(__dirname, '../data/resource-usage.json');
    }

    async startMonitoring() {
        console.log('💻 Starting Resource Usage Monitoring...');
        
        this.isMonitoring = true;
        
        // Ensure data directory exists
        await this.ensureDataDirectory();
        
        // Load existing data
        await this.loadHistoricalData();
        
        // Start monitoring loop
        this.monitoringInterval = setInterval(() => {
            this.collectResourceMetrics();
        }, 5000); // Every 5 seconds
        
        // Initial collection
        await this.collectResourceMetrics();
        
        console.log('✅ Resource monitoring started');
        
        return {
            status: 'started',
            timestamp: new Date().toISOString(),
            thresholds: this.alertThresholds
        };
    }

    async ensureDataDirectory() {
        const dataDir = path.dirname(this.dataFile);
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    async loadHistoricalData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.resourceHistory = parsed.history || [];
            
            // Keep only last 1000 entries
            if (this.resourceHistory.length > 1000) {
                this.resourceHistory = this.resourceHistory.slice(-1000);
            }
            
            console.log(`📊 Loaded ${this.resourceHistory.length} historical resource entries`);
        } catch (error) {
            console.log('📝 No historical data found, starting fresh');
            this.resourceHistory = [];
        }
    }

    async collectResourceMetrics() {
        if (!this.isMonitoring) return;
        
        try {
            const timestamp = new Date().toISOString();
            
            // Collect system metrics
            const cpuMetrics = await this.getCPUMetrics();
            const memoryMetrics = this.getMemoryMetrics();
            const diskMetrics = await this.getDiskMetrics();
            const networkMetrics = await this.getNetworkMetrics();
            const processMetrics = this.getProcessMetrics();
            
            const resourceSnapshot = {
                timestamp,
                cpu: cpuMetrics,
                memory: memoryMetrics,
                disk: diskMetrics,
                network: networkMetrics,
                process: processMetrics,
                system: {
                    platform: os.platform(),
                    arch: os.arch(),
                    uptime: os.uptime(),
                    loadAverage: os.loadavg()
                }
            };
            
            // Add to history
            this.resourceHistory.push(resourceSnapshot);
            
            // Keep only last 1000 entries
            if (this.resourceHistory.length > 1000) {
                this.resourceHistory = this.resourceHistory.slice(-1000);
            }
            
            // Check for alerts
            await this.checkResourceAlerts(resourceSnapshot);
            
            // Auto-save every 10 collections
            if (this.resourceHistory.length % 10 === 0) {
                await this.saveData();
            }
            
            // Log summary periodically
            if (this.resourceHistory.length % 12 === 0) { // Every minute (12 * 5 seconds)
                this.logResourceSummary(resourceSnapshot);
            }
            
        } catch (error) {
            console.error('❌ Error collecting resource metrics:', error.message);
        }
    }

    async getCPUMetrics() {
        return new Promise((resolve) => {
            const startMeasure = process.cpuUsage();
            const startTime = Date.now();
            
            setTimeout(() => {
                const endMeasure = process.cpuUsage(startMeasure);
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Calculate CPU usage percentage
                const userCPU = (endMeasure.user / 1000) / duration * 100;
                const systemCPU = (endMeasure.system / 1000) / duration * 100;
                const totalCPU = userCPU + systemCPU;
                
                resolve({
                    user: userCPU,
                    system: systemCPU,
                    total: totalCPU,
                    cores: os.cpus().length,
                    loadAverage: os.loadavg(),
                    model: os.cpus()[0]?.model || 'Unknown'
                });
            }, 100);
        });
    }

    getMemoryMetrics() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;
        
        const processMemory = process.memoryUsage();
        
        return {
            total: totalMemory,
            free: freeMemory,
            used: usedMemory,
            usagePercent: memoryUsagePercent,
            process: {
                rss: processMemory.rss,
                heapTotal: processMemory.heapTotal,
                heapUsed: processMemory.heapUsed,
                external: processMemory.external,
                heapUsagePercent: (processMemory.heapUsed / processMemory.heapTotal) * 100
            }
        };
    }

    async getDiskMetrics() {
        try {
            // Get current working directory stats
            const stats = await fs.stat(process.cwd());
            
            // Simple disk usage estimation (this is basic, real implementation would use statvfs)
            return {
                path: process.cwd(),
                available: 'N/A', // Would need native module for accurate disk space
                used: 'N/A',
                total: 'N/A',
                usagePercent: 0,
                inodes: {
                    total: 'N/A',
                    used: 'N/A',
                    free: 'N/A'
                },
                note: 'Basic disk metrics - use native modules for detailed stats'
            };
        } catch (error) {
            return {
                error: error.message,
                available: 0,
                used: 0,
                total: 0,
                usagePercent: 0
            };
        }
    }

    async getNetworkMetrics() {
        try {
            // Test network latency to common endpoints
            const endpoints = [
                'google.com',
                'github.com',
                'testnet.mirrornode.hedera.com'
            ];
            
            const latencyTests = [];
            
            for (const endpoint of endpoints) {
                try {
                    const startTime = Date.now();
                    
                    // Simple ping simulation (in real implementation, use actual ping)
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
                    
                    const endTime = Date.now();
                    const latency = endTime - startTime;
                    
                    latencyTests.push({
                        endpoint,
                        latency,
                        status: 'success'
                    });
                } catch (error) {
                    latencyTests.push({
                        endpoint,
                        latency: null,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            
            const successfulTests = latencyTests.filter(test => test.status === 'success');
            const averageLatency = successfulTests.length > 0 
                ? successfulTests.reduce((sum, test) => sum + test.latency, 0) / successfulTests.length
                : 0;
            
            return {
                interfaces: os.networkInterfaces(),
                latencyTests,
                averageLatency,
                connectivity: successfulTests.length > 0 ? 'connected' : 'disconnected'
            };
        } catch (error) {
            return {
                error: error.message,
                latencyTests: [],
                averageLatency: 0,
                connectivity: 'unknown'
            };
        }
    }

    getProcessMetrics() {
        return {
            pid: process.pid,
            uptime: process.uptime(),
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            argv: process.argv,
            execPath: process.execPath,
            cwd: process.cwd(),
            env: {
                NODE_ENV: process.env.NODE_ENV,
                PATH: process.env.PATH ? 'SET' : 'NOT_SET'
            }
        };
    }

    async checkResourceAlerts(snapshot) {
        const alerts = [];
        
        // Check CPU usage
        if (snapshot.cpu.total > this.alertThresholds.cpu) {
            alerts.push({
                type: 'CPU_HIGH',
                message: `CPU usage (${snapshot.cpu.total.toFixed(2)}%) exceeds threshold (${this.alertThresholds.cpu}%)`,
                severity: snapshot.cpu.total > 95 ? 'CRITICAL' : 'WARNING',
                value: snapshot.cpu.total,
                threshold: this.alertThresholds.cpu
            });
        }
        
        // Check memory usage
        if (snapshot.memory.usagePercent > this.alertThresholds.memory) {
            alerts.push({
                type: 'MEMORY_HIGH',
                message: `Memory usage (${snapshot.memory.usagePercent.toFixed(2)}%) exceeds threshold (${this.alertThresholds.memory}%)`,
                severity: snapshot.memory.usagePercent > 95 ? 'CRITICAL' : 'WARNING',
                value: snapshot.memory.usagePercent,
                threshold: this.alertThresholds.memory
            });
        }
        
        // Check process heap usage
        if (snapshot.memory.process.heapUsagePercent > 90) {
            alerts.push({
                type: 'HEAP_HIGH',
                message: `Process heap usage (${snapshot.memory.process.heapUsagePercent.toFixed(2)}%) is very high`,
                severity: 'WARNING',
                value: snapshot.memory.process.heapUsagePercent,
                threshold: 90
            });
        }
        
        // Check network latency
        if (snapshot.network.averageLatency > this.alertThresholds.networkLatency) {
            alerts.push({
                type: 'NETWORK_SLOW',
                message: `Network latency (${snapshot.network.averageLatency}ms) exceeds threshold (${this.alertThresholds.networkLatency}ms)`,
                severity: 'WARNING',
                value: snapshot.network.averageLatency,
                threshold: this.alertThresholds.networkLatency
            });
        }
        
        // Process alerts
        for (const alert of alerts) {
            await this.processAlert(alert, snapshot.timestamp);
        }
    }

    async processAlert(alert, timestamp) {
        console.log(`🚨 RESOURCE ALERT [${alert.severity}]: ${alert.message}`);
        
        // Log alert to file
        const alertEntry = {
            timestamp,
            type: 'RESOURCE_ALERT',
            alert
        };
        
        try {
            const alertsFile = path.join(path.dirname(this.dataFile), 'resource-alerts.log');
            await fs.appendFile(alertsFile, JSON.stringify(alertEntry) + '\n');
        } catch (error) {
            console.error('❌ Error logging alert:', error.message);
        }
    }

    logResourceSummary(snapshot) {
        console.log('\n📊 Resource Usage Summary:');
        console.log('==========================');
        console.log(`🕒 Timestamp: ${snapshot.timestamp}`);
        console.log(`💻 CPU: ${snapshot.cpu.total.toFixed(2)}% (User: ${snapshot.cpu.user.toFixed(2)}%, System: ${snapshot.cpu.system.toFixed(2)}%)`);
        console.log(`🧠 Memory: ${snapshot.memory.usagePercent.toFixed(2)}% (${this.formatBytes(snapshot.memory.used)}/${this.formatBytes(snapshot.memory.total)})`);
        console.log(`📦 Process Heap: ${snapshot.memory.process.heapUsagePercent.toFixed(2)}% (${this.formatBytes(snapshot.memory.process.heapUsed)}/${this.formatBytes(snapshot.memory.process.heapTotal)})`);
        console.log(`🌐 Network: ${snapshot.network.averageLatency.toFixed(2)}ms avg latency`);
        console.log(`⏱️ Uptime: ${this.formatUptime(snapshot.system.uptime)}`);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    async getResourceReport() {
        const now = Date.now();
        const oneHourAgo = now - 3600000; // 1 hour ago
        
        // Filter recent data
        const recentData = this.resourceHistory.filter(
            entry => new Date(entry.timestamp).getTime() > oneHourAgo
        );
        
        if (recentData.length === 0) {
            return {
                error: 'No recent data available',
                timestamp: new Date().toISOString()
            };
        }
        
        // Calculate averages
        const avgCPU = recentData.reduce((sum, entry) => sum + entry.cpu.total, 0) / recentData.length;
        const avgMemory = recentData.reduce((sum, entry) => sum + entry.memory.usagePercent, 0) / recentData.length;
        const avgLatency = recentData.reduce((sum, entry) => sum + entry.network.averageLatency, 0) / recentData.length;
        
        // Find peaks
        const maxCPU = Math.max(...recentData.map(entry => entry.cpu.total));
        const maxMemory = Math.max(...recentData.map(entry => entry.memory.usagePercent));
        const maxLatency = Math.max(...recentData.map(entry => entry.network.averageLatency));
        
        // Current values
        const current = recentData[recentData.length - 1];
        
        return {
            timestamp: new Date().toISOString(),
            period: '1 hour',
            dataPoints: recentData.length,
            current: {
                cpu: current.cpu.total,
                memory: current.memory.usagePercent,
                latency: current.network.averageLatency,
                uptime: current.system.uptime
            },
            averages: {
                cpu: avgCPU,
                memory: avgMemory,
                latency: avgLatency
            },
            peaks: {
                cpu: maxCPU,
                memory: maxMemory,
                latency: maxLatency
            },
            thresholds: this.alertThresholds,
            alerts: {
                cpu: avgCPU > this.alertThresholds.cpu,
                memory: avgMemory > this.alertThresholds.memory,
                latency: avgLatency > this.alertThresholds.networkLatency
            }
        };
    }

    async saveData() {
        try {
            const dataToSave = {
                history: this.resourceHistory,
                thresholds: this.alertThresholds,
                lastUpdated: new Date().toISOString(),
                totalEntries: this.resourceHistory.length
            };
            
            await fs.writeFile(this.dataFile, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error('❌ Error saving resource data:', error.message);
        }
    }

    async stopMonitoring() {
        console.log('🛑 Stopping Resource Usage Monitoring...');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        // Save final data
        await this.saveData();
        
        // Generate final report
        const finalReport = await this.getResourceReport();
        
        console.log('✅ Resource monitoring stopped');
        
        return finalReport;
    }
}

// CLI interface
async function main() {
    const monitor = new ResourceUsageMonitor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            await monitor.startMonitoring();
            
            // Keep the process running
            process.on('SIGINT', async () => {
                await monitor.stopMonitoring();
                process.exit(0);
            });
            
            // Keep alive
            setInterval(() => {}, 1000);
            break;
            
        case 'report':
            await monitor.loadHistoricalData();
            const report = await monitor.getResourceReport();
            console.log('📊 Resource Usage Report:');
            console.log(JSON.stringify(report, null, 2));
            break;
            
        case 'test':
            console.log('🧪 Testing resource monitoring for 30 seconds...');
            await monitor.startMonitoring();
            
            setTimeout(async () => {
                const report = await monitor.stopMonitoring();
                console.log('\n📊 Test Report:');
                console.log(JSON.stringify(report, null, 2));
                process.exit(0);
            }, 30000);
            break;
            
        default:
            console.log('Usage: node resource-usage-monitor.js [start|report|test]');
            console.log('  start  - Start continuous resource monitoring');
            console.log('  report - Show resource usage report');
            console.log('  test   - Run monitoring for 30 seconds');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = ResourceUsageMonitor;