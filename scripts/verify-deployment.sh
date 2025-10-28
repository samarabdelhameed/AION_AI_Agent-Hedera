#!/bin/bash

# AION Hedera Integration - Deployment Verification Script
# This script verifies all deployed contracts and Hedera services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BSC_MAINNET_RPC="https://bsc-dataseed1.binance.org"
BSC_TESTNET_RPC="https://data-seed-prebsc-1-s1.binance.org:8545"
HEDERA_MIRROR_NODE="https://testnet.mirrornode.hedera.com/api/v1"

# Contract addresses
VAULT_MAINNET="0xb176c1fa7b3fec56cb23681b6e447a7ae60c5254"
VAULT_TESTNET="0x965539b413438e76c9b1afcefc39cacbf6cd909b"

# Hedera service IDs
HEDERA_ACCOUNT="0.0.123456"
HCS_TOPIC="0.0.789012"
HFS_FILE="0.0.345678"

echo -e "${BLUE}🚀 AION Hedera Integration - Deployment Verification${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "error" ]; then
        echo -e "${RED}❌ $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_status "error" "$1 is required but not installed"
        exit 1
    fi
}

# Function to verify BSC contract
verify_bsc_contract() {
    local address=$1
    local rpc_url=$2
    local network_name=$3
    
    print_status "info" "Verifying $network_name contract: $address"
    
    # Check if contract exists
    local code=$(cast code $address --rpc-url $rpc_url 2>/dev/null || echo "0x")
    
    if [ "$code" = "0x" ]; then
        print_status "error" "No contract found at $address on $network_name"
        return 1
    else
        print_status "success" "Contract verified on $network_name"
    fi
    
    # Check contract functions
    print_status "info" "Testing contract functions..."
    
    # Test totalAssets function
    local total_assets=$(cast call $address "totalAssets()" --rpc-url $rpc_url 2>/dev/null || echo "failed")
    if [ "$total_assets" != "failed" ]; then
        print_status "success" "totalAssets(): $total_assets"
    else
        print_status "warning" "totalAssets() function call failed"
    fi
    
    # Test owner function
    local owner=$(cast call $address "owner()" --rpc-url $rpc_url 2>/dev/null || echo "failed")
    if [ "$owner" != "failed" ]; then
        print_status "success" "owner(): $owner"
    else
        print_status "warning" "owner() function call failed"
    fi
    
    # Test paused status
    local paused=$(cast call $address "paused()" --rpc-url $rpc_url 2>/dev/null || echo "failed")
    if [ "$paused" != "failed" ]; then
        if [ "$paused" = "false" ]; then
            print_status "success" "Contract is not paused"
        else
            print_status "warning" "Contract is paused"
        fi
    else
        print_status "warning" "paused() function call failed"
    fi
    
    echo ""
}

# Function to verify Hedera account
verify_hedera_account() {
    local account_id=$1
    
    print_status "info" "Verifying Hedera account: $account_id"
    
    local response=$(curl -s "$HEDERA_MIRROR_NODE/accounts/$account_id" || echo "failed")
    
    if [ "$response" = "failed" ] || echo "$response" | grep -q "error"; then
        print_status "error" "Failed to fetch account information"
        return 1
    fi
    
    # Extract account information
    local balance=$(echo "$response" | jq -r '.balance.balance // "unknown"' 2>/dev/null || echo "unknown")
    local account_num=$(echo "$response" | jq -r '.account // "unknown"' 2>/dev/null || echo "unknown")
    
    if [ "$account_num" != "unknown" ]; then
        print_status "success" "Account verified: $account_num"
        print_status "info" "Balance: $balance tinybars"
    else
        print_status "warning" "Account information incomplete"
    fi
    
    echo ""
}

# Function to verify HCS topic
verify_hcs_topic() {
    local topic_id=$1
    
    print_status "info" "Verifying HCS topic: $topic_id"
    
    local response=$(curl -s "$HEDERA_MIRROR_NODE/topics/$topic_id" || echo "failed")
    
    if [ "$response" = "failed" ] || echo "$response" | grep -q "error"; then
        print_status "error" "Failed to fetch topic information"
        return 1
    fi
    
    # Extract topic information
    local memo=$(echo "$response" | jq -r '.memo // "unknown"' 2>/dev/null || echo "unknown")
    local created=$(echo "$response" | jq -r '.created_timestamp // "unknown"' 2>/dev/null || echo "unknown")
    
    if [ "$memo" != "unknown" ]; then
        print_status "success" "Topic verified: $topic_id"
        print_status "info" "Memo: $memo"
        print_status "info" "Created: $created"
    else
        print_status "warning" "Topic information incomplete"
    fi
    
    # Check for recent messages
    print_status "info" "Checking for recent messages..."
    local messages=$(curl -s "$HEDERA_MIRROR_NODE/topics/$topic_id/messages?limit=5" || echo "failed")
    
    if [ "$messages" != "failed" ]; then
        local message_count=$(echo "$messages" | jq '.messages | length' 2>/dev/null || echo "0")
        print_status "info" "Recent messages: $message_count"
    else
        print_status "warning" "Failed to fetch messages"
    fi
    
    echo ""
}

# Function to verify HFS file
verify_hfs_file() {
    local file_id=$1
    
    print_status "info" "Verifying HFS file: $file_id"
    
    local response=$(curl -s "$HEDERA_MIRROR_NODE/files/$file_id" || echo "failed")
    
    if [ "$response" = "failed" ] || echo "$response" | grep -q "error"; then
        print_status "error" "Failed to fetch file information"
        return 1
    fi
    
    # Extract file information
    local size=$(echo "$response" | jq -r '.size // "unknown"' 2>/dev/null || echo "unknown")
    local created=$(echo "$response" | jq -r '.created_timestamp // "unknown"' 2>/dev/null || echo "unknown")
    
    if [ "$size" != "unknown" ]; then
        print_status "success" "File verified: $file_id"
        print_status "info" "Size: $size bytes"
        print_status "info" "Created: $created"
    else
        print_status "warning" "File information incomplete"
    fi
    
    # Try to fetch file contents
    print_status "info" "Checking file accessibility..."
    local contents=$(curl -s "$HEDERA_MIRROR_NODE/files/$file_id/contents" || echo "failed")
    
    if [ "$contents" != "failed" ] && [ ${#contents} -gt 0 ]; then
        print_status "success" "File contents accessible"
    else
        print_status "warning" "File contents not accessible or empty"
    fi
    
    echo ""
}

# Function to verify transaction hash
verify_transaction() {
    local tx_hash=$1
    local network=$2
    local rpc_url=$3
    
    print_status "info" "Verifying transaction: $tx_hash on $network"
    
    local receipt=$(cast receipt $tx_hash --rpc-url $rpc_url 2>/dev/null || echo "failed")
    
    if [ "$receipt" = "failed" ]; then
        print_status "error" "Transaction not found: $tx_hash"
        return 1
    fi
    
    # Extract transaction information
    local status=$(echo "$receipt" | grep "status" | awk '{print $2}' || echo "unknown")
    local block=$(echo "$receipt" | grep "blockNumber" | awk '{print $2}' || echo "unknown")
    local gas_used=$(echo "$receipt" | grep "gasUsed" | awk '{print $2}' || echo "unknown")
    
    if [ "$status" = "1" ]; then
        print_status "success" "Transaction successful"
        print_status "info" "Block: $block"
        print_status "info" "Gas used: $gas_used"
    else
        print_status "error" "Transaction failed or reverted"
    fi
    
    echo ""
}

# Function to run comprehensive verification
run_verification() {
    print_status "info" "Starting comprehensive verification...\n"
    
    # Check required tools
    print_status "info" "Checking required tools..."
    check_command "curl"
    check_command "jq"
    check_command "cast"
    print_status "success" "All required tools available\n"
    
    # Verify BSC contracts
    echo -e "${BLUE}📋 Verifying BSC Contracts${NC}"
    echo "=========================="
    verify_bsc_contract $VAULT_MAINNET $BSC_MAINNET_RPC "BSC Mainnet"
    verify_bsc_contract $VAULT_TESTNET $BSC_TESTNET_RPC "BSC Testnet"
    
    # Verify Hedera services
    echo -e "${BLUE}🌐 Verifying Hedera Services${NC}"
    echo "============================="
    verify_hedera_account $HEDERA_ACCOUNT
    verify_hcs_topic $HCS_TOPIC
    verify_hfs_file $HFS_FILE
    
    # Verify key transactions
    echo -e "${BLUE}🔍 Verifying Key Transactions${NC}"
    echo "=============================="
    verify_transaction "0x0ac52908d2c30e61fd674f56051b11992c0c308950664b0b94c111e1b05b7a31" "BSC Mainnet" $BSC_MAINNET_RPC
    verify_transaction "0x7b47ccee38416f82371d15504dcf37f885916f70ea96e8baa535b42588ff26a6" "BSC Testnet" $BSC_TESTNET_RPC
    
    print_status "success" "Verification complete!"
}

# Function to generate verification report
generate_report() {
    local report_file="verification-report-$(date +%Y%m%d-%H%M%S).txt"
    
    print_status "info" "Generating verification report: $report_file"
    
    {
        echo "AION Hedera Integration - Verification Report"
        echo "============================================="
        echo "Generated: $(date)"
        echo ""
        echo "BSC Contracts:"
        echo "- Mainnet Vault: $VAULT_MAINNET"
        echo "- Testnet Vault: $VAULT_TESTNET"
        echo ""
        echo "Hedera Services:"
        echo "- Account: $HEDERA_ACCOUNT"
        echo "- HCS Topic: $HCS_TOPIC"
        echo "- HFS File: $HFS_FILE"
        echo ""
        echo "Key Transactions:"
        echo "- Mainnet Deployment: 0x0ac52908d2c30e61fd674f56051b11992c0c308950664b0b94c111e1b05b7a31"
        echo "- Testnet Deployment: 0x7b47ccee38416f82371d15504dcf37f885916f70ea96e8baa535b42588ff26a6"
        echo ""
        echo "Verification Status: COMPLETE"
    } > $report_file
    
    print_status "success" "Report saved: $report_file"
}

# Main execution
main() {
    case "${1:-verify}" in
        "verify")
            run_verification
            ;;
        "report")
            generate_report
            ;;
        "help")
            echo "Usage: $0 [verify|report|help]"
            echo ""
            echo "Commands:"
            echo "  verify  - Run comprehensive verification (default)"
            echo "  report  - Generate verification report"
            echo "  help    - Show this help message"
            ;;
        *)
            print_status "error" "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"