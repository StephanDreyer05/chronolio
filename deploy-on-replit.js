/**
 * Replit-specific deployment script
 * 
 * This script helps deploy the application on Replit's platform.
 * It handles the specific requirements for Replit deployment.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function deployOnReplit() {
  try {
    console.log('Starting Replit deployment process...');
    
    // Step 1: Clean up any previous builds
    console.log('Step 1: Cleaning up previous builds');
    if (fs.existsSync('dist')) {
      await runCommand('rm -rf dist');
    }
    
    // Always remove src to ensure clean state
    if (fs.existsSync('src')) {
      await runCommand('rm -rf src');
    }
    
    // Step 2: Setup the correct src directory
    console.log('Step 2: Setting up the correct directory structure');
    await runCommand('ln -sf client/src src');
    
    // Step 3: Build the application
    console.log('Step 3: Building the application');
    await runCommand('NODE_ENV=production npm run build');
    
    // Step 4: Check build output structure
    console.log('Step 4: Checking build output structure');
    if (!fs.existsSync('dist/public')) {
      console.error('Build failed - dist/public directory not found');
      process.exit(1);
    }
    
    if (!fs.existsSync('dist')) {
      console.error('Build failed - dist directory not found');
      process.exit(1);
    }
    
    // Step 5: Verify server executable exists
    console.log('Step 5: Verifying server executable');
    const indexPath = path.resolve('dist', 'index.js');
    if (!fs.existsSync(indexPath)) {
      console.error(`Build failed - server executable not found at ${indexPath}`);
      process.exit(1);
    }
    
    console.log('Deployment preparation complete. The application is ready to be run on Replit.');
    console.log('Run `NODE_ENV=production node dist/index.js` to start the server in production mode.');
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deployOnReplit();