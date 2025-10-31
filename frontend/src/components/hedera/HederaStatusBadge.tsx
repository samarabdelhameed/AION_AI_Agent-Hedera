/**
 * Hedera Status Badge - Shows Hedera network connection status
 */

import React from 'react';
import { Shield, Zap, CheckCircle, XCircle } from 'lucide-react';
import { useHederaStatus } from '../../hooks/useHedera';

interface HederaStatusBadgeProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function HederaStatusBadge({ variant = 'compact', className = '' }: HederaStatusBadgeProps) {
  const { status, loading } = useHederaStatus();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        {variant === 'full' && <span className="text-xs text-gray-400">Connecting...</span>}
      </div>
    );
  }

  if (!status?.isConnected) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <XCircle className="w-4 h-4 text-red-400" />
        {variant === 'full' && <span className="text-xs text-red-400">Disconnected</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Shield className="w-4 h-4 text-purple-400" />
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-purple-300">Hedera {status.network}</span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {status.services.hcs && <span className="text-green-400">HCS</span>}
            {status.services.hts && <span className="text-green-400">HTS</span>}
            {status.services.hfs && <span className="text-green-400">HFS</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function HederaServiceIndicator({ className = '' }: { className?: string }) {
  const { status, loading } = useHederaStatus();

  if (loading) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg ${className}`}>
      <Shield className="w-4 h-4 text-purple-400" />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-purple-300">Secured by Hedera</span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {status?.services.hcs && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              HCS
            </span>
          )}
          {status?.services.hts && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              HTS
            </span>
          )}
          {status?.services.hfs && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              HFS
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HederaPowerBadge({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/50 rounded-full ${className}`}>
      <Zap className="w-3 h-3 text-purple-400" />
      <span className="text-xs font-bold text-purple-300">Powered by Hedera</span>
    </div>
  );
}

