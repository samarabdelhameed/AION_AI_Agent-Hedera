// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title HederaResponseCodes
 * @dev Library containing all Hedera response codes and utility functions
 * @notice Provides standardized response codes for all Hedera services (HTS, HCS, HFS, HSCS)
 */
library HederaResponseCodes {
    
    // ========== SUCCESS CODES ==========
    int256 public constant SUCCESS = 22;
    int256 public constant SUCCESS_BUT_MISSING_EXPECTED_OPERATION = 23;

    // ========== GENERAL ERROR CODES ==========
    int256 public constant INVALID_TRANSACTION = 3;
    int256 public constant PAYER_ACCOUNT_NOT_FOUND = 4;
    int256 public constant INVALID_NODE_ACCOUNT = 5;
    int256 public constant TRANSACTION_EXPIRED = 6;
    int256 public constant INVALID_TRANSACTION_START = 7;
    int256 public constant INVALID_TRANSACTION_DURATION = 8;
    int256 public constant INVALID_SIGNATURE = 9;
    int256 public constant MEMO_TOO_LONG = 10;
    int256 public constant INSUFFICIENT_TX_FEE = 11;
    int256 public constant INSUFFICIENT_PAYER_BALANCE = 12;
    int256 public constant DUPLICATE_TRANSACTION = 13;
    int256 public constant BUSY = 14;
    int256 public constant NOT_SUPPORTED = 15;
    int256 public constant INVALID_FILE_ID = 16;
    int256 public constant INVALID_ACCOUNT_ID = 17;
    int256 public constant INVALID_CONTRACT_ID = 18;
    int256 public constant INVALID_TRANSACTION_ID = 19;
    int256 public constant RECEIPT_NOT_FOUND = 20;
    int256 public constant RECORD_NOT_FOUND = 21;

    // ========== ACCOUNT RELATED CODES ==========
    int256 public constant INVALID_SOLIDITY_ADDRESS = 24;
    int256 public constant INSUFFICIENT_GAS = 25;
    int256 public constant CONTRACT_SIZE_LIMIT_EXCEEDED = 26;
    int256 public constant LOCAL_CALL_MODIFICATION_EXCEPTION = 27;
    int256 public constant CONTRACT_REVERT_EXECUTED = 28;
    int256 public constant CONTRACT_EXECUTION_EXCEPTION = 29;
    int256 public constant INVALID_RECEIVING_NODE_ACCOUNT = 30;
    int256 public constant MISSING_QUERY_HEADER = 31;
    int256 public constant ACCOUNT_UPDATE_FAILED = 32;
    int256 public constant INVALID_KEY_ENCODING = 33;
    int256 public constant NULL_SOLIDITY_ADDRESS = 34;
    int256 public constant CONTRACT_UPDATE_FAILED = 35;
    int256 public constant INVALID_QUERY_HEADER = 36;
    int256 public constant INVALID_FEE_SUBMITTED = 37;
    int256 public constant INVALID_PAYER_SIGNATURE = 38;
    int256 public constant KEY_REQUIRED = 39;
    int256 public constant INVALID_EXPIRATION_TIME = 40;
    int256 public constant NO_WACL_KEY = 41;
    int256 public constant FILE_CONTENT_EMPTY = 42;
    int256 public constant INVALID_ACCOUNT_AMOUNTS = 43;
    int256 public constant EMPTY_TRANSACTION_BODY = 44;
    int256 public constant INVALID_TRANSACTION_BODY = 45;

    // ========== TOKEN SERVICE (HTS) CODES ==========
    int256 public constant INVALID_TOKEN_ID = 100;
    int256 public constant INVALID_TOKEN_DECIMALS = 101;
    int256 public constant INVALID_TOKEN_INITIAL_SUPPLY = 102;
    int256 public constant INVALID_TREASURY_ACCOUNT_FOR_TOKEN = 103;
    int256 public constant INVALID_TOKEN_SYMBOL = 104;
    int256 public constant TOKEN_HAS_NO_FREEZE_KEY = 105;
    int256 public constant TRANSFERS_NOT_ZERO_SUM_FOR_TOKEN = 106;
    int256 public constant MISSING_TOKEN_SYMBOL = 107;
    int256 public constant TOKEN_SYMBOL_TOO_LONG = 108;
    int256 public constant ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN = 109;
    int256 public constant TOKEN_KYC_NOT_GRANTED_FOR_TOKEN = 110;
    int256 public constant INSUFFICIENT_TOKEN_BALANCE = 111;
    int256 public constant TOKEN_WAS_DELETED = 112;
    int256 public constant TOKEN_HAS_NO_KYC_KEY = 113;
    int256 public constant TOKEN_HAS_NO_WIPE_KEY = 114;
    int256 public constant INVALID_TOKEN_MINT_AMOUNT = 115;
    int256 public constant INVALID_TOKEN_BURN_AMOUNT = 116;
    int256 public constant TOKEN_NOT_ASSOCIATED_TO_ACCOUNT = 117;
    int256 public constant CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT = 118;
    int256 public constant INVALID_KYC_KEY = 119;
    int256 public constant INVALID_WIPE_KEY = 120;
    int256 public constant INVALID_FREEZE_KEY = 121;
    int256 public constant INVALID_SUPPLY_KEY = 122;
    int256 public constant MISSING_TOKEN_NAME = 123;
    int256 public constant TOKEN_NAME_TOO_LONG = 124;
    int256 public constant INVALID_WIPING_AMOUNT = 125;
    int256 public constant TOKEN_IS_IMMUTABLE = 126;
    int256 public constant TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT = 127;
    int256 public constant TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES = 128;
    int256 public constant ACCOUNT_IS_TREASURY = 129;
    int256 public constant TOKEN_ID_REPEATED_IN_TOKEN_LIST = 130;
    int256 public constant TOKEN_TRANSFER_LIST_SIZE_LIMIT_EXCEEDED = 131;
    int256 public constant EMPTY_TOKEN_TRANSFER_BODY = 132;
    int256 public constant EMPTY_TOKEN_TRANSFER_ACCOUNT_AMOUNTS = 133;
    int256 public constant INVALID_SCHEDULE_ID = 134;
    int256 public constant SCHEDULE_IS_IMMUTABLE = 135;
    int256 public constant INVALID_SCHEDULE_PAYER_ID = 136;
    int256 public constant INVALID_SCHEDULE_ACCOUNT_ID = 137;
    int256 public constant NO_NEW_VALID_SIGNATURES = 138;
    int256 public constant UNRESOLVABLE_REQUIRED_SIGNERS = 139;
    int256 public constant SCHEDULED_TRANSACTION_NOT_IN_WHITELIST = 140;
    int256 public constant SOME_SIGNATURES_WERE_INVALID = 141;
    int256 public constant TRANSACTION_ID_FIELD_NOT_ALLOWED = 142;
    int256 public constant IDENTICAL_SCHEDULE_ALREADY_CREATED = 143;
    int256 public constant INVALID_ZERO_BYTE_IN_STRING = 144;
    int256 public constant SCHEDULE_ALREADY_DELETED = 145;
    int256 public constant SCHEDULE_ALREADY_EXECUTED = 146;
    int256 public constant MESSAGE_SIZE_TOO_LARGE = 147;

    // ========== CONSENSUS SERVICE (HCS) CODES ==========
    int256 public constant INVALID_TOPIC_ID = 150;
    int256 public constant INVALID_ADMIN_KEY = 155;
    int256 public constant INVALID_SUBMIT_KEY = 156;
    int256 public constant UNAUTHORIZED = 167;
    int256 public constant INVALID_TOPIC_MESSAGE = 151;
    int256 public constant INVALID_AUTORENEW_ACCOUNT = 152;
    int256 public constant AUTORENEW_ACCOUNT_NOT_ALLOWED = 153;
    int256 public constant TOPIC_EXPIRED = 223;
    int256 public constant INVALID_CHUNK_NUMBER = 225;
    int256 public constant INVALID_CHUNK_TRANSACTION_ID = 226;

    // ========== FILE SERVICE (HFS) CODES ==========
    int256 public constant INVALID_FILE_WACL = 157;
    int256 public constant SERIALIZATION_FAILED = 158;
    int256 public constant TRANSACTION_OVERSIZE = 159;
    int256 public constant TRANSACTION_TOO_MANY_LAYERS = 160;
    int256 public constant CONTRACT_DELETED = 161;
    int256 public constant PLATFORM_NOT_ACTIVE = 162;
    int256 public constant KEY_PREFIX_MISMATCH = 163;
    int256 public constant PLATFORM_TRANSACTION_NOT_CREATED = 164;
    int256 public constant INVALID_RENEWAL_PERIOD = 165;
    int256 public constant INVALID_PAYER_ACCOUNT_ID = 166;
    int256 public constant ACCOUNT_DELETED = 168;
    int256 public constant FILE_DELETED = 169;
    int256 public constant ACCOUNT_REPEATED_IN_ACCOUNT_AMOUNTS = 170;
    int256 public constant SETTING_NEGATIVE_ACCOUNT_BALANCE = 171;
    int256 public constant OBTAINER_REQUIRED = 172;
    int256 public constant OBTAINER_SAME_CONTRACT_ID = 173;
    int256 public constant OBTAINER_DOES_NOT_EXIST = 174;
    int256 public constant MODIFYING_IMMUTABLE_CONTRACT = 175;
    int256 public constant FILE_SYSTEM_EXCEPTION = 176;
    int256 public constant AUTORENEW_DURATION_NOT_IN_RANGE = 177;

    // ========== SMART CONTRACT SERVICE (HSCS) CODES ==========
    int256 public constant ERROR_DECODING_BYTESTRING = 178;
    int256 public constant CONTRACT_FILE_EMPTY = 179;
    int256 public constant CONTRACT_BYTECODE_EMPTY = 180;
    int256 public constant INVALID_INITIAL_BALANCE = 181;
    int256 public constant INVALID_RECEIVE_RECORD_THRESHOLD = 182;
    int256 public constant INVALID_SEND_RECORD_THRESHOLD = 183;
    int256 public constant ACCOUNT_IS_NOT_GENESIS_ACCOUNT = 184;
    int256 public constant PAYER_ACCOUNT_UNAUTHORIZED = 185;
    int256 public constant INVALID_FREEZE_TRANSACTION_BODY = 186;
    int256 public constant FREEZE_TRANSACTION_BODY_NOT_FOUND = 187;
    int256 public constant TRANSFER_LIST_SIZE_LIMIT_EXCEEDED = 188;
    int256 public constant RESULT_SIZE_LIMIT_EXCEEDED = 189;
    int256 public constant NOT_SPECIAL_ACCOUNT = 190;
    int256 public constant CONTRACT_NEGATIVE_GAS = 191;
    int256 public constant CONTRACT_NEGATIVE_VALUE = 192;
    int256 public constant INVALID_FEE_FILE = 193;
    int256 public constant INVALID_EXCHANGE_RATE_FILE = 194;
    int256 public constant INSUFFICIENT_LOCAL_CALL_GAS = 195;
    int256 public constant ENTITY_NOT_ALLOWED_TO_DELETE = 196;
    int256 public constant AUTHORIZATION_FAILED = 197;
    int256 public constant FILE_UPLOADED_PROTO_INVALID = 198;
    int256 public constant FILE_UPLOADED_PROTO_NOT_SAVED_TO_DISK = 199;
    int256 public constant FEE_SCHEDULE_FILE_PART_UPLOADED = 200;
    int256 public constant EXCHANGE_RATE_CHANGE_LIMIT_EXCEEDED = 201;

    // ========== UTILITY FUNCTIONS ==========

    /**
     * @dev Check if response code indicates success
     * @param responseCode The Hedera response code to check
     * @return isSuccess True if the response code indicates success
     */
    function isSuccess(int256 responseCode) internal pure returns (bool isSuccess) {
        return responseCode == SUCCESS || responseCode == SUCCESS_BUT_MISSING_EXPECTED_OPERATION;
    }

    /**
     * @dev Check if response code indicates a token-related error
     * @param responseCode The Hedera response code to check
     * @return isTokenError True if the response code is token-related
     */
    function isTokenError(int256 responseCode) internal pure returns (bool isTokenError) {
        return responseCode >= 100 && responseCode <= 147;
    }

    /**
     * @dev Check if response code indicates a consensus service error
     * @param responseCode The Hedera response code to check
     * @return isConsensusError True if the response code is consensus-related
     */
    function isConsensusError(int256 responseCode) internal pure returns (bool isConsensusError) {
        return responseCode >= 150 && responseCode <= 156 || 
               responseCode == UNAUTHORIZED || 
               responseCode == TOPIC_EXPIRED ||
               responseCode >= 225 && responseCode <= 226;
    }

    /**
     * @dev Check if response code indicates a file service error
     * @param responseCode The Hedera response code to check
     * @return isFileError True if the response code is file service-related
     */
    function isFileError(int256 responseCode) internal pure returns (bool isFileError) {
        return responseCode >= 157 && responseCode <= 177 ||
               responseCode == FILE_DELETED ||
               responseCode == FILE_SYSTEM_EXCEPTION;
    }

    /**
     * @dev Check if response code indicates a smart contract error
     * @param responseCode The Hedera response code to check
     * @return isContractError True if the response code is smart contract-related
     */
    function isContractError(int256 responseCode) internal pure returns (bool isContractError) {
        return responseCode >= 178 && responseCode <= 201 ||
               responseCode == CONTRACT_DELETED ||
               responseCode == CONTRACT_SIZE_LIMIT_EXCEEDED ||
               responseCode == CONTRACT_REVERT_EXECUTED ||
               responseCode == CONTRACT_EXECUTION_EXCEPTION;
    }

    /**
     * @dev Get human-readable error message for response code
     * @param responseCode The Hedera response code
     * @return errorMessage Human-readable error message
     */
    function getErrorMessage(int256 responseCode) internal pure returns (string memory errorMessage) {
        if (responseCode == SUCCESS) return "SUCCESS";
        if (responseCode == SUCCESS_BUT_MISSING_EXPECTED_OPERATION) return "SUCCESS_BUT_MISSING_EXPECTED_OPERATION";
        
        // Token Service Errors
        if (responseCode == INVALID_TOKEN_ID) return "INVALID_TOKEN_ID";
        if (responseCode == INSUFFICIENT_TOKEN_BALANCE) return "INSUFFICIENT_TOKEN_BALANCE";
        if (responseCode == TOKEN_NOT_ASSOCIATED_TO_ACCOUNT) return "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT";
        if (responseCode == TOKEN_WAS_DELETED) return "TOKEN_WAS_DELETED";
        if (responseCode == ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN) return "ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN";
        
        // Consensus Service Errors
        if (responseCode == INVALID_TOPIC_ID) return "INVALID_TOPIC_ID";
        if (responseCode == UNAUTHORIZED) return "UNAUTHORIZED";
        if (responseCode == TOPIC_EXPIRED) return "TOPIC_EXPIRED";
        if (responseCode == MESSAGE_SIZE_TOO_LARGE) return "MESSAGE_SIZE_TOO_LARGE";
        
        // File Service Errors
        if (responseCode == FILE_DELETED) return "FILE_DELETED";
        if (responseCode == FILE_CONTENT_EMPTY) return "FILE_CONTENT_EMPTY";
        if (responseCode == FILE_SYSTEM_EXCEPTION) return "FILE_SYSTEM_EXCEPTION";
        
        // Contract Service Errors
        if (responseCode == CONTRACT_DELETED) return "CONTRACT_DELETED";
        if (responseCode == CONTRACT_REVERT_EXECUTED) return "CONTRACT_REVERT_EXECUTED";
        if (responseCode == CONTRACT_EXECUTION_EXCEPTION) return "CONTRACT_EXECUTION_EXCEPTION";
        if (responseCode == INSUFFICIENT_GAS) return "INSUFFICIENT_GAS";
        
        // General Errors
        if (responseCode == INVALID_TRANSACTION) return "INVALID_TRANSACTION";
        if (responseCode == INSUFFICIENT_TX_FEE) return "INSUFFICIENT_TX_FEE";
        if (responseCode == INSUFFICIENT_PAYER_BALANCE) return "INSUFFICIENT_PAYER_BALANCE";
        if (responseCode == DUPLICATE_TRANSACTION) return "DUPLICATE_TRANSACTION";
        if (responseCode == TRANSACTION_EXPIRED) return "TRANSACTION_EXPIRED";
        
        return "UNKNOWN_ERROR";
    }

    /**
     * @dev Check if operation should be retried based on response code
     * @param responseCode The Hedera response code
     * @return shouldRetry True if the operation should be retried
     */
    function shouldRetry(int256 responseCode) internal pure returns (bool shouldRetry) {
        return responseCode == BUSY ||
               responseCode == PLATFORM_NOT_ACTIVE ||
               responseCode == RECEIPT_NOT_FOUND ||
               responseCode == RECORD_NOT_FOUND;
    }

    /**
     * @dev Get retry delay in seconds based on response code
     * @param responseCode The Hedera response code
     * @return delaySeconds Recommended delay before retry in seconds
     */
    function getRetryDelay(int256 responseCode) internal pure returns (uint256 delaySeconds) {
        if (responseCode == BUSY) return 5;
        if (responseCode == PLATFORM_NOT_ACTIVE) return 30;
        if (responseCode == RECEIPT_NOT_FOUND) return 2;
        if (responseCode == RECORD_NOT_FOUND) return 2;
        return 10; // Default delay
    }

    /**
     * @dev Validate response code and revert with appropriate message if not successful
     * @param responseCode The Hedera response code to validate
     * @param operation Description of the operation for error context
     */
    function requireSuccess(int256 responseCode, string memory operation) internal pure {
        require(isSuccess(responseCode), 
            string(abi.encodePacked(operation, " failed: ", getErrorMessage(responseCode))));
    }
}