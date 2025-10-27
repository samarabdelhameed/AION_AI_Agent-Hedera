// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@hedera/IHederaTokenService.sol";
import "@hedera/HederaResponseCodes.sol";
import "@hedera/SafeHederaService.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HTSTokenManager
 * @dev Manages HTS token operations for AION Vault shares
 */
contract HTSTokenManager is Ownable, ReentrancyGuard {
    using SafeHederaService for *;

    // HTS token information
    struct TokenInfo {
        address tokenAddress;
        int64 tokenId;
        string name;
        string symbol;
        uint32 decimals;
        uint64 totalSupply;
        bool isActive;
    }

    // State variables
    TokenInfo public shareToken;
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    
    // Events
    event ShareTokenCreated(
        address indexed tokenAddress,
        int64 indexed tokenId,
        string name,
        string symbol
    );
    
    event SharesMinted(
        address indexed user,
        uint256 amount,
        uint64 newTotalSupply
    );
    
    event SharesBurned(
        address indexed user,
        uint256 amount,
        uint64 newTotalSupply
    );
    
    event TokenAssociated(
        address indexed account,
        address indexed token
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Create HTS token for vault shares
     */
    function createShareToken(
        string memory name,
        string memory symbol,
        uint32 decimals,
        uint64 initialSupply
    ) external onlyOwner returns (address tokenAddress) {
        require(!shareToken.isActive, "Share token already exists");

        // Create token structure
        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: address(this),
            memo: "AION Vault Share Token",
            tokenSupplyType: false, // INFINITE
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: new IHederaTokenService.TokenKey[](1),
            expiry: IHederaTokenService.Expiry({
                second: 0,
                autoRenewAccount: address(0),
                autoRenewPeriod: 0
            })
        });

        // Set supply key to allow minting/burning
        token.tokenKeys[0] = IHederaTokenService.TokenKey({
            keyType: 4, // SUPPLY_KEY
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: "",
                ECDSA_secp256k1: "",
                delegatableContractId: address(0)
            })
        });

        // Create the token using SafeHederaService
        tokenAddress = SafeHederaService.safeCreateFungibleToken(
            token,
            initialSupply,
            decimals
        );

        // Store token information
        shareToken = TokenInfo({
            tokenAddress: tokenAddress,
            tokenId: int64(uint64(uint160(tokenAddress))), // Convert address to tokenId
            name: name,
            symbol: symbol,
            decimals: decimals,
            totalSupply: initialSupply,
            isActive: true
        });

        totalShares = initialSupply;

        emit ShareTokenCreated(tokenAddress, shareToken.tokenId, name, symbol);
        
        return tokenAddress;
    }

    /**
     * @dev Mint shares to user
     */
    function mintShares(
        address user,
        uint256 amount
    ) external onlyOwner nonReentrant returns (uint64 newTotalSupply) {
        require(shareToken.isActive, "Share token not created");
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be positive");

        // Mint tokens using SafeHederaService
        bytes[] memory metadata = new bytes[](0);
        (newTotalSupply,) = SafeHederaService.safeMintToken(
            shareToken.tokenAddress,
            uint64(amount),
            metadata
        );

        // Update internal accounting
        userShares[user] += amount;
        totalShares += amount;
        shareToken.totalSupply = newTotalSupply;

        emit SharesMinted(user, amount, newTotalSupply);
        
        return newTotalSupply;
    }

    /**
     * @dev Burn shares from user
     */
    function burnShares(
        address user,
        uint256 amount
    ) external onlyOwner nonReentrant returns (uint64 newTotalSupply) {
        require(shareToken.isActive, "Share token not created");
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be positive");
        require(userShares[user] >= amount, "Insufficient shares");

        // Burn tokens using SafeHederaService
        int64[] memory serialNumbers = new int64[](0);
        newTotalSupply = SafeHederaService.safeBurnToken(
            shareToken.tokenAddress,
            uint64(amount),
            serialNumbers
        );

        // Update internal accounting
        userShares[user] -= amount;
        totalShares -= amount;
        shareToken.totalSupply = newTotalSupply;

        emit SharesBurned(user, amount, newTotalSupply);
        
        return newTotalSupply;
    }

    /**
     * @dev Associate token with user account
     */
    function associateUserWithToken(address user) external onlyOwner {
        require(shareToken.isActive, "Share token not created");
        require(user != address(0), "Invalid user address");

        SafeHederaService.safeAssociateToken(user, shareToken.tokenAddress);
        
        emit TokenAssociated(user, shareToken.tokenAddress);
    }

    /**
     * @dev Transfer shares between users
     */
    function transferShares(
        address from,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(shareToken.isActive, "Share token not created");
        require(from != address(0) && to != address(0), "Invalid addresses");
        require(amount > 0, "Amount must be positive");
        require(userShares[from] >= amount, "Insufficient shares");

        // Create transfer list
        IHederaTokenService.AccountAmount[] memory transfers = 
            new IHederaTokenService.AccountAmount[](2);
        
        transfers[0] = IHederaTokenService.AccountAmount({
            accountID: from,
            amount: -int64(uint64(amount)),
            isApproval: false
        });
        
        transfers[1] = IHederaTokenService.AccountAmount({
            accountID: to,
            amount: int64(uint64(amount)),
            isApproval: false
        });

        IHederaTokenService.TransferList memory transferList = 
            IHederaTokenService.TransferList({
                transfers: transfers
            });

        // Execute transfer using SafeHederaService
        SafeHederaService.safeCryptoTransfer(transferList);

        // Update internal accounting
        userShares[from] -= amount;
        userShares[to] += amount;
    }

    /**
     * @dev Get token information
     */
    function getTokenInfo() external view returns (TokenInfo memory) {
        return shareToken;
    }

    /**
     * @dev Get user share balance
     */
    function getShareBalance(address user) external view returns (uint256) {
        return userShares[user];
    }

    /**
     * @dev Check if token is active
     */
    function isTokenActive() external view returns (bool) {
        return shareToken.isActive;
    }

    /**
     * @dev Get total shares supply
     */
    function getTotalShares() external view returns (uint256) {
        return totalShares;
    }
}