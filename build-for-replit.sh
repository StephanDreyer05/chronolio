#!/bin/bash

# Production build script for Replit deployment
echo "Building Chronolio for Replit deployment..."

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

# Build the application
echo "Building the application..."
NODE_ENV=production npm run build

echo "Build complete!"