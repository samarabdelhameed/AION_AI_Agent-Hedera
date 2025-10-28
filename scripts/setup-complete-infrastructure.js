#!/usr/bin/env node

/**
 * Complete Infrastructure Setup
 * Sets up the complete Hedera verification infrastructure
 */

const { testHederaConnection } = require('./test-hedera-connection');
const TestAccountCreator = require('./create-test-accounts');
const fs = require('fs');

require('dotenv').config({ path: '.env.hedera' });

class CompleteInfrastructureSetup {
    constructor() {
        this.setupSteps = [
            { name: 'Environment Validation', fn: this.validateEnvironment.bind(this) },
            { name: 'Hedera Connection Test', fn: this.testConnection.bind(this) },
            { name: 'Test Account Creation', fn: this.createTestAccounts.bind(this) },
            { name: 'Infrastructure Validation', fn: this.validateInfrastructure.bind(this) },
            { name: 'Generate Setup Report', fn: this.generateSetupReport.bind(this) }
        ];
        this.results = {};
    }

    async validateEnvironment() {
        console.log('🔍 Validating environment...');
        
        const requiredVars = [
            'HEDERA_NETWORK',
            'HEDERA_RPC_URL',
            'HEDERA_ACCOUNT_ID',
            'HEDERA_PRIVATE_KEY',
            'PRIVATE_KEY',
            'ADMIN_ADDRESS'
        ];
        
        const missing = [];
        for (const varName of requiredVars) {
            if (!process.env[varName] || process.env[varName] === '0.0.YOUR_ACCOUNT_ID') {
                missing.push(varName);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
        
        console.log('✅ Environment validation passed');
        return { status: 'success', message: 'All required environment variables are set' };
    }

    async testConnection() {
        console.log('🌐 Testing Hedera connection...');
        
        const success = await testHederaConnection();
        if (!success) {
            throw new Error('Hedera connection test failed');
        }
        
        console.log('✅ Hedera connection test passed');
        return { status: 'success', message: 'Successfully connected to Hedera testnet' };
    }

    async createTestAccounts() {
        console.log('👥 Creating test accounts...');
        
        const creator = new TestAccountCreator();
        
        try {
            const initialized = await creator.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize test account creator');
            }
            
            const accounts = await creator.createAllTestAccounts();
            await creator.validateAccountBalances();
            const accountsData = await creator.saveAccountsToFile();
            
            console.log('✅ Test accounts created successfully');
            return { 
                status: 'success', 
                message: `Created ${accounts.length} test accounts`,
                data: accountsData
            };
            
        } finally {
            await creator.cleanup();
        }
    }

    async validateInfrastructure() {
        console.log('🔧 Validating complete infrastructure...');
        
        const validations = [];
        
        // Check if test accounts file exists
        if (fs.existsSync('scripts/test-accounts.json')) {
            const accountsData = JSON.parse(fs.readFileSync('scripts/test-accounts.json', 'utf8'));
            validations.push({
                check: 'Test Accounts File',
                status: 'pass',
                details: `${accountsData.accounts.length} accounts created`
            });
        } else {
            validations.push({
                check: 'Test Accounts File',
                status: 'fail',
                details: 'Test accounts file not found'
            });
        }
        
        // Check environment file
        if (fs.existsSync('.env.hedera')) {
            const envContent = fs.readFileSync('.env.hedera', 'utf8');
            const hasTestAccounts = envContent.includes('USER1_ACCOUNT_ID');
            validations.push({
                check: 'Environment Configuration',
                status: hasTestAccounts ? 'pass' : 'partial',
                details: hasTestAccounts ? 'Complete with test accounts' : 'Basic configuration only'
            });
        } else {
            validations.push({
                check: 'Environment Configuration',
                status: 'fail',
                details: 'Environment file not found'
            });
        }
        
        // Check required scripts
        const requiredScripts = [
            'scripts/setup-verification-environment.js',
            'scripts/test-hedera-connection.js',
            'scripts/create-test-accounts.js'
        ];
        
        for (const script of requiredScripts) {
            validations.push({
                check: `Script: ${script}`,
                status: fs.existsSync(script) ? 'pass' : 'fail',
                details: fs.existsSync(script) ? 'Available' : 'Missing'
            });
        }
        
        const failedValidations = validations.filter(v => v.status === 'fail');
        if (failedValidations.length > 0) {
            throw new Error(`Infrastructure validation failed: ${failedValidations.map(v => v.check).join(', ')}`);
        }
        
        console.log('✅ Infrastructure validation passed');
        return { 
            status: 'success', 
            message: 'Infrastructure is properly configured',
            validations: validations
        };
    }

    async generateSetupReport() {
        console.log('📋 Generating setup report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            status: 'SUCCESS',
            network: process.env.HEDERA_NETWORK,
            operatorAccount: process.env.HEDERA_ACCOUNT_ID,
            setupSteps: this.results,
            infrastructure: {
                environment: 'configured',
                connection: 'tested',
                testAccounts: 'created',
                scripts: 'available'
            },
            nextSteps: [
                'Run verification link generation',
                'Execute end-to-end testing',
                'Generate hackathon demonstration'
            ]
        };
        
        const reportPath = 'scripts/infrastructure-setup-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`✅ Setup report generated: ${reportPath}`);
        return { 
            status: 'success', 
            message: 'Setup report generated successfully',
            reportPath: reportPath
        };
    }

    async runCompleteSetup() {
        console.log('🎯 Starting Complete Infrastructure Setup');
        console.log('=' .repeat(60));
        
        for (let i = 0; i < this.setupSteps.length; i++) {
            const step = this.setupSteps[i];
            
            try {
                console.log(`\n📍 Step ${i + 1}/${this.setupSteps.length}: ${step.name}`);
                console.log('-' .repeat(40));
                
                const result = await step.fn();
                this.results[step.name] = result;
                
                console.log(`✅ ${step.name} completed successfully`);
                
            } catch (error) {
                console.error(`❌ ${step.name} failed:`, error.message);
                this.results[step.name] = { 
                    status: 'error', 
                    message: error.message 
                };
                throw error;
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 Complete Infrastructure Setup SUCCESSFUL!');
        console.log('');
        console.log('📋 Summary:');
        console.log(`   Network: ${process.env.HEDERA_NETWORK}`);
        console.log(`   Operator: ${process.env.HEDERA_ACCOUNT_ID}`);
        console.log('   Test Accounts: Created and funded');
        console.log('   Scripts: All available');
        console.log('');
        console.log('🚀 Ready for Hedera verification link generation!');
        console.log('   Next: npm run verify:hedera');
        
        return this.results;
    }
}

// Main execution
async function main() {
    const setup = new CompleteInfrastructureSetup();
    
    try {
        await setup.runCompleteSetup();
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Infrastructure setup failed:', error.message);
        console.log('\n🔧 Please fix the issues and run again');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CompleteInfrastructureSetup;