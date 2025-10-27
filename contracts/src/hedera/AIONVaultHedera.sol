// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./HTSTokenManager.sol";

/**
 * @title AIONVaultHedera
 * @dev Enhanced AION Vault with native Hedera integration
 */
contract AIONVaultHedera is Ownable, ReentrancyGuard, Pausable {
    
    // Hedera integration
    HTSTokenManager public htsManager;
    
    // AI Agent
    address public aiAgent;
    
    // Vault state
    uint256 public totalDeposits;
    mapping(address => uint256) public userDeposits;
    
    // Strategy management
    address public currentStrategy;
    mapping(address => bool) public approvedStrategies;
    
    // Time lock for strategy changes
    uint256 public constant STRATEGY_CHANGE_DELAY = 24 hours;
    uint256 public pendingStrategyChangeTime;
    address public pendingStrategy;
    
    // Events
    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares);
    event AIRebalance(
        address indexed agent,
        uint256 timestamp,
        string decisionCid,
        uint256 fromStrategy,
        uint256 toStrategy,
        uint256 amount
    );
    event StrategyChanged(address indexed oldStrategy, address indexed newStrategy);
    event AIAgentUpdated(address indexed oldAgent, address indexed newAgent);
    
    // Modifiers
    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI agent");
        _;
    }
    
    modifier validStrategy(address strategy) {
        require(approvedStrategies[strategy], "Strategy not approved");
        _;
    }

    constructor(
        address initialOwner,
        address _aiAgent
    ) Ownable(initialOwner) {
        aiAgent = _aiAgent;
        htsManager = new HTSTokenManager(address(this));
    }   
 /**
     * @dev Initialize HTS share token
     */
    function initializeShareToken(
        string memory name,
        string memory symbol,
        uint32 decimals
    ) external onlyOwner returns (address) {
        return htsManager.createShareToken(name, symbol, decimals, 0);
    }

    /**
     * @dev Deposit HBAR and receive HTS shares
     */
    function deposit() external payable nonReentrant whenNotPaused returns (uint256 shares) {
        require(msg.value > 0, "Deposit amount must be positive");
        require(htsManager.isTokenActive(), "Share token not initialized");

        uint256 amount = msg.value;
        
        // Calculate shares to mint
        if (htsManager.getTotalShares() == 0) {
            shares = amount; // 1:1 ratio for first deposit
        } else {
            shares = (amount * htsManager.getTotalShares()) / totalDeposits;
        }

        // Update state
        userDeposits[msg.sender] += amount;
        totalDeposits += amount;

        // Associate user with token if needed
        try htsManager.associateUserWithToken(msg.sender) {
            // Association successful or already exists
        } catch {
            // User might already be associated, continue
        }

        // Mint HTS shares to user
        htsManager.mintShares(msg.sender, shares);

        emit Deposit(msg.sender, amount, shares);
        return shares;
    }

    /**
     * @dev Withdraw HBAR by burning HTS shares
     */
    function withdraw(uint256 shares) external nonReentrant whenNotPaused returns (uint256 amount) {
        require(shares > 0, "Shares must be positive");
        require(htsManager.getShareBalance(msg.sender) >= shares, "Insufficient shares");

        // Calculate HBAR amount to withdraw
        amount = (shares * totalDeposits) / htsManager.getTotalShares();
        require(amount <= address(this).balance, "Insufficient vault balance");

        // Update state
        userDeposits[msg.sender] -= amount;
        totalDeposits -= amount;

        // Burn HTS shares
        htsManager.burnShares(msg.sender, shares);

        // Transfer HBAR to user
        payable(msg.sender).transfer(amount);

        emit Withdraw(msg.sender, amount, shares);
        return amount;
    }

    /**
     * @dev Record AI decision (called by AI agent)
     */
    function recordAIDecision(
        string memory decisionCid,
        uint256 fromStrategy,
        uint256 toStrategy,
        uint256 amount
    ) external onlyAIAgent {
        emit AIRebalance(
            msg.sender,
            block.timestamp,
            decisionCid,
            fromStrategy,
            toStrategy,
            amount
        );
    }

    /**
     * @dev Propose strategy change with time lock
     */
    function proposeStrategyChange(address newStrategy) 
        external 
        onlyOwner 
        validStrategy(newStrategy) 
    {
        require(newStrategy != currentStrategy, "Same strategy");
        
        pendingStrategy = newStrategy;
        pendingStrategyChangeTime = block.timestamp + STRATEGY_CHANGE_DELAY;
        
        emit StrategyChanged(currentStrategy, newStrategy);
    }

    /**
     * @dev Execute pending strategy change after time lock
     */
    function executeStrategyChange() external onlyOwner {
        require(pendingStrategy != address(0), "No pending strategy");
        require(block.timestamp >= pendingStrategyChangeTime, "Time lock not expired");
        
        currentStrategy = pendingStrategy;
        pendingStrategy = address(0);
        pendingStrategyChangeTime = 0;
    }

    /**
     * @dev Add approved strategy
     */
    function addApprovedStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy address");
        approvedStrategies[strategy] = true;
    }

    /**
     * @dev Remove approved strategy
     */
    function removeApprovedStrategy(address strategy) external onlyOwner {
        approvedStrategies[strategy] = false;
    }

    /**
     * @dev Update AI agent
     */
    function setAIAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "Invalid agent address");
        address oldAgent = aiAgent;
        aiAgent = newAgent;
        emit AIAgentUpdated(oldAgent, newAgent);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw (bypasses normal flow)
     */
    function emergencyWithdraw(address user) external onlyOwner whenPaused {
        uint256 userShares = htsManager.getShareBalance(user);
        if (userShares > 0) {
            uint256 amount = (userShares * totalDeposits) / htsManager.getTotalShares();
            
            // Update state
            userDeposits[user] = 0;
            totalDeposits -= amount;
            
            // Burn shares
            htsManager.burnShares(user, userShares);
            
            // Transfer HBAR
            payable(user).transfer(amount);
            
            emit Withdraw(user, amount, userShares);
        }
    }

    /**
     * @dev Get user share balance
     */
    function getShareBalance(address user) external view returns (uint256) {
        return htsManager.getShareBalance(user);
    }

    /**
     * @dev Get total shares
     */
    function getTotalShares() external view returns (uint256) {
        return htsManager.getTotalShares();
    }

    /**
     * @dev Get HTS token info
     */
    function getTokenInfo() external view returns (HTSTokenManager.TokenInfo memory) {
        return htsManager.getTokenInfo();
    }

    /**
     * @dev Check if share token is active
     */
    function isShareTokenActive() external view returns (bool) {
        return htsManager.isTokenActive();
    }

    /**
     * @dev Get vault balance
     */
    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Receive HBAR
     */
    receive() external payable {
        // Allow contract to receive HBAR
    }
}