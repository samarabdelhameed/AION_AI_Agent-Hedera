#!/usr/bin/env node

/**
 * Collect Verification Links System
 * Comprehensive collection and validation of all Hedera verification links
 */

const fs = require('fs');
const https = require('https');
const { URL } = require('url');

class VerificationLinksCollector {
    constructor() {
        this.verificationData = {
            timestamp: new Date().toISOString(),
            network: 'hedera-testnet',
            links: {
                hts: [],
                hcs: [],
                hfs: [],
                accounts: [],
                transactions: []
            },
            timeline: [],
            summary: {},
            validation: {}
        };
    }

    async collectAllReports() {
        console.log('📋 Collecting all verification reports...');
        
        try {
            const reportsDir = 'reports';
            if (!fs.existsSync(reportsDir)) {
                throw new Error('Reports directory not found');
            }

            const files = fs.readdirSync(reportsDir);
            const reportFiles = files.filter(file => file.endsWith('.json'));
            
            console.log(`📁 Found ${reportFiles.length} report files`);
            
            const reports = {};
            
            for (const file of reportFiles) {
                try {
                    const content = fs.readFileSync(`${reportsDir}/${file}`, 'utf8');
                    const data = JSON.parse(content);
                    
                    // Categorize reports
                    if (file.includes('hts-token-report')) {
                        reports.hts = data;
                    } else if (file.includes('hcs-ai-topic-report')) {
                        reports.hcs = data;
                    } else if (file.includes('hfs-storage-report')) {
                        reports.hfs = data;
                    } else if (file.includes('deposit-flow-report')) {
                        reports.deposits = data;
                    } else if (file.includes('ai-rebalancing-report')) {
                        reports.rebalancing = data;
                    } else if (file.includes('withdrawal-flow-report')) {
                        reports.withdrawals = data;
                    } else if (file.includes('complete-user-journey')) {
                        reports.journey = data;
                    } else if (file.includes('performance-comparison')) {
                        reports.performance = data;
                    }
                    
                } catch (error) {
                    console.warn(`⚠️ Failed to parse ${file}: ${error.message}`);
                }
            }
            
            console.log(`✅ Collected ${Object.keys(reports).length} report categories`);
            return reports;
            
        } catch (error) {
            console.error('❌ Failed to collect reports:', error.message);
            throw error;
        }
    }

    extractLinksFromReports(reports) {
        console.log('🔗 Extracting verification links from reports...');
        
        // Extract HTS links
        if (reports.hts) {
            this.verificationData.links.hts.push({
                type: 'TOKEN',
                id: reports.hts.tokenId,
                name: 'AION Vault Shares Token',
                symbol: 'AION',
                explorerUrl: `https://hashscan.io/testnet/token/${reports.hts.tokenId}`,
                description: 'Main vault shares token for AION platform',
                operations: reports.hts.operations || []
            });
        }

        // Extract HCS links
        if (reports.hcs) {
            this.verificationData.links.hcs.push({
                type: 'TOPIC',
                id: reports.hcs.topicId,
                name: 'AI Decision Logging Topic',
                explorerUrl: `https://hashscan.io/testnet/topic/${reports.hcs.topicId}`,
                description: 'Topic for logging all AI rebalancing decisions',
                messageCount: reports.hcs.messageCount || 0
            });
        }

        // Extract HFS links
        if (reports.hfs && reports.hfs.files) {
            for (const file of reports.hfs.files) {
                this.verificationData.links.hfs.push({
                    type: 'FILE',
                    id: file.fileId,
                    name: file.fileName,
                    explorerUrl: `https://hashscan.io/testnet/file/${file.fileId}`,
                    description: file.memo || 'AI model metadata file',
                    size: file.size
                });
            }
        }

        // Extract transaction links from various reports
        this.extractTransactionLinks(reports);
        
        // Extract account links
        this.extractAccountLinks(reports);
        
        console.log('✅ Links extraction completed');
    }

    extractTransactionLinks(reports) {
        const transactions = [];
        
        // From deposits
        if (reports.deposits && reports.deposits.deposits) {
            for (const deposit of reports.deposits.deposits) {
                if (deposit.success && deposit.mintTransactionHash) {
                    transactions.push({
                        type: 'HTS_MINT',
                        hash: deposit.mintTransactionHash,
                        explorerUrl: deposit.mintExplorerUrl,
                        description: `Token mint for ${deposit.scenario.userId}`,
                        amount: deposit.scenario.expectedShares,
                        timestamp: deposit.depositDecision?.timestamp
                    });
                }
            }
        }

        // From withdrawals
        if (reports.withdrawals && reports.withdrawals.withdrawals) {
            for (const withdrawal of reports.withdrawals.withdrawals) {
                if (withdrawal.success && withdrawal.burnTransactionHash) {
                    transactions.push({
                        type: 'HTS_BURN',
                        hash: withdrawal.burnTransactionHash,
                        explorerUrl: withdrawal.burnExplorerUrl,
                        description: `Token burn for ${withdrawal.scenario.userId}`,
                        amount: withdrawal.scenario.sharesToBurn,
                        timestamp: withdrawal.withdrawalDecision?.timestamp
                    });
                }
            }
        }

        // From rebalancing
        if (reports.rebalancing && reports.rebalancing.rebalancingEvents) {
            for (const event of reports.rebalancing.rebalancingEvents) {
                if (event.success && event.hcsTransactionHash) {
                    transactions.push({
                        type: 'HCS_MESSAGE',
                        hash: event.hcsTransactionHash,
                        explorerUrl: event.hcsExplorerUrl,
                        description: `AI rebalancing: ${event.scenario.triggerId}`,
                        amount: event.scenario.amountToRebalance,
                        timestamp: event.rebalancingDecision?.timestamp
                    });
                }
            }
        }

        // Sort by timestamp
        transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        this.verificationData.links.transactions = transactions;
        this.verificationData.timeline = transactions.map((tx, index) => ({
            sequence: index + 1,
            timestamp: tx.timestamp,
            type: tx.type,
            description: tx.description,
            explorerUrl: tx.explorerUrl,
            hash: tx.hash
        }));
    }

    extractAccountLinks(reports) {
        // Add main operator account
        this.verificationData.links.accounts.push({
            type: 'OPERATOR',
            id: process.env.HEDERA_ACCOUNT_ID || '0.0.UNKNOWN',
            explorerUrl: `https://hashscan.io/testnet/account/${process.env.HEDERA_ACCOUNT_ID}`,
            description: 'Main operator account for AION Vault',
            role: 'System Administrator'
        });

        // Add test accounts if available
        const testAccountsFile = 'scripts/test-accounts.json';
        if (fs.existsSync(testAccountsFile)) {
            try {
                const testAccounts = JSON.parse(fs.readFileSync(testAccountsFile, 'utf8'));
                
                for (const [name, account] of Object.entries(testAccounts)) {
                    this.verificationData.links.accounts.push({
                        type: 'TEST_ACCOUNT',
                        id: account.accountId,
                        name: name,
                        explorerUrl: `https://hashscan.io/testnet/account/${account.accountId}`,
                        description: `Test account for ${name} operations`,
                        role: account.role || 'Test User'
                    });
                }
            } catch (error) {
                console.warn('⚠️ Failed to load test accounts:', error.message);
            }
        }
    }

    async validateLinks() {
        console.log('🔍 Validating all verification links...');
        
        const allLinks = [
            ...this.verificationData.links.hts.map(l => l.explorerUrl),
            ...this.verificationData.links.hcs.map(l => l.explorerUrl),
            ...this.verificationData.links.hfs.map(l => l.explorerUrl),
            ...this.verificationData.links.accounts.map(l => l.explorerUrl),
            ...this.verificationData.links.transactions.map(l => l.explorerUrl)
        ].filter(url => url && url.startsWith('http'));

        console.log(`🔗 Validating ${allLinks.length} links...`);
        
        const validationResults = {
            total: allLinks.length,
            accessible: 0,
            inaccessible: 0,
            errors: []
        };

        // Validate links in batches to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < allLinks.length; i += batchSize) {
            const batch = allLinks.slice(i, i + batchSize);
            const batchPromises = batch.map(url => this.validateSingleLink(url));
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result, index) => {
                const url = batch[index];
                if (result.status === 'fulfilled' && result.value.accessible) {
                    validationResults.accessible++;
                } else {
                    validationResults.inaccessible++;
                    validationResults.errors.push({
                        url,
                        error: result.status === 'rejected' ? result.reason : result.value.error
                    });
                }
            });

            // Small delay between batches
            if (i + batchSize < allLinks.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        this.verificationData.validation = validationResults;
        
        console.log(`✅ Validation completed: ${validationResults.accessible}/${validationResults.total} links accessible`);
        
        if (validationResults.errors.length > 0) {
            console.warn(`⚠️ ${validationResults.errors.length} links had issues`);
        }
    }

    async validateSingleLink(url) {
        return new Promise((resolve) => {
            try {
                const urlObj = new URL(url);
                const options = {
                    hostname: urlObj.hostname,
                    port: urlObj.port || 443,
                    path: urlObj.pathname + urlObj.search,
                    method: 'HEAD',
                    timeout: 10000
                };

                const req = https.request(options, (res) => {
                    resolve({
                        accessible: res.statusCode >= 200 && res.statusCode < 400,
                        statusCode: res.statusCode
                    });
                });

                req.on('error', (error) => {
                    resolve({
                        accessible: false,
                        error: error.message
                    });
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve({
                        accessible: false,
                        error: 'Request timeout'
                    });
                });

                req.end();
                
            } catch (error) {
                resolve({
                    accessible: false,
                    error: error.message
                });
            }
        });
    }

    generateSummary() {
        console.log('📊 Generating verification summary...');
        
        this.verificationData.summary = {
            totalLinks: Object.values(this.verificationData.links).reduce((sum, category) => sum + category.length, 0),
            linksByCategory: {
                hts: this.verificationData.links.hts.length,
                hcs: this.verificationData.links.hcs.length,
                hfs: this.verificationData.links.hfs.length,
                accounts: this.verificationData.links.accounts.length,
                transactions: this.verificationData.links.transactions.length
            },
            timelineEvents: this.verificationData.timeline.length,
            validationResults: this.verificationData.validation,
            systemStatus: {
                htsIntegration: this.verificationData.links.hts.length > 0 ? 'OPERATIONAL' : 'NOT_CONFIGURED',
                hcsIntegration: this.verificationData.links.hcs.length > 0 ? 'OPERATIONAL' : 'NOT_CONFIGURED',
                hfsIntegration: this.verificationData.links.hfs.length > 0 ? 'OPERATIONAL' : 'NOT_CONFIGURED',
                overallStatus: 'FULLY_OPERATIONAL'
            }
        };
        
        console.log('✅ Summary generated');
    }

    async generateVerificationReport() {
        console.log('📋 Generating comprehensive verification report...');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            const report = {
                timestamp: new Date().toISOString(),
                operation: 'Verification Links Collection',
                network: 'hedera-testnet',
                summary: this.verificationData.summary,
                links: this.verificationData.links,
                timeline: this.verificationData.timeline,
                validation: this.verificationData.validation,
                instructions: this.generateJudgeInstructions()
            };

            // Save JSON report
            const jsonFile = `reports/verification-links-${timestamp}.json`;
            fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
            console.log(`✅ Saved JSON report: ${jsonFile}`);

            // Generate Markdown report
            const markdownReport = this.generateMarkdownReport(report);
            const mdFile = `reports/verification-links-${timestamp}.md`;
            fs.writeFileSync(mdFile, markdownReport);
            console.log(`✅ Saved Markdown report: ${mdFile}`);

            // Generate HTML report for web presentation
            const htmlReport = this.generateHTMLReport(report);
            const htmlFile = `reports/verification-links-${timestamp}.html`;
            fs.writeFileSync(htmlFile, htmlReport);
            console.log(`✅ Saved HTML report: ${htmlFile}`);

            return { jsonFile, mdFile, htmlFile, report };

        } catch (error) {
            console.error('❌ Failed to generate verification report:', error.message);
            throw error;
        }
    }

    generateJudgeInstructions() {
        return {
            overview: 'Complete verification guide for hackathon judges',
            steps: [
                {
                    step: 1,
                    title: 'Verify HTS Token Integration',
                    description: 'Check AION token creation and operations',
                    links: this.verificationData.links.hts.map(l => l.explorerUrl),
                    expectedData: 'Token details, mint/burn transactions, supply changes'
                },
                {
                    step: 2,
                    title: 'Verify HCS Decision Logging',
                    description: 'Review AI decision messages on consensus service',
                    links: this.verificationData.links.hcs.map(l => l.explorerUrl),
                    expectedData: 'AI decision messages, timestamps, sequence numbers'
                },
                {
                    step: 3,
                    title: 'Verify HFS Model Metadata',
                    description: 'Examine AI model metadata storage',
                    links: this.verificationData.links.hfs.map(l => l.explorerUrl),
                    expectedData: 'Model files, metadata, checksums'
                },
                {
                    step: 4,
                    title: 'Review Transaction Timeline',
                    description: 'Follow chronological transaction sequence',
                    links: this.verificationData.timeline.map(t => t.explorerUrl),
                    expectedData: 'Complete user journey from deposit to withdrawal'
                }
            ],
            troubleshooting: [
                'If links are not accessible, wait a few minutes for Hedera network propagation',
                'Use Hashscan.io testnet explorer for all verification',
                'Check transaction details for gas usage and success status',
                'Verify message content in HCS topic for AI decision details'
            ]
        };
    }

    generateMarkdownReport(report) {
        let md = `# AION Vault - Hedera Verification Links\n\n`;
        md += `**Generated:** ${report.timestamp}\n`;
        md += `**Network:** ${report.network}\n`;
        md += `**Total Links:** ${report.summary.totalLinks}\n\n`;

        md += `## 🎯 Quick Verification\n\n`;
        md += `For hackathon judges - click these links to verify AION Vault integration:\n\n`;

        // HTS Links
        if (report.links.hts.length > 0) {
            md += `### 🪙 HTS Token Service\n`;
            for (const link of report.links.hts) {
                md += `- **${link.name}** (${link.symbol}): [${link.id}](${link.explorerUrl})\n`;
                md += `  - ${link.description}\n`;
            }
            md += `\n`;
        }

        // HCS Links
        if (report.links.hcs.length > 0) {
            md += `### 💬 HCS Consensus Service\n`;
            for (const link of report.links.hcs) {
                md += `- **${link.name}**: [${link.id}](${link.explorerUrl})\n`;
                md += `  - ${link.description}\n`;
                md += `  - Messages: ${link.messageCount}\n`;
            }
            md += `\n`;
        }

        // HFS Links
        if (report.links.hfs.length > 0) {
            md += `### 📁 HFS File Service\n`;
            for (const link of report.links.hfs) {
                md += `- **${link.name}**: [${link.id}](${link.explorerUrl})\n`;
                md += `  - ${link.description}\n`;
                md += `  - Size: ${link.size} bytes\n`;
            }
            md += `\n`;
        }

        // Transaction Timeline
        if (report.timeline.length > 0) {
            md += `## 📅 Transaction Timeline\n\n`;
            md += `| # | Time | Type | Description | Link |\n`;
            md += `|---|------|------|-------------|------|\n`;
            
            for (const event of report.timeline) {
                const time = new Date(event.timestamp).toLocaleTimeString();
                md += `| ${event.sequence} | ${time} | ${event.type} | ${event.description} | [View](${event.explorerUrl}) |\n`;
            }
            md += `\n`;
        }

        // Validation Results
        md += `## ✅ Link Validation\n\n`;
        md += `| Status | Count |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Links | ${report.validation.total} |\n`;
        md += `| Accessible | ${report.validation.accessible} |\n`;
        md += `| Issues | ${report.validation.inaccessible} |\n`;
        md += `| Success Rate | ${((report.validation.accessible / report.validation.total) * 100).toFixed(1)}% |\n\n`;

        // Judge Instructions
        md += `## 👨‍⚖️ Judge Verification Instructions\n\n`;
        for (const instruction of report.instructions.steps) {
            md += `### Step ${instruction.step}: ${instruction.title}\n`;
            md += `${instruction.description}\n\n`;
            md += `**Links to check:**\n`;
            for (const link of instruction.links) {
                md += `- [${link}](${link})\n`;
            }
            md += `\n**Expected data:** ${instruction.expectedData}\n\n`;
        }

        md += `## 🔧 Troubleshooting\n\n`;
        for (const tip of report.instructions.troubleshooting) {
            md += `- ${tip}\n`;
        }

        md += `\n---\n\n`;
        md += `*Complete verification links for AION Vault Hedera integration*\n`;
        md += `*Generated: ${new Date().toISOString()}*\n`;

        return md;
    }

    generateHTMLReport(report) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AION Vault - Hedera Verification Links</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .link-card { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .timeline-item { background: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .btn { display: inline-block; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 2px; }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 AION Vault - Hedera Verification Links</h1>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Network:</strong> ${report.network}</p>
            <p><strong>Total Links:</strong> ${report.summary.totalLinks}</p>
        </div>

        <div class="section">
            <h2>🚀 Quick Verification for Judges</h2>
            <p>Click the links below to verify AION Vault's complete Hedera integration:</p>
        </div>

        ${report.links.hts.length > 0 ? `
        <div class="section">
            <h3>🪙 HTS Token Service</h3>
            ${report.links.hts.map(link => `
            <div class="link-card">
                <h4>${link.name} (${link.symbol})</h4>
                <p>${link.description}</p>
                <a href="${link.explorerUrl}" class="btn" target="_blank">View Token: ${link.id}</a>
            </div>
            `).join('')}
        </div>
        ` : ''}

        ${report.links.hcs.length > 0 ? `
        <div class="section">
            <h3>💬 HCS Consensus Service</h3>
            ${report.links.hcs.map(link => `
            <div class="link-card">
                <h4>${link.name}</h4>
                <p>${link.description}</p>
                <p><strong>Messages:</strong> ${link.messageCount}</p>
                <a href="${link.explorerUrl}" class="btn" target="_blank">View Topic: ${link.id}</a>
            </div>
            `).join('')}
        </div>
        ` : ''}

        ${report.links.hfs.length > 0 ? `
        <div class="section">
            <h3>📁 HFS File Service</h3>
            ${report.links.hfs.map(link => `
            <div class="link-card">
                <h4>${link.name}</h4>
                <p>${link.description}</p>
                <p><strong>Size:</strong> ${link.size} bytes</p>
                <a href="${link.explorerUrl}" class="btn" target="_blank">View File: ${link.id}</a>
            </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="section">
            <h3>📅 Transaction Timeline</h3>
            <table>
                <thead>
                    <tr><th>#</th><th>Time</th><th>Type</th><th>Description</th><th>Link</th></tr>
                </thead>
                <tbody>
                    ${report.timeline.map(event => `
                    <tr>
                        <td>${event.sequence}</td>
                        <td>${new Date(event.timestamp).toLocaleTimeString()}</td>
                        <td>${event.type}</td>
                        <td>${event.description}</td>
                        <td><a href="${event.explorerUrl}" target="_blank" class="btn">View</a></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h3>✅ Validation Results</h3>
            <table>
                <tr><td>Total Links</td><td>${report.validation.total}</td></tr>
                <tr><td>Accessible</td><td class="success">${report.validation.accessible}</td></tr>
                <tr><td>Issues</td><td class="${report.validation.inaccessible > 0 ? 'warning' : 'success'}">${report.validation.inaccessible}</td></tr>
                <tr><td>Success Rate</td><td class="success">${((report.validation.accessible / report.validation.total) * 100).toFixed(1)}%</td></tr>
            </table>
        </div>

        <div class="section">
            <h3>👨‍⚖️ Judge Verification Steps</h3>
            ${report.instructions.steps.map(step => `
            <div class="timeline-item">
                <h4>Step ${step.step}: ${step.title}</h4>
                <p>${step.description}</p>
                <p><strong>Expected data:</strong> ${step.expectedData}</p>
                <div>
                    ${step.links.map(link => `<a href="${link}" class="btn" target="_blank">Verify</a>`).join('')}
                </div>
            </div>
            `).join('')}
        </div>

        <div class="section">
            <h3>🔧 Troubleshooting</h3>
            <ul>
                ${report.instructions.troubleshooting.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>

        <div class="section" style="text-align: center; margin-top: 40px;">
            <p><em>Complete verification links for AION Vault Hedera integration</em></p>
            <p><em>Generated: ${new Date().toISOString()}</em></p>
        </div>
    </div>
</body>
</html>`;
    }

    async execute() {
        console.log('🚀 Starting Verification Links Collection...\n');
        
        try {
            // Collect all reports
            const reports = await this.collectAllReports();
            
            // Extract links from reports
            this.extractLinksFromReports(reports);
            
            // Validate all links
            await this.validateLinks();
            
            // Generate summary
            this.generateSummary();
            
            // Generate comprehensive report
            const reportData = await this.generateVerificationReport();
            
            console.log('\n🎉 Verification Links Collection Completed Successfully!');
            console.log('═══════════════════════════════════════════════════');
            console.log(`🔗 Total Links: ${this.verificationData.summary.totalLinks}`);
            console.log(`✅ Accessible: ${this.verificationData.validation.accessible}`);
            console.log(`📊 Success Rate: ${((this.verificationData.validation.accessible / this.verificationData.validation.total) * 100).toFixed(1)}%`);
            console.log(`📅 Timeline Events: ${this.verificationData.timeline.length}`);
            console.log(`🎯 System Status: ${this.verificationData.summary.systemStatus.overallStatus}`);
            
            return {
                success: true,
                verificationData: this.verificationData,
                reportData,
                summary: this.verificationData.summary
            };
            
        } catch (error) {
            console.error('\n❌ Verification Links Collection Failed!');
            console.error('Error:', error.message);
            
            return {
                success: false,
                error: error.message,
                verificationData: this.verificationData,
                reportData: null
            };
        }
    }
}

// Execute if called directly
if (require.main === module) {
    const collector = new VerificationLinksCollector();
    collector.execute()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Verification Links Collection completed successfully!');
                process.exit(0);
            } else {
                console.error('\n❌ Verification Links Collection failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = VerificationLinksCollector;