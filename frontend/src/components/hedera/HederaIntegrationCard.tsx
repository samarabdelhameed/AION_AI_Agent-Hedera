/**
 * Hedera Integration Card - Comprehensive view of Hedera features
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Coins, FileText, Activity, ChevronRight, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useHederaStatus, useHederaDecisions } from '../../hooks/useHedera';

interface HederaIntegrationCardProps {
  className?: string;
  onViewDetails?: () => void;
}

export function HederaIntegrationCard({ className = '', onViewDetails }: HederaIntegrationCardProps) {
  const { status } = useHederaStatus();
  const { decisions } = useHederaDecisions({ limit: 5 });
  const [activeTab, setActiveTab] = useState<'overview' | 'hcs' | 'hts' | 'hfs'>('overview');

  const features = [
    {
      id: 'hcs',
      name: 'Consensus Service (HCS)',
      icon: Shield,
      color: 'purple',
      description: 'AI decisions logged immutably on-chain',
      active: status?.services.hcs,
      stats: {
        label: 'Decisions Logged',
        value: decisions.length
      }
    },
    {
      id: 'hts',
      name: 'Token Service (HTS)',
      icon: Coins,
      color: 'blue',
      description: 'Vault shares as native Hedera tokens',
      active: status?.services.hts,
      stats: {
        label: 'Tokens Managed',
        value: '1'
      }
    },
    {
      id: 'hfs',
      name: 'File Service (HFS)',
      icon: FileText,
      color: 'green',
      description: 'Proof of yield stored on-chain',
      active: status?.services.hfs,
      stats: {
        label: 'Files Stored',
        value: '2'
      }
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      green: 'bg-green-500/10 border-green-500/30 text-green-400'
    };
    return colors[color as keyof typeof colors] || colors.purple;
  };

  return (
    <Card className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Hedera Integration</h3>
            <p className="text-xs text-gray-400">Enterprise-grade blockchain layer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-green-300">Live</span>
          </div>
          {onViewDetails && (
            <Button size="sm" variant="ghost" onClick={onViewDetails} icon={ChevronRight}>
              Details
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </TabButton>
        {features.map((feature) => (
          <TabButton
            key={feature.id}
            active={activeTab === feature.id}
            onClick={() => setActiveTab(feature.id as any)}
          >
            {feature.id.toUpperCase()}
          </TabButton>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${getColorClasses(feature.color)}`}
                  onClick={() => setActiveTab(feature.id as any)}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{feature.name}</h4>
                        {feature.active ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{feature.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{feature.stats.label}</span>
                        <span className="text-sm font-bold">{feature.stats.value}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {features
              .filter((f) => f.id === activeTab)
              .map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.id}>
                    <div className={`p-4 border rounded-lg ${getColorClasses(feature.color)} mb-4`}>
                      <div className="flex items-start gap-3">
                        <Icon className="w-6 h-6" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{feature.name}</h4>
                          <p className="text-sm text-gray-400 mb-3">{feature.description}</p>
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-xs text-gray-500">Status</div>
                              <div className="text-sm font-medium">
                                {feature.active ? 'Active' : 'Initializing'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">{feature.stats.label}</div>
                              <div className="text-sm font-medium">{feature.stats.value}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature-specific content */}
                    {activeTab === 'hcs' && decisions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-white mb-2">Recent Decisions</div>
                        {decisions.slice(0, 3).map((decision) => (
                          <div
                            key={decision.id}
                            className="p-3 bg-dark-700/30 rounded-lg border border-purple-500/20"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-white capitalize">
                                {decision.type.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-purple-400">
                                {(decision.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{decision.action}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'hts' && (
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <div className="text-sm font-medium text-white mb-2">Token Details</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Token Name</div>
                            <div className="text-sm font-medium text-blue-300">AION Shares</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Symbol</div>
                            <div className="text-sm font-medium text-blue-300">AION</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Type</div>
                            <div className="text-sm font-medium text-blue-300">Fungible</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Network</div>
                            <div className="text-sm font-medium text-blue-300">
                              {status?.network || 'testnet'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'hfs' && (
                      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <div className="text-sm font-medium text-white mb-2">Stored Files</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-dark-700/30 rounded">
                            <span className="text-sm text-gray-300">AI Model Metadata</span>
                            <ExternalLink className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex items-center justify-between p-2 bg-dark-700/30 rounded">
                            <span className="text-sm text-gray-300">Yield Proof Data</span>
                            <ExternalLink className="w-4 h-4 text-green-400" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-dark-600">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-purple-400" />
            <span className="text-gray-400">Connected to {status?.network || 'testnet'}</span>
          </div>
          <span className="text-purple-400">
            {status?.operatorId || 'Not connected'}
          </span>
        </div>
      </div>
    </Card>
  );
}

function TabButton({ 
  children, 
  active, 
  onClick 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
          : 'bg-dark-700/30 text-gray-400 border border-dark-600 hover:border-purple-500/30'
      }`}
    >
      {children}
    </button>
  );
}

export default HederaIntegrationCard;

