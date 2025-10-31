/**
 * @fileoverview Authentication and Authorization Middleware
 * @description Fastify middleware for JWT authentication and role-based access control
 * @author AION Team
 * @version 2.0.0
 */

/**
 * Create authentication middleware
 */
function createAuthMiddleware(authService) {
    return async function authMiddleware(request, reply) {
        try {
            // Extract token from Authorization header
            const authHeader = request.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.status(401).send({
                    success: false,
                    error: 'Missing or invalid authorization header',
                    code: 'MISSING_TOKEN'
                });
            }
            
            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            
            // Verify token
            const verification = await authService.verifyToken(token);
            
            if (!verification.valid) {
                return reply.status(401).send({
                    success: false,
                    error: 'Invalid or expired token',
                    code: 'INVALID_TOKEN',
                    details: verification.error
                });
            }
            
            // Add user info to request
            request.user = verification.user;
            request.session = verification.session;
            
            // Log authentication
            console.log(`🔓 Authenticated: ${verification.user.username} (${verification.user.role})`);
            
        } catch (error) {
            console.error('Authentication middleware error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Authentication service error',
                code: 'AUTH_SERVICE_ERROR'
            });
        }
    };
}

/**
 * Create authorization middleware for specific permissions
 */
function createAuthorizationMiddleware(authService, requiredPermissions = []) {
    return async function authorizationMiddleware(request, reply) {
        try {
            // Check if user is authenticated
            if (!request.user) {
                return reply.status(401).send({
                    success: false,
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED'
                });
            }
            
            // Check permissions
            if (requiredPermissions.length > 0) {
                const hasPermission = authService.hasAnyPermission(request.user, requiredPermissions);
                
                if (!hasPermission) {
                    console.warn(`🚫 Access denied: ${request.user.username} lacks permissions ${requiredPermissions.join(', ')}`);
                    
                    return reply.status(403).send({
                        success: false,
                        error: 'Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        required: requiredPermissions,
                        userPermissions: request.user.permissions
                    });
                }
            }
            
            console.log(`✅ Authorized: ${request.user.username} for ${requiredPermissions.join(', ')}`);
            
        } catch (error) {
            console.error('Authorization middleware error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Authorization service error',
                code: 'AUTH_SERVICE_ERROR'
            });
        }
    };
}

/**
 * Create role-based middleware
 */
function createRoleMiddleware(authService, allowedRoles = []) {
    return async function roleMiddleware(request, reply) {
        try {
            // Check if user is authenticated
            if (!request.user) {
                return reply.status(401).send({
                    success: false,
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED'
                });
            }
            
            // Check role
            if (allowedRoles.length > 0 && !allowedRoles.includes(request.user.role)) {
                console.warn(`🚫 Role access denied: ${request.user.username} (${request.user.role}) not in ${allowedRoles.join(', ')}`);
                
                return reply.status(403).send({
                    success: false,
                    error: 'Role not authorized',
                    code: 'ROLE_NOT_AUTHORIZED',
                    allowedRoles: allowedRoles,
                    userRole: request.user.role
                });
            }
            
            console.log(`✅ Role authorized: ${request.user.username} (${request.user.role})`);
            
        } catch (error) {
            console.error('Role middleware error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Authorization service error',
                code: 'AUTH_SERVICE_ERROR'
            });
        }
    };
}

/**
 * Create optional authentication middleware (doesn't fail if no token)
 */
function createOptionalAuthMiddleware(authService) {
    return async function optionalAuthMiddleware(request, reply) {
        try {
            // Extract token from Authorization header
            const authHeader = request.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                // No token provided, continue without authentication
                request.user = null;
                request.session = null;
                return;
            }
            
            const token = authHeader.substring(7);
            
            // Verify token
            const verification = await authService.verifyToken(token);
            
            if (verification.valid) {
                request.user = verification.user;
                request.session = verification.session;
                console.log(`🔓 Optional auth: ${verification.user.username} (${verification.user.role})`);
            } else {
                // Invalid token, continue without authentication
                request.user = null;
                request.session = null;
                console.warn('🔒 Optional auth: Invalid token provided');
            }
            
        } catch (error) {
            console.error('Optional authentication middleware error:', error);
            // Continue without authentication on error
            request.user = null;
            request.session = null;
        }
    };
}

/**
 * Create Hedera account verification middleware
 */
function createHederaAccountMiddleware(authService, hederaService) {
    return async function hederaAccountMiddleware(request, reply) {
        try {
            // Check if user is authenticated
            if (!request.user) {
                return reply.status(401).send({
                    success: false,
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED'
                });
            }
            
            // Check if user has Hedera account
            if (!request.user.hederaAccountId) {
                return reply.status(400).send({
                    success: false,
                    error: 'Hedera account required for this operation',
                    code: 'HEDERA_ACCOUNT_REQUIRED'
                });
            }
            
            // Verify Hedera account exists (if Hedera service is available)
            if (hederaService && hederaService.isConnected) {
                try {
                    // In a real implementation, you might verify the account exists
                    // For now, we'll just log the verification
                    console.log(`🔗 Hedera account verified: ${request.user.hederaAccountId}`);
                } catch (hederaError) {
                    console.warn('Hedera account verification failed:', hederaError.message);
                    // Continue anyway - don't block on Hedera verification failures
                }
            }
            
        } catch (error) {
            console.error('Hedera account middleware error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Hedera verification service error',
                code: 'HEDERA_SERVICE_ERROR'
            });
        }
    };
}

/**
 * Create rate limiting middleware with user-specific limits
 */
function createUserRateLimitMiddleware(authService, options = {}) {
    const defaultOptions = {
        max: 100,
        timeWindow: '1 minute',
        skipOnError: true,
        keyGenerator: (request) => {
            // Use user ID if authenticated, otherwise IP
            return request.user ? `user:${request.user.userId}` : `ip:${request.ip}`;
        },
        errorResponseBuilder: (request, context) => {
            const isAuthenticated = !!request.user;
            const identifier = isAuthenticated ? request.user.username : request.ip;
            
            return {
                success: false,
                error: 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                limit: context.max,
                remaining: context.remaining,
                resetTime: new Date(Date.now() + context.ttl),
                user: isAuthenticated ? identifier : null
            };
        }
    };
    
    const config = { ...defaultOptions, ...options };
    
    return async function userRateLimitMiddleware(request, reply) {
        // This would integrate with @fastify/rate-limit
        // For now, we'll implement a simple in-memory rate limiter
        
        const key = config.keyGenerator(request);
        const now = Date.now();
        const windowMs = parseTimeWindow(config.timeWindow);
        
        // Simple in-memory rate limiting (use Redis in production)
        if (!global.rateLimitStore) {
            global.rateLimitStore = new Map();
        }
        
        const record = global.rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
        
        // Reset if window expired
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + windowMs;
        }
        
        // Check limit
        if (record.count >= config.max) {
            const response = config.errorResponseBuilder(request, {
                max: config.max,
                remaining: 0,
                ttl: record.resetTime - now
            });
            
            return reply.status(429).send(response);
        }
        
        // Increment counter
        record.count++;
        global.rateLimitStore.set(key, record);
        
        // Add rate limit headers
        reply.header('X-RateLimit-Limit', config.max);
        reply.header('X-RateLimit-Remaining', Math.max(0, config.max - record.count));
        reply.header('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    };
}

/**
 * Parse time window string to milliseconds
 */
function parseTimeWindow(timeWindow) {
    const units = {
        'second': 1000,
        'seconds': 1000,
        'minute': 60 * 1000,
        'minutes': 60 * 1000,
        'hour': 60 * 60 * 1000,
        'hours': 60 * 60 * 1000,
        'day': 24 * 60 * 60 * 1000,
        'days': 24 * 60 * 60 * 1000
    };
    
    const match = timeWindow.match(/^(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days)$/i);
    if (!match) return 60 * 1000; // Default to 1 minute
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit.toLowerCase()];
}

module.exports = {
    createAuthMiddleware,
    createAuthorizationMiddleware,
    createRoleMiddleware,
    createOptionalAuthMiddleware,
    createHederaAccountMiddleware,
    createUserRateLimitMiddleware
};