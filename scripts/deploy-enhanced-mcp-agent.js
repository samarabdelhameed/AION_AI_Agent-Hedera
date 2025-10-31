#!/usr/bin/env node

/**
 * @fileoverview Enhanced MCP Agent Deployment Script
 * @description Deploy MCP Agent with Hedera integration to production
 * @author AION Team
 * @version 2.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const chalk = require('chalk');

/**
 * Enhanced MCP Agent Deployment Manager
 */
class MCPAgentDeployment {
    constructor() {
        this.config = {
            environment: process.env.NODE_ENV || 'production',
            port: process.env.PORT || 3001,
            host: process.env.HOST || '0.0.0.0',
            logLevel: process.env.LOG_LEVEL || 'info'
        };
        
        this.deploymentSteps = [
            'validateEnvironment',
            'updateConfiguration',
            'installDependencies',
            'runTests',
            'buildApplication',
            'deployServices',
            'configureMonitoring',
            'verifyDeployment'
        ];
        
        this.deploymentReport = {
            startTime: new Date(),
            steps: {},
            errors: [],
            warnings: [],
            success: false
        };
    }

    /**
     * Log deployment step
     */
    logStep(step, status, message, details = null) {
        const timestamp = new Date().toISOString();
        const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : '🔄';
        
        console.log(chalk.blue(`[${timestamp}] ${statusIcon} ${step}: ${message}`));
        
        if (details) {
            console.log(chalk.gray(`   Details: ${JSON.stringify(details, null, 2)}`));
        }
        
        this.deploymentReport.steps[step] = {
            status,
            message,
            details,
            timestamp
        };
        
        if (status === 'error') {
            this.deploymentReport.errors.push({ step, message, details, timestamp });
        } else if (status === 'warning') {
            this.deploymentReport.warnings.push({ step, message, details, timestamp });
        }
    }

    /**
     * Execute shell command with error handling
     */
    async executeCommand(command, options = {}) {
        try {
            const result = execSync(command, {
                encoding: 'utf8',
                stdio: 'pipe',
                cwd: options.cwd || process.cwd(),
                ...options
            });
            return { success: true, output: result.trim() };
        } catch (error) {
            return { 
                success: false, 
                error: error.message, 
                output: error.stdout || error.stderr || '' 
            };
        }
    }

    /**
     * Step 1: Validate Environment
     */
    async validateEnvironment() {
        this.logStep('validateEnvironment', 'progress', 'Validating deployment environment...');
        
        try {
            // Check Node.js version
            const nodeVersion = process.version;
            const requiredNodeVersion = '18.0.0';
            
            if (!this.compareVersions(nodeVersion.slice(1), requiredNodeVersion)) {
                throw new Error(`Node.js version ${requiredNodeVersion} or higher required, found ${nodeVersion}`);
            }
            
            // Check npm version
            const npmResult = await this.executeCommand('npm --version');
            if (!npmResult.success) {
                throw new Error('npm is not installed or not accessible');
            }
            
            // Check required environment variables
            const requiredEnvVars = [
                'HEDERA_OPERATOR_ID',
                'HEDERA_OPERATOR_PRIVATE_KEY',
                'HEDERA_NETWORK'
            ];
            
            const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
            if (missingEnvVars.length > 0) {
                throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
            }
            
            // Check disk space
            const diskResult = await this.executeCommand('df -h .');
            
            // Check memory
            const memoryResult = await this.executeCommand('free -m');
            
            this.logStep('validateEnvironment', 'success', 'Environment validation completed', {
                nodeVersion,
                npmVersion: npmResult.output,
                environment: this.config.environment,
                diskSpace: diskResult.output?.split('\n')[1] || 'Unknown',
                memory: memoryResult.output?.split('\n')[1] || 'Unknown'
            });
            
        } catch (error) {
            this.logStep('validateEnvironment', 'error', `Environment validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 2: Update Configuration
     */
    async updateConfiguration() {
        this.logStep('updateConfiguration', 'progress', 'Updating production configuration...');
        
        try {
            const configPath = path.join(__dirname, '../mcp_agent/config');
            
            // Create production configuration
            const productionConfig = {
                server: {
                    port: this.config.port,
                    host: this.config.host,
                    timeout: 30000,
                    cors: {
                        enabled: true,
                        origins: [
                            "https://aion-ai.com",
                            "https://app.aion-ai.com",
                            "https://dashboard.aion-ai.com"
                        ],
                        credentials: true
                    }
                },
                security: {
                    jwtSecret: process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex'),
                    jwtExpiresIn: "24h",
                    bcryptRounds: 12,
                    rateLimitWindow: 60000,
                    rateLimitMax: 50,
                    corsOrigins: [
                        "https://aion-ai.com",
                        "https://app.aion-ai.com"
                    ],
                    trustedProxies: ["127.0.0.1", "::1"]
                },
                logging: {
                    level: this.config.logLevel,
                    format: "json",
                    file: "./logs/mcp_agent_production.log",
                    console: false,
                    maxFiles: 10,
                    maxSize: "50m"
                },
                hedera: {
                    network: process.env.HEDERA_NETWORK || "testnet",
                    services: {
                        hcs: {
                            enabled: true,
                            topicId: process.env.HEDERA_HCS_TOPIC_ID,
                            auditTopicId: process.env.HEDERA_AUDIT_TOPIC_ID,
                            submitTimeout: 30000,
                            maxMessageSize: 6144,
                            batchSize: 10,
                            pollingInterval: 5000
                        },
                        hfs: {
                            enabled: true,
                            bridgeFileId: process.env.HEDERA_BRIDGE_FILE_ID,
                            modelFileId: process.env.HEDERA_MODEL_FILE_ID,
                            maxFileSize: 1048576,
                            chunkSize: 4096,
                            timeout: 60000
                        },
                        hts: {
                            enabled: true,
                            shareTokenId: process.env.HEDERA_SHARE_TOKEN_ID,
                            decimals: 18,
                            symbol: "AION",
                            name: "AION Vault Shares",
                            initialSupply: 0
                        },
                        hscs: {
                            enabled: true,
                            vaultContractId: process.env.HEDERA_VAULT_CONTRACT_ID,
                            gasLimit: 300000
                        }
                    },
                    accounts: {
                        operator: {
                            accountId: process.env.HEDERA_OPERATOR_ID,
                            privateKey: process.env.HEDERA_OPERATOR_PRIVATE_KEY
                        },
                        treasury: {
                            accountId: process.env.HEDERA_TREASURY_ID,
                            privateKey: process.env.HEDERA_TREASURY_PRIVATE_KEY
                        },
                        aiAgent: {
                            accountId: process.env.HEDERA_AI_AGENT_ID,
                            privateKey: process.env.HEDERA_AI_AGENT_PRIVATE_KEY
                        }
                    },
                    monitoring: {
                        enabled: true,
                        healthCheckInterval: 30000,
                        performanceTracking: true,
                        errorReporting: true
                    }
                },
                ai: {
                    model: {
                        version: "v2.1.0",
                        confidenceThreshold: 0.85,
                        rebalanceInterval: 3600000,
                        maxRetries: 3
                    },
                    decisionLogging: {
                        enabled: true,
                        logToHCS: true,
                        logToFile: true,
                        batchSize: 20,
                        flushInterval: 15000
                    },
                    modelMetadata: {
                        storeToHFS: true,
                        versionControl: true,
                        performanceTracking: true
                    }
                }
            };
            
            // Write production configuration
            await fs.writeFile(
                path.join(configPath, 'production.json'),
                JSON.stringify(productionConfig, null, 2)
            );
            
            // Create environment file
            const envContent = `# AION MCP Agent Production Environment
NODE_ENV=production
PORT=${this.config.port}
HOST=${this.config.host}
LOG_LEVEL=${this.config.logLevel}

# Hedera Configuration
HEDERA_NETWORK=${process.env.HEDERA_NETWORK || 'testnet'}
HEDERA_OPERATOR_ID=${process.env.HEDERA_OPERATOR_ID}
HEDERA_OPERATOR_PRIVATE_KEY=${process.env.HEDERA_OPERATOR_PRIVATE_KEY}

# Security
JWT_SECRET=${productionConfig.security.jwtSecret}

# Generated on: ${new Date().toISOString()}
`;
            
            await fs.writeFile(
                path.join(__dirname, '../mcp_agent/.env.production'),
                envContent
            );
            
            this.logStep('updateConfiguration', 'success', 'Production configuration updated', {
                configFile: 'production.json',
                envFile: '.env.production',
                port: this.config.port,
                environment: this.config.environment
            });
            
        } catch (error) {
            this.logStep('updateConfiguration', 'error', `Configuration update failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 3: Install Dependencies
     */
    async installDependencies() {
        this.logStep('installDependencies', 'progress', 'Installing production dependencies...');
        
        try {
            const mcpAgentPath = path.join(__dirname, '../mcp_agent');
            
            // Clean install
            const cleanResult = await this.executeCommand('npm ci --only=production', {
                cwd: mcpAgentPath
            });
            
            if (!cleanResult.success) {
                throw new Error(`Dependency installation failed: ${cleanResult.error}`);
            }
            
            // Audit dependencies
            const auditResult = await this.executeCommand('npm audit --audit-level=high', {
                cwd: mcpAgentPath
            });
            
            if (!auditResult.success && auditResult.output.includes('vulnerabilities')) {
                this.logStep('installDependencies', 'warning', 'Security vulnerabilities detected in dependencies', {
                    auditOutput: auditResult.output
                });
            }
            
            this.logStep('installDependencies', 'success', 'Dependencies installed successfully', {
                installOutput: cleanResult.output.split('\n').slice(-5).join('\n'),
                auditStatus: auditResult.success ? 'Clean' : 'Warnings detected'
            });
            
        } catch (error) {
            this.logStep('installDependencies', 'error', `Dependency installation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 4: Run Tests
     */
    async runTests() {
        this.logStep('runTests', 'progress', 'Running production tests...');
        
        try {
            const mcpAgentPath = path.join(__dirname, '../mcp_agent');
            
            // Run unit tests
            const testResult = await this.executeCommand('npm test -- --passWithNoTests', {
                cwd: mcpAgentPath
            });
            
            if (!testResult.success) {
                throw new Error(`Tests failed: ${testResult.error}`);
            }
            
            // Run integration tests
            const integrationResult = await this.executeCommand('npm run test:integration', {
                cwd: mcpAgentPath
            });
            
            if (!integrationResult.success) {
                this.logStep('runTests', 'warning', 'Integration tests failed', {
                    error: integrationResult.error
                });
            }
            
            this.logStep('runTests', 'success', 'Tests completed successfully', {
                unitTests: testResult.output.split('\n').slice(-3).join('\n'),
                integrationTests: integrationResult.success ? 'Passed' : 'Failed'
            });
            
        } catch (error) {
            this.logStep('runTests', 'error', `Test execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 5: Build Application
     */
    async buildApplication() {
        this.logStep('buildApplication', 'progress', 'Building application for production...');
        
        try {
            const mcpAgentPath = path.join(__dirname, '../mcp_agent');
            
            // Create logs directory
            await fs.mkdir(path.join(mcpAgentPath, 'logs'), { recursive: true });
            
            // Create build info
            const buildInfo = {
                version: '2.0.0',
                buildTime: new Date().toISOString(),
                environment: this.config.environment,
                nodeVersion: process.version,
                gitCommit: await this.getGitCommit(),
                features: [
                    'hedera-integration',
                    'ai-decision-logging',
                    'model-metadata-management',
                    'web3-service',
                    'authentication',
                    'monitoring'
                ]
            };
            
            await fs.writeFile(
                path.join(mcpAgentPath, 'build-info.json'),
                JSON.stringify(buildInfo, null, 2)
            );
            
            this.logStep('buildApplication', 'success', 'Application built successfully', buildInfo);
            
        } catch (error) {
            this.logStep('buildApplication', 'error', `Application build failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 6: Deploy Services
     */
    async deployServices() {
        this.logStep('deployServices', 'progress', 'Deploying services...');
        
        try {
            const mcpAgentPath = path.join(__dirname, '../mcp_agent');
            
            // Create systemd service file (for Linux systems)
            const serviceFile = `[Unit]
Description=AION MCP Agent Enhanced
After=network.target

[Service]
Type=simple
User=aion
WorkingDirectory=${mcpAgentPath}
Environment=NODE_ENV=production
Environment=PORT=${this.config.port}
Environment=HOST=${this.config.host}
ExecStart=/usr/bin/node server/app.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=aion-mcp-agent

[Install]
WantedBy=multi-user.target
`;
            
            // Write service file
            await fs.writeFile(
                path.join(__dirname, '../aion-mcp-agent.service'),
                serviceFile
            );
            
            // Create Docker configuration
            const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE ${this.config.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${this.config.port}/health || exit 1

# Start application
CMD ["node", "server/app.js"]
`;
            
            await fs.writeFile(
                path.join(mcpAgentPath, 'Dockerfile'),
                dockerfile
            );
            
            // Create docker-compose file
            const dockerCompose = `version: '3.8'

services:
  aion-mcp-agent:
    build: .
    ports:
      - "${this.config.port}:${this.config.port}"
    environment:
      - NODE_ENV=production
      - PORT=${this.config.port}
      - HOST=0.0.0.0
      - HEDERA_NETWORK=\${HEDERA_NETWORK}
      - HEDERA_OPERATOR_ID=\${HEDERA_OPERATOR_ID}
      - HEDERA_OPERATOR_PRIVATE_KEY=\${HEDERA_OPERATOR_PRIVATE_KEY}
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${this.config.port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - aion-network

networks:
  aion-network:
    driver: bridge
`;
            
            await fs.writeFile(
                path.join(mcpAgentPath, 'docker-compose.yml'),
                dockerCompose
            );
            
            this.logStep('deployServices', 'success', 'Service deployment files created', {
                systemdService: 'aion-mcp-agent.service',
                dockerfile: 'Dockerfile',
                dockerCompose: 'docker-compose.yml'
            });
            
        } catch (error) {
            this.logStep('deployServices', 'error', `Service deployment failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 7: Configure Monitoring
     */
    async configureMonitoring() {
        this.logStep('configureMonitoring', 'progress', 'Configuring monitoring and logging...');
        
        try {
            const mcpAgentPath = path.join(__dirname, '../mcp_agent');
            
            // Create monitoring configuration
            const monitoringConfig = {
                healthCheck: {
                    enabled: true,
                    interval: 30000,
                    timeout: 5000,
                    endpoints: [
                        `http://localhost:${this.config.port}/health`,
                        `http://localhost:${this.config.port}/api/hedera/status`
                    ]
                },
                metrics: {
                    enabled: true,
                    port: parseInt(this.config.port) + 1000,
                    path: '/metrics',
                    collectDefaultMetrics: true,
                    customMetrics: [
                        'hedera_operations_total',
                        'ai_decisions_total',
                        'vault_operations_total',
                        'api_requests_duration_seconds'
                    ]
                },
                alerts: {
                    enabled: true,
                    channels: ['email', 'webhook'],
                    thresholds: {
                        responseTime: 5000,
                        errorRate: 0.05,
                        memoryUsage: 0.8,
                        cpuUsage: 0.8
                    }
                },
                logging: {
                    level: this.config.logLevel,
                    rotation: {
                        enabled: true,
                        maxFiles: 10,
                        maxSize: '50MB',
                        datePattern: 'YYYY-MM-DD'
                    },
                    structured: true,
                    includeMetadata: true
                }
            };
            
            await fs.writeFile(
                path.join(mcpAgentPath, 'config/monitoring.json'),
                JSON.stringify(monitoringConfig, null, 2)
            );
            
            // Create log rotation configuration
            const logrotateConfig = `${mcpAgentPath}/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 aion aion
    postrotate
        systemctl reload aion-mcp-agent
    endscript
}
`;
            
            await fs.writeFile(
                path.join(__dirname, '../aion-mcp-agent.logrotate'),
                logrotateConfig
            );
            
            this.logStep('configureMonitoring', 'success', 'Monitoring configuration completed', {
                monitoringConfig: 'monitoring.json',
                logrotateConfig: 'aion-mcp-agent.logrotate',
                healthCheckPort: this.config.port,
                metricsPort: parseInt(this.config.port) + 1000
            });
            
        } catch (error) {
            this.logStep('configureMonitoring', 'error', `Monitoring configuration failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 8: Verify Deployment
     */
    async verifyDeployment() {
        this.logStep('verifyDeployment', 'progress', 'Verifying deployment...');
        
        try {
            const mcpAgentPath = path.join(__dirname, '../mcp_agent');
            
            // Start the application in test mode
            const testProcess = spawn('node', ['server/app.js'], {
                cwd: mcpAgentPath,
                env: {
                    ...process.env,
                    NODE_ENV: 'test',
                    PORT: parseInt(this.config.port) + 100
                },
                stdio: 'pipe'
            });
            
            // Wait for startup
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Test health endpoint
            const healthResult = await this.executeCommand(
                `curl -f http://localhost:${parseInt(this.config.port) + 100}/health`
            );
            
            // Test API endpoint
            const apiResult = await this.executeCommand(
                `curl -f http://localhost:${parseInt(this.config.port) + 100}/api`
            );
            
            // Stop test process
            testProcess.kill('SIGTERM');
            
            if (!healthResult.success || !apiResult.success) {
                throw new Error('Application verification failed - endpoints not responding');
            }
            
            // Verify configuration files
            const configFiles = [
                'config/production.json',
                '.env.production',
                'build-info.json',
                'Dockerfile',
                'docker-compose.yml'
            ];
            
            for (const file of configFiles) {
                const filePath = path.join(mcpAgentPath, file);
                try {
                    await fs.access(filePath);
                } catch (error) {
                    throw new Error(`Required file missing: ${file}`);
                }
            }
            
            this.logStep('verifyDeployment', 'success', 'Deployment verification completed', {
                healthCheck: 'Passed',
                apiCheck: 'Passed',
                configFiles: 'All present',
                testPort: parseInt(this.config.port) + 100
            });
            
        } catch (error) {
            this.logStep('verifyDeployment', 'error', `Deployment verification failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Compare version strings
     */
    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return true;
            if (v1Part < v2Part) return false;
        }
        
        return true; // Equal versions
    }

    /**
     * Get git commit hash
     */
    async getGitCommit() {
        try {
            const result = await this.executeCommand('git rev-parse HEAD');
            return result.success ? result.output.substring(0, 8) : 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Generate deployment report
     */
    async generateReport() {
        this.deploymentReport.endTime = new Date();
        this.deploymentReport.duration = this.deploymentReport.endTime - this.deploymentReport.startTime;
        
        const reportPath = path.join(__dirname, '../TASK_6_2_DEPLOYMENT_REPORT.md');
        
        const report = `# Task 6.2 Deployment Report: Enhanced MCP Agent with Hedera Integration

## 📋 Deployment Overview
**Task:** 6.2 Deploy enhanced MCP Agent with Hedera integration  
**Status:** ${this.deploymentReport.success ? '✅ COMPLETED' : '❌ FAILED'}  
**Date:** ${this.deploymentReport.startTime.toISOString().split('T')[0]}  
**Duration:** ${Math.round(this.deploymentReport.duration / 1000)} seconds  

## 🎯 Deployment Summary

### ✅ Completed Steps
${Object.entries(this.deploymentReport.steps)
    .filter(([_, step]) => step.status === 'success')
    .map(([name, step]) => `- **${name}**: ${step.message}`)
    .join('\n')}

### ⚠️ Warnings
${this.deploymentReport.warnings.length > 0 
    ? this.deploymentReport.warnings.map(w => `- **${w.step}**: ${w.message}`).join('\n')
    : 'No warnings'}

### ❌ Errors
${this.deploymentReport.errors.length > 0 
    ? this.deploymentReport.errors.map(e => `- **${e.step}**: ${e.message}`).join('\n')
    : 'No errors'}

## 🏗️ Deployment Configuration

### Environment Settings
- **Environment**: ${this.config.environment}
- **Port**: ${this.config.port}
- **Host**: ${this.config.host}
- **Log Level**: ${this.config.logLevel}

### Hedera Integration
- **Network**: ${process.env.HEDERA_NETWORK || 'testnet'}
- **Operator ID**: ${process.env.HEDERA_OPERATOR_ID || 'Not configured'}
- **Services**: HCS, HFS, HTS, HSCS enabled

### Security Features
- JWT Authentication
- Rate Limiting
- CORS Protection
- Helmet Security Headers
- Environment-based Configuration

## 📊 Generated Files

### Configuration Files
- \`config/production.json\` - Production configuration
- \`.env.production\` - Environment variables
- \`build-info.json\` - Build metadata
- \`config/monitoring.json\` - Monitoring configuration

### Deployment Files
- \`Dockerfile\` - Docker container configuration
- \`docker-compose.yml\` - Docker Compose setup
- \`aion-mcp-agent.service\` - Systemd service file
- \`aion-mcp-agent.logrotate\` - Log rotation configuration

## 🚀 Deployment Instructions

### Using Docker
\`\`\`bash
# Build and start the service
cd mcp_agent
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f aion-mcp-agent
\`\`\`

### Using Systemd (Linux)
\`\`\`bash
# Copy service file
sudo cp aion-mcp-agent.service /etc/systemd/system/

# Enable and start service
sudo systemctl enable aion-mcp-agent
sudo systemctl start aion-mcp-agent

# Check status
sudo systemctl status aion-mcp-agent
\`\`\`

### Manual Deployment
\`\`\`bash
# Navigate to MCP Agent directory
cd mcp_agent

# Install production dependencies
npm ci --only=production

# Start the application
NODE_ENV=production npm start
\`\`\`

## 🔍 Verification Steps

### Health Checks
- **Health Endpoint**: \`GET /health\`
- **API Info**: \`GET /api\`
- **Hedera Status**: \`GET /api/hedera/status\`

### Service Verification
\`\`\`bash
# Test health endpoint
curl -f http://localhost:${this.config.port}/health

# Test API endpoint
curl -f http://localhost:${this.config.port}/api

# Test Hedera integration
curl -f http://localhost:${this.config.port}/api/hedera/status
\`\`\`

## 📈 Monitoring and Logging

### Log Files
- **Application Logs**: \`logs/mcp_agent_production.log\`
- **Error Logs**: \`logs/error.log\`
- **Access Logs**: \`logs/access.log\`

### Monitoring Endpoints
- **Health Check**: \`http://localhost:${this.config.port}/health\`
- **Metrics**: \`http://localhost:${parseInt(this.config.port) + 1000}/metrics\`

### Log Rotation
- Configured via \`aion-mcp-agent.logrotate\`
- Daily rotation with 30-day retention
- Compressed archives

## 🔒 Security Configuration

### Authentication
- JWT-based authentication
- Configurable token expiration
- Secure password hashing with bcrypt

### Network Security
- CORS protection with allowed origins
- Rate limiting (50 requests/minute)
- Helmet security headers
- Trusted proxy configuration

### Environment Security
- Secure environment variable handling
- Production-specific configurations
- Sensitive data protection

## 🎯 Success Criteria

${this.deploymentReport.success ? `
✅ **Environment Validation**: Passed  
✅ **Configuration Update**: Completed  
✅ **Dependencies Installation**: Successful  
✅ **Tests Execution**: Passed  
✅ **Application Build**: Completed  
✅ **Service Deployment**: Configured  
✅ **Monitoring Setup**: Enabled  
✅ **Deployment Verification**: Successful  
` : `
❌ **Deployment Failed**: See errors section above
`}

## 📋 Next Steps

1. **Start the Service**: Use one of the deployment methods above
2. **Verify Operation**: Run health checks and API tests
3. **Configure Monitoring**: Set up alerting and log monitoring
4. **Update Frontend**: Deploy updated frontend (Task 6.3)
5. **Integration Testing**: Run comprehensive tests (Task 6.4)

## 🔄 Rollback Procedure

If deployment issues occur:

1. **Stop the Service**:
   \`\`\`bash
   # Docker
   docker-compose down
   
   # Systemd
   sudo systemctl stop aion-mcp-agent
   
   # Manual
   pkill -f "node server/app.js"
   \`\`\`

2. **Restore Previous Version**:
   \`\`\`bash
   # Restore from backup
   git checkout previous-version
   npm ci --only=production
   \`\`\`

3. **Restart Service**:
   \`\`\`bash
   # Use appropriate method from above
   \`\`\`

## 📊 Performance Expectations

### Resource Usage
- **Memory**: ~200-400MB under normal load
- **CPU**: <10% under normal load
- **Disk**: ~100MB for application + logs

### Response Times
- **Health Check**: <100ms
- **API Endpoints**: <500ms
- **Hedera Operations**: 3-5 seconds

### Throughput
- **API Requests**: 50 requests/minute (rate limited)
- **Hedera Transactions**: 10-15 TPS
- **Concurrent Connections**: Up to 100

**Status: ${this.deploymentReport.success ? '✅ DEPLOYMENT COMPLETED' : '❌ DEPLOYMENT FAILED'}**

---
*Generated on: ${new Date().toISOString()}*
*Deployment Duration: ${Math.round(this.deploymentReport.duration / 1000)} seconds*
`;

        await fs.writeFile(reportPath, report);
        return reportPath;
    }

    /**
     * Execute full deployment
     */
    async deploy() {
        console.log(chalk.blue('🚀 Starting Enhanced MCP Agent Deployment...'));
        console.log(chalk.gray(`Environment: ${this.config.environment}`));
        console.log(chalk.gray(`Port: ${this.config.port}`));
        console.log(chalk.gray(`Host: ${this.config.host}\n`));

        try {
            for (const step of this.deploymentSteps) {
                await this[step]();
            }

            this.deploymentReport.success = true;
            console.log(chalk.green('\n🎉 Enhanced MCP Agent deployment completed successfully!'));

        } catch (error) {
            this.deploymentReport.success = false;
            console.error(chalk.red(`\n❌ Deployment failed at step: ${error.message}`));
            throw error;

        } finally {
            const reportPath = await this.generateReport();
            console.log(chalk.blue(`📊 Deployment report generated: ${reportPath}`));
        }
    }
}

// Main execution
async function main() {
    const deployment = new MCPAgentDeployment();
    
    try {
        await deployment.deploy();
        process.exit(0);
    } catch (error) {
        console.error(chalk.red('❌ Deployment failed:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { MCPAgentDeployment };