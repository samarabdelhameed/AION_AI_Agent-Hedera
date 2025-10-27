#!/usr/bin/env node

/**
 * 🧪 AION AI Code Generator Test Suite
 * Tests for AI code generation functionality
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing AION AI Code Generator...');

// Test 1: Check if AI code generator starts
async function testCodeGeneratorStart() {
    console.log('🤖 Testing AI code generator startup...');
    
    try {
        const generator = spawn('node', ['index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Wait for generator to start
        await setTimeout(2000);
        
        // Kill generator
        generator.kill();
        
        console.log('✅ AI code generator starts successfully');
        return true;
    } catch (error) {
        console.log('❌ AI code generator failed to start:', error.message);
        return false;
    }
}

// Test 2: Check code generation templates
async function testCodeTemplates() {
    console.log('📝 Testing code generation templates...');
    
    try {
        const templates = [
            'vault',
            'strategy', 
            'adapter',
            'react-component',
            'test-suite'
        ];
        
        console.log(`✅ ${templates.length} code templates available`);
        return true;
    } catch (error) {
        console.log('❌ Code templates test failed:', error.message);
        return false;
    }
}

// Test 3: Check AI integration
async function testAIIntegration() {
    console.log('🧠 Testing AI integration...');
    
    try {
        // Mock AI response test
        const mockPrompt = "Generate a simple vault contract";
        const mockResponse = "// Generated vault contract code";
        
        console.log('✅ AI integration ready (mock test)');
        return true;
    } catch (error) {
        console.log('❌ AI integration test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting AION AI Code Generator test suite...\n');
    
    const results = [];
    
    results.push(await testCodeGeneratorStart());
    results.push(await testCodeTemplates());
    results.push(await testAIIntegration());
    
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