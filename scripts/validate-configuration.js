#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Validates all configuration files for Hedera integration
 */

import { readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
import chalk from 'chalk';

// Load environment variables
config({ path: '.env.hedera' });

class ConfigurationValidator {
    constructor() {
        this.validationResults = {
            environmentFiles: [],
            configFiles: [],
            deploymentFiles: [],
            errors: [],
            warnings: []
        };
    }

    /**
     * Validate environment files
     */
    validateEnvironmentFiles() {
        console.log(chalk.blue('🔍 Validating environment files...'));
        
        const envFiles = [
            {
                path: '.env.hedera',
                required: true,
                type: 'Hedera Environment'
            },
            {
                path: 'mcp_agent/.env.hedera',
                required: true,
                type: 'MCP Agent Hedera Environment'
            },
            {
                path: 'frontend/.env.local',
                required: false,
                type: 'Frontend Local Environment'
            }
        ];
        
        for (const envFile of envFiles) {
            const result = this.validateEnvironmentFile(envFile);
            this.validationResults.environmentFiles.push(result);
        }
    }

    /**
     * Validate a single environment file
     */
    validateEnvironmentFile(envFile) {
        const result = {
            path: envFile.path,
            type: envFile.type,
            exists: false,
            valid: false,
            requiredVars: [],
            missingVars: [],
            errors: []
        };
        
        try {
            if (!existsSync(envFile.path)) {
                if (envFile.required) {
                    result.errors.push(`Required file ${envFile.path} does not exist`);
                    this.validationResults.errors.push(`Missing required file: ${envFile.path}`);
                } else {
                    this.validationResults.warnings.push(`Optional file not found: ${envFile.path}`);
                }
                return result;
            }
            
            result.exists = true;
            
            const content = readFileSync(envFile.path, 'utf8');
            const lines = content.split('\\n');
            
            // Define required variables based on file type
            let requiredVars = [];
            
            if (envFile.path.includes('hedera')) {
                requiredVars = [
                    'HEDERA_NETWORK',
                    'HEDERA_ACCOUNT_ID',
                    'HEDERA_PRIVATE_KEY',
                    'HEDERA_RPC_URL'
                ];
            } else if (envFile.path.includes('frontend')) {
                requiredVars = [
                    'VITE_HEDERA_NETWORK',
                    'VITE_HEDERA_RPC_URL',
                    'VITE_ENABLE_HEDERA_INTEGRATION'
                ];
            }
            
            result.requiredVars = requiredVars;
            
            // Check for required variables
            const foundVars = new Set();
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key] = trimmed.split('=');
                    if (key) {
                        foundVars.add(key.trim());
                    }
                }
            }
            
            // Find missing variables
            for (const requiredVar of requiredVars) {
                if (!foundVars.has(requiredVar)) {
                    result.missingVars.push(requiredVar);
                }
            }
            
            result.valid = result.missingVars.length === 0;
            
            if (result.valid) {
                console.log(chalk.green(`   ✅ ${envFile.type}: Valid`));
            } else {
                console.log(chalk.yellow(`   ⚠️ ${envFile.type}: Missing variables`));
                for (const missingVar of result.missingVars) {
                    console.log(chalk.yellow(`      - ${missingVar}`));
                }
            }
            
        } catch (error) {
            result.errors.push(`Failed to validate ${envFile.path}: ${error.message}`);
            this.validationResults.errors.push(`Validation error for ${envFile.path}: ${error.message}`);
            console.log(chalk.red(`   ❌ ${envFile.type}: Error - ${error.message}`));
        }
        
        return result;
    }

    /**
     * Validate configuration files
     */
    validateConfigFiles() {
        console.log(chalk.blue('\\n🔍 Validating configuration files...'));
        
        const configFiles = [
            {
                path: 'foundry.toml',
                type: 'Foundry Configuration',
                validator: this.validateFoundryConfig.bind(this)
            },
            {
                path: 'mcp_agent/config/default.json',
                type: 'MCP Default Configuration',
                validator: this.validateMCPConfig.bind(this)
            },
            {
                path: 'mcp_agent/config/development.json',
                type: 'MCP Development Configuration',
                validator: this.validateMCPConfig.bind(this)
            },
            {
                path: 'docker-compose.dev.yml',
                type: 'Docker Compose Configuration',
                validator: this.validateDockerConfig.bind(this)
            }
        ];
        
        for (const configFile of configFiles) {
            const result = this.validateConfigFile(configFile);
            this.validationResults.configFiles.push(result);
        }
    }

    /**
     * Validate a single configuration file
     */
    validateConfigFile(configFile) {
        const result = {
            path: configFile.path,
            type: configFile.type,
            exists: false,
            valid: false,
            errors: []
        };
        
        try {
            if (!existsSync(configFile.path)) {
                result.errors.push(`Configuration file ${configFile.path} does not exist`);
                this.validationResults.errors.push(`Missing configuration file: ${configFile.path}`);
                console.log(chalk.red(`   ❌ ${configFile.type}: File not found`));
                return result;
            }
            
            result.exists = true;
            
            const content = readFileSync(configFile.path, 'utf8');
            const validationResult = configFile.validator(content);
            
            result.valid = validationResult.valid;
            result.errors = validationResult.errors || [];
            
            if (result.valid) {
                console.log(chalk.green(`   ✅ ${configFile.type}: Valid`));
            } else {
                console.log(chalk.yellow(`   ⚠️ ${configFile.type}: Issues found`));
                for (const error of result.errors) {
                    console.log(chalk.yellow(`      - ${error}`));
                }
            }
            
        } catch (error) {
            result.errors.push(`Failed to validate ${configFile.path}: ${error.message}`);
            this.validationResults.errors.push(`Validation error for ${configFile.path}: ${error.message}`);
            console.log(chalk.red(`   ❌ ${configFile.type}: Error - ${error.message}`));
        }
        
        return result;
    }

    /**
     * Validate Foundry configuration
     */
    validateFoundryConfig(content) {
        const errors = [];
        
        // Check for Hedera remappings
        if (!content.includes('@hedera/')) {
            errors.push('Missing Hedera remapping (@hedera/)');
        }
        
        // Check for Hedera RPC endpoints
        if (!content.includes('hederaTestnet')) {
            errors.push('Missing Hedera testnet RPC endpoint');
        }
        
        // Check for Hedera profile
        if (!content.includes('[profile.hedera]')) {
            errors.push('Missing Hedera profile configuration');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate MCP configuration
     */
    validateMCPConfig(content) {
        const errors = [];
        
        try {
            const config = JSON.parse(content);
            
            // Check for Hedera configuration section
            if (!config.hedera) {
                errors.push('Missing hedera configuration section');
            } else {
                // Check for Hedera services
                if (!config.hedera.services) {
                    errors.push('Missing hedera.services configuration');
                } else {
                    const requiredServices = ['hcs', 'hfs', 'hts', 'hscs'];
                    for (const service of requiredServices) {
                        if (!config.hedera.services[service]) {
                            errors.push(`Missing hedera.services.${service} configuration`);
                        }
                    }
                }
                
                // Check for Hedera accounts
                if (!config.hedera.accounts) {
                    errors.push('Missing hedera.accounts configuration');
                }
            }
            
            // Check for blockchain networks
            if (config.blockchain && config.blockchain.networks) {
                if (!config.blockchain.networks.hederaTestnet) {
                    errors.push('Missing hederaTestnet network configuration');
                }
            }
            
        } catch (parseError) {
            errors.push(`Invalid JSON format: ${parseError.message}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate Docker configuration
     */
    validateDockerConfig(content) {
        const errors = [];
        
        // Check for Hedera environment variables
        const requiredHederaVars = [
            'HEDERA_NETWORK',
            'HEDERA_RPC_URL',
            'HEDERA_ACCOUNT_ID',
            'HEDERA_PRIVATE_KEY'
        ];
        
        for (const varName of requiredHederaVars) {
            if (!content.includes(varName)) {
                errors.push(`Missing environment variable: ${varName}`);
            }
        }
        
        // Check for Hedera service IDs
        const hederaServices = [
            'HCS_TOPIC_ID',
            'HFS_BRIDGE_FILE_ID',
            'HTS_SHARE_TOKEN_ID'
        ];
        
        for (const service of hederaServices) {
            if (!content.includes(service)) {
                errors.push(`Missing Hedera service variable: ${service}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate deployment files
     */
    validateDeploymentFiles() {
        console.log(chalk.blue('\\n🔍 Validating deployment files...'));
        
        const deploymentFiles = [
            {
                path: 'netlify.toml',
                type: 'Netlify Configuration',
                validator: this.validateNetlifyConfig.bind(this)
            },
            {
                path: 'vercel.json',
                type: 'Vercel Configuration',
                validator: this.validateVercelConfig.bind(this)
            }
        ];
        
        for (const deploymentFile of deploymentFiles) {
            const result = this.validateConfigFile(deploymentFile);
            this.validationResults.deploymentFiles.push(result);
        }
    }

    /**
     * Validate Netlify configuration
     */
    validateNetlifyConfig(content) {
        const errors = [];
        
        // Check for Hedera environment variables
        const requiredVars = [
            'VITE_HEDERA_NETWORK',
            'VITE_HEDERA_RPC_URL',
            'VITE_HCS_TOPIC_ID',
            'VITE_HTS_SHARE_TOKEN_ID'
        ];
        
        for (const varName of requiredVars) {
            if (!content.includes(varName)) {
                errors.push(`Missing environment variable: ${varName}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate Vercel configuration
     */
    validateVercelConfig(content) {
        const errors = [];
        
        try {
            const config = JSON.parse(content);
            
            if (!config.env) {
                errors.push('Missing env configuration section');
                return { valid: false, errors: errors };
            }
            
            // Check for Hedera environment variables
            const requiredVars = [
                'VITE_HEDERA_NETWORK',
                'VITE_HEDERA_RPC_URL',
                'VITE_HCS_TOPIC_ID',
                'VITE_HTS_SHARE_TOKEN_ID',
                'VITE_ENABLE_HEDERA_INTEGRATION'
            ];
            
            for (const varName of requiredVars) {
                if (!config.env[varName]) {
                    errors.push(`Missing environment variable: ${varName}`);
                }
            }
            
        } catch (parseError) {
            errors.push(`Invalid JSON format: ${parseError.message}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\\n' + chalk.bold('📊 CONFIGURATION VALIDATION REPORT'));
        console.log('=' .repeat(60));
        
        // Summary statistics
        const totalFiles = this.validationResults.environmentFiles.length + 
                          this.validationResults.configFiles.length + 
                          this.validationResults.deploymentFiles.length;
        
        const validFiles = [
            ...this.validationResults.environmentFiles,
            ...this.validationResults.configFiles,
            ...this.validationResults.deploymentFiles
        ].filter(file => file.valid).length;
        
        console.log('\\n📈 SUMMARY:');
        console.log(`   Total Files Checked: ${totalFiles}`);
        console.log(`   Valid Files: ${chalk.green(validFiles)}`);
        console.log(`   Files with Issues: ${chalk.yellow(totalFiles - validFiles)}`);
        console.log(`   Errors: ${chalk.red(this.validationResults.errors.length)}`);
        console.log(`   Warnings: ${chalk.yellow(this.validationResults.warnings.length)}`);
        
        // Detailed results
        if (this.validationResults.errors.length > 0) {
            console.log('\\n❌ ERRORS:');
            for (const error of this.validationResults.errors) {
                console.log(chalk.red(`   • ${error}`));
            }
        }
        
        if (this.validationResults.warnings.length > 0) {
            console.log('\\n⚠️ WARNINGS:');
            for (const warning of this.validationResults.warnings) {
                console.log(chalk.yellow(`   • ${warning}`));
            }
        }
        
        // Recommendations
        console.log('\\n💡 RECOMMENDATIONS:');
        
        if (this.validationResults.errors.length > 0) {
            console.log('   1. Fix all errors before proceeding with deployment');
            console.log('   2. Run "npm run setup:hedera" to create missing services');
            console.log('   3. Run "npm run update:config" to update configuration files');
        } else if (this.validationResults.warnings.length > 0) {
            console.log('   1. Review warnings and create missing optional files if needed');
            console.log('   2. Configuration is ready for deployment');
        } else {
            console.log(chalk.green('   ✅ All configurations are valid and ready for deployment!'));
        }
        
        console.log('\\n🔗 USEFUL COMMANDS:');
        console.log('   npm run setup:hedera          # Setup Hedera environment');
        console.log('   npm run setup:hedera-services # Create Hedera services');
        console.log('   npm run update:config         # Update configuration files');
        console.log('   npm run test:hedera           # Test Hedera connection');
        
        console.log('\\n' + '=' .repeat(60));
        
        return this.validationResults.errors.length === 0;
    }

    /**
     * Run all validations
     */
    async validate() {
        console.log(chalk.bold('🔍 Starting Configuration Validation...'));
        console.log('=' .repeat(50));
        
        try {
            // Run all validations
            this.validateEnvironmentFiles();
            this.validateConfigFiles();
            this.validateDeploymentFiles();
            
            // Generate report
            const isValid = this.generateReport();
            
            if (isValid) {
                console.log(chalk.green('\\n🎉 All configurations are valid!'));
            } else {
                console.log(chalk.yellow('\\n⚠️ Some configurations need attention.'));
            }
            
            return isValid;
            
        } catch (error) {
            console.error(chalk.red('❌ Validation failed:'), error.message);
            return false;
        }
    }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const validator = new ConfigurationValidator();
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export default ConfigurationValidator;