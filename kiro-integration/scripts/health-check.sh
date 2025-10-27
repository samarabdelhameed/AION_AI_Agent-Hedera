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
