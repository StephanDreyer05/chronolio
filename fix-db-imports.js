/**
 * Script to fix @db imports for Vercel deployment
 * This script calculates correct relative paths based on file locations
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRelativePath(fromFile, toFile) {
  const fromDir = path.dirname(fromFile);
  let relativePath = path.relative(fromDir, toFile)
    .replace(/\\/g, '/'); // Normalize path separators for Windows compatibility
  
  // Ensure the path starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

try {
  console.log('Finding files with @db imports...');
  // Search in both server/ and db/ directories
  const result = execSync('grep -l "@db" --include="*.ts" --include="*.js" -r server/ db/').toString();
  const files = result.split('\n').filter(Boolean);
  
  console.log(`Found ${files.length} files with @db imports`);
  
  // Process each file
  files.forEach(file => {
    console.log(`\nProcessing ${file}...`);
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Special handling for db/index.ts itself
    if (file === 'db/index.ts' || file === 'db/index.js') {
      content = content.replace(/from ["']@db\/schema["']/g, 'from "./schema.js"');
      console.log('Updated db/index.ts with local import "./schema.js"');
    } else {
      // Get the correct relative paths for this file
      const dbPath = getRelativePath(file, 'db/index.js');
      const schemaPath = getRelativePath(file, 'db/schema.js');
      
      // Replace @db with the correct relative paths
      content = content.replace(/from ["']@db["']/g, `from "${dbPath}"`);
      content = content.replace(/from ["']@db\/schema["']/g, `from "${schemaPath}"`);
      
      console.log('Updated paths:', {
        file,
        dbImport: `from "${dbPath}"`,
        schemaImport: `from "${schemaPath}"`
      });
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(file, content);
    console.log(`✓ Successfully updated ${file}`);
  });
  
  console.log('\n✅ All @db imports have been fixed!');
} catch (error) {
  console.error('\n❌ Error fixing imports:', error);
  process.exit(1);
}