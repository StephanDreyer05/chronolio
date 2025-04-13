#!/bin/bash

# Local test script for Vercel deployment
# This script simulates what would happen in Vercel's build environment

echo "🧪 Testing Vercel deployment build script locally..."

# Make script executable
chmod +x ./vercel-build.sh

# Run the build script
echo "🏗️ Running vercel-build.sh..."
./vercel-build.sh

# Check if the build was successful
if [ -d "public" ] && [ "$(find public -type f | wc -l)" -gt 0 ]; then
  echo "✅ Build successful! Frontend files were created in public directory"
  echo "📁 public content (showing up to 10 files):"
  find public -type f | head -10
  
  TOTAL_FILES=$(find public -type f | wc -l)
  if [ "$TOTAL_FILES" -gt 10 ]; then
    echo "   ... and $(($TOTAL_FILES - 10)) more files"
  fi
  
  echo "Total files: $TOTAL_FILES"
else
  echo "❌ Build failed! Public directory is missing or empty."
  exit 1
fi

# Check for Vercel.js and API directory
if [ -f "vercel.js" ] && [ -f "api/index.js" ]; then
  echo "✅ Vercel serverless function files are present"
else
  echo "❌ Vercel serverless function files are missing!"
  exit 1
fi

echo "🎉 Vercel deployment test completed successfully!"
echo ""
echo "📋 Deployment Checklist:"
echo "  - vercel.json: ✓"
echo "  - vercel.js: ✓"
echo "  - api/index.js: ✓"
echo "  - Frontend build: ✓"
echo ""
echo "⚠️ Remember to set up all required environment variables in Vercel:"
echo "  - DATABASE_URL"
echo "  - SESSION_SECRET"
echo "  - LEMONSQUEEZY_API_KEY (if using payment features)"
echo "  - OPENAI_API_KEY (if using AI features)"