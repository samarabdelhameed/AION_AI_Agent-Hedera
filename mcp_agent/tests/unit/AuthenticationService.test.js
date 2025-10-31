/**
 * @fileoverview Unit Tests for Authentication Service
 * @description Jest unit tests for the AuthenticationService class
 * @author AION Team
 * @version 2.0.0
 */

const AuthenticationService = require('../../services/AuthenticationService');
const bcrypt = require('bcryptjs');

// Mock bcrypt for consistent testing
jest.mock('bcryptjs');

describe('AuthenticationService', () => {
    let authService;
    let mockHederaService;

    beforeEach(() => {
        // Mock Hedera service
        mockHederaService = {
            isConnected: true,
            config: {
                network: 'testnet',
                operatorId: '0.0.123456'
            }
        };

        // Create fresh instance for each test
        authService = new AuthenticationService(mockHederaService);
        
        // Mock bcrypt functions
        bcrypt.hash.mockResolvedValue('hashed_password');
        bcrypt.compare.mockImplementation((password, hash) => {
            return Promise.resolve(password === 'correct_password');
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await authService.initialize();
            
            expect(authService.isInitialized).toBe(true);
            expect(authService.users.size).toBeGreaterThan(0); // Default users created
        });

        test('should create default admin user', async () => {
            await authService.initialize();
            
            const adminUser = Array.from(authService.users.values())
                .find(user => user.role === 'admin');
            
            expect(adminUser).toBeDefined();
            expect(adminUser.username).toBe('admin');
            expect(adminUser.isActive).toBe(true);
        });

        test('should create default API user', async () => {
            await authService.initialize();
            
            const apiUser = Array.from(authService.users.values())
                .find(user => user.username === 'api_user');
            
            expect(apiUser).toBeDefined();
            expect(apiUser.role).toBe('api_user');
        });
    });

    describe('User Management', () => {
        beforeEach(async () => {
            await authService.initialize();
        });

        test('should create new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'trader'
            };

            const result = await authService.createUser(userData);

            expect(result).toHaveProperty('userId');
            expect(result.username).toBe('testuser');
            expect(result.role).toBe('trader');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
        });

        test('should reject duplicate username', async () => {
            const userData = {
                username: 'admin', // Already exists
                email: 'test@example.com',
                password: 'password123',
                role: 'trader'
            };

            await expect(authService.createUser(userData))
                .rejects.toThrow('User already exists');
        });

        test('should reject invalid role', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'invalid_role'
            };

            await expect(authService.createUser(userData))
                .rejects.toThrow('Invalid role: invalid_role');
        });

        test('should require username, email, and password', async () => {
            const userData = {
                username: 'testuser'
                // Missing email and password
            };

            await expect(authService.createUser(userData))
                .rejects.toThrow('Username, email, and password are required');
        });
    });

    describe('Authentication', () => {
        beforeEach(async () => {
            await authService.initialize();
            
            // Create test user
            await authService.createUser({
                username: 'testuser',
                email: 'test@example.com',
                password: 'correct_password',
                role: 'trader'
            });
        });

        test('should authenticate user with correct credentials', async () => {
            const user = await authService.authenticateUser('testuser', 'correct_password');

            expect(user).toBeDefined();
            expect(user.username).toBe('testuser');
            expect(user.role).toBe('trader');
        });

        test('should reject authentication with wrong password', async () => {
            await expect(authService.authenticateUser('testuser', 'wrong_password'))
                .rejects.toThrow('Invalid credentials');
        });

        test('should reject authentication for non-existent user', async () => {
            await expect(authService.authenticateUser('nonexistent', 'password'))
                .rejects.toThrow('Invalid credentials');
        });

        test('should track login attempts and metadata', async () => {
            const ipAddress = '192.168.1.1';
            const userAgent = 'Test Agent';

            const user = await authService.authenticateUser(
                'testuser', 
                'correct_password', 
                ipAddress, 
                userAgent
            );

            expect(user.loginCount).toBe(1);
            expect(user.metadata.ipAddresses).toContain(ipAddress);
            expect(user.metadata.userAgents).toContain(userAgent);
        });
    });

    describe('Token Management', () => {
        let testUser;

        beforeEach(async () => {
            await authService.initialize();
            
            testUser = await authService.createUser({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'trader'
            });
        });

        test('should generate valid tokens', async () => {
            const user = authService.users.get(testUser.userId);
            const tokens = await authService.generateTokens(user);

            expect(tokens).toHaveProperty('accessToken');
            expect(tokens).toHaveProperty('refreshToken');
            expect(tokens).toHaveProperty('expiresIn');
            expect(tokens).toHaveProperty('tokenType', 'Bearer');
            expect(tokens).toHaveProperty('user');
            
            // Verify token structure
            const tokenParts = tokens.accessToken.split('.');
            expect(tokenParts).toHaveLength(3); // JWT has 3 parts
        });

        test('should verify valid tokens', async () => {
            const user = authService.users.get(testUser.userId);
            const tokens = await authService.generateTokens(user);

            const verification = await authService.verifyToken(tokens.accessToken);

            expect(verification.valid).toBe(true);
            expect(verification.user.userId).toBe(testUser.userId);
            expect(verification.user.username).toBe('testuser');
        });

        test('should reject invalid tokens', async () => {
            const verification = await authService.verifyToken('invalid.token.here');

            expect(verification.valid).toBe(false);
            expect(verification.error).toBeDefined();
        });

        test('should refresh tokens successfully', async () => {
            const user = authService.users.get(testUser.userId);
            const tokens = await authService.generateTokens(user);

            const newTokens = await authService.refreshAccessToken(tokens.refreshToken);

            expect(newTokens).toHaveProperty('accessToken');
            expect(newTokens).toHaveProperty('refreshToken');
            expect(newTokens.accessToken).not.toBe(tokens.accessToken);
        });

        test('should reject invalid refresh tokens', async () => {
            await expect(authService.refreshAccessToken('invalid_refresh_token'))
                .rejects.toThrow('Invalid refresh token');
        });
    });

    describe('Permission System', () => {
        beforeEach(async () => {
            await authService.initialize();
        });

        test('should check permissions correctly', () => {
            const adminUser = { permissions: ['*'] };
            const traderUser = { permissions: ['vault:read', 'vault:deposit'] };

            // Admin should have all permissions
            expect(authService.hasPermission(adminUser, 'any:permission')).toBe(true);
            
            // Trader should have specific permissions
            expect(authService.hasPermission(traderUser, 'vault:read')).toBe(true);
            expect(authService.hasPermission(traderUser, 'vault:deposit')).toBe(true);
            expect(authService.hasPermission(traderUser, 'admin:users')).toBe(false);
        });

        test('should check multiple permissions', () => {
            const traderUser = { permissions: ['vault:read', 'vault:deposit'] };

            expect(authService.hasAnyPermission(traderUser, ['vault:read', 'admin:users']))
                .toBe(true);
            expect(authService.hasAnyPermission(traderUser, ['admin:users', 'admin:sessions']))
                .toBe(false);
        });

        test('should handle users without permissions', () => {
            const userWithoutPerms = {};

            expect(authService.hasPermission(userWithoutPerms, 'any:permission')).toBe(false);
            expect(authService.hasAnyPermission(userWithoutPerms, ['any:permission'])).toBe(false);
        });
    });

    describe('Account Security', () => {
        beforeEach(async () => {
            await authService.initialize();
            
            await authService.createUser({
                username: 'testuser',
                email: 'test@example.com',
                password: 'correct_password',
                role: 'trader'
            });
        });

        test('should track failed login attempts', async () => {
            const userId = Array.from(authService.users.values())
                .find(user => user.username === 'testuser').id;

            // Simulate failed login attempts
            for (let i = 0; i < 3; i++) {
                try {
                    await authService.authenticateUser('testuser', 'wrong_password');
                } catch (error) {
                    // Expected to fail
                }
            }

            const attempts = authService.loginAttempts.get(userId);
            expect(attempts.count).toBe(3);
        });

        test('should lock account after max failed attempts', async () => {
            const userId = Array.from(authService.users.values())
                .find(user => user.username === 'testuser').id;

            // Exceed max login attempts
            for (let i = 0; i < authService.config.maxLoginAttempts; i++) {
                try {
                    await authService.authenticateUser('testuser', 'wrong_password');
                } catch (error) {
                    // Expected to fail
                }
            }

            expect(authService.isAccountLocked(userId)).toBe(true);
        });

        test('should reject login for locked account', async () => {
            const userId = Array.from(authService.users.values())
                .find(user => user.username === 'testuser').id;

            // Lock the account
            authService.lockedAccounts.set(userId, Date.now() + 60000); // Lock for 1 minute

            await expect(authService.authenticateUser('testuser', 'correct_password'))
                .rejects.toThrow('Account is temporarily locked');
        });
    });

    describe('Session Management', () => {
        let testUser;

        beforeEach(async () => {
            await authService.initialize();
            
            testUser = await authService.createUser({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'trader'
            });
        });

        test('should create and track sessions', async () => {
            const user = authService.users.get(testUser.userId);
            const tokens = await authService.generateTokens(user);

            // Verify session was created
            const sessions = Array.from(authService.sessions.values());
            const userSession = sessions.find(s => s.userId === testUser.userId);

            expect(userSession).toBeDefined();
            expect(userSession.isActive).toBe(true);
        });

        test('should logout and invalidate session', async () => {
            const user = authService.users.get(testUser.userId);
            const tokens = await authService.generateTokens(user);

            // Get session ID from token verification
            const verification = await authService.verifyToken(tokens.accessToken);
            const sessionId = verification.session.sessionId;

            // Logout
            await authService.logout(sessionId);

            // Verify session is inactive
            const session = authService.sessions.get(sessionId);
            expect(session.isActive).toBe(false);
        });
    });

    describe('Metrics and Status', () => {
        beforeEach(async () => {
            await authService.initialize();
        });

        test('should provide service metrics', () => {
            const metrics = authService.getMetrics();

            expect(metrics).toHaveProperty('totalUsers');
            expect(metrics).toHaveProperty('activeSessions');
            expect(metrics).toHaveProperty('loginAttempts');
            expect(metrics).toHaveProperty('successfulLogins');
            expect(metrics).toHaveProperty('failedLogins');
            expect(metrics).toHaveProperty('uptime');
            expect(metrics).toHaveProperty('users');
            expect(metrics).toHaveProperty('sessions');
            expect(metrics).toHaveProperty('security');
        });

        test('should provide service status', () => {
            const status = authService.getStatus();

            expect(status).toHaveProperty('isInitialized', true);
            expect(status).toHaveProperty('isHealthy', true);
            expect(status).toHaveProperty('metrics');
            expect(status).toHaveProperty('config');
        });
    });

    describe('Cleanup', () => {
        beforeEach(async () => {
            await authService.initialize();
        });

        test('should cleanup expired sessions', () => {
            // Create expired session
            const expiredSession = {
                sessionId: 'expired_session',
                userId: 'test_user',
                refreshToken: 'expired_refresh',
                expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
                isActive: true
            };

            authService.sessions.set('expired_session', expiredSession);
            authService.refreshTokens.set('expired_refresh', 'expired_session');

            // Run cleanup
            authService.cleanupExpiredSessions();

            // Verify cleanup
            expect(authService.sessions.has('expired_session')).toBe(false);
            expect(authService.refreshTokens.has('expired_refresh')).toBe(false);
        });

        test('should cleanup expired lockouts', () => {
            const userId = 'test_user';
            const expiredLockTime = Date.now() - 1000; // Expired 1 second ago

            authService.lockedAccounts.set(userId, expiredLockTime);
            authService.loginAttempts.set(userId, { count: 5, lastAttempt: Date.now() });

            // Run cleanup
            authService.cleanupExpiredLockouts();

            // Verify cleanup
            expect(authService.lockedAccounts.has(userId)).toBe(false);
            expect(authService.loginAttempts.has(userId)).toBe(false);
        });
    });
});