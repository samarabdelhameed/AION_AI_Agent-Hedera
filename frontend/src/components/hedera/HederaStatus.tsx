import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react';

interface HederaStatusProps {
  status: any;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
}

export function HederaStatus({ status, isConnected, loading, error }: HederaStatusProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-gray-400">Connecting to Hedera...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-300">Connection Error</span>
        </div>
        <p className="text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <motion.div
        className={`p-3 rounded-lg border ${
          isConnected 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm font-medium text-white">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          Network: {status?.network || 'Unknown'}
        </div>
        {status?.operatorId && (
          <div className="text-xs text-gray-400">
            Account: {status.operatorId}
          </div>
        )}
      </motion.div>

      {/* Services Status */}
      {status?.services && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Services</h4>
          
          {/* HCS Status */}
          <div className="flex items-center justify-between p-2 bg-dark-700/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status.services.hcs?.enabled ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-300">HCS (Consensus)</span>
            </div>
            <span className="text-xs text-gray-400">
              {status.services.hcs?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* HTS Status */}
          <div className="flex items-center justify-between p-2 bg-dark-700/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status.services.hts?.enabled ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-300">HTS (Token)</span>
            </div>
            <span className="text-xs text-gray-400">
              {status.services.hts?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* HFS Status */}
          <div className="flex items-center justify-between p-2 bg-dark-700/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status.services.hfs?.enabled ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-300">HFS (File)</span>
            </div>
            <span className="text-xs text-gray-400">
              {status.services.hfs?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      )}

      {/* Metrics */}
      {status?.metrics && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Performance</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Transactions:</span>
              <span className="text-white ml-1">{status.metrics.totalTransactions || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Success Rate:</span>
              <span className="text-green-400 ml-1">
                {status.metrics.successfulTransactions && status.metrics.totalTransactions
                  ? Math.round((status.metrics.successfulTransactions / status.metrics.totalTransactions) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}