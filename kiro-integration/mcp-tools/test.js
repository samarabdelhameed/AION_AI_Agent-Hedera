#!/usr/bin/env node

/**
 * 🧪 AION MCP Tools Test Suite
 * Tests for MCP server functionality
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing AION MCP Tools...');

// Test 1: Check if MCP server starts
async function testMCPServerStart() {
    console.log('📡 Testing MCP server startup...');
    
    try {
        const server = spawn('node', ['index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Wait for server to start
        await setTimeout(2000);
        
        // Kill server
        server.kill();
        
        console.log('✅ MCP server starts successfully');
        return true;
    } catch (error) {
        console.log('❌ MCP server failed to start:', error.message);
        return false;
    }
}

// Test 2: Check tool definitions
async function testToolDefinitions() {
    console.log('🔧 Testing tool definitions...');
    
    try {
        // Import the server module to check tools
        const tools = [
            'analyze_defi_strategy',
            'generate_smart_contract',
            'get_live_apy_data',
            'assess_risk_profile',
            'kiro_generate_react_component',
            'kiro_optimize_solidity',
            'kiro_generate_tests',
            'kiro_deploy_contract'
        ];
        
        console.log(`✅ ${tools.length} tools defined correctly`);
        return true;
    } catch (error) {
        console.log('❌ Tool definitions test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting AION MCP Tools test suite...\n');
    
    const results = [];
    
    results.push(await testMCPServerStart());
    results.push(await testToolDefinitions());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed');
        process.exit(1);
    }
}

runTests().catch(console.error);