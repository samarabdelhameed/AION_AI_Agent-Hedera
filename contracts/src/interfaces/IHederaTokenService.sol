// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IHederaTokenService
 * @dev Interface for Hedera Token Service (HTS) operations
 * @notice Provides standardized interface for HTS precompiled contract interactions
 */
interface IHederaTokenService {
    
    // ========== STRUCTS ==========
    
    struct TokenInfo {
        address token;
        uint256 totalSupply;
        bool deleted;
        bool defaultKycStatus;
        bool pauseStatus;
        bool defaultFreezeStatus;
        address treasury;
        string name;
        string symbol;
        string memo;
        uint32 decimals;
        uint256 maxSupply;
        address[] fixedFees;
        address[] fractionalFees;
        address[] royaltyFees;
    }

    struct KeyValue {
        bool inheritAccountKey;
        address contractId;
        bytes ed25519;
        bytes ECDSA_secp256k1;
        address delegatableContractId;
    }

    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;
        uint256 maxSupply;
        bool freezeDefault;
        KeyValue[] tokenKeys;
        Expiry expiry;
    }

    struct Expiry {
        uint256 second;
        address autoRenewAccount;
        uint256 autoRenewPeriod;
    }

    // ========== TOKEN CREATION ==========
    
    /**
     * @dev Create a new HTS token
     * @param token Token configuration
     * @return responseCode Hedera response code
     * @return tokenAddress Address of the created token
     */
    function createFungibleToken(
        HederaToken memory token,
        uint256 initialTotalSupply,
        uint32 decimals
    ) external payable returns (int256 responseCode, address tokenAddress);

    /**
     * @dev Create a new NFT token
     * @param token Token configuration
     * @return responseCode Hedera response code
     * @return tokenAddress Address of the created token
     */
    function createNonFungibleToken(
        HederaToken memory token
    ) external payable returns (int256 responseCode, address tokenAddress);

    // ========== TOKEN OPERATIONS ==========
    
    /**
     * @dev Mint tokens to an account
     * @param token Token address
     * @param amount Amount to mint
     * @param metadata Metadata for NFTs (empty for fungible tokens)
     * @return responseCode Hedera response code
     * @return newTotalSupply New total supply after minting
     * @return serialNumbers Serial numbers for NFTs
     */
    function mintToken(
        address token,
        uint256 amount,
        bytes[] memory metadata
    ) external returns (
        int256 responseCode,
        uint256 newTotalSupply,
        int64[] memory serialNumbers
    );

    /**
     * @dev Burn tokens from treasury account
     * @param token Token address
     * @param amount Amount to burn
     * @param serialNumbers Serial numbers for NFTs
     * @return responseCode Hedera response code
     * @return newTotalSupply New total supply after burning
     */
    function burnToken(
        address token,
        uint256 amount,
        int64[] memory serialNumbers
    ) external returns (int256 responseCode, uint256 newTotalSupply);

    /**
     * @dev Transfer tokens between accounts
     * @param token Token address
     * @param sender Sender account
     * @param receiver Receiver account
     * @param amount Amount to transfer
     * @return responseCode Hedera response code
     */
    function transferToken(
        address token,
        address sender,
        address receiver,
        uint256 amount
    ) external returns (int256 responseCode);

    /**
     * @dev Transfer tokens from one account to multiple accounts
     * @param token Token address
     * @param sender Sender account
     * @param receivers Array of receiver accounts
     * @param amounts Array of amounts to transfer
     * @return responseCode Hedera response code
     */
    function transferTokens(
        address token,
        address sender,
        address[] memory receivers,
        uint256[] memory amounts
    ) external returns (int256 responseCode);

    // ========== ACCOUNT OPERATIONS ==========
    
    /**
     * @dev Associate account with token
     * @param account Account to associate
     * @param tokens Array of token addresses
     * @return responseCode Hedera response code
     */
    function associateTokens(
        address account,
        address[] memory tokens
    ) external returns (int256 responseCode);

    /**
     * @dev Dissociate account from token
     * @param account Account to dissociate
     * @param tokens Array of token addresses
     * @return responseCode Hedera response code
     */
    function dissociateTokens(
        address account,
        address[] memory tokens
    ) external returns (int256 responseCode);

    // ========== TOKEN MANAGEMENT ==========
    
    /**
     * @dev Freeze token for an account
     * @param token Token address
     * @param account Account to freeze
     * @return responseCode Hedera response code
     */
    function freezeToken(
        address token,
        address account
    ) external returns (int256 responseCode);

    /**
     * @dev Unfreeze token for an account
     * @param token Token address
     * @param account Account to unfreeze
     * @return responseCode Hedera response code
     */
    function unfreezeToken(
        address token,
        address account
    ) external returns (int256 responseCode);

    /**
     * @dev Grant KYC to account for token
     * @param token Token address
     * @param account Account to grant KYC
     * @return responseCode Hedera response code
     */
    function grantTokenKyc(
        address token,
        address account
    ) external returns (int256 responseCode);

    /**
     * @dev Revoke KYC from account for token
     * @param token Token address
     * @param account Account to revoke KYC
     * @return responseCode Hedera response code
     */
    function revokeTokenKyc(
        address token,
        address account
    ) external returns (int256 responseCode);

    // ========== TOKEN QUERIES ==========
    
    /**
     * @dev Get token information
     * @param token Token address
     * @return responseCode Hedera response code
     * @return tokenInfo Token information struct
     */
    function getTokenInfo(
        address token
    ) external view returns (int256 responseCode, TokenInfo memory tokenInfo);

    /**
     * @dev Get token balance for account
     * @param token Token address
     * @param account Account to check
     * @return responseCode Hedera response code
     * @return balance Token balance
     */
    function balanceOf(
        address token,
        address account
    ) external view returns (int256 responseCode, uint256 balance);

    /**
     * @dev Check if account is frozen for token
     * @param token Token address
     * @param account Account to check
     * @return responseCode Hedera response code
     * @return frozen Whether account is frozen
     */
    function isFrozen(
        address token,
        address account
    ) external view returns (int256 responseCode, bool frozen);

    /**
     * @dev Check if account has KYC for token
     * @param token Token address
     * @param account Account to check
     * @return responseCode Hedera response code
     * @return kycGranted Whether KYC is granted
     */
    function isKyc(
        address token,
        address account
    ) external view returns (int256 responseCode, bool kycGranted);

    /**
     * @dev Get token default freeze status
     * @param token Token address
     * @return responseCode Hedera response code
     * @return defaultFreezeStatus Default freeze status
     */
    function getTokenDefaultFreezeStatus(
        address token
    ) external view returns (int256 responseCode, bool defaultFreezeStatus);

    /**
     * @dev Get token default KYC status
     * @param token Token address
     * @return responseCode Hedera response code
     * @return defaultKycStatus Default KYC status
     */
    function getTokenDefaultKycStatus(
        address token
    ) external view returns (int256 responseCode, bool defaultKycStatus);

    // ========== TOKEN ALLOWANCES ==========
    
    /**
     * @dev Approve allowance for spender
     * @param token Token address
     * @param spender Spender account
     * @param amount Amount to approve
     * @return responseCode Hedera response code
     */
    function approve(
        address token,
        address spender,
        uint256 amount
    ) external returns (int256 responseCode);

    /**
     * @dev Get allowance amount
     * @param token Token address
     * @param owner Owner account
     * @param spender Spender account
     * @return responseCode Hedera response code
     * @return allowance Allowance amount
     */
    function allowance(
        address token,
        address owner,
        address spender
    ) external view returns (int256 responseCode, uint256 allowance);

    // ========== EVENTS ==========
    
    event TokenCreated(address indexed token, string name, string symbol);
    event TokenMinted(address indexed token, uint256 amount, address indexed recipient);
    event TokenBurned(address indexed token, uint256 amount);
    event TokenTransferred(address indexed token, address indexed from, address indexed to, uint256 amount);
    event TokenAssociated(address indexed account, address indexed token);
    event TokenDissociated(address indexed account, address indexed token);
    event TokenFrozen(address indexed token, address indexed account);
    event TokenUnfrozen(address indexed token, address indexed account);
    event TokenKycGranted(address indexed token, address indexed account);
    event TokenKycRevoked(address indexed token, address indexed account);
}