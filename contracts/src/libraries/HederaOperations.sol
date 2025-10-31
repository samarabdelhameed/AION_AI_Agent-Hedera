// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./HederaResponseCodes.sol";

/**
 * @title HederaOperations
 * @dev Library for common Hedera operations with error handling and retry logic
 * @notice Provides utility functions for HTS, HCS, HFS operations with built-in safety checks
 */
library HederaOperations {
    using HederaResponseCodes for int256;

    // ========== STRUCTS ==========
    
    struct RetryConfig {
        uint256 maxRetries;
        uint256 baseDelay;
        uint256 maxDelay;
        bool exponentialBackoff;
    }

    struct OperationResult {
        bool success;
        int256 responseCode;
        bytes data;
        uint256 gasUsed;
        uint256 attempts;
        string errorMessage;
    }

    // ========== EVENTS ==========
    
    event OperationRetried(
        string operationType,
        uint256 attempt,
        int256 responseCode,
        uint256 delay
    );
    
    event OperationCompleted(
        string operationType,
        bool success,
        int256 responseCode,
        uint256 totalAttempts,
        uint256 totalGasUsed
    );

    // ========== HTS OPERATIONS ==========
    
    /**
     * @dev Safe token transfer with retry logic
     * @param tokenAddress HTS token address
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @param retryConfig Retry configuration
     * @return result Operation result with success status and details
     */
    function safeTokenTransfer(
        address tokenAddress,
        address from,
        address to,
        uint256 amount,
        RetryConfig memory retryConfig
    ) internal returns (OperationResult memory result) {
        require(tokenAddress != address(0), "HederaOperations: Invalid token address");
        require(from != address(0) && to != address(0), "HederaOperations: Invalid addresses");
        require(amount > 0, "HederaOperations: Invalid amount");

        result.attempts = 0;
        result.gasUsed = 0;

        for (uint256 i = 0; i <= retryConfig.maxRetries; i++) {
            result.attempts++;
            uint256 gasStart = gasleft();

            // This would call the actual HTS precompiled contract
            // For now, we simulate the operation
            int256 responseCode = _simulateHTSTransfer(tokenAddress, from, to, amount);
            
            result.gasUsed += gasStart - gasleft();
            result.responseCode = responseCode;

            if (responseCode.isSuccess()) {
                result.success = true;
                result.data = abi.encode(tokenAddress, from, to, amount);
                break;
            } else if (!responseCode.shouldRetry() || i == retryConfig.maxRetries) {
                result.success = false;
                result.errorMessage = responseCode.getErrorMessage();
                break;
            } else {
                // Calculate delay for retry
                uint256 delay = _calculateRetryDelay(i, retryConfig);
                
                emit OperationRetried("HTS_TRANSFER", i + 1, responseCode, delay);
                
                // In a real implementation, this would be a proper delay mechanism
                // For now, we just continue to the next iteration
            }
        }

        emit OperationCompleted("HTS_TRANSFER", result.success, result.responseCode, result.attempts, result.gasUsed);
        return result;
    }

    /**
     * @dev Safe token mint with retry logic
     * @param tokenAddress HTS token address
     * @param recipient Recipient address
     * @param amount Amount to mint
     * @param retryConfig Retry configuration
     * @return result Operation result with success status and details
     */
    function safeTokenMint(
        address tokenAddress,
        address recipient,
        uint256 amount,
        RetryConfig memory retryConfig
    ) internal returns (OperationResult memory result) {
        require(tokenAddress != address(0), "HederaOperations: Invalid token address");
        require(recipient != address(0), "HederaOperations: Invalid recipient");
        require(amount > 0, "HederaOperations: Invalid amount");

        result.attempts = 0;
        result.gasUsed = 0;

        for (uint256 i = 0; i <= retryConfig.maxRetries; i++) {
            result.attempts++;
            uint256 gasStart = gasleft();

            // This would call the actual HTS precompiled contract
            int256 responseCode = _simulateHTSMint(tokenAddress, recipient, amount);
            
            result.gasUsed += gasStart - gasleft();
            result.responseCode = responseCode;

            if (responseCode.isSuccess()) {
                result.success = true;
                result.data = abi.encode(tokenAddress, recipient, amount);
                break;
            } else if (!responseCode.shouldRetry() || i == retryConfig.maxRetries) {
                result.success = false;
                result.errorMessage = responseCode.getErrorMessage();
                break;
            } else {
                uint256 delay = _calculateRetryDelay(i, retryConfig);
                emit OperationRetried("HTS_MINT", i + 1, responseCode, delay);
            }
        }

        emit OperationCompleted("HTS_MINT", result.success, result.responseCode, result.attempts, result.gasUsed);
        return result;
    }

    /**
     * @dev Safe token burn with retry logic
     * @param tokenAddress HTS token address
     * @param account Account to burn from
     * @param amount Amount to burn
     * @param retryConfig Retry configuration
     * @return result Operation result with success status and details
     */
    function safeTokenBurn(
        address tokenAddress,
        address account,
        uint256 amount,
        RetryConfig memory retryConfig
    ) internal returns (OperationResult memory result) {
        require(tokenAddress != address(0), "HederaOperations: Invalid token address");
        require(account != address(0), "HederaOperations: Invalid account");
        require(amount > 0, "HederaOperations: Invalid amount");

        result.attempts = 0;
        result.gasUsed = 0;

        for (uint256 i = 0; i <= retryConfig.maxRetries; i++) {
            result.attempts++;
            uint256 gasStart = gasleft();

            // This would call the actual HTS precompiled contract
            int256 responseCode = _simulateHTSBurn(tokenAddress, account, amount);
            
            result.gasUsed += gasStart - gasleft();
            result.responseCode = responseCode;

            if (responseCode.isSuccess()) {
                result.success = true;
                result.data = abi.encode(tokenAddress, account, amount);
                break;
            } else if (!responseCode.shouldRetry() || i == retryConfig.maxRetries) {
                result.success = false;
                result.errorMessage = responseCode.getErrorMessage();
                break;
            } else {
                uint256 delay = _calculateRetryDelay(i, retryConfig);
                emit OperationRetried("HTS_BURN", i + 1, responseCode, delay);
            }
        }

        emit OperationCompleted("HTS_BURN", result.success, result.responseCode, result.attempts, result.gasUsed);
        return result;
    }

    // ========== HCS OPERATIONS ==========
    
    /**
     * @dev Safe HCS message submission with retry logic
     * @param topicId HCS topic identifier
     * @param message Message content
     * @param retryConfig Retry configuration
     * @return result Operation result with success status and details
     */
    function safeSubmitMessage(
        bytes32 topicId,
        bytes memory message,
        RetryConfig memory retryConfig
    ) internal returns (OperationResult memory result) {
        require(topicId != bytes32(0), "HederaOperations: Invalid topic ID");
        require(message.length > 0, "HederaOperations: Empty message");
        require(message.length <= 6144, "HederaOperations: Message too large");

        result.attempts = 0;
        result.gasUsed = 0;

        for (uint256 i = 0; i <= retryConfig.maxRetries; i++) {
            result.attempts++;
            uint256 gasStart = gasleft();

            // This would call the actual HCS precompiled contract
            int256 responseCode = _simulateHCSSubmit(topicId, message);
            
            result.gasUsed += gasStart - gasleft();
            result.responseCode = responseCode;

            if (responseCode.isSuccess()) {
                result.success = true;
                result.data = abi.encode(topicId, message);
                break;
            } else if (!responseCode.shouldRetry() || i == retryConfig.maxRetries) {
                result.success = false;
                result.errorMessage = responseCode.getErrorMessage();
                break;
            } else {
                uint256 delay = _calculateRetryDelay(i, retryConfig);
                emit OperationRetried("HCS_SUBMIT", i + 1, responseCode, delay);
            }
        }

        emit OperationCompleted("HCS_SUBMIT", result.success, result.responseCode, result.attempts, result.gasUsed);
        return result;
    }

    // ========== UTILITY FUNCTIONS ==========
    
    /**
     * @dev Calculate retry delay with exponential backoff
     * @param attempt Current attempt number (0-based)
     * @param retryConfig Retry configuration
     * @return delay Delay in seconds
     */
    function _calculateRetryDelay(
        uint256 attempt,
        RetryConfig memory retryConfig
    ) private pure returns (uint256 delay) {
        if (retryConfig.exponentialBackoff) {
            delay = retryConfig.baseDelay * (2 ** attempt);
            if (delay > retryConfig.maxDelay) {
                delay = retryConfig.maxDelay;
            }
        } else {
            delay = retryConfig.baseDelay;
        }
        return delay;
    }

    /**
     * @dev Create default retry configuration
     * @return config Default retry configuration
     */
    function defaultRetryConfig() internal pure returns (RetryConfig memory config) {
        return RetryConfig({
            maxRetries: 3,
            baseDelay: 1,
            maxDelay: 30,
            exponentialBackoff: true
        });
    }

    /**
     * @dev Create aggressive retry configuration for critical operations
     * @return config Aggressive retry configuration
     */
    function aggressiveRetryConfig() internal pure returns (RetryConfig memory config) {
        return RetryConfig({
            maxRetries: 5,
            baseDelay: 2,
            maxDelay: 60,
            exponentialBackoff: true
        });
    }

    /**
     * @dev Create conservative retry configuration for non-critical operations
     * @return config Conservative retry configuration
     */
    function conservativeRetryConfig() internal pure returns (RetryConfig memory config) {
        return RetryConfig({
            maxRetries: 2,
            baseDelay: 5,
            maxDelay: 15,
            exponentialBackoff: false
        });
    }

    // ========== SIMULATION FUNCTIONS (FOR TESTING) ==========
    // These would be replaced with actual Hedera precompiled contract calls
    
    function _simulateHTSTransfer(
        address tokenAddress,
        address from,
        address to,
        uint256 amount
    ) private pure returns (int256) {
        // Simulate various response scenarios
        if (amount == 0) return HederaResponseCodes.INVALID_TOKEN_MINT_AMOUNT;
        if (from == address(0) || to == address(0)) return HederaResponseCodes.INVALID_ACCOUNT_ID;
        return HederaResponseCodes.SUCCESS;
    }

    function _simulateHTSMint(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) private pure returns (int256) {
        if (amount == 0) return HederaResponseCodes.INVALID_TOKEN_MINT_AMOUNT;
        if (recipient == address(0)) return HederaResponseCodes.INVALID_ACCOUNT_ID;
        return HederaResponseCodes.SUCCESS;
    }

    function _simulateHTSBurn(
        address tokenAddress,
        address account,
        uint256 amount
    ) private pure returns (int256) {
        if (amount == 0) return HederaResponseCodes.INVALID_TOKEN_BURN_AMOUNT;
        if (account == address(0)) return HederaResponseCodes.INVALID_ACCOUNT_ID;
        return HederaResponseCodes.SUCCESS;
    }

    function _simulateHCSSubmit(
        bytes32 topicId,
        bytes memory message
    ) private pure returns (int256) {
        if (topicId == bytes32(0)) return HederaResponseCodes.INVALID_TOPIC_ID;
        if (message.length == 0) return HederaResponseCodes.INVALID_TOPIC_MESSAGE;
        if (message.length > 6144) return HederaResponseCodes.MESSAGE_SIZE_TOO_LARGE;
        return HederaResponseCodes.SUCCESS;
    }
}