#!/usr/bin/env node

/**
 * Execute Complete Verification with Real Data
 * Runs all verification scripts in correct order to ensure real data generation
 */

const { execSync } = require('child_process');
const fs = require('fs');

class CompleteVerificationExecutor {
    constructor() {
        this.executionLog = [];
        this.startTime = Date.now();
    }

    logStep(step, command, status, duration, output = '') {
        const logEntry = {
            step,
            command,
            status,
            duration,
            timestamp: new Date().toISOString(),
            output: output.substring(0, 500) // Limit output length
        };
        
        this.executionLog.push(logEntry);
        
        const statusIcon = status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '⏳';
        console.log(`${statusIcon} Step ${step}: ${command} (${duration}ms)`);
        
        if (status === 'FAILED') {
            console.error(`   Error: ${output.substring(0, 200)}`);
        }
    }

    async executeCommand(step, command, description) {
        console.log(`\n🚀 Step ${step}: ${description}`);
        console.log(`📋 Command: ${command}`);
        
        const startTime = Date.now();
        
        try {
            const output = execSync(command, { 
                encoding: 'utf8',
                timeout: 300000, // 5 minutes timeout
                stdio: 'pipe'
            });
            
            const duration = Date.now() - startTime;
            this.logStep(step, command, 'SUCCESS', duration, output);
            
            return { success: true, output, duration };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logStep(step, command, 'FAILED', duration, error.message);
            
            return { success: false, error: error.message, duration };
        }
    }

    async executeCompleteVerification() {
        console.log('🎯 Starting Complete Verification with Real Data Generation...\n');
        console.log('This will execute all verification scripts in the correct order to ensure');
        console.log('that REAL Hedera IDs and transaction hashes are generated (not placeholders).\n');
        console.log('⏱️ Estimated time: 10-15 minutes\n');
        console.log('═'.repeat(80) + '\n');

        const steps = [
            {
                step: 1,
                command: 'npm run verify:real',
                description: 'Check current real data status',
                critical: false
            },
            {
                step: 2,
                command: 'npm run validate:env',
                description: 'Validate environment configuration',
                critical: true
            },
            {
                step: 3,
                command: 'npm run setup:complete',
                description: 'Setup complete infrastructure with real accounts',
                critical: true
            },
            {
                step: 4,
                command: 'npm run create:hts',
                description: 'Create real HTS token with actual token ID',
                critical: true
            },
            {
                step: 5,
                command: 'npm run mint:hts',
                description: 'Execute real HTS mint operations',
                critical: true
            },
            {
                step: 6,
                command: 'npm run burn:hts',
                description: 'Execute real HTS burn operations',
                critical: true
            },
            {
                step: 7,
                command: 'npm run create:hcs',
                description: 'Create real HCS topic with actual topic ID',
                critical: true
            },
            {
                step: 8,
                command: 'npm run submit:ai',
                description: 'Submit real AI decisions to HCS',
                critical: true
            },
            {
                step: 9,
                command: 'npm run validate:hcs',
                description: 'Validate HCS message integrity',
                critical: false
            },
            {
                step: 10,
                command: 'npm run create:metadata',
                description: 'Generate real AI model metadata',
                critical: true
            },
            {
                step: 11,
                command: 'npm run store:hfs',
                description: 'Store metadata on HFS with real file IDs',
                critical: true
            },
            {
                step: 12,
                command: 'npm run cross:reference',
                description: 'Cross-reference HFS files in HCS messages',
                critical: true
            },
            {
                step: 13,
                command: 'npm run user:journey',
                description: 'Execute complete user journey with real transactions',
                critical: true
            },
            {
                step: 14,
                command: 'npm run measure:hedera',
                description: 'Measure Hedera performance with real operations',
                critical: false
            },
            {
                step: 15,
                command: 'npm run measure:bsc',
                description: 'Execute BSC comparison operations',
                critical: false
            },
            {
                step: 16,
                command: 'npm run compare:performance',
                description: 'Generate performance comparison report',
                critical: false
            },
            {
                step: 17,
                command: 'npm run collect:links',
                description: 'Collect and validate all verification links',
                critical: true
            },
            {
                step: 18,
                command: 'npm run verify:real',
                description: 'Final verification of real data generation',
                critical: true
            }
        ];

        let successfulSteps = 0;
        let failedSteps = 0;
        let criticalFailures = 0;

        for (const stepConfig of steps) {
            const result = await this.executeCommand(
                stepConfig.step,
                stepConfig.command,
                stepConfig.description
            );

            if (result.success) {
                successfulSteps++;
            } else {
                failedSteps++;
                if (stepConfig.critical) {
                    criticalFailures++;
                    console.error(`\n🚨 CRITICAL FAILURE in Step ${stepConfig.step}!`);
                    console.error(`This step is required for real data generation.`);
                    
                    // Ask user if they want to continue or stop
                    console.log('\nOptions:');
                    console.log('1. Continue with remaining steps (may result in placeholder data)');
                    console.log('2. Stop execution and fix the issue');
                    
                    // For automated execution, we'll continue but log the critical failure
                    console.log('⚠️ Continuing with remaining steps...\n');
                }
            }

            // Small delay between steps
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const totalTime = Date.now() - this.startTime;

        console.log('\n' + '═'.repeat(80));
        console.log('🎊 COMPLETE VERIFICATION EXECUTION FINISHED!');
        console.log('═'.repeat(80));
        console.log(`📊 Total Steps: ${steps.length}`);
        console.log(`✅ Successful: ${successfulSteps}`);
        console.log(`❌ Failed: ${failedSteps}`);
        console.log(`🚨 Critical Failures: ${criticalFailures}`);
        console.log(`⏱️ Total Time: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
        console.log(`📈 Success Rate: ${((successfulSteps / steps.length) * 100).toFixed(1)}%`);

        if (criticalFailures === 0) {
            console.log('\n🎉 SUCCESS! All critical steps completed successfully!');
            console.log('✅ Real Hedera IDs and transaction hashes have been generated!');
            console.log('🚀 System is ready for hackathon demonstration!');
        } else {
            console.log(`\n⚠️ WARNING: ${criticalFailures} critical failures detected!`);
            console.log('❌ Some data may still be placeholders.');
            console.log('🔧 Review the execution log and re-run failed steps.');
        }

        // Save execution log
        await this.saveExecutionLog(totalTime, successfulSteps, failedSteps, criticalFailures);

        return {
            success: criticalFailures === 0,
            totalSteps: steps.length,
            successfulSteps,
            failedSteps,
            criticalFailures,
            totalTime,
            readyForDemo: criticalFailures === 0
        };
    }

    async saveExecutionLog(totalTime, successfulSteps, failedSteps, criticalFailures) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = `reports/complete-verification-execution-${timestamp}.json`;

        if (!fs.existsSync('reports')) {
            fs.mkdirSync('reports', { recursive: true });
        }

        const executionReport = {
            timestamp: new Date().toISOString(),
            operation: 'Complete Verification Execution',
            totalTime,
            summary: {
                totalSteps: this.executionLog.length,
                successfulSteps,
                failedSteps,
                criticalFailures,
                successRate: ((successfulSteps / this.executionLog.length) * 100).toFixed(1) + '%',
                readyForDemo: criticalFailures === 0
            },
            executionLog: this.executionLog,
            recommendations: this.generateRecommendations(criticalFailures)
        };

        fs.writeFileSync(logFile, JSON.stringify(executionReport, null, 2));
        console.log(`\n📋 Execution log saved: ${logFile}`);

        return logFile;
    }

    generateRecommendations(criticalFailures) {
        const recommendations = [];

        if (criticalFailures === 0) {
            recommendations.push('🎉 All critical steps completed successfully!');
            recommendations.push('✅ System is ready for hackathon demonstration');
            recommendations.push('🔗 All verification links should now contain real data');
            recommendations.push('📋 Run npm run verify:real to confirm all data is real');
        } else {
            recommendations.push('🔧 Review failed critical steps in the execution log');
            recommendations.push('🔄 Re-run failed steps individually to resolve issues');
            recommendations.push('🌐 Check network connectivity to Hedera testnet');
            recommendations.push('💰 Verify HBAR balance is sufficient for operations');
            recommendations.push('🔑 Confirm environment variables are properly set');
        }

        recommendations.push('📊 Use npm run collect:links to generate final verification report');
        recommendations.push('🎯 Test all Hashscan explorer links before demonstration');

        return recommendations;
    }

    async execute() {
        return await this.executeCompleteVerification();
    }
}

// Execute if called directly
if (require.main === module) {
    const executor = new CompleteVerificationExecutor();
    executor.execute()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Complete Verification execution completed successfully!');
                console.log('🎉 System is ready for hackathon demonstration!');
                process.exit(0);
            } else {
                console.error('\n⚠️ Complete Verification completed with issues!');
                console.error('🔧 Review the execution log and fix critical failures.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = CompleteVerificationExecutor;