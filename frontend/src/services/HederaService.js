import { Client, TopicMessageQuery, FileContentsQuery } from '@hashgraph/sdk';
import { ethers } from 'ethers';

class HederaService {
  constructor() {
    this.client = null;
    this.provider = null;
    this.vaultContract = null;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      network: 'testnet',
      mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
      rpcUrl: 'https://testnet.hashio.io/api',
      vaultAddress: process.env.REACT_APP_VAULT_ADDRESS || '0x...',
      hcsTopicId: process.env.REACT_APP_HCS_TOPIC_ID || '0.0.123456',
    };
  }

  async initialize() {
    try {
      // Initialize Hedera client
      this.client = Client.forTestnet();
      
      // Initialize Ethereum provider for contract interactions
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      // Initialize vault contract
      if (this.config.vaultAddress && this.config.vaultAddress !== '0x...') {
        this.vaultContract = new ethers.Contract(
          this.config.vaultAddress,
          this.getVaultABI(),
          this.provider
        );
      }
      
      this.isInitialized = true;
      console.log('Hedera service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Hedera service:', error);
      throw error;
    }
  }

  // Get AI decisions from smart contract
  async getAIDecisions(from = 1, to = 10) {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [decisions, totalCount] = await this.vaultContract.getAIDecisions(from, to);
      return {
        decisions: decisions.map(this.formatAIDecision),
        totalCount: Number(totalCount)
      };
    } catch (error) {
      console.error('Error fetching AI decisions:', error);
      throw error;
    }
  }

  // Get AI decisions by time range
  async getAIDecisionsByTimeRange(startTime, endTime, limit = 20) {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [decisions, totalFound] = await this.vaultContract.getAIDecisionsByTimeRange(
        startTime,
        endTime,
        limit
      );
      return {
        decisions: decisions.map(this.formatAIDecision),
        totalFound: Number(totalFound)
      };
    } catch (error) {
      console.error('Error fetching AI decisions by time range:', error);
      throw error;
    }
  }  // 
Get latest model snapshot
  async getLatestModelSnapshot() {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [snapshot, isValid, signature] = await this.vaultContract.getLatestModelSnapshot();
      return {
        snapshot: this.formatModelSnapshot(snapshot),
        isValid,
        signature
      };
    } catch (error) {
      console.error('Error fetching latest model snapshot:', error);
      throw error;
    }
  }

  // Get model snapshot by ID
  async getModelSnapshot(snapshotId) {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [snapshot, isValid] = await this.vaultContract.getModelSnapshot(snapshotId);
      return {
        snapshot: this.formatModelSnapshot(snapshot),
        isValid
      };
    } catch (error) {
      console.error('Error fetching model snapshot:', error);
      throw error;
    }
  }

  // Get vault metrics
  async getVaultMetrics() {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [totalValueLocked, totalUsers, totalDecisions, averageDecisionInterval, lastDecisionTime] = 
        await this.vaultContract.getVaultMetrics();
      
      return {
        totalValueLocked: ethers.formatEther(totalValueLocked),
        totalUsers: Number(totalUsers),
        totalDecisions: Number(totalDecisions),
        averageDecisionInterval: Number(averageDecisionInterval),
        lastDecisionTime: Number(lastDecisionTime)
      };
    } catch (error) {
      console.error('Error fetching vault metrics:', error);
      throw error;
    }
  }

  // Get user audit summary
  async getUserAuditSummary(userAddress) {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [totalDeposits, totalWithdrawals, currentShares, firstDepositTime, lastActivityTime] = 
        await this.vaultContract.getUserAuditSummary(userAddress);
      
      return {
        totalDeposits: ethers.formatEther(totalDeposits),
        totalWithdrawals: ethers.formatEther(totalWithdrawals),
        currentShares: ethers.formatEther(currentShares),
        firstDepositTime: Number(firstDepositTime),
        lastActivityTime: Number(lastActivityTime)
      };
    } catch (error) {
      console.error('Error fetching user audit summary:', error);
      throw error;
    }
  }

  // Get users list
  async getUsers(offset = 0, limit = 50) {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [users, totalUsers] = await this.vaultContract.getUsers(offset, limit);
      return {
        users,
        totalUsers: Number(totalUsers)
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get daily activity
  async getDailyActivity(daySlot) {
    if (!this.vaultContract) {
      throw new Error('Vault contract not initialized');
    }

    try {
      const [totalDeposits, totalWithdrawals, activeUsers, depositCount, withdrawalCount] = 
        await this.vaultContract.getDailyActivity(daySlot);
      
      return {
        totalDeposits: ethers.formatEther(totalDeposits),
        totalWithdrawals: ethers.formatEther(totalWithdrawals),
        activeUsers: Number(activeUsers),
        depositCount: Number(depositCount),
        withdrawalCount: Number(withdrawalCount)
      };
    } catch (error) {
      console.error('Error fetching daily activity:', error);
      throw error;
    }
  }  //
 Get HCS messages from topic
  async getHCSMessages(topicId, limit = 10) {
    if (!this.client) {
      throw new Error('Hedera client not initialized');
    }

    try {
      const messages = [];
      const query = new TopicMessageQuery()
        .setTopicId(topicId)
        .setLimit(limit);

      await query.subscribe(this.client, null, (message) => {
        messages.push({
          consensusTimestamp: message.consensusTimestamp,
          contents: Buffer.from(message.contents).toString(),
          runningHash: message.runningHash,
          sequenceNumber: message.sequenceNumber
        });
      });

      return messages;
    } catch (error) {
      console.error('Error fetching HCS messages:', error);
      throw error;
    }
  }

  // Get HFS file contents
  async getHFSFileContents(fileId) {
    if (!this.client) {
      throw new Error('Hedera client not initialized');
    }

    try {
      const query = new FileContentsQuery()
        .setFileId(fileId);

      const contents = await query.execute(this.client);
      return Buffer.from(contents).toString();
    } catch (error) {
      console.error('Error fetching HFS file contents:', error);
      throw error;
    }
  }

  // Format AI decision for display
  formatAIDecision(decision) {
    return {
      timestamp: Number(decision.timestamp),
      decisionType: decision.decisionType,
      fromStrategy: decision.fromStrategy,
      toStrategy: decision.toStrategy,
      amount: ethers.formatEther(decision.amount),
      reason: decision.reason,
      txHash: decision.txHash,
      hcsMessageId: decision.hcsMessageId,
      hfsFileId: decision.hfsFileId
    };
  }

  // Format model snapshot for display
  formatModelSnapshot(snapshot) {
    return {
      timestamp: Number(snapshot.timestamp),
      version: snapshot.version,
      hfsFileId: snapshot.hfsFileId,
      checksum: snapshot.checksum,
      performanceScore: Number(snapshot.performanceScore),
      description: snapshot.description,
      active: snapshot.active
    };
  }

  // Get vault contract ABI (simplified)
  getVaultABI() {
    return [
      "function getAIDecisions(uint256 from, uint256 to) view returns (tuple(uint256 timestamp, string decisionType, address fromStrategy, address toStrategy, uint256 amount, string reason, bytes32 txHash, string hcsMessageId, string hfsFileId)[] decisions, uint256 totalCount)",
      "function getAIDecisionsByTimeRange(uint256 startTime, uint256 endTime, uint256 limit) view returns (tuple(uint256 timestamp, string decisionType, address fromStrategy, address toStrategy, uint256 amount, string reason, bytes32 txHash, string hcsMessageId, string hfsFileId)[] decisions, uint256 totalFound)",
      "function getLatestModelSnapshot() view returns (tuple(uint256 timestamp, string version, string hfsFileId, bytes32 checksum, uint256 performanceScore, string description, bool active) snapshot, bool isValid, bytes32 signature)",
      "function getModelSnapshot(uint256 snapshotId) view returns (tuple(uint256 timestamp, string version, string hfsFileId, bytes32 checksum, uint256 performanceScore, string description, bool active) snapshot, bool isValid)",
      "function getVaultMetrics() view returns (uint256 totalValueLocked, uint256 totalUsers, uint256 totalDecisions, uint256 averageDecisionInterval, uint256 lastDecisionTime)",
      "function getUserAuditSummary(address user) view returns (uint256 totalDeposits, uint256 totalWithdrawals, uint256 currentShares, uint256 firstDepositTime, uint256 lastActivityTime)",
      "function getUsers(uint256 offset, uint256 limit) view returns (address[] users, uint256 totalUsers)",
      "function getDailyActivity(uint256 daySlot) view returns (uint256 totalDeposits, uint256 totalWithdrawals, uint256 activeUsers, uint256 depositCount, uint256 withdrawalCount)"
    ];
  }

  // Utility functions
  getCurrentDaySlot() {
    return Math.floor(Date.now() / 1000 / 86400);
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
  }

  formatAddress(address) {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return 'N/A';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatAmount(amount, decimals = 4) {
    const num = parseFloat(amount);
    return num.toFixed(decimals);
  }

  getPerformanceScoreColor(score) {
    if (score >= 9000) return '#4caf50'; // Excellent
    if (score >= 7000) return '#8bc34a'; // Good
    if (score >= 5000) return '#ff9800'; // Average
    return '#f44336'; // Poor
  }

  getPerformanceScoreLabel(score) {
    if (score >= 9000) return 'Excellent';
    if (score >= 7000) return 'Good';
    if (score >= 5000) return 'Average';
    return 'Poor';
  }
}

export default HederaService;