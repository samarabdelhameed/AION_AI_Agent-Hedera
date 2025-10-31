import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, Users, Clock } from 'lucide-react';

interface HederaTokenInfoProps {
  tokenInfo: any;
}

export function HederaTokenInfo({ tokenInfo }: HederaTokenInfoProps) {
  if (!tokenInfo) {
    return (
      <div className="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">No token information available</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-3 bg-gold-500/10 border border-gold-500/30 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Coins className="w-4 h-4 text-gold-400" />
        <span className="text-sm font-medium text-gold-300">AION Token (HTS)</span>
      </div>

      <div className="space-y-2">
        {/* Token ID */}
        {tokenInfo.tokenId && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Token ID:</span>
            <span className="text-xs text-white font-mono">
              {tokenInfo.tokenId}
            </span>
          </div>
        )}

        {/* Total Supply */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Total Supply:</span>
          <span className="text-xs text-white">
            {tokenInfo.totalSupply ? Number(tokenInfo.totalSupply).toLocaleString() : '0'}
          </span>
        </div>

        {/* Symbol */}
        {tokenInfo.symbol && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Symbol:</span>
            <span className="text-xs text-gold-400 font-medium">
              {tokenInfo.symbol}
            </span>
          </div>
        )}

        {/* Decimals */}
        {tokenInfo.decimals !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Decimals:</span>
            <span className="text-xs text-white">
              {tokenInfo.decimals}
            </span>
          </div>
        )}

        {/* Treasury Account */}
        {tokenInfo.treasuryAccountId && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Treasury:</span>
            <span className="text-xs text-white font-mono">
              {tokenInfo.treasuryAccountId}
            </span>
          </div>
        )}

        {/* Additional Info */}
        <div className="pt-2 border-t border-gold-500/20">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-xs text-gray-400">Mintable</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-gray-400">Transferable</span>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {tokenInfo.lastUpdated && (
          <div className="flex items-center gap-1 pt-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">
              Updated: {new Date(tokenInfo.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}