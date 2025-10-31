#!/usr/bin/env node

/**
 * @fileoverview Enhanced Server Startup Script
 * @description Start the AION AI Agent server with Hedera integration
 * @author AION Team
 * @version 2.0.0
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class ServerStarter {
    constructor() {
        this.processes = [];
        this.isShuttingDown = false;
    }

    /**
     * Check if required files exist
     */
    async checkRequiredFiles() {
        const requiredFiles = [
            'mcp_agent/server/app.js',
            'mcp_agent/services/hederaService.js',
            'mcp_agent/services/AIDecisionLogger.js',
            'mcp_agent/services/ModelMetadataManager.js',
            'mcp_agent/services/Web3Service.js'
        ];

        console.log(chalk.blue('🔍 Checking required files...'));

        for (const file of requiredFiles) {
            try {
                await fs.access(file);
                console.log(chalk.green(`  ✓ ${file}`));
            } catch (error) {
                console.log(chalk.red(`  ✗ ${file} - Missing!`));
                throw new Error(`Required file missing: ${file}`);
            }
        }

        console.log(chalk.green('✓ All required files found'));
    }

    /**
     * Check environment variables
     */
    checkEnvironment() {
        console.log(chalk.blue('🌍 Checking environment variables...'));

        const requiredEnvVars = [
            'HEDERA_NETWORK',
            'HEDERA_OPERATOR_ID',
            'HEDERA_OPERATOR_KEY'
        ];

        const missingVars = [];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                missingVars.push(envVar);
            } else {
                console.log(chalk.green(`  ✓ ${envVar}`));
            }
        }

        if (missingVars.length > 0) {
            console.log(chalk.yellow('⚠️  Missing environment variables:'));
            missingVars.forEach(varName => {
                console.log(chalk.yellow(`  - ${varName}`));
            });
            console.log(chalk.yellow('  Server will start but some features may not work properly.'));
        } else {
            console.log(chalk.green('✓ All required environment variables found'));
        }
    }

    /**
     * Install dependencies if needed
     */
    async installDependencies() {
        console.log(chalk.blue('📦 Checking dependencies...'));

        try {
            await fs.access('mcp_agent/node_modules');
            console.log(chalk.green('✓ Dependencies already installed'));
        } catch (error) {
            console.log(chalk.yellow('📦 Installing dependencies...'));
            
            return new Promise((resolve, reject) => {
                const npm = spawn('npm', ['install'], {
                    cwd: 'mcp_agent',
                    stdio: 'inherit'
                });

                npm.on('close', (code) => {
                    if (code === 0) {
                        console.log(chalk.green('✓ Dependencies installed successfully'));
                        resolve();
                    } else {
                        reject(new Error(`npm install failed with code ${code}`));
                    }
                });
            });
        }
    }

    /**
     * Start the server
     */
    async startServer() {
        console.log(chalk.blue('🚀 Starting enhanced AION server...'));

        return new Promise((resolve, reject) => {
            const serverProcess = spawn('node', ['server/app.js'], {
                cwd: 'mcp_agent',
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_ENV: process.env.NODE_ENV || 'development',
                    PORT: process.env.PORT || '3000',
                    HOST: process.env.HOST || '0.0.0.0'
                }
            });

            this.processes.push(serverProcess);

            serverProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(chalk.green('✓ Server stopped gracefully'));
                    resolve();
                } else if (!this.isShuttingDown) {
                    console.log(chalk.red(`❌ Server exited with code ${code}`));
                    reject(new Error(`Server process failed with code ${code}`));
                }
            });

            serverProcess.on('error', (error) => {
                console.error(chalk.red('❌ Server process error:'), error);
                reject(error);
            });

            // Give the server time to start
            setTimeout(() => {
                console.log(chalk.green('🎉 Server startup initiated'));
                resolve();
            }, 2000);
        });
    }

    /**
     * Setup graceful shutdown
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) return;
            
            this.isShuttingDown = true;
            console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down gracefully...`));

            for (const process of this.processes) {
                if (process && !process.killed) {
                    process.kill('SIGTERM');
                }
            }

            // Force exit after 10 seconds
            setTimeout(() => {
                console.log(chalk.red('🔥 Force exit after timeout'));
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
    }

    /**
     * Wait for server to be ready
     */
    async waitForServer(maxAttempts = 30) {
        console.log(chalk.blue('⏳ Waiting for server to be ready...'));

        const axios = require('axios');
        const baseURL = `http://localhost:${process.env.PORT || 3000}`;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await axios.get(`${baseURL}/health`, { timeout: 2000 });
                
                if (response.status === 200) {
                    console.log(chalk.green('✓ Server is ready and healthy'));
                    console.log(chalk.blue(`📡 Server URL: ${baseURL}`));
                    console.log(chalk.blue(`🏥 Health check: ${baseURL}/health`));
                    console.log(chalk.blue(`📚 API info: ${baseURL}/api`));
                    console.log(chalk.blue(`🔗 Hedera API: ${baseURL}/api/hedera/*`));
                    return true;
                }
            } catch (error) {
                if (attempt === maxAttempts) {
                    console.log(chalk.red('❌ Server failed to become ready'));
                    throw new Error('Server health check failed');
                }
                
                console.log(chalk.gray(`  Attempt ${attempt}/${maxAttempts} - waiting...`));
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return false;
    }

    /**
     * Run startup sequence
     */
    async run() {
        try {
            console.log(chalk.blue('🌟 AION AI Agent Enhanced Server Startup'));
            console.log(chalk.gray('=====================================\n'));

            // Setup graceful shutdown first
            this.setupGracefulShutdown();

            // Check required files
            await this.checkRequiredFiles();

            // Check environment
            this.checkEnvironment();

            // Install dependencies
            await this.installDependencies();

            // Start server
            await this.startServer();

            // Wait for server to be ready
            await this.waitForServer();

            console.log(chalk.green('\n🎉 Server is running successfully!'));
            console.log(chalk.blue('Press Ctrl+C to stop the server'));

            // Keep the process alive
            return new Promise(() => {});

        } catch (error) {
            console.error(chalk.red('\n❌ Startup failed:'), error.message);
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    const starter = new ServerStarter();
    await starter.run();
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('❌ Startup script failed:'), error);
        process.exit(1);
    });
}

module.exports = { ServerStarter };