/**
 * @fileoverview Authentication API Routes
 * @description API endpoints for user authentication and authorization
 * @author AION Team
 * @version 2.0.0
 */

const { 
    createAuthMiddleware,
    createAuthorizationMiddleware,
    createOptionalAuthMiddleware 
} = require('../middleware/authMiddleware');

/**
 * Register Authentication API routes
 * @param {FastifyInstance} app - Fastify app instance
 * @param {Object} services - Service instances
 */
async function registerAuthRoutes(app, services) {
    const { 
        authService,
        errorManager,
        validationManager,
        securityManager 
    } = services;

    // Create middleware instances
    const authMiddleware = createAuthMiddleware(authService);
    const optionalAuthMiddleware = createOptionalAuthMiddleware(authService);
    const adminAuthMiddleware = createAuthorizationMiddleware(authService, ['*']);

    // ========== Public Authentication Endpoints ==========

    /**
     * POST /api/auth/login
     * User login with username/password
     */
    app.post('/api/auth/login', {
        preHandler: [
            securityManager.createRateLimitMiddleware('auth-login'),
            validationManager.validateRequest({
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string', minLength: 3, maxLength: 50 },
                    password: { type: 'string', minLength: 6 },
                    rememberMe: { type: 'boolean' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('auth-login', '/api/auth/login');
        
        try {
            const { username, password, rememberMe = false } = request.body;
            const ipAddress = request.ip;
            const userAgent = request.headers['user-agent'];
            
            // Authenticate user
            const user = await authService.authenticateUser(username, password, ipAddress, userAgent);
            
            // Generate tokens
            const tokens = await authService.generateTokens(user, {
                ipAddress,
                userAgent,
                rememberMe
            });
            
            // Set secure cookie for refresh token (optional)
            if (rememberMe) {
                reply.setCookie('refreshToken', tokens.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                });
            }
            
            return {
                success: true,
                data: {
                    ...tokens,
                    message: 'Login successful'
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    /**
     * POST /api/auth/refresh
     * Refresh access token using refresh token
     */
    app.post('/api/auth/refresh', {
        preHandler: [
            securityManager.createRateLimitMiddleware('auth-refresh'),
            validationManager.validateRequest({
                type: 'object',
                required: ['refreshToken'],
                properties: {
                    refreshToken: { type: 'string' }
                }
            })
        ]
    }, async (request, reply) => {
        const context = errorManager.createContext('auth-refresh', '/api/auth/refresh');
        
        try {
            const { refreshToken } = request.body;
            
            // Try to get refresh token from cookie if not in body
            const tokenToUse = refreshToken || request.cookies.refreshToken;
            
            if (!tokenToUse) {
                return reply.status(400).send({
                    success: false,
                    error: 'Refresh token required',
                    code: 'MISSING_REFRESH_TOKEN'
                });
            }
            
            // Refresh tokens
            const newTokens = await authService.refreshAccessToken(tokenToUse);
            
            return {
                success: true,
                data: {
                    ...newTokens,
                    message: 'Token refreshed successfully'
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const errorResponse = errorManager.createErrorResponse(error, context);
            return reply.status(errorResponse.statusCode).send(errorResponse);
        }
    });

    /**
     * POST /api/auth/logout
     * Logout user (invalidate session)
     */
    app.post('/api/auth/logout', {
        preHandler: [authMiddleware]
    }, async (request, reply) => {
        try {
            // Logout user
            await authService.logout(request.session.sessionId);
            
            // Clear refresh token cookie
            reply.clearCookie('refreshToken');
            
            return {
                success: true,
                data: {
                    message: 'Logout successful'
                },
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

    // ========== User Profile Endpoints ==========

    /**
     * GET /api/auth/profile
     * Get current user profile
     */
    app.get('/api/auth/profile', {
        preHandler: [authMiddleware]
    }, async (request, reply) => {
        try {
            const user = request.user;
            
            // Get additional user info from auth service
            const userDetails = authService.users.get(user.userId);
            
            const profile = {
                id: user.userId,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                hederaAccountId: user.hederaAccountId,
                isActive: userDetails?.isActive,
                isVerified: userDetails?.isVerified,
                createdAt: userDetails?.createdAt,
                lastLogin: userDetails?.lastLogin,
                loginCount: userDetails?.loginCount,
                metadata: {
                    ipAddresses: userDetails?.metadata?.ipAddresses?.slice(-5) || [], // Last 5 IPs
                    lastPasswordChange: userDetails?.metadata?.lastPasswordChange
                }
            };
            
            return {
                success: true,
                data: profile,
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

    /**
     * PUT /api/auth/profile
     * Update user profile
     */
    app.put('/api/auth/profile', {
        preHandler: [
            authMiddleware,
            validationManager.validateRequest({
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    hederaAccountId: { type: 'string' }
                }
            })
        ]
    }, async (request, reply) => {
        try {
            const user = request.user;
            const updates = request.body;
            
            // Get user from auth service
            const userRecord = authService.users.get(user.userId);
            if (!userRecord) {
                return reply.status(404).send({
                    success: false,
                    error: 'User not found'
                });
            }
            
            // Update allowed fields
            if (updates.email) {
                userRecord.email = updates.email;
            }
            
            if (updates.hederaAccountId) {
                userRecord.hederaAccountId = updates.hederaAccountId;
            }
            
            return {
                success: true,
                data: {
                    message: 'Profile updated successfully',
                    updatedFields: Object.keys(updates)
                },
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

    // ========== Admin Endpoints ==========

    /**
     * GET /api/auth/users
     * List all users (admin only)
     */
    app.get('/api/auth/users', {
        preHandler: [authMiddleware, adminAuthMiddleware]
    }, async (request, reply) => {
        try {
            const { limit = 50, offset = 0, role, active } = request.query;
            
            let users = Array.from(authService.users.values());
            
            // Apply filters
            if (role) {
                users = users.filter(user => user.role === role);
            }
            
            if (active !== undefined) {
                const isActive = active === 'true';
                users = users.filter(user => user.isActive === isActive);
            }
            
            // Apply pagination
            const paginatedUsers = users.slice(offset, offset + limit);
            
            // Remove sensitive data
            const safeUsers = paginatedUsers.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                hederaAccountId: user.hederaAccountId,
                isActive: user.isActive,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount
            }));
            
            return {
                success: true,
                data: {
                    users: safeUsers,
                    pagination: {
                        total: users.length,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: offset + limit < users.length
                    }
                },
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

    /**
     * POST /api/auth/users
     * Create new user (admin only)
     */
    app.post('/api/auth/users', {
        preHandler: [
            authMiddleware,
            adminAuthMiddleware,
            validationManager.validateRequest({
                type: 'object',
                required: ['username', 'email', 'password', 'role'],
                properties: {
                    username: { type: 'string', minLength: 3, maxLength: 50 },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    role: { type: 'string', enum: ['admin', 'vault_manager', 'trader', 'viewer', 'api_user'] },
                    hederaAccountId: { type: 'string' },
                    isActive: { type: 'boolean' },
                    isVerified: { type: 'boolean' }
                }
            })
        ]
    }, async (request, reply) => {
        try {
            const userData = request.body;
            
            // Create user
            const result = await authService.createUser(userData);
            
            return {
                success: true,
                data: {
                    ...result,
                    message: 'User created successfully'
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return reply.status(400).send({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    /**
     * GET /api/auth/sessions
     * List active sessions (admin only)
     */
    app.get('/api/auth/sessions', {
        preHandler: [authMiddleware, adminAuthMiddleware]
    }, async (request, reply) => {
        try {
            const sessions = Array.from(authService.sessions.values())
                .filter(session => session.isActive)
                .map(session => ({
                    sessionId: session.sessionId,
                    userId: session.userId,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                    ipAddress: session.ipAddress,
                    userAgent: session.userAgent
                }));
            
            return {
                success: true,
                data: {
                    sessions: sessions,
                    total: sessions.length
                },
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

    /**
     * GET /api/auth/metrics
     * Get authentication metrics (admin only)
     */
    app.get('/api/auth/metrics', {
        preHandler: [authMiddleware, adminAuthMiddleware]
    }, async (request, reply) => {
        try {
            const metrics = authService.getMetrics();
            
            return {
                success: true,
                data: metrics,
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

    return app;
}

module.exports = { registerAuthRoutes };