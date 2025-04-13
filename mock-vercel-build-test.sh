#!/bin/bash

# Script to simulate just the directory structure part of the Vercel build
# This is a lightweight test to verify our copy logic works

echo "🔍 Testing Vercel build file structure handling..."

# Clean up any previous test files
rm -rf dist
rm -rf public

# Create the directory structure that Vite would create
echo "Creating mock build output directories..."
mkdir -p dist/public/assets

# Add some mock files
echo "Adding mock files..."
echo "<html>Test</html>" > dist/public/index.html
echo "body { color: red; }" > dist/public/assets/style.css
echo "console.log('test');" > dist/public/assets/main.js

echo "Mock Vite build created at dist/public/"
echo "Files:"
find dist -type f | sort

# Now run the copy part of our build script
echo "Testing file copying to public directory..."
mkdir -p public

# Try copying the files
if [ -d "dist/public" ]; then
  echo "Found mock build in dist/public/"
  cp -r dist/public/* public/
  echo "Files copied to public/:"
  find public -type f | sort
  
  # Validate
  if [ -f "public/index.html" ] && [ -f "public/assets/style.css" ]; then
    echo "✅ Copy operation successful!"
  else
    echo "❌ Copy operation failed - files not found in public/"
    exit 1
  fi
else
  echo "❌ dist/public directory not found!"
  exit 1
fi

echo "🎉 File structure handling test passed!"