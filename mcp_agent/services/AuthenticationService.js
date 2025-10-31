/**
 * @fileoverview Enhanced Authentication Service with Hedera Integration
 * @description JWT-based authentication with role-based access control and Hedera account verification
 * @author AION Team
 * @version 2.0.0
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Enhanced Authentication Service
 */
class AuthenticationService extends EventEmitter {
    constructor(hederaService = null) {
        super();
        
        this.hederaService = hederaService;
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            jwtSecret: process.env.JWT_SECRET || this.generateSecretKey(),
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
            refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
            bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
            maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
            lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000 // 15 minutes
        };
        
        // In-memory storage (in production, use Redis or database)
        this.users = new Map();
        this.sessions = new Map();
        this.refreshTokens = new Map();
        this.loginAttempts = new Map();
        this.lockedAccounts = new Map();
        
        // Metrics
        this.metrics = {
            totalUsers: 0,
            activeSessions: 0,
            loginAttempts: 0,
            successfulLogins: 0,
            failedLogins: 0,
            lockedAccounts: 0,
            startTime: Date.now()
        };
        
        // User roles and permissions
        this.roles = {
            'admin': {
                permissions: ['*'], // All permissions
                description: 'Full system access'
            },
            'vault_manager': {
                permissions: [
                    'vault:read', 'vault:write', 'vault:deposit', 'vault:withdraw',
                    'execute:strategy', 'hedera:read', 'hedera:write'
                ],
                description: 'Vault operations and strategy execution'
            },
            'trader': {
                permissions: [
                    'vault:read', 'vault:deposit', 'vault:withdraw',
                    'execute:read', 'hedera:read'
                ],
                description: 'Basic trading operations'
            },
            'viewer': {
                permissions: [
                    'vault:read', 'execute:read', 'hedera:read', 'monitoring:read'
                ],
                description: 'Read-only access'
            },
            'api_user': {
                permissions: [
                    'vault:read', 'vault:write', 'execute:strategy', 'hedera:read'
                ],
                description: 'API access for external integrations'
            }
        };
    }

    /**
     * Initialize the authentication service
     */
    async initialize() {
        try {
            console.log('🔐 Initializing Authentication Service...');
            
            // Create default admin user if none exists
            await this.createDefaultUsers();
            
            // Start cleanup intervals
            this.startCleanupIntervals();
            
            this.isInitialized = true;
            console.log('✅ Authentication Service initialized successfully');
            
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Authentication Service initialization failed:', error);
            throw error;
        }
    }

    /**
     * Generate a secure secret key
     */
    generateSecretKey() {
        return crypto.randomBytes(64).toString('hex');
    }

    /**
     * Create default users for initial setup
     */
    async createDefaultUsers() {
        // Create default admin user
        const adminExists = Array.from(this.users.values()).some(user => user.role === 'admin');
        
        if (!adminExists) {
            await this.createUser({
                username: 'admin',
                email: 'admin@aion-ai.com',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'AIONAdmin2024!',
                role: 'admin',
                hederaAccountId: process.env.HEDERA_OPERATOR_ID,
                isActive: true,
                isVerified: true
            });
            
            console.log('🔑 Default admin user created');
        }

        // Create API user for external integrations
        const apiUserExists = Array.from(this.users.values()).some(user => user.username === 'api_user');
        
        if (!apiUserExists) {
            await this.createUser({
                username: 'api_user',
                email: 'api@aion-ai.com',
                password: process.env.API_USER_PASSWORD || 'AIONApi2024!',
                role: 'api_user',
                isActive: true,
                isVerified: true
            });
            
            console.log('🔑 Default API user created');
        }
    }

    /**
     * Create a new user
     */
    async createUser(userData) {
        const { username, email, password, role = 'viewer', hederaAccountId, isActive = true, isVerified = false } = userData;
        
        // Validate input
        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required');
        }
        
        if (!this.roles[role]) {
            throw new Error(`Invalid role: ${role}`);
        }
        
        // Check if user already exists
        const existingUser = Array.from(this.users.values()).find(
            user => user.username === username || user.email === email
        );
        
        if (existingUser) {
            throw new Error('User already exists');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, this.config.bcryptRounds);
        
        // Create user object
        const userId = crypto.randomUUID();
        const user = {
            id: userId,
            username,
            email,
            password: hashedPassword,
            role,
            permissions: this.roles[role].permissions,
            hederaAccountId,
            isActive,
            isVerified,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            loginCount: 0,
            metadata: {
                ipAddresses: [],
                userAgents: [],
                lastPasswordChange: new Date().toISOString()
            }
        };
        
        this.users.set(userId, user);
        this.metrics.totalUsers++;
        
        console.log(`👤 User created: ${username} (${role})`);
        this.emit('userCreated', { userId, username, role });
        
        return { userId, username, email, role };
    }

    /**
     * Authenticate user with username/password
     */
    async authenticateUser(username, password, ipAddress = null, userAgent = null) {
        try {
            this.metrics.loginAttempts++;
            
            // Find user
            const user = Array.from(this.users.values()).find(u => u.username === username || u.email === username);
            
            if (!user) {
                this.metrics.failedLogins++;
                throw new Error('Invalid credentials');
            }
            
            // Check if account is locked
            if (this.isAccountLocked(user.id)) {
                throw new Error('Account is temporarily locked due to too many failed attempts');
            }
            
            // Check if user is active
            if (!user.isActive) {
                throw new Error('Account is disabled');
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                this.recordFailedLogin(user.id);
                this.metrics.failedLogins++;
                throw new Error('Invalid credentials');
            }
            
            // Clear failed login attempts
            this.loginAttempts.delete(user.id);
            
            // Update user login info
            user.lastLogin = new Date().toISOString();
            user.loginCount++;
            
            if (ipAddress && !user.metadata.ipAddresses.includes(ipAddress)) {
                user.metadata.ipAddresses.push(ipAddress);
            }
            
            if (userAgent && !user.metadata.userAgents.includes(userAgent)) {
                user.metadata.userAgents.push(userAgent);
            }
            
            this.metrics.successfulLogins++;
            
            console.log(`🔓 User authenticated: ${user.username}`);
            this.emit('userAuthenticated', { userId: user.id, username: user.username, ipAddress });
            
            return user;
            
        } catch (error) {
            console.error('Authentication failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate JWT tokens for authenticated user
     */
    async generateTokens(user, sessionData = {}) {
        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            hederaAccountId: user.hederaAccountId,
            sessionId: crypto.randomUUID()
        };
        
        // Generate access token
        const accessToken = jwt.sign(payload, this.config.jwtSecret, {
            expiresIn: this.config.jwtExpiresIn,
            issuer: 'aion-ai-agent',
            audience: 'aion-api'
        });
        
        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        
        // Store session
        const session = {
            sessionId: payload.sessionId,
            userId: user.id,
            refreshToken,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.parseTimeToMs(this.config.refreshTokenExpiresIn)).toISOString(),
            ipAddress: sessionData.ipAddress,
            userAgent: sessionData.userAgent,
            isActive: true
        };
        
        this.sessions.set(payload.sessionId, session);
        this.refreshTokens.set(refreshToken, payload.sessionId);
        this.metrics.activeSessions++;
        
        return {
            accessToken,
            refreshToken,
            expiresIn: this.config.jwtExpiresIn,
            tokenType: 'Bearer',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                hederaAccountId: user.hederaAccountId
            }
        };
    }

    /**
     * Verify JWT token
     */
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.config.jwtSecret);
            
            // Check if session is still active
            const session = this.sessions.get(decoded.sessionId);
            if (!session || !session.isActive) {
                throw new Error('Session expired or invalid');
            }
            
            // Check if user still exists and is active
            const user = this.users.get(decoded.userId);
            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }
            
            return {
                valid: true,
                user: decoded,
                session: session
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        const sessionId = this.refreshTokens.get(refreshToken);
        if (!sessionId) {
            throw new Error('Invalid refresh token');
        }
        
        const session = this.sessions.get(sessionId);
        if (!session || !session.isActive || new Date() > new Date(session.expiresAt)) {
            throw new Error('Refresh token expired');
        }
        
        const user = this.users.get(session.userId);
        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }
        
        // Generate new tokens
        return await this.generateTokens(user, {
            ipAddress: session.ipAddress,
            userAgent: session.userAgent
        });
    }

    /**
     * Check if user has permission
     */
    hasPermission(user, permission) {
        if (!user || !user.permissions) {
            return false;
        }
        
        // Admin has all permissions
        if (user.permissions.includes('*')) {
            return true;
        }
        
        // Check specific permission
        return user.permissions.includes(permission);
    }

    /**
     * Check if user has any of the specified permissions
     */
    hasAnyPermission(user, permissions) {
        return permissions.some(permission => this.hasPermission(user, permission));
    }

    /**
     * Logout user (invalidate session)
     */
    async logout(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isActive = false;
            this.refreshTokens.delete(session.refreshToken);
            this.metrics.activeSessions--;
            
            console.log(`🔒 User logged out: session ${sessionId}`);
            this.emit('userLoggedOut', { sessionId, userId: session.userId });
        }
    }

    /**
     * Record failed login attempt
     */
    recordFailedLogin(userId) {
        const attempts = this.loginAttempts.get(userId) || { count: 0, lastAttempt: null };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        
        this.loginAttempts.set(userId, attempts);
        
        if (attempts.count >= this.config.maxLoginAttempts) {
            this.lockedAccounts.set(userId, Date.now() + this.config.lockoutDuration);
            this.metrics.lockedAccounts++;
            
            console.warn(`🔒 Account locked due to failed attempts: ${userId}`);
            this.emit('accountLocked', { userId, attempts: attempts.count });
        }
    }

    /**
     * Check if account is locked
     */
    isAccountLocked(userId) {
        const lockTime = this.lockedAccounts.get(userId);
        if (!lockTime) return false;
        
        if (Date.now() > lockTime) {
            this.lockedAccounts.delete(userId);
            this.loginAttempts.delete(userId);
            return false;
        }
        
        return true;
    }

    /**
     * Parse time string to milliseconds
     */
    parseTimeToMs(timeString) {
        const units = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };
        
        const match = timeString.match(/^(\d+)([smhd])$/);
        if (!match) return 24 * 60 * 60 * 1000; // Default to 24 hours
        
        const [, value, unit] = match;
        return parseInt(value) * units[unit];
    }

    /**
     * Start cleanup intervals
     */
    startCleanupIntervals() {
        // Clean expired sessions every hour
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
        
        // Clean expired lockouts every 15 minutes
        setInterval(() => {
            this.cleanupExpiredLockouts();
        }, 15 * 60 * 1000);
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = new Date();
        let cleanedCount = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (new Date(session.expiresAt) < now) {
                this.sessions.delete(sessionId);
                this.refreshTokens.delete(session.refreshToken);
                this.metrics.activeSessions--;
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
        }
    }

    /**
     * Clean up expired account lockouts
     */
    cleanupExpiredLockouts() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [userId, lockTime] of this.lockedAccounts.entries()) {
            if (now > lockTime) {
                this.lockedAccounts.delete(userId);
                this.loginAttempts.delete(userId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Unlocked ${cleanedCount} expired account lockouts`);
        }
    }

    /**
     * Get service metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            users: {
                total: this.users.size,
                active: Array.from(this.users.values()).filter(u => u.isActive).length,
                verified: Array.from(this.users.values()).filter(u => u.isVerified).length
            },
            sessions: {
                active: this.sessions.size,
                total: this.metrics.activeSessions
            },
            security: {
                lockedAccounts: this.lockedAccounts.size,
                failedLoginRate: this.metrics.loginAttempts > 0 ? 
                    (this.metrics.failedLogins / this.metrics.loginAttempts) : 0
            }
        };
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isHealthy: this.isInitialized,
            metrics: this.getMetrics(),
            config: {
                jwtExpiresIn: this.config.jwtExpiresIn,
                maxLoginAttempts: this.config.maxLoginAttempts,
                lockoutDuration: this.config.lockoutDuration
            }
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Authentication Service...');
        
        // Clear all intervals and timeouts
        // Note: In a real implementation, you'd track these
        
        this.isInitialized = false;
        console.log('✅ Authentication Service cleanup completed');
    }
}

export default AuthenticationService;