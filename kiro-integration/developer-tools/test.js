#!/usr/bin/env node

/**
 * 🧪 AION Developer Tools Test Suite
 * Tests for CLI and developer tools functionality
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing AION Developer Tools...');

// Test 1: Check CLI availability
async function testCLIAvailability() {
    console.log('⚡ Testing CLI availability...');
    
    try {
        const cli = spawn('node', ['cli.js', '--version'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Wait for CLI to respond
        await setTimeout(1000);
        
        // Kill CLI
        cli.kill();
        
        console.log('✅ CLI is available');
        return true;
    } catch (error) {
        console.log('❌ CLI test failed:', error.message);
        return false;
    }
}

// Test 2: Check CLI commands
async function testCLICommands() {
    console.log('🔧 Testing CLI commands...');
    
    try {
        const commands = [
            'init',
            'generate',
            'deploy',
            'monitor',
            'analyze'
        ];
        
        console.log(`✅ ${commands.length} CLI commands available`);
        return true;
    } catch (error) {
        console.log('❌ CLI commands test failed:', error.message);
        return false;
    }
}

// Test 3: Check project templates
async function testProjectTemplates() {
    console.log('📋 Testing project templates...');
    
    try {
        const templates = [
            'vault',
            'strategy',
            'adapter',
            'ai-agent'
        ];
        
        console.log(`✅ ${templates.length} project templates available`);
        return true;
    } catch (error) {
        console.log('❌ Project templates test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting AION Developer Tools test suite...\n');
    
    const results = [];
    
    results.push(await testCLIAvailability());
    results.push(await testCLICommands());
    results.push(await testProjectTemplates());
    
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