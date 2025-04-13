# Replit Deployment Scripts

This document provides a quick reference for all the deployment scripts available in this project.

## Development Scripts

### `improved-vite-fix.sh`
**Recommended for development**
- Creates symlink from client/src to src
- Stops any existing server on port 5000
- Sets up environment variables for Replit
- Creates a direct server implementation with proper path aliases
- Handles both API and frontend requests
- Usage: `bash ./improved-vite-fix.sh`

### `dev-with-replit-fixes.sh`
**Original development fix**
- Creates symlink from client/src to src
- Sets up environment variables for Replit
- Patches the Vite configuration
- Starts the development server with the standard Express setup
- Usage: `bash ./dev-with-replit-fixes.sh`

### `direct-vite-fix.sh`
**First direct implementation approach**
- Creates symlink from client/src to src
- Sets up environment variables for Replit
- Creates a custom server implementation that bypasses vite.ts
- Usage: `bash ./direct-vite-fix.sh`

## Build Scripts

### `improved-build-for-replit.sh`
**Recommended for production deployment**
- Creates symlink from client/src to src
- Sets up environment variables for Replit
- Creates a proper Vite configuration for production
- Builds the application with production settings
- Creates server configuration with allowed hosts
- Usage: `bash ./improved-build-for-replit.sh`

### `build-for-replit.sh`
**Original build script**
- Creates symlink from client/src to src
- Builds the application with production settings
- Usage: `bash ./build-for-replit.sh`

### `build-and-run-for-replit.sh`
**Build and run in one step**
- Combines building and running for convenience
- Creates necessary symlinks
- Builds with production settings
- Starts the server after build completes
- Usage: `bash ./build-and-run-for-replit.sh`

## Utility Scripts

### `test-deploy.sh`
**Tests symlink configuration**
- Verifies that the symlink from client/src to src is working correctly
- Ensures Vite can find the main.tsx file
- Usage: `bash ./test-deploy.sh`

### `patch-vite-config.js`
**Utility to patch Vite configuration**
- Modifies server/vite.ts to allow Replit hosts
- Called by other scripts, not typically used directly
- Usage: `node patch-vite-config.js`

### `create-vite-server-config.js`
**Creates a server config for Vite**
- Creates a server.allowedHosts.js file for explicit host configuration
- Called by other scripts, not typically used directly
- Usage: `node create-vite-server-config.js`

## Documentation

For more detailed information, please refer to:
- `DEPLOYMENT-GUIDE.md` - Comprehensive deployment guide
- `WORKFLOW-UPDATE-MANUAL.md` - Instructions for updating Replit workflows

## Troubleshooting

If you encounter issues with any script:
1. Check the console output for specific error messages
2. Verify that the symbolic link exists: `ls -la src`
3. Make sure no other process is using port 5000: `fuser -k 5000/tcp`
4. Try running one of the alternative scripts