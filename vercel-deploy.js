/**
 * Vercel Post-Build Script
 * 
 * This script installs AWS SDK dependencies after the main build is complete.
 * These dependencies are required for S3 functionality at runtime
 * but cause problems if included during the build process.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running Vercel post-build setup for AWS SDK dependencies...');

try {
  // Install AWS SDK dependencies without updating package.json
  console.log('📦 Installing AWS SDK dependencies...');
  execSync('npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --no-save', {
    stdio: 'inherit'
  });

  // Create a file to verify installation
  const verificationFile = path.join(__dirname, 'public', 'aws-sdk-installed.txt');
  fs.writeFileSync(
    verificationFile,
    `AWS SDK dependencies installed: ${new Date().toISOString()}\n`,
    'utf8'
  );

  console.log('✅ AWS SDK dependencies successfully installed for runtime usage');
} catch (error) {
  console.error('❌ Error installing AWS SDK dependencies:', error);
  process.exit(1);
} 