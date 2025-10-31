#!/usr/bin/env node

/**
 * @fileoverview Quick MCP Agent Test
 * @description Quick test to verify MCP Agent is working
 * @author AION Team
 * @version 2.0.0
 */

const { spawn } = require('child_process');
const axios = require('axios');
const chalk = require('chalk');
const path = require('path');

/**
 * Quick MCP Agent Tester
 */
class QuickMCPTester {
    constructor() {
        this.config = {
            port: 3002, // Use different port for testing
            host: 'localhost',
            timeout: 30000
        };
        this.process = null;
    }

    /**
     * Start MCP Agent for testing
     */
    async startMCPAgent() {
        console.log(chalk.blue('🚀 Starting MCP Agent for testing...'));
        
        const mcpAgentPath = path.join(__dirname, '../mcp_agent');
        
        this.process = spawn('node', ['server/app.js'], {
            cwd: mcpAgentPath,
            env: {
                ...process.env,
                NODE_ENV: 'test',
                PORT: this.config.port,
                HOST: this.config.host,
                HEDERA_NETWORK: 'testnet',
                HEDERA_OPERATOR_ID: '0.0.4696947',
                HEDERA_OPERATOR_PRIVATE_KEY: 'test_key'
            },
            stdio: 'pipe'
        });

        // Handle process output
        this.process.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Server started successfully')) {
                console.log(chalk.green('✅ MCP Agent started successfully'));
            }
        });

        this.process.stderr.on('data', (data) => {
            const error = data.toString();
            if (!error.includes('Warning') && !error.includes('DeprecationWarning')) {
                console.log(chalk.yellow('⚠️ MCP Agent warning:'), error.trim());
            }
        });

        // Wait for startup
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(chalk.blue(`📡 MCP Agent should be running at http://${this.config.host}:${this.config.port}`));
    }

    /**
     * Test health endpoint
     */
    async testHealth() {
        console.log(chalk.blue('🏥 Testing health endpoint...'));
        
        try {
            const response = await axios.get(`http://${this.config.host}:${this.config.port}/health`, {
                timeout: 5000
            });
            
            if (response.status === 200 && response.data.status === 'healthy') {
                console.log(chalk.green('✅ Health check passed'));
                console.log(chalk.gray(`   Version: ${response.data.version}`));
                console.log(chalk.gray(`   Uptime: ${response.data.uptime}s`));
                return true;
            } else {
                console.log(chalk.red('❌ Health check failed'));
                return false;
            }
        } catch (error) {
            console.log(chalk.red('❌ Health check failed:'), error.message);
            return false;
        }
    }

    /**
     * Test API endpoint
     */
    async testAPI() {
        console.log(chalk.blue('📚 Testing API endpoint...'));
        
        try {
            const response = await axios.get(`http://${this.config.host}:${this.config.port}/api`, {
                timeout: 5000
            });
            
            if (response.status === 200 && response.data.name) {
                console.log(chalk.green('✅ API endpoint working'));
                console.log(chalk.gray(`   Name: ${response.data.name}`));
                console.log(chalk.gray(`   Version: ${response.data.version}`));
                return true;
            } else {
                console.log(chalk.red('❌ API endpoint failed'));
                return false;
            }
        } catch (error) {
            console.log(chalk.red('❌ API endpoint failed:'), error.message);
            return false;
        }
    }

    /**
     * Stop MCP Agent
     */
    async stopMCPAgent() {
        console.log(chalk.blue('🛑 Stopping MCP Agent...'));
        
        if (this.process) {
            this.process.kill('SIGTERM');
            
            // Force kill after 5 seconds
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill('SIGKILL');
                }
            }, 5000);
        }
        
        console.log(chalk.green('✅ MCP Agent stopped'));
    }

    /**
     * Run quick test
     */
    async runQuickTest() {
        console.log(chalk.blue('🧪 Starting Quick MCP Agent Test...\n'));
        
        let healthPassed = false;
        let apiPassed = false;
        
        try {
            // Start MCP Agent
            await this.startMCPAgent();
            
            // Test health endpoint
            healthPassed = await this.testHealth();
            
            // Test API endpoint
            apiPassed = await this.testAPI();
            
        } catch (error) {
            console.error(chalk.red('❌ Test failed:'), error.message);
        } finally {
            // Stop MCP Agent
            await this.stopMCPAgent();
        }
        
        // Results
        console.log(chalk.blue('\n📊 Test Results:'));
        console.log(chalk.green(`✅ Health Check: ${healthPassed ? 'PASSED' : 'FAILED'}`));
        console.log(chalk.green(`✅ API Test: ${apiPassed ? 'PASSED' : 'FAILED'}`));
        
        const success = healthPassed && apiPassed;
        
        if (success) {
            console.log(chalk.green('\n🎉 Quick test passed! MCP Agent is working correctly.'));
        } else {
            console.log(chalk.red('\n❌ Quick test failed. Please check the configuration.'));
        }
        
        return success;
    }
}

// Main execution
async function main() {
    const tester = new QuickMCPTester();
    
    try {
        const success = await tester.runQuickTest();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error(chalk.red('❌ Quick test failed:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { QuickMCPTester };