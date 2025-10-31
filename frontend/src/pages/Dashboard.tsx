import React, { useState, useEffect } from 'react'

const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/health')
        const data = await response.json()
        setStatus(data)
      } catch (error) {
        console.error('Failed to fetch status:', error)
        setStatus({ error: 'Failed to connect to API' })
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div className="dashboard">
      <h2>AION Dashboard</h2>
      <div className="status-card">
        <h3>System Status</h3>
        {status?.error ? (
          <div className="error">❌ {status.error}</div>
        ) : (
          <div className="success">✅ System Online</div>
        )}
      </div>
      
      <div className="features">
        <div className="feature-card">
          <h4>🤖 AI Agent</h4>
          <p>Intelligent decision making for optimal yield strategies</p>
        </div>
        
        <div className="feature-card">
          <h4>🏦 Vault Operations</h4>
          <p>Secure deposit and withdrawal management</p>
        </div>
        
        <div className="feature-card">
          <h4>⚡ Hedera Integration</h4>
          <p>Fast and efficient blockchain operations</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard