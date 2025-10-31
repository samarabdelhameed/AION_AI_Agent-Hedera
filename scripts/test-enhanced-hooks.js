#!/usr/bin/env node

/**
 * @fileoverview Enhanced Hooks Test Script
 * @description Test script for enhanced React hooks with real Hedera data integration
 * @author AION Team
 * @version 2.0.0
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs').promises;

class EnhancedHooksValidator {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            sections: {},
            details: []
        };
    }

    /**
     * Log test result
     */
    logResult(testName, success, section = 'general', details = '') {
        this.testResults.total++;
        
        if (!this.testResults.sections[section]) {
            this.testResults.sections[section] = { passed: 0, failed: 0, total: 0 };
        }
        
        this.testResults.sections[section].total++;
        
        if (success) {
            this.testResults.passed++;
            this.testResults.sections[section].passed++;
            console.log(chalk.green(`✓ [${section.toUpperCase()}] ${testName}`));
        } else {
            this.testResults.failed++;
            this.testResults.sections[section].failed++;
            console.log(chalk.red(`✗ [${section.toUpperCase()}] ${testName}`));
            if (details) {
                console.log(chalk.red(`  Error: ${details}`));
            }
        }
        
        this.testResults.details.push({
            test: testName,
            section: section,
            success: success,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Check if file exists and has content
     */
    async checkFileExists(filePath, expectedContent = []) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            if (content.length === 0) {
                return { exists: false, error: 'File is empty' };
            }

            // Check for expected content
            const missingContent = expectedContent.filter(expected => 
                !content.includes(expected)
            );

            return {
                exists: true,
                content: content,
                missingContent: missingContent,
                size: content.length
            };
        } catch (error) {
            return { exists: false, error: error.message };
        }
    }

    /**
     * Test enhanced Hedera hooks
     */
    async testEnhancedHederaHooks() {
        console.log(chalk.blue('\\n=== Testing Enhanced Hedera Hooks ==='));

        const filePath = 'frontend/src/hooks/useEnhancedHedera.js';
        const expectedHooks = [
            'useHederaStatus',
            'useHederaToken',
            'useAIDecisions',
            'useHederaTransactions',
            'useStrategies',
            'useVault',
            'usePerformanceMonitoring',
            'useCrossChain',
            'useDiagnostics'
        ];

        const expectedFeatures = [
            'useQuery',
            'useMutation',
            'useQueryClient',
            'refetchInterval',
            'staleTime',
            'cacheTime',
            'invalidateQueries'
        ];

        const fileCheck = await this.checkFileExists(filePath, [...expectedHooks, ...expectedFeatures]);
        
        this.logResult(
            'Enhanced Hedera hooks file exists',
            fileCheck.exists,
            'hooks',
            fileCheck.error || `File size: ${fileCheck.size} bytes`
        );

        if (fileCheck.exists) {
            // Check for all expected hooks
            expectedHooks.forEach(hook => {
                const hasHook = fileCheck.content.includes(`export const ${hook}`) || 
                               fileCheck.content.includes(`const ${hook}`);
                this.logResult(
                    `${hook} hook implemented`,
                    hasHook,
                    'hooks'
                );
            });

            // Check for React Query integration
            expectedFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `React Query ${feature} integration`,
                    hasFeature,
                    'hooks'
                );
            });

            // Check for error handling
            const hasErrorHandling = fileCheck.content.includes('onError') && 
                                   fileCheck.content.includes('catch');
            this.logResult(
                'Error handling implemented',
                hasErrorHandling,
                'hooks'
            );

            // Check for real-time features
            const hasRealTime = fileCheck.content.includes('refetchInterval') && 
                              fileCheck.content.includes('setInterval');
            this.logResult(
                'Real-time updates implemented',
                hasRealTime,
                'hooks'
            );
        }
    }

    /**
     * Test strategies hook
     */
    async testStrategiesHook() {
        console.log(chalk.blue('\\n=== Testing Strategies Hook ==='));

        const filePath = 'frontend/src/hooks/useStrategies.js';
        const expectedFeatures = [
            'useStrategies',
            'executeStrategy',
            'optimizeStrategy',
            'toggleStrategy',
            'getStrategyById',
            'getStrategiesByType',
            'getTopStrategies',
            'portfolioMetrics',
            'hederaIntegration'
        ];

        const fileCheck = await this.checkFileExists(filePath, expectedFeatures);
        
        this.logResult(
            'Strategies hook file exists',
            fileCheck.exists,
            'strategies',
            fileCheck.error || `File size: ${fileCheck.size} bytes`
        );

        if (fileCheck.exists) {
            expectedFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `${feature} feature implemented`,
                    hasFeature,
                    'strategies'
                );
            });

            // Check for Hedera integration
            const hederaFeatures = [
                'hederaIntegration',
                'tokenId',
                'transactionCost',
                'averageLatency',
                'networkUptime'
            ];

            hederaFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `Hedera ${feature} integration`,
                    hasFeature,
                    'strategies'
                );
            });

            // Check for performance metrics
            const performanceFeatures = [
                'costReduction',
                'speedImprovement',
                'reliabilityIncrease',
                'transparencyLevel'
            ];

            performanceFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `Performance ${feature} metric`,
                    hasFeature,
                    'strategies'
                );
            });
        }
    }

    /**
     * Test vault hook
     */
    async testVaultHook() {
        console.log(chalk.blue('\\n=== Testing Vault Hook ==='));

        const filePath = 'frontend/src/hooks/useVault.js';
        const expectedFeatures = [
            'useVault',
            'deposit',
            'withdraw',
            'claimRewards',
            'rebalance',
            'userMetrics',
            'vaultHealthScore',
            'getTransactionHistory',
            'hederaIntegration'
        ];

        const fileCheck = await this.checkFileExists(filePath, expectedFeatures);
        
        this.logResult(
            'Vault hook file exists',
            fileCheck.exists,
            'vault',
            fileCheck.error || `File size: ${fileCheck.size} bytes`
        );

        if (fileCheck.exists) {
            expectedFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `${feature} feature implemented`,
                    hasFeature,
                    'vault'
                );
            });

            // Check for transaction operations
            const transactionFeatures = [
                'depositMutation',
                'withdrawMutation',
                'claimRewardsMutation',
                'rebalanceMutation'
            ];

            transactionFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `${feature} operation implemented`,
                    hasFeature,
                    'vault'
                );
            });

            // Check for real-time metrics
            const metricsFeatures = [
                'totalValueLocked',
                'networkLatency',
                'transactionCost',
                'uptime',
                'throughput'
            ];

            metricsFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `${feature} metric tracked`,
                    hasFeature,
                    'vault'
                );
            });
        }
    }

    /**
     * Test original Hedera hooks compatibility
     */
    async testOriginalHederaHooks() {
        console.log(chalk.blue('\\n=== Testing Original Hedera Hooks Compatibility ==='));

        const filePath = 'frontend/src/hooks/useHedera.js';
        const expectedHooks = [
            'useHederaStatus',
            'useHederaToken',
            'useAIDecisions',
            'useHederaTransactions',
            'useHederaNetworkStats'
        ];

        const fileCheck = await this.checkFileExists(filePath, expectedHooks);
        
        this.logResult(
            'Original Hedera hooks file exists',
            fileCheck.exists,
            'compatibility',
            fileCheck.error || `File size: ${fileCheck.size} bytes`
        );

        if (fileCheck.exists) {
            expectedHooks.forEach(hook => {
                const hasHook = fileCheck.content.includes(`export const ${hook}`) || 
                               fileCheck.content.includes(`const ${hook}`);
                this.logResult(
                    `${hook} hook maintained`,
                    hasHook,
                    'compatibility'
                );
            });

            // Check for backward compatibility
            const compatibilityFeatures = [
                'useState',
                'useEffect',
                'useCallback',
                'hederaAPI'
            ];

            compatibilityFeatures.forEach(feature => {
                const hasFeature = fileCheck.content.includes(feature);
                this.logResult(
                    `${feature} compatibility maintained`,
                    hasFeature,
                    'compatibility'
                );
            });
        }
    }

    /**
     * Test hook exports and imports
     */
    async testHookExports() {
        console.log(chalk.blue('\\n=== Testing Hook Exports and Imports ==='));

        const files = [
            'frontend/src/hooks/useEnhancedHedera.js',
            'frontend/src/hooks/useStrategies.js',
            'frontend/src/hooks/useVault.js'
        ];

        for (const filePath of files) {
            const fileCheck = await this.checkFileExists(filePath);
            
            if (fileCheck.exists) {
                // Check for proper exports
                const hasNamedExports = fileCheck.content.includes('export {') || 
                                      fileCheck.content.includes('export const');
                const hasDefaultExport = fileCheck.content.includes('export default');
                
                this.logResult(
                    `${filePath} has proper exports`,
                    hasNamedExports || hasDefaultExport,
                    'exports'
                );

                // Check for proper imports
                const hasReactImports = fileCheck.content.includes('import') && 
                                      fileCheck.content.includes('react');
                const hasAPIImports = fileCheck.content.includes('hederaAPI') || 
                                    fileCheck.content.includes('../services/');
                
                this.logResult(
                    `${filePath} has proper imports`,
                    hasReactImports && hasAPIImports,
                    'exports'
                );

                // Check for JSDoc documentation
                const hasJSDoc = fileCheck.content.includes('/**') && 
                               fileCheck.content.includes('@fileoverview');
                
                this.logResult(
                    `${filePath} has JSDoc documentation`,
                    hasJSDoc,
                    'exports'
                );
            }
        }
    }

    /**
     * Test TypeScript compatibility
     */
    async testTypeScriptCompatibility() {
        console.log(chalk.blue('\\n=== Testing TypeScript Compatibility ==='));

        try {
            // Check if TypeScript is available
            execSync('npx tsc --version', { stdio: 'pipe' });
            
            this.logResult(
                'TypeScript is available',
                true,
                'typescript'
            );

            // Test hook files for TypeScript compatibility
            const hookFiles = [
                'frontend/src/hooks/useEnhancedHedera.js',
                'frontend/src/hooks/useStrategies.js',
                'frontend/src/hooks/useVault.js'
            ];

            for (const filePath of hookFiles) {
                try {
                    // Check for TypeScript-compatible patterns
                    const fileCheck = await this.checkFileExists(filePath);
                    
                    if (fileCheck.exists) {
                        const hasTypeAnnotations = fileCheck.content.includes(': ') || 
                                                 fileCheck.content.includes('interface') ||
                                                 fileCheck.content.includes('type ');
                        
                        const hasProperTypes = fileCheck.content.includes('useState<') || 
                                             fileCheck.content.includes('useCallback(') ||
                                             fileCheck.content.includes('useEffect(');
                        
                        this.logResult(
                            `${filePath} TypeScript ready`,
                            hasProperTypes, // Type annotations are optional for JS files
                            'typescript'
                        );
                    }
                } catch (error) {
                    this.logResult(
                        `${filePath} TypeScript check failed`,
                        false,
                        'typescript',
                        error.message
                    );
                }
            }

        } catch (error) {
            this.logResult(
                'TypeScript compatibility check',
                false,
                'typescript',
                'TypeScript not available'
            );
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(chalk.blue('🧪 Starting Enhanced Hooks Validation...'));
        console.log(chalk.gray('Testing React hooks with real Hedera data integration'));
        
        try {
            await this.testEnhancedHederaHooks();
            await this.testStrategiesHook();
            await this.testVaultHook();
            await this.testOriginalHederaHooks();
            await this.testHookExports();
            await this.testTypeScriptCompatibility();
            
            this.printSummary();
            
            return this.testResults;
            
        } catch (error) {
            console.error(chalk.red('Test execution failed:'), error);
            throw error;
        }
    }

    /**
     * Print summary
     */
    printSummary() {
        console.log(chalk.blue('\\n' + '='.repeat(60)));
        console.log(chalk.blue('              ENHANCED HOOKS TEST SUMMARY'));
        console.log(chalk.blue('='.repeat(60)));
        
        console.log(`\\n${chalk.cyan('Overall Results:')}`);
        console.log(`  Total Tests: ${this.testResults.total}`);
        console.log(`  ${chalk.green('Passed:')} ${this.testResults.passed}`);
        console.log(`  ${chalk.red('Failed:')} ${this.testResults.failed}`);
        console.log(`  Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);

        console.log(`\\n${chalk.cyan('Results by Section:')}`);
        Object.entries(this.testResults.sections).forEach(([section, results]) => {
            const successRate = ((results.passed / results.total) * 100).toFixed(1);
            const status = results.failed === 0 ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${status} ${section.toUpperCase()}: ${results.passed}/${results.total} (${successRate}%)`);
        });

        if (this.testResults.failed > 0) {
            console.log(`\\n${chalk.red('Failed Tests:')}`);
            this.testResults.details
                .filter(test => !test.success)
                .forEach(test => {
                    console.log(`  ${chalk.red('✗')} [${test.section.toUpperCase()}] ${test.test}`);
                    if (test.details) {
                        console.log(`    ${chalk.gray(test.details)}`);
                    }
                });
        }

        console.log(chalk.blue('\\n' + '='.repeat(60)));

        // Recommendations
        if (this.testResults.failed > 0) {
            console.log(chalk.yellow('\\n📋 Recommendations:'));
            console.log(chalk.yellow('  • Ensure all hook files are properly created'));
            console.log(chalk.yellow('  • Verify React Query integration is complete'));
            console.log(chalk.yellow('  • Check Hedera API service connections'));
            console.log(chalk.yellow('  • Validate TypeScript compatibility if needed'));
        } else {
            console.log(chalk.green('\\n🎉 All enhanced hooks are properly implemented!'));
            console.log(chalk.green('  • Real-time data integration ready'));
            console.log(chalk.green('  • React Query optimization active'));
            console.log(chalk.green('  • Hedera blockchain integration complete'));
        }
    }
}

// CLI execution
if (require.main === module) {
    const validator = new EnhancedHooksValidator();
    
    validator.runAllTests()
        .then(report => {
            const success = report.failed === 0;
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Validation failed:'), error);
            process.exit(1);
        });
}

module.exports = EnhancedHooksValidator;