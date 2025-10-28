# Requirements Document

## Introduction

This specification defines the creation of verified Hedera Testnet links and transaction hashes that demonstrate live integration with all Hedera services (HTS, HCS, HFS, HSCS). These links will serve as concrete evidence for the hackathon judging committee to validate the project's technical implementation and innovation.

## Glossary

- **Verification_Links**: Public URLs from Hedera Explorer/Hashscan showing live transactions and services
- **HTS_Token_Link**: Hedera Explorer URL showing created HTS token with mint/burn operations
- **HCS_Topic_Link**: Hedera Explorer URL showing consensus topic with AI decision messages
- **HFS_File_Link**: Hedera Explorer URL showing stored AI model metadata files
- **HSCS_Contract_Link**: Hedera Explorer URL showing deployed smart contract on HSCS
- **Transaction_Hash**: Unique identifier for each Hedera transaction for verification
- **Hashscan**: Official Hedera network explorer (hashscan.io)
- **Testnet_Evidence**: Collection of all verification links and transaction data

## Requirements

### Requirement 1

**User Story:** As a hackathon judge, I want to see verified HTS token creation and operations with REAL transaction data, so that I can confirm the project uses native Hedera tokenization with actual user flows.

#### Acceptance Criteria

1. THE deployment script SHALL create an HTS token on Hedera testnet with real metadata (name: "AION Vault Shares", symbol: "AION")
2. THE system SHALL perform at least 3 real mint operations with actual amounts (minimum 1000 tokens each)
3. THE system SHALL perform at least 2 real burn operations with actual amounts (minimum 500 tokens each)
4. THE HTS token SHALL show real transaction history with timestamps, amounts, and account IDs on Hashscan
5. THE verification document SHALL include the HTS token link showing REAL DATA: `https://hashscan.io/testnet/token/0.0.XXXXXX`

### Requirement 2

**User Story:** As a hackathon judge, I want to see verified smart contract deployment on HSCS, so that I can confirm the project uses Hedera Smart Contract Service.

#### Acceptance Criteria

1. THE AION Vault contract SHALL be deployed to Hedera testnet using HSCS
2. THE deployment SHALL use Hashio RPC endpoint for proper HSCS integration
3. THE contract SHALL be verified and visible on Hedera Explorer
4. THE deployment transaction SHALL provide a verifiable transaction hash
5. THE verification document SHALL include the contract link: `https://hashscan.io/testnet/contract/0.0.XXXXXX`

### Requirement 3

**User Story:** As a hackathon judge, I want to see verified HCS topic with REAL AI decision logs, so that I can confirm transparent AI decision making with actual data.

#### Acceptance Criteria

1. THE system SHALL create an HCS topic specifically for AI decision logging with real topic memo
2. THE AI agent SHALL submit at least 5 REAL decision messages with actual strategy names (Venus, PancakeSwap, Aave)
3. THE HCS messages SHALL contain REAL structured data: amounts, percentages, timestamps, model versions
4. THE HCS topic SHALL show actual message history with real timestamps and sequence numbers on Hedera Explorer
5. THE verification document SHALL include the HCS topic link showing REAL MESSAGE DATA: `https://hashscan.io/testnet/topic/0.0.XXXXXX`

### Requirement 4

**User Story:** As a hackathon judge, I want to see verified HFS file storage with REAL AI model metadata, so that I can confirm decentralized model versioning with actual data.

#### Acceptance Criteria

1. THE system SHALL store REAL AI model metadata on HFS including actual version numbers (v2.1.3), accuracy scores (94.2%), and training parameters
2. THE HFS file SHALL contain REAL structured data: model checksum, training dates, performance metrics, parameter values
3. THE file SHALL be downloadable and contain actual JSON data (not empty or placeholder content)
4. THE system SHALL reference the REAL HFS file ID in actual HCS decision messages
5. THE verification document SHALL include the HFS file link showing REAL FILE CONTENT: `https://hashscan.io/testnet/file/0.0.XXXXXX`

### Requirement 5

**User Story:** As a hackathon judge, I want to see a complete end-to-end transaction flow with REAL MONEY AMOUNTS, so that I can verify the system works with actual financial data.

#### Acceptance Criteria

1. THE system SHALL execute a REAL user deposit of at least 100 USDT with corresponding HTS token minting
2. THE system SHALL execute a REAL AI rebalancing decision moving actual funds between strategies with HCS logging
3. THE system SHALL execute a REAL user withdrawal of at least 50 USDT with corresponding HTS token burning
4. THE system SHALL provide REAL transaction hashes showing actual amounts, gas fees, and timestamps
5. THE verification document SHALL include a transaction timeline with REAL FINANCIAL DATA and all transaction hashes

### Requirement 6

**User Story:** As a hackathon judge, I want performance comparison data between Hedera and BSC, so that I can evaluate the technical innovation.

#### Acceptance Criteria

1. THE system SHALL measure and record gas costs for equivalent operations on both networks
2. THE system SHALL measure transaction confirmation times on both networks
3. THE system SHALL generate a performance comparison report
4. THE report SHALL include specific transaction hashes from both networks
5. THE verification document SHALL include performance metrics with supporting evidence

### Requirement 7

**User Story:** As a hackathon judge, I want a single verification script that generates all required links, so that I can easily validate the entire system.

#### Acceptance Criteria

1. THE verification script SHALL deploy all contracts and create all services in sequence
2. THE script SHALL execute a complete user journey with real transactions
3. THE script SHALL collect and format all verification links and transaction hashes
4. THE script SHALL generate a formatted verification report with all evidence
5. THE script SHALL complete execution within 10 minutes and provide clear success/failure status

### Requirement 8

**User Story:** As a hackathon judge, I want to see the verification links in the project README, so that I can quickly access all evidence.

#### Acceptance Criteria

1. THE project README SHALL include a "Hedera Integration Verification" section
2. THE section SHALL contain a formatted table with all service links
3. THE table SHALL include transaction hashes, timestamps, and descriptions
4. THE links SHALL be clickable and lead directly to Hedera Explorer pages
5. THE README SHALL include instructions for judges to verify each component

### Requirement 9

**User Story:** As a hackathon judge, I want to see real-time dashboard data from Hedera services, so that I can confirm the frontend integration works.

#### Acceptance Criteria

1. THE dashboard SHALL display live data from HCS topic showing recent AI decisions
2. THE dashboard SHALL show HTS token information including current supply and holders
3. THE dashboard SHALL display HFS file metadata with verification checksums
4. THE dashboard SHALL update in real-time when new transactions occur
5. THE dashboard SHALL be accessible via a public URL for judge evaluation

### Requirement 10

**User Story:** As a hackathon judge, I want to see formal verification readiness documentation, so that I can evaluate the project's security and quality.

#### Acceptance Criteria

1. THE project SHALL include a formal verification checklist with completed items
2. THE smart contracts SHALL include mathematical invariants and assertions
3. THE system SHALL provide gas analysis reports comparing Hedera vs BSC
4. THE documentation SHALL include security audit considerations
5. THE verification report SHALL demonstrate compliance with formal verification best practices

## Validation & Deliverables

### Required Verification Links (WITH REAL DATA)

1. **HTS Token**: `https://hashscan.io/testnet/token/0.0.XXXXXX` - Must show REAL mint/burn transactions with actual amounts
2. **Smart Contract**: `https://hashscan.io/testnet/contract/0.0.XXXXXX` - Must show REAL function calls and events
3. **HCS Topic**: `https://hashscan.io/testnet/topic/0.0.XXXXXX` - Must show REAL AI decision messages with actual data
4. **HFS File**: `https://hashscan.io/testnet/file/0.0.XXXXXX` - Must contain REAL model metadata (downloadable JSON)
5. **Transaction Hashes**: Multiple transaction links showing REAL OPERATIONS with actual amounts and timestamps

### Verification Timeline

```
Step 1: Deploy Contract → Contract Link + Deployment Hash
Step 2: Create HTS Token → Token Link + Creation Hash
Step 3: Create HCS Topic → Topic Link + Creation Hash
Step 4: Store HFS File → File Link + Storage Hash
Step 5: Execute User Flow → Multiple Transaction Hashes
Step 6: Generate Report → Complete Verification Document
```

### Success Criteria (REAL DATA REQUIRED)

- ✅ **All 5 service types** have working Hedera Explorer links WITH REAL TRANSACTION DATA
- ✅ **Complete transaction history** visible on Hashscan showing ACTUAL AMOUNTS and REAL TIMESTAMPS
- ✅ **Real-time dashboard** showing LIVE Hedera data (not mock or placeholder data)
- ✅ **Performance comparison** with REAL transaction hashes from both Hedera and BSC
- ✅ **Verification script** completes successfully and generates REAL transactions
- ✅ **Professional presentation** ready for judges with ACTUAL FINANCIAL DATA

### Judge Validation Process

1. **Click verification links** → All links load successfully on Hedera Explorer
2. **Review transaction history** → All operations visible with timestamps
3. **Test dashboard** → Real-time data updates from Hedera services
4. **Run verification script** → Script completes and generates report
5. **Review documentation** → Complete technical evidence provided

This specification ensures the hackathon judges have concrete, verifiable evidence of full Hedera integration across all services (HTS, HCS, HFS, HSCS) with live transaction data and professional presentation materials.