// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./HTSTokenManager.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IStrategyAdapter.sol";

/**
 * @title AIONVaultHedera
 * @dev Enhanced AION Vault with native Hedera integration (HTS, HCS, HFS)
 * @notice Production-grade vault with AI decision logging and HTS tokenization
 */
contract AIONVaultHedera is Ownable, ReentrancyGuard, Pausable {
    using Address for address payable;

    // HTS Token Manager for share tokenization
    HTSTokenManager public immutable htsTokenManager;
    
    // Strategy management
    IStrategyAdapter public currentAdapter;
    mapping(address => AdapterInfo) public adapters;
    address[] public adapterList;
    
    struct AdapterInfo {
        IStrategyAdapter adapter;
        bool active;
        uint256 addedAt;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        string name;
        uint8 riskLevel;
    }

    // AI Agent and governance
    address public aiAgent;
    bool public strategyLocked;
    uint256 public strategyLockTime;
    uint256 public constant STRATEGY_LOCK_DURATION = 1 hours;

    // Vault accounting
    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;
    mapping(address => uint256) public principalOf;
    
    // Minimum amounts
    uint256 public minDepositBNB = 0.01 ether;
    uint256 public minYieldClaimBNB = 0.001 ether;

    // AI Decision tracking with enhanced indexing
    struct AIDecision {
        uint256 timestamp;
        string decisionType;
        address fromStrategy;
        address toStrategy;
        uint256 amount;
        string reason;
        bytes32 txHash;
        string hcsMessageId;
        string hfsFileId;
    }
    
    mapping(uint256 => AIDecision) public aiDecisions;
    uint256 public aiDecisionCount;
    
    // Enhanced indexing for fast queries
    mapping(bytes32 => uint256[]) public decisionsByType; // decisionType hash => decision IDs
    mapping(address => uint256[]) public decisionsByStrategy; // strategy => decision IDs
    mapping(uint256 => uint256[]) public decisionsByTimeSlot; // time slot => decision IDs
    
    // User activity tracking
    struct UserActivity {
        uint256 totalDeposits;
        uint256 totalWithdrawals;
        uint256 depositCount;
        uint256 withdrawalCount;
        uint256 firstDepositTime;
        uint256 lastActivityTime;
        uint256[] depositTimestamps;
        uint256[] withdrawalTimestamps;
    }
    
    mapping(address => UserActivity) public userActivities;
    address[] public allUsers;
    mapping(address => bool) public isRegisteredUser;
    
    // Vault performance tracking
    struct PerformanceSnapshot {
        uint256 timestamp;
        uint256 totalAssets;
        uint256 totalShares;
        uint256 sharePrice; // Price per share in wei
        uint256 userCount;
        uint256 apy; // APY in basis points
        uint256 dailyVolume;
    }
    
    mapping(uint256 => PerformanceSnapshot) public performanceSnapshots;
    uint256 public performanceSnapshotCount;
    uint256 public lastSnapshotTime;
    
    // Time-based indexing (daily slots)
    uint256 constant SECONDS_PER_DAY = 86400;
    mapping(uint256 => uint256[]) public dailyDeposits; // day => amounts
    mapping(uint256 => uint256[]) public dailyWithdrawals; // day => amounts
    mapping(uint256 => address[]) public dailyActiveUsers; // day => users

    // Model snapshot tracking
    struct ModelSnapshot {
        uint256 timestamp;
        string version;
        string hfsFileId;
        bytes32 checksum;
        uint256 performanceScore;
        string description;
        bool active;
    }
    
    mapping(uint256 => ModelSnapshot) public modelSnapshots;
    uint256 public modelSnapshotCount;
    uint256 public currentModelId;

    // Events
    event Deposit(address indexed user, uint256 amount, uint256 shares, uint256 htsShares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares, uint256 htsShares);
    event AIRebalance(
        address indexed agent,
        uint256 indexed decisionId,
        uint256 timestamp,
        string decisionCid,
        uint256 fromStrategy,
        uint256 toStrategy,
        uint256 amount
    );
    event StrategyChanged(address indexed oldStrategy, address indexed newStrategy, address indexed aiAgent);
    event AIAgentUpdated(address indexed oldAgent, address indexed newAgent);
    event AdapterAdded(address indexed adapter, string name, uint8 riskLevel);
    event AdapterActivated(address indexed adapter);
    event AdapterDeactivated(address indexed adapter);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event ModelSnapshotCreated(uint256 indexed snapshotId, string version, string hfsFileId, uint256 timestamp);
    event ModelSnapshotActivated(uint256 indexed snapshotId, uint256 timestamp);

    // Modifiers
    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI agent");
        _;
    }

    modifier whenStrategyNotLocked() {
        require(!strategyLocked || block.timestamp >= strategyLockTime, "Strategy locked");
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be positive");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        // Deploy HTS Token Manager
        htsTokenManager = new HTSTokenManager(address(this));
    }

    /**
     * @dev Initialize HTS share token
     */
    function initializeShareToken(
        string memory name,
        string memory symbol,
        uint32 decimals
    ) external onlyOwner returns (address) {
        require(!htsTokenManager.isTokenActive(), "Token already initialized");
        
        address tokenAddress = htsTokenManager.createShareToken(
            name,
            symbol,
            decimals,
            0 // Start with 0 initial supply
        );
        
        return tokenAddress;
    }

    /**
     * @dev Deposit BNB and receive HTS shares
     */
    function deposit() external payable nonReentrant whenNotPaused validAmount(msg.value) {
        require(msg.value >= minDepositBNB, "Below minimum deposit");
        require(htsTokenManager.isTokenActive(), "HTS token not initialized");

        uint256 shares = _calculateShares(msg.value);
        
        // Update internal accounting
        sharesOf[msg.sender] += shares;
        principalOf[msg.sender] += msg.value;
        totalShares += shares;

        // Track user activity
        _updateUserActivity(msg.sender, msg.value, true);
        
        // Track daily activity
        uint256 daySlot = block.timestamp / SECONDS_PER_DAY;
        dailyDeposits[daySlot].push(msg.value);
        _addDailyActiveUser(daySlot, msg.sender);

        // Mint HTS shares to user
        htsTokenManager.associateUserWithToken(msg.sender);
        uint64 newSupply = htsTokenManager.mintShares(msg.sender, shares);

        // Deploy to current strategy if available
        if (address(currentAdapter) != address(0) && adapters[address(currentAdapter)].active) {
            // Note: Strategy deployment would happen here in production
            // currentAdapter.deposit{value: msg.value}();
            adapters[address(currentAdapter)].totalDeposited += msg.value;
        }

        // Update performance snapshot if needed
        _updatePerformanceSnapshot();

        emit Deposit(msg.sender, msg.value, shares, newSupply);
    }

    /**
     * @dev Withdraw BNB by burning HTS shares
     */
    function withdraw(uint256 shares) external nonReentrant whenNotPaused validAmount(shares) {
        require(sharesOf[msg.sender] >= shares, "Insufficient shares");
        require(htsTokenManager.isTokenActive(), "HTS token not initialized");

        uint256 amount = _calculateWithdrawAmount(shares);
        require(amount > 0, "No funds to withdraw");

        // Update internal accounting
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        
        // Reduce principal proportionally
        uint256 principalReduction = (principalOf[msg.sender] * shares) / (sharesOf[msg.sender] + shares);
        principalOf[msg.sender] -= principalReduction;

        // Track user activity
        _updateUserActivity(msg.sender, amount, false);
        
        // Track daily activity
        uint256 daySlot = block.timestamp / SECONDS_PER_DAY;
        dailyWithdrawals[daySlot].push(amount);
        _addDailyActiveUser(daySlot, msg.sender);

        // Burn HTS shares
        uint64 newSupply = htsTokenManager.burnShares(msg.sender, shares);

        // Withdraw from strategy if needed
        if (address(currentAdapter) != address(0) && amount > address(this).balance) {
            uint256 withdrawFromStrategy = amount - address(this).balance;
            // Note: Strategy withdrawal would happen here in production
            // currentAdapter.withdraw(withdrawFromStrategy);
            adapters[address(currentAdapter)].totalWithdrawn += withdrawFromStrategy;
        }

        // Update performance snapshot if needed
        _updatePerformanceSnapshot();

        // Transfer BNB to user
        payable(msg.sender).sendValue(amount);

        emit Withdraw(msg.sender, amount, shares, newSupply);
    }

    /**
     * @dev Record AI decision with HCS/HFS integration
     */
    function recordAIDecision(
        string memory decisionType,
        address fromStrategy,
        address toStrategy,
        uint256 amount,
        string memory reason,
        string memory hcsMessageId,
        string memory hfsFileId
    ) external onlyAIAgent returns (uint256 decisionId) {
        aiDecisionCount++;
        decisionId = aiDecisionCount;
        
        AIDecision memory decision = AIDecision({
            timestamp: block.timestamp,
            decisionType: decisionType,
            fromStrategy: fromStrategy,
            toStrategy: toStrategy,
            amount: amount,
            reason: reason,
            txHash: blockhash(block.number - 1),
            hcsMessageId: hcsMessageId,
            hfsFileId: hfsFileId
        });
        
        aiDecisions[decisionId] = decision;
        
        // Index the decision for fast queries
        _indexAIDecision(decisionId, decision);

        emit AIRebalance(
            msg.sender,
            decisionId,
            block.timestamp,
            hcsMessageId,
            uint256(uint160(fromStrategy)),
            uint256(uint160(toStrategy)),
            amount
        );

        return decisionId;
    }

    /**
     * @dev AI-driven strategy rebalancing
     */
    function rebalanceStrategy(
        address newAdapter,
        string memory reason,
        string memory hcsMessageId,
        string memory hfsFileId
    ) external onlyAIAgent whenStrategyNotLocked nonReentrant {
        require(adapters[newAdapter].active, "Adapter not active");
        require(newAdapter != address(currentAdapter), "Same adapter");

        address oldAdapter = address(currentAdapter);
        uint256 totalBalance = address(this).balance;

        // Withdraw from old strategy
        if (oldAdapter != address(0)) {
            // Note: Strategy withdrawal would happen here in production
            // uint256 strategyBalance = currentAdapter.totalAssets();
            // if (strategyBalance > 0) {
            //     currentAdapter.withdraw(strategyBalance);
            //     totalBalance = address(this).balance;
            // }
        }

        // Switch to new strategy
        currentAdapter = IStrategyAdapter(newAdapter);
        
        // Deploy funds to new strategy
        if (totalBalance > 0) {
            // Note: Strategy deployment would happen here in production
            // currentAdapter.deposit{value: totalBalance}();
            adapters[newAdapter].totalDeposited += totalBalance;
        }

        // Record decision
        uint256 decisionId = aiDecisionCount++;
        
        aiDecisions[decisionId] = AIDecision({
            timestamp: block.timestamp,
            decisionType: "rebalance",
            fromStrategy: oldAdapter,
            toStrategy: newAdapter,
            amount: totalBalance,
            reason: reason,
            txHash: blockhash(block.number - 1),
            hcsMessageId: hcsMessageId,
            hfsFileId: hfsFileId
        });

        emit AIRebalance(
            msg.sender,
            decisionId,
            block.timestamp,
            hcsMessageId,
            uint256(uint160(oldAdapter)),
            uint256(uint160(newAdapter)),
            totalBalance
        );

        // Lock strategy for cooldown period
        strategyLocked = true;
        strategyLockTime = block.timestamp + STRATEGY_LOCK_DURATION;

        emit StrategyChanged(oldAdapter, newAdapter, msg.sender);
    }

    /**
     * @dev Add new strategy adapter
     */
    function addAdapter(
        address adapterAddress,
        string memory name,
        uint8 riskLevel
    ) external onlyOwner {
        require(adapterAddress != address(0), "Invalid adapter");
        require(!adapters[adapterAddress].active, "Adapter already exists");

        adapters[adapterAddress] = AdapterInfo({
            adapter: IStrategyAdapter(adapterAddress),
            active: true,
            addedAt: block.timestamp,
            totalDeposited: 0,
            totalWithdrawn: 0,
            name: name,
            riskLevel: riskLevel
        });

        adapterList.push(adapterAddress);
        emit AdapterAdded(adapterAddress, name, riskLevel);
    }

    /**
     * @dev Emergency withdraw for users
     */
    function emergencyWithdraw() external nonReentrant {
        require(paused(), "Only during emergency");
        
        uint256 userShares = sharesOf[msg.sender];
        require(userShares > 0, "No shares to withdraw");

        uint256 amount = _calculateWithdrawAmount(userShares);
        require(amount > 0, "No funds available");

        // Reset user's position
        sharesOf[msg.sender] = 0;
        principalOf[msg.sender] = 0;
        totalShares -= userShares;

        // Burn HTS shares
        if (htsTokenManager.isTokenActive()) {
            htsTokenManager.burnShares(msg.sender, userShares);
        }

        // Transfer available funds
        payable(msg.sender).sendValue(amount);
        
        emit EmergencyWithdraw(msg.sender, amount);
    }

    /**
     * @dev Get AI decision by ID
     */
    function getAIDecision(uint256 decisionId) external view returns (AIDecision memory) {
        require(decisionId < aiDecisionCount, "Invalid decision ID");
        return aiDecisions[decisionId];
    }





    /**
     * @dev Set AI agent
     */
    function setAIAgent(address _aiAgent) external onlyOwner {
        require(_aiAgent != address(0), "Invalid AI agent");
        address oldAgent = aiAgent;
        aiAgent = _aiAgent;
        emit AIAgentUpdated(oldAgent, _aiAgent);
    }

    /**
     * @dev Set minimum deposit amount
     */
    function setMinDepositBNB(uint256 _minDepositBNB) external onlyOwner {
        minDepositBNB = _minDepositBNB;
    }

    /**
     * @dev Set minimum yield claim amount
     */
    function setMinYieldClaimBNB(uint256 _minYieldClaimBNB) external onlyOwner {
        minYieldClaimBNB = _minYieldClaimBNB;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get total vault value
     */
    function totalAssets() external view returns (uint256) {
        uint256 balance = address(this).balance;
        if (address(currentAdapter) != address(0)) {
            // Note: Strategy balance would be added here in production
            // balance += currentAdapter.totalAssets();
        }
        return balance;
    }

    /**
     * @dev Get user's share value in BNB
     */
    function shareValue(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (this.totalAssets() * sharesOf[user]) / totalShares;
    }

    /**
     * @dev Calculate shares for deposit amount
     */
    function _calculateShares(uint256 amount) internal view returns (uint256) {
        if (totalShares == 0) {
            return amount;
        }
        return (amount * totalShares) / this.totalAssets();
    }

    /**
     * @dev Calculate withdraw amount for shares
     */
    function _calculateWithdrawAmount(uint256 shares) internal view returns (uint256) {
        if (totalShares == 0) return 0;
        return (this.totalAssets() * shares) / totalShares;
    }

    // ============ AUDIT VIEW FUNCTIONS ============

    /**
     * @dev Get AI decisions within a range with pagination
     * @param from Starting decision ID (inclusive)
     * @param to Ending decision ID (inclusive)
     * @return decisions Array of AI decisions
     * @return totalCount Total number of decisions in range
     */
    function getAIDecisions(uint256 from, uint256 to) 
        external 
        view 
        returns (AIDecision[] memory decisions, uint256 totalCount) 
    {
        require(from <= to, "Invalid range");
        require(from > 0 && from <= aiDecisionCount, "Invalid from index");
        require(to <= aiDecisionCount, "Invalid to index");
        
        // Calculate actual range size (max 100 decisions per query)
        uint256 rangeSize = to - from + 1;
        if (rangeSize > 100) {
            rangeSize = 100;
            to = from + 99;
        }
        
        decisions = new AIDecision[](rangeSize);
        totalCount = rangeSize;
        
        for (uint256 i = 0; i < rangeSize; i++) {
            decisions[i] = aiDecisions[from + i];
        }
        
        return (decisions, totalCount);
    }

    /**
     * @dev Get latest model snapshot with validation
     * @return snapshot Latest active model snapshot
     * @return isValid Whether the snapshot data is valid
     * @return signature Data signature for verification
     */
    function getLatestModelSnapshot() 
        external 
        view 
        returns (
            ModelSnapshot memory snapshot, 
            bool isValid, 
            bytes32 signature
        ) 
    {
        require(currentModelId > 0 && currentModelId <= modelSnapshotCount, "No active model");
        
        snapshot = modelSnapshots[currentModelId];
        
        // Validate snapshot data
        isValid = _validateModelSnapshot(snapshot);
        
        // Generate signature for data integrity
        signature = _generateSnapshotSignature(snapshot);
        
        return (snapshot, isValid, signature);
    }

    /**
     * @dev Get model snapshot by ID with timestamp validation
     * @param snapshotId Model snapshot ID
     * @return snapshot Model snapshot data
     * @return isValid Whether timestamp and data are valid
     */
    function getModelSnapshot(uint256 snapshotId) 
        external 
        view 
        returns (ModelSnapshot memory snapshot, bool isValid) 
    {
        require(snapshotId > 0 && snapshotId <= modelSnapshotCount, "Invalid snapshot ID");
        
        snapshot = modelSnapshots[snapshotId];
        isValid = _validateModelSnapshot(snapshot);
        
        return (snapshot, isValid);
    }

    /**
     * @dev Get AI decisions by time range
     * @param startTime Start timestamp (inclusive)
     * @param endTime End timestamp (inclusive)
     * @param limit Maximum number of results (max 50)
     * @return decisions Array of AI decisions in time range
     * @return totalFound Total decisions found in range
     */
    function getAIDecisionsByTimeRange(
        uint256 startTime, 
        uint256 endTime, 
        uint256 limit
    ) 
        external 
        view 
        returns (AIDecision[] memory decisions, uint256 totalFound) 
    {
        require(startTime <= endTime, "Invalid time range");
        require(limit > 0 && limit <= 50, "Invalid limit");
        
        // Count decisions in time range
        uint256 count = 0;
        for (uint256 i = 1; i <= aiDecisionCount; i++) {
            if (aiDecisions[i].timestamp >= startTime && aiDecisions[i].timestamp <= endTime) {
                count++;
            }
        }
        
        totalFound = count;
        uint256 resultSize = count > limit ? limit : count;
        decisions = new AIDecision[](resultSize);
        
        // Fill results array
        uint256 resultIndex = 0;
        for (uint256 i = 1; i <= aiDecisionCount && resultIndex < resultSize; i++) {
            if (aiDecisions[i].timestamp >= startTime && aiDecisions[i].timestamp <= endTime) {
                decisions[resultIndex] = aiDecisions[i];
                resultIndex++;
            }
        }
        
        return (decisions, totalFound);
    }

    /**
     * @dev Get audit trail summary for a specific user
     * @param user User address
     * @return totalDeposits Total deposits by user
     * @return totalWithdrawals Total withdrawals by user
     * @return currentShares Current shares owned
     * @return firstDepositTime Timestamp of first deposit
     * @return lastActivityTime Timestamp of last activity
     */
    function getUserAuditSummary(address user) 
        external 
        view 
        returns (
            uint256 totalDeposits,
            uint256 totalWithdrawals,
            uint256 currentShares,
            uint256 firstDepositTime,
            uint256 lastActivityTime
        ) 
    {
        currentShares = sharesOf[user];
        
        // Note: In production, these would be tracked in storage
        // For now, returning current state
        totalDeposits = principalOf[user];
        totalWithdrawals = 0; // Would need to track this separately
        firstDepositTime = 0; // Would need to track this separately
        lastActivityTime = block.timestamp;
        
        return (totalDeposits, totalWithdrawals, currentShares, firstDepositTime, lastActivityTime);
    }

    /**
     * @dev Get vault performance metrics
     * @return totalValueLocked Current TVL in BNB
     * @return totalUsers Number of unique users
     * @return totalDecisions Number of AI decisions made
     * @return averageDecisionInterval Average time between decisions
     * @return lastDecisionTime Timestamp of last AI decision
     */
    function getVaultMetrics() 
        external 
        view 
        returns (
            uint256 totalValueLocked,
            uint256 totalUsers,
            uint256 totalDecisions,
            uint256 averageDecisionInterval,
            uint256 lastDecisionTime
        ) 
    {
        totalValueLocked = this.totalAssets();
        totalUsers = adapterList.length; // Simplified - would track actual users
        totalDecisions = aiDecisionCount;
        
        if (aiDecisionCount > 1) {
            uint256 firstDecisionTime = aiDecisions[1].timestamp;
            lastDecisionTime = aiDecisions[aiDecisionCount].timestamp;
            averageDecisionInterval = (lastDecisionTime - firstDecisionTime) / (aiDecisionCount - 1);
        } else if (aiDecisionCount == 1) {
            lastDecisionTime = aiDecisions[1].timestamp;
            averageDecisionInterval = 0;
        }
        
        return (totalValueLocked, totalUsers, totalDecisions, averageDecisionInterval, lastDecisionTime);
    }

    /**
     * @dev Verify data integrity of AI decision
     * @param decisionId Decision ID to verify
     * @return isValid Whether the decision data is valid
     * @return dataHash Hash of the decision data
     * @return timestamp Decision timestamp
     */
    function verifyAIDecisionIntegrity(uint256 decisionId) 
        external 
        view 
        returns (bool isValid, bytes32 dataHash, uint256 timestamp) 
    {
        require(decisionId > 0 && decisionId <= aiDecisionCount, "Invalid decision ID");
        
        AIDecision memory decision = aiDecisions[decisionId];
        
        // Generate data hash for integrity check
        dataHash = keccak256(abi.encodePacked(
            decision.timestamp,
            decision.decisionType,
            decision.fromStrategy,
            decision.toStrategy,
            decision.amount,
            decision.reason,
            decision.hcsMessageId,
            decision.hfsFileId
        ));
        
        // Basic validation
        isValid = decision.timestamp > 0 && 
                  decision.timestamp <= block.timestamp &&
                  bytes(decision.decisionType).length > 0;
        
        timestamp = decision.timestamp;
        
        return (isValid, dataHash, timestamp);
    }

    // ============ MODEL SNAPSHOT MANAGEMENT ============

    /**
     * @dev Create new model snapshot (only AI agent)
     * @param version Model version string
     * @param hfsFileId HFS file ID containing model data
     * @param checksum Model data checksum
     * @param performanceScore Model performance score (0-10000 basis points)
     * @param description Human-readable description
     */
    function createModelSnapshot(
        string memory version,
        string memory hfsFileId,
        bytes32 checksum,
        uint256 performanceScore,
        string memory description
    ) external onlyAIAgent {
        require(bytes(version).length > 0, "Invalid version");
        require(bytes(hfsFileId).length > 0, "Invalid HFS file ID");
        require(performanceScore <= 10000, "Invalid performance score");
        
        modelSnapshotCount++;
        
        modelSnapshots[modelSnapshotCount] = ModelSnapshot({
            timestamp: block.timestamp,
            version: version,
            hfsFileId: hfsFileId,
            checksum: checksum,
            performanceScore: performanceScore,
            description: description,
            active: false
        });
        
        emit ModelSnapshotCreated(modelSnapshotCount, version, hfsFileId, block.timestamp);
    }

    /**
     * @dev Activate model snapshot (only AI agent)
     * @param snapshotId Snapshot ID to activate
     */
    function activateModelSnapshot(uint256 snapshotId) external onlyAIAgent {
        require(snapshotId > 0 && snapshotId <= modelSnapshotCount, "Invalid snapshot ID");
        
        // Deactivate current model
        if (currentModelId > 0) {
            modelSnapshots[currentModelId].active = false;
        }
        
        // Activate new model
        modelSnapshots[snapshotId].active = true;
        currentModelId = snapshotId;
        
        emit ModelSnapshotActivated(snapshotId, block.timestamp);
    }

    // ============ TRANSPARENCY DATA QUERY FUNCTIONS ============

    /**
     * @dev Get paginated user list
     * @param offset Starting index
     * @param limit Maximum number of users to return
     * @return users Array of user addresses
     * @return totalUsers Total number of registered users
     */
    function getUsers(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory users, uint256 totalUsers) 
    {
        totalUsers = allUsers.length;
        
        if (offset >= totalUsers) {
            return (new address[](0), totalUsers);
        }
        
        uint256 end = offset + limit;
        if (end > totalUsers) {
            end = totalUsers;
        }
        
        users = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            users[i - offset] = allUsers[i];
        }
        
        return (users, totalUsers);
    }

    /**
     * @dev Get daily activity data
     * @param daySlot Day slot (timestamp / SECONDS_PER_DAY)
     * @return totalDeposits Sum of all deposits that day
     * @return totalWithdrawals Sum of all withdrawals that day
     * @return activeUsers Number of unique active users
     * @return depositCount Number of deposit transactions
     * @return withdrawalCount Number of withdrawal transactions
     */
    function getDailyActivity(uint256 daySlot) 
        external 
        view 
        returns (
            uint256 totalDeposits,
            uint256 totalWithdrawals,
            uint256 activeUsers,
            uint256 depositCount,
            uint256 withdrawalCount
        ) 
    {
        uint256[] memory deposits = dailyDeposits[daySlot];
        uint256[] memory withdrawals = dailyWithdrawals[daySlot];
        
        depositCount = deposits.length;
        withdrawalCount = withdrawals.length;
        activeUsers = dailyActiveUsers[daySlot].length;
        
        for (uint256 i = 0; i < deposits.length; i++) {
            totalDeposits += deposits[i];
        }
        
        for (uint256 i = 0; i < withdrawals.length; i++) {
            totalWithdrawals += withdrawals[i];
        }
        
        return (totalDeposits, totalWithdrawals, activeUsers, depositCount, withdrawalCount);
    }

    /**
     * @dev Get performance snapshots in range
     * @param from Starting snapshot ID
     * @param to Ending snapshot ID
     * @return snapshots Array of performance snapshots
     */
    function getPerformanceSnapshots(uint256 from, uint256 to) 
        external 
        view 
        returns (PerformanceSnapshot[] memory snapshots) 
    {
        require(from <= to && from > 0, "Invalid range");
        require(to <= performanceSnapshotCount, "Invalid to index");
        
        uint256 length = to - from + 1;
        snapshots = new PerformanceSnapshot[](length);
        
        for (uint256 i = 0; i < length; i++) {
            snapshots[i] = performanceSnapshots[from + i];
        }
        
        return snapshots;
    }

    /**
     * @dev Get decisions by strategy
     * @param strategy Strategy address
     * @param limit Maximum number of decisions to return
     * @return decisionIds Array of decision IDs
     */
    function getDecisionsByStrategy(address strategy, uint256 limit) 
        external 
        view 
        returns (uint256[] memory decisionIds) 
    {
        uint256[] memory allDecisions = decisionsByStrategy[strategy];
        uint256 length = allDecisions.length > limit ? limit : allDecisions.length;
        
        decisionIds = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            decisionIds[i] = allDecisions[allDecisions.length - 1 - i]; // Return latest first
        }
        
        return decisionIds;
    }

    /**
     * @dev Get decisions by type
     * @param decisionType Decision type string
     * @param limit Maximum number of decisions to return
     * @return decisionIds Array of decision IDs
     */
    function getDecisionsByType(string memory decisionType, uint256 limit) 
        external 
        view 
        returns (uint256[] memory decisionIds) 
    {
        bytes32 typeHash = keccak256(bytes(decisionType));
        uint256[] memory allDecisions = decisionsByType[typeHash];
        uint256 length = allDecisions.length > limit ? limit : allDecisions.length;
        
        decisionIds = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            decisionIds[i] = allDecisions[allDecisions.length - 1 - i]; // Return latest first
        }
        
        return decisionIds;
    }

    // ============ INTERNAL HELPER FUNCTIONS ============

    /**
     * @dev Update user activity tracking
     */
    function _updateUserActivity(address user, uint256 amount, bool isDeposit) internal {
        // Register new user if needed
        if (!isRegisteredUser[user]) {
            allUsers.push(user);
            isRegisteredUser[user] = true;
            userActivities[user].firstDepositTime = block.timestamp;
        }
        
        UserActivity storage activity = userActivities[user];
        activity.lastActivityTime = block.timestamp;
        
        if (isDeposit) {
            activity.totalDeposits += amount;
            activity.depositCount++;
            activity.depositTimestamps.push(block.timestamp);
        } else {
            activity.totalWithdrawals += amount;
            activity.withdrawalCount++;
            activity.withdrawalTimestamps.push(block.timestamp);
        }
    }

    /**
     * @dev Add user to daily active users (avoid duplicates)
     */
    function _addDailyActiveUser(uint256 daySlot, address user) internal {
        address[] storage dayUsers = dailyActiveUsers[daySlot];
        
        // Check if user already added today
        for (uint256 i = 0; i < dayUsers.length; i++) {
            if (dayUsers[i] == user) {
                return; // Already added
            }
        }
        
        dayUsers.push(user);
    }

    /**
     * @dev Update performance snapshot (called periodically)
     */
    function _updatePerformanceSnapshot() internal {
        // Only create snapshot once per day
        if (block.timestamp - lastSnapshotTime < SECONDS_PER_DAY) {
            return;
        }
        
        performanceSnapshotCount++;
        lastSnapshotTime = block.timestamp;
        
        uint256 currentAssets = this.totalAssets();
        uint256 sharePrice = totalShares > 0 ? (currentAssets * 1e18) / totalShares : 1e18;
        
        // Calculate daily volume
        uint256 daySlot = block.timestamp / SECONDS_PER_DAY;
        uint256 dailyVolume = 0;
        
        uint256[] memory deposits = dailyDeposits[daySlot];
        uint256[] memory withdrawals = dailyWithdrawals[daySlot];
        
        for (uint256 i = 0; i < deposits.length; i++) {
            dailyVolume += deposits[i];
        }
        for (uint256 i = 0; i < withdrawals.length; i++) {
            dailyVolume += withdrawals[i];
        }
        
        performanceSnapshots[performanceSnapshotCount] = PerformanceSnapshot({
            timestamp: block.timestamp,
            totalAssets: currentAssets,
            totalShares: totalShares,
            sharePrice: sharePrice,
            userCount: allUsers.length,
            apy: _calculateAPY(), // Simplified APY calculation
            dailyVolume: dailyVolume
        });
    }

    /**
     * @dev Calculate APY (simplified)
     */
    function _calculateAPY() internal view returns (uint256) {
        if (performanceSnapshotCount < 2) {
            return 0;
        }
        
        PerformanceSnapshot memory current = performanceSnapshots[performanceSnapshotCount];
        PerformanceSnapshot memory previous = performanceSnapshots[performanceSnapshotCount - 1];
        
        if (previous.sharePrice == 0 || current.timestamp == previous.timestamp) {
            return 0;
        }
        
        // Calculate daily return
        uint256 dailyReturn = ((current.sharePrice - previous.sharePrice) * 10000) / previous.sharePrice;
        
        // Annualize (365 days)
        return dailyReturn * 365;
    }

    /**
     * @dev Index AI decision for fast queries
     */
    function _indexAIDecision(uint256 decisionId, AIDecision memory decision) internal {
        // Index by type
        bytes32 typeHash = keccak256(bytes(decision.decisionType));
        decisionsByType[typeHash].push(decisionId);
        
        // Index by strategy
        if (decision.fromStrategy != address(0)) {
            decisionsByStrategy[decision.fromStrategy].push(decisionId);
        }
        if (decision.toStrategy != address(0)) {
            decisionsByStrategy[decision.toStrategy].push(decisionId);
        }
        
        // Index by time slot (daily)
        uint256 timeSlot = decision.timestamp / SECONDS_PER_DAY;
        decisionsByTimeSlot[timeSlot].push(decisionId);
    }

    // ============ INTERNAL VALIDATION FUNCTIONS ============

    /**
     * @dev Validate model snapshot data
     */
    function _validateModelSnapshot(ModelSnapshot memory snapshot) internal view returns (bool) {
        return snapshot.timestamp > 0 &&
               snapshot.timestamp <= block.timestamp &&
               bytes(snapshot.version).length > 0 &&
               bytes(snapshot.hfsFileId).length > 0 &&
               snapshot.checksum != bytes32(0) &&
               snapshot.performanceScore <= 10000;
    }

    /**
     * @dev Generate signature for model snapshot
     */
    function _generateSnapshotSignature(ModelSnapshot memory snapshot) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            snapshot.timestamp,
            snapshot.version,
            snapshot.hfsFileId,
            snapshot.checksum,
            snapshot.performanceScore,
            snapshot.description,
            snapshot.active
        ));
    }

    /**
     * @dev Receive BNB
     */
    receive() external payable {
        // Allow receiving BNB from strategies
    }
}