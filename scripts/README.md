# Hedera Verification Scripts

This directory contains automation scripts for setting up and managing Hedera Hashgraph integration for hackathon verification.

## 🚀 Quick Start

### Prerequisites

1. **Install Dependencies**:
   ```bash
   npm install @hashgraph/sdk dotenv
   ```

2. **Setup Environment**:
   ```bash
   # Copy example environment file
   cp .env.hedera.example .env.hedera
   
   # Edit .env.hedera with your actual values
   # NEVER commit .env.hedera to git!
   ```

3. **Get Hedera Testnet Account**:
   - Visit: https://portal.hedera.com/
   - Create testnet account
   - Fund with test HBAR from faucet
   - Update .env.hedera with your account details

### Setup Commands

```bash
# 1. Validate environment
npm run validate:env

# 2. Test Hedera connection
npm run test:hedera

# 3. Setup complete infrastructure
npm run setup:complete

# 4. Generate verification links (coming soon)
npm run verify:hedera
```

## 📁 Script Files

| Script | Purpose | Status |
|--------|---------|--------|
| `validate-environment.js` | Validates all environment variables and dependencies | ✅ Ready |
| `convert-eth-to-hedera-key.js` | Converts Ethereum private key to Hedera format | ✅ Ready |
| `test-hedera-connection.js` | Tests connection to Hedera testnet | ✅ Ready |
| `create-test-accounts.js` | Creates and funds test accounts | ✅ Ready |
| `fix-key-format.js` | Troubleshoots key format issues | ✅ Ready |
| `setup-verification-environment.js` | Main environment setup orchestrator | ✅ Ready |
| `setup-complete-infrastructure.js` | Complete setup workflow | ✅ Ready |

## 🔧 Generated Files

After running the setup scripts, the following files will be created:

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.hedera` | Environment configuration with secrets | 🚫 **IGNORED** |
| `test-accounts.json` | Test account details | 🚫 **IGNORED** |
| `infrastructure-setup-report.json` | Setup report | ✅ Safe to commit |
| `key-conversion-result.json` | Key conversion details | 🚫 **IGNORED** |
| `validation-report.json` | Environment validation results | ✅ Safe to commit |

## 🔐 Security Notes

- **NEVER commit private keys or account IDs to git**
- All sensitive files are in `.gitignore`
- Use `.env.hedera.example` as template only
- Test accounts are for development only

## 🎯 Expected Results

After successful setup:

```
✅ Hedera testnet connection established
✅ Main account funded with HBAR
✅ 4 test accounts created and funded
✅ All scripts operational
✅ Ready for verification link generation
```

## 🆘 Troubleshooting

### Common Issues

1. **"INVALID_SIGNATURE" Error**:
   ```bash
   # Run key format fixer
   node scripts/fix-key-format.js
   ```

2. **"Insufficient Balance" Error**:
   - Get more test HBAR from faucet
   - Check account ID is correct

3. **"Connection Failed" Error**:
   - Check internet connection
   - Verify RPC endpoint is accessible

### Support

If you encounter issues:
1. Check the generated diagnostic files
2. Verify all environment variables are set
3. Ensure account has sufficient HBAR balance
4. Run validation script to identify problems

## 📊 Performance Metrics

Expected setup times:
- Environment validation: ~1 second
- Hedera connection test: ~2 seconds  
- Test account creation: ~45 seconds
- Complete setup: ~1 minute

Total HBAR required: ~125 HBAR (for all test accounts)