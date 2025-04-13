/**
 * Create a direct Vite configuration file with allowed hosts
 * 
 * This creates a server.allowedHosts.js file that can be imported by Vite
 * to explicitly allow the Replit host
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// The specific host from the error message
const SPECIFIC_REPLIT_HOST = "46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev";

async function createViteServerConfig() {
  try {
    console.log('Creating Vite server configuration with allowed hosts...');
    
    // Create the server directory if it doesn't exist
    const serverConfigDir = path.resolve('server/config');
    if (!fs.existsSync(serverConfigDir)) {
      fs.mkdirSync(serverConfigDir, { recursive: true });
    }
    
    // Create the server config file
    const configFilePath = path.resolve(serverConfigDir, 'allowed-hosts.js');
    
    // Generate additional potential hosts
    const replId = process.env.REPL_ID || execSync('hostname').toString().trim();
    const additionalHosts = [
      `${replId}-00-*.replit.dev`,
      `${replId}-00-*.riker.replit.dev`,
      `${replId}.id.replit.dev`,
      `${replId}.repl.co`,
      '*.replit.dev',
      '*.riker.replit.dev'
    ];
    
    // Create the content with the specific host first (highest priority)
    const content = `/**
 * Vite server allowed hosts configuration
 * Auto-generated for Replit deployment
 */

// Specific known Replit host from error message
export const SPECIFIC_REPLIT_HOST = "${SPECIFIC_REPLIT_HOST}";

// All Replit hosts that should be allowed
export const allowedHosts = [
  SPECIFIC_REPLIT_HOST,
  ${additionalHosts.map(host => `"${host}"`).join(',\n  ')}
];

// Export for use in Vite configuration
export default allowedHosts;
`;
    
    // Write the file
    await fs.promises.writeFile(configFilePath, content, 'utf8');
    
    console.log(`Created Vite server config at ${configFilePath}`);
    
    // Now patch the server/vite.ts file to import this configuration
    await patchViteImport();
    
    console.log('Vite server configuration completed');
  } catch (error) {
    console.error('Error creating Vite server configuration:', error);
    process.exit(1);
  }
}

async function patchViteImport() {
  try {
    const viteFilePath = path.resolve('server/vite.ts');
    let viteContent = await fs.promises.readFile(viteFilePath, 'utf8');
    
    // Check if import already exists
    if (viteContent.includes('import allowedHosts from "./config/allowed-hosts"')) {
      console.log('Import for allowed hosts already exists, skipping');
      return;
    }
    
    // Add import for allowed hosts
    const importSection = 'import viteConfig from "../vite.config";';
    const newImportSection = 'import viteConfig from "../vite.config";\nimport allowedHosts from "./config/allowed-hosts.js";\n';
    
    viteContent = viteContent.replace(importSection, newImportSection);
    
    // Update server configuration to use allowed hosts
    const serverConfigSection = 'server: {';
    const newServerConfigSection = 'server: {\n      allowedHosts,';
    
    viteContent = viteContent.replace(serverConfigSection, newServerConfigSection);
    
    // Write updated content
    await fs.promises.writeFile(viteFilePath, viteContent, 'utf8');
    
    console.log('Patched server/vite.ts to import allowed hosts configuration');
  } catch (error) {
    console.error('Error patching Vite imports:', error);
  }
}

// Run the function
createViteServerConfig();