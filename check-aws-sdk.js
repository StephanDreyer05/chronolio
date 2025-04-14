/**
 * AWS SDK and Environment Variable Verification Script
 * 
 * This script checks:
 * 1. If the AWS SDK can be imported
 * 2. If all required AWS environment variables are set
 * 3. If a basic S3 operation can be performed
 * 
 * Run with: node check-aws-sdk.js
 */

// Check if AWS environment variables are set
function checkEnvironmentVariables() {
  console.log('Checking AWS environment variables...');
  
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
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
}

// Check if AWS SDK can be imported
async function checkAwsSdkImport() {
  console.log('Checking AWS SDK imports...');
  
  try {
    // Try importing the AWS SDK packages
    const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    
    console.log('✅ AWS SDK packages imported successfully');
    return { success: true, S3Client, ListBucketsCommand, getSignedUrl };
  } catch (error) {
    console.error('❌ Failed to import AWS SDK:', error.message);
    return { success: false, error };
  }
}

// Test basic S3 connection
async function testS3Connection(S3Client, ListBucketsCommand) {
  console.log('Testing S3 connection...');
  
  try {
    const client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    
    console.log('✅ Successfully connected to AWS S3');
    console.log(`  Bucket count: ${response.Buckets.length}`);
    console.log(`  Bucket names: ${response.Buckets.map(b => b.Name).join(', ')}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ S3 connection test failed:', error.message);
    return { success: false, error };
  }
}

// Main function
async function main() {
  console.log('=== AWS SDK VERIFICATION SCRIPT ===');
  
  // Step 1: Check environment variables
  const envVarsOk = checkEnvironmentVariables();
  if (!envVarsOk) {
    console.error('⚠️ Environment variables check failed. Fix these issues before continuing.');
  }
  
  // Step 2: Check AWS SDK import
  const sdkImportResult = await checkAwsSdkImport();
  if (!sdkImportResult.success) {
    console.error('⚠️ AWS SDK import failed. Make sure @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner are installed.');
    console.error('   Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --save');
    return;
  }
  
  // Step 3: Test S3 connection (only if previous checks passed)
  if (envVarsOk && sdkImportResult.success) {
    const { S3Client, ListBucketsCommand } = sdkImportResult;
    const connectionResult = await testS3Connection(S3Client, ListBucketsCommand);
    
    if (connectionResult.success) {
      console.log('✅ ALL CHECKS PASSED: Environment variables set, AWS SDK available, and S3 connection works');
    } else {
      console.error('⚠️ S3 connection failed. Check your credentials and network connectivity.');
    }
  }
}

// Run the script
main().catch(error => {
  console.error('Script error:', error);
}); 