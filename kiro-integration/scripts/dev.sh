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
