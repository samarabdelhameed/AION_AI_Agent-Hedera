# 🚀 AION x Kiro Integration - Installation Guide

## 📋 Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: Latest version
- **Operating System**: macOS, Linux, or Windows with WSL2

### Kiro IDE
- **Kiro IDE**: Latest version installed
- **MCP Support**: Enabled in Kiro settings

## 🛠️ Quick Installation

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/samarabdelhameed/AION_AI_Agent.git

# Navigate to Kiro integration
cd AION_AI_Agent/kiro-integration

# Run automated setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will:
- ✅ Check prerequisites
- ✅ Install all dependencies
- ✅ Setup environment configuration
- ✅ Configure Kiro MCP integration
- ✅ Run initial tests
- ✅ Install CLI tools globally

### Option 2: Manual Installation

#### Step 1: Clone and Navigate
```bash
git clone https://github.com/samarabdelhameed/AION_AI_Agent.git
cd AION_AI_Agent/kiro-integration
```

#### Step 2: Install Dependencies
```bash
# Install root dependencies
npm install

# Install MCP tools dependencies
cd mcp-tools && npm install && cd ..

# Install AI code generator dependencies
cd ai-code-generator && npm install && cd ..

# Install developer tools dependencies
cd developer-tools && npm install && cd ..
```

#### Step 3: Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (use your preferred editor)
nano .env
```

#### Step 4: Kiro Configuration
```bash
# Create Kiro settings directory (if not exists)
mkdir -p ~/.kiro/settings

# Install MCP configuration
cp kiro-config.json ~/.kiro/settings/mcp.json
```

#### Step 5: Install CLI Tools
```bash
cd developer-tools
npm link
cd ..
```

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Blockchain Configuration
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org

# Security (Optional - for advanced features)
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key

# MCP Configuration
MCP_PORT=3001
MCP_HOST=localhost

# AI Configuration
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7

# Performance Monitoring
ENABLE_MONITORING=true
MONITORING_INTERVAL=30000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/aion-kiro.log
```

### Kiro MCP Configuration

The installation automatically configures Kiro with AION MCP tools. The configuration includes:

```json
{
  "mcpServers": {
    "aion-defi-tools": {
      "command": "node",
      "args": ["./mcp-tools/index.js"],
      "cwd": "./kiro-integration",
      "disabled": false,
      "autoApprove": [
        "analyze_defi_strategy",
        "get_live_apy_data",
        "assess_risk_profile"
      ]
    },
    "aion-code-generator": {
      "command": "node",
      "args": ["./ai-code-generator/index.js"],
      "cwd": "./kiro-integration",
      "disabled": false,
      "autoApprove": [
        "generate_smart_contract",
        "audit_contract_security",
        "optimize_gas_usage"
      ]
    }
  }
}
```

## 🚀 Starting the Services

### Development Mode
```bash
# Start all services
npm run start:all

# Or start individually
npm run start:mcp        # MCP tools server
npm run start:generator  # AI code generator
```

### Using Development Scripts
```bash
# Start development environment
./scripts/dev.sh

# Check service health
./scripts/health-check.sh
```

## 🧪 Verification

### Test Installation
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:mcp
npm run test:generator
```

### Test Kiro Integration

1. **Open Kiro IDE**
2. **Open Command Palette** (Cmd/Ctrl + Shift + P)
3. **Search for "MCP"** and select "Reload MCP Servers"
4. **Test AION tools** by typing in chat:

```
analyze_defi_strategy({
  "protocols": ["venus", "pancakeswap"],
  "amount": "1.0",
  "riskLevel": "medium"
})
```

### Test CLI Tools
```bash
# Test AION CLI
aion --help

# Test project generation
aion init --name test-project --template vault

# Test strategy analysis
aion analyze --strategy venus --period 7d
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Node.js Version Error
```bash
# Check Node.js version
node --version

# If version < 18.0.0, update Node.js
# Using nvm (recommended)
nvm install 18
nvm use 18
```

#### 2. Permission Errors
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### 3. Kiro MCP Not Working
```bash
# Check Kiro settings directory
ls -la ~/.kiro/settings/

# Verify MCP configuration
cat ~/.kiro/settings/mcp.json

# Restart Kiro IDE
# Check Kiro logs for errors
```

#### 4. Port Conflicts
```bash
# Check if ports are in use
lsof -i :3001
lsof -i :3002

# Kill processes if needed
kill -9 <PID>

# Or change ports in .env file
MCP_PORT=3003
```

#### 5. Missing Dependencies
```bash
# Clean install
npm run clean
npm run install:all

# Or install individually
cd mcp-tools && npm install
cd ../ai-code-generator && npm install
cd ../developer-tools && npm install
```

### Debug Mode

Enable debug logging:
```bash
# Set debug environment
export DEBUG=aion:*
export LOG_LEVEL=debug

# Start services with debug
npm run start:all
```

### Health Check

Run comprehensive health check:
```bash
./scripts/health-check.sh
```

Expected output:
```
🔍 AION x Kiro Health Check
==========================
MCP Server: ✅ Running
AI Code Generator: ✅ Running
Kiro MCP Config: ✅ Installed
==========================
```

## 📊 Monitoring

### Performance Monitoring
```bash
# Start with monitoring enabled
ENABLE_MONITORING=true npm run start:all

# View performance metrics
curl http://localhost:3001/metrics

# Generate performance report
node -e "
const monitor = require('./monitoring/performance-monitor.js');
console.log(monitor.generateReport('1h'));
"
```

### Log Files
```bash
# View logs
tail -f logs/aion-kiro.log
tail -f logs/performance.log

# View all logs
npm run logs
```

## 🔄 Updates

### Update AION Integration
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm run install:all

# Restart services
npm run restart
```

### Update Kiro Configuration
```bash
# Backup current config
cp ~/.kiro/settings/mcp.json ~/.kiro/settings/mcp.json.backup

# Update configuration
cp kiro-config.json ~/.kiro/settings/mcp.json

# Restart Kiro IDE
```

## 🆘 Support

### Getting Help

1. **Documentation**: Check [docs/](docs/) directory
2. **Issues**: Create issue on [GitHub](https://github.com/samarabdelhameed/AION_AI_Agent/issues)
3. **Discussions**: Join [GitHub Discussions](https://github.com/samarabdelhameed/AION_AI_Agent/discussions)

### Diagnostic Information

When reporting issues, include:

```bash
# System information
node --version
npm --version
uname -a

# AION information
aion --version
cat .env | grep -v PRIVATE_KEY | grep -v API_KEY

# Service status
./scripts/health-check.sh

# Recent logs
tail -50 logs/aion-kiro.log
```

## 🎯 Next Steps

After successful installation:

1. **📚 Read Documentation**: Check [docs/HACKATHON_SUBMISSION.md](docs/HACKATHON_SUBMISSION.md)
2. **🎬 Try Demo**: Follow [demo/hackathon-demo.md](demo/hackathon-demo.md)
3. **🧪 Run Tests**: Execute `npm test` to verify everything works
4. **🚀 Start Building**: Use `aion init` to create your first project
5. **📊 Monitor Performance**: Check monitoring dashboard

## 🏆 Success Criteria

Installation is successful when:

- ✅ All health checks pass
- ✅ MCP tools work in Kiro IDE
- ✅ CLI commands execute successfully
- ✅ Tests pass with 100% success rate
- ✅ Performance monitoring shows green status

---

**🎉 Congratulations! You've successfully installed AION x Kiro Integration.**

*Ready to revolutionize DeFi development with AI-powered tools!*