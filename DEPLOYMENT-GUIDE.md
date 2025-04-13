# Deployment Guide for Chronolio on Replit

This guide provides detailed instructions for deploying Chronolio on Replit, including important fixes for common deployment issues.

## Understanding the Project Structure

Chronolio has a specific directory structure:
- `/client/src` contains the frontend React code
- `/server` contains the backend Express code
- Vite is configured to look for frontend code in `/src` but our actual code is in `/client/src`

## Important Updates (March 2025)

We've added several scripts to facilitate development and deployment on Replit:

1. `improved-vite-fix.sh` - A more reliable solution for Replit deployment that:
   - Creates the necessary symbolic link between `client/src` and `src`
   - Sets up Replit environment variables
   - Provides a direct server implementation with explicit host configuration
   - Properly configures path aliases for Vite
   - Manages port conflicts automatically

2. `dev-with-replit-fixes.sh` - A comprehensive script that:
   - Creates the necessary symbolic link between `client/src` and `src`
   - Sets up Replit environment variables
   - Applies Vite configuration patches for Replit host compatibility
   - Starts the development server with all fixes applied

3. `direct-vite-fix.sh` - A direct override approach that:
   - Creates a custom Vite server configuration
   - Explicitly allows Replit hosts in the server configuration
   - Bypasses the need to modify the original vite.ts

4. `patch-vite-config.js` - A script that modifies Vite's configuration to:
   - Enable HMR (Hot Module Replacement) on Replit hosts
   - Properly handle WebSocket connections for development
   - Allow external Replit hosts to access the development server

## Deployment Steps

### 1. Prepare for Deployment

Before deploying, you'll need to modify the build and run commands in the Replit deployment interface:

#### Build Command (Recommended)
```
bash ./improved-build-for-replit.sh
```

#### Alternative Build Command
```
bash ./build-for-replit.sh
```

#### Run Command
```
NODE_ENV=production node dist/index.js
```

### 2. Important Symbolic Link Setup

The most critical part of the deployment is ensuring the correct symbolic link exists between `/src` and `/client/src`. This is handled automatically by our deployment scripts:

- `build-for-replit.sh` creates the symbolic link before building
- `replit-startup.sh` creates the symbolic link before running the application
- The symlink ensures Vite can find the correct `main.tsx` file at build time

### 3. Deploy the Application

1. Click on the "Deploy" button in the Replit interface
2. Configure the build and run commands as mentioned above
3. Click "Deploy" to start the deployment process

### 4. Verify the Deployment

Once deployed, check that:
- The application loads correctly without any "Failed to load" errors
- API endpoints respond as expected
- The database connection works properly
- The frontend renders correctly

## Troubleshooting

If you encounter any issues during deployment:

1. Check the deployment logs for errors
2. Verify that the build process completes successfully - look for "Build complete!" message
3. If you see errors about missing files (especially `src/main.tsx`), run the following commands manually:
   ```
   rm -rf src
   ln -sf client/src src
   ```
4. Run the test script to verify the symlink is working:
   ```
   ./test-deploy.sh
   ```
5. Ensure that the database is accessible 
6. If necessary, revert to the development environment to fix issues before redeploying

## Common Issues and Solutions

### "Failed to load url /src/main.tsx"
This error occurs when Vite cannot find the main entry point. The solution is:
1. Remove any existing src directory: `rm -rf src`
2. Create a symbolic link to client/src: `ln -sf client/src src`
3. Rebuild the application: `bash ./build-for-replit.sh`

### "403 Forbidden" or "Invalid Host/Origin" Errors
This error occurs when the Vite development server rejects connections from Replit domains. The solutions are:

**For Development:**
1. Use our improved fix script which provides the most reliable solution: `./improved-vite-fix.sh`
2. Alternatively, use our direct fix script which explicitly includes your Replit host: `./direct-vite-fix.sh`
3. If you see the specific error message: `Blocked request. This host ("your-host.replit.dev") is not allowed`, update the host in the script you're using.

**Alternative Solutions:**
1. Use our standard script with Replit host fixes: `./dev-with-replit-fixes.sh`
2. For more complex host issues, you can create a custom `server/config/allowed-hosts.js` file with your specific Replit host included
3. You can modify the Replit workflow to use any of these scripts (see the WORKFLOW-UPDATE-MANUAL.md file)

**For Production:**
1. Make sure the build process is complete before deployment
2. Use the production mode which doesn't have host restrictions: `NODE_ENV=production node dist/index.js`

### Build fails to complete
If the build process hangs or fails:
1. Clean all build artifacts: `rm -rf dist src`
2. Ensure NODE_ENV is set: `export NODE_ENV=production`
3. Run the improved build script: `bash ./improved-build-for-replit.sh`
4. If the improved script still fails, try the standard build script: `bash ./build-for-replit.sh`

### Incorrect file structure in deployment
Make sure the following files and directories are present:
- `dist/public/` should contain all frontend assets
- `dist/index.js` should be the compiled server code
- The symbolic link `src -> client/src` should be correctly established

## Support

For any questions or issues with deployment, contact the development team.