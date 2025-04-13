/**
 * Deployment workflow script
 * This script automates the deployment process for the application
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

async function deploy() {
  try {
    console.log('Starting deployment workflow...');
    
    // Step 1: Make sure scripts are executable
    console.log('Step 1: Making scripts executable');
    await runCommand('chmod +x production-build.sh replit-startup.sh');
    
    // Step 2: Run the production build script
    console.log('Step 2: Building for production');
    await runCommand('./production-build.sh');
    
    // Step 3: Start the server using the replit-specific startup script
    console.log('Step 3: Starting the server');
    
    // Set environment variables for production mode
    process.env.NODE_ENV = 'production';
    
    // Use the Replit startup script
    await runCommand('./replit-startup.sh');
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy();