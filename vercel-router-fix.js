/**
 * Vercel Router Path Fix Script
 * 
 * This script fixes import path issues in the Vercel.js file to properly handle
 * TypeScript compilation in Vercel's serverless environment.
 * 
 * It ensures all import paths use the .js extension which is required when TypeScript
 * files are compiled to JavaScript in Vercel's environment.
 */

import fs from 'fs';
import path from 'path';

const VERCEL_JS_PATH = './vercel.js';

// Helper function to add .js extension to import paths if missing
function addJsExtensionToImports(content) {
  // Match import statements that don't end with .js (or other valid extensions)
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  
  return content.replace(importRegex, (match, importPath) => {
    // Skip if the import path already has a file extension or is a package import
    if (
      importPath.includes('.js') || 
      importPath.includes('.mjs') || 
      importPath.includes('.cjs') ||
      importPath.includes('.json') || 
      !importPath.startsWith('./')
    ) {
      return match;
    }
    
    // Skip node_modules imports (they don't start with ./ or ../)
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
      return match;
    }
    
    // Check if this is a directory import (potentially problematic)
    const fullPath = path.resolve(path.dirname(VERCEL_JS_PATH), importPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      // Look for index.ts or index.js in the directory
      if (fs.existsSync(path.join(fullPath, 'index.ts'))) {
        return match.replace(importPath, `${importPath}/index.js`);
      } else if (fs.existsSync(path.join(fullPath, 'index.js'))) {
        return match.replace(importPath, `${importPath}/index.js`);
      }
      
      // Look for a .ts file with the same name as the directory
      const dirName = path.basename(fullPath);
      const potentialTsFile = path.join(path.dirname(fullPath), `${dirName}.ts`);
      
      if (fs.existsSync(potentialTsFile)) {
        return match.replace(importPath, `${importPath}.js`);
      }
      
      console.warn(`⚠️ Warning: Directory import detected at ${importPath}, but couldn't find a suitable file to import.`);
      return match;
    }
    
    // For file imports, check if there's a .ts version and update to .js
    const tsPath = `${fullPath}.ts`;
    if (fs.existsSync(tsPath)) {
      return match.replace(importPath, `${importPath}.js`);
    }
    
    // If we can't resolve the import path, leave it unchanged but log a warning
    console.warn(`⚠️ Warning: Couldn't resolve import path ${importPath}`);
    return match;
  });
}

// Main function to fix the vercel.js file
async function fixVercelImports() {
  console.log('🔧 Fixing import paths in vercel.js for Vercel deployment...');
  
  try {
    if (!fs.existsSync(VERCEL_JS_PATH)) {
      console.error('❌ Error: vercel.js file not found!');
      return false;
    }
    
    const content = fs.readFileSync(VERCEL_JS_PATH, 'utf8');
    const fixedContent = addJsExtensionToImports(content);
    
    if (content !== fixedContent) {
      // Backup the original file first
      const backupPath = `${VERCEL_JS_PATH}.backup`;
      fs.writeFileSync(backupPath, content);
      console.log(`✅ Created backup of original file at ${backupPath}`);
      
      // Write the fixed content
      fs.writeFileSync(VERCEL_JS_PATH, fixedContent);
      console.log('✅ Fixed import paths in vercel.js');
      
      // Identify what was changed
      const originalImports = [...content.matchAll(/import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g)]
        .map(match => match[1])
        .filter(path => path.startsWith('./') || path.startsWith('../'));
      
      const fixedImports = [...fixedContent.matchAll(/import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g)]
        .map(match => match[1])
        .filter(path => path.startsWith('./') || path.startsWith('../'));
      
      console.log('\nChanges made:');
      for (let i = 0; i < originalImports.length; i++) {
        if (originalImports[i] !== fixedImports[i]) {
          console.log(`${originalImports[i]} → ${fixedImports[i]}`);
        }
      }
      
      return true;
    } else {
      console.log('✅ No changes needed - all import paths already have correct extensions');
      return true;
    }
  } catch (error) {
    console.error('❌ Error fixing import paths:', error.message);
    return false;
  }
}

// Run the fix function
fixVercelImports().then(success => {
  if (success) {
    console.log('\n🎉 Import paths fixed successfully!');
    console.log('Remember to commit these changes before deploying to Vercel.');
  } else {
    console.error('\n❌ Failed to fix import paths.');
    process.exit(1);
  }
});