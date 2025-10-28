#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables and services are properly configured
 */

const fs = require('fs');
const path = require('path');

class EnvironmentValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.requiredEnvVars = [
            'PRIVATE_KEY',
            'ADMIN_ADDRESS',
            'HEDERA_NETWORK',
            'HEDERA_RPC_URL'
        ];
        this.requiredFiles = [
            '.env.hedera',
            'package.json',
            'scripts/setup-verification-environment.js'
        ];
    }

    validateEnvironmentVariables() {
        console.log('🔍 Validating environment variables...');
        
        // Load .env.hedera file
        const envPath = '.env.hedera';
        if (!fs.existsSync(envPath)) {
            this.errors.push(`Missing ${envPath} file`);
            return false;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        
        // Parse environment variables
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, value] = trimmed.split('=');
                if (key && value) {
                    envVars[key] = value;
                }
            }
        });

        // Check required variables
        for (const varName of this.requiredEnvVars) {
            if (!envVars[varName] || envVars[varName].trim() === '') {
                this.errors.push(`Missing or empty ${varName}`);
            } else {
                console.log(`✅ ${varName}: Set`);
            }
        }

        // Validate specific formats
        if (envVars.PRIVATE_KEY && !envVars.PRIVATE_KEY.startsWith('0x')) {
            this.errors.push('PRIVATE_KEY must start with 0x');
        }

        if (envVars.ADMIN_ADDRESS && !envVars.ADMIN_ADDRESS.startsWith('0x')) {
            this.errors.push('ADMIN_ADDRESS must start with 0x');
        }

        if (envVars.HEDERA_NETWORK && !['testnet', 'mainnet'].includes(envVars.HEDERA_NETWORK)) {
            this.errors.push('HEDERA_NETWORK must be "testnet" or "mainnet"');
        }

        return this.errors.length === 0;
    }

    validateRequiredFiles() {
        console.log('📁 Validating required files...');
        
        for (const filePath of this.requiredFiles) {
            if (!fs.existsSync(filePath)) {
                this.errors.push(`Missing required file: ${filePath}`);
            } else {
                console.log(`✅ ${filePath}: Exists`);
            }
        }

        return this.errors.length === 0;
    }

    validatePackageDependencies() {
        console.log('📦 Validating package dependencies...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const requiredDeps = ['@hashgraph/sdk', 'ethers'];
            
            for (const dep of requiredDeps) {
                if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
                    this.errors.push(`Missing dependency: ${dep}`);
                } else {
                    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
                }
            }
        } catch (error) {
            this.errors.push(`Failed to read package.json: ${error.message}`);
        }

        return this.errors.length === 0;
    }

    validateNodeModules() {
        console.log('🔧 Validating node modules...');
        
        const nodeModulesPath = 'node_modules';
        if (!fs.existsSync(nodeModulesPath)) {
            this.errors.push('node_modules directory not found. Run "npm install"');
            return false;
        }

        const requiredModules = ['@hashgraph/sdk', 'ethers'];
        for (const module of requiredModules) {
            const modulePath = path.join(nodeModulesPath, module);
            if (!fs.existsSync(modulePath)) {
                this.errors.push(`Module not installed: ${module}. Run "npm install"`);
            } else {
                console.log(`✅ ${module}: Installed`);
            }
        }

        return this.errors.length === 0;
    }

    validateDirectoryStructure() {
        console.log('📂 Validating directory structure...');
        
        const requiredDirs = [
            'scripts',
            'contracts',
            'mcp_agent',
            'frontend'
        ];

        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                this.warnings.push(`Directory not found: ${dir}`);
            } else {
                console.log(`✅ ${dir}/: Exists`);
            }
        }

        return true;
    }

    generateValidationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            status: this.errors.length === 0 ? 'PASS' : 'FAIL',
            errors: this.errors,
            warnings: this.warnings,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };

        const reportPath = 'scripts/validation-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📋 Validation report saved to: ${reportPath}`);
        
        return report;
    }

    async run() {
        console.log('🎯 Starting Environment Validation');
        console.log('=' .repeat(50));

        // Run all validations
        this.validateEnvironmentVariables();
        this.validateRequiredFiles();
        this.validatePackageDependencies();
        this.validateNodeModules();
        this.validateDirectoryStructure();

        // Generate report
        const report = this.generateValidationReport();

        console.log('=' .repeat(50));
        
        if (this.errors.length === 0) {
            console.log('🎉 Environment validation PASSED!');
            console.log('✅ All required components are properly configured');
            
            if (this.warnings.length > 0) {
                console.log('');
                console.log('⚠️  Warnings:');
                this.warnings.forEach(warning => console.log(`   - ${warning}`));
            }
            
            console.log('');
            console.log('🚀 Ready to run Hedera verification setup!');
            console.log('   Run: npm run setup:hedera');
            
            return true;
        } else {
            console.log('❌ Environment validation FAILED!');
            console.log('');
            console.log('🔧 Errors to fix:');
            this.errors.forEach(error => console.log(`   - ${error}`));
            
            if (this.warnings.length > 0) {
                console.log('');
                console.log('⚠️  Warnings:');
                this.warnings.forEach(warning => console.log(`   - ${warning}`));
            }
            
            return false;
        }
    }
}

// Main execution
async function main() {
    const validator = new EnvironmentValidator();
    const success = await validator.run();
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = EnvironmentValidator;