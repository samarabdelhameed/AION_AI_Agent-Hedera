/**
 * @fileoverview AI Decision History Component with Real Hedera Data
 * @description Real-time AI decision tracking and analysis with Hedera HCS integration
 * @author AION Team
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle,
    Badge,
    Progress,
    Alert,
    AlertDescription,
    Skeleton,
    Button
} from '@/components/ui';
import { 
    Brain, 
    TrendingUp, 
    TrendingDown,
    Target,
    Activity,
    Clock,
    ExternalLink,
    Filter,
    RefreshCw,
    Zap,
    CheckCircle,
    XCircle,
    AlertTriangle,
    BarChart3,
    PieChart,
    Calendar,
    Search,
    Download
} from 'lucide-react';
import { useAIDecisions } from '@/hooks/useHedera';
import { formatNumber, formatDuration, formatCurrency } from '@/utils/formatters';

/**
 * AI Decision History Component
 */
const AIDecisionHistory = ({ 
    maxDecisions = 50,
    showAnalytics = true,
    compact = false,
    filters: initialFilters = {}
}) => {
    const [filters, setFilters] = useState({
        type: '',
        outcome: '',
        timeRange: '7d',
        minConfidence: 0,
        ...initialFilters
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDecision, setSelectedDecision] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const {
        decisions,
        pagination,
        isLoading,
        error,
        logDecision,
        refetch
    } = useAIDecisions({ ...filters, limit: maxDecisions });

    // Filter decisions based on search term
    const filteredDecisions = useMemo(() => {
        if (!searchTerm) return decisions;
        
        return decisions.filter(decision => 
            decision.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            decision.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            decision.reasoning.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [decisions, searchTerm]);

    // Calculate analytics
    const analytics = useMemo(() => {
        if (!decisions.length) return null;

        const totalDecisions = decisions.length;
        const successfulDecisions = decisions.filter(d => d.outcome === 'success').length;
        const pendingDecisions = decisions.filter(d => d.outcome === 'pending').length;
        const failedDecisions = decisions.filter(d => d.outcome === 'failed').length;
        
        const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / totalDecisions;
        
        const typeDistribution = decisions.reduce((acc, d) => {
            acc[d.type] = (acc[d.type] || 0) + 1;
            return acc;
        }, {});

        const confidenceDistribution = {
            high: decisions.filter(d => d.confidence >= 0.8).length,
            medium: decisions.filter(d => d.confidence >= 0.6 && d.confidence < 0.8).length,
            low: decisions.filter(d => d.confidence < 0.6).length
        };

        const recentTrend = decisions.slice(0, 10).filter(d => d.outcome === 'success').length / Math.min(10, totalDecisions);

        return {
            totalDecisions,
            successfulDecisions,
            pendingDecisions,
            failedDecisions,
            successRate: totalDecisions > 0 ? (successfulDecisions / totalDecisions) * 100 : 0,
            avgConfidence: avgConfidence * 100,
            typeDistribution,
            confidenceDistribution,
            recentTrend: recentTrend * 100
        };
    }, [decisions]);

    // Get decision icon
    const getDecisionIcon = useCallback((type) => {
        const iconMap = {
            'investment': <TrendingUp className="h-4 w-4" />,
            'rebalance': <Target className="h-4 w-4" />,
            'risk_management': <AlertTriangle className="h-4 w-4" />,
            'yield_optimization': <Zap className="h-4 w-4" />,
            'market_analysis': <BarChart3 className="h-4 w-4" />,
            'portfolio_adjustment': <PieChart className="h-4 w-4" />
        };
        return iconMap[type] || <Brain className="h-4 w-4" />;
    }, []);

    // Get outcome badge
    const getOutcomeBadge = useCallback((outcome) => {
        const badgeMap = {
            'success': <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Success
            </Badge>,
            'failed': <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Failed
            </Badge>,
            'pending': <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
            </Badge>
        };
        return badgeMap[outcome] || <Badge variant="secondary">Unknown</Badge>;
    }, []);

    // Get confidence color
    const getConfidenceColor = useCallback((confidence) => {
        if (confidence >= 0.8) return 'text-green-400';
        if (confidence >= 0.6) return 'text-yellow-400';
        return 'text-red-400';
    }, []);

    // Handle filter change
    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    // Clear filters
    const clearFilters = useCallback(() => {
        setFilters({
            type: '',
            outcome: '',
            timeRange: '7d',
            minConfidence: 0
        });
        setSearchTerm('');
    }, []);

    // Export decisions
    const exportDecisions = useCallback(() => {
        const csvContent = [
            ['Timestamp', 'Type', 'Action', 'Confidence', 'Outcome', 'Reasoning'].join(','),
            ...filteredDecisions.map(d => [
                new Date(d.timestamp).toISOString(),
                d.type,
                d.action,
                (d.confidence * 100).toFixed(1) + '%',
                d.outcome,
                `"${d.reasoning.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-decisions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filteredDecisions]);

    // Loading state
    if (isLoading && !decisions.length) {
        return (
            <Card className={compact ? "w-full" : "w-full max-w-6xl"}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        AI Decision History
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
            <Card className={compact ? "w-full" : "w-full max-w-6xl"}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        AI Decision History Error
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load AI decisions: {error.message}
                        </AlertDescription>
                    </Alert>
                    <Button 
                        onClick={refetch}
                        className="mt-4"
                        variant="outline"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={compact ? "w-full" : "w-full max-w-6xl"}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        AI Decision History
                        <Badge variant="secondary" className="ml-2">
                            {filteredDecisions.length} decisions
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={exportDecisions}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={refetch}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search decisions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        {(searchTerm || Object.values(filters).some(v => v !== '' && v !== 0)) && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={clearFilters}
                            >
                                Clear
                            </Button>
                        )}
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/20 rounded-lg"
                            >
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                                    <select
                                        value={filters.type}
                                        onChange={(e) => handleFilterChange('type', e.target.value)}
                                        className="w-full p-2 bg-muted/30 border border-muted rounded text-sm"
                                    >
                                        <option value="">All Types</option>
                                        <option value="investment">Investment</option>
                                        <option value="rebalance">Rebalance</option>
                                        <option value="risk_management">Risk Management</option>
                                        <option value="yield_optimization">Yield Optimization</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Outcome</label>
                                    <select
                                        value={filters.outcome}
                                        onChange={(e) => handleFilterChange('outcome', e.target.value)}
                                        className="w-full p-2 bg-muted/30 border border-muted rounded text-sm"
                                    >
                                        <option value="">All Outcomes</option>
                                        <option value="success">Success</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Time Range</label>
                                    <select
                                        value={filters.timeRange}
                                        onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                                        className="w-full p-2 bg-muted/30 border border-muted rounded text-sm"
                                    >
                                        <option value="1d">Last 24 hours</option>
                                        <option value="7d">Last 7 days</option>
                                        <option value="30d">Last 30 days</option>
                                        <option value="90d">Last 90 days</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Confidence</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={filters.minConfidence * 100}
                                        onChange={(e) => handleFilterChange('minConfidence', e.target.value / 100)}
                                        className="w-full"
                                    />
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {(filters.minConfidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Analytics Dashboard */}
                {showAnalytics && analytics && !compact && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-300">Success Rate</span>
                                <CheckCircle className="h-4 w-4 text-green-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{analytics.successRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">
                                {analytics.successfulDecisions}/{analytics.totalDecisions} successful
                            </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-300">Avg Confidence</span>
                                <Target className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{analytics.avgConfidence.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">
                                Across all decisions
                            </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-purple-300">Recent Trend</span>
                                <TrendingUp className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{analytics.recentTrend.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">
                                Last 10 decisions
                            </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-orange-300">Pending</span>
                                <Clock className="h-4 w-4 text-orange-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{analytics.pendingDecisions}</div>
                            <div className="text-xs text-muted-foreground">
                                Awaiting outcome
                            </div>
                        </div>
                    </div>
                )}

                {/* Decision List */}
                <div className="space-y-3">
                    {filteredDecisions.length > 0 ? (
                        <AnimatePresence>
                            {filteredDecisions.map((decision, index) => (
                                <motion.div
                                    key={decision.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-primary/30"
                                    onClick={() => setSelectedDecision(selectedDecision?.id === decision.id ? null : decision)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                                                {getDecisionIcon(decision.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-medium text-white capitalize">
                                                        {decision.type.replace('_', ' ')}
                                                    </h4>
                                                    <Badge variant="outline" className="text-xs">
                                                        {decision.action}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                    {decision.reasoning}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDuration(Date.now() - new Date(decision.timestamp).getTime())} ago
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Target className="h-3 w-3" />
                                                        <span className={getConfidenceColor(decision.confidence)}>
                                                            {(decision.confidence * 100).toFixed(1)}% confidence
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getOutcomeBadge(decision.outcome)}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {selectedDecision?.id === decision.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4 pt-4 border-t border-muted"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="font-medium text-white mb-2">Decision Context</h5>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Decision ID:</span>
                                                                <span className="font-mono">{decision.id}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Timestamp:</span>
                                                                <span>{new Date(decision.timestamp).toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Confidence:</span>
                                                                <span className={getConfidenceColor(decision.confidence)}>
                                                                    {(decision.confidence * 100).toFixed(2)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h5 className="font-medium text-white mb-2">Outcome Details</h5>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Status:</span>
                                                                {getOutcomeBadge(decision.outcome)}
                                                            </div>
                                                            {decision.outcome === 'success' && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Impact:</span>
                                                                    <span className="text-green-400">+2.3% portfolio</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">HCS Record:</span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-6 text-xs"
                                                                >
                                                                    View on Hedera
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <h5 className="font-medium text-white mb-2">Full Reasoning</h5>
                                                    <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded">
                                                        {decision.reasoning}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="text-center py-12">
                            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No AI Decisions Found</h3>
                            <p className="text-muted-foreground mb-4">
                                {searchTerm || Object.values(filters).some(v => v !== '' && v !== 0)
                                    ? 'Try adjusting your search or filters'
                                    : 'AI decisions will appear here as they are made'
                                }
                            </p>
                            {(searchTerm || Object.values(filters).some(v => v !== '' && v !== 0)) && (
                                <Button onClick={clearFilters} variant="outline">
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination && pagination.hasMore && (
                    <div className="flex justify-center pt-4">
                        <Button
                            onClick={() => {/* Load more logic */}}
                            variant="outline"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Load More Decisions'}
                        </Button>
                    </div>
                )}

                {/* Real-time Status */}
                <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span>Real-time AI decision tracking via Hedera HCS</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <span>
                            {filteredDecisions.length} of {pagination?.total || decisions.length} decisions shown
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default AIDecisionHistory;