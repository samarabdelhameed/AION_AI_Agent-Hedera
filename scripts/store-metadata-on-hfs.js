#!/usr/bin/env node

/**
 * Store AI Model Metadata on Hedera File Service (HFS)
 * Uploads real model metadata files to HFS with proper validation
 */

const {
    Client,
    AccountId,
    PrivateKey,
    FileCreateTransaction,
    FileInfoQuery,
    FileContentsQuery,
    FileAppendTransaction,
    Hbar
} = require('@hashgraph/sdk');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const HederaErrorHandler = require('./hedera-error-handler');
require('dotenv').config({ path: '.env.hedera' });

class HFSMetadataStorage {
    constructor() {
        this.client = null;
        this.operatorId = null;
        this.operatorKey = null;
        this.errorHandler = new HederaErrorHandler(3, 2000);
        this.hfsData = {
            timestamp: new Date().toISOString(),
            network: 'hedera-testnet',
            files: [],
            summary: {}
        };
        this.maxFileSize = 1024 * 1024; // 1MB limit for HFS
    }

    async initialize() {
        console.log('📁 Initializing HFS Metadata Storage...');
        
        try {
            // Setup client
            this.client = Client.forTestnet();
            
            // Load operator credentials
            this.operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
            this.operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
            
            // Set operator
            this.client.setOperator(this.operatorId, this.operatorKey);
            
            // Health check
            const healthCheck = await this.errorHandler.performHealthCheck(this.client);
            if (!healthCheck.healthy) {
                throw new Error(`Health check failed: ${healthCheck.error || 'System not ready'}`);
            }
            
            console.log(`✅ Initialized with operator: ${this.operatorId}`);
            console.log(`🏥 Health check passed (${healthCheck.score}/3)`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    async findMetadataFiles() {
        console.log('🔍 Finding model metadata files...');
        
        try {
            const reportsDir = 'reports';
            if (!fs.existsSync(reportsDir)) {
                throw new Error('Reports directory not found. Run create-real-model-metadata.js first.');
            }

            const files = fs.readdirSync(reportsDir);
            const metadataFiles = files.filter(file => 
                file.includes('ai-model-metadata') && file.endsWith('.json')
            ).sort().reverse(); // Get the most recent first

            if (metadataFiles.length === 0) {
                throw new Error('No model metadata files found. Run create-real-model-metadata.js first.');
            }

            const latestFile = path.join(reportsDir, metadataFiles[0]);
            const fileContent = fs.readFileSync(latestFile, 'utf8');
            const metadata = JSON.parse(fileContent);

            console.log(`✅ Found latest metadata file: ${latestFile}`);
            console.log(`📊 Contains ${metadata.models.length} models`);

            return {
                filePath: latestFile,
                content: fileContent,
                metadata: metadata,
                size: Buffer.byteLength(fileContent, 'utf8')
            };

        } catch (error) {
            console.error('❌ Failed to find metadata files:', error.message);
            throw error;
        }
    }

    async createHFSFile(content, memo, fileName) {
        console.log(`📤 Creating HFS file: ${fileName}...`);
        
        try {
            const contentBuffer = Buffer.from(content, 'utf8');
            const fileSize = contentBuffer.length;
            
            console.log(`📏 File size: ${fileSize} bytes`);
            
            if (fileSize > this.maxFileSize) {
                throw new Error(`File too large: ${fileSize} bytes (max: ${this.maxFileSize})`);
            }

            // Create file transaction
            const fileCreateTx = new FileCreateTransaction()
                .setContents(contentBuffer)
                .setKeys([this.operatorKey])
                .setFileMemo(memo)
                .setMaxTransactionFee(new Hbar(2));

            // Submit transaction
            const fileCreateSubmit = await this.errorHandler.executeWithRetry(
                () => fileCreateTx.execute(this.client),
                'HFS file creation'
            );

            // Get receipt
            const fileCreateReceipt = await fileCreateSubmit.getReceipt(this.client);
            const fileId = fileCreateReceipt.fileId;

            console.log(`✅ HFS file created: ${fileId}`);
            console.log(`📋 Transaction hash: ${fileCreateSubmit.transactionHash}`);

            // Verify file creation
            await this.verifyHFSFile(fileId, content);

            return {
                fileId: fileId.toString(),
                transactionHash: fileCreateSubmit.transactionHash.toString(),
                size: fileSize,
                memo: memo,
                fileName: fileName,
                explorerUrl: `https://hashscan.io/testnet/file/${fileId}`,
                transactionUrl: `https://hashscan.io/testnet/transaction/${fileCreateSubmit.transactionHash}`
            };

        } catch (error) {
            console.error(`❌ Failed to create HFS file ${fileName}:`, error.message);
            throw error;
        }
    }

    async verifyHFSFile(fileId, expectedContent) {
        console.log(`🔍 Verifying HFS file: ${fileId}...`);
        
        try {
            // Query file info
            const fileInfo = await new FileInfoQuery()
                .setFileId(fileId)
                .execute(this.client);

            console.log(`📋 File info - Size: ${fileInfo.size} bytes`);

            // Query file contents
            const fileContents = await new FileContentsQuery()
                .setFileId(fileId)
                .execute(this.client);

            const retrievedContent = fileContents.toString('utf8');
            
            // Verify content integrity
            const expectedHash = crypto.createHash('sha256').update(expectedContent).digest('hex');
            const retrievedHash = crypto.createHash('sha256').update(retrievedContent).digest('hex');

            if (expectedHash !== retrievedHash) {
                throw new Error('Content integrity check failed - hashes do not match');
            }

            console.log(`✅ File verification passed`);
            console.log(`🔐 Content hash: ${expectedHash.substring(0, 16)}...`);

            return {
                verified: true,
                size: fileInfo.size,
                contentHash: expectedHash,
                retrievedSize: retrievedContent.length
            };

        } catch (error) {
            console.error(`❌ File verification failed:`, error.message);
            throw error;
        }
    }

    async storeModelMetadata() {
        console.log('🚀 Starting HFS metadata storage...');
        
        try {
            // Find metadata files
            const metadataFile = await this.findMetadataFiles();
            
            // Store main metadata file
            const mainFileResult = await this.createHFSFile(
                metadataFile.content,
                'AION AI Model Metadata - Complete System Information',
                'ai-model-metadata-complete.json'
            );

            this.hfsData.files.push(mainFileResult);

            // Store individual model files
            const metadata = metadataFile.metadata;
            for (const model of metadata.models) {
                const modelContent = JSON.stringify(model, null, 2);
                const modelFileResult = await this.createHFSFile(
                    modelContent,
                    `AION AI Model: ${model.name} v${model.version}`,
                    `model-${model.modelId}.json`
                );
                
                this.hfsData.files.push(modelFileResult);
            }

            // Store summary file
            const summaryContent = JSON.stringify(metadata.summary, null, 2);
            const summaryFileResult = await this.createHFSFile(
                summaryContent,
                'AION AI Models Summary - Performance Overview',
                'ai-models-summary.json'
            );

            this.hfsData.files.push(summaryFileResult);

            // Create file index
            const fileIndex = {
                timestamp: new Date().toISOString(),
                network: 'hedera-testnet',
                totalFiles: this.hfsData.files.length,
                files: this.hfsData.files.map(file => ({
                    fileId: file.fileId,
                    fileName: file.fileName,
                    memo: file.memo,
                    size: file.size,
                    explorerUrl: file.explorerUrl
                })),
                verification: {
                    allFilesVerified: true,
                    totalSize: this.hfsData.files.reduce((sum, file) => sum + file.size, 0),
                    checksumIndex: crypto.createHash('sha256')
                        .update(JSON.stringify(this.hfsData.files.map(f => f.fileId)))
                        .digest('hex')
                }
            };

            const indexContent = JSON.stringify(fileIndex, null, 2);
            const indexFileResult = await this.createHFSFile(
                indexContent,
                'AION HFS File Index - Complete File Registry',
                'hfs-file-index.json'
            );

            this.hfsData.files.push(indexFileResult);

            console.log(`✅ Stored ${this.hfsData.files.length} files on HFS`);

            return this.hfsData;

        } catch (error) {
            console.error('❌ Failed to store metadata on HFS:', error.message);
            throw error;
        }
    }

    async generateHFSReport() {
        console.log('📋 Generating HFS storage report...');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // Create comprehensive report
            const report = {
                timestamp: new Date().toISOString(),
                network: 'hedera-testnet',
                operation: 'HFS Model Metadata Storage',
                operator: this.operatorId.toString(),
                summary: {
                    totalFiles: this.hfsData.files.length,
                    totalSize: this.hfsData.files.reduce((sum, file) => sum + file.size, 0),
                    allFilesVerified: true,
                    storageSuccess: true
                },
                files: this.hfsData.files,
                verification: {
                    method: 'SHA256 content hashing',
                    allPassed: true,
                    timestamp: new Date().toISOString()
                },
                explorerLinks: {
                    files: this.hfsData.files.map(file => ({
                        fileName: file.fileName,
                        fileId: file.fileId,
                        url: file.explorerUrl
                    })),
                    transactions: this.hfsData.files.map(file => ({
                        fileName: file.fileName,
                        transactionHash: file.transactionHash,
                        url: file.transactionUrl
                    }))
                }
            };

            // Save JSON report
            const jsonFile = `reports/hfs-storage-report-${timestamp}.json`;
            fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
            console.log(`✅ Saved JSON report: ${jsonFile}`);

            // Generate Markdown report
            const markdownReport = this.generateMarkdownReport(report);
            const mdFile = `reports/hfs-storage-report-${timestamp}.md`;
            fs.writeFileSync(mdFile, markdownReport);
            console.log(`✅ Saved Markdown report: ${mdFile}`);

            return {
                jsonFile,
                mdFile,
                report
            };

        } catch (error) {
            console.error('❌ Failed to generate HFS report:', error.message);
            throw error;
        }
    }

    generateMarkdownReport(report) {
        let md = `# AION HFS Model Metadata Storage Report\n\n`;
        md += `**Generated:** ${report.timestamp}\n`;
        md += `**Network:** ${report.network}\n`;
        md += `**Operator:** ${report.operator}\n\n`;

        md += `## 📊 Storage Summary\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Files Stored | ${report.summary.totalFiles} |\n`;
        md += `| Total Size | ${report.summary.totalSize} bytes |\n`;
        md += `| All Files Verified | ✅ ${report.summary.allFilesVerified ? 'Yes' : 'No'} |\n`;
        md += `| Storage Success | ✅ ${report.summary.storageSuccess ? 'Yes' : 'No'} |\n\n`;

        md += `## 📁 Stored Files\n\n`;
        md += `| File Name | File ID | Size | Memo |\n`;
        md += `|-----------|---------|------|------|\n`;
        
        for (const file of report.files) {
            md += `| ${file.fileName} | \`${file.fileId}\` | ${file.size} bytes | ${file.memo} |\n`;
        }

        md += `\n## 🔗 Hedera Explorer Links\n\n`;
        md += `### File Explorer Links\n`;
        for (const link of report.explorerLinks.files) {
            md += `- **${link.fileName}**: [${link.fileId}](${link.url})\n`;
        }

        md += `\n### Transaction Explorer Links\n`;
        for (const link of report.explorerLinks.transactions) {
            md += `- **${link.fileName}**: [${link.transactionHash}](${link.url})\n`;
        }

        md += `\n## 🔐 Verification Details\n\n`;
        md += `- **Method:** ${report.verification.method}\n`;
        md += `- **All Checks Passed:** ✅ ${report.verification.allPassed ? 'Yes' : 'No'}\n`;
        md += `- **Verification Time:** ${report.verification.timestamp}\n\n`;

        md += `## 🚀 Usage Instructions\n\n`;
        md += `To retrieve any file from HFS:\n\n`;
        md += `\`\`\`javascript\n`;
        md += `const { FileContentsQuery } = require('@hashgraph/sdk');\n\n`;
        md += `// Example: Retrieve main metadata file\n`;
        md += `const fileContents = await new FileContentsQuery()\n`;
        md += `    .setFileId("${report.files[0].fileId}")\n`;
        md += `    .execute(client);\n\n`;
        md += `const metadata = JSON.parse(fileContents.toString('utf8'));\n`;
        md += `\`\`\`\n\n`;

        md += `---\n\n`;
        md += `*This report was generated automatically by the AION HFS Metadata Storage system*\n`;
        md += `*Timestamp: ${new Date().toISOString()}*\n`;

        return md;
    }

    async execute() {
        console.log('🚀 Starting HFS Model Metadata Storage...\n');
        
        try {
            // Initialize
            await this.initialize();
            
            // Store metadata on HFS
            const hfsData = await this.storeModelMetadata();
            
            // Generate report
            const reportData = await this.generateHFSReport();
            
            console.log('\n🎉 HFS Metadata Storage Completed Successfully!');
            console.log('═══════════════════════════════════════════════════');
            console.log(`📁 Files Stored: ${hfsData.files.length}`);
            console.log(`💾 Total Size: ${hfsData.files.reduce((sum, file) => sum + file.size, 0)} bytes`);
            console.log(`🔐 All Files Verified: ✅`);
            console.log(`🌐 Explorer Links Generated: ✅`);
            
            return {
                success: true,
                hfsData,
                reportData,
                summary: {
                    filesStored: hfsData.files.length,
                    totalSize: hfsData.files.reduce((sum, file) => sum + file.size, 0),
                    allVerified: true,
                    explorerLinksGenerated: hfsData.files.length
                }
            };
            
        } catch (error) {
            console.error('\n❌ HFS Metadata Storage Failed!');
            console.error('Error:', error.message);
            
            return {
                success: false,
                error: error.message,
                hfsData: null,
                reportData: null
            };
        }
    }
}

// Execute if called directly
if (require.main === module) {
    const storage = new HFSMetadataStorage();
    storage.execute()
        .then(result => {
            if (result.success) {
                console.log('\n✅ HFS Metadata Storage completed successfully!');
                process.exit(0);
            } else {
                console.error('\n❌ HFS Metadata Storage failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = HFSMetadataStorage;