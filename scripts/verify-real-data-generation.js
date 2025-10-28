#!/usr/bin/env node

/**
 * Verify Real Data Generation
 * Ensures all scripts generate real Hedera IDs and links, not placeholders
 */

const fs = require('fs');
const { execSync } = require('child_process');

class RealDataVerifier {
    constructor() {
        this.verificationResults = {
            timestamp: new Date().toISOString(),
            environment: 'hedera-testnet',
            checks: [],
            realData: {},
            issues: [],
            summary: {}
        };
    }

    checkEnvironmentSetup() {
        console.log('🔍 Checking environment setup...');
        
        const envFile = '.env.hedera';
        const checks = [];
        
        // Check if .env.hedera exists
        if (!fs.existsSync(envFile)) {
            checks.push({
                check: 'Environment File',
                status: 'MISSING',
                issue: '.env.hedera file not found',
                solution: 'Run npm run setup:complete to create environment'
            });
        } else {
            const envContent = fs.readFileSync(envFile, 'utf8');
            
            // Check for real account ID (not placeholder)
            if (envContent.includes('HEDERA_ACCOUNT_ID=0.0.XXXXXX') || !envContent.includes('HEDERA_ACCOUNT_ID=')) {
                checks.push({
                    check: 'Hedera Account ID',
                    status: 'PLACEHOLDER',
                    issue: 'Account ID is placeholder or missing',
                    solution: 'Run npm run setup:complete to generate real account'
                });
            } else {
                const accountMatch = envContent.match(/HEDERA_ACCOUNT_ID=(\d+\.\d+\.\d+)/);
                if (accountMatch) {
                    checks.push({
                        check: 'Hedera Account ID',
                        status: 'REAL',
                        value: accountMatch[1],
                        explorerUrl: `https://hashscan.io/testnet/account/${accountMatch[1]}`
                    });
                    this.verificationResults.realData.accountId = accountMatch[1];
                }
            }
            
            // Check for real private key
            if (envContent.includes('HEDERA_PRIVATE_KEY=302e020100...') || !envContent.includes('HEDERA_PRIVATE_KEY=')) {
                checks.push({
                    check: 'Hedera Private Key',
                    status: 'PLACEHOLDER',
                    issue: 'Private key is placeholder or missing',
                    solution: 'Run npm run setup:complete to convert ETH key'
                });
            } else {
                checks.push({
                    check: 'Hedera Private Key',
                    status: 'REAL',
                    value: 'Present (hidden for security)'
                });
            }
        }
        
        this.verificationResults.checks.push(...checks);
        console.log(`✅ Environment checks completed: ${checks.length} items checked`);
    }

    checkReportsForRealData() {
        console.log('📋 Checking reports for real data...');
        
        const reportsDir = 'reports';
        const checks = [];
        
        if (!fs.existsSync(reportsDir)) {
            checks.push({
                check: 'Reports Directory',
                status: 'MISSING',
                issue: 'No reports directory found',
                solution: 'Run the verification scripts to generate reports'
            });
        } else {
            const files = fs.readdirSync(reportsDir);
            const reportFiles = files.filter(file => file.endsWith('.json'));
            
            console.log(`📁 Found ${reportFiles.length} report files`);
            
            // Check HTS token report
            const htsReports = reportFiles.filter(file => file.includes('hts-token-report'));
            if (htsReports.length > 0) {
                try {
                    const htsData = JSON.parse(fs.readFileSync(`${reportsDir}/${htsReports[0]}`, 'utf8'));
                    
                    if (htsData.tokenId && htsData.tokenId !== '0.0.XXXXXX' && htsData.tokenId.match(/^\d+\.\d+\.\d+$/)) {
                        checks.push({
                            check: 'HTS Token ID',
                            status: 'REAL',
                            value: htsData.tokenId,
                            explorerUrl: `https://hashscan.io/testnet/token/${htsData.tokenId}`
                        });
                        this.verificationResults.realData.tokenId = htsData.tokenId;
                    } else {
                        checks.push({
                            check: 'HTS Token ID',
                            status: 'PLACEHOLDER',
                            issue: 'Token ID is placeholder or invalid format',
                            solution: 'Run npm run create:hts to create real token'
                        });
                    }
                } catch (error) {
                    checks.push({
                        check: 'HTS Token Report',
                        status: 'ERROR',
                        issue: `Failed to parse HTS report: ${error.message}`,
                        solution: 'Re-run npm run create:hts'
                    });
                }
            } else {
                checks.push({
                    check: 'HTS Token Report',
                    status: 'MISSING',
                    issue: 'No HTS token report found',
                    solution: 'Run npm run create:hts'
                });
            }
            
            // Check HCS topic report
            const hcsReports = reportFiles.filter(file => file.includes('hcs-ai-topic-report'));
            if (hcsReports.length > 0) {
                try {
                    const hcsData = JSON.parse(fs.readFileSync(`${reportsDir}/${hcsReports[0]}`, 'utf8'));
                    
                    if (hcsData.topicId && hcsData.topicId !== '0.0.XXXXXX' && hcsData.topicId.match(/^\d+\.\d+\.\d+$/)) {
                        checks.push({
                            check: 'HCS Topic ID',
                            status: 'REAL',
                            value: hcsData.topicId,
                            explorerUrl: `https://hashscan.io/testnet/topic/${hcsData.topicId}`
                        });
                        this.verificationResults.realData.topicId = hcsData.topicId;
                    } else {
                        checks.push({
                            check: 'HCS Topic ID',
                            status: 'PLACEHOLDER',
                            issue: 'Topic ID is placeholder or invalid format',
                            solution: 'Run npm run create:hcs to create real topic'
                        });
                    }
                } catch (error) {
                    checks.push({
                        check: 'HCS Topic Report',
                        status: 'ERROR',
                        issue: `Failed to parse HCS report: ${error.message}`,
                        solution: 'Re-run npm run create:hcs'
                    });
                }
            } else {
                checks.push({
                    check: 'HCS Topic Report',
                    status: 'MISSING',
                    issue: 'No HCS topic report found',
                    solution: 'Run npm run create:hcs'
                });
            }
            
            // Check HFS storage report
            const hfsReports = reportFiles.filter(file => file.includes('hfs-storage-report'));
            if (hfsReports.length > 0) {
                try {
                    const hfsData = JSON.parse(fs.readFileSync(`${reportsDir}/${hfsReports[0]}`, 'utf8'));
                    
                    if (hfsData.files && hfsData.files.length > 0) {
                        const realFiles = hfsData.files.filter(file => 
                            file.fileId && file.fileId !== '0.0.XXXXXX' && file.fileId.match(/^\d+\.\d+\.\d+$/)
                        );
                        
                        if (realFiles.length > 0) {
                            checks.push({
                                check: 'HFS File IDs',
                                status: 'REAL',
                                value: `${realFiles.length} files`,
                                explorerUrl: `https://hashscan.io/testnet/file/${realFiles[0].fileId}`
                            });
                            this.verificationResults.realData.fileIds = realFiles.map(f => f.fileId);
                        } else {
                            checks.push({
                                check: 'HFS File IDs',
                                status: 'PLACEHOLDER',
                                issue: 'File IDs are placeholders or invalid format',
                                solution: 'Run npm run store:hfs to create real files'
                            });
                        }
                    }
                } catch (error) {
                    checks.push({
                        check: 'HFS Storage Report',
                        status: 'ERROR',
                        issue: `Failed to parse HFS report: ${error.message}`,
                        solution: 'Re-run npm run store:hfs'
                    });
                }
            } else {
                checks.push({
                    check: 'HFS Storage Report',
                    status: 'MISSING',
                    issue: 'No HFS storage report found',
                    solution: 'Run npm run store:hfs'
                });
            }
        }
        
        this.verificationResults.checks.push(...checks);
        console.log(`✅ Reports checks completed: ${checks.length} items checked`);
    }

    checkTransactionHashes() {
        console.log('🔗 Checking for real transaction hashes...');
        
        const checks = [];
        const reportsDir = 'reports';
        
        if (fs.existsSync(reportsDir)) {
            const files = fs.readdirSync(reportsDir);
            const reportFiles = files.filter(file => file.endsWith('.json'));
            
            let totalTransactions = 0;
            let realTransactions = 0;
            
            for (const file of reportFiles) {
                try {
                    const data = JSON.parse(fs.readFileSync(`${reportsDir}/${file}`, 'utf8'));
                    
                    // Look for transaction hashes in various formats
                    const findTransactionHashes = (obj, path = '') => {
                        if (typeof obj !== 'object' || obj === null) return;
                        
                        for (const [key, value] of Object.entries(obj)) {
                            const currentPath = path ? `${path}.${key}` : key;
                            
                            if (typeof value === 'string') {
                                // Check for Hedera transaction hash format
                                if (key.toLowerCase().includes('hash') && 
                                    (value.includes('@') || value.match(/^\d+\.\d+\.\d+@\d+\.\d+$/))) {
                                    totalTransactions++;
                                    if (!value.includes('HASH') && !value.includes('XXXXXX')) {
                                        realTransactions++;
                                    }
                                }
                            } else if (typeof value === 'object') {
                                findTransactionHashes(value, currentPath);
                            }
                        }
                    };
                    
                    findTransactionHashes(data);
                    
                } catch (error) {
                    // Skip invalid JSON files
                }
            }
            
            if (totalTransactions > 0) {
                checks.push({
                    check: 'Transaction Hashes',
                    status: realTransactions === totalTransactions ? 'REAL' : 'MIXED',
                    value: `${realTransactions}/${totalTransactions} real hashes`,
                    issue: realTransactions < totalTransactions ? 'Some transaction hashes are placeholders' : null,
                    solution: realTransactions < totalTransactions ? 'Re-run verification scripts to generate real transactions' : null
                });
            } else {
                checks.push({
                    check: 'Transaction Hashes',
                    status: 'MISSING',
                    issue: 'No transaction hashes found in reports',
                    solution: 'Run verification scripts to generate transactions'
                });
            }
        }
        
        this.verificationResults.checks.push(...checks);
        console.log(`✅ Transaction hash checks completed`);
    }

    generateActionPlan() {
        console.log('📋 Generating action plan for real data generation...');
        
        const issues = this.verificationResults.checks.filter(check => 
            check.status === 'PLACEHOLDER' || check.status === 'MISSING' || check.status === 'ERROR'
        );
        
        if (issues.length === 0) {
            console.log('🎉 All checks passed! Real data is properly generated.');
            return;
        }
        
        console.log(`⚠️ Found ${issues.length} issues that need to be resolved:`);
        
        const actionPlan = {
            priority1: [], // Critical issues
            priority2: [], // Important issues
            priority3: []  // Minor issues
        };
        
        for (const issue of issues) {
            const action = {
                issue: issue.issue,
                solution: issue.solution,
                check: issue.check
            };
            
            if (issue.check.includes('Account') || issue.check.includes('Private Key')) {
                actionPlan.priority1.push(action);
            } else if (issue.check.includes('Token') || issue.check.includes('Topic')) {
                actionPlan.priority2.push(action);
            } else {
                actionPlan.priority3.push(action);
            }
        }
        
        console.log('\n🚨 PRIORITY 1 - Critical (Must fix first):');
        actionPlan.priority1.forEach((action, index) => {
            console.log(`${index + 1}. ${action.check}: ${action.issue}`);
            console.log(`   Solution: ${action.solution}\n`);
        });
        
        console.log('⚠️ PRIORITY 2 - Important:');
        actionPlan.priority2.forEach((action, index) => {
            console.log(`${index + 1}. ${action.check}: ${action.issue}`);
            console.log(`   Solution: ${action.solution}\n`);
        });
        
        console.log('ℹ️ PRIORITY 3 - Minor:');
        actionPlan.priority3.forEach((action, index) => {
            console.log(`${index + 1}. ${action.check}: ${action.issue}`);
            console.log(`   Solution: ${action.solution}\n`);
        });
        
        // Generate recommended command sequence
        console.log('🚀 RECOMMENDED COMMAND SEQUENCE:');
        console.log('1. npm run validate:env');
        console.log('2. npm run setup:complete');
        console.log('3. npm run create:hts');
        console.log('4. npm run create:hcs');
        console.log('5. npm run create:metadata');
        console.log('6. npm run store:hfs');
        console.log('7. npm run user:journey');
        console.log('8. npm run collect:links');
        
        this.verificationResults.issues = issues;
        this.verificationResults.actionPlan = actionPlan;
    }

    generateSummary() {
        const totalChecks = this.verificationResults.checks.length;
        const realDataChecks = this.verificationResults.checks.filter(c => c.status === 'REAL').length;
        const placeholderChecks = this.verificationResults.checks.filter(c => c.status === 'PLACEHOLDER').length;
        const missingChecks = this.verificationResults.checks.filter(c => c.status === 'MISSING').length;
        const errorChecks = this.verificationResults.checks.filter(c => c.status === 'ERROR').length;
        
        this.verificationResults.summary = {
            totalChecks,
            realDataChecks,
            placeholderChecks,
            missingChecks,
            errorChecks,
            realDataPercentage: ((realDataChecks / totalChecks) * 100).toFixed(1) + '%',
            readyForDemo: realDataChecks === totalChecks,
            criticalIssues: placeholderChecks + missingChecks + errorChecks
        };
        
        console.log('\n📊 VERIFICATION SUMMARY:');
        console.log('═'.repeat(50));
        console.log(`Total Checks: ${totalChecks}`);
        console.log(`Real Data: ${realDataChecks} (${this.verificationResults.summary.realDataPercentage})`);
        console.log(`Placeholders: ${placeholderChecks}`);
        console.log(`Missing: ${missingChecks}`);
        console.log(`Errors: ${errorChecks}`);
        console.log(`Ready for Demo: ${this.verificationResults.summary.readyForDemo ? '✅ YES' : '❌ NO'}`);
        
        if (this.verificationResults.summary.readyForDemo) {
            console.log('\n🎉 CONGRATULATIONS! All data is real and ready for hackathon demonstration!');
        } else {
            console.log(`\n⚠️ ${this.verificationResults.summary.criticalIssues} issues need to be resolved before demo.`);
        }
    }

    async saveVerificationReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = `reports/real-data-verification-${timestamp}.json`;
        
        if (!fs.existsSync('reports')) {
            fs.mkdirSync('reports', { recursive: true });
        }
        
        fs.writeFileSync(reportFile, JSON.stringify(this.verificationResults, null, 2));
        console.log(`\n📋 Verification report saved: ${reportFile}`);
        
        return reportFile;
    }

    async execute() {
        console.log('🔍 Starting Real Data Verification...\n');
        
        try {
            // Check environment setup
            this.checkEnvironmentSetup();
            
            // Check reports for real data
            this.checkReportsForRealData();
            
            // Check transaction hashes
            this.checkTransactionHashes();
            
            // Generate action plan
            this.generateActionPlan();
            
            // Generate summary
            this.generateSummary();
            
            // Save report
            const reportFile = await this.saveVerificationReport();
            
            return {
                success: true,
                verificationResults: this.verificationResults,
                reportFile,
                readyForDemo: this.verificationResults.summary.readyForDemo
            };
            
        } catch (error) {
            console.error('\n❌ Real Data Verification Failed!');
            console.error('Error:', error.message);
            
            return {
                success: false,
                error: error.message,
                verificationResults: this.verificationResults
            };
        }
    }
}

// Execute if called directly
if (require.main === module) {
    const verifier = new RealDataVerifier();
    verifier.execute()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Real Data Verification completed!');
                if (result.readyForDemo) {
                    console.log('🎉 System is ready for hackathon demonstration!');
                    process.exit(0);
                } else {
                    console.log('⚠️ Issues found - follow the action plan above.');
                    process.exit(1);
                }
            } else {
                console.error('\n❌ Real Data Verification failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = RealDataVerifier;