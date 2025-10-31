import React, { useState, useEffect } from 'react'

const ComparisonDashboard: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="comparison-dashboard">
      <div className="dashboard-header">
        <h1>Hedera vs BSC Performance Comparison</h1>
        <div className="real-time-indicator">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>Live Data - Last Update: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <section className="metrics-overview">
        <h2>Key Performance Metrics</h2>
        <div className="metrics-grid">
          <div className="metrics-card hedera">
            <h3>⚡ Hedera Transaction Speed</h3>
            <div className="metric-value">2.1 <span>seconds</span></div>
            <div className="metric-change positive">↗ 5.2% faster</div>
          </div>
          
          <div className="metrics-card bsc">
            <h3>⚡ BSC Transaction Speed</h3>
            <div className="metric-value">16.8 <span>seconds</span></div>
            <div className="metric-change negative">↘ 2.1% slower</div>
          </div>
          
          <div className="metrics-card hedera">
            <h3>💰 Hedera Transaction Cost</h3>
            <div className="metric-value">$0.0001</div>
            <div className="metric-change neutral">No change</div>
          </div>
          
          <div className="metrics-card bsc">
            <h3>💰 BSC Transaction Cost</h3>
            <div className="metric-value">$0.50</div>
            <div className="metric-change positive">↗ 8.3% lower</div>
          </div>
        </div>
      </section>

      {/* Detailed Comparison */}
      <section className="detailed-comparison">
        <h2>Detailed Feature Comparison</h2>
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th className="hedera-header">⚡ Hedera</th>
                <th className="bsc-header">🔶 BSC</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Transaction Speed</td>
                <td>2-5 seconds</td>
                <td>15-20 seconds</td>
                <td className="winner hedera">🏆 Hedera</td>
              </tr>
              <tr>
                <td>Transaction Cost</td>
                <td>$0.0001</td>
                <td>$0.50</td>
                <td className="winner hedera">🏆 Hedera</td>
              </tr>
              <tr>
                <td>Throughput</td>
                <td>10,000 TPS</td>
                <td>15 TPS</td>
                <td className="winner hedera">🏆 Hedera</td>
              </tr>
              <tr>
                <td>Energy Efficiency</td>
                <td>Carbon Negative</td>
                <td>High Energy</td>
                <td className="winner hedera">🏆 Hedera</td>
              </tr>
              <tr>
                <td>Finality</td>
                <td>Immediate</td>
                <td>12-15 blocks</td>
                <td className="winner hedera">🏆 Hedera</td>
              </tr>
              <tr>
                <td>Developer Adoption</td>
                <td>Growing</td>
                <td>Established</td>
                <td className="winner bsc">🏆 BSC</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* AI Decision Impact */}
      <section className="ai-impact">
        <h2>AI Decision Making Impact</h2>
        <div className="impact-cards">
          <div className="impact-card hedera">
            <h3>🤖 Hedera AI Decisions</h3>
            <div className="impact-stats">
              <div className="stat">
                <span className="stat-value">847</span>
                <span className="stat-label">Decisions Made</span>
              </div>
              <div className="stat">
                <span className="stat-value">94.2%</span>
                <span className="stat-label">Success Rate</span>
              </div>
              <div className="stat">
                <span className="stat-value">1.8s</span>
                <span className="stat-label">Avg Decision Time</span>
              </div>
            </div>
          </div>
          
          <div className="impact-card bsc">
            <h3>🤖 BSC AI Decisions</h3>
            <div className="impact-stats">
              <div className="stat">
                <span className="stat-value">623</span>
                <span className="stat-label">Decisions Made</span>
              </div>
              <div className="stat">
                <span className="stat-value">89.7%</span>
                <span className="stat-label">Success Rate</span>
              </div>
              <div className="stat">
                <span className="stat-value">12.3s</span>
                <span className="stat-label">Avg Decision Time</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Summary */}
      <section className="performance-summary">
        <h2>Performance Summary</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <h4>🚀 Speed Advantage</h4>
            <p>Hedera is <strong>8.4x faster</strong> than BSC for transaction processing</p>
          </div>
          <div className="summary-card">
            <h4>💡 Cost Efficiency</h4>
            <p>Hedera costs <strong>5000x less</strong> than BSC per transaction</p>
          </div>
          <div className="summary-card">
            <h4>🌱 Environmental Impact</h4>
            <p>Hedera is <strong>carbon negative</strong> while BSC has high energy consumption</p>
          </div>
          <div className="summary-card">
            <h4>🎯 AI Performance</h4>
            <p>Hedera AI decisions are <strong>4.6% more successful</strong> and <strong>6.8x faster</strong></p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ComparisonDashboard