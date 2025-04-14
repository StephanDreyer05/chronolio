/**
 * Script to update package.json with AWS SDK dependencies
 * 
 * This script safely adds AWS SDK dependencies to package.json.
 * Run this locally with 'node update-package-deps.js' before running npm install.
 */

const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(__dirname, 'package.json');

// Read package.json
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check if AWS SDK deps already exist
  const hasClientS3 = packageJson.dependencies['@aws-sdk/client-s3'];
  const hasPresigner = packageJson.dependencies['@aws-sdk/s3-request-presigner'];
  
  // Only add if dependencies don't already exist
  if (!hasClientS3) {
    console.log('Adding @aws-sdk/client-s3 dependency');
    packageJson.dependencies['@aws-sdk/client-s3'] = '^3.445.0';
  }
  
  if (!hasPresigner) {
    console.log('Adding @aws-sdk/s3-request-presigner dependency');
    packageJson.dependencies['@aws-sdk/s3-request-presigner'] = '^3.445.0';
  }
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Package.json updated successfully');
  console.log('Now run npm install to update the package-lock.json file');
} catch (error) {
  console.error('Error updating package.json:', error);
} 