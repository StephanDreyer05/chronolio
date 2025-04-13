/**
 * Script to update package.json with Vercel-specific build script
 * 
 * This script modifies the build script in package.json to use our custom Vercel build script.
 * Run with: node update-package-json.js
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to package.json
const packageJsonPath = path.join(__dirname, 'package.json');

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.error(`Error: package.json not found at ${packageJsonPath}`);
  process.exit(1);
}

try {
  // Read and parse package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Save the original build script
  const originalBuildScript = packageJson.scripts.build;
  
  // Update scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    build: './vercel-build.sh',
    'build:original': originalBuildScript,
    'vercel:validate': './validate-vercel-setup.sh',
    'vercel:check': './verify-vercel-config.sh'
  };
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Successfully updated package.json with Vercel build script');
  console.log('Original build script saved as "build:original"');
  console.log('Added validation scripts "vercel:validate" and "vercel:check"');
} catch (error) {
  console.error('Error updating package.json:', error.message);
  process.exit(1);
}