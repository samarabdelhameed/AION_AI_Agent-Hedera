#!/usr/bin/env node

/**
 * Complete System Deployment Script
 * Deploys the entire AION system to Hedera testnet with full integration
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.hedera' });

class CompleteSystemDeployment {
    constructor() {
        this.deploymentSteps = [];
        this.results = {};
        this.startTime = Date.now();
    }

    async deploy() {
        try {
            console.log('🚀 Starting Complete AION System Deployment to Hedera Testnet...\n');
            
            await this.validatePrerequisites();
            await this.deployContracts();
            await this.initializeHederaServices();
            await this.configureMCPAgent();
            await this.runSystemTests();
            await this.generateDeploymentReport();
            
            console.log('\n✅ Complete System Deployment Successful!');
            this.printSummary();
            
        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
            await this.cleanup();
            process.exit(1);
        }
    }

    async validatePrerequisites() {
        console.log('🔍 Validating prerequisites...');
        
        // Check environment variables
        const required = [
            'HEDERA_ACCOUNT_ID',
            'HEDERA_PRIVATE_KEY',
            'HEDERA_RPC_URL',
            'ADMIN_ADDRESS',
            'AI_AGENT_ADDRESS'
        ];
        
        for (const key of required) {
            if (!process.env[key]) {
                throw new Error(`Missing required environment variable: ${key}`);
            }
        }
        
        // Check tools
        await this.checkCommand('forge', 'Foundry is required for contract deployment');
        await this.checkCommand('node', 'Node.js is required');
        await this.checkCommand('npm', 'npm is required');
        
        // Check account balance
        console.log('💰 Checking account balance...');
        const balance = await this.getAccountBalance();
        if (balance < 50) {
            throw new Error(`Insufficient HBAR balance: ${balance}. Minimum 50 HBAR required.`);
        }
        
        console.log(`✓ Account balance: ${balance} HBAR`);
        console.log('✓ Prerequisites validated\n');
    }

    async deployContracts() {
        console.log('📜 Deploying smart contracts to Hedera testnet...');
        
        try {
            // Build contracts
            console.log('🔨 Building contracts...');
            await this.runCommand('forge build', { cwd: 'contracts' });
            console.log('✓ Contracts built successfully');
            
            // Deploy contracts using Foundry
            console.log('🚀 Deploying contracts...');
            const deployResult = await this.runCommand(
                'forge script script/DeployHederaVault.s.sol --rpc-url $HEDERA_RPC_URL --broadcast --verify -vvv',
                { cwd: 'contracts' }
            );
            
            // Parse deployment results
            this.results.contracts = this.parseDeploymentOutput(deployResult);
            
            console.log('✓ Smart contracts deployed successfully');
            console.log(`  Vault: ${this.results.contracts.vault}`);
            console.log(`  HTS Manager: ${this.results.contracts.htsManager}`);
            console.log(`  Hedera Service: ${this.results.contracts.hederaService}`);
            
            // Update environment files with contract addresses
            await this.updateEnvironmentFiles();
            
        } catch (error) {
            throw new Error(`Contract deployment failed: ${error.message}`);
        }
        
        console.log('');
    }

    async initializeHederaServices() {
        console.log('🔗 Initializing Hedera services...');
        
        try {
            // Install MCP agent dependencies
            console.log('📦 Installing MCP agent dependencies...');
            await this.runCommand('npm install', { cwd: 'mcp_agent' });
            console.log('✓ Dependencies installed');
            
            // Run Hedera services setup
            console.log('⚙️ Setting up Hedera services...');
            const setupResult = await this.runCommand('npm run setup:hedera', { cwd: 'mcp_agent' });
            
            // Parse service setup results
            this.results.services = this.parseServiceSetupOutput(setupResult);
            
            console.log('✓ Hedera services initialized successfully');
            console.log(`  HCS Topic: ${this.results.services.hcsTopicId}`);
            console.log(`  HFS File: ${this.results.services.hfsFileId}`);
            
        } catch (error) {
            throw new Error(`Hedera services initialization failed: ${error.message}`);
        }
        
        console.log('');
    }

    async configureMCPAgent() {
        console.log('🤖 Configuring MCP Agent...');
        
        try {
            // Validate configuration
            console.log('🔍 Validating MCP agent configuration...');
            await this.runCommand('npm run validate:config', { cwd: 'mcp_agent' });
            console.log('✓ Configuration validated');
            
            // Start MCP agent in background for testing
            console.log('🚀 Starting MCP agent...');
            this.mcpAgentProcess = await this.startMCPAgent();
            
            // Wait for agent to be ready
            await this.waitForMCPAgent();
            console.log('✓ MCP agent started and ready');
            
        } catch (error) {
            throw new Error(`MCP agent configuration failed: ${error.message}`);
        }
        
        console.log('');
    }

    async runSystemTests() {
        console.log('🧪 Running system integration tests...');
        
        try {
            // Run contract tests
            console.log('📜 Running contract tests...');
            await this.runCommand('forge test --match-contract "Hedera" -vv', { cwd: 'contracts' });
            console.log('✓ Contract tests passed');
            
            // Run MCP agent integration tests
            console.log('🤖 Running MCP agent integration tests...');
            await this.runCommand('npm run test:hedera', { cwd: 'mcp_agent' });
            console.log('✓ MCP agent tests passed');
            
            // Run end-to-end tests
            console.log('🔄 Running end-to-end integration tests...');
            await this.runCommand('npm test -- --testPathPattern=agentHederaIntegration --runInBand', { cwd: 'mcp_agent' });
            console.log('✓ End-to-end tests passed');
            
            this.results.testsStatus = 'passed';
            
        } catch (error) {
            console.warn('⚠️ Some tests failed, but deployment continues:', error.message);
            this.results.testsStatus = 'partial';
        }
        
        console.log('');
    }

    async generateDeploymentReport() {
        console.log('📊 Generating deployment report...');
        
        const report = {
            deployment: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.startTime,
                network: 'hedera-testnet',
                deployer: process.env.ADMIN_ADDRESS
            },
            contracts: this.results.contracts,
            services: this.results.services,
            testing: {
                status: this.results.testsStatus,
                timestamp: new Date().toISOString()
            },
            configuration: {
                hederaNetwork: process.env.HEDERA_NETWORK,
                hederaAccount: process.env.HEDERA_ACCOUNT_ID,
                mcpAgentPort: process.env.MCP_AGENT_PORT || 3002
            },
            nextSteps: [
                'Access MCP Agent at http://localhost:3002',
                'Check Hedera services status: GET /api/hedera/status',
                'Test AI decision flow: POST /api/decide',
                'Monitor HCS logs on Hedera Mirror Node',
                'View HFS files on Hedera File Explorer'
            ]
        };
        
        // Save report
        fs.writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));
        
        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        fs.writeFileSync('DEPLOYMENT_REPORT.md', markdownReport);
        
        console.log('✓ Deployment report generated');
        console.log('  - deployment-report.json');
        console.log('  - DEPLOYMENT_REPORT.md');
        
        console.log('');
    }

    generateMarkdownReport(report) {
        return `# AION System Deployment Report

## Deployment Summary

- **Timestamp**: ${report.deployment.timestamp}
- **Duration**: ${Math.round(report.deployment.duration / 1000)}s
- **Network**: ${report.deployment.network}
- **Deployer**: ${report.deployment.deployer}
- **Status**: ✅ Successful

## Deployed Contracts

| Contract | Address |
|----------|---------|
| AION Vault Hedera | \`${report.contracts?.vault || 'N/A'}\` |
| HTS Token Manager | \`${report.contracts?.htsManager || 'N/A'}\` |
| Safe Hedera Service | \`${report.contracts?.hederaService || 'N/A'}\` |

## Hedera Services

| Service | ID |
|---------|-----|
| HCS Topic | \`${report.services?.hcsTopicId || 'N/A'}\` |
| HFS File | \`${report.services?.hfsFileId || 'N/A'}\` |

## Testing Results

- **Status**: ${report.testing.status === 'passed' ? '✅ All tests passed' : '⚠️ Partial success'}
- **Timestamp**: ${report.testing.timestamp}

## Configuration

- **Hedera Network**: ${report.configuration.hederaNetwork}
- **Hedera Account**: ${report.configuration.hederaAccount}
- **MCP Agent Port**: ${report.configuration.mcpAgentPort}

## Next Steps

${report.nextSteps.map(step => `- ${step}`).join('\n')}

## API Endpoints

### Health Check
\`\`\`bash
curl http://localhost:${report.configuration.mcpAgentPort}/api/health
\`\`\`

### Hedera Status
\`\`\`bash
curl http://localhost:${report.configuration.mcpAgentPort}/api/hedera/status
\`\`\`

### AI Decision
\`\`\`bash
curl -X POST http://localhost:${report.configuration.mcpAgentPort}/api/decide \\
  -H "Content-Type: application/json" \\
  -d '{"currentStrategy": "venus", "amount": "1000000000000000000"}'
\`\`\`

## Monitoring

- **Hedera Mirror Node**: https://hashscan.io/testnet
- **HCS Topic**: https://hashscan.io/testnet/topic/${report.services?.hcsTopicId}
- **Contract Explorer**: https://hashscan.io/testnet/contract/${report.contracts?.vault}

---
*Generated on ${new Date().toISOString()}*
`;
    }

    async checkCommand(command, errorMessage) {
        return new Promise((resolve, reject) => {
            exec(`which ${command}`, (error) => {
                if (error) {
                    reject(new Error(errorMessage));
                } else {
                    resolve();
                }
            });
        });
    }

    async getAccountBalance() {
        try {
            const result = await this.runCommand(`cast balance ${process.env.ADMIN_ADDRESS} --rpc-url ${process.env.HEDERA_RPC_URL}`);
            return parseFloat(result) / 1e18; // Convert from wei to HBAR
        } catch (error) {
            return 0;
        }
    }

    async runCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn('bash', ['-c', command], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env },
                cwd: options.cwd || process.cwd()
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Command failed: ${command}\n${stderr}`));
                }
            });
        });
    }

    parseDeploymentOutput(output) {
        // Parse Foundry deployment output to extract contract addresses
        const contracts = {};
        
        const vaultMatch = output.match(/AIONVaultHedera deployed at: (0x[a-fA-F0-9]{40})/);
        if (vaultMatch) contracts.vault = vaultMatch[1];
        
        const htsMatch = output.match(/HTSTokenManager deployed at: (0x[a-fA-F0-9]{40})/);
        if (htsMatch) contracts.htsManager = htsMatch[1];
        
        const hederaMatch = output.match(/SafeHederaService deployed at: (0x[a-fA-F0-9]{40})/);
        if (hederaMatch) contracts.hederaService = hederaMatch[1];
        
        return contracts;
    }

    parseServiceSetupOutput(output) {
        // Parse service setup output to extract service IDs
        const services = {};
        
        const hcsMatch = output.match(/HCS Topic: (0\.0\.\d+)/);
        if (hcsMatch) services.hcsTopicId = hcsMatch[1];
        
        const hfsMatch = output.match(/HFS File: (0\.0\.\d+)/);
        if (hfsMatch) services.hfsFileId = hfsMatch[1];
        
        return services;
    }

    async updateEnvironmentFiles() {
        const envFiles = ['.env.hedera', 'mcp_agent/.env.hedera'];
        
        for (const envFile of envFiles) {
            if (fs.existsSync(envFile)) {
                let content = fs.readFileSync(envFile, 'utf8');
                
                if (this.results.contracts.vault) {
                    content = this.updateEnvVar(content, 'VAULT_CONTRACT_ADDRESS', this.results.contracts.vault);
                }
                if (this.results.contracts.htsManager) {
                    content = this.updateEnvVar(content, 'HTS_TOKEN_MANAGER_ADDRESS', this.results.contracts.htsManager);
                }
                if (this.results.contracts.hederaService) {
                    content = this.updateEnvVar(content, 'SAFE_HEDERA_SERVICE_ADDRESS', this.results.contracts.hederaService);
                }
                
                fs.writeFileSync(envFile, content);
            }
        }
    }

    updateEnvVar(content, key, value) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
            return content.replace(regex, `${key}=${value}`);
        } else {
            return content + `\n${key}=${value}`;
        }
    }

    async startMCPAgent() {
        return new Promise((resolve, reject) => {
            const child = spawn('npm', ['start'], {
                cwd: 'mcp_agent',
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env }
            });

            let started = false;

            child.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Server running on') && !started) {
                    started = true;
                    resolve(child);
                }
            });

            child.stderr.on('data', (data) => {
                console.log('MCP Agent:', data.toString());
            });

            child.on('close', (code) => {
                if (!started) {
                    reject(new Error(`MCP Agent failed to start: ${code}`));
                }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!started) {
                    child.kill();
                    reject(new Error('MCP Agent startup timeout'));
                }
            }, 30000);
        });
    }

    async waitForMCPAgent() {
        const maxAttempts = 30;
        const port = process.env.MCP_AGENT_PORT || 3002;
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`http://localhost:${port}/api/health`);
                if (response.ok) {
                    return;
                }
            } catch (error) {
                // Continue trying
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('MCP Agent health check timeout');
    }

    printSummary() {
        const duration = Math.round((Date.now() - this.startTime) / 1000);
        
        console.log('📋 Deployment Summary:');
        console.log('======================');
        console.log(`Duration: ${duration}s`);
        console.log(`Network: Hedera Testnet`);
        console.log(`Account: ${process.env.HEDERA_ACCOUNT_ID}`);
        
        if (this.results.contracts) {
            console.log('\n📜 Deployed Contracts:');
            Object.entries(this.results.contracts).forEach(([name, address]) => {
                console.log(`  ${name}: ${address}`);
            });
        }
        
        if (this.results.services) {
            console.log('\n🔗 Hedera Services:');
            Object.entries(this.results.services).forEach(([name, id]) => {
                console.log(`  ${name}: ${id}`);
            });
        }
        
        console.log('\n🎯 Access Points:');
        console.log(`  MCP Agent: http://localhost:${process.env.MCP_AGENT_PORT || 3002}`);
        console.log(`  Health Check: http://localhost:${process.env.MCP_AGENT_PORT || 3002}/api/health`);
        console.log(`  Hedera Status: http://localhost:${process.env.MCP_AGENT_PORT || 3002}/api/hedera/status`);
        
        console.log('\n📊 Reports Generated:');
        console.log('  - deployment-report.json');
        console.log('  - DEPLOYMENT_REPORT.md');
    }

    async cleanup() {
        if (this.mcpAgentProcess) {
            this.mcpAgentProcess.kill();
        }
    }
}

// Handle script execution
async function main() {
    const deployment = new CompleteSystemDeployment();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Deployment interrupted...');
        await deployment.cleanup();
        process.exit(1);
    });
    
    await deployment.deploy();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    });
}

export default CompleteSystemDeployment;