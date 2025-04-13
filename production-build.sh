
#!/bin/bash

echo "Building Chronolio for production deployment..."

# Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf dist
rm -rf src

# Ensure we have the directory structure Vite expects
echo "Setting up the correct directory structure..."
mkdir -p dist/public

# Install dependencies if needed
npm install

# Prepare source files - use symlink instead of copy
echo "Preparing source files..."
ln -sf client/src src

# Set production environment
export NODE_ENV=production

# Build the client
echo "Building the client..."
npm run build

# Build the server
echo "Building the server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build complete!"
