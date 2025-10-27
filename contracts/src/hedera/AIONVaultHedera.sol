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

    // AI Decision tracking
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

        // Mint HTS shares to user
        htsTokenManager.associateUserWithToken(msg.sender);
        uint64 newSupply = htsTokenManager.mintShares(msg.sender, shares);

        // Deploy to current strategy if available
        if (address(currentAdapter) != address(0) && adapters[address(currentAdapter)].active) {
            // Note: Strategy deployment would happen here in production
            // currentAdapter.deposit{value: msg.value}();
            adapters[address(currentAdapter)].totalDeposited += msg.value;
        }

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

        // Burn HTS shares
        uint64 newSupply = htsTokenManager.burnShares(msg.sender, shares);

        // Withdraw from strategy if needed
        if (address(currentAdapter) != address(0) && amount > address(this).balance) {
            uint256 withdrawFromStrategy = amount - address(this).balance;
            // Note: Strategy withdrawal would happen here in production
            // currentAdapter.withdraw(withdrawFromStrategy);
            adapters[address(currentAdapter)].totalWithdrawn += withdrawFromStrategy;
        }

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
        decisionId = aiDecisionCount++;
        
        aiDecisions[decisionId] = AIDecision({
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
     * @dev Get AI decisions in range
     */
    function getAIDecisions(uint256 from, uint256 to) external view returns (AIDecision[] memory) {
        require(from <= to && to < aiDecisionCount, "Invalid range");
        
        uint256 length = to - from + 1;
        AIDecision[] memory decisions = new AIDecision[](length);
        
        for (uint256 i = 0; i < length; i++) {
            decisions[i] = aiDecisions[from + i];
        }
        
        return decisions;
    }

    /**
     * @dev Get latest model snapshot info
     */
    function getLatestModelSnapshot() external view returns (string memory hfsFileId, uint256 timestamp) {
        if (aiDecisionCount == 0) {
            return ("", 0);
        }
        
        AIDecision memory latestDecision = aiDecisions[aiDecisionCount - 1];
        return (latestDecision.hfsFileId, latestDecision.timestamp);
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

    /**
     * @dev Receive BNB
     */
    receive() external payable {
        // Allow receiving BNB from strategies
    }
}