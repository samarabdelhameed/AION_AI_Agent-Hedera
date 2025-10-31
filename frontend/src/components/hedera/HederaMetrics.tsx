/**
 * Hedera Metrics - Shows Hedera blockchain metrics and stats
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Database, Activity, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { useHederaStatus, useHederaAnalytics } from '../../hooks/useHedera';

interface HederaMetricsProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export function HederaMetrics({ className = '', variant = 'full' }: HederaMetricsProps) {
  const { status, loading: statusLoading } = useHederaStatus();
  const { analytics, loading: analyticsLoading } = useHederaAnalytics();

  const loading = statusLoading || analyticsLoading;

  if (loading) {
    return (
      <Card className={className}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-dark-600 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-dark-700/30 rounded-lg">
                <div className="h-4 bg-dark-600 rounded mb-2" />
                <div className="h-8 bg-dark-600 rounded" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const metrics = status?.metrics || {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    averageResponseTime: 0
  };

  const successRate = metrics.totalTransactions > 0 
    ? ((metrics.successfulTransactions / metrics.totalTransactions) * 100).toFixed(1)
    : '0';

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-purple-500" />
          <div>
            <h3 className="text-lg font-semibold text-white">Hedera Network Stats</h3>
            <p className="text-xs text-gray-400">Real-time blockchain metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-purple-300 font-medium">{status?.network || 'testnet'}</span>
        </div>
      </div>

      <div className={`grid ${variant === 'full' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-3`}>
        <MetricCard
          icon={Activity}
          label="Total Transactions"
          value={metrics.totalTransactions.toLocaleString()}
          color="blue"
        />
        
        <MetricCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${successRate}%`}
          color="green"
        />
        
        <MetricCard
          icon={Zap}
          label="Avg Response"
          value={`${metrics.averageResponseTime.toFixed(0)}ms`}
          color="yellow"
        />
        
        <MetricCard
          icon={Database}
          label="Services Active"
          value={[
            status?.services.hcs && 'HCS',
            status?.services.hts && 'HTS',
            status?.services.hfs && 'HFS'
          ].filter(Boolean).length.toString() + '/3'}
          color="purple"
        />
      </div>

      {variant === 'full' && (
        <div className="mt-4 pt-4 border-t border-dark-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {status?.services.hcs ? '✓' : '×'}
              </div>
              <div className="text-xs text-gray-400 mt-1">HCS</div>
              <div className="text-xs text-gray-500">Consensus Service</div>
            </div>
            
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {status?.services.hts ? '✓' : '×'}
              </div>
              <div className="text-xs text-gray-400 mt-1">HTS</div>
              <div className="text-xs text-gray-500">Token Service</div>
            </div>
            
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {status?.services.hfs ? '✓' : '×'}
              </div>
              <div className="text-xs text-gray-400 mt-1">HFS</div>
              <div className="text-xs text-gray-500">File Service</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400'
  };

  return (
    <motion.div
      className={`p-3 border rounded-lg ${colorClasses[color]}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </motion.div>
  );
}

export default HederaMetrics;

