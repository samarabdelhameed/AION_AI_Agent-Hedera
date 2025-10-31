#!/usr/bin/env node

/**
 * Configuration Files Update Script
 * Updates all configuration files with Hedera service IDs and settings
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import chalk from 'chalk';

// Load environment variables
config({ path: '.env.hedera' });

class ConfigurationUpdater {
    constructor() {
        this.hederaServices = {
            hcsTopicId: process.env.HCS_TOPIC_ID,
            hcsAuditTopicId: process.env.HCS_AUDIT_TOPIC_ID,
            hfsBridgeFileId: process.env.HFS_BRIDGE_FILE_ID,
            hfsModelFileId: process.env.HFS_MODEL_FILE_ID,
            htsShareTokenId: process.env.HTS_SHARE_TOKEN_ID,
            vaultContractId: process.env.VAULT_CONTRACT_ID,
            hederaAccountId: process.env.HEDERA_ACCOUNT_ID,
            treasuryAccountId: process.env.TREASURY_ACCOUNT_ID,
            aiAgentAccountId: process.env.AI_AGENT_ACCOUNT_ID
        };
        
        this.configFiles = [
            {
                path: 'mcp_agent/config/development.json',
                type: 'json',
                updateFunction: this.updateMCPConfig.bind(this)
            },
            {
                path: 'mcp_agent/config/production.json',
                type: 'json',
                updateFunction: this.updateMCPConfig.bind(this)
            },
            {
                path: 'frontend/.env.local',
                type: 'env',
                updateFunction: this.updateFrontendEnv.bind(this)
            },
            {
                path: 'netlify.toml',
                type: 'toml',
                updateFunction: this.updateNetlifyConfig.bind(this)
            },
            {
                path: 'vercel.json',
                type: 'json',
                updateFunction: this.updateVercelConfig.bind(this)
            },
            {
                path: 'docker-compose.dev.yml',
                type: 'yaml',
                updateFunction: this.updateDockerCompose.bind(this)
            }
        ];
    }

    /**
     * Update MCP Agent configuration files
     */
    updateMCPConfig(filePath, content) {
        try {
            const config = JSON.parse(content);
            
            // Update Hedera services configuration
            if (!config.hedera) {
                config.hedera = {};
            }
            
            if (!config.hedera.services) {
                config.hedera.services = {};
            }
            
            // Update HCS configuration
            if (!config.hedera.services.hcs) {
                config.hedera.services.hcs = {};
            }
            config.hedera.services.hcs.topicId = this.hederaServices.hcsTopicId;
            config.hedera.services.hcs.auditTopicId = this.hederaServices.hcsAuditTopicId;
            
            // Update HFS configuration
            if (!config.hedera.services.hfs) {
                config.hedera.services.hfs = {};
            }
            config.hedera.services.hfs.bridgeFileId = this.hederaServices.hfsBridgeFileId;
            config.hedera.services.hfs.modelFileId = this.hederaServices.hfsModelFileId;
            
            // Update HTS configuration
            if (!config.hedera.services.hts) {
                config.hedera.services.hts = {};
            }
            config.hedera.services.hts.shareTokenId = this.hederaServices.htsShareTokenId;
            
            // Update HSCS configuration
            if (!config.hedera.services.hscs) {
                config.hedera.services.hscs = {};
            }
            config.hedera.services.hscs.vaultContractId = this.hederaServices.vaultContractId;
            
            // Update accounts configuration
            if (!config.hedera.accounts) {
                config.hedera.accounts = {};
            }
            
            if (!config.hedera.accounts.operator) {
                config.hedera.accounts.operator = {};
            }
            config.hedera.accounts.operator.accountId = this.hederaServices.hederaAccountId;
            
            if (!config.hedera.accounts.treasury) {
                config.hedera.accounts.treasury = {};
            }
            config.hedera.accounts.treasury.accountId = this.hederaServices.treasuryAccountId;
            
            if (!config.hedera.accounts.aiAgent) {
                config.hedera.accounts.aiAgent = {};
            }
            config.hedera.accounts.aiAgent.accountId = this.hederaServices.aiAgentAccountId;
            
            // Update blockchain networks with Hedera contracts
            if (config.blockchain && config.blockchain.contracts) {
                if (!config.blockchain.contracts.hedera) {
                    config.blockchain.contracts.hedera = {};
                }
                config.blockchain.contracts.hedera.vault = this.hederaServices.vaultContractId;
                config.blockchain.contracts.hedera.shareToken = this.hederaServices.htsShareTokenId;
            }
            
            return JSON.stringify(config, null, 2);
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to update MCP config ${filePath}:`), error.message);
            return content;
        }
    }

    /**
     * Update frontend environment file
     */
    updateFrontendEnv(filePath, content) {
        try {
            const updates = {
                'VITE_HCS_TOPIC_ID': this.hederaServices.hcsTopicId || '',
                'VITE_HCS_AUDIT_TOPIC_ID': this.hederaServices.hcsAuditTopicId || '',
                'VITE_HFS_BRIDGE_FILE_ID': this.hederaServices.hfsBridgeFileId || '',
                'VITE_HFS_MODEL_FILE_ID': this.hederaServices.hfsModelFileId || '',
                'VITE_HTS_SHARE_TOKEN_ID': this.hederaServices.htsShareTokenId || '',
                'VITE_HEDERA_VAULT_CONTRACT_ID': this.hederaServices.vaultContractId || '',
                'VITE_HEDERA_ACCOUNT_ID': this.hederaServices.hederaAccountId || '',
                'VITE_TREASURY_ACCOUNT_ID': this.hederaServices.treasuryAccountId || '',
                'VITE_AI_AGENT_ACCOUNT_ID': this.hederaServices.aiAgentAccountId || '',
                'VITE_CONFIG_UPDATED': new Date().toISOString()
            };
            
            let updatedContent = content;
            
            // Update or add environment variables
            for (const [key, value] of Object.entries(updates)) {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (updatedContent.match(regex)) {
                    updatedContent = updatedContent.replace(regex, `${key}=${value}`);
                } else {
                    updatedContent += `\\n${key}=${value}`;
                }
            }
            
            return updatedContent;
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to update frontend env ${filePath}:`), error.message);
            return content;
        }
    }

    /**
     * Update Netlify configuration
     */
    updateNetlifyConfig(filePath, content) {
        try {
            const updates = {
                'VITE_HCS_TOPIC_ID': this.hederaServices.hcsTopicId || '0.0.7150678',
                'VITE_HCS_AUDIT_TOPIC_ID': this.hederaServices.hcsAuditTopicId || '0.0.7150679',
                'VITE_HFS_BRIDGE_FILE_ID': this.hederaServices.hfsBridgeFileId || '0.0.7150714',
                'VITE_HFS_MODEL_FILE_ID': this.hederaServices.hfsModelFileId || '0.0.7150715',
                'VITE_HTS_SHARE_TOKEN_ID': this.hederaServices.htsShareTokenId || '0.0.7150671',
                'VITE_HEDERA_VAULT_CONTRACT_ID': this.hederaServices.vaultContractId || '0.0.7150680'
            };
            
            let updatedContent = content;
            
            // Update environment variables in TOML format
            for (const [key, value] of Object.entries(updates)) {
                const regex = new RegExp(`${key}\\s*=\\s*"[^"]*"`, 'g');
                if (updatedContent.match(regex)) {
                    updatedContent = updatedContent.replace(regex, `${key} = "${value}"`);
                }
            }
            
            return updatedContent;
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to update Netlify config ${filePath}:`), error.message);
            return content;
        }
    }

    /**
     * Update Vercel configuration
     */
    updateVercelConfig(filePath, content) {
        try {
            const config = JSON.parse(content);
            
            if (config.env) {
                config.env.VITE_HCS_TOPIC_ID = this.hederaServices.hcsTopicId || '0.0.7150678';
                config.env.VITE_HCS_AUDIT_TOPIC_ID = this.hederaServices.hcsAuditTopicId || '0.0.7150679';
                config.env.VITE_HFS_BRIDGE_FILE_ID = this.hederaServices.hfsBridgeFileId || '0.0.7150714';
                config.env.VITE_HFS_MODEL_FILE_ID = this.hederaServices.hfsModelFileId || '0.0.7150715';
                config.env.VITE_HTS_SHARE_TOKEN_ID = this.hederaServices.htsShareTokenId || '0.0.7150671';
                config.env.VITE_HEDERA_VAULT_CONTRACT_ID = this.hederaServices.vaultContractId || '0.0.7150680';
                config.env.VITE_CONFIG_UPDATED = new Date().toISOString();
            }
            
            return JSON.stringify(config, null, 4);
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to update Vercel config ${filePath}:`), error.message);
            return content;
        }
    }

    /**
     * Update Docker Compose configuration
     */
    updateDockerCompose(filePath, content) {
        try {
            const updates = {
                'HCS_TOPIC_ID': this.hederaServices.hcsTopicId || '',
                'HCS_AUDIT_TOPIC_ID': this.hederaServices.hcsAuditTopicId || '',
                'HFS_BRIDGE_FILE_ID': this.hederaServices.hfsBridgeFileId || '',
                'HFS_MODEL_FILE_ID': this.hederaServices.hfsModelFileId || '',
                'HTS_SHARE_TOKEN_ID': this.hederaServices.htsShareTokenId || '',
                'VAULT_CONTRACT_ID': this.hederaServices.vaultContractId || ''
            };
            
            let updatedContent = content;
            
            // Update environment variables in Docker Compose format
            for (const [key, value] of Object.entries(updates)) {
                const regex = new RegExp(`- ${key}=\\$\\{${key}\\}`, 'g');
                if (!updatedContent.match(regex) && value) {
                    // Add the environment variable if it doesn't exist
                    const envSectionRegex = /(environment:\\s*\\n(?:\\s*-[^\\n]*\\n)*)/;
                    if (updatedContent.match(envSectionRegex)) {
                        updatedContent = updatedContent.replace(
                            envSectionRegex,
                            `$1      - ${key}=\\${${key}}\\n`
                        );
                    }
                }
            }
            
            return updatedContent;
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to update Docker Compose ${filePath}:`), error.message);
            return content;
        }
    }

    /**
     * Update a single configuration file
     */
    updateConfigFile(configFile) {
        try {
            console.log(chalk.blue(`📝 Updating ${configFile.path}...`));
            
            if (!existsSync(configFile.path)) {
                console.log(chalk.yellow(`⚠️ File ${configFile.path} does not exist, skipping...`));
                return false;
            }
            
            const originalContent = readFileSync(configFile.path, 'utf8');
            const updatedContent = configFile.updateFunction(configFile.path, originalContent);
            
            if (updatedContent !== originalContent) {
                writeFileSync(configFile.path, updatedContent);
                console.log(chalk.green(`✅ Updated ${configFile.path}`));
                return true;
            } else {
                console.log(chalk.gray(`ℹ️ No changes needed for ${configFile.path}`));
                return false;
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to update ${configFile.path}:`), error.message);
            return false;
        }
    }

    /**
     * Validate Hedera services configuration
     */
    validateHederaServices() {
        console.log(chalk.blue('🔍 Validating Hedera services configuration...'));
        
        const requiredServices = [
            'hcsTopicId',
            'hcsAuditTopicId',
            'hfsBridgeFileId',
            'hfsModelFileId',
            'htsShareTokenId'
        ];
        
        const missingServices = [];
        
        for (const service of requiredServices) {
            if (!this.hederaServices[service]) {
                missingServices.push(service);
            }
        }
        
        if (missingServices.length > 0) {
            console.log(chalk.yellow('⚠️ Missing Hedera services:'));
            for (const service of missingServices) {
                console.log(chalk.yellow(`   - ${service}`));
            }
            console.log(chalk.yellow('\\nRun "npm run setup:hedera-services" to create missing services.'));
            return false;
        }
        
        console.log(chalk.green('✅ All Hedera services are configured'));
        return true;
    }

    /**
     * Generate configuration summary
     */
    generateSummary(updatedFiles) {
        console.log('\\n' + chalk.bold('📋 CONFIGURATION UPDATE SUMMARY'));
        console.log('=' .repeat(50));
        
        console.log('\\n🏗️ HEDERA SERVICES:');
        for (const [key, value] of Object.entries(this.hederaServices)) {
            if (value) {
                console.log(chalk.green(`   ✅ ${key}: ${value}`));
            } else {
                console.log(chalk.yellow(`   ⚠️ ${key}: Not configured`));
            }
        }
        
        console.log('\\n📁 UPDATED FILES:');
        if (updatedFiles.length > 0) {
            for (const file of updatedFiles) {
                console.log(chalk.green(`   ✅ ${file}`));
            }
        } else {
            console.log(chalk.gray('   ℹ️ No files needed updates'));
        }
        
        console.log('\\n📚 NEXT STEPS:');
        console.log('   1. Review updated configuration files');
        console.log('   2. Test configuration: npm run test:hedera');
        console.log('   3. Deploy contracts: npm run deploy:hedera');
        console.log('   4. Start services: npm run dev');
        
        console.log('\\n' + '=' .repeat(50));
    }

    /**
     * Main update function
     */
    async updateAll() {
        console.log(chalk.bold('🚀 Starting Configuration Files Update...'));
        console.log('=' .repeat(50));
        
        try {
            // Validate Hedera services
            const servicesValid = this.validateHederaServices();
            if (!servicesValid) {
                console.log(chalk.yellow('\\n⚠️ Some Hedera services are missing. Continuing with available services...'));
            }
            
            console.log('\\n');
            
            // Update all configuration files
            const updatedFiles = [];
            
            for (const configFile of this.configFiles) {
                const updated = this.updateConfigFile(configFile);
                if (updated) {
                    updatedFiles.push(configFile.path);
                }
            }
            
            // Generate summary
            this.generateSummary(updatedFiles);
            
            console.log(chalk.green('\\n🎉 Configuration update completed successfully!'));
            
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ Configuration update failed:'), error.message);
            return false;
        }
    }
}

// Run update if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const updater = new ConfigurationUpdater();
    updater.updateAll().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export default ConfigurationUpdater;