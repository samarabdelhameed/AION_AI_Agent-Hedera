/**
 * @fileoverview Enhanced Hedera API Routes
 * @description Comprehensive API endpoints for Hedera integration
 * @author AION Team
 * @version 2.0.0
 */

/**
 * Register Hedera API routes
 * @param {FastifyInstance} app - Fastify app instance
 * @param {Object} services - Service instances
 */
async function registerHederaRoutes(app, services) {
    const { 
        hederaService, 
        aiDecisionLogger, 
        modelMetadataManager, 
        web3Service,
        errorManager,
        validationManager,
        securityManager 
    } = services;

    // ========== Status Endpoints ==========

    // Enhanced Hedera status endpoint
    app.get('/api/hedera/status', async (request, reply) => {
        const context = errorManager.createContext('hedera-status', '/api/hedera/status');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not initialized',
                    timestamp: new Date().toISOString()
                });
            }
            
            const status = hederaService.getStatus();
            const metrics = hederaService.getMetrics();
            
            return {
                success: true,
                data: {
                    status: status,
                    metrics: metrics,
                    services: {
                        hcs: status.services?.hcs || false,
                        hts: status.services?.hts || false,
                        hfs: status.services?.hfs || false
                    },
                    network: status.network || 'testnet',
                    operatorId: status.operatorId,
                    isConnected: status.isConnected
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Network health endpoint
    app.get('/api/hedera/health', async (request, reply) => {
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const health = {
                hederaService: hederaService.getStatus(),
                aiDecisionLogger: aiDecisionLogger ? {
                    isInitialized: aiDecisionLogger.isInitialized,
                    metrics: aiDecisionLogger.getMetrics()
                } : null,
                modelMetadataManager: modelMetadataManager ? {
                    isInitialized: modelMetadataManager.isInitialized,
                    metrics: modelMetadataManager.getMetrics()
                } : null
            };

            return {
                success: true,
                data: health,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ========== Decision Endpoints ==========

    // AI decisions logging endpoint
    app.get('/api/hedera/decisions', async (request, reply) => {
        const context = errorManager.createContext('hedera-decisions', '/api/hedera/decisions');
        
        try {
            if (!aiDecisionLogger) {
                return reply.status(503).send({
                    success: false,
                    error: 'AI Decision Logger not available'
                });
            }

            const { limit = 50, offset = 0, type, startTime, endTime } = request.query;
            
            // Get decisions with filters
            const filters = {};
            if (type) filters.type = type;
            if (startTime) filters.startTime = parseInt(startTime);
            if (endTime) filters.endTime = parseInt(endTime);

            const decisions = aiDecisionLogger.getDecisions(filters);
            
            // Apply pagination
            const paginatedDecisions = decisions.slice(offset, offset + limit);
            
            return {
                success: true,
                data: {
                    decisions: paginatedDecisions,
                    pagination: {
                        total: decisions.length,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: offset + limit < decisions.length
                    }
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Log new AI decision
    app.post('/api/hedera/decisions', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-decisions'),
            validationManager.validateRequest({
                type: 'object',
                required: ['type', 'action', 'confidence'],
                properties: {
                    type: { type: 'string' },
                    action: { type: 'string' },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    reasoning: { type: 'string' },
                    context: { type: 'object' },
                    parameters: { type: 'object' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-log-decision', '/api/hedera/decisions');
        
        try {
            if (!aiDecisionLogger) {
                return reply.status(503).send({
                    success: false,
                    error: 'AI Decision Logger not available'
                });
            }

            const decisionData = request.body;
            const decisionId = await aiDecisionLogger.logDecision(decisionData);
            
            return {
                success: true,
                data: {
                    decisionId: decisionId,
                    logged: true
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Get specific decision by ID
    app.get('/api/hedera/decisions/:decisionId', async (request, reply) => {
        try {
            if (!aiDecisionLogger) {
                return reply.status(503).send({
                    success: false,
                    error: 'AI Decision Logger not available'
                });
            }

            const { decisionId } = request.params;
            const decision = aiDecisionLogger.getDecision(decisionId);
            
            if (!decision) {
                return reply.status(404).send({
                    success: false,
                    error: 'Decision not found'
                });
            }

            return {
                success: true,
                data: decision,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // Log decision outcome
    app.post('/api/hedera/decisions/:decisionId/outcome', async (request, reply) => {
        try {
            if (!aiDecisionLogger) {
                return reply.status(503).send({
                    success: false,
                    error: 'AI Decision Logger not available'
                });
            }

            const { decisionId } = request.params;
            const outcome = request.body;
            
            const logged = await aiDecisionLogger.logDecisionOutcome(decisionId, outcome);
            
            return {
                success: logged,
                data: {
                    decisionId: decisionId,
                    outcomeLogged: logged
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // ========== Token Endpoints ==========

    // HTS token information
    app.get('/api/hedera/token/:tokenId', async (request, reply) => {
        const context = errorManager.createContext('hedera-token-info', '/api/hedera/token/:tokenId');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const { tokenId } = request.params;
            
            // Get token information (simulated for now)
            const tokenInfo = {
                tokenId: tokenId,
                name: 'AION Vault Shares',
                symbol: 'AION',
                decimals: 18,
                totalSupply: '1000000000000000000000000', // 1M tokens
                treasury: hederaService.config.operatorId,
                status: 'active',
                created: new Date().toISOString()
            };

            return {
                success: true,
                data: tokenInfo,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Mint HTS tokens
    app.post('/api/hedera/token/:tokenId/mint', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-token-mint'),
            validationManager.validateRequest({
                type: 'object',
                required: ['amount'],
                properties: {
                    amount: { type: 'string' },
                    metadata: { type: 'object' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-token-mint', '/api/hedera/token/:tokenId/mint');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const { tokenId } = request.params;
            const { amount, metadata = {} } = request.body;
            
            const result = await hederaService.mintHTSTokens(tokenId, amount, metadata);
            
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Burn HTS tokens
    app.post('/api/hedera/token/:tokenId/burn', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-token-burn'),
            validationManager.validateRequest({
                type: 'object',
                required: ['amount'],
                properties: {
                    amount: { type: 'string' },
                    metadata: { type: 'object' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-token-burn', '/api/hedera/token/:tokenId/burn');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const { tokenId } = request.params;
            const { amount, metadata = {} } = request.body;
            
            const result = await hederaService.burnHTSTokens(tokenId, amount, metadata);
            
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Transfer HTS tokens
    app.post('/api/hedera/token/:tokenId/transfer', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-token-transfer'),
            validationManager.validateRequest({
                type: 'object',
                required: ['fromAccountId', 'toAccountId', 'amount'],
                properties: {
                    fromAccountId: { type: 'string' },
                    toAccountId: { type: 'string' },
                    amount: { type: 'string' },
                    metadata: { type: 'object' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-token-transfer', '/api/hedera/token/:tokenId/transfer');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const { tokenId } = request.params;
            const { fromAccountId, toAccountId, amount, metadata = {} } = request.body;
            
            const result = await hederaService.transferHTSTokens(
                tokenId, 
                fromAccountId, 
                toAccountId, 
                amount, 
                metadata
            );
            
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Associate account with token
    app.post('/api/hedera/token/:tokenId/associate', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-token-associate'),
            validationManager.validateRequest({
                type: 'object',
                required: ['accountId'],
                properties: {
                    accountId: { type: 'string' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-token-associate', '/api/hedera/token/:tokenId/associate');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const { tokenId } = request.params;
            const { accountId } = request.body;
            
            const result = await hederaService.associateHTSToken(accountId, tokenId);
            
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // ========== HCS Endpoints ==========

    // Submit message to HCS
    app.post('/api/hedera/hcs/submit', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-hcs-submit'),
            validationManager.validateRequest({
                type: 'object',
                required: ['message'],
                properties: {
                    topicId: { type: 'string' },
                    message: { type: ['string', 'object'] }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-hcs-submit', '/api/hedera/hcs/submit');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const { topicId, message } = request.body;
            const targetTopicId = topicId || hederaService.config.hcsTopicId;
            
            const result = await hederaService.submitToHCS(targetTopicId, message);
            
            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Submit batch messages to HCS
    app.post('/api/hedera/hcs/batch', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-hcs-batch'),
            validationManager.validateRequest({
                type: 'object',
                required: ['messages'],
                properties: {
                    topicId: { type: 'string' },
                    messages: { 
                        type: 'array',
                        items: { type: ['string', 'object'] },
                        maxItems: 50
                    }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-hcs-batch', '/api/hedera/hcs/batch');
        
        try {
            if (!hederaService) {
                return reply.status(503).send({
                    success: false,
                    error: 'Hedera service not available'
                });
            }

            const { topicId, messages } = request.body;
            const targetTopicId = topicId || hederaService.config.hcsTopicId;
            
            const results = await hederaService.submitBatchToHCS(targetTopicId, messages);
            
            return {
                success: true,
                data: {
                    results: results,
                    totalMessages: messages.length,
                    successfulMessages: results.filter(r => r.success).length
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // ========== Model Metadata Endpoints ==========

    // Store model metadata
    app.post('/api/hedera/models', {
        preHandler: [
            securityManager.createRateLimitMiddleware('hedera-models'),
            validationManager.validateRequest({
                type: 'object',
                required: ['name', 'type', 'version'],
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    version: { type: 'string' },
                    description: { type: 'string' },
                    architecture: { type: 'object' },
                    parameters: { type: 'object' },
                    performance: { type: 'object' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('hedera-store-model', '/api/hedera/models');
        
        try {
            if (!modelMetadataManager) {
                return reply.status(503).send({
                    success: false,
                    error: 'Model Metadata Manager not available'
                });
            }

            const modelData = request.body;
            const modelId = `${modelData.name}-${modelData.version}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            
            const versionId = await modelMetadataManager.storeModelMetadata(modelId, modelData);
            
            return {
                success: true,
                data: {
                    modelId: modelId,
                    versionId: versionId
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    // Get model metadata
    app.get('/api/hedera/models/:modelId', async (request, reply) => {
        try {
            if (!modelMetadataManager) {
                return reply.status(503).send({
                    success: false,
                    error: 'Model Metadata Manager not available'
                });
            }

            const { modelId } = request.params;
            const metadata = await modelMetadataManager.retrieveModelMetadata(modelId);
            
            if (!metadata) {
                return reply.status(404).send({
                    success: false,
                    error: 'Model not found'
                });
            }

            return {
                success: true,
                data: metadata,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // List all models
    app.get('/api/hedera/models', async (request, reply) => {
        try {
            if (!modelMetadataManager) {
                return reply.status(503).send({
                    success: false,
                    error: 'Model Metadata Manager not available'
                });
            }

            const { type, status, minAccuracy } = request.query;
            
            const filters = {};
            if (type) filters.type = type;
            if (status) filters.status = status;
            if (minAccuracy) filters.minAccuracy = parseFloat(minAccuracy);

            const models = await modelMetadataManager.listModels(filters);
            
            return {
                success: true,
                data: {
                    models: models,
                    total: models.length
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // Get model version history
    app.get('/api/hedera/models/:modelId/versions', async (request, reply) => {
        try {
            if (!modelMetadataManager) {
                return reply.status(503).send({
                    success: false,
                    error: 'Model Metadata Manager not available'
                });
            }

            const { modelId } = request.params;
            const history = await modelMetadataManager.getVersionHistory(modelId);
            
            return {
                success: true,
                data: {
                    modelId: modelId,
                    versions: history
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // ========== Analytics Endpoints ==========

    // Get Hedera analytics
    app.get('/api/hedera/analytics', async (request, reply) => {
        try {
            const analytics = {
                hederaService: hederaService ? hederaService.getMetrics() : null,
                aiDecisionLogger: aiDecisionLogger ? aiDecisionLogger.getMetrics() : null,
                modelMetadataManager: modelMetadataManager ? modelMetadataManager.getMetrics() : null
            };

            return {
                success: true,
                data: analytics,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });

    return app;
}

export { registerHederaRoutes };