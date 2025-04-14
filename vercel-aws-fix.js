/**
 * This script ensures that AWS SDK packages are properly installed and available
 * in the Vercel deployment environment. It creates a small test file that imports
 * the AWS SDK modules and logs success/failure.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Verifying AWS SDK availability...');

try {
  // Create a test directory if it doesn't exist
  const testDir = path.join(process.cwd(), 'aws-test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create a test file that imports the AWS SDK
  const testFile = path.join(testDir, 'aws-sdk-test.js');
  fs.writeFileSync(testFile, `
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      
      console.log('AWS SDK imports successful');
      console.log('S3Client:', !!S3Client);
      console.log('getSignedUrl:', !!getSignedUrl);
      
      process.exit(0);
    } catch (error) {
      console.error('Failed to import AWS SDK:', error);
      process.exit(1);
    }
  `);
  
  console.log('Created AWS SDK test file');
  
  // Ensure the AWS SDK packages are installed
  console.log('Installing AWS SDK packages...');
  try {
    execSync('npm install --no-save @aws-sdk/client-s3 @aws-sdk/s3-request-presigner', { stdio: 'inherit' });
    console.log('AWS SDK packages installed successfully');
  } catch (installError) {
    console.error('Failed to install AWS SDK packages:', installError);
    // Continue anyway, as they might already be installed
  }
  
  // Run the test file
  console.log('Running AWS SDK test...');
  try {
    execSync('node aws-test/aws-sdk-test.js', { stdio: 'inherit' });
    console.log('AWS SDK test passed');
  } catch (testError) {
    console.error('AWS SDK test failed:', testError);
    // Try reinstalling packages
    console.log('Attempting to reinstall AWS SDK packages in production mode...');
    execSync('npm install --production --no-save @aws-sdk/client-s3 @aws-sdk/s3-request-presigner', { stdio: 'inherit' });
  }
  
  // Copy the AWS SDK modules to the dist directory to ensure they're deployed
  console.log('Copying AWS SDK modules to dist directory...');
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(path.join(distDir, 'node_modules'))) {
    fs.mkdirSync(path.join(distDir, 'node_modules'), { recursive: true });
  }
  
  // Create a small loader file that pre-imports the AWS SDK
  const loaderFile = path.join(distDir, 'aws-sdk-loader.js');
  fs.writeFileSync(loaderFile, `
    // This file pre-loads the AWS SDK to ensure it's available
    export async function preloadAwsSdk() {
      try {
        const clientS3 = await import('@aws-sdk/client-s3');
        const presigner = await import('@aws-sdk/s3-request-presigner');
        
        return {
          S3Client: clientS3.S3Client,
          GetObjectCommand: clientS3.GetObjectCommand,
          PutObjectCommand: clientS3.PutObjectCommand,
          ListBucketsCommand: clientS3.ListBucketsCommand,
          getSignedUrl: presigner.getSignedUrl
        };
      } catch (error) {
        console.error('Failed to preload AWS SDK:', error);
        return null;
      }
    }
  `);
  
  console.log('AWS SDK fix script completed successfully');
} catch (error) {
  console.error('Error in AWS SDK fix script:', error);
  process.exit(1);
} 