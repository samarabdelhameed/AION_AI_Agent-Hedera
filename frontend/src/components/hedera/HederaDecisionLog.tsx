/**
 * Hedera Decision Log - Shows AI decisions logged on HCS
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, CheckCircle, Clock, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useHederaDecisions } from '../../hooks/useHedera';

interface HederaDecisionLogProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export function HederaDecisionLog({ 
  limit = 10, 
  showHeader = true, 
  compact = false,
  className = '' 
}: HederaDecisionLogProps) {
  const { decisions, loading, refresh } = useHederaDecisions({ limit });

  const getDecisionIcon = (type: string) => {
    switch (type) {
      case 'rebalance':
        return TrendingUp;
      case 'risk_alert':
        return AlertCircle;
      default:
        return Brain;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && <h3 className="text-lg font-semibold text-white mb-4">AI Decision Log (HCS)</h3>}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-dark-700/30 rounded-lg animate-pulse">
              <div className="h-4 bg-dark-600 rounded w-3/4 mb-2" />
              <div className="h-3 bg-dark-600 rounded w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">AI Decision Log</h3>
              <p className="text-xs text-gray-400">Logged on Hedera Consensus Service</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={refresh}>
            Refresh
          </Button>
        </div>
      )}
      
      <div className={`space-y-2 ${compact ? 'max-h-64 overflow-y-auto' : ''}`}>
        {decisions.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No AI decisions logged yet</p>
          </div>
        ) : (
          decisions.map((decision, index) => {
            const Icon = getDecisionIcon(decision.type);
            return (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Icon className="w-4 h-4 text-purple-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white capitalize">
                        {decision.type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-bold ${getConfidenceColor(decision.confidence)}`}>
                        {(decision.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {decision.action}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(decision.timestamp).toLocaleString()}
                      </div>
                      
                      {decision.hcsMessageId && (
                        <div className="flex items-center gap-1 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle className="w-3 h-3" />
                          <span>HCS</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    {decision.reasoning && !compact && (
                      <div className="mt-2 pt-2 border-t border-purple-500/20">
                        <p className="text-xs text-gray-400 italic">
                          "{decision.reasoning}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      
      {!compact && decisions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-dark-600">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-gray-400">
                Real-time logging to Hedera Consensus Service
              </span>
            </div>
            <span className="text-purple-400">
              {decisions.length} decisions
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default HederaDecisionLog;

