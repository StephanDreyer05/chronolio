#!/bin/bash

# improved-build-for-replit.sh: Enhanced build script with Replit host fixes
# This script improves the build process for Replit deployment
# Author: Replit AI Assistant
# Date: March 30, 2025

echo "=== Improved Build Script for Replit Deployment ==="
echo "This script will prepare and build the application for Replit deployment"

# Step 1: Create symbolic link from client/src to src (if needed)
if [ ! -L "src" ]; then
  echo "Creating symbolic link from client/src to src..."
  rm -rf src
  ln -sf client/src src
  echo "Symbolic link created successfully"
else
  echo "Symbolic link already exists, skipping"
fi

# Step 2: Set up environment variables for production
echo "Setting up environment variables for production..."
export NODE_ENV=production
export VITE_ALLOW_REPLIT_HOST=true

# Step 3: Create server config with allowed hosts
echo "Creating server configuration with allowed hosts..."
node create-vite-server-config.js
echo "Server configuration created"

# Step 4: Check if dist directory exists
if [ -d "dist" ]; then
  echo "Cleaning existing dist directory..."
  rm -rf dist
fi

# Step 5: Build the application with production settings
echo "Building the application for production..."
echo "Running npm run build..."
npm run build

# Step 6: Verify build artifacts
if [ -f "dist/index.js" ] && [ -d "dist/public" ]; then
  echo "✅ Build completed successfully!"
  echo "✅ Server code: dist/index.js"
  echo "✅ Frontend assets: dist/public/"
  echo ""
  echo "To run the application, use the following command:"
  echo "NODE_ENV=production node dist/index.js"
else
  echo "❌ Build failed!"
  echo "Please check the build logs for errors."
  exit 1
fi

# Provide deployment instructions
echo ""
echo "=== Deployment Instructions ==="
echo "1. In Replit Deployment settings, set the Build Command to:"
echo "   bash ./improved-build-for-replit.sh"
echo ""
echo "2. Set the Run Command to:"
echo "   NODE_ENV=production node dist/index.js"
echo ""
echo "3. Deploy the application by clicking 'Deploy'"
echo ""
echo "For more information, see DEPLOYMENT-GUIDE.md"