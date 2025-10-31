#!/usr/bin/env node

/**
 * @fileoverview Production MCP Agent Startup Script
 * @description Start MCP Agent in production mode with monitoring
 * @author AION Team
 * @version 2.0.0
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

/**
 * Production MCP Agent Starter
 */
class ProductionMCPStarter {
    constructor() {
        this.config = {
            environment: 'production',
            port: process.env.PORT || 3001,
            host: process.env.HOST || '0.0.0.0',
            logLevel: process.env.LOG_LEVEL || 'info',
            maxRestarts: 5,
            restartDelay: 5000
        };
        
        this.process = null;
        this.restartCount = 0;
        this.isShuttingDown = false;
    }

    /**
     * Validate production environment
     */
    async validateEnvironment() {
        console.log(chalk.blue('🔍 Validating production environment...'));
        
        // Check required environment variables
        const requiredEnvVars = [
            'HEDERA_OPERATOR_ID',
            'HEDERA_OPERATOR_PRIVATE_KEY',
            'HEDERA_NETWORK'
        ];
        
        const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        
        // Check configuration files
        const mcpAgentPath = path.join(__dirname, '../mcp_agent');
        const configFiles = [
            'config/production.json',
            'package.json',
            'server/app.js'
        ];
        
        for (const file of configFiles) {
            try {
                await fs.access(path.join(mcpAgentPath, file));
            } catch (error) {
                throw new Error(`Required file missing: ${file}`);
            }
        }
        
        // Create logs directory
        await fs.mkdir(path.join(mcpAgentPath, 'logs'), { recursive: true });
        
        console.log(chalk.green('✅ Environment validation passed'));
    }

    /**
     * Start the MCP Agent process
     */
    async startProcess() {
        const mcpAgentPath = path.join(__dirname, '../mcp_agent');
        
        console.log(chalk.blue(`🚀 Starting MCP Agent (attempt ${this.restartCount + 1})...`));
        
        this.process = spawn('node', ['server/app.js'], {
            cwd: mcpAgentPath,
            env: {
                ...process.env,
                NODE_ENV: this.config.environment,
                PORT: this.config.port,
                HOST: this.config.host,
                LOG_LEVEL: this.config.logLevel
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        // Handle process output
        this.process.stdout.on('data', (data) => {
            process.stdout.write(data);
        });
        
        this.process.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        // Handle process exit
        this.process.on('exit', (code, signal) => {
            if (this.isShuttingDown) {
                console.log(chalk.yellow('🛑 MCP Agent stopped gracefully'));
                return;
            }
            
            console.log(chalk.red(`❌ MCP Agent exited with code ${code}, signal ${signal}`));
            
            if (this.restartCount < this.config.maxRestarts) {
                this.restartCount++;
                console.log(chalk.yellow(`🔄 Restarting in ${this.config.restartDelay / 1000} seconds...`));
                
                setTimeout(() => {
                    this.startProcess();
                }, this.config.restartDelay);
            } else {
                console.log(chalk.red(`❌ Max restart attempts (${this.config.maxRestarts}) reached. Exiting.`));
                process.exit(1);
            }
        });
        
        // Handle process errors
        this.process.on('error', (error) => {
            console.error(chalk.red('❌ Failed to start MCP Agent:'), error.message);
            process.exit(1);
        });
        
        console.log(chalk.green(`✅ MCP Agent started with PID: ${this.process.pid}`));
        console.log(chalk.blue(`📡 Server running at: http://${this.config.host}:${this.config.port}`));
        console.log(chalk.blue(`🏥 Health check: http://${this.config.host}:${this.config.port}/health`));
    }

    /**
     * Setup graceful shutdown
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down gracefully...`));
            this.isShuttingDown = true;
            
            if (this.process) {
                this.process.kill('SIGTERM');
                
                // Force kill after 10 seconds
                setTimeout(() => {
                    if (this.process && !this.process.killed) {
                        console.log(chalk.red('⚠️ Force killing process...'));
                        this.process.kill('SIGKILL');
                    }
                }, 10000);
            }
            
            process.exit(0);
        };
        
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
    }

    /**
     * Start production MCP Agent
     */
    async start() {
        try {
            console.log(chalk.blue('🚀 Starting AION MCP Agent in Production Mode...'));
            console.log(chalk.gray(`Environment: ${this.config.environment}`));
            console.log(chalk.gray(`Port: ${this.config.port}`));
            console.log(chalk.gray(`Host: ${this.config.host}`));
            console.log(chalk.gray(`Log Level: ${this.config.logLevel}\n`));
            
            await this.validateEnvironment();
            this.setupGracefulShutdown();
            await this.startProcess();
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to start MCP Agent:'), error.message);
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    const starter = new ProductionMCPStarter();
    await starter.start();
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { ProductionMCPStarter };