import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';

// Real AI decisions will be fetched from API
// When no API data available, show empty state instead of fake data
const MOCK_DECISIONS = [];

export function AIDecisionHistory() {
  const [decisions, setDecisions] = useState(MOCK_DECISIONS);
  const [loading, setLoading] = useState(false);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from the API
      // const response = await fetch('/api/hedera/decisions');
      // const data = await response.json();
      // setDecisions(data);
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDecisions(MOCK_DECISIONS);
    } catch (error) {
      console.error('Failed to fetch AI decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'success':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'success':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-gray-400">Loading AI decisions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {decisions.map((decision, index) => (
        <motion.div
          key={decision.id}
          className="p-3 bg-dark-700/30 rounded-lg hover:bg-dark-600/50 transition-colors cursor-pointer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {getResultIcon(decision.result)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-white truncate">
                  {decision.action}
                </h4>
                <span className={`text-xs ${getResultColor(decision.result)}`}>
                  {decision.yield}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">
                  {decision.strategy}
                </span>
                <span className="text-xs text-blue-400">
                  {Math.round(decision.confidence * 100)}% confidence
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(decision.timestamp)}
                </span>
                <span className="text-xs text-purple-400 font-mono">
                  HCS: {decision.hcsTransactionId.split('@')[0]}
                </span>
              </div>
            </div>
          </div>
          
          {/* Confidence Bar */}
          <div className="mt-2">
            <div className="w-full bg-dark-600 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${decision.confidence * 100}%` }}
              />
            </div>
          </div>
        </motion.div>
      ))}
      
      {decisions.length === 0 && (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-2">No AI decisions found</p>
          <p className="text-gray-500 text-xs">AI decision history will appear here</p>
        </div>
      )}
      
      <div className="pt-3 border-t border-dark-600">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-gray-400">Logged to Hedera HCS</span>
          </div>
          <button 
            onClick={fetchDecisions}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}