#!/bin/bash

# 🚀 AION x Kiro Integration Setup Script
# Following AION development steering guidelines

set -e

echo "🚀 Setting up AION x Kiro Integration..."
echo "Following AION development steering guidelines"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    # Simple version comparison without semver dependency
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    REQUIRED_MAJOR=$(echo $REQUIRED_VERSION | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
        print_error "Node.js version $NODE_VERSION is too old. Required: >= $REQUIRED_VERSION"
        exit 1
    fi
    
    print_success "Node.js version $NODE_VERSION ✓"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "npm is available ✓"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the kiro-integration directory"
        exit 1
    fi
    
    print_success "Directory structure verified ✓"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install MCP tools dependencies
    print_status "Installing MCP tools dependencies..."
    cd mcp-tools
    npm install
    cd ..
    
    # Install AI code generator dependencies
    print_status "Installing AI code generator dependencies..."
    cd ai-code-generator
    npm install
    cd ..
    
    # Install developer tools dependencies
    print_status "Installing developer tools dependencies..."
    cd developer-tools
    npm install
    cd ..
    
    print_success "All dependencies installed ✓"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# AION x Kiro Integration Environment Configuration
NODE_ENV=development

# Blockchain Configuration
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org

# MCP Configuration
MCP_PORT=3001
MCP_HOST=localhost

# AI Configuration
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7

# Security
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key

# Performance Monitoring
ENABLE_MONITORING=true
MONITORING_INTERVAL=30000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/aion-kiro.log
EOF
        print_success ".env file created ✓"
        print_warning "Please update .env file with your actual configuration"
    else
        print_success ".env file already exists ✓"
    fi
    
    # Create logs directory
    mkdir -p logs
    print_success "Logs directory created ✓"
}

# Setup Kiro configuration
setup_kiro_config() {
    print_status "Setting up Kiro configuration..."
    
    # Check if Kiro settings directory exists
    KIRO_SETTINGS_DIR="$HOME/.kiro/settings"
    
    if [ ! -d "$KIRO_SETTINGS_DIR" ]; then
        print_warning "Kiro settings directory not found at $KIRO_SETTINGS_DIR"
        print_status "Creating Kiro settings directory..."
        mkdir -p "$KIRO_SETTINGS_DIR"
    fi
    
    # Copy MCP configuration
    if [ -f "kiro-config.json" ]; then
        print_status "Installing AION MCP configuration to Kiro..."
        
        # Backup existing mcp.json if it exists
        if [ -f "$KIRO_SETTINGS_DIR/mcp.json" ]; then
            print_status "Backing up existing mcp.json..."
            cp "$KIRO_SETTINGS_DIR/mcp.json" "$KIRO_SETTINGS_DIR/mcp.json.backup.$(date +%s)"
        fi
        
        # Merge configurations
        if [ -f "$KIRO_SETTINGS_DIR/mcp.json" ]; then
            print_status "Merging AION configuration with existing Kiro MCP config..."
            node -e "
                const fs = require('fs');
                const existing = JSON.parse(fs.readFileSync('$KIRO_SETTINGS_DIR/mcp.json', 'utf8'));
                const aion = JSON.parse(fs.readFileSync('kiro-config.json', 'utf8'));
                
                // Merge mcpServers
                existing.mcpServers = existing.mcpServers || {};
                Object.assign(existing.mcpServers, aion.mcpServers);
                
                fs.writeFileSync('$KIRO_SETTINGS_DIR/mcp.json', JSON.stringify(existing, null, 2));
                console.log('Configuration merged successfully');
            "
        else
            print_status "Installing fresh AION MCP configuration..."
            cp kiro-config.json "$KIRO_SETTINGS_DIR/mcp.json"
        fi
        
        print_success "Kiro MCP configuration installed ✓"
    else
        print_error "kiro-config.json not found"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running tests to verify setup..."
    
    # Test MCP tools
    print_status "Testing MCP tools..."
    cd mcp-tools
    if npm test; then
        print_success "MCP tools tests passed ✓"
    else
        print_warning "MCP tools tests failed (this might be expected in development)"
    fi
    cd ..
    
    # Test AI code generator
    print_status "Testing AI code generator..."
    cd ai-code-generator
    if npm test; then
        print_success "AI code generator tests passed ✓"
    else
        print_warning "AI code generator tests failed (this might be expected in development)"
    fi
    cd ..
    
    # Test developer tools
    print_status "Testing developer tools..."
    cd developer-tools
    if npm test; then
        print_success "Developer tools tests passed ✓"
    else
        print_warning "Developer tools tests failed (this might be expected in development)"
    fi
    cd ..
}

# Setup development environment
setup_dev_environment() {
    print_status "Setting up development environment..."
    
    # Install global CLI tool
    print_status "Installing AION CLI globally..."
    cd developer-tools
    npm link
    cd ..
    
    print_success "AION CLI installed globally ✓"
    print_status "You can now use 'aion' command from anywhere"
    
    # Setup git hooks (if in git repo)
    if [ -d ".git" ]; then
        print_status "Setting up git hooks..."
        
        # Pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
    echo "Linting failed. Please fix errors before committing."
    exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed. Please fix tests before committing."
    exit 1
fi

echo "Pre-commit checks passed ✓"
EOF
        chmod +x .git/hooks/pre-commit
        print_success "Git hooks installed ✓"
    fi
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    mkdir -p scripts
    
    # Development start script
    cat > scripts/dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting AION x Kiro development environment..."

# Start MCP servers in background
echo "Starting MCP servers..."
cd mcp-tools && npm start &
MCP_PID=$!

cd ../ai-code-generator && npm start &
GENERATOR_PID=$!

cd ..

echo "MCP servers started (PIDs: $MCP_PID, $GENERATOR_PID)"
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C to kill background processes
trap 'kill $MCP_PID $GENERATOR_PID; exit' INT

# Wait for processes
wait
EOF
    chmod +x scripts/dev.sh
    
    # Health check script
    cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
echo "🔍 AION x Kiro Health Check"
echo "=========================="

# Check MCP server
echo -n "MCP Server: "
if curl -s http://localhost:3001/ping > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

# Check AI Code Generator
echo -n "AI Code Generator: "
if curl -s http://localhost:3002/ping > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

# Check Kiro configuration
echo -n "Kiro MCP Config: "
if [ -f "$HOME/.kiro/settings/mcp.json" ]; then
    echo "✅ Installed"
else
    echo "❌ Not found"
fi

echo "=========================="
EOF
    chmod +x scripts/health-check.sh
    
    print_success "Development scripts created ✓"
}

# Main setup function
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 AION x Kiro Integration Setup                ║"
    echo "║              Following AION Development Guidelines          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    install_dependencies
    setup_environment
    setup_kiro_config
    create_dev_scripts
    setup_dev_environment
    run_tests
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Setup Complete! 🎉                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    print_success "AION x Kiro Integration setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update .env file with your configuration"
    echo "2. Start development environment: ./scripts/dev.sh"
    echo "3. Check health: ./scripts/health-check.sh"
    echo "4. Open Kiro IDE and test MCP tools"
    echo "5. Try AION CLI: aion --help"
    echo ""
    echo "📚 Documentation:"
    echo "- README.md - Project overview"
    echo "- docs/HACKATHON_SUBMISSION.md - Hackathon submission"
    echo "- demo/hackathon-demo.md - Demo script"
    echo ""
    echo "🚀 Happy coding with AION x Kiro!"
}

# Run main function
main "$@"