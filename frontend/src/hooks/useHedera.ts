import { useState, useEffect, useCallback } from 'react';

const HEDERA_API_BASE = process.env.REACT_APP_MCP_AGENT_URL || 'http://localhost:3001';

export function useHedera() {
  const [status, setStatus] = useState(null);
  const [balance, setBalance] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHederaStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Hedera status
      const statusResponse = await fetch(`${HEDERA_API_BASE}/api/hedera/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);
        setIsConnected(statusData.isConnected || false);
      }

      // Fetch account balance
      const balanceResponse = await fetch(`${HEDERA_API_BASE}/api/hedera/balance`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData);
      }

      // Fetch token info
      const tokenResponse = await fetch(`${HEDERA_API_BASE}/api/hedera/token/info`);
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        setTokenInfo(tokenData);
      }

    } catch (err) {
      console.error('Failed to fetch Hedera data:', err);
      setError(err.message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchHederaStatus();
  }, [fetchHederaStatus]);

  // Submit message to HCS
  const submitToHCS = useCallback(async (message, topicId) => {
    try {
      setLoading(true);
      const response = await fetch(`${HEDERA_API_BASE}/api/hedera/hcs/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          topicId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit HCS message');
      }

      const result = await response.json();
      
      // Refresh status after successful submission
      setTimeout(() => {
        fetchHederaStatus();
      }, 1000);

      return result;
    } catch (err) {
      console.error('Failed to submit HCS message:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchHederaStatus]);

  // Mint HTS tokens
  const mintTokens = useCallback(async (amount, tokenId) => {
    try {
      setLoading(true);
      const response = await fetch(`${HEDERA_API_BASE}/api/hedera/hts/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          tokenId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to mint tokens');
      }

      const result = await response.json();
      
      // Refresh token info after successful mint
      setTimeout(() => {
        fetchHederaStatus();
      }, 1000);

      return result;
    } catch (err) {
      console.error('Failed to mint tokens:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchHederaStatus]);

  // Create HFS file
  const createFile = useCallback(async (content, memo) => {
    try {
      setLoading(true);
      const response = await fetch(`${HEDERA_API_BASE}/api/hedera/hfs/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          memo
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create file');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Failed to create file:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    fetchHederaStatus();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchHederaStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchHederaStatus]);

  return {
    status,
    balance,
    tokenInfo,
    isConnected,
    loading,
    error,
    refresh,
    submitToHCS,
    mintTokens,
    createFile
  };
}