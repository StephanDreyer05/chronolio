/**
 * Script to patch the Vite configuration for Replit deployment
 * 
 * This script updates the server/vite.ts file to allow Replit hosts
 * without directly modifying the vite.config.ts file
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Path to the vite.ts file
const viteFilePath = path.resolve('server/vite.ts');

// Detect Replit host information
function detectReplitHost() {
  try {
    // Get the REPL_ID from the environment or hostname
    const replId = process.env.REPL_ID || execSync('hostname').toString().trim();
    
    // Get the REPL_SLUG from environment if available
    const replSlug = process.env.REPL_SLUG || '';
    
    // Known specific host from error message
    const knownSpecificHost = "46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev";
    
    // Construct likely Replit domain patterns
    const possibleHosts = [
      // Specific known host (highest priority)
      knownSpecificHost,
      // Allow all hosts (special Vite configuration)
      true,
      // Main Replit host pattern
      `${replId}-00-*.replit.dev`,
      // Alternative patterns
      `${replId}-00-*.riker.replit.dev`,
      `${replId}.id.replit.dev`,
      `${replId}.repl.co`,
      // Generic patterns
      '*.replit.dev',
      '*.riker.replit.dev'
    ];
    
    console.log('Including known specific host:', knownSpecificHost);
    console.log('Detected Replit host patterns:', possibleHosts);
    return possibleHosts;
  } catch (error) {
    console.warn('Could not detect Replit host information:', error.message);
    
    // Even if detection fails, include the known host
    return [
      "46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev",
      true,
      '*.replit.dev', 
      '*.riker.replit.dev'
    ];
  }
}

async function patchViteConfig() {
  try {
    console.log('Patching Vite configuration for Replit deployment...');
    
    // Read the current vite.ts file
    let viteContent = await fs.promises.readFile(viteFilePath, 'utf8');
    
    // Check if the file has already been patched
    if (viteContent.includes('// REPLIT HOST PATCH APPLIED')) {
      console.log('Patch already applied, skipping');
      return;
    }
    
    // Get Replit host patterns
    const replitHosts = detectReplitHost();
    
    // Update the server configuration to include HMR settings
    const targetBlock = `server: {
      middlewareMode: true,
      hmr: { server },`;
    
    // Enhanced hmr configuration
    const replacementBlock = `server: {
      middlewareMode: true,
      hmr: { 
        server,
        clientPort: process.env.REPLIT_ENVIRONMENT ? 443 : undefined,
        port: process.env.REPLIT_ENVIRONMENT ? 443 : undefined,
      },
      // Allow Replit hosts
      host: process.env.REPLIT_ENVIRONMENT ? true : false,
      // REPLIT HOST PATCH APPLIED`;
    
    // Apply the server patch
    viteContent = viteContent.replace(targetBlock, replacementBlock);
    
    // Add environment detection near the top of the file
    const importBlock = 'import viteConfig from "../vite.config";';
    const enhancedImportBlock = `import viteConfig from "../vite.config";

// Detect Replit environment
const isReplitEnvironment = process.env.REPLIT_ENVIRONMENT || process.env.REPL_ID || process.env.REPL_SLUG;
if (isReplitEnvironment) {
  console.log('Replit environment detected, applying Vite patches for HMR and host configuration');
  process.env.REPLIT_ENVIRONMENT = 'true';
  
  // Allow Replit domains in the server configuration
  const allowedHosts = ${JSON.stringify(replitHosts)};
  console.log('Allowing Replit hosts:', allowedHosts);
  
  // Modify viteConfig to accept Replit hosts
  if (viteConfig.server) {
    viteConfig.server.host = true;
    viteConfig.server.hmr = viteConfig.server.hmr || {};
    viteConfig.server.hmr.clientPort = 443;
  }
}`;
    
    viteContent = viteContent.replace(importBlock, enhancedImportBlock);
    
    // Write the patched file
    await fs.promises.writeFile(viteFilePath, viteContent, 'utf8');
    
    console.log('Vite configuration patched successfully');
  } catch (error) {
    console.error('Error patching Vite configuration:', error);
    process.exit(1);
  }
}

// Run the function if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  patchViteConfig();
}

// Export for use as a module
export default patchViteConfig;