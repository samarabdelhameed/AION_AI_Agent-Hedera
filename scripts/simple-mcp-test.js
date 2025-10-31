#!/usr/bin/env node

/**
 * @fileoverview Simple MCP Agent Test
 * @description Simple test using built-in http module
 * @author AION Team
 * @version 2.0.0
 */

const http = require('http');
const chalk = require('chalk');

/**
 * Simple HTTP request function
 */
function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

/**
 * Test MCP Agent endpoints
 */
async function testMCPAgent() {
    console.log(chalk.blue('🧪 Testing MCP Agent Deployment...\n'));
    
    const baseUrl = 'localhost';
    const port = 3001;
    
    let healthPassed = false;
    let apiPassed = false;
    
    // Test 1: Health Check
    console.log(chalk.blue('🏥 Testing health endpoint...'));
    try {
        const healthResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/health',
            method: 'GET'
        });
        
        if (healthResponse.status === 200 && healthResponse.data.status === 'healthy') {
            console.log(chalk.green('✅ Health check passed'));
            console.log(chalk.gray(`   Version: ${healthResponse.data.version}`));
            console.log(chalk.gray(`   Uptime: ${healthResponse.data.uptime}s`));
            healthPassed = true;
        } else {
            console.log(chalk.red('❌ Health check failed'));
            console.log(chalk.gray(`   Status: ${healthResponse.status}`));
        }
    } catch (error) {
        console.log(chalk.red('❌ Health check failed:'), error.message);
    }
    
    // Test 2: API Info
    console.log(chalk.blue('📚 Testing API endpoint...'));
    try {
        const apiResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/api',
            method: 'GET'
        });
        
        if (apiResponse.status === 200 && apiResponse.data.name) {
            console.log(chalk.green('✅ API endpoint working'));
            console.log(chalk.gray(`   Name: ${apiResponse.data.name}`));
            console.log(chalk.gray(`   Version: ${apiResponse.data.version}`));
            apiPassed = true;
        } else {
            console.log(chalk.red('❌ API endpoint failed'));
            console.log(chalk.gray(`   Status: ${apiResponse.status}`));
        }
    } catch (error) {
        console.log(chalk.red('❌ API endpoint failed:'), error.message);
    }
    
    // Results
    console.log(chalk.blue('\n📊 Test Results:'));
    console.log(`${healthPassed ? '✅' : '❌'} Health Check: ${healthPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`${apiPassed ? '✅' : '❌'} API Test: ${apiPassed ? 'PASSED' : 'FAILED'}`);
    
    const success = healthPassed && apiPassed;
    
    if (success) {
        console.log(chalk.green('\n🎉 MCP Agent is running and responding correctly!'));
        console.log(chalk.blue(`📡 Server URL: http://${baseUrl}:${port}`));
        console.log(chalk.blue(`🏥 Health Check: http://${baseUrl}:${port}/health`));
        console.log(chalk.blue(`📚 API Info: http://${baseUrl}:${port}/api`));
    } else {
        console.log(chalk.yellow('\n⚠️ MCP Agent may not be running or configured correctly.'));
        console.log(chalk.gray('   Make sure the MCP Agent is started and accessible.'));
        console.log(chalk.gray(`   Try: cd mcp_agent && npm start`));
    }
    
    return success;
}

// Main execution
async function main() {
    try {
        const success = await testMCPAgent();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { testMCPAgent };