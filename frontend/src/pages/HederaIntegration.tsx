/**
 * Hedera Integration Page - Complete showcase of Hedera features
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HederaIntegrationCard } from '../components/hedera/HederaIntegrationCard';
import { HederaDecisionLog } from '../components/hedera/HederaDecisionLog';
import { HederaMetrics } from '../components/hedera/HederaMetrics';
import { HederaFeatureBadge } from '../components/hedera/HederaFeatureBadge';
import { useHederaStatus, useHederaDecisions, useHederaAnalytics } from '../hooks/useHedera';
import { 
  Shield, 
  Coins, 
  FileText, 
  Activity, 
  TrendingUp,
  Zap,
  CheckCircle,
  ExternalLink,
  Code,
  Database
} from 'lucide-react';
import { Page } from '../App';

interface HederaIntegrationProps {
  onNavigate: (page: Page) => void;
}

export function HederaIntegration({ onNavigate }: HederaIntegrationProps) {
  const { status } = useHederaStatus();
  const { decisions } = useHederaDecisions({ limit: 10 });
  const { analytics } = useHederaAnalytics();
  const [activeSection, setActiveSection] = useState<'overview' | 'hcs' | 'hts' | 'hfs'>('overview');

  const features = [
    {
      id: 'hcs',
      title: 'Consensus Service (HCS)',
      description: 'Immutable AI decision logging on-chain',
      icon: Shield,
      color: 'from-purple-500/20 to-purple-600/20',
      borderColor: 'border-purple-500/30',
      benefits: [
        'Immutable audit trail of all AI decisions',
        'Transparent reasoning and confidence scores',
        'Verifiable on Hedera network',
        'Real-time decision logging'
      ],
      useCases: [
        'AI strategy rebalancing decisions',
        'Risk management actions',
        'Portfolio optimization choices',
        'Model performance tracking'
      ],
      stats: {
        label: 'Decisions Logged',
        value: decisions.length,
        sublabel: 'Real-time on Hedera'
      }
    },
    {
      id: 'hts',
      title: 'Token Service (HTS)',
      description: 'Native tokenization of vault shares',
      icon: Coins,
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/30',
      benefits: [
        'Vault shares as native Hedera tokens',
        'Low transaction fees (< $0.001)',
        'Fast finality (3-5 seconds)',
        'Fractional ownership support'
      ],
      useCases: [
        'Vault share tokenization',
        'Yield token distribution',
        'Liquidity pool tokens',
        'Governance token management'
      ],
      stats: {
        label: 'Token Transactions',
        value: (analytics as any)?.hederaService?.metrics?.totalTransactions || 0,
        sublabel: 'Fast & cheap transfers'
      }
    },
    {
      id: 'hfs',
      title: 'File Service (HFS)',
      description: 'Decentralized proof storage',
      icon: FileText,
      color: 'from-green-500/20 to-green-600/20',
      borderColor: 'border-green-500/30',
      benefits: [
        'On-chain storage for yield proofs',
        'AI model metadata versioning',
        'Permanent record keeping',
        'Cryptographic verification'
      ],
      useCases: [
        'Yield proof documents',
        'AI model metadata',
        'Performance reports',
        'Audit trail files'
      ],
      stats: {
        label: 'Files Stored',
        value: 2,
        sublabel: 'Model + Proof data'
      }
    }
  ];

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/50 rounded-full">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              POWERED BY HEDERA
            </span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            Enterprise-Grade Blockchain Integration
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            AION leverages Hedera's industry-leading blockchain technology for transparent, secure, and verifiable DeFi operations
          </p>

          {/* Network Status */}
          <div className="mt-6 inline-flex items-center gap-4 px-6 py-3 bg-dark-800 border border-dark-600 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white">Live on {status?.network || 'testnet'}</span>
            </div>
            <div className="text-sm text-gray-400">|</div>
            <div className="text-sm text-gray-400">
              Operator: <span className="text-purple-400 font-mono">{status?.operatorId || 'Loading...'}</span>
            </div>
          </div>
        </motion.div>

        {/* Network Metrics Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <HederaMetrics variant="full" />
        </motion.div>

        {/* Main Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Hedera Services Integration</h2>
          <p className="text-gray-400 text-center mb-8">
            Three powerful blockchain services working together
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                >
                  <Card className={`h-full bg-gradient-to-br ${feature.color} border ${feature.borderColor} hover:scale-[1.02] transition-transform cursor-pointer`}>
                    <div className="p-6">
                      {/* Icon & Title */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 bg-gradient-to-br ${feature.color} border ${feature.borderColor} rounded-xl`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                          <p className="text-sm text-gray-400">{feature.description}</p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className={`p-4 bg-gradient-to-br ${feature.color} border ${feature.borderColor} rounded-lg mb-4`}>
                        <div className="text-3xl font-bold text-white mb-1">{feature.stats.value}</div>
                        <div className="text-sm text-gray-300">{feature.stats.label}</div>
                        <div className="text-xs text-gray-400 mt-1">{feature.stats.sublabel}</div>
                      </div>

                      {/* Benefits */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-white mb-2">Benefits</h4>
                        <ul className="space-y-2">
                          {feature.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Use Cases */}
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Use Cases</h4>
                        <div className="flex flex-wrap gap-2">
                          {feature.useCases.slice(0, 3).map((useCase, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 bg-dark-700/50 border border-dark-600 rounded-full text-gray-300"
                            >
                              {useCase}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Live Decision Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <HederaDecisionLog limit={10} showHeader={true} compact={false} />
        </motion.div>

        {/* Technical Architecture */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-6 h-6 text-gold-500" />
              <h2 className="text-2xl font-bold text-white">Technical Architecture</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Smart Contract Integration */}
              <div className="p-4 bg-dark-700/30 border border-dark-600 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  Smart Contract Layer
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• AIONVaultHedera: Main vault with HTS integration</li>
                  <li>• HTSTokenManager: Native token management</li>
                  <li>• HederaOperations: HCS & HFS operations</li>
                  <li>• SafeHederaService: Secure service wrappers</li>
                </ul>
              </div>

              {/* Backend Integration */}
              <div className="p-4 bg-dark-700/30 border border-dark-600 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Backend Services
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• HederaService: Network connectivity</li>
                  <li>• AIDecisionLogger: HCS logging service</li>
                  <li>• ModelMetadataManager: HFS storage</li>
                  <li>• Real-time monitoring & analytics</li>
                </ul>
              </div>
            </div>

            {/* API Endpoints */}
            <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <h4 className="text-sm font-semibold text-blue-300 mb-3">API Endpoints Available</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="text-gray-400">/api/hedera/status</div>
                <div className="text-gray-400">/api/hedera/decisions</div>
                <div className="text-gray-400">/api/hedera/hcs/submit</div>
                <div className="text-gray-400">/api/hedera/models</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Why Hedera */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Why Hedera for DeFi AI?</h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                The perfect blockchain for AI-powered decentralized finance
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">{'<'}$0.001</div>
                <div className="text-sm text-gray-300">Transaction Cost</div>
                <p className="text-xs text-gray-400 mt-2">
                  Ultra-low fees enable frequent AI decisions and micro-transactions
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">3-5s</div>
                <div className="text-sm text-gray-300">Finality Time</div>
                <p className="text-xs text-gray-400 mt-2">
                  Fast consensus allows real-time strategy execution and logging
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">99.99%</div>
                <div className="text-sm text-gray-300">Uptime</div>
                <p className="text-xs text-gray-400 mt-2">
                  Enterprise-grade reliability for mission-critical DeFi operations
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/50">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                Experience Hedera-Powered DeFi
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Start using AION's AI-powered strategies backed by Hedera's enterprise blockchain technology
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button
                  size="lg"
                  icon={Zap}
                  onClick={() => onNavigate('execute')}
                  glow
                >
                  Start Using AION
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  icon={ExternalLink}
                  onClick={() => window.open('https://hedera.com', '_blank')}
                >
                  Learn About Hedera
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default HederaIntegration;

