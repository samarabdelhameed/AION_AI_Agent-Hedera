/**
 * 📊 AION x Kiro Performance Monitor
 * Following AION development steering guidelines:
 * - Real-time monitoring
 * - Performance optimization
 * - Comprehensive metrics
 * - Alert system
 */

import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';

class AIONPerformanceMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      metricsInterval: config.metricsInterval || 30000, // 30 seconds
      alertThresholds: {
        responseTime: config.responseTimeThreshold || 50, // 50ms as per steering guide
        errorRate: config.errorRateThreshold || 0.05, // 5%
        memoryUsage: config.memoryThreshold || 0.8, // 80%
        cpuUsage: config.cpuThreshold || 0.7 // 70%
      },
      retentionPeriod: config.retentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
      logFile: config.logFile || 'logs/performance.log'
    };
    
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        responseTimes: []
      },
      system: {
        memory: [],
        cpu: [],
        uptime: process.uptime()
      },
      mcpTools: {
        analyze_defi_strategy: { calls: 0, avgResponseTime: 0, errors: 0 },
        generate_smart_contract: { calls: 0, avgResponseTime: 0, errors: 0 },
        get_live_apy_data: { calls: 0, avgResponseTime: 0, errors: 0 },
        assess_risk_profile: { calls: 0, avgResponseTime: 0, errors: 0 },
        audit_contract_security: { calls: 0, avgResponseTime: 0, errors: 0 },
        optimize_gas_usage: { calls: 0, avgResponseTime: 0, errors: 0 }
      },
      alerts: []
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(path.dirname(this.config.logFile), { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (this.isMonitoring) {
      console.log('📊 Performance monitor is already running');
      return;
    }

    console.log('🚀 Starting AION Performance Monitor...');
    this.isMonitoring = true;
    
    // Start metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);
    
    // Initial metrics collection
    this.collectMetrics();
    
    this.emit('started');
    console.log('✅ Performance monitor started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      console.log('📊 Performance monitor is not running');
      return;
    }

    console.log('🛑 Stopping AION Performance Monitor...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.emit('stopped');
    console.log('✅ Performance monitor stopped');
  }

  /**
   * Record MCP tool call metrics
   */
  recordMCPCall(toolName, responseTime, success = true) {
    if (!this.metrics.mcpTools[toolName]) {
      this.metrics.mcpTools[toolName] = { calls: 0, avgResponseTime: 0, errors: 0 };
    }

    const tool = this.metrics.mcpTools[toolName];
    tool.calls++;
    
    if (success) {
      // Update average response time
      tool.avgResponseTime = ((tool.avgResponseTime * (tool.calls - 1)) + responseTime) / tool.calls;
      this.metrics.requests.successful++;
    } else {
      tool.errors++;
      this.metrics.requests.failed++;
    }
    
    this.metrics.requests.total++;
    this.metrics.requests.responseTimes.push({
      timestamp: Date.now(),
      responseTime,
      tool: toolName,
      success
    });
    
    // Keep only recent response times (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics.requests.responseTimes = this.metrics.requests.responseTimes
      .filter(entry => entry.timestamp > oneHourAgo);
    
    // Check for performance alerts
    this.checkPerformanceAlerts(toolName, responseTime, success);
    
    // Log the call
    this.logMetric('mcp_call', {
      tool: toolName,
      responseTime,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Collect system metrics
   */
  collectMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Memory metrics
    const memoryMetric = {
      timestamp: Date.now(),
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    };
    
    this.metrics.system.memory.push(memoryMetric);
    
    // CPU metrics
    const cpuMetric = {
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    };
    
    this.metrics.system.cpu.push(cpuMetric);
    
    // Keep only recent metrics (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics.system.memory = this.metrics.system.memory
      .filter(entry => entry.timestamp > oneHourAgo);
    this.metrics.system.cpu = this.metrics.system.cpu
      .filter(entry => entry.timestamp > oneHourAgo);
    
    // Update uptime
    this.metrics.system.uptime = process.uptime();
    
    // Check system alerts
    this.checkSystemAlerts(memoryMetric, cpuMetric);
    
    // Emit metrics update
    this.emit('metrics', this.getMetricsSummary());
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(toolName, responseTime, success) {
    const alerts = [];
    
    // Response time alert
    if (responseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `High response time for ${toolName}: ${responseTime}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
        timestamp: Date.now(),
        data: { toolName, responseTime }
      });
    }
    
    // Error rate alert
    const tool = this.metrics.mcpTools[toolName];
    if (tool && tool.calls > 10) { // Only check after sufficient calls
      const errorRate = tool.errors / tool.calls;
      if (errorRate > this.config.alertThresholds.errorRate) {
        alerts.push({
          type: 'error_rate',
          severity: 'critical',
          message: `High error rate for ${toolName}: ${(errorRate * 100).toFixed(2)}% (threshold: ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%)`,
          timestamp: Date.now(),
          data: { toolName, errorRate, totalCalls: tool.calls, errors: tool.errors }
        });
      }
    }
    
    // Process alerts
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Check for system alerts
   */
  checkSystemAlerts(memoryMetric, cpuMetric) {
    const alerts = [];
    
    // Memory usage alert
    const memoryUsagePercent = memoryMetric.heapUsed / memoryMetric.heapTotal;
    if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory',
        severity: 'warning',
        message: `High memory usage: ${(memoryUsagePercent * 100).toFixed(2)}% (threshold: ${(this.config.alertThresholds.memoryUsage * 100).toFixed(2)}%)`,
        timestamp: Date.now(),
        data: { memoryUsagePercent, heapUsed: memoryMetric.heapUsed, heapTotal: memoryMetric.heapTotal }
      });
    }
    
    // Process alerts
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Process and handle alerts
   */
  processAlert(alert) {
    // Add to alerts history
    this.metrics.alerts.push(alert);
    
    // Keep only recent alerts (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics.alerts = this.metrics.alerts
      .filter(alert => alert.timestamp > oneDayAgo);
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Log alert
    this.logMetric('alert', alert);
    
    // Console output based on severity
    const severityColors = {
      info: '\x1b[36m',      // Cyan
      warning: '\x1b[33m',   // Yellow
      critical: '\x1b[31m'   // Red
    };
    
    const color = severityColors[alert.severity] || '\x1b[0m';
    console.log(`${color}🚨 [${alert.severity.toUpperCase()}] ${alert.message}\x1b[0m`);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Recent response times
    const recentResponseTimes = this.metrics.requests.responseTimes
      .filter(entry => entry.timestamp > oneHourAgo);
    
    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, entry) => sum + entry.responseTime, 0) / recentResponseTimes.length
      : 0;
    
    const successRate = this.metrics.requests.total > 0
      ? (this.metrics.requests.successful / this.metrics.requests.total) * 100
      : 100;
    
    // Memory usage
    const latestMemory = this.metrics.system.memory[this.metrics.system.memory.length - 1];
    const memoryUsagePercent = latestMemory
      ? (latestMemory.heapUsed / latestMemory.heapTotal) * 100
      : 0;
    
    return {
      timestamp: now,
      uptime: this.metrics.system.uptime,
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        successRate: successRate.toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(2)
      },
      system: {
        memoryUsagePercent: memoryUsagePercent.toFixed(2),
        memoryUsedMB: latestMemory ? (latestMemory.heapUsed / 1024 / 1024).toFixed(2) : 0,
        memoryTotalMB: latestMemory ? (latestMemory.heapTotal / 1024 / 1024).toFixed(2) : 0
      },
      mcpTools: Object.entries(this.metrics.mcpTools).map(([name, stats]) => ({
        name,
        calls: stats.calls,
        avgResponseTime: stats.avgResponseTime.toFixed(2),
        errors: stats.errors,
        successRate: stats.calls > 0 ? (((stats.calls - stats.errors) / stats.calls) * 100).toFixed(2) : '100.00'
      })),
      alerts: {
        total: this.metrics.alerts.length,
        critical: this.metrics.alerts.filter(a => a.severity === 'critical').length,
        warning: this.metrics.alerts.filter(a => a.severity === 'warning').length
      }
    };
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics() {
    return {
      ...this.metrics,
      summary: this.getMetricsSummary()
    };
  }

  /**
   * Log metric to file
   */
  async logMetric(type, data) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        data
      };
      
      await fs.appendFile(this.config.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to log metric:', error);
    }
  }

  /**
   * Generate performance report
   */
  generateReport(timeframe = '1h') {
    const now = Date.now();
    let startTime;
    
    switch (timeframe) {
      case '1h':
        startTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (60 * 60 * 1000);
    }
    
    const summary = this.getMetricsSummary();
    
    const report = `
# 📊 AION x Kiro Performance Report (${timeframe})

## 🎯 Summary
- **Uptime**: ${Math.floor(summary.uptime / 3600)}h ${Math.floor((summary.uptime % 3600) / 60)}m
- **Total Requests**: ${summary.requests.total}
- **Success Rate**: ${summary.requests.successRate}%
- **Average Response Time**: ${summary.requests.avgResponseTime}ms
- **Memory Usage**: ${summary.system.memoryUsagePercent}%

## 🔧 MCP Tools Performance
${summary.mcpTools.map(tool => `
### ${tool.name}
- **Calls**: ${tool.calls}
- **Avg Response Time**: ${tool.avgResponseTime}ms
- **Success Rate**: ${tool.successRate}%
- **Errors**: ${tool.errors}
`).join('')}

## 🚨 Alerts (Last 24h)
- **Total**: ${summary.alerts.total}
- **Critical**: ${summary.alerts.critical}
- **Warning**: ${summary.alerts.warning}

## 📈 Performance Status
${this.getPerformanceStatus(summary)}

---
*Generated at: ${new Date().toISOString()}*
*AION Performance Monitor v1.0.0*
`;
    
    return report;
  }

  /**
   * Get performance status
   */
  getPerformanceStatus(summary) {
    const issues = [];
    
    if (parseFloat(summary.requests.avgResponseTime) > this.config.alertThresholds.responseTime) {
      issues.push(`⚠️ High response time: ${summary.requests.avgResponseTime}ms`);
    }
    
    if (parseFloat(summary.requests.successRate) < 95) {
      issues.push(`⚠️ Low success rate: ${summary.requests.successRate}%`);
    }
    
    if (parseFloat(summary.system.memoryUsagePercent) > (this.config.alertThresholds.memoryUsage * 100)) {
      issues.push(`⚠️ High memory usage: ${summary.system.memoryUsagePercent}%`);
    }
    
    if (summary.alerts.critical > 0) {
      issues.push(`🚨 ${summary.alerts.critical} critical alerts`);
    }
    
    if (issues.length === 0) {
      return '✅ **All systems operational**';
    } else {
      return `❌ **Issues detected:**\n${issues.map(issue => `- ${issue}`).join('\n')}`;
    }
  }

  /**
   * Export metrics to JSON
   */
  async exportMetrics(filename) {
    try {
      const data = {
        exportTime: new Date().toISOString(),
        config: this.config,
        metrics: this.getDetailedMetrics()
      };
      
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      console.log(`📊 Metrics exported to ${filename}`);
    } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  }
}

// Create singleton instance
const performanceMonitor = new AIONPerformanceMonitor();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down performance monitor...');
  performanceMonitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down performance monitor...');
  performanceMonitor.stop();
  process.exit(0);
});

export default performanceMonitor;
export { AIONPerformanceMonitor };