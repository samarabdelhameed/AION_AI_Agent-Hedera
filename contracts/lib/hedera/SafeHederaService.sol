// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IHederaTokenService.sol";
import "./HederaResponseCodes.sol";

/**
 * @title SafeHederaService
 * @dev Safe wrapper for Hedera Token Service operations with proper error handling
 * @notice Updated for Hedera Smart Contracts v0.11.0 compatibility
 */
library SafeHederaService {
    IHederaTokenService constant HTS = IHederaTokenService(address(0x167));
    
    error HTSOperationFailed(int responseCode, string operation);
    
    /**
     * @dev Safely create a fungible token with error handling
     */
    function safeCreateFungibleToken(
        IHederaTokenService.HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    ) internal returns (address tokenAddress) {
        (int responseCode, address createdToken) = HTS.createFungibleToken(
            token,
            initialTotalSupply,
            decimals
        );
        
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HTSOperationFailed(responseCode, "createFungibleToken");
        }
        
        return createdToken;
    }
    
    /**
     * @dev Safely mint tokens with error handling
     */
    function safeMintToken(
        address token,
        int64 amount,
        bytes[] memory metadata
    ) internal returns (int64 newTotalSupply, int64[] memory serialNumbers) {
        (int responseCode, int64 supply, int64[] memory serials) = HTS.mintToken(
            token,
            amount,
            metadata
        );
        
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HTSOperationFailed(responseCode, "mintToken");
        }
        
        return (supply, serials);
    }
    
    /**
     * @dev Safely burn tokens with error handling
     */
    function safeBurnToken(
        address token,
        int64 amount,
        int64[] memory serialNumbers
    ) internal returns (int64 newTotalSupply) {
        (int responseCode, int64 supply) = HTS.burnToken(
            token,
            amount,
            serialNumbers
        );
        
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HTSOperationFailed(responseCode, "burnToken");
        }
        
        return supply;
    }
    
    /**
     * @dev Safely associate token with account
     */
    function safeAssociateToken(address account, address token) internal {
        int responseCode = HTS.associateToken(account, token);
        
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HTSOperationFailed(responseCode, "associateToken");
        }
    }
    
    /**
     * @dev Safely transfer tokens
     */
    function safeCryptoTransfer(
        IHederaTokenService.TransferList memory transferList,
        IHederaTokenService.TokenTransferList[] memory tokenTransfers
    ) internal {
        int responseCode = HTS.cryptoTransfer(transferList, tokenTransfers);
        
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HTSOperationFailed(responseCode, "cryptoTransfer");
        }
    }
    
    /**
     * @dev Get token info safely
     */
    function safeGetTokenInfo(address token) 
        internal 
        returns (IHederaTokenService.TokenInfo memory tokenInfo) 
    {
        (int responseCode, IHederaTokenService.TokenInfo memory info) = HTS.getTokenInfo(token);
        
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HTSOperationFailed(responseCode, "getTokenInfo");
        }
        
        return info;
    }
    
    /**
     * @dev Check if response code indicates success
     */
    function isSuccess(int responseCode) internal pure returns (bool) {
        return responseCode == HederaResponseCodes.SUCCESS;
    }
    
    /**
     * @dev Get human readable error message for response code
     */
    function getErrorMessage(int responseCode) internal pure returns (string memory) {
        if (responseCode == HederaResponseCodes.SUCCESS) return "SUCCESS";
        if (responseCode == HederaResponseCodes.INVALID_TOKEN_ID) return "INVALID_TOKEN_ID";
        if (responseCode == HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE) return "INSUFFICIENT_TOKEN_BALANCE";
        if (responseCode == HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT) return "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT";
        if (responseCode == HederaResponseCodes.INVALID_TREASURY_ACCOUNT_FOR_TOKEN) return "INVALID_TREASURY_ACCOUNT_FOR_TOKEN";
        if (responseCode == HederaResponseCodes.TOKEN_HAS_NO_SUPPLY_KEY) return "TOKEN_HAS_NO_SUPPLY_KEY";
        if (responseCode == HederaResponseCodes.INVALID_TOKEN_MINT_AMOUNT) return "INVALID_TOKEN_MINT_AMOUNT";
        if (responseCode == HederaResponseCodes.INVALID_TOKEN_BURN_AMOUNT) return "INVALID_TOKEN_BURN_AMOUNT";
        
        return "UNKNOWN_ERROR";
    }
}