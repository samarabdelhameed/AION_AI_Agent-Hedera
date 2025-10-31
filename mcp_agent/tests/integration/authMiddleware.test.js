/**
 * @fileoverview Integration Tests for Authentication Middleware
 * @description Jest integration tests for authentication and authorization middleware
 * @author AION Team
 * @version 2.0.0
 */

const fastify = require('fastify');
const {
    createAuthMiddleware,
    createAuthorizationMiddleware,
    createRoleMiddleware,
    createOptionalAuthMiddleware,
    createHederaAccountMiddleware
} = require('../../middleware/authMiddleware');
const AuthenticationService = require('../../services/AuthenticationService');

describe('Authentication Middleware Integration', () => {
    let app;
    let authService;
    let testUser;
    let testToken;

    beforeAll(async () => {
        // Initialize authentication service
        authService = new AuthenticationService();
        await authService.initialize();

        // Create test user
        testUser = await authService.createUser({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'trader',
            hederaAccountId: '0.0.123456'
        });

        // Generate test token
        const user = authService.users.get(testUser.userId);
        const tokens = await authService.generateTokens(user);
        testToken = tokens.accessToken;
    });

    beforeEach(async () => {
        // Create fresh Fastify instance for each test
        app = fastify({ logger: false });
    });

    afterEach(async () => {
        await app.close();
    });

    describe('createAuthMiddleware', () => {
        test('should allow access with valid token', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            
            app.addHook('preHandler', authMiddleware);
            app.get('/protected', async (request, reply) => {
                return { message: 'Access granted', user: request.user.username };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/protected',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Access granted');
            expect(data.user).toBe('testuser');
        });

        test('should reject access without token', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            
            app.addHook('preHandler', authMiddleware);
            app.get('/protected', async (request, reply) => {
                return { message: 'Access granted' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/protected'
            });

            expect(response.statusCode).toBe(401);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('MISSING_TOKEN');
        });

        test('should reject access with invalid token', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            
            app.addHook('preHandler', authMiddleware);
            app.get('/protected', async (request, reply) => {
                return { message: 'Access granted' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/protected',
                headers: {
                    authorization: 'Bearer invalid_token'
                }
            });

            expect(response.statusCode).toBe(401);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('INVALID_TOKEN');
        });

        test('should reject access with malformed authorization header', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            
            app.addHook('preHandler', authMiddleware);
            app.get('/protected', async (request, reply) => {
                return { message: 'Access granted' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/protected',
                headers: {
                    authorization: 'InvalidFormat token'
                }
            });

            expect(response.statusCode).toBe(401);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('MISSING_TOKEN');
        });
    });

    describe('createAuthorizationMiddleware', () => {
        test('should allow access with correct permissions', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            const authzMiddleware = createAuthorizationMiddleware(authService, ['vault:read']);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', authzMiddleware);
            app.get('/vault-data', async (request, reply) => {
                return { message: 'Vault data accessed' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/vault-data',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Vault data accessed');
        });

        test('should deny access without required permissions', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            const authzMiddleware = createAuthorizationMiddleware(authService, ['admin:users']);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', authzMiddleware);
            app.get('/admin-only', async (request, reply) => {
                return { message: 'Admin data' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/admin-only',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(403);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('INSUFFICIENT_PERMISSIONS');
        });

        test('should allow access with wildcard permissions', async () => {
            // Create admin user with wildcard permissions
            const adminUser = await authService.createUser({
                username: 'admin_test',
                email: 'admin@example.com',
                password: 'password123',
                role: 'admin'
            });

            const admin = authService.users.get(adminUser.userId);
            const adminTokens = await authService.generateTokens(admin);

            const authMiddleware = createAuthMiddleware(authService);
            const authzMiddleware = createAuthorizationMiddleware(authService, ['admin:users']);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', authzMiddleware);
            app.get('/admin-only', async (request, reply) => {
                return { message: 'Admin data' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/admin-only',
                headers: {
                    authorization: `Bearer ${adminTokens.accessToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Admin data');
        });
    });

    describe('createRoleMiddleware', () => {
        test('should allow access with correct role', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            const roleMiddleware = createRoleMiddleware(authService, ['trader', 'admin']);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', roleMiddleware);
            app.get('/trader-area', async (request, reply) => {
                return { message: 'Trader area accessed' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/trader-area',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Trader area accessed');
        });

        test('should deny access with incorrect role', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            const roleMiddleware = createRoleMiddleware(authService, ['admin']);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', roleMiddleware);
            app.get('/admin-area', async (request, reply) => {
                return { message: 'Admin area' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/admin-area',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(403);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('ROLE_NOT_AUTHORIZED');
        });
    });

    describe('createOptionalAuthMiddleware', () => {
        test('should allow access without token', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware(authService);
            
            app.addHook('preHandler', optionalAuthMiddleware);
            app.get('/public', async (request, reply) => {
                return { 
                    message: 'Public access',
                    authenticated: !!request.user,
                    user: request.user?.username || null
                };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/public'
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Public access');
            expect(data.authenticated).toBe(false);
            expect(data.user).toBe(null);
        });

        test('should enhance access with valid token', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware(authService);
            
            app.addHook('preHandler', optionalAuthMiddleware);
            app.get('/public', async (request, reply) => {
                return { 
                    message: 'Public access',
                    authenticated: !!request.user,
                    user: request.user?.username || null
                };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/public',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Public access');
            expect(data.authenticated).toBe(true);
            expect(data.user).toBe('testuser');
        });

        test('should continue without authentication on invalid token', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware(authService);
            
            app.addHook('preHandler', optionalAuthMiddleware);
            app.get('/public', async (request, reply) => {
                return { 
                    message: 'Public access',
                    authenticated: !!request.user,
                    user: request.user?.username || null
                };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/public',
                headers: {
                    authorization: 'Bearer invalid_token'
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Public access');
            expect(data.authenticated).toBe(false);
            expect(data.user).toBe(null);
        });
    });

    describe('createHederaAccountMiddleware', () => {
        test('should allow access with Hedera account', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            const hederaMiddleware = createHederaAccountMiddleware(authService, null);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', hederaMiddleware);
            app.get('/hedera-operation', async (request, reply) => {
                return { 
                    message: 'Hedera operation allowed',
                    hederaAccount: request.user.hederaAccountId
                };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/hedera-operation',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Hedera operation allowed');
            expect(data.hederaAccount).toBe('0.0.123456');
        });

        test('should deny access without Hedera account', async () => {
            // Create user without Hedera account
            const noHederaUser = await authService.createUser({
                username: 'no_hedera_user',
                email: 'nohedera@example.com',
                password: 'password123',
                role: 'trader'
                // No hederaAccountId
            });

            const user = authService.users.get(noHederaUser.userId);
            const tokens = await authService.generateTokens(user);

            const authMiddleware = createAuthMiddleware(authService);
            const hederaMiddleware = createHederaAccountMiddleware(authService, null);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', hederaMiddleware);
            app.get('/hedera-operation', async (request, reply) => {
                return { message: 'Hedera operation allowed' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/hedera-operation',
                headers: {
                    authorization: `Bearer ${tokens.accessToken}`
                }
            });

            expect(response.statusCode).toBe(400);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('HEDERA_ACCOUNT_REQUIRED');
        });
    });

    describe('Middleware Chain Integration', () => {
        test('should work with multiple middleware in sequence', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            const authzMiddleware = createAuthorizationMiddleware(authService, ['vault:read']);
            const roleMiddleware = createRoleMiddleware(authService, ['trader', 'admin']);
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', authzMiddleware);
            app.addHook('preHandler', roleMiddleware);
            app.get('/complex-endpoint', async (request, reply) => {
                return { 
                    message: 'Complex endpoint accessed',
                    user: request.user.username,
                    role: request.user.role
                };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/complex-endpoint',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const data = JSON.parse(response.payload);
            expect(data.message).toBe('Complex endpoint accessed');
            expect(data.user).toBe('testuser');
            expect(data.role).toBe('trader');
        });

        test('should fail at first middleware that rejects', async () => {
            const authMiddleware = createAuthMiddleware(authService);
            const authzMiddleware = createAuthorizationMiddleware(authService, ['admin:users']); // Will fail
            const roleMiddleware = createRoleMiddleware(authService, ['trader']); // Would pass
            
            app.addHook('preHandler', authMiddleware);
            app.addHook('preHandler', authzMiddleware);
            app.addHook('preHandler', roleMiddleware);
            app.get('/complex-endpoint', async (request, reply) => {
                return { message: 'Should not reach here' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/complex-endpoint',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(403);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('INSUFFICIENT_PERMISSIONS');
        });
    });

    describe('Error Handling', () => {
        test('should handle authentication service errors gracefully', async () => {
            // Create middleware with null service to trigger error
            const authMiddleware = createAuthMiddleware(null);
            
            app.addHook('preHandler', authMiddleware);
            app.get('/protected', async (request, reply) => {
                return { message: 'Should not reach here' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/protected',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(500);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('AUTH_SERVICE_ERROR');
        });

        test('should handle missing user in authorization middleware', async () => {
            const authzMiddleware = createAuthorizationMiddleware(authService, ['vault:read']);
            
            // Skip auth middleware to test missing user scenario
            app.addHook('preHandler', authzMiddleware);
            app.get('/protected', async (request, reply) => {
                return { message: 'Should not reach here' };
            });

            const response = await app.inject({
                method: 'GET',
                url: '/protected'
            });

            expect(response.statusCode).toBe(401);
            const data = JSON.parse(response.payload);
            expect(data.success).toBe(false);
            expect(data.code).toBe('NOT_AUTHENTICATED');
        });
    });
});