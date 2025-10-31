import React, { useState, useEffect } from 'react'

const HederaIntegration: React.FC = () => {
  const [hederaStatus, setHederaStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHederaStatus = async () => {
      try {
        const response = await fetch('/api/hedera/status')
        const data = await response.json()
        setHederaStatus(data)
      } catch (error) {
        console.error('Failed to fetch Hedera status:', error)
        setHederaStatus({ error: 'Failed to connect to Hedera services' })
      } finally {
        setLoading(false)
      }
    }

    fetchHederaStatus()
  }, [])

  if (loading) {
    return <div className="loading">Loading Hedera integration...</div>
  }

  return (
    <div className="hedera-integration">
      <h2>Hedera Integration</h2>
      
      <div className="hedera-services">
        <div className="service-card">
          <h3>🔗 HCS (Consensus Service)</h3>
          <p>AI decision logging and audit trail</p>
          <div className="status">
            {hederaStatus?.hcs ? '✅ Active' : '❌ Inactive'}
          </div>
        </div>
        
        <div className="service-card">
          <h3>📁 HFS (File Service)</h3>
          <p>Model metadata storage and versioning</p>
          <div className="status">
            {hederaStatus?.hfs ? '✅ Active' : '❌ Inactive'}
          </div>
        </div>
        
        <div className="service-card">
          <h3>🪙 HTS (Token Service)</h3>
          <p>Share token minting and management</p>
          <div className="status">
            {hederaStatus?.hts ? '✅ Active' : '❌ Inactive'}
          </div>
        </div>
        
        <div className="service-card">
          <h3>📜 HSCS (Smart Contract Service)</h3>
          <p>Vault contract interactions</p>
          <div className="status">
            {hederaStatus?.hscs ? '✅ Active' : '❌ Inactive'}
          </div>
        </div>
      </div>
      
      <div className="network-info">
        <h3>Network Information</h3>
        <p><strong>Network:</strong> testnet</p>
        <p><strong>Explorer:</strong> <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer">HashScan</a></p>
      </div>
    </div>
  )
}

export default HederaIntegration