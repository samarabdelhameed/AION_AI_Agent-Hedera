// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IHederaConsensusService
 * @dev Interface for Hedera Consensus Service (HCS) operations
 * @notice Provides standardized interface for HCS topic operations and message submission
 */
interface IHederaConsensusService {
    
    // ========== STRUCTS ==========
    
    struct TopicInfo {
        bytes32 topicId;
        string memo;
        uint256 runningHash;
        uint256 sequenceNumber;
        uint256 expirationTime;
        address adminKey;
        address submitKey;
        bool deleted;
        uint256 autoRenewPeriod;
        address autoRenewAccount;
    }

    struct TopicMessage {
        bytes32 topicId;
        uint256 consensusTimestamp;
        bytes message;
        bytes32 runningHash;
        uint256 sequenceNumber;
        address submitter;
    }

    // ========== TOPIC CREATION ==========
    
    /**
     * @dev Create a new HCS topic
     * @param memo Topic memo/description
     * @param adminKey Admin key for topic management
     * @param submitKey Submit key for message submission
     * @param autoRenewPeriod Auto-renewal period in seconds
     * @param autoRenewAccount Account for auto-renewal payments
     * @return responseCode Hedera response code
     * @return topicId Created topic identifier
     */
    function createTopic(
        string memory memo,
        address adminKey,
        address submitKey,
        uint256 autoRenewPeriod,
        address autoRenewAccount
    ) external payable returns (int256 responseCode, bytes32 topicId);

    /**
     * @dev Update topic properties
     * @param topicId Topic identifier
     * @param memo New topic memo
     * @param adminKey New admin key
     * @param submitKey New submit key
     * @param autoRenewPeriod New auto-renewal period
     * @param autoRenewAccount New auto-renewal account
     * @return responseCode Hedera response code
     */
    function updateTopic(
        bytes32 topicId,
        string memory memo,
        address adminKey,
        address submitKey,
        uint256 autoRenewPeriod,
        address autoRenewAccount
    ) external returns (int256 responseCode);

    /**
     * @dev Delete a topic
     * @param topicId Topic identifier
     * @return responseCode Hedera response code
     */
    function deleteTopic(
        bytes32 topicId
    ) external returns (int256 responseCode);

    // ========== MESSAGE OPERATIONS ==========
    
    /**
     * @dev Submit message to HCS topic
     * @param topicId Topic identifier
     * @param message Message content (max 6144 bytes)
     * @return responseCode Hedera response code
     * @return sequenceNumber Message sequence number
     * @return runningHash Updated running hash
     */
    function submitMessage(
        bytes32 topicId,
        bytes memory message
    ) external returns (
        int256 responseCode,
        uint256 sequenceNumber,
        bytes32 runningHash
    );

    /**
     * @dev Submit message with chunk support for large messages
     * @param topicId Topic identifier
     * @param message Message content
     * @param chunkInfo Chunk information for large messages
     * @return responseCode Hedera response code
     * @return sequenceNumber Message sequence number
     * @return runningHash Updated running hash
     */
    function submitMessageWithChunks(
        bytes32 topicId,
        bytes memory message,
        ChunkInfo memory chunkInfo
    ) external returns (
        int256 responseCode,
        uint256 sequenceNumber,
        bytes32 runningHash
    );

    struct ChunkInfo {
        uint256 totalChunks;
        uint256 chunkNumber;
        bytes32 initialTransactionId;
    }

    // ========== TOPIC QUERIES ==========
    
    /**
     * @dev Get topic information
     * @param topicId Topic identifier
     * @return responseCode Hedera response code
     * @return topicInfo Topic information struct
     */
    function getTopicInfo(
        bytes32 topicId
    ) external view returns (int256 responseCode, TopicInfo memory topicInfo);

    /**
     * @dev Get topic running hash
     * @param topicId Topic identifier
     * @return responseCode Hedera response code
     * @return runningHash Current running hash
     */
    function getTopicRunningHash(
        bytes32 topicId
    ) external view returns (int256 responseCode, bytes32 runningHash);

    /**
     * @dev Get topic sequence number
     * @param topicId Topic identifier
     * @return responseCode Hedera response code
     * @return sequenceNumber Current sequence number
     */
    function getTopicSequenceNumber(
        bytes32 topicId
    ) external view returns (int256 responseCode, uint256 sequenceNumber);

    /**
     * @dev Check if topic exists and is not deleted
     * @param topicId Topic identifier
     * @return responseCode Hedera response code
     * @return exists Whether topic exists
     */
    function topicExists(
        bytes32 topicId
    ) external view returns (int256 responseCode, bool exists);

    // ========== MESSAGE QUERIES ==========
    
    /**
     * @dev Get messages from topic (via Mirror Node integration)
     * @param topicId Topic identifier
     * @param startSequence Starting sequence number
     * @param limit Maximum number of messages to retrieve
     * @return responseCode Hedera response code
     * @return messages Array of topic messages
     */
    function getTopicMessages(
        bytes32 topicId,
        uint256 startSequence,
        uint256 limit
    ) external view returns (
        int256 responseCode,
        TopicMessage[] memory messages
    );

    /**
     * @dev Get latest message from topic
     * @param topicId Topic identifier
     * @return responseCode Hedera response code
     * @return message Latest topic message
     */
    function getLatestMessage(
        bytes32 topicId
    ) external view returns (int256 responseCode, TopicMessage memory message);

    // ========== SUBSCRIPTION MANAGEMENT ==========
    
    /**
     * @dev Subscribe to topic messages (for real-time updates)
     * @param topicId Topic identifier
     * @param startSequence Starting sequence number for subscription
     * @return responseCode Hedera response code
     * @return subscriptionId Subscription identifier
     */
    function subscribeTopic(
        bytes32 topicId,
        uint256 startSequence
    ) external returns (int256 responseCode, bytes32 subscriptionId);

    /**
     * @dev Unsubscribe from topic messages
     * @param subscriptionId Subscription identifier
     * @return responseCode Hedera response code
     */
    function unsubscribeTopic(
        bytes32 subscriptionId
    ) external returns (int256 responseCode);

    // ========== UTILITY FUNCTIONS ==========
    
    /**
     * @dev Calculate message hash for verification
     * @param message Message content
     * @param previousRunningHash Previous running hash
     * @return messageHash Calculated message hash
     */
    function calculateMessageHash(
        bytes memory message,
        bytes32 previousRunningHash
    ) external pure returns (bytes32 messageHash);

    /**
     * @dev Verify message integrity
     * @param topicId Topic identifier
     * @param sequenceNumber Message sequence number
     * @param message Message content
     * @param expectedHash Expected message hash
     * @return responseCode Hedera response code
     * @return verified Whether message is verified
     */
    function verifyMessage(
        bytes32 topicId,
        uint256 sequenceNumber,
        bytes memory message,
        bytes32 expectedHash
    ) external view returns (int256 responseCode, bool verified);

    // ========== EVENTS ==========
    
    event TopicCreated(
        bytes32 indexed topicId,
        string memo,
        address indexed creator,
        uint256 timestamp
    );
    
    event TopicUpdated(
        bytes32 indexed topicId,
        string memo,
        address indexed updater,
        uint256 timestamp
    );
    
    event TopicDeleted(
        bytes32 indexed topicId,
        address indexed deleter,
        uint256 timestamp
    );
    
    event MessageSubmitted(
        bytes32 indexed topicId,
        uint256 indexed sequenceNumber,
        bytes32 runningHash,
        address indexed submitter,
        uint256 messageSize,
        uint256 timestamp
    );
    
    event MessageChunkSubmitted(
        bytes32 indexed topicId,
        uint256 indexed sequenceNumber,
        uint256 chunkNumber,
        uint256 totalChunks,
        bytes32 initialTransactionId,
        address indexed submitter,
        uint256 timestamp
    );
    
    event TopicSubscribed(
        bytes32 indexed topicId,
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        uint256 startSequence,
        uint256 timestamp
    );
    
    event TopicUnsubscribed(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        uint256 timestamp
    );

    // ========== ERROR CODES ==========
    
    // Common Hedera response codes for HCS operations (moved to library)
    // Constants cannot be declared in interfaces in Solidity 0.8+
}