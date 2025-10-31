/**
 * Hedera Feature Badge - Shows which Hedera features are being used
 */

import React from 'react';
import { Shield, FileText, Coins, CheckCircle, Sparkles } from 'lucide-react';

interface HederaFeatureBadgeProps {
  features: Array<'hcs' | 'hts' | 'hfs' | 'all'>;
  variant?: 'inline' | 'stacked';
  showLabels?: boolean;
  className?: string;
}

export function HederaFeatureBadge({ 
  features, 
  variant = 'inline', 
  showLabels = true,
  className = '' 
}: HederaFeatureBadgeProps) {
  const hasHCS = features.includes('hcs') || features.includes('all');
  const hasHTS = features.includes('hts') || features.includes('all');
  const hasHFS = features.includes('hfs') || features.includes('all');

  if (variant === 'stacked') {
    return (
      <div className={`space-y-2 ${className}`}>
        {hasHCS && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Shield className="w-4 h-4 text-purple-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-300">HCS - Consensus Service</div>
              {showLabels && <div className="text-xs text-gray-400">AI decisions logged immutably</div>}
            </div>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
        )}
        
        {hasHTS && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Coins className="w-4 h-4 text-blue-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-300">HTS - Token Service</div>
              {showLabels && <div className="text-xs text-gray-400">Vault shares as native tokens</div>}
            </div>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
        )}
        
        {hasHFS && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <FileText className="w-4 h-4 text-green-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-300">HFS - File Service</div>
              {showLabels && <div className="text-xs text-gray-400">Proof storage on-chain</div>}
            </div>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
        )}
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full">
        <Sparkles className="w-3 h-3 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">Hedera</span>
      </div>
      
      <div className="flex items-center gap-1">
        {hasHCS && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
            <Shield className="w-3 h-3 text-purple-400" />
            {showLabels && <span className="text-xs text-purple-300">HCS</span>}
          </div>
        )}
        
        {hasHTS && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
            <Coins className="w-3 h-3 text-blue-400" />
            {showLabels && <span className="text-xs text-blue-300">HTS</span>}
          </div>
        )}
        
        {hasHFS && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
            <FileText className="w-3 h-3 text-green-400" />
            {showLabels && <span className="text-xs text-green-300">HFS</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function HederaPoweredIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 border border-purple-500/50 rounded-lg backdrop-blur-sm ${className}`}>
      <div className="relative">
        <Shield className="w-4 h-4 text-purple-400" />
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Powered by Hedera
        </span>
        <span className="text-xs text-gray-400">
          Enterprise-grade blockchain
        </span>
      </div>
    </div>
  );
}

export default HederaFeatureBadge;

