#!/bin/bash

# Deployment preparation script for Replit
echo "Preparing for deployment on Replit..."

# Create a modified package.json with custom build and start scripts
echo "Modifying package.json for deployment..."

# Create a temporary file
cat > temp-package.json << EOL
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "bash ./production-build.sh && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": $(cat package.json | grep -A 1000 '"dependencies"' | sed -n '/dependencies/,/devDependencies/p' | head -n -1)",
  "devDependencies": $(cat package.json | grep -A 1000 '"devDependencies"' | sed -n '/devDependencies/,/optionalDependencies/p' | head -n -1)",
  "optionalDependencies": $(cat package.json | grep -A 1000 '"optionalDependencies"' | sed -n '/optionalDependencies/,/}/p')"
}
EOL

# Backup the original package.json
cp package.json package.json.backup

# Replace the original with our modified version
mv temp-package.json package.json

echo "Deployment preparation completed!"