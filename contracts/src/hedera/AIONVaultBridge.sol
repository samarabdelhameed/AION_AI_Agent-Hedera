// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AIONVaultHedera.sol";
import "./BridgeAdapter.sol";
import "../interfaces/IBridgeAdapter.sol";

/**
 * @title AIONVaultBridge
 * @dev Extended AION Vault with integrated cross-chain bridge functionality
 * @notice Enables seamless cross-chain operations for vault shares
 */
contract AIONVaultBridge is AIONVaultHedera {
    
    // Bridge integration
    BridgeAdapter public immutable bridgeAdapter;
    
    // Bridge operation tracking
    mapping(bytes32 => BridgeVaultOperation) public bridgeVaultOperations;
    mapping(address => bytes32[]) public userBridgeOperations;
    
    struct BridgeVaultOperation {
        bytes32 bridgeOperationId;      // Bridge adapter operation ID
        address user;                   // User address
        uint256 vaultShares;            // Vault shares involved
        uint256 amount;                 // BNB amount
        BridgeVaultType operationType;  // Operation type
        uint256 timestamp;              // Operation timestamp
        bool completed;                 // Whether operation is completed
        string hcsMessageId;            // HCS message ID for audit
    }
    
    enum BridgeVaultType {
        DepositFromBridge,    // Deposit from cross-chain bridge
        WithdrawToBridge      // Withdraw to cross-chain bridge
    }
    
    // Events
    event BridgeDepositInitiated(
        bytes32 indexed bridgeOpId,
        address indexed user,
        uint256 amount,
        uint256 sourceChainId
    );
    
    event BridgeWithdrawInitiated(
        bytes32 indexed bridgeOpId,
        address indexed user,
        uint256 shares,
        uint256 targetChainId
    );
    
    event BridgeOperationCompleted(
        bytes32 indexed bridgeOpId,
        address indexed user,
        uint256 amount,
        bool success
    );
    
    event CrossChainSharesIssued(
        address indexed user,
        uint256 shares,
        uint256 htsShares,
        bytes32 bridgeOpId
    );
    
    event CrossChainSharesRedeemed(
        address indexed user,
        uint256 shares,
        uint256 amount,
        bytes32 bridgeOpId
    );
    
    constructor(
        address initialOwner,
        address _bridgeAdapter
    ) AIONVaultHedera(initialOwner) {
        require(_bridgeAdapter != address(0), "Invalid bridge adapter");
        bridgeAdapter = BridgeAdapter(_bridgeAdapter);
    }
    
    /**
     * @dev Deposit BNB from cross-chain bridge and receive vault shares
     * @param amount Amount of BNB to deposit
     * @param sourceChainId Source chain ID where tokens originated
     * @param bridgeOpId Bridge operation ID for tracking
     */
    function depositFromBridge(
        uint256 amount,
        uint256 sourceChainId,
        bytes32 bridgeOpId
    ) external payable nonReentrant whenNotPaused validAmount(amount) {
        require(msg.value == amount, "Incorrect BNB amount");
        require(bridgeOpId != bytes32(0), "Invalid bridge operation ID");
        
        // Verify this is called by bridge adapter or authorized bridge service
        require(
            msg.sender == address(bridgeAdapter) || 
            msg.sender == bridgeAdapter.bridgeService(),
            "Unauthorized bridge deposit"
        );
        
        // Calculate shares for the deposit
        uint256 shares = _calculateShares(amount);
        
        // Update internal accounting
        sharesOf[tx.origin] += shares;  // Use tx.origin to get actual user
        principalOf[tx.origin] += amount;
        totalShares += shares;
        
        // Mint HTS shares to user
        if (htsTokenManager.isTokenActive()) {
            htsTokenManager.associateUserWithToken(tx.origin);
            uint64 newSupply = htsTokenManager.mintShares(tx.origin, shares);
            
            emit CrossChainSharesIssued(tx.origin, shares, newSupply, bridgeOpId);
        }
        
        // Record bridge vault operation
        bridgeVaultOperations[bridgeOpId] = BridgeVaultOperation({
            bridgeOperationId: bridgeOpId,
            user: tx.origin,
            vaultShares: shares,
            amount: amount,
            operationType: BridgeVaultType.DepositFromBridge,
            timestamp: block.timestamp,
            completed: true,
            hcsMessageId: ""
        });
        
        userBridgeOperations[tx.origin].push(bridgeOpId);
        
        // Deploy to current strategy if available
        if (address(currentAdapter) != address(0) && adapters[address(currentAdapter)].active) {
            adapters[address(currentAdapter)].totalDeposited += amount;
        }
        
        emit BridgeDepositInitiated(bridgeOpId, tx.origin, amount, sourceChainId);
        emit Deposit(tx.origin, amount, shares, htsTokenManager.isTokenActive() ? htsTokenManager.getTotalSupply() : 0);
    }
    
    /**
     * @dev Initiate withdrawal to cross-chain bridge
     * @param shares Amount of shares to withdraw
     * @param targetChainId Target chain ID for bridge operation
     * @param recipient Recipient address on target chain
     */
    function withdrawToBridge(
        uint256 shares,
        uint256 targetChainId,
        address recipient
    ) external nonReentrant whenNotPaused validAmount(shares) returns (bytes32 bridgeOpId) {
        require(sharesOf[msg.sender] >= shares, "Insufficient shares");
        require(recipient != address(0), "Invalid recipient");
        require(htsTokenManager.isTokenActive(), "HTS token not initialized");
        
        // Calculate withdrawal amount
        uint256 amount = _calculateWithdrawAmount(shares);
        require(amount > 0, "No funds to withdraw");
        
        // Validate bridge operation
        address htsToken = htsTokenManager.getTokenAddress();
        (bool valid, string memory reason) = bridgeAdapter.validateBridgeOperation(
            htsToken,
            targetChainId,
            shares
        );
        require(valid, reason);
        
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
            adapters[address(currentAdapter)].totalWithdrawn += withdrawFromStrategy;
        }
        
        // Initiate bridge operation
        bridgeOpId = bridgeAdapter.bridgeFromHedera(
            htsToken,
            shares,
            targetChainId,
            recipient
        );
        
        // Record bridge vault operation
        bridgeVaultOperations[bridgeOpId] = BridgeVaultOperation({
            bridgeOperationId: bridgeOpId,
            user: msg.sender,
            vaultShares: shares,
            amount: amount,
            operationType: BridgeVaultType.WithdrawToBridge,
            timestamp: block.timestamp,
            completed: false,
            hcsMessageId: ""
        });
        
        userBridgeOperations[msg.sender].push(bridgeOpId);
        
        emit BridgeWithdrawInitiated(bridgeOpId, msg.sender, shares, targetChainId);
        emit CrossChainSharesRedeemed(msg.sender, shares, amount, bridgeOpId);
        
        return bridgeOpId;
    }
    
    /**
     * @dev Complete bridge withdrawal operation
     * @param bridgeOpId Bridge operation ID
     * @param success Whether the bridge operation was successful
     */
    function completeBridgeWithdraw(
        bytes32 bridgeOpId,
        bool success
    ) external {
        require(
            msg.sender == address(bridgeAdapter) || 
            msg.sender == bridgeAdapter.bridgeService(),
            "Unauthorized completion"
        );
        
        BridgeVaultOperation storage operation = bridgeVaultOperations[bridgeOpId];
        require(!operation.completed, "Operation already completed");
        require(operation.operationType == BridgeVaultType.WithdrawToBridge, "Invalid operation type");
        
        operation.completed = true;
        
        if (success) {
            // Transfer BNB to bridge for cross-chain transfer
            payable(address(bridgeAdapter)).transfer(operation.amount);
        } else {
            // Refund shares to user if bridge failed
            sharesOf[operation.user] += operation.vaultShares;
            totalShares += operation.vaultShares;
            
            // Re-mint HTS shares
            if (htsTokenManager.isTokenActive()) {
                htsTokenManager.mintShares(operation.user, operation.vaultShares);
            }
        }
        
        emit BridgeOperationCompleted(bridgeOpId, operation.user, operation.amount, success);
    }
    
    /**
     * @dev Record bridge operation in AI decision log with HCS integration
     */
    function recordBridgeDecision(
        bytes32 bridgeOpId,
        string memory decisionType,
        string memory reason,
        string memory hcsMessageId,
        string memory hfsFileId
    ) external onlyAIAgent returns (uint256 decisionId) {
        BridgeVaultOperation storage bridgeOp = bridgeVaultOperations[bridgeOpId];
        require(bridgeOp.user != address(0), "Bridge operation not found");
        
        // Record AI decision
        decisionId = recordAIDecision(
            decisionType,
            address(0), // No strategy change for bridge operations
            address(0),
            bridgeOp.amount,
            reason,
            hcsMessageId,
            hfsFileId
        );
        
        // Update bridge operation with HCS message ID
        bridgeOp.hcsMessageId = hcsMessageId;
        
        return decisionId;
    }
    
    /**
     * @dev Get bridge vault operation details
     */
    function getBridgeVaultOperation(
        bytes32 bridgeOpId
    ) external view returns (BridgeVaultOperation memory) {
        return bridgeVaultOperations[bridgeOpId];
    }
    
    /**
     * @dev Get user's bridge vault operations
     */
    function getUserBridgeVaultOperations(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (BridgeVaultOperation[] memory operations) {
        bytes32[] storage userOps = userBridgeOperations[user];
        
        if (offset >= userOps.length) {
            return new BridgeVaultOperation[](0);
        }
        
        uint256 end = offset + limit;
        if (end > userOps.length) {
            end = userOps.length;
        }
        
        operations = new BridgeVaultOperation[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            operations[i - offset] = bridgeVaultOperations[userOps[i]];
        }
        
        return operations;
    }
    
    /**
     * @dev Get bridge adapter address
     */
    function getBridgeAdapter() external view returns (address) {
        return address(bridgeAdapter);
    }
    
    /**
     * @dev Check if bridge operations are supported
     */
    function isBridgeEnabled() external view returns (bool) {
        return address(bridgeAdapter) != address(0) && !bridgeAdapter.paused();
    }
    
    /**
     * @dev Get supported bridge chains
     */
    function getSupportedBridgeChains() external pure returns (uint256[] memory chainIds) {
        chainIds = new uint256[](3);
        chainIds[0] = 1;   // Ethereum
        chainIds[1] = 56;  // BSC
        chainIds[2] = 295; // Hedera
        return chainIds;
    }
    
    /**
     * @dev Emergency function to pause bridge operations
     */
    function pauseBridgeOperations() external onlyOwner {
        bridgeAdapter.pauseBridge();
    }
    
    /**
     * @dev Emergency function to unpause bridge operations
     */
    function unpauseBridgeOperations() external onlyOwner {
        bridgeAdapter.unpauseBridge();
    }
}