#!/usr/bin/env node

/**
 * @fileoverview AION AI Agent Enhanced Server
 * @description Main server application with Hedera integration
 * @author AION Team
 * @version 2.0.0
 */

const fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const chalk = require('chalk');

// Import route handlers
const { registerHederaRoutes } = require('./hederaRoutes');
const { registerMonitoringRoutes } = require('./monitoringRoutes');
const { registerVaultRoutes } = require('./vaultRoutes');
const { registerExecuteRoutes } = require('./executeRoutes');
const { registerAuthRoutes } = require('./authRoutes');

// Import services
const HederaService = require('../services/hederaService');
const AIDecisionLogger = require('../services/AIDecisionLogger');
const ModelMetadataManager = require('../services/ModelMetadataManager');
const Web3Service = require('../services/Web3Service');
const AuthenticationService = require('../services/AuthenticationService');

/**
 * Enhanced AION Server with Hedera Integration
 */
class AIONServer {
    constructor(options = {}) {
        this.config = {
            port: options.port || process.env.PORT || 3000,
            host: options.host || process.env.HOST || '0.0.0.0',
            environment: options.environment || process.env.NODE_ENV || 'development',
            ...options
        };
        
        this.services = {};
        this.app = null;
        this.isStarted = false;
    }

    /**
     * Initialize Fastify application
     */
    async initializeApp() {
        this.app = fastify({
            logger: {
                level: this.config.environment === 'production' ? 'info' : 'debug',
                prettyPrint: this.config.environment !== 'production'
            },
            trustProxy: true
        });

        // Register security plugins
        await this.app.register(helmet, {
            contentSecurityPolicy: false
        });

        await this.app.register(cors, {
            origin: this.config.environment === 'production' 
                ? ['https://aion-ai.com', 'https://app.aion-ai.com']
                : true,
            credentials: true
        });

        // Register rate limiting
        await this.app.register(rateLimit, {
            max: 100,
            timeWindow: '1 minute',
            errorResponseBuilder: (request, context) => {
                return {
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfter: Math.round(context.ttl / 1000)
                };
            }
        });

        // Add request logging
        this.app.addHook('onRequest', async (request, reply) => {
            request.startTime = Date.now();
        });

        this.app.addHook('onResponse', async (request, reply) => {
            const duration = Date.now() - request.startTime;
            this.app.log.info({
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                duration: `${duration}ms`
            });
        });

        // Global error handler
        this.app.setErrorHandler(async (error, request, reply) => {
            this.app.log.error(error);
            
            const statusCode = error.statusCode || 500;
            const response = {
                success: false,
                error: this.config.environment === 'production' 
                    ? 'Internal server error' 
                    : error.message,
                timestamp: new Date().toISOString()
            };

            if (this.config.environment !== 'production') {
                response.stack = error.stack;
            }

            return reply.status(statusCode).send(response);
        });

        // Health check endpoint
        this.app.get('/health', async (request, reply) => {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                services: {
                    hedera: this.services.hederaService?.isConnected || false,
                    aiLogger: this.services.aiDecisionLogger?.isInitialized || false,
                    modelManager: this.services.modelMetadataManager?.isInitialized || false,
                    web3: this.services.web3Service?.isInitialized || false
                },
                version: '2.0.0'
            };

            const allHealthy = Object.values(health.services).every(status => status === true);
            const statusCode = allHealthy ? 200 : 503;
            
            return reply.status(statusCode).send(health);
        });

        // API info endpoint
        this.app.get('/api', async (request, reply) => {
            return {
                name: 'AION AI Agent API',
                version: '2.0.0',
                description: 'Enhanced AI Agent with Hedera blockchain integration',
                endpoints: {
                    health: '/health',
                    auth: '/api/auth/*',
                    vault: '/api/vault/*',
                    execute: '/api/execute/*',
                    hedera: '/api/hedera/*',
                    monitoring: '/api/monitoring/*'
                },
                documentation: 'https://docs.aion-ai.com/api',
                timestamp: new Date().toISOString()
            };
        });
    }

    /**
     * Initialize all services
     */
    async initializeServices() {
        console.log(chalk.blue('🔧 Initializing services...'));

        try {
            // Initialize Hedera Service
            console.log(chalk.gray('  - Initializing Hedera Service...'));
            this.services.hederaService = new HederaService();
            await this.services.hederaService.initialize();
            console.log(chalk.green('  ✓ Hedera Service initialized'));

            // Initialize AI Decision Logger
            console.log(chalk.gray('  - Initializing AI Decision Logger...'));
            this.services.aiDecisionLogger = new AIDecisionLogger(this.services.hederaService);
            await this.services.aiDecisionLogger.initialize();
            console.log(chalk.green('  ✓ AI Decision Logger initialized'));

            // Initialize Model Metadata Manager
            console.log(chalk.gray('  - Initializing Model Metadata Manager...'));
            this.services.modelMetadataManager = new ModelMetadataManager(this.services.hederaService);
            await this.services.modelMetadataManager.initialize();
            console.log(chalk.green('  ✓ Model Metadata Manager initialized'));

            // Initialize Web3 Service
            console.log(chalk.gray('  - Initializing Web3 Service...'));
            this.services.web3Service = new Web3Service();
            await this.services.web3Service.initialize();
            console.log(chalk.green('  ✓ Web3 Service initialized'));

            // Initialize Authentication Service
            console.log(chalk.gray('  - Initializing Authentication Service...'));
            this.services.authService = new AuthenticationService(this.services.hederaService);
            await this.services.authService.initialize();
            console.log(chalk.green('  ✓ Authentication Service initialized'));

            // Add error management and validation services
            this.services.errorManager = {
                createContext: (operation, endpoint) => ({ operation, endpoint, timestamp: Date.now() }),
                createErrorResponse: (error, context) => ({
                    success: false,
                    error: error.message,
                    context: context,
                    statusCode: error.statusCode || 500,
                    timestamp: new Date().toISOString()
                })
            };

            this.services.validationManager = {
                validateRequest: (schema) => async (request, reply) => {
                    // Basic validation middleware
                    if (!request.body) {
                        return reply.status(400).send({
                            success: false,
                            error: 'Request body is required'
                        });
                    }
                }
            };

            this.services.securityManager = {
                createRateLimitMiddleware: (name) => async (request, reply) => {
                    // Rate limiting middleware placeholder
                    return;
                }
            };

            console.log(chalk.green('🎉 All services initialized successfully'));

        } catch (error) {
            console.error(chalk.red('❌ Service initialization failed:'), error.message);
            throw error;
        }
    }

    /**
     * Register all routes
     */
    async registerRoutes() {
        console.log(chalk.blue('🛣️  Registering routes...'));

        try {
            // Register authentication routes
            await registerAuthRoutes(this.app, this.services);
            console.log(chalk.green('  ✓ Authentication routes registered'));

            // Register vault routes
            await registerVaultRoutes(this.app, this.services);
            console.log(chalk.green('  ✓ Vault routes registered'));

            // Register execute routes
            await registerExecuteRoutes(this.app, this.services);
            console.log(chalk.green('  ✓ Execute routes registered'));

            // Register Hedera routes
            await registerHederaRoutes(this.app, this.services);
            console.log(chalk.green('  ✓ Hedera routes registered'));

            // Register monitoring routes
            await registerMonitoringRoutes(this.app, this.services);
            console.log(chalk.green('  ✓ Monitoring routes registered'));

            console.log(chalk.green('🎉 All routes registered successfully'));

        } catch (error) {
            console.error(chalk.red('❌ Route registration failed:'), error.message);
            throw error;
        }
    }

    /**
     * Start the server
     */
    async start() {
        if (this.isStarted) {
            console.log(chalk.yellow('⚠️  Server is already running'));
            return;
        }

        try {
            console.log(chalk.blue('🚀 Starting AION AI Agent Server...'));
            console.log(chalk.gray(`Environment: ${this.config.environment}`));
            console.log(chalk.gray(`Port: ${this.config.port}`));
            console.log(chalk.gray(`Host: ${this.config.host}\n`));

            // Initialize application
            await this.initializeApp();
            console.log(chalk.green('✓ Application initialized'));

            // Initialize services
            await this.initializeServices();

            // Register routes
            await this.registerRoutes();

            // Start listening
            await this.app.listen({
                port: this.config.port,
                host: this.config.host
            });

            this.isStarted = true;

            console.log(chalk.green(`\n🎉 Server started successfully!`));
            console.log(chalk.blue(`📡 Server running at: http://${this.config.host}:${this.config.port}`));
            console.log(chalk.blue(`🏥 Health check: http://${this.config.host}:${this.config.port}/health`));
            console.log(chalk.blue(`📚 API info: http://${this.config.host}:${this.config.port}/api`));
            console.log(chalk.blue(`🔐 Auth API: http://${this.config.host}:${this.config.port}/api/auth/*`));
            console.log(chalk.blue(`💰 Vault API: http://${this.config.host}:${this.config.port}/api/vault/*`));
            console.log(chalk.blue(`⚡ Execute API: http://${this.config.host}:${this.config.port}/api/execute/*`));
            console.log(chalk.blue(`🔗 Hedera API: http://${this.config.host}:${this.config.port}/api/hedera/*`));

        } catch (error) {
            console.error(chalk.red('❌ Server startup failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Stop the server
     */
    async stop() {
        if (!this.isStarted) {
            console.log(chalk.yellow('⚠️  Server is not running'));
            return;
        }

        try {
            console.log(chalk.blue('🛑 Stopping server...'));

            // Close server
            await this.app.close();

            // Cleanup services
            if (this.services.hederaService) {
                await this.services.hederaService.cleanup();
            }
            if (this.services.aiDecisionLogger) {
                await this.services.aiDecisionLogger.cleanup();
            }
            if (this.services.modelMetadataManager) {
                await this.services.modelMetadataManager.cleanup();
            }
            if (this.services.web3Service) {
                await this.services.web3Service.cleanup();
            }

            this.isStarted = false;
            console.log(chalk.green('✓ Server stopped successfully'));

        } catch (error) {
            console.error(chalk.red('❌ Server shutdown failed:'), error.message);
            throw error;
        }
    }

    /**
     * Get server status
     */
    getStatus() {
        return {
            isStarted: this.isStarted,
            config: this.config,
            services: Object.keys(this.services),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n📡 Received SIGTERM, shutting down gracefully...'));
    if (global.server) {
        await global.server.stop();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n📡 Received SIGINT, shutting down gracefully...'));
    if (global.server) {
        await global.server.stop();
    }
    process.exit(0);
});

// Main execution
async function main() {
    const server = new AIONServer({
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        environment: process.env.NODE_ENV || 'development'
    });

    global.server = server;
    await server.start();
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('❌ Application failed to start:'), error);
        process.exit(1);
    });
}

module.exports = { AIONServer };