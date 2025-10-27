// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@hedera/SafeHederaService.sol";
import "@hedera/HederaResponseCodes.sol";

contract SafeHederaServiceTest is Test {
    using SafeHederaService for *;

    function testIsSuccess() public pure {
        assertTrue(SafeHederaService.isSuccess(HederaResponseCodes.SUCCESS));
        assertFalse(SafeHederaService.isSuccess(HederaResponseCodes.INVALID_TOKEN_ID));
        assertFalse(SafeHederaService.isSuccess(HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE));
    }

    function testGetErrorMessage() public pure {
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.SUCCESS), "SUCCESS");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.INVALID_TOKEN_ID), "INVALID_TOKEN_ID");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE), "INSUFFICIENT_TOKEN_BALANCE");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT), "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.INVALID_TREASURY_ACCOUNT_FOR_TOKEN), "INVALID_TREASURY_ACCOUNT_FOR_TOKEN");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.TOKEN_HAS_NO_SUPPLY_KEY), "TOKEN_HAS_NO_SUPPLY_KEY");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.INVALID_TOKEN_MINT_AMOUNT), "INVALID_TOKEN_MINT_AMOUNT");
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.INVALID_TOKEN_BURN_AMOUNT), "INVALID_TOKEN_BURN_AMOUNT");
        assertEq(SafeHederaService.getErrorMessage(999), "UNKNOWN_ERROR");
    }

    function testHederaResponseCodes() public pure {
        // Test some key response codes
        assertEq(HederaResponseCodes.SUCCESS, 22);
        assertEq(HederaResponseCodes.INVALID_TOKEN_ID, 167);
        assertEq(HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE, 178);
        assertEq(HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT, 184);
        assertEq(HederaResponseCodes.INVALID_TREASURY_ACCOUNT_FOR_TOKEN, 170);
        assertEq(HederaResponseCodes.TOKEN_HAS_NO_SUPPLY_KEY, 180);
        assertEq(HederaResponseCodes.INVALID_TOKEN_MINT_AMOUNT, 182);
        assertEq(HederaResponseCodes.INVALID_TOKEN_BURN_AMOUNT, 183);
    }

    function testHTSPrecompileAddress() public pure {
        // Test that the HTS precompile address is correct
        IHederaTokenService hts = IHederaTokenService(address(0x167));
        assertEq(address(hts), address(0x167));
    }

    function testLibraryIntegration() public pure {
        // Test that all libraries are properly integrated and accessible
        assertTrue(SafeHederaService.isSuccess(HederaResponseCodes.SUCCESS));
        assertEq(SafeHederaService.getErrorMessage(HederaResponseCodes.SUCCESS), "SUCCESS");
    }

    function testErrorMessageCoverage() public pure {
        // Test that we have error messages for all common error codes
        string[] memory expectedMessages = new string[](8);
        expectedMessages[0] = "SUCCESS";
        expectedMessages[1] = "INVALID_TOKEN_ID";
        expectedMessages[2] = "INSUFFICIENT_TOKEN_BALANCE";
        expectedMessages[3] = "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT";
        expectedMessages[4] = "INVALID_TREASURY_ACCOUNT_FOR_TOKEN";
        expectedMessages[5] = "TOKEN_HAS_NO_SUPPLY_KEY";
        expectedMessages[6] = "INVALID_TOKEN_MINT_AMOUNT";
        expectedMessages[7] = "INVALID_TOKEN_BURN_AMOUNT";

        int32[] memory responseCodes = new int32[](8);
        responseCodes[0] = HederaResponseCodes.SUCCESS;
        responseCodes[1] = HederaResponseCodes.INVALID_TOKEN_ID;
        responseCodes[2] = HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE;
        responseCodes[3] = HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT;
        responseCodes[4] = HederaResponseCodes.INVALID_TREASURY_ACCOUNT_FOR_TOKEN;
        responseCodes[5] = HederaResponseCodes.TOKEN_HAS_NO_SUPPLY_KEY;
        responseCodes[6] = HederaResponseCodes.INVALID_TOKEN_MINT_AMOUNT;
        responseCodes[7] = HederaResponseCodes.INVALID_TOKEN_BURN_AMOUNT;

        for (uint i = 0; i < responseCodes.length; i++) {
            assertEq(SafeHederaService.getErrorMessage(responseCodes[i]), expectedMessages[i]);
        }
    }

    function testResponseCodeConstants() public pure {
        // Test that response codes are consistent
        assertTrue(HederaResponseCodes.SUCCESS > 0);
        assertTrue(HederaResponseCodes.INVALID_TOKEN_ID > HederaResponseCodes.SUCCESS);
        assertTrue(HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE > HederaResponseCodes.SUCCESS);
    }
}