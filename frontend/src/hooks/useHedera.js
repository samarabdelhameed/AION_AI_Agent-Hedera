/**
 * @fileoverview Hedera Integration Hook with Real Data
 * @description Custom React hook for real-time Hedera blockchain data integration
 * @author AION Team
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { hederaAPI } from '@/services/api';

/**
 * Custom hook for Hedera status and real-time data
 */
export const useHederaStatus = (refreshInterval = 30000) => {
    const [status, setStatus] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const intervalRef = useRef(null);

    // Fetch Hedera status from API
    const fetchStatus = useCallback(async () => {
        try {
            setError(null);
            
            // Fetch status and metrics in parallel
            const [statusResponse, metricsResponse] = await Promise.all([
                hederaAPI.getStatus(),
                hederaAPI.getMetrics()
            ]);

            if (statusResponse.success) {
                setStatus(statusResponse.data);
            }

            if (metricsResponse.success) {
                setMetrics(metricsResponse.data);
            }

            setLastUpdated(Date.now());
        } catch (err) {
            console.error('Failed to fetch Hedera status:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Manual refresh function
    const refreshStatus = useCallback(async () => {
        setIsLoading(true);
        await fetchStatus();
    }, [fetchStatus]);

    // Setup auto-refresh
    useEffect(() => {
        // Initial fetch
        fetchStatus();

        // Setup interval for auto-refresh
        if (refreshInterval > 0) {
            intervalRef.current = setInterval(fetchStatus, refreshInterval);
        }

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchStatus, refreshInterval]);

    return {
        status,
        metrics,
        isLoading,
        error,
        lastUpdated,
        refreshStatus
    };
};

/**
 * Custom hook for Hedera token information
 */
export const useHederaToken = (tokenId) => {
    const [tokenInfo, setTokenInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTokenInfo = useCallback(async () => {
        if (!tokenId) return;

        try {
            setIsLoading(true);
            setError(null);

            const response = await hederaAPI.getTokenInfo(tokenId);
            
            if (response.success) {
                setTokenInfo(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch token info');
            }
        } catch (err) {
            console.error('Failed to fetch token info:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [tokenId]);

    useEffect(() => {
        fetchTokenInfo();
    }, [fetchTokenInfo]);

    return {
        tokenInfo,
        isLoading,
        error,
        refetch: fetchTokenInfo
    };
};

/**
 * Custom hook for AI decisions with real-time updates
 */
export const useAIDecisions = (filters = {}, refreshInterval = 60000) => {
    const [decisions, setDecisions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    const intervalRef = useRef(null);

    const fetchDecisions = useCallback(async () => {
        try {
            setError(null);
            
            const response = await hederaAPI.getDecisions(filters);
            
            if (response.success) {
                setDecisions(response.data.decisions);
                setPagination(response.data.pagination);
            } else {
                throw new Error(response.error || 'Failed to fetch decisions');
            }
        } catch (err) {
            console.error('Failed to fetch AI decisions:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Log new AI decision
    const logDecision = useCallback(async (decisionData) => {
        try {
            const response = await hederaAPI.logDecision(decisionData);
            
            if (response.success) {
                // Refresh decisions list
                await fetchDecisions();
                return response.data.decisionId;
            } else {
                throw new Error(response.error || 'Failed to log decision');
            }
        } catch (err) {
            console.error('Failed to log decision:', err);
            throw err;
        }
    }, [fetchDecisions]);

    useEffect(() => {
        fetchDecisions();

        if (refreshInterval > 0) {
            intervalRef.current = setInterval(fetchDecisions, refreshInterval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchDecisions, refreshInterval]);

    return {
        decisions,
        pagination,
        isLoading,
        error,
        logDecision,
        refetch: fetchDecisions
    };
};

/**
 * Custom hook for real-time Hedera transactions
 */
export const useHederaTransactions = (limit = 10) => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTransactions = useCallback(async () => {
        try {
            setError(null);
            
            // This would integrate with Mirror Node API in production
            // For now, we'll use our API that aggregates transaction data
            const response = await hederaAPI.getRecentTransactions(limit);
            
            if (response.success) {
                setTransactions(response.data.transactions);
            }
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchTransactions();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchTransactions, 30000);
        
        return () => clearInterval(interval);
    }, [fetchTransactions]);

    return {
        transactions,
        isLoading,
        error,
        refetch: fetchTransactions
    };
};

/**
 * Custom hook for Hedera network statistics
 */
export const useHederaNetworkStats = () => {
    const [networkStats, setNetworkStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNetworkStats = useCallback(async () => {
        try {
            setError(null);
            
            // Fetch comprehensive network statistics
            const response = await hederaAPI.getNetworkStats();
            
            if (response.success) {
                setNetworkStats(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch network stats:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNetworkStats();
        
        // Refresh every 5 minutes
        const interval = setInterval(fetchNetworkStats, 300000);
        
        return () => clearInterval(interval);
    }, [fetchNetworkStats]);

    return {
        networkStats,
        isLoading,
        error,
        refetch: fetchNetworkStats
    };
};