#!/bin/bash

# copy-instead-of-symlink.sh: Alternative approach using file copy instead of symlinks
# Author: Replit AI Assistant
# Date: March 30, 2025

echo "=== Using File Copy Instead of Symlink ==="

# Remove any existing src directory
if [ -d "src" ] || [ -L "src" ]; then
  echo "Removing existing src directory or symlink..."
  rm -rf src
fi

# Create new src directory
echo "Creating new src directory..."
mkdir -p src

# Copy all files from client/src to src
echo "Copying files from client/src to src..."
cp -R client/src/* src/

# Verify the copy
if [ -f "src/main.tsx" ]; then
  echo "✅ Copy successful! src/main.tsx exists."
else
  echo "❌ Copy failed! src/main.tsx not found."
  exit 1
fi

echo "File copy completed successfully. Now running build..."

# Set environment variables for production
export NODE_ENV=production

# Run the build
echo "Building the application..."
npm run build

echo "Build process completed."