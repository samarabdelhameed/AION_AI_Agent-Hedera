// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@hedera/IHederaTokenService.sol";
import "@hedera/HederaResponseCodes.sol";
import "@hedera/SafeHederaService.sol";

contract HederaLibrariesTest is Test {
    using SafeHederaService for *;
    
    function testHederaResponseCodes() public {
        assertEq(HederaResponseCodes.SUCCESS, 22);
        assertEq(HederaResponseCodes.INVALID_TOKEN_ID, 167);
        assertEq(HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE, 178);
    }
    
    function testSafeHederaServiceErrorMessages() public {
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.SUCCESS), "SUCCESS");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.INVALID_TOKEN_ID), "INVALID_TOKEN_ID");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE), "INSUFFICIENT_TOKEN_BALANCE");
    }
    
    function testIsSuccess() public {
        assertTrue(SafeHederaService.isSuccess(HederaResponseCodes.SUCCESS));
        assertFalse(SafeHederaService.isSuccess(HederaResponseCodes.INVALID_TOKEN_ID));
    }
    
    function testHederaTokenServiceInterface() public {
        // Test that the interface is properly imported and accessible
        IHederaTokenService hts = IHederaTokenService(address(0x167));
        assertEq(address(hts), address(0x167));
    }
}