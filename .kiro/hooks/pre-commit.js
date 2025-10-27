#!/usr/bin/env node

/**
 * AION DeFi Agent - Pre-commit Hook
 * 
 * This hook runs before each commit to ensure code quality and security
 * for the AION DeFi AI Agent project.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 AION Pre-commit Hook: Starting validation...');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n📋 ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed:`, 'red');
    console.error(error.message);
    return false;
  }
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description} found`, 'green');
    return true;
  } else {
    log(`❌ ${description} missing: ${filePath}`, 'red');
    return false;
  }
}

function validateEnvironment() {
  log('\n🔧 Validating environment...', 'blue');
  
  const requiredFiles = [
    { path: '.env.example', desc: 'Environment example file' },
    { path: 'package.json', desc: 'Package configuration' },
    { path: 'contracts/foundry.toml', desc: 'Foundry configuration' },
    { path: 'frontend/package.json', desc: 'Frontend package configuration' },
    { path: 'mcp_agent/package.json', desc: 'MCP Agent package configuration' }
  ];

  let allFilesExist = true;
  requiredFiles.forEach(file => {
    if (!checkFileExists(file.path, file.desc)) {
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

function validateSmartContracts() {
  log('\n🏦 Validating smart contracts...', 'blue');
  
  const contractDir = 'contracts';
  if (!fs.existsSync(contractDir)) {
    log('❌ Contracts directory not found', 'red');
    return false;
  }

  // Check if we're in the contracts directory
  const originalCwd = process.cwd();
  process.chdir(contractDir);

  try {
    // Run Foundry tests
    const testSuccess = runCommand('forge test --summary', 'Smart contract tests');
    
    // Run Foundry build
    const buildSuccess = runCommand('forge build', 'Smart contract compilation');
    
    return testSuccess && buildSuccess;
  } catch (error) {
    log('❌ Smart contract validation failed', 'red');
    return false;
  } finally {
    process.chdir(originalCwd);
  }
}

function validateFrontend() {
  log('\n🖥️ Validating frontend...', 'blue');
  
  const frontendDir = 'frontend';
  if (!fs.existsSync(frontendDir)) {
    log('❌ Frontend directory not found', 'red');
    return false;
  }

  const originalCwd = process.cwd();
  process.chdir(frontendDir);

  try {
    // Run TypeScript compilation
    const buildSuccess = runCommand('npm run build', 'Frontend build');
    
    // Run linting
    const lintSuccess = runCommand('npm run lint', 'Frontend linting');
    
    return buildSuccess && lintSuccess;
  } catch (error) {
    log('❌ Frontend validation failed', 'red');
    return false;
  } finally {
    process.chdir(originalCwd);
  }
}

function validateMCPAgent() {
  log('\n🤖 Validating MCP Agent...', 'blue');
  
  const agentDir = 'mcp_agent';
  if (!fs.existsSync(agentDir)) {
    log('❌ MCP Agent directory not found', 'red');
    return false;
  }

  const originalCwd = process.cwd();
  process.chdir(agentDir);

  try {
    // Run MCP Agent tests
    const testSuccess = runCommand('npm test', 'MCP Agent tests');
    
    // Check if agent can start
    const startSuccess = runCommand('timeout 10s npm start || true', 'MCP Agent startup check');
    
    return testSuccess;
  } catch (error) {
    log('❌ MCP Agent validation failed', 'red');
    return false;
  } finally {
    process.chdir(originalCwd);
  }
}

function validateSecurity() {
  log('\n🛡️ Validating security...', 'blue');
  
  // Check for sensitive files
  const sensitiveFiles = [
    '.env',
    'private.key',
    'mnemonic.txt',
    'wallet.json'
  ];

  let securityIssues = 0;
  sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`⚠️  Warning: Sensitive file found: ${file}`, 'yellow');
      securityIssues++;
    }
  });

  // Check for hardcoded secrets in code
  const codeFiles = [
    'contracts/src',
    'frontend/src',
    'mcp_agent/services'
  ];

  codeFiles.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        const result = execSync(`grep -r "0x[a-fA-F0-9]{64}" ${dir} || true`, { encoding: 'utf8' });
        if (result.trim()) {
          log(`⚠️  Warning: Potential private key found in ${dir}`, 'yellow');
          securityIssues++;
        }
      } catch (error) {
        // Ignore grep errors
      }
    }
  });

  if (securityIssues > 0) {
    log(`⚠️  Found ${securityIssues} potential security issues`, 'yellow');
  } else {
    log('✅ No security issues detected', 'green');
  }

  return securityIssues === 0;
}

function validateKiroIntegration() {
  log('\n🚀 Validating Kiro integration...', 'blue');
  
  const kiroFiles = [
    '.kiro/specs/aion-defi-agent.md',
    '.kiro/hooks/pre-commit.js',
    '.kiro/steering/development.md',
    'kiro-integration/kiro-config.json'
  ];

  let kiroFilesExist = true;
  kiroFiles.forEach(file => {
    if (!checkFileExists(file, `Kiro file: ${file}`)) {
      kiroFilesExist = false;
    }
  });

  return kiroFilesExist;
}

// Main validation function
async function main() {
  log('🚀 AION DeFi Agent - Pre-commit Validation', 'bold');
  log('==========================================', 'bold');

  const validations = [
    { name: 'Environment', fn: validateEnvironment },
    { name: 'Smart Contracts', fn: validateSmartContracts },
    { name: 'Frontend', fn: validateFrontend },
    { name: 'MCP Agent', fn: validateMCPAgent },
    { name: 'Security', fn: validateSecurity },
    { name: 'Kiro Integration', fn: validateKiroIntegration }
  ];

  let allPassed = true;
  const results = [];

  for (const validation of validations) {
    try {
      const result = validation.fn();
      results.push({ name: validation.name, passed: result });
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      log(`❌ ${validation.name} validation crashed: ${error.message}`, 'red');
      results.push({ name: validation.name, passed: false });
      allPassed = false;
    }
  }

  // Summary
  log('\n📊 Validation Summary:', 'bold');
  log('====================', 'bold');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
  });

  if (allPassed) {
    log('\n🎉 All validations passed! Commit approved.', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some validations failed. Please fix the issues before committing.', 'red');
    process.exit(1);
  }
}

// Run the validation
main().catch(error => {
  log(`\n💥 Pre-commit hook crashed: ${error.message}`, 'red');
  process.exit(1);
});

