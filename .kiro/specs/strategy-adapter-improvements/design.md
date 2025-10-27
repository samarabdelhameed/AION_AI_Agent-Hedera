# Design Document - Strategy Adapter Layer Improvements

## Overview

This design document outlines the implementation of a comprehensive Strategy Adapter Layer that will transform the AION Vault system into a production-ready DeFi yield optimization platform. The design focuses on creating a unified interface for all yield strategies, implementing proper yield tracking, and demonstrating real returns from integrated protocols.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Agent     │    │   AION Vault     │    │ Strategy Router │
│                 │    │                  │    │                 │
│ - AI Decisions  │◄──►│ - Shares System  │◄──►│ - Multi-Strategy│
│ - Rebalancing   │    │ - User Interface │    │ - Load Balancing│
│ - Monitoring    │    │ - Access Control │    │ - Risk Management│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ IStrategyAdapter     │
                    │ (Unified Interface)  │
                    └──────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ VenusAdapter    │ │PancakeAdapter   │ │  AaveAdapter    │
    │                 │ │                 │ │                 │
    │ - vBNB Supply   │ │ - LP Provision  │ │ - aToken Supply │
    │ - Interest Calc │ │ - Fee Collection│ │ - Rate Tracking │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ Venus Protocol  │ │PancakeSwap DEX  │ │ Aave Protocol   │
    │ (Real vBNB)     │ │ (Real LP Pools) │ │ (Real aTokens)  │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Core Components

#### 1. IStrategyAdapter Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStrategyAdapter {
    // Core Functions
    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 amount);
    function totalAssets() external view returns (uint256);
    function estimatedAPY() external view returns (uint256);
    function underlying() external view returns (address);
    
    // Metadata
    function name() external view returns (string memory);
    function protocolName() external view returns (string memory);
    function riskLevel() external view returns (uint8); // 1-10 scale
    
    // Health Checks
    function isHealthy() external view returns (bool);
    function lastUpdate() external view returns (uint256);
    
    // Emergency
    function emergencyWithdraw() external returns (uint256);
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);
    event YieldAccrued(uint256 oldTotal, uint256 newTotal, uint256 yield);
    event ProtocolError(string reason, bytes data);
}
```

#### 2. Enhanced AION Vault

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IStrategyAdapter.sol";

contract AIONVaultV2 is Ownable, ReentrancyGuard, Pausable {
    // State Variables
    IStrategyAdapter public currentStrategy;
    mapping(address => IStrategyAdapter) public strategies;
    address[] public strategyList;
    
    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;
    
    uint256 public constant PRECISION = 1e18;
    uint256 public performanceFee = 200; // 2%
    uint256 public managementFee = 50;   // 0.5%
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event StrategyChanged(address indexed oldStrategy, address indexed newStrategy);
    event Rebalanced(address indexed fromStrategy, address indexed toStrategy, uint256 amount);
    event FeesCollected(uint256 performanceFee, uint256 managementFee);
    
    // Modifiers
    modifier validStrategy(address strategy) {
        require(address(strategies[strategy]) != address(0), "Invalid strategy");
        _;
    }
    
    // Core Functions
    function deposit(uint256 amount) external payable nonReentrant whenNotPaused returns (uint256 shares) {
        require(amount > 0, "Amount must be > 0");
        require(address(currentStrategy) != address(0), "No active strategy");
        
        // Calculate shares before deposit
        uint256 totalAssetsBefore = currentStrategy.totalAssets();
        
        // Handle BNB deposits
        if (msg.value > 0) {
            require(msg.value == amount, "Amount mismatch");
        } else {
            // Handle ERC20 deposits
            IERC20(currentStrategy.underlying()).transferFrom(msg.sender, address(this), amount);
        }
        
        // Deposit to strategy
        uint256 strategyShares = currentStrategy.deposit(amount);
        
        // Calculate vault shares
        shares = totalShares == 0 
            ? amount 
            : (amount * totalShares) / totalAssetsBefore;
            
        sharesOf[msg.sender] += shares;
        totalShares += shares;
        
        emit Deposited(msg.sender, amount, shares);
    }
    
    function withdraw(uint256 shares) external nonReentrant returns (uint256 amount) {
        require(shares > 0, "Shares must be > 0");
        require(sharesOf[msg.sender] >= shares, "Insufficient shares");
        
        // Calculate withdrawal amount
        amount = (shares * currentStrategy.totalAssets()) / totalShares;
        
        // Update shares
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        
        // Withdraw from strategy
        uint256 withdrawn = currentStrategy.withdraw(shares);
        require(withdrawn >= amount, "Insufficient withdrawal");
        
        // Transfer to user
        if (currentStrategy.underlying() == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(currentStrategy.underlying()).transfer(msg.sender, amount);
        }
        
        emit Withdrawn(msg.sender, amount, shares);
    }
    
    function rebalance(address newStrategy, uint256 amount) external onlyOwner validStrategy(newStrategy) {
        require(address(currentStrategy) != newStrategy, "Same strategy");
        require(amount <= currentStrategy.totalAssets(), "Insufficient assets");
        
        address oldStrategy = address(currentStrategy);
        
        // Withdraw from current strategy
        uint256 withdrawn = currentStrategy.withdraw(amount);
        
        // Deposit to new strategy
        IStrategyAdapter(newStrategy).deposit(withdrawn);
        
        emit Rebalanced(oldStrategy, newStrategy, withdrawn);
    }
    
    function setStrategy(address newStrategy) external onlyOwner validStrategy(newStrategy) {
        address oldStrategy = address(currentStrategy);
        currentStrategy = IStrategyAdapter(newStrategy);
        emit StrategyChanged(oldStrategy, newStrategy);
    }
    
    // View Functions
    function totalAssets() public view returns (uint256) {
        return address(currentStrategy) != address(0) 
            ? currentStrategy.totalAssets() 
            : 0;
    }
    
    function pricePerShare() public view returns (uint256) {
        return totalShares == 0 
            ? PRECISION 
            : (totalAssets() * PRECISION) / totalShares;
    }
    
    function balanceOf(address user) external view returns (uint256) {
        return (sharesOf[user] * pricePerShare()) / PRECISION;
    }
    
    function estimatedAPY() external view returns (uint256) {
        return address(currentStrategy) != address(0) 
            ? currentStrategy.estimatedAPY() 
            : 0;
    }
}
```

## Components and Interfaces

### 1. Venus Adapter Implementation

```solidity
contract VenusAdapter is IStrategyAdapter, Ownable, ReentrancyGuard {
    IVBNB public immutable vToken;
    address public immutable underlyingAsset;
    
    uint256 public totalDeposited;
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    
    constructor(address _vToken, address _underlying) {
        vToken = IVBNB(_vToken);
        underlyingAsset = _underlying;
    }
    
    function deposit(uint256 amount) external override returns (uint256 shares) {
        require(amount > 0, "Amount must be > 0");
        
        // Get exchange rate before deposit
        uint256 exchangeRateBefore = vToken.exchangeRateStored();
        uint256 vBalanceBefore = vToken.balanceOf(address(this));
        
        // Supply to Venus
        if (underlyingAsset == address(0)) {
            vToken.mint{value: amount}();
        } else {
            IERC20(underlyingAsset).approve(address(vToken), amount);
            require(vToken.mint(amount) == 0, "Venus mint failed");
        }
        
        // Calculate shares based on vToken received
        uint256 vBalanceAfter = vToken.balanceOf(address(this));
        uint256 vTokensReceived = vBalanceAfter - vBalanceBefore;
        
        shares = totalShares == 0 
            ? vTokensReceived 
            : (vTokensReceived * totalShares) / vBalanceBefore;
            
        userShares[msg.sender] += shares;
        totalShares += shares;
        totalDeposited += amount;
        
        emit Deposited(msg.sender, amount, shares);
    }
    
    function withdraw(uint256 shares) external override returns (uint256 amount) {
        require(shares > 0, "Shares must be > 0");
        require(userShares[msg.sender] >= shares, "Insufficient shares");
        
        // Calculate vTokens to redeem
        uint256 vTokenBalance = vToken.balanceOf(address(this));
        uint256 vTokensToRedeem = (shares * vTokenBalance) / totalShares;
        
        // Get underlying amount before redemption
        uint256 underlyingBefore = underlyingAsset == address(0) 
            ? address(this).balance 
            : IERC20(underlyingAsset).balanceOf(address(this));
            
        // Redeem from Venus
        require(vToken.redeemUnderlying(vTokensToRedeem) == 0, "Venus redeem failed");
        
        // Calculate actual amount received
        uint256 underlyingAfter = underlyingAsset == address(0) 
            ? address(this).balance 
            : IERC20(underlyingAsset).balanceOf(address(this));
            
        amount = underlyingAfter - underlyingBefore;
        
        // Update shares
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        totalDeposited -= amount;
        
        emit Withdrawn(msg.sender, shares, amount);
    }
    
    function totalAssets() external view override returns (uint256) {
        if (vToken.balanceOf(address(this)) == 0) return 0;
        
        try vToken.balanceOfUnderlying(address(this)) returns (uint256 balance) {
            return balance;
        } catch {
            // Fallback calculation
            uint256 vBalance = vToken.balanceOf(address(this));
            uint256 exchangeRate = vToken.exchangeRateStored();
            return (vBalance * exchangeRate) / 1e18;
        }
    }
    
    function estimatedAPY() external view override returns (uint256) {
        try vToken.supplyRatePerBlock() returns (uint256 ratePerBlock) {
            // Convert to annual rate (assuming 20 blocks per minute on BSC)
            uint256 blocksPerYear = 365 * 24 * 60 * 20;
            return (ratePerBlock * blocksPerYear * 10000) / 1e18; // Return in basis points
        } catch {
            return 500; // 5% fallback
        }
    }
    
    function underlying() external view override returns (address) {
        return underlyingAsset;
    }
    
    function name() external pure override returns (string memory) {
        return "Venus BNB Strategy";
    }
    
    function protocolName() external pure override returns (string memory) {
        return "Venus Protocol";
    }
    
    function riskLevel() external pure override returns (uint8) {
        return 3; // Medium risk
    }
    
    function isHealthy() external view override returns (bool) {
        try vToken.supplyRatePerBlock() returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }
    
    function lastUpdate() external view override returns (uint256) {
        return block.timestamp;
    }
    
    function emergencyWithdraw() external override onlyOwner returns (uint256) {
        uint256 vBalance = vToken.balanceOf(address(this));
        if (vBalance == 0) return 0;
        
        require(vToken.redeem(vBalance) == 0, "Emergency redeem failed");
        
        uint256 amount = underlyingAsset == address(0) 
            ? address(this).balance 
            : IERC20(underlyingAsset).balanceOf(address(this));
            
        return amount;
    }
    
    receive() external payable {}
}
```

### 2. PancakeSwap Adapter Implementation

```solidity
contract PancakeAdapter is IStrategyAdapter, Ownable, ReentrancyGuard {
    IPancakeRouter public immutable router;
    address public immutable tokenA;
    address public immutable tokenB;
    address public immutable lpToken;
    
    uint256 public totalLPTokens;
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    
    constructor(address _router, address _tokenA, address _tokenB, address _lpToken) {
        router = IPancakeRouter(_router);
        tokenA = _tokenA;
        tokenB = _tokenB;
        lpToken = _lpToken;
    }
    
    function deposit(uint256 amount) external override returns (uint256 shares) {
        require(amount > 0, "Amount must be > 0");
        
        uint256 lpBefore = IERC20(lpToken).balanceOf(address(this));
        
        if (tokenA == address(0)) {
            // BNB + Token pair
            uint256 tokenAmount = amount / 2;
            IERC20(tokenB).approve(address(router), tokenAmount);
            
            router.addLiquidityETH{value: amount / 2}(
                tokenB,
                tokenAmount,
                0, // Accept any amount of tokens
                0, // Accept any amount of BNB
                address(this),
                block.timestamp + 300
            );
        } else {
            // Token + Token pair
            uint256 amountA = amount / 2;
            uint256 amountB = amount / 2;
            
            IERC20(tokenA).approve(address(router), amountA);
            IERC20(tokenB).approve(address(router), amountB);
            
            router.addLiquidity(
                tokenA,
                tokenB,
                amountA,
                amountB,
                0, // Accept any amount of tokenA
                0, // Accept any amount of tokenB
                address(this),
                block.timestamp + 300
            );
        }
        
        uint256 lpAfter = IERC20(lpToken).balanceOf(address(this));
        uint256 lpReceived = lpAfter - lpBefore;
        
        shares = totalShares == 0 
            ? lpReceived 
            : (lpReceived * totalShares) / lpBefore;
            
        userShares[msg.sender] += shares;
        totalShares += shares;
        totalLPTokens += lpReceived;
        
        emit Deposited(msg.sender, amount, shares);
    }
    
    function withdraw(uint256 shares) external override returns (uint256 amount) {
        require(shares > 0, "Shares must be > 0");
        require(userShares[msg.sender] >= shares, "Insufficient shares");
        
        uint256 lpBalance = IERC20(lpToken).balanceOf(address(this));
        uint256 lpToWithdraw = (shares * lpBalance) / totalShares;
        
        uint256 balanceBefore = tokenA == address(0) 
            ? address(this).balance 
            : IERC20(tokenA).balanceOf(address(this));
            
        IERC20(lpToken).approve(address(router), lpToWithdraw);
        
        if (tokenA == address(0)) {
            router.removeLiquidityETH(
                tokenB,
                lpToWithdraw,
                0, // Accept any amount of tokens
                0, // Accept any amount of BNB
                address(this),
                block.timestamp + 300
            );
        } else {
            router.removeLiquidity(
                tokenA,
                tokenB,
                lpToWithdraw,
                0, // Accept any amount of tokenA
                0, // Accept any amount of tokenB
                address(this),
                block.timestamp + 300
            );
        }
        
        uint256 balanceAfter = tokenA == address(0) 
            ? address(this).balance 
            : IERC20(tokenA).balanceOf(address(this));
            
        amount = balanceAfter - balanceBefore;
        
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        totalLPTokens -= lpToWithdraw;
        
        emit Withdrawn(msg.sender, shares, amount);
    }
    
    function totalAssets() external view override returns (uint256) {
        uint256 lpBalance = IERC20(lpToken).balanceOf(address(this));
        if (lpBalance == 0) return 0;
        
        // Get reserves and calculate underlying value
        try IPancakePair(lpToken).getReserves() returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32
        ) {
            uint256 totalSupply = IPancakePair(lpToken).totalSupply();
            if (totalSupply == 0) return 0;
            
            // Calculate proportional share of reserves
            uint256 amount0 = (uint256(reserve0) * lpBalance) / totalSupply;
            uint256 amount1 = (uint256(reserve1) * lpBalance) / totalSupply;
            
            // Return total value (simplified - in production would need price oracle)
            return amount0 + amount1;
        } catch {
            return 0;
        }
    }
    
    function estimatedAPY() external pure override returns (uint256) {
        return 1500; // 15% - in production would calculate from trading fees
    }
    
    function underlying() external view override returns (address) {
        return tokenA;
    }
    
    function name() external pure override returns (string memory) {
        return "PancakeSwap LP Strategy";
    }
    
    function protocolName() external pure override returns (string memory) {
        return "PancakeSwap";
    }
    
    function riskLevel() external pure override returns (uint8) {
        return 5; // Medium-high risk due to impermanent loss
    }
    
    function isHealthy() external view override returns (bool) {
        return IERC20(lpToken).totalSupply() > 0;
    }
    
    function lastUpdate() external view override returns (uint256) {
        return block.timestamp;
    }
    
    function emergencyWithdraw() external override onlyOwner returns (uint256) {
        uint256 lpBalance = IERC20(lpToken).balanceOf(address(this));
        if (lpBalance == 0) return 0;
        
        IERC20(lpToken).approve(address(router), lpBalance);
        
        if (tokenA == address(0)) {
            router.removeLiquidityETH(
                tokenB,
                lpBalance,
                0,
                0,
                address(this),
                block.timestamp + 300
            );
            return address(this).balance;
        } else {
            router.removeLiquidity(
                tokenA,
                tokenB,
                lpBalance,
                0,
                0,
                address(this),
                block.timestamp + 300
            );
            return IERC20(tokenA).balanceOf(address(this));
        }
    }
    
    receive() external payable {}
}
```

## Data Models

### 1. Strategy Metadata

```solidity
struct StrategyMetadata {
    address adapter;
    string name;
    string protocol;
    uint8 riskLevel;
    uint256 tvl;
    uint256 apy;
    bool active;
    uint256 lastUpdate;
}
```

### 2. User Position

```solidity
struct UserPosition {
    uint256 shares;
    uint256 depositedAt;
    uint256 lastInteraction;
    uint256 totalDeposited;
    uint256 totalWithdrawn;
}
```

### 3. Rebalancing Parameters

```solidity
struct RebalanceParams {
    address fromStrategy;
    address toStrategy;
    uint256 amount;
    uint256 minAmountOut;
    uint256 deadline;
    bytes extraData;
}
```

## Error Handling

### 1. Strategy Adapter Errors

```solidity
error StrategyNotHealthy(address strategy);
error InsufficientLiquidity(uint256 requested, uint256 available);
error ProtocolError(string protocol, bytes data);
error InvalidStrategy(address strategy);
error RebalanceFailed(address from, address to, uint256 amount);
```

### 2. Vault Errors

```solidity
error InsufficientShares(address user, uint256 requested, uint256 available);
error NoActiveStrategy();
error InvalidAmount(uint256 amount);
error DepositFailed(address strategy, uint256 amount);
error WithdrawalFailed(address strategy, uint256 shares);
```

## Testing Strategy

### 1. Unit Tests

- **Adapter Tests**: Test each adapter's core functions with mocked protocols
- **Vault Tests**: Test shares calculation, rebalancing, and access control
- **Integration Tests**: Test adapter-vault interactions

### 2. Integration Tests

- **Real Protocol Tests**: Test with actual Venus, PancakeSwap contracts on testnet
- **End-to-End Tests**: Full deposit → yield accrual → withdrawal flow
- **Rebalancing Tests**: Test strategy switching with real funds

### 3. Stress Tests

- **High Volume**: Test with large deposits and withdrawals
- **Multiple Users**: Test concurrent operations
- **Protocol Failures**: Test error handling when protocols fail

### 4. Security Tests

- **Reentrancy**: Test all external calls for reentrancy vulnerabilities
- **Access Control**: Test unauthorized access attempts
- **Edge Cases**: Test with zero amounts, empty strategies, etc.

## Deployment Strategy

### 1. Phase 1: Core Infrastructure
- Deploy IStrategyAdapter interface
- Deploy AIONVaultV2 with basic functionality
- Deploy VenusAdapter for BNB

### 2. Phase 2: Multi-Strategy Support
- Deploy PancakeAdapter
- Deploy AaveAdapter
- Implement strategy switching

### 3. Phase 3: Advanced Features
- Implement automated rebalancing
- Add performance fees
- Integrate with MCP Agent

### 4. Phase 4: Production Optimization
- Gas optimization
- Security audits
- Mainnet deployment

This design provides a solid foundation for implementing the Strategy Adapter Layer while maintaining security, flexibility, and real protocol integration.