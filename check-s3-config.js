/**
 * S3 Configuration Checker
 * 
 * This script verifies that AWS S3 is properly configured and accessible.
 * Run with: node check-s3-config.js
 */

import { initializeS3Service } from './server/services/s3Service.js';
import dotenv from 'dotenv';

// Load environment variables from .env files
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function checkS3Configuration() {
  console.log('🔍 Checking AWS S3 configuration...');
  
  // Check environment variables
  const requiredVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET_NAME'
  ];
  
  const missingVars = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.log('\n💡 Add these variables to your .env or .env.local file, or to your Vercel environment variables.');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are defined');
  
  // Try to initialize the S3 service
  try {
    console.log('🔄 Initializing S3 service...');
    const initialized = await initializeS3Service();
    
    if (!initialized) {
      console.error('❌ S3 service initialization failed');
      console.log('\n💡 This could be due to incorrect credentials or network issues.');
      process.exit(1);
    }
    
    console.log('✅ S3 service initialized successfully');
    
    // Import s3Service and test connection
    const s3Service = (await import('./server/services/s3Service.js')).default;
    
    console.log('🔄 Testing S3 connection...');
    const testResult = await s3Service.testConnection();
    
    if (!testResult.success) {
      console.error('❌ S3 connection test failed:');
      console.error(`   - ${testResult.message}`);
      console.error(`   - ${testResult.error || 'Unknown error'}`);
      console.log('\n💡 Check your AWS credentials and permissions.');
      process.exit(1);
    }
    
    console.log('✅ Successfully connected to S3');
    console.log(`   - Region: ${testResult.region}`);
    console.log(`   - Bucket: ${testResult.bucket}`);
    
    // List buckets as final test
    console.log('🔄 Listing S3 buckets...');
    const listResult = await s3Service.listBuckets();
    
    if (!listResult.success) {
      console.error('❌ Failed to list S3 buckets:');
      console.error(`   - ${listResult.error || 'Unknown error'}`);
      console.log('\n💡 Check if your AWS user has the ListAllMyBuckets permission.');
      process.exit(1);
    }
    
    console.log(`✅ Listed ${listResult.buckets.length} buckets successfully`);
    
    // All tests passed
    console.log('\n🎉 S3 configuration is working properly!');
    console.log('   You can now use S3 functionality in your application.');
    
  } catch (error) {
    console.error('❌ Unexpected error during S3 configuration check:');
    console.error(error);
    process.exit(1);
  }
}

checkS3Configuration().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}); 