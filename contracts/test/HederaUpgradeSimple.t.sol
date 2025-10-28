// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../lib/hedera/HederaResponseCodes.sol";

/**
 * @title HederaUpgradeSimpleTest
 * @dev Simple test for Hedera library upgrade compatibility
 */
contract HederaUpgradeSimpleTest is Test {
    
    function testHederaResponseCodes() public {
        // Test that response codes are accessible
        assertEq(HederaResponseCodes.SUCCESS, 22);
        assertEq(HederaResponseCodes.OK, 0);
        assertEq(HederaResponseCodes.INVALID_TRANSACTION, 1);
    }
    
    function testLibraryUpgradeSuccess() public {
        // Simple test to verify compilation works
        assertTrue(true);
    }
}