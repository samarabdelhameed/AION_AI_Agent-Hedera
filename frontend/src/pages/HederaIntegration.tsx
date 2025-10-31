import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ButtonLoading } from '../components/ui/LoadingStates';
import { HederaStatus } from '../components/hedera/HederaStatus';
import { HederaTokenInfo } from '../components/hedera/HederaTokenInfo';
import { AIDecisionHistory } from '../components/hedera/AIDecisionHistory';
import { 
  RefreshCw, 
  Send, 
  Coins, 
  FileText, 
  MessageSquare, 
  Activity,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  Database,
  Network,
  Shield
} from 'lucide-react';
import { Page } from '../App';
import { useHedera } from '../hooks/useHedera';

interface HederaIntegrationProps {
  onNavigate: (page: Page) => void;
}

export function HederaIntegration({ onNavigate }: HederaIntegrationProps) {
  const { 
    status, 
    balance, 
    tokenInfo, 
    isConnected, 
    loading, 
    error, 
    refresh,
    submitToHCS,
    mintTokens,
    createFile
  } = useHedera();

  const [hcsMessage, setHcsMessage] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleSubmitHCS = async () => {
    if (!hcsMessage.trim()) return;
    
    try {
      setActionLoading(true);
      setActionResult(null);
      
      const result = await submitToHCS(hcsMessage, status?.services?.hcs?.topicId);
      setActionResult({
        type: 'success',
        message: `HCS message submitted successfully! Transaction ID: ${result.transactionId}`
      });
      setHcsMessage('');
    } catch (err: any) {
      setActionResult({
        type: 'error',
        message: `Failed to submit HCS message: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMintTokens = async () => {
    if (!mintAmount || isNaN(Number(mintAmount))) return;
    
    try {
      setActionLoading(true);
      setActionResult(null);
      
      const result = await mintTokens(Number(mintAmount), status?.services?.hts?.tokenId);
      setActionResult({
        type: 'success',
        message: `Tokens minted successfully! Transaction ID: ${result.transactionId}`
      });
      setMintAmount('');
    } catch (err: any) {
      setActionResult({
        type: 'error',
        message: `Failed to mint tokens: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!fileContent.trim()) return;
    
    try {
      setActionLoading(true);
      setActionResult(null);
      
      const result = await createFile(fileContent, 'AION AI Decision Data');
      setActionResult({
        type: 'success',
        message: `File created successfully! File ID: ${result.fileId}`
      });
      setFileContent('');
    } catch (err: any) {
      setActionResult({
        type: 'error',
        message: `Failed to create file: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-lg font-bold text-white">H</span>
                </div>
                <h1 className="text-3xl font-bold text-white">Hedera Integration</h1>
              </div>
              <p className="text-gray-400">
                Ultra-fast, low-cost blockchain integration with Hedera Hashgraph
              </p>
            </div>
            <ButtonLoading
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              onClick={refresh}
              loading={loading}
              loadingText="Refreshing..."
            >
              Refresh All
            </ButtonLoading>
          </div>
        </motion.div>

        {/* Action Result */}
        {actionResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl border ${
              actionResult.type === 'success'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionResult.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={`font-medium ${
                actionResult.type === 'success' ? 'text-green-300' : 'text-red-300'
              }`}>
                {actionResult.type === 'success' ? 'Success!' : 'Error!'}
              </span>
            </div>
            <p className="text-sm text-gray-300 mt-1">{actionResult.message}</p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column - Status & Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Connection Status */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-white">Network Status</h3>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${
                  isConnected 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
              
              <HederaStatus 
                status={status}
                isConnected={isConnected}
                loading={loading}
                error={error}
              />
            </Card>

            {/* Account Balance */}
            {balance && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-gold-500" />
                    <h3 className="text-lg font-semibold text-white">Account Balance</h3>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-gold-500/20 to-yellow-500/20 rounded-xl border border-gold-500/30">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {balance.hbars}
                    </div>
                    <div className="text-sm text-gold-400 mb-3">HBAR</div>
                    <div className="text-xs text-gray-400">
                      Account: {balance.accountId}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Token Information */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Coins className="w-5 h-5 text-gold-500" />
                  <h3 className="text-lg font-semibold text-white">Token Information</h3>
                </div>
              </div>
              
              <HederaTokenInfo tokenInfo={tokenInfo} />
            </Card>

            {/* Performance Metrics */}
            {status?.metrics && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-white">Performance</h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                    <span className="text-sm text-gray-400">Total Transactions</span>
                    <span className="text-white font-medium">
                      {status.metrics.totalTransactions || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                    <span className="text-sm text-gray-400">Success Rate</span>
                    <span className="text-green-400 font-medium">
                      {status.metrics.successfulTransactions && status.metrics.totalTransactions
                        ? Math.round((status.metrics.successfulTransactions / status.metrics.totalTransactions) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                    <span className="text-sm text-gray-400">Avg Response Time</span>
                    <span className="text-blue-400 font-medium">
                      {status.metrics.averageResponseTime || 0}ms
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Center Column - Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* HCS Message Submission */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">Submit HCS Message</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message Content
                  </label>
                  <textarea
                    value={hcsMessage}
                    onChange={(e) => setHcsMessage(e.target.value)}
                    placeholder="Enter your message to submit to Hedera Consensus Service..."
                    className="w-full h-24 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <ButtonLoading
                  onClick={handleSubmitHCS}
                  loading={actionLoading}
                  disabled={!hcsMessage.trim() || !isConnected}
                  icon={Send}
                  className="w-full"
                >
                  Submit to HCS
                </ButtonLoading>
                
                <div className="text-xs text-gray-400">
                  Messages are permanently stored on Hedera Consensus Service
                </div>
              </div>
            </Card>

            {/* HTS Token Minting */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Coins className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-semibold text-white">Mint HTS Tokens</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount to Mint
                  </label>
                  <input
                    type="number"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    placeholder="Enter amount to mint..."
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-500"
                  />
                </div>
                
                <ButtonLoading
                  onClick={handleMintTokens}
                  loading={actionLoading}
                  disabled={!mintAmount || isNaN(Number(mintAmount)) || !isConnected}
                  icon={Coins}
                  className="w-full"
                  variant="secondary"
                >
                  Mint Tokens
                </ButtonLoading>
                
                <div className="text-xs text-gray-400">
                  Mint new AION tokens using Hedera Token Service
                </div>
              </div>
            </Card>

            {/* HFS File Creation */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-white">Create HFS File</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    File Content
                  </label>
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder="Enter file content to store on Hedera File Service..."
                    className="w-full h-24 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                </div>
                
                <ButtonLoading
                  onClick={handleCreateFile}
                  loading={actionLoading}
                  disabled={!fileContent.trim() || !isConnected}
                  icon={FileText}
                  className="w-full"
                  variant="secondary"
                >
                  Create File
                </ButtonLoading>
                
                <div className="text-xs text-gray-400">
                  Store data permanently on Hedera File Service
                </div>
              </div>
            </Card>

            {/* Integration Benefits */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-white">Hedera Benefits</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-400">$0.0001</div>
                  <div className="text-xs text-gray-400">Transaction Cost</div>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-blue-400">3-5s</div>
                  <div className="text-xs text-gray-400">Finality Time</div>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-purple-400">10,000+</div>
                  <div className="text-xs text-gray-400">TPS Capacity</div>
                </div>
                <div className="p-3 bg-gold-500/10 border border-gold-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-gold-400">Carbon-</div>
                  <div className="text-xs text-gray-400">Negative</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - AI Decision History */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-semibold text-white">AI Decision History</h3>
              </div>
              
              <AIDecisionHistory />
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  icon={Database}
                  onClick={() => onNavigate('dashboard')}
                >
                  View Dashboard
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  icon={TrendingUp}
                  onClick={() => onNavigate('strategies')}
                >
                  Explore Strategies
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  icon={Activity}
                  onClick={() => onNavigate('timeline')}
                >
                  Activity Timeline
                </Button>
              </div>
            </Card>

            {/* Integration Status */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-white">Integration Status</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">HCS Integration</span>
                  <span className="text-green-400 text-sm">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">HTS Integration</span>
                  <span className="text-green-400 text-sm">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">HFS Integration</span>
                  <span className="text-green-400 text-sm">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">AI Decision Logging</span>
                  <span className="text-green-400 text-sm">✓ Active</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}