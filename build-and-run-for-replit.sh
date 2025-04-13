#!/bin/bash

# Enhanced build and run script for Replit deployment
echo "Building and running Chronolio for Replit deployment..."

# Clean up any existing directories first
echo "Cleaning up previous builds..."
if [ -d "dist" ]; then
  rm -rf dist
fi

if [ -e "src" ]; then
  rm -rf src
fi

# Ensure we have the right directory structure for Vite
echo "Setting up the correct directory structure..."
ln -sf client/src src

# Set environment variables
export NODE_ENV=production
export REPLIT_ENVIRONMENT=true
export REPL_ID=$(hostname)

# Build the application
echo "Building the application..."
npm run build

echo "Build complete! Starting the application..."

# Run the application
node dist/index.js