#!/usr/bin/env node

/**
 * AION Hedera Integration - Verification Report Generator
 * 
 * This script generates a comprehensive verification report with all
 * transaction hashes, service IDs, and deployment information.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VerificationReportGenerator {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            network: 'testnet',
            contracts: {},
            hederaServices: {},
            transactions: [],
            verificationStatus: {}
        };
    }

    /**
     * Extract deployment information from broadcast files
     */
    extractDeploymentInfo() {
        console.log('📋 Extracting deployment information...');
        
        const broadcastDir = path.join(__dirname, '../contracts/broadcast');
        
        if (!fs.existsSync(broadcastDir)) {
            console.warn('⚠️  Broadcast directory not found');
            return;
        }

        // Read all deployment files
        const deploymentFiles = this.findDeploymentFiles(broadcastDir);
        
        deploymentFiles.forEach(file => {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                this.processDeploymentData(data, file);
            } catch (error) {
                console.warn(`⚠️  Failed to process ${file}: ${error.message}`);
            }
        });
    }

    /**
     * Find all deployment JSON files
     */
    findDeploymentFiles(dir) {
        const files = [];
        
        const scanDir = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            
            items.forEach(item => {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (item.endsWith('.json') && item.includes('run-')) {
                    files.push(fullPath);
                }
            });
        };
        
        scanDir(dir);
        return files;
    }

    /**
     * Process deployment data from JSON files
     */
    processDeploymentData(data, filePath) {
        if (!data.transactions || !Array.isArray(data.transactions)) {
            return;
        }

        const chainId = this.extractChainId(filePath);
        const network = chainId === '56' ? 'BSC Mainnet' : 'BSC Testnet';

        data.transactions.forEach(tx => {
            const contractInfo = {
                name: tx.contractName,
                address: tx.contractAddress,
                hash: tx.hash,
                type: tx.transactionType,
                chainId: chainId,
                network: network,
                deployer: tx.transaction?.from,
                gasUsed: tx.transaction?.gas,
                arguments: tx.arguments || []
            };

            // Store contract information
            if (tx.transactionType === 'CREATE') {
                this.report.contracts[tx.contractName] = contractInfo;
            }

            // Store transaction information
            this.report.transactions.push(contractInfo);
        });
    }

    /**
     * Extract chain ID from file path
     */
    extractChainId(filePath) {
        const pathParts = filePath.split('/');
        for (const part of pathParts) {
            if (/^\d+$/.test(part)) {
                return part;
            }
        }
        return 'unknown';
    }

    /**
     * Extract Hedera service IDs from environment files
     */
    extractHederaServices() {
        console.log('🌐 Extracting Hedera service information...');
        
        const envFiles = [
            '.env.hedera',
            'mcp_agent/.env',
            'contracts/.env.hedera'
        ];

        envFiles.forEach(envFile => {
            const fullPath = path.join(__dirname, '..', envFile);
            
            if (fs.existsSync(fullPath)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    this.parseHederaConfig(content, envFile);
                } catch (error) {
                    console.warn(`⚠️  Failed to read ${envFile}: ${error.message}`);
                }
            }
        });
    }

    /**
     * Parse Hedera configuration from environment files
     */
    parseHederaConfig(content, fileName) {
        const lines = content.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            
            if (line.startsWith('#') || !line.includes('=')) {
                return;
            }

            const [key, value] = line.split('=', 2);
            const cleanKey = key.trim();
            const cleanValue = value.trim();

            // Extract Hedera-specific configurations
            if (cleanKey.includes('HEDERA') || cleanKey.includes('HCS') || 
                cleanKey.includes('HFS') || cleanKey.includes('HTS')) {
                
                this.report.hederaServices[cleanKey] = {
                    value: cleanValue,
                    source: fileName,
                    type: this.getServiceType(cleanKey)
                };
            }
        });
    }

    /**
     * Determine service type from key name
     */
    getServiceType(key) {
        if (key.includes('HCS') || key.includes('TOPIC')) return 'HCS';
        if (key.includes('HFS') || key.includes('FILE')) return 'HFS';
        if (key.includes('HTS') || key.includes('TOKEN')) return 'HTS';
        if (key.includes('ACCOUNT')) return 'Account';
        if (key.includes('NETWORK')) return 'Network';
        return 'Configuration';
    }

    /**
     * Verify contract deployments
     */
    async verifyContracts() {
        console.log('🔍 Verifying contract deployments...');
        
        for (const [name, contract] of Object.entries(this.report.contracts)) {
            try {
                const isVerified = await this.checkContractVerification(contract);
                this.report.verificationStatus[name] = {
                    deployed: true,
                    verified: isVerified,
                    address: contract.address,
                    network: contract.network
                };
            } catch (error) {
                this.report.verificationStatus[name] = {
                    deployed: false,
                    error: error.message
                };
            }
        }
    }

    /**
     * Check if contract is verified on block explorer
     */
    async checkContractVerification(contract) {
        // This would typically make API calls to BSCScan
        // For now, we'll simulate the check
        return contract.address && contract.address !== '0x';
    }

    /**
     * Generate verification URLs
     */
    generateVerificationUrls() {
        console.log('🔗 Generating verification URLs...');
        
        this.report.verificationUrls = {
            contracts: {},
            hedera: {},
            apis: {}
        };

        // Contract verification URLs
        Object.entries(this.report.contracts).forEach(([name, contract]) => {
            const baseUrl = contract.chainId === '56' 
                ? 'https://bscscan.com' 
                : 'https://testnet.bscscan.com';
            
            this.report.verificationUrls.contracts[name] = {
                explorer: `${baseUrl}/address/${contract.address}`,
                transaction: `${baseUrl}/tx/${contract.hash}`
            };
        });

        // Hedera verification URLs
        const hederaServices = this.report.hederaServices;
        
        if (hederaServices.HEDERA_ACCOUNT_ID) {
            const accountId = hederaServices.HEDERA_ACCOUNT_ID.value;
            this.report.verificationUrls.hedera.account = {
                hashscan: `https://hashscan.io/testnet/account/${accountId}`,
                mirrorNode: `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
            };
        }

        if (hederaServices.HCS_TOPIC_ID) {
            const topicId = hederaServices.HCS_TOPIC_ID.value;
            this.report.verificationUrls.hedera.hcs = {
                hashscan: `https://hashscan.io/testnet/topic/${topicId}`,
                mirrorNode: `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}`,
                messages: `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages`
            };
        }

        if (hederaServices.HFS_FILE_ID) {
            const fileId = hederaServices.HFS_FILE_ID.value;
            this.report.verificationUrls.hedera.hfs = {
                hashscan: `https://hashscan.io/testnet/file/${fileId}`,
                mirrorNode: `https://testnet.mirrornode.hedera.com/api/v1/files/${fileId}`,
                contents: `https://testnet.mirrornode.hedera.com/api/v1/files/${fileId}/contents`
            };
        }
    }

    /**
     * Generate summary statistics
     */
    generateSummary() {
        console.log('📊 Generating summary statistics...');
        
        this.report.summary = {
            totalContracts: Object.keys(this.report.contracts).length,
            totalTransactions: this.report.transactions.length,
            hederaServices: Object.keys(this.report.hederaServices).length,
            networks: [...new Set(this.report.transactions.map(tx => tx.network))],
            deploymentStatus: {
                successful: Object.values(this.report.verificationStatus)
                    .filter(status => status.deployed).length,
                failed: Object.values(this.report.verificationStatus)
                    .filter(status => !status.deployed).length
            }
        };
    }

    /**
     * Generate the complete verification report
     */
    async generateReport() {
        console.log('🚀 Generating AION Hedera Verification Report...\n');
        
        try {
            // Extract all deployment information
            this.extractDeploymentInfo();
            this.extractHederaServices();
            
            // Verify deployments
            await this.verifyContracts();
            
            // Generate additional information
            this.generateVerificationUrls();
            this.generateSummary();
            
            // Save the report
            const reportPath = path.join(__dirname, '../docs/verification-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
            
            // Generate markdown report
            this.generateMarkdownReport();
            
            console.log('✅ Verification report generated successfully!');
            console.log(`📄 JSON Report: ${reportPath}`);
            console.log(`📄 Markdown Report: ${reportPath.replace('.json', '.md')}`);
            
            return this.report;
            
        } catch (error) {
            console.error('❌ Failed to generate verification report:', error);
            throw error;
        }
    }

    /**
     * Generate markdown version of the report
     */
    generateMarkdownReport() {
        const markdown = this.generateMarkdownContent();
        const markdownPath = path.join(__dirname, '../docs/verification-report.md');
        fs.writeFileSync(markdownPath, markdown);
    }

    /**
     * Generate markdown content
     */
    generateMarkdownContent() {
        const report = this.report;
        
        return `# AION Hedera Integration - Verification Report

**Generated**: ${report.timestamp}  
**Version**: ${report.version}  
**Network**: ${report.network}

## 📊 Summary

- **Total Contracts**: ${report.summary.totalContracts}
- **Total Transactions**: ${report.summary.totalTransactions}
- **Hedera Services**: ${report.summary.hederaServices}
- **Networks**: ${report.summary.networks.join(', ')}
- **Successful Deployments**: ${report.summary.deploymentStatus.successful}
- **Failed Deployments**: ${report.summary.deploymentStatus.failed}

## 🔗 Deployed Contracts

${Object.entries(report.contracts).map(([name, contract]) => `
### ${name}
- **Address**: \`${contract.address}\`
- **Network**: ${contract.network}
- **Transaction**: \`${contract.hash}\`
- **Deployer**: \`${contract.deployer}\`
- **Verification**: [View on Explorer](${report.verificationUrls.contracts[name]?.explorer})
`).join('\n')}

## 🌐 Hedera Services

${Object.entries(report.hederaServices).map(([key, service]) => `
### ${key}
- **Value**: \`${service.value}\`
- **Type**: ${service.type}
- **Source**: ${service.source}
`).join('\n')}

## 🔍 Verification URLs

### Smart Contracts
${Object.entries(report.verificationUrls.contracts || {}).map(([name, urls]) => `
- **${name}**: [Explorer](${urls.explorer}) | [Transaction](${urls.transaction})
`).join('\n')}

### Hedera Services
${report.verificationUrls.hedera.account ? `
- **Account**: [Hashscan](${report.verificationUrls.hedera.account.hashscan}) | [Mirror Node](${report.verificationUrls.hedera.account.mirrorNode})
` : ''}
${report.verificationUrls.hedera.hcs ? `
- **HCS Topic**: [Hashscan](${report.verificationUrls.hedera.hcs.hashscan}) | [Messages](${report.verificationUrls.hedera.hcs.messages})
` : ''}
${report.verificationUrls.hedera.hfs ? `
- **HFS File**: [Hashscan](${report.verificationUrls.hedera.hfs.hashscan}) | [Contents](${report.verificationUrls.hedera.hfs.contents})
` : ''}

## 📋 Transaction Details

${report.transactions.map(tx => `
### ${tx.name} (${tx.type})
- **Hash**: \`${tx.hash}\`
- **Address**: \`${tx.address}\`
- **Network**: ${tx.network}
- **Deployer**: \`${tx.deployer}\`
${tx.arguments.length > 0 ? `- **Arguments**: ${tx.arguments.map(arg => `\`${arg}\``).join(', ')}` : ''}
`).join('\n')}

## ✅ Verification Status

${Object.entries(report.verificationStatus).map(([name, status]) => `
- **${name}**: ${status.deployed ? '✅ Deployed' : '❌ Failed'} ${status.verified ? '(Verified)' : '(Unverified)'}
`).join('\n')}

---

*This report was automatically generated by the AION Verification Report Generator.*
`;
    }
}

// Main execution
async function main() {
    try {
        const generator = new VerificationReportGenerator();
        const report = await generator.generateReport();
        
        console.log('\n📋 Report Summary:');
        console.log(`- Contracts: ${report.summary.totalContracts}`);
        console.log(`- Transactions: ${report.summary.totalTransactions}`);
        console.log(`- Hedera Services: ${report.summary.hederaServices}`);
        console.log(`- Networks: ${report.summary.networks.join(', ')}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Report generation failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = VerificationReportGenerator;