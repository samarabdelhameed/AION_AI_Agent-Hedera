// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

interface IHederaTokenService {
    /// Transfers cryptocurrency among two or more accounts by making the desired adjustments to their
    /// balances. Each transfer list can specify up to 10 adjustments. Each request is limited to 50
    /// transfer lists, and each transfer list can have a maximum of 20 accounts.
    /// @param transferList the list of hbar transfers to do
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function cryptoTransfer(TransferList memory transferList) external returns (int responseCode);

    /// Transfers cryptocurrency among two or more accounts by making the desired adjustments to their
    /// balances. Each transfer list can specify up to 10 adjustments. Each request is limited to 50
    /// transfer lists, and each transfer list can have a maximum of 20 accounts.
    /// @param transferLists the list of transfers to do
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function cryptoTransfer(TransferList[] memory transferLists) external returns (int responseCode);

    /// Mints an amount of the token to the defined treasury account
    /// @param token The token for which to mint tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount Applicable to tokens of type FUNGIBLE_COMMON. The amount to mint to the Treasury Account.
    ///               Amount must be a positive non-zero number represented in the lowest denomination of the
    ///               token. The new supply must be lower than 2^63.
    /// @param metadata Applicable to tokens of type NON_FUNGIBLE_UNIQUE. A list of metadata that are being
    ///                 created. Maximum allowed size of each metadata is 100 bytes
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs, the serial number of the newly created NFT.
    /// @return serialNumbers If the token is an NFT the newly generate serial numbers, otherwise empty.
    function mintToken(address token, uint64 amount, bytes[] memory metadata)
        external
        returns (int responseCode, uint64 newTotalSupply, int64[] memory serialNumbers);

    /// Burns an amount of the token from the defined treasury account
    /// @param token The token for which to burn tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount  Applicable to tokens of type FUNGIBLE_COMMON. The amount to burn from the Treasury Account.
    ///                Amount must be a positive non-zero number, not bigger than the token balance of the treasury
    ///                account (0; balance], represented in the lowest denomination of the token.
    /// @param serialNumbers Applicable to tokens of type NON_FUNGIBLE_UNIQUE. The list of serial numbers to be
    ///                      burned.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs, the serial number of the burned NFT.
    function burnToken(address token, uint64 amount, int64[] memory serialNumbers)
        external
        returns (int responseCode, uint64 newTotalSupply);

    ///  Associates the provided account with the provided tokens. Must be signed by the provided Account's key.
    ///  If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    ///  If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    ///  If any of the provided tokens is not found, the transaction will resolve to INVALID_TOKEN_ID.
    ///  If any of the provided tokens has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    ///  If an association between the provided account and any of the tokens already exists, the transaction will
    ///  resolve to TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT.
    ///  If the provided account's associations count exceed the constraint of maximum token associations per account,
    ///  the transaction will resolve to TOKENS_PER_ACCOUNT_LIMIT_EXCEEDED.
    ///  On success, associations between the provided account and tokens are made and the account is ready to interact
    ///  with the tokens.
    /// @param account The account to be associated with the provided tokens
    /// @param tokens The tokens to be associated with the provided account. In the case of NON_FUNGIBLE_UNIQUE Type,
    ///               once an account is associated, it can hold any number of NFTs (serial numbers) of that token type
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function associateTokens(address account, address[] memory tokens) external returns (int responseCode);

    /// Single-token variant of associateTokens. Will be mapped to a single-element array call of associateTokens
    /// @param account The account to be associated with the provided token
    /// @param token The token to be associated with the provided account
    function associateToken(address account, address token) external returns (int responseCode);

    /// Dissociates the provided account with the provided tokens. Must be signed by the provided Account's key.
    /// If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    /// If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    /// If any of the provided tokens is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If any of the provided tokens has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If an association between the provided account and any of the tokens does not exist, the transaction will
    /// resolve to TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.
    /// If a token has not been deleted and has not expired, and the user has a nonzero balance, the transaction will
    /// resolve to TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES.
    /// If a fungible token has expired, the user can disassociate even if their token balance is not zero.
    /// If a non fungible token has expired, the user can not disassociate if their token balance is not zero. The
    /// transaction will resolve to TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES.
    /// On success, the association between the provided account and tokens is removed.
    /// @param account The account to be dissociated from the provided tokens
    /// @param tokens The tokens to be dissociated from the provided account
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function dissociateTokens(address account, address[] memory tokens) external returns (int responseCode);

    /// Single-token variant of dissociateTokens. Will be mapped to a single-element array call of dissociateTokens
    /// @param account The account to be dissociated from the provided token
    /// @param token The token to be dissociated from the provided account
    function dissociateToken(address account, address token) external returns (int responseCode);

    /// Creates a Fungible Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param initialTotalSupply Specifies the initial supply of tokens to be put in circulation. The initial supply is
    /// sent to the Treasury Account. The supply is in the lowest denomination possible. In the case for NON_FUNGIBLE_UNIQUE
    /// Type the value must be 0
    /// @param decimals the number of decimal places a token is divisible by
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createFungibleToken(
        HederaToken memory token,
        uint64 initialTotalSupply,
        uint32 decimals
    ) external payable returns (int responseCode, address tokenAddress);

    /// Creates a Fungible Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param initialTotalSupply Specifies the initial supply of tokens to be put in circulation. The initial supply is
    /// sent to the Treasury Account. The supply is in the lowest denomination possible. In the case for NON_FUNGIBLE_UNIQUE
    /// Type the value must be 0
    /// @param decimals the number of decimal places a token is divisible by
    /// @param fixedFees list of fixed fees to apply to the token
    /// @param fractionalFees list of fractional fees to apply to the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createFungibleTokenWithCustomFees(
        HederaToken memory token,
        uint64 initialTotalSupply,
        uint32 decimals,
        FixedFee[] memory fixedFees,
        FractionalFee[] memory fractionalFees
    ) external payable returns (int responseCode, address tokenAddress);

    /// Creates an Non Fungible Unique Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createNonFungibleToken(HederaToken memory token)
        external
        payable
        returns (int responseCode, address tokenAddress);

    /// Creates an Non Fungible Unique Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param fixedFees list of fixed fees to apply to the token
    /// @param royaltyFees list of royalty fees to apply to the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createNonFungibleTokenWithCustomFees(
        HederaToken memory token,
        FixedFee[] memory fixedFees,
        RoyaltyFee[] memory royaltyFees
    ) external payable returns (int responseCode, address tokenAddress);

    /// Retrieves fungible specific token info for a fungible token
    /// @param token The ID of the token as a solidity address
    function getFungibleTokenInfo(address token) external returns (int responseCode, FungibleTokenInfo memory tokenInfo);

    /// Retrieves general token info for a given token
    /// @param token The ID of the token as a solidity address
    function getTokenInfo(address token) external returns (int responseCode, TokenInfo memory tokenInfo);

    /// Retrieves non-fungible specific token info for a given NFT
    /// @param token The ID of the token as a solidity address
    /// @param serialNumber The NFT to get information on
    function getNonFungibleTokenInfo(address token, int64 serialNumber)
        external
        returns (int responseCode, NonFungibleTokenInfo memory tokenInfo);

    /// Operation to freeze token account. Must be signed by the token's freezeKey.
    /// If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    /// If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    /// If the provided token is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If the provided token has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If an Association between the provided token and account is not found, the transaction will resolve to
    /// TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.
    /// If no Freeze Key is defined, the transaction will resolve to TOKEN_HAS_NO_FREEZE_KEY.
    /// Once executed the Account is marked as Frozen and will not be able to receive or send tokens unless unfrozen.
    /// The operation is idempotent.
    /// @param token The token for which this account will be frozen. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param account The account to be frozen
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function freezeToken(address token, address account) external returns (int responseCode);

    /// Operation to unfreeze token account. Must be signed by the token's freezeKey.
    /// If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    /// If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    /// If the provided token is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If the provided token has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If an Association between the provided token and account is not found, the transaction will resolve to
    /// TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.
    /// If no Freeze Key is defined, the transaction will resolve to TOKEN_HAS_NO_FREEZE_KEY.
    /// Once executed the Account is marked as Unfrozen and will be able to receive or send tokens. The operation is
    /// idempotent.
    /// @param token The token for which this account will be unfrozen. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param account The account to be unfrozen
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function unfreezeToken(address token, address account) external returns (int responseCode);

    /// Operation to wipe fungible tokens from account. Must be signed by the token's wipeKey.
    /// If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    /// If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    /// If the provided token is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If the provided token has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If an Association between the provided token and account is not found, the transaction will resolve to
    /// TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.
    /// If no Wipe Key is defined, the transaction will resolve to TOKEN_HAS_NO_WIPE_KEY.
    /// If the provided account is the token's Treasury Account, the transaction will resolve to
    /// CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT
    /// On success, tokens are removed from the account and the total supply of the token is reduced by the wiped amount.
    /// @param token The token for which the account will be wiped. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param account The account to be wiped
    /// @param amount The amount of tokens to wipe from the specified account. Amount must be a positive non-zero
    ///               number in the lowest denomination possible, not bigger than the token balance of the account
    ///               (0; balance]
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function wipeTokenAccount(address token, address account, uint32 amount) external returns (int responseCode);

    /// Operation to wipe non fungible tokens from account. Must be signed by the token's wipeKey.
    /// If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    /// If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    /// If the provided token is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If the provided token has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If an Association between the provided token and account is not found, the transaction will resolve to
    /// TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.
    /// If no Wipe Key is defined, the transaction will resolve to TOKEN_HAS_NO_WIPE_KEY.
    /// If the provided account is the token's Treasury Account, the transaction will resolve to
    /// CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT
    /// On success, tokens are removed from the account and the total supply of the token is reduced by the wiped amount.
    /// @param token The token for which the account will be wiped. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param account The account to be wiped
    /// @param  serialNumbers The serial numbers of token to wipe from the specified account.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function wipeTokenAccountNFT(address token, address account, int64[] memory serialNumbers) external returns (int responseCode);

    /// Operation to update token info. Must be signed by the token's adminKey.
    /// If the provided token is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If the provided token has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If no Admin Key is defined, the transaction will resolve to TOKEN_IS_IMMUTABLE.
    /// @param token The token for which info will be updated. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param tokenInfo The updated info of the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenInfo(address token, HederaToken memory tokenInfo) external returns (int responseCode);

    /// Operation to update token expiry info. Must be signed by the token's adminKey.
    /// If the provided token is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If the provided token has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If no Admin Key is defined, the transaction will resolve to TOKEN_IS_IMMUTABLE.
    /// @param token The token for which expiry info will be updated. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param expiryInfo The new expiry info of the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenExpiryInfo(address token, Expiry memory expiryInfo) external returns (int responseCode);

    /// Operation to update token keys. Must be signed by the token's adminKey and the new key.
    /// If the provided token is not found, the transaction will resolve to INVALID_TOKEN_ID.
    /// If the provided token has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If no Admin Key is defined, the transaction will resolve to TOKEN_IS_IMMUTABLE.
    /// @param token The token for which keys will be updated. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param keys The updated keys
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenKeys(address token, TokenKey[] memory keys) external returns (int responseCode);

    /// Query token custom fees
    /// @param token The token address to return custom fees for
    /// @return responseCode The response code for the status of the request. SUCCESS is 22
    /// @return fixedFees Set of fixed fees for `token`
    /// @return fractionalFees Set of fractional fees for `token`
    /// @return royaltyFees Set of royalty fees for `token`
    function getTokenCustomFees(address token)
        external
        returns (
            int64 responseCode,
            FixedFee[] memory fixedFees,
            FractionalFee[] memory fractionalFees,
            RoyaltyFee[] memory royaltyFees
        );

    /// Allows spender to withdraw from your account multiple times, up to the value amount. If this function is called
    /// again it overwrites the current allowance with value.
    /// Only Applicable to Fungible Tokens
    /// @param token The hedera token address to approve
    /// @param spender the account address authorized to spend
    /// @param amount the amount of tokens authorized to spend.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function approve(address token, address spender, uint256 amount) external returns (int responseCode);

    /// Allows spender to withdraw from your account multiple times, up to the value amount. If this function is called
    /// again it overwrites the current allowance with value.
    /// Only Applicable to Non-Fungible Tokens
    /// @param token The hedera token address to approve
    /// @param approved the account address authorized to spend
    /// @param serialNumber the NFT serial number  to approve
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function approveNFT(address token, address approved, uint256 serialNumber) external returns (int responseCode);

    /// Returns the amount which spender is still allowed to withdraw from owner.
    /// Only Applicable to Fungible Tokens
    /// @param token The Hedera token address to check the allowance of
    /// @param owner the owner of the tokens to be spent
    /// @param spender the spender of the tokens
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return allowance The amount which spender is still allowed to withdraw from owner.
    function allowance(address token, address owner, address spender) external returns (int responseCode, uint256 allowance);

    /// Returns the account approved for the given NFT serial number.
    /// Only Applicable to Non-Fungible Tokens
    /// @param token The Hedera token address to check the approved account of
    /// @param serialNumber the NFT to find the approved account of
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return approved The account approved for the given NFT serial number.
    function getApproved(address token, uint256 serialNumber) external returns (int responseCode, address approved);

    /// Determine if the given account is approved for all NFTs of the given token address.
    /// @param token The Hedera token address to check the approval status of
    /// @param owner the owner of the NFTs
    /// @param operator the operator of the NFTs
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return approved True if the operator is approved, false if not
    function isApprovedForAll(address token, address owner, address operator) external returns (int responseCode, bool approved);

    /// Enable or disable approval for a third party ("operator") to manage all of the caller's tokens for the given token address.
    /// @param token The Hedera token address to set the approval status of
    /// @param operator Address to add to the set of authorized operators
    /// @param approved True if the operator is approved, false to revoke approval
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function setApprovalForAll(address token, address operator, bool approved) external returns (int responseCode);

    /// Returns true if the spender account is allowed to withdraw the given serial number from the given owner account.
    /// @param token The Hedera token address to check
    /// @param owner the owner of the NFT
    /// @param spender the spender of the NFT
    /// @param serialNumber the serial number of the NFT
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return approved the approved status
    function isApprovedForNFT(address token, address owner, address spender, uint256 serialNumber) external returns (int responseCode, bool approved);

    struct TransferList {
        AccountAmount[] transfers;
    }

    struct AccountAmount {
        address accountID;
        int64 amount;
        bool isApproval;
    }

    struct TokenTransferList {
        address token;
        AccountAmount[] transfers;
        NftTransfer[] nftTransfers;
    }

    struct NftTransfer {
        address senderAccountID;
        address receiverAccountID;
        int64 serialNumber;
        bool isApproval;
    }

    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;
        uint32 maxSupply;
        bool freezeDefault;
        TokenKey[] tokenKeys;
        Expiry expiry;
    }

    struct TokenKey {
        uint keyType;
        KeyValue key;
    }

    struct KeyValue {
        bool inheritAccountKey;
        address contractId;
        bytes ed25519;
        bytes ECDSA_secp256k1;
        address delegatableContractId;
    }

    struct Expiry {
        uint32 second;
        address autoRenewAccount;
        uint32 autoRenewPeriod;
    }

    struct FixedFee {
        uint32 amount;
        address tokenId;
        bool useHbarsForPayment;
        bool useCurrentTokenForPayment;
        address feeCollector;
    }

    struct FractionalFee {
        uint32 numerator;
        uint32 denominator;
        uint32 minimumAmount;
        uint32 maximumAmount;
        bool netOfTransfers;
        address feeCollector;
    }

    struct RoyaltyFee {
        uint32 numerator;
        uint32 denominator;
        uint32 amount;
        address tokenId;
        bool useHbarsForPayment;
        address feeCollector;
    }

    struct TokenInfo {
        HederaToken token;
        uint64 totalSupply;
        bool deleted;
        bool defaultKycStatus;
        bool pauseStatus;
        FixedFee[] fixedFees;
        FractionalFee[] fractionalFees;
        RoyaltyFee[] royaltyFees;
        string ledgerId;
    }

    struct FungibleTokenInfo {
        TokenInfo tokenInfo;
        uint32 decimals;
    }

    struct NonFungibleTokenInfo {
        TokenInfo tokenInfo;
        int64 serialNumber;
        address ownerId;
        int64 creationTime;
        bytes metadata;
        address spenderId;
    }
}