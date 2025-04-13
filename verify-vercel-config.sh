#!/bin/bash

# Lightweight script to verify only the Vercel configuration, without running a build
# This is useful for quick checks before pushing changes

echo "🔍 Verifying Vercel deployment configuration..."

# Check that all required files exist
echo "Checking required files..."
MISSING_FILES=0

for FILE in vercel.json vercel.js api/index.js vercel-build.sh
do
  if [ -f "$FILE" ]; then
    echo "✅ $FILE exists"
  else
    echo "❌ $FILE is missing!"
    ((MISSING_FILES++))
  fi
done

# Validate vercel.json structure
echo ""
echo "Checking vercel.json..."
if [ -f "vercel.json" ]; then
  # Simple grep check for key fields instead of using jq
  if grep -q "version" vercel.json; then
    echo "✅ version field found"
  else
    echo "❌ version field missing!"
    ((MISSING_FILES++))
  fi
  
  if grep -q "outputDirectory" vercel.json; then
    OUTPUT_DIR=$(grep -o '"outputDirectory": *"[^"]*"' vercel.json | cut -d'"' -f4)
    echo "📂 Output directory: $OUTPUT_DIR"
  else
    echo "⚠️ outputDirectory not specified (will use default)"
  fi
  
  if grep -q "buildCommand" vercel.json; then
    BUILD_CMD=$(grep -o '"buildCommand": *"[^"]*"' vercel.json | cut -d'"' -f4)
    echo "🔨 Build command: $BUILD_CMD"
  else
    echo "⚠️ buildCommand not specified (will use package.json)"
  fi
fi

# Simple check for package.json build script
echo ""
echo "Checking package.json build script..."
if [ -f "package.json" ]; then
  if grep -q '"build":.*"vercel-build.sh"' package.json; then
    echo "✅ package.json has Vercel-compatible build script"
  else
    BUILD_SCRIPT=$(grep -o '"build":.*' package.json | sed 's/"build": "//;s/",//')
    echo "⚠️ package.json has custom build script: $BUILD_SCRIPT"
    echo "   For Vercel deployment, consider setting: \"build\": \"./vercel-build.sh\""
  fi
else
  echo "❌ package.json is missing!"
  ((MISSING_FILES++))
fi

# Set file permissions if needed
if [ -f "vercel-build.sh" ] && [ ! -x "vercel-build.sh" ]; then
  echo ""
  echo "⚠️ vercel-build.sh is not executable, fixing permissions..."
  chmod +x vercel-build.sh
  echo "✅ Permissions fixed for vercel-build.sh"
fi

# Check for database-specific files
echo ""
echo "Checking database configuration..."
if [ -d "db" ]; then
  echo "✅ db directory exists"
  
  if [ -f "db/vercel-db.js" ]; then
    echo "✅ db/vercel-db.js exists (Vercel-specific database config)"
  else
    echo "⚠️ db/vercel-db.js does not exist (recommended for Vercel)"
  fi
  
  if [ -f "db/schema.ts" ]; then
    echo "✅ db/schema.ts exists"
    
    # Check for last_modified field in schema
    if grep -q "last_modified" db/schema.ts; then
      echo "✅ last_modified field found in schema"
    else
      echo "⚠️ last_modified field not found in schema"
      echo "   This might cause TypeScript errors in Vercel deployment"
      echo "   Run 'node fix-vercel-database.js' to add this field automatically"
    fi
  else
    echo "❌ db/schema.ts is missing"
    ((MISSING_FILES++))
  fi
else
  echo "❌ db directory is missing"
  ((MISSING_FILES++))
fi

# Check for environment variable configuration in .env or similar
echo ""
echo "Checking environment variables..."
if [ -f ".env" ] || [ -f ".env.example" ]; then
  ENV_FILE=".env"
  if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    ENV_FILE=".env.example"
  fi
  
  if grep -q "DATABASE_URL" $ENV_FILE; then
    echo "✅ DATABASE_URL found in $ENV_FILE"
  else
    echo "⚠️ DATABASE_URL not found in $ENV_FILE"
    echo "   Make sure to add this in your Vercel environment variables"
  fi
else
  echo "⚠️ No .env or .env.example file found"
  echo "   Make sure to configure environment variables in Vercel"
fi

# Summary
echo ""
echo "🏁 Verification Summary:"
if [ $MISSING_FILES -eq 0 ]; then
  echo "✅ All required Vercel configuration files are present"
  echo "🚀 Project is ready for Vercel deployment"
else
  echo "❌ $MISSING_FILES issue(s) found"
  echo "   Please fix the issues above before deploying to Vercel"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Ensure your PostgreSQL database is accessible from Vercel"
echo "2. Push these changes to your repository"
echo "3. Set up the project on Vercel"
echo "4. Configure environment variables (especially DATABASE_URL)"
echo "5. Deploy to Vercel"
echo "6. Check the health endpoint at https://your-app.vercel.app/api/health"