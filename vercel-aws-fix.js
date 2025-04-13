/**
 * This script installs AWS SDK packages post-build on Vercel
 * to ensure S3 functionality works properly in production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Running AWS SDK dependency fix for Vercel...');

try {
  // Install AWS SDK packages
  console.log('📦 Installing AWS SDK dependencies...');
  execSync('npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --no-save', { stdio: 'inherit' });
  
  // Create a diagnostic file to verify AWS SDK availability
  const diagnosticContent = `
    // This file is auto-generated during Vercel deployment
    // It helps diagnose AWS SDK availability
    
    export const awsSdkInstalled = true;
    export const awsSdkInstalledTime = "${new Date().toISOString()}";
    
    // Attempt to import AWS SDK to verify it's available
    try {
      require('@aws-sdk/client-s3');
      export const awsSdkImportSuccess = true;
    } catch (err) {
      export const awsSdkImportSuccess = false;
      export const awsSdkImportError = err.message;
    }
  `;
  
  fs.writeFileSync('dist/aws-diagnostic.js', diagnosticContent);
  
  console.log('✅ AWS SDK dependencies installed successfully');
  
} catch (error) {
  console.error('❌ AWS SDK installation failed:', error);
  console.log('⚠️ S3 functionality may fall back to mock implementation');
  
  // Create a fallback diagnostic file
  const fallbackContent = `
    // This file is auto-generated during Vercel deployment
    // AWS SDK installation failed
    
    export const awsSdkInstalled = false;
    export const awsSdkInstalledTime = "${new Date().toISOString()}";
    export const awsSdkInstallError = ${JSON.stringify(error.message)};
    export const awsSdkImportSuccess = false;
  `;
  
  fs.writeFileSync('dist/aws-diagnostic.js', fallbackContent);
} 