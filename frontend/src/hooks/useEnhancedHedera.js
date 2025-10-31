/**
 * @fileoverview Enhanced Hedera Integration Hooks
 * @description React hooks for comprehensive Hedera blockchain integration with real data
 * @author AION Team
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { hederaAPI } from '../services/hederaAPI';

/**
 * Enhanced hook for Hedera network status with real-time updates
 */
export const useHederaStatus = (refreshInterval = 30000) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const intervalRef = useRef(null);

    const {
        data: status,
        isLoading,
        error,
        refetch: refreshStatus
    } = useQuery(
        'hederaStatus',
        async () => {
            const statusData = await hederaAPI.getNetworkStatus();
            setIsConnected(statusData?.isConnected || false);
            setLastUpdate(new Date());
            return statusData;
        },
        {
            refetchInterval: refreshInterval,
            refetchOnWindowFocus: true,
            staleTime: 10000, // 10 seconds
            cacheTime: 60000, // 1 minute
            onError: (err) => {
                console.error('Hedera status fetch failed:', err);
                setIsConnected(false);
            }
        }
    );

    // Real-time connection monitoring
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const result = await hederaAPI.ping();
                setIsConnected(result.success);
            } catch (error) {
                setIsConnected(false);
            }
        };

        // Check connection every 10 seconds
        intervalRef.current = setInterval(checkConnection, 10000);
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        status: {
            ...status,
            isConnected,
            lastUpdate
        },
        isLoading,
        error,
        refreshStatus,
        isConnected
    };
};

/**
 * Enhanced hook for Hedera token information with real-time metrics
 */
export const useHederaToken = () => {
    const queryClient = useQueryClient();

    const {
        data: tokenInfo,
        isLoading: tokenLoading,
        error: tokenError,
        refetch: refreshTokenInfo
    } = useQuery(
        'hederaTokenInfo',
        () => hederaAPI.getTokenInfo(),
        {
            staleTime: 60000, // 1 minute
            cacheTime: 300000, // 5 minutes
            refetchOnWindowFocus: false
        }
    );

    const {
        data: tokenMetrics,
        isLoading: metricsLoading,
        error: metricsError,
        refetch: refreshMetrics
    } = useQuery(
        'hederaTokenMetrics',
        () => hederaAPI.getTokenMetrics(),
        {
            refetchInterval: 30000, // 30 seconds
            staleTime: 15000, // 15 seconds
            cacheTime: 120000 // 2 minutes
        }
    );

    // Token operations mutations
    const mintTokenMutation = useMutation(
        ({ amount, recipient }) => hederaAPI.mintToken(amount, recipient),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('hederaTokenMetrics');
                queryClient.invalidateQueries('hederaTokenInfo');
            }
        }
    );

    const burnTokenMutation = useMutation(
        ({ amount }) => hederaAPI.burnToken(amount),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('hederaTokenMetrics');
                queryClient.invalidateQueries('hederaTokenInfo');
            }
        }
    );

    const transferTokenMutation = useMutation(
        ({ amount, recipient }) => hederaAPI.transferToken(amount, recipient),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('hederaTokenMetrics');
            }
        }
    );

    return {
        tokenInfo,
        tokenMetrics,
        isLoading: tokenLoading || metricsLoading,
        error: tokenError || metricsError,
        refreshTokenInfo: () => {
            refreshTokenInfo();
            refreshMetrics();
        },
        // Token operations
        mintToken: mintTokenMutation.mutate,
        burnToken: burnTokenMutation.mutate,
        transferToken: transferTokenMutation.mutate,
        isMinting: mintTokenMutation.isLoading,
        isBurning: burnTokenMutation.isLoading,
        isTransferring: transferTokenMutation.isLoading
    };
};

/**
 * Enhanced hook for AI decisions with real-time analytics
 */
export const useAIDecisions = (limit = 10) => {
    const queryClient = useQueryClient();

    const {
        data: decisions,
        isLoading: decisionsLoading,
        error: decisionsError,
        refetch: refreshDecisions
    } = useQuery(
        ['aiDecisions', limit],
        () => hederaAPI.getAIDecisions(limit),
        {
            refetchInterval: 15000, // 15 seconds
            staleTime: 10000, // 10 seconds
            cacheTime: 180000 // 3 minutes
        }
    );

    const {
        data: analytics,
        isLoading: analyticsLoading,
        error: analyticsError,
        refetch: refreshAnalytics
    } = useQuery(
        'aiAnalytics',
        () => hederaAPI.getAIAnalytics(),
        {
            refetchInterval: 60000, // 1 minute
            staleTime: 30000, // 30 seconds
            cacheTime: 300000 // 5 minutes
        }
    );

    // Log new AI decision mutation
    const logDecisionMutation = useMutation(
        (decisionData) => hederaAPI.logAIDecision(decisionData),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('aiDecisions');
                queryClient.invalidateQueries('aiAnalytics');
            }
        }
    );

    return {
        decisions: decisions || [],
        analytics,
        isLoading: decisionsLoading || analyticsLoading,
        error: decisionsError || analyticsError,
        refreshDecisions: () => {
            refreshDecisions();
            refreshAnalytics();
        },
        // Decision operations
        logDecision: logDecisionMutation.mutate,
        isLoggingDecision: logDecisionMutation.isLoading
    };
};

/**
 * Enhanced hook for Hedera transactions with real-time monitoring
 */
export const useHederaTransactions = (limit = 20) => {
    const {
        data: transactions,
        isLoading: transactionsLoading,
        error: transactionsError,
        refetch: refreshTransactions
    } = useQuery(
        ['hederaTransactions', limit],
        () => hederaAPI.getTransactions(limit),
        {
            refetchInterval: 20000, // 20 seconds
            staleTime: 15000, // 15 seconds
            cacheTime: 240000 // 4 minutes
        }
    );

    const {
        data: networkStats,
        isLoading: statsLoading,
        error: statsError,
        refetch: refreshStats
    } = useQuery(
        'hederaNetworkStats',
        () => hederaAPI.getNetworkStats(),
        {
            refetchInterval: 30000, // 30 seconds
            staleTime: 20000, // 20 seconds
            cacheTime: 180000 // 3 minutes
        }
    );

    return {
        transactions: transactions || [],
        networkStats,
        isLoading: transactionsLoading || statsLoading,
        error: transactionsError || statsError,
        refreshTransactions: () => {
            refreshTransactions();
            refreshStats();
        }
    };
};

/**
 * Hook for vault strategies with Hedera integration
 */
export const useStrategies = () => {
    const queryClient = useQueryClient();

    const {
        data: strategies,
        isLoading,
        error,
        refetch: refreshStrategies
    } = useQuery(
        'vaultStrategies',
        async () => {
            const [strategiesData, hederaMetrics] = await Promise.all([
                hederaAPI.getVaultStrategies(),
                hederaAPI.getTokenMetrics()
            ]);

            // Enhance strategies with Hedera data
            return strategiesData.map(strategy => ({
                ...strategy,
                hederaIntegration: {
                    tokenId: hederaMetrics?.tokenId,
                    totalSupply: hederaMetrics?.totalSupply,
                    holders: hederaMetrics?.totalHolders,
                    isHederaEnabled: true,
                    transactionCost: 0.0001, // USD
                    averageLatency: 2.1 // seconds
                }
            }));
        },
        {
            staleTime: 120000, // 2 minutes
            cacheTime: 300000, // 5 minutes
            refetchOnWindowFocus: false
        }
    );

    // Execute strategy mutation
    const executeStrategyMutation = useMutation(
        ({ strategyId, amount, params }) => 
            hederaAPI.executeStrategy(strategyId, amount, params),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('vaultStrategies');
                queryClient.invalidateQueries('hederaTokenMetrics');
                queryClient.invalidateQueries('aiDecisions');
            }
        }
    );

    return {
        strategies: strategies || [],
        isLoading,
        error,
        refreshStrategies,
        executeStrategy: executeStrategyMutation.mutate,
        isExecuting: executeStrategyMutation.isLoading
    };
};

/**
 * Hook for vault operations with Hedera integration
 */
export const useVault = () => {
    const queryClient = useQueryClient();

    const {
        data: vaultData,
        isLoading,
        error,
        refetch: refreshVault
    } = useQuery(
        'vaultData',
        async () => {
            const [vault, hederaStatus, tokenMetrics] = await Promise.all([
                hederaAPI.getVaultInfo(),
                hederaAPI.getNetworkStatus(),
                hederaAPI.getTokenMetrics()
            ]);

            return {
                ...vault,
                hederaIntegration: {
                    isConnected: hederaStatus?.isConnected || false,
                    tokenId: tokenMetrics?.tokenId,
                    totalValueLocked: tokenMetrics?.totalValueLocked,
                    networkLatency: hederaStatus?.networkInfo?.latency || 2.1,
                    transactionCost: 0.0001, // USD
                    uptime: hederaStatus?.networkInfo?.uptime || 99.8,
                    throughput: hederaStatus?.networkInfo?.tps || 10000
                }
            };
        },
        {
            refetchInterval: 45000, // 45 seconds
            staleTime: 30000, // 30 seconds
            cacheTime: 240000 // 4 minutes
        }
    );

    // Deposit mutation
    const depositMutation = useMutation(
        ({ amount, asset }) => hederaAPI.deposit(amount, asset),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('vaultData');
                queryClient.invalidateQueries('hederaTokenMetrics');
                queryClient.invalidateQueries('aiDecisions');
            }
        }
    );

    // Withdraw mutation
    const withdrawMutation = useMutation(
        ({ amount, asset }) => hederaAPI.withdraw(amount, asset),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('vaultData');
                queryClient.invalidateQueries('hederaTokenMetrics');
                queryClient.invalidateQueries('aiDecisions');
            }
        }
    );

    return {
        vault: vaultData,
        isLoading,
        error,
        refreshVault,
        deposit: depositMutation.mutate,
        withdraw: withdrawMutation.mutate,
        isDepositing: depositMutation.isLoading,
        isWithdrawing: withdrawMutation.isLoading
    };
};

/**
 * Hook for real-time performance monitoring
 */
export const usePerformanceMonitoring = () => {
    const [metrics, setMetrics] = useState({
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        uptime: 100
    });

    const {
        data: performanceData,
        isLoading,
        error
    } = useQuery(
        'performanceMetrics',
        () => hederaAPI.getPerformanceMetrics(),
        {
            refetchInterval: 10000, // 10 seconds
            staleTime: 5000, // 5 seconds
            onSuccess: (data) => {
                setMetrics(data);
            }
        }
    );

    return {
        metrics,
        isLoading,
        error,
        performanceData
    };
};

/**
 * Hook for cross-chain operations
 */
export const useCrossChain = () => {
    const queryClient = useQueryClient();

    const {
        data: bridgeStatus,
        isLoading,
        error
    } = useQuery(
        'crossChainBridge',
        () => hederaAPI.getBridgeStatus(),
        {
            refetchInterval: 30000, // 30 seconds
            staleTime: 20000 // 20 seconds
        }
    );

    // Bridge assets mutation
    const bridgeAssetsMutation = useMutation(
        ({ fromChain, toChain, asset, amount }) => 
            hederaAPI.bridgeAssets(fromChain, toChain, asset, amount),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('crossChainBridge');
                queryClient.invalidateQueries('vaultData');
                queryClient.invalidateQueries('hederaTokenMetrics');
            }
        }
    );

    return {
        bridgeStatus,
        isLoading,
        error,
        bridgeAssets: bridgeAssetsMutation.mutate,
        isBridging: bridgeAssetsMutation.isLoading
    };
};

/**
 * Hook for real-time diagnostics
 */
export const useDiagnostics = () => {
    const [diagnosticsHistory, setDiagnosticsHistory] = useState([]);

    const runDiagnosticsMutation = useMutation(
        () => hederaAPI.runDiagnostics(),
        {
            onSuccess: (data) => {
                setDiagnosticsHistory(prev => [
                    {
                        ...data,
                        timestamp: new Date().toISOString(),
                        id: Date.now()
                    },
                    ...prev.slice(0, 9) // Keep last 10 results
                ]);
            }
        }
    );

    return {
        runDiagnostics: runDiagnosticsMutation.mutate,
        isRunning: runDiagnosticsMutation.isLoading,
        lastResult: runDiagnosticsMutation.data,
        error: runDiagnosticsMutation.error,
        history: diagnosticsHistory
    };
};

// Export all hooks as a single object for easier importing
export const useHedera = {
    useHederaStatus,
    useHederaToken,
    useAIDecisions,
    useHederaTransactions,
    useStrategies,
    useVault,
    usePerformanceMonitoring,
    useCrossChain,
    useDiagnostics
};

// Export individual hooks
export {
    useHederaStatus,
    useHederaToken,
    useAIDecisions,
    useHederaTransactions,
    useStrategies,
    useVault,
    usePerformanceMonitoring,
    useCrossChain,
    useDiagnostics
};