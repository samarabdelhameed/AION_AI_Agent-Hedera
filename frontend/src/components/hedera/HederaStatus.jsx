/**
 * @fileoverview Hedera Status Component with Real Data
 * @description Real-time Hedera network status and service health monitoring
 * @author AION Team
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle,
    Badge,
    Progress,
    Alert,
    AlertDescription,
    Skeleton
} from '@/components/ui';
import { 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    Activity,
    Network,
    Clock,
    Zap,
    Database,
    TrendingUp
} from 'lucide-react';
import { useHederaStatus } from '@/hooks/useHedera';
import { formatNumber, formatDuration, formatBytes } from '@/utils/formatters';

/**
 * Hedera Status Component
 */
const HederaStatus = ({ 
    refreshInterval = 30000, 
    showDetails = true,
    compact = false 
}) => {
    const {
        status,
        metrics,
        isLoading,
        error,
        lastUpdated,
        refreshStatus
    } = useHederaStatus(refreshInterval);

    const [expandedSections, setExpandedSections] = useState({
        network: true,
        services: true,
        performance: false,
        transactions: false
    });

    // Real-time status indicators
    const getStatusColor = useCallback((isHealthy, isConnected = true) => {
        if (!isConnected) return 'destructive';
        return isHealthy ? 'success' : 'warning';
    }, []);

    const getStatusIcon = useCallback((isHealthy, isConnected = true) => {
        if (!isConnected) return <XCircle className="h-4 w-4" />;
        if (isHealthy) return <CheckCircle className="h-4 w-4" />;
        return <AlertTriangle className="h-4 w-4" />;
    }, []);

    // Toggle section expansion
    const toggleSection = useCallback((section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    }, []);

    // Loading state
    if (isLoading && !status) {
        return (
            <Card className={compact ? "w-full" : "w-full max-w-4xl"}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Network className="h-5 w-5" />
                        Hedera Network Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card className={compact ? "w-full" : "w-full max-w-4xl"}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-5 w-5" />
                        Hedera Status Error
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load Hedera status: {error.message}
                        </AlertDescription>
                    </Alert>
                    <button 
                        onClick={refreshStatus}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={compact ? "w-full" : "w-full max-w-4xl"}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Network className="h-5 w-5" />
                        Hedera Network Status
                        <Badge 
                            variant={getStatusColor(status?.isConnected, status?.isConnected)}
                            className="ml-2"
                        >
                            {status?.isConnected ? 'Connected' : 'Disconnected'}
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {lastUpdated && `Updated ${formatDuration(Date.now() - lastUpdated)} ago`}
                        <button 
                            onClick={refreshStatus}
                            className="p-1 hover:bg-muted rounded"
                            disabled={isLoading}
                        >
                            <Activity className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Network Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className={`p-2 rounded-full ${status?.isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {getStatusIcon(status?.isConnected, status?.isConnected)}
                        </div>
                        <div>
                            <p className="font-medium">Network</p>
                            <p className="text-sm text-muted-foreground">
                                {status?.network || 'Unknown'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                            <Database className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-medium">Operator</p>
                            <p className="text-sm text-muted-foreground font-mono">
                                {status?.operatorId || 'Not Set'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-medium">Uptime</p>
                            <p className="text-sm text-muted-foreground">
                                {metrics?.uptime ? formatDuration(metrics.uptime) : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Services Status */}
                {showDetails && (
                    <div className="space-y-4">
                        <button
                            onClick={() => toggleSection('services')}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <h3 className="text-lg font-semibold">Hedera Services</h3>
                            <span className={`transform transition-transform ${expandedSections.services ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>

                        {expandedSections.services && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* HCS Status */}
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Consensus Service (HCS)</h4>
                                        <Badge variant={getStatusColor(status?.services?.hcs)}>
                                            {status?.services?.hcs ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Topic ID:</span>
                                            <span className="font-mono">{status?.hcsTopicId || 'Not Set'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Messages:</span>
                                            <span>{formatNumber(metrics?.hcs?.totalMessages || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Success Rate:</span>
                                            <span>{((metrics?.hcs?.successRate || 0) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* HTS Status */}
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Token Service (HTS)</h4>
                                        <Badge variant={getStatusColor(status?.services?.hts)}>
                                            {status?.services?.hts ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Token ID:</span>
                                            <span className="font-mono">{status?.htsTokenId || 'Not Set'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Operations:</span>
                                            <span>{formatNumber(metrics?.hts?.totalOperations || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Success Rate:</span>
                                            <span>{((metrics?.hts?.successRate || 0) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* HFS Status */}
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">File Service (HFS)</h4>
                                        <Badge variant={getStatusColor(status?.services?.hfs)}>
                                            {status?.services?.hfs ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Files Stored:</span>
                                            <span>{formatNumber(metrics?.hfs?.totalFiles || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Storage Used:</span>
                                            <span>{formatBytes(metrics?.hfs?.storageUsed || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Success Rate:</span>
                                            <span>{((metrics?.hfs?.successRate || 0) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Performance Metrics */}
                {showDetails && (
                    <div className="space-y-4">
                        <button
                            onClick={() => toggleSection('performance')}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <h3 className="text-lg font-semibold">Performance Metrics</h3>
                            <span className={`transform transition-transform ${expandedSections.performance ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>

                        {expandedSections.performance && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium">Average Latency</span>
                                            <span className="text-sm">{metrics?.averageLatency || 0}ms</span>
                                        </div>
                                        <Progress 
                                            value={Math.min((metrics?.averageLatency || 0) / 10, 100)} 
                                            className="h-2"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium">Success Rate</span>
                                            <span className="text-sm">{((metrics?.successRate || 0) * 100).toFixed(1)}%</span>
                                        </div>
                                        <Progress 
                                            value={(metrics?.successRate || 0) * 100} 
                                            className="h-2"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium">Memory Usage</span>
                                            <span className="text-sm">{formatBytes(metrics?.memoryUsage || 0)}</span>
                                        </div>
                                        <Progress 
                                            value={Math.min((metrics?.memoryUsage || 0) / (1024 * 1024 * 1024) * 100, 100)} 
                                            className="h-2"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium">CPU Usage</span>
                                            <span className="text-sm">{((metrics?.cpuUsage || 0) * 100).toFixed(1)}%</span>
                                        </div>
                                        <Progress 
                                            value={(metrics?.cpuUsage || 0) * 100} 
                                            className="h-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Recent Transactions */}
                {showDetails && (
                    <div className="space-y-4">
                        <button
                            onClick={() => toggleSection('transactions')}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <h3 className="text-lg font-semibold">Recent Activity</h3>
                            <span className={`transform transition-transform ${expandedSections.transactions ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>

                        {expandedSections.transactions && (
                            <div className="space-y-2">
                                {metrics?.recentTransactions?.length > 0 ? (
                                    metrics.recentTransactions.slice(0, 5).map((tx, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${tx.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div>
                                                    <p className="text-sm font-medium">{tx.type}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(tx.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-mono">{tx.transactionId}</p>
                                                <p className="text-xs text-muted-foreground">{tx.duration}ms</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No recent transactions</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Compact View Summary */}
                {compact && (
                    <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {metrics?.averageLatency || 0}ms
                            </span>
                            <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {((metrics?.successRate || 0) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <Badge variant={getStatusColor(status?.isConnected, status?.isConnected)}>
                            {status?.network || 'Unknown'}
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default HederaStatus;