#!/bin/bash

# run-replit-fixed-app.sh: Run the application with comprehensive fixes
# This script:
# 1. Checks the environment for required files
# 2. Creates the src directory with contents from client/src
# 3. Starts the application with a patched server
# 
# Author: Replit AI Assistant
# Date: March 30, 2025

echo "=== REPLIT FIXED APP RUNNER ==="
echo "Running Chronolio with comprehensive Replit fixes..."

# Check for required directories and files
echo "Checking environment..."
if [ ! -d "client" ]; then
  echo "❌ Error: client directory not found!"
  exit 1
fi

if [ ! -d "client/src" ]; then
  echo "❌ Error: client/src directory not found!"
  exit 1
fi

if [ ! -f "client/src/main.tsx" ]; then
  echo "❌ Error: client/src/main.tsx not found!"
  exit 1
fi

# Create physical src directory
echo "Creating src directory from client/src..."
rm -rf src
mkdir -p src
cp -R client/src/* src/

# Verify copy succeeded
if [ ! -f "src/main.tsx" ]; then
  echo "❌ Error: Failed to copy main.tsx to src directory!"
  exit 1
fi

# Run the application with patches
echo "Starting application with patches..."

# Option 1: Run with full server.js
if [ -f "replit-combined-fix.sh" ]; then
  echo "Using comprehensive combined fix..."
  bash ./replit-combined-fix.sh
  exit $?
fi

# Option 2: Just copy and run normal dev
echo "Using simple approach with copied files..."
npm run dev