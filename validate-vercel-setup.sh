#!/bin/bash

# Validate Vercel deployment setup without running the full build process
# This quick validation script helps identify configuration issues with Vercel setup

echo "🔍 Validating Vercel deployment setup..."

# Function to check if file exists and display status
check_file() {
  if [ -f "$1" ]; then
    echo "✅ $1 exists"
    
    # For key files, show a summary of their content
    if [[ "$1" == "./vercel.json" ]]; then
      echo "   📄 Content summary:"
      grep -e "version" -e "builds" -e "routes" -e "functions" "$1" | sed 's/^/     /'
    fi
    
    return 0
  else
    echo "❌ $1 is missing!"
    return 1
  fi
}

# Check for required Vercel deployment files
echo "Checking required files:"
MISSING_FILES=0

# Check core Vercel files
check_file "./vercel.json" || ((MISSING_FILES++))
check_file "./vercel.js" || ((MISSING_FILES++))
check_file "./api/index.js" || ((MISSING_FILES++))
check_file "./vercel-build.sh" || ((MISSING_FILES++))

# Check for essential build/config files
echo ""
echo "Checking build configuration:"
check_file "./package.json" || ((MISSING_FILES++))
check_file "./vite.config.ts" || ((MISSING_FILES++))
check_file "./tsconfig.json" || ((MISSING_FILES++))

# Check directory structure
echo ""
echo "Checking directory structure:"
if [ -d "./public" ]; then
  echo "✅ public/ directory exists"
else
  echo "⚠️ public/ directory not found (will be created during build)"
fi

if [ -d "./client" ]; then
  echo "✅ client/ directory exists"
else
  echo "❌ client/ directory not found! This may cause build issues"
  ((MISSING_FILES++))
fi

if [ -d "./server" ]; then
  echo "✅ server/ directory exists"
else
  echo "❌ server/ directory not found! This may cause build issues"
  ((MISSING_FILES++))
fi

# Check permissions
echo ""
echo "Checking file permissions:"
if [ -x "./vercel-build.sh" ]; then
  echo "✅ vercel-build.sh is executable"
else
  echo "⚠️ vercel-build.sh is not executable (run chmod +x vercel-build.sh)"
  chmod +x ./vercel-build.sh
  echo "   🔧 Permissions fixed automatically"
fi

# Check package.json for build script
echo ""
echo "Checking package.json configuration:"
if grep -q '"build":.*"vercel-build.sh"' package.json; then
  echo "✅ package.json has correct build script"
else
  echo "⚠️ package.json may not have the correct build script"
  echo "   Expected: \"build\": \"./vercel-build.sh\""
  echo "   Current build script:"
  grep -o '"build":.*' package.json | sed 's/^/     /'
fi

# Check for database configuration
echo ""
echo "Checking database configuration:"
WARN_COUNT=0

if [ -d "./db" ]; then
  echo "✅ db/ directory exists"
  
  if [ -f "./db/vercel-db.js" ]; then
    echo "✅ db/vercel-db.js exists (specialized configuration for Vercel)"
  else
    echo "⚠️ db/vercel-db.js does not exist"
    echo "   Consider creating this file for optimized database handling on Vercel"
    ((WARN_COUNT++))
  fi
  
  if [ -f "./db/schema.ts" ]; then
    echo "✅ db/schema.ts exists"
    
    # Check for schema compatibility issues
    if grep -q "last_modified" ./db/schema.ts; then
      echo "✅ schema includes last_modified field (compatible with Vercel)"
    else
      echo "⚠️ schema may not include last_modified field"
      echo "   This could cause build or runtime errors on Vercel"
      echo "   Run 'node fix-vercel-database.js' to add this compatibility"
      ((WARN_COUNT++))
    fi
  else
    echo "❌ db/schema.ts not found"
    ((MISSING_FILES++))
  fi
  
  if [ -f "./fix-vercel-database.js" ]; then
    echo "✅ fix-vercel-database.js exists (can fix schema compatibility issues)"
  else
    echo "⚠️ fix-vercel-database.js not found"
    echo "   This utility helps resolve database compatibility issues"
    ((WARN_COUNT++))
  fi
  
  # Check for additional database tools
  if [ -f "./test-vercel-database.js" ]; then
    echo "✅ test-vercel-database.js exists (advanced database connectivity tester)"
  else
    echo "⚠️ test-vercel-database.js not found (helpful for diagnosing connection issues)"
  fi
  
  if [ -f "./verify-db-schema.js" ]; then
    echo "✅ verify-db-schema.js exists (can verify database schema)"
  else
    echo "⚠️ verify-db-schema.js not found (helpful for verifying database structure)"
  fi
  
  if [ -f "./ensure-vercel-schema.js" ]; then
    echo "✅ ensure-vercel-schema.js exists (can ensure database tables exist)"
  else
    echo "⚠️ ensure-vercel-schema.js not found (helpful for creating missing tables)"
  fi
  
  if [ -f "./transfer-database.js" ]; then
    echo "✅ transfer-database.js exists (can transfer data between databases)"
  else
    echo "⚠️ transfer-database.js not found (helpful when switching database providers)"
  fi
  
  if [ -f "./vercel-router-fix.js" ]; then
    echo "✅ vercel-router-fix.js exists (fixes import paths for Vercel deployment)"
  else
    echo "⚠️ vercel-router-fix.js not found (needed to fix directory import issues)"
    echo "   This may cause ERR_UNSUPPORTED_DIR_IMPORT errors in Vercel"
    ((WARN_COUNT++))
  fi
else
  echo "❌ db/ directory not found"
  ((MISSING_FILES++))
fi

# Check for health check endpoint
echo ""
echo "Checking health check endpoints:"
if grep -q "/api/health" ./vercel.js || grep -q "/api/db-health" ./api/index.js; then
  echo "✅ Health check endpoint detected"
  echo "   This will help diagnose issues after deployment"
else
  echo "⚠️ No health check endpoint detected"
  echo "   Consider adding an API health check endpoint for easier troubleshooting"
  ((WARN_COUNT++))
fi

# Summary
echo ""
echo "🏁 Validation Summary:"
if [ $MISSING_FILES -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
  echo "✅ All required files are present and optimally configured"
  echo "🚀 Ready for Vercel deployment"
elif [ $MISSING_FILES -eq 0 ]; then
  echo "⚠️ All required files are present but with $WARN_COUNT warning(s)"
  echo "🚀 Can deploy to Vercel, but consider addressing warnings for optimal setup"
else
  echo "❌ $MISSING_FILES required file(s) missing"
  echo "⚠️ $WARN_COUNT warning(s) detected"
  echo "   Please fix the issues above before deploying to Vercel"
fi

# Deployment instructions reminder
echo ""
echo "📋 Deployment Reminders:"
echo "1. Push all changes to your GitHub repository"
echo "2. Connect your Vercel project to your repository"
echo "3. Configure the following environment variables in Vercel:"
echo "   - DATABASE_URL"
echo "   - SESSION_SECRET"
echo "   - LEMONSQUEEZY_API_KEY (if using payment features)"
echo "   - OPENAI_API_KEY (if using AI features)"
echo "4. Deploy your project on Vercel"