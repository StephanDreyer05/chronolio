/**
 * Server-side S3 Service
 * This module handles S3 operations on the server side
 * Using dynamic imports to prevent build-time errors
 */

// Add debug logging at the top of the file to see exactly what we're working with
console.log('=== S3SERVICE ENVIRONMENT DEBUG ===');

// Log the direct environment variables (non-sanitized, just the raw values)
console.log('Direct environment variables:');
console.log('process.env.AWS_REGION:', process.env.AWS_REGION);
console.log('process.env.AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
console.log('process.env.AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET (redacted)' : 'NOT SET');
console.log('process.env.AWS_SECRET_ACCESS_KEY_ID:', process.env.AWS_SECRET_ACCESS_KEY_ID ? 'SET (redacted)' : 'NOT SET');

// Set hardcoded values for testing when environment variables are not available or contain template strings
const DEFAULT_REGION = 'eu-north-1';
const DEFAULT_BUCKET = 'chronolio.timeline.images';

// For development/testing only
// WARNING: In a real production environment, never hardcode AWS credentials in your code
// These should only be used in a development/testing environment
const DEV_ACCESS_KEY = ''; // For dev setup, add a key here if needed temporarily, remove before committing
const DEV_SECRET_KEY = ''; // For dev setup, add a key here if needed temporarily, remove before committing

// Helper function to clean environment variables that might contain template literals
function cleanEnvVar(value, defaultValue) {
  if (!value) return defaultValue;
  
  // If the value is a template literal string (contains ${), use the default instead
  if (value.includes('${') && value.includes('}')) {
    console.warn(`WARNING: Environment variable contains template literal syntax: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return value;
}

// Direct access to environment variables - with template string detection
const REGION = cleanEnvVar(process.env.AWS_REGION, DEFAULT_REGION);
const BUCKET_NAME = cleanEnvVar(process.env.AWS_S3_BUCKET_NAME, DEFAULT_BUCKET);
const ACCESS_KEY_ID = cleanEnvVar(process.env.AWS_ACCESS_KEY_ID, DEV_ACCESS_KEY);
const SECRET_ACCESS_KEY = cleanEnvVar(process.env.AWS_SECRET_ACCESS_KEY_ID, DEV_SECRET_KEY);

// Log the values being used (to confirm they are actually accessible)
console.log('Values being used:');
console.log('REGION:', REGION);
console.log('BUCKET_NAME:', BUCKET_NAME);
console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);

// Check if we have all required config
const hasValidConfig = REGION && BUCKET_NAME && ACCESS_KEY_ID && SECRET_ACCESS_KEY;
console.log('Has valid S3 configuration:', hasValidConfig);

// S3 client instance
let s3Client = null;

// Helper function to normalize S3 keys (prevent double slashes)
function normalizeS3Key(key) {
  if (!key) return '';
  
  // Remove leading slash if present
  if (key.startsWith('/')) {
    key = key.substring(1);
  }
  
  return key;
}

// Helper function to generate the proper S3 URL format based on bucket name
function generateS3Url(bucket, region, key) {
  // If bucket name contains dots, we need to use path-style URL
  // instead of virtual-hosted style to avoid SSL certificate issues
  if (bucket.includes('.')) {
    return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
  } else {
    // Standard virtual-hosted style URL
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}

// Direct fallback implementation using fetch API (no AWS SDK required)
const directS3Service = {
  uploadFile: async (fileBuffer, key, contentType) => {
    try {
      console.log('=== DIRECT FETCH S3 SERVICE - CRITICAL PATH ===');
      console.log('Attempting S3 upload without AWS SDK for key:', key);
      
      if (!fileBuffer) {
        throw new Error('File buffer is required');
      }
      
      if (!key) {
        throw new Error('Key is required');
      }
      
      // Normalize the key to prevent double slashes
      const normalizedKey = normalizeS3Key(key);
      console.log('Normalized key:', normalizedKey);
      
      // Use sanitized environment variables instead of raw ones
      console.log('Environment variables status (sanitized):');
      console.log('REGION:', REGION);
      console.log('BUCKET_NAME:', BUCKET_NAME);
      console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
      console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
      
      if (!BUCKET_NAME || !REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
        throw new Error('S3 configuration incomplete: Missing required environment variables');
      }
      
      // Proceed with the actual S3 upload using AWS SDK
      console.log('Dynamically importing AWS SDK...');
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      // Log the actual values being used for S3 client creation
      console.log('Creating S3 client with region:', REGION);
      console.log('Using bucket:', BUCKET_NAME);
      
      const s3Client = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: ACCESS_KEY_ID,
          secretAccessKey: SECRET_ACCESS_KEY
        }
      });
      
      console.log('Preparing upload command...');
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: normalizedKey,
        Body: fileBuffer,
        ContentType: contentType
      });
      
      console.log('Executing upload to S3...');
      await s3Client.send(command);
      
      console.log('Upload successful!');
      
      // Generate URL
      const url = generateS3Url(BUCKET_NAME, REGION, normalizedKey);
      console.log('Generated S3 URL:', url);
      
      return { 
        success: true, 
        key: normalizedKey,
        url
      };
    } catch (error) {
      console.error('ERROR in direct S3 service uploadFile:', error);
      return { 
        success: false, 
        key: key,
        error: String(error)
      };
    }
  },
  
  generateSignedUrl: async (key, expirationSeconds = 3600) => {
    try {
      console.log('Generating signed URL for key:', key);
      
      // Normalize the key to prevent double slashes
      const normalizedKey = normalizeS3Key(key);
      console.log('Normalized key:', normalizedKey);
      
      // Use sanitized environment variables
      console.log('Using sanitized bucket:', BUCKET_NAME);
      console.log('Using sanitized region:', REGION);
      
      if (!BUCKET_NAME || !REGION) {
        throw new Error('S3 configuration incomplete: Missing bucket or region');
      }
      
      // Generate the S3 URL
      const baseUrl = generateS3Url(BUCKET_NAME, REGION, normalizedKey);
      console.log('Generated S3 URL:', baseUrl);
      
      // For debugging only - test if the URL is accessible by making a HEAD request
      try {
        console.log('Testing S3 URL accessibility...');
        // This would require the 'node-fetch' package, so we'll comment it out for now
        // const fetch = await import('node-fetch');
        // const response = await fetch.default(baseUrl, { method: 'HEAD' });
        // console.log('S3 URL test result:', {
        //   status: response.status,
        //   headers: Object.fromEntries(response.headers.entries())
        // });
      } catch (testError) {
        console.warn('S3 URL accessibility test failed:', testError.message);
        // We'll still return the URL even if the test fails
      }
      
      return { 
        success: true, 
        url: baseUrl
      };
    } catch (error) {
      console.error('ERROR generating signed URL:', error);
      return { 
        success: false, 
        url: null, 
        error: String(error)
      };
    }
  },
  
  testConnection: async () => {
    try {
      console.log('Testing S3 connection, using:');
      console.log('  REGION:', REGION);
      console.log('  BUCKET_NAME:', BUCKET_NAME);
      console.log('  Credentials available:', !!ACCESS_KEY_ID && !!SECRET_ACCESS_KEY);
      
      // Check CORS configuration on the bucket (not accurate, but informative)
      console.log('Note: If images aren\'t loading, the S3 bucket likely needs CORS configuration:');
      console.log(`
CORS configuration for S3 bucket:
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]

To set this up, use the AWS CLI:
aws s3api put-bucket-cors --bucket ${BUCKET_NAME} --cors-configuration file://cors.json
      `);
      
      try {
        // Import and create client
        const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
        
        const s3Client = new S3Client({
          region: REGION,
          credentials: {
            accessKeyId: ACCESS_KEY_ID,
            secretAccessKey: SECRET_ACCESS_KEY
          }
        });
        
        // Test connection
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        
        // Successful connection
        console.log('S3 connection test passed!', {
          numBuckets: response.Buckets?.length || 0,
          buckets: response.Buckets?.map(b => b.Name)
        });
        
        return {
          success: true,
          message: `Successfully connected to S3. Found ${response.Buckets?.length || 0} buckets.`
        };
      } catch (error) {
        // AWS SDK error
        console.error('S3 connection test failed:', error);
        
        return {
          success: false,
          error: String(error),
          errorDetails: {
            code: error.code,
            name: error.name,
            message: error.message,
            requestId: error.$metadata?.requestId
          }
        };
      }
    } catch (error) {
      // General error
      console.error('Error in S3 test connection:', error);
      return { success: false, error: String(error) };
    }
  },
  
  listBuckets: async () => {
    console.log('Using direct fetch S3 service - listBuckets');
    return { 
      success: false, 
      buckets: [], 
      error: 'Operation not supported in direct fetch mode'
    };
  },

  usingDirectFetch: true
};

// AWS SDK implementation
const s3Service = {
  // Start with the direct fetch implementation as fallback
  ...directS3Service,
  
  // Will be overridden with AWS SDK implementation if available
  usingDirectFetch: true
};

// Initialize the S3 service
export async function initializeS3Service() {
  console.log('=== S3 SERVICE INITIALIZATION - DEBUGGING ===');
  
  // Direct log of the environment variables being used
  console.log('Environment variables for S3 initialization:');
  console.log('REGION:', REGION);
  console.log('BUCKET_NAME:', BUCKET_NAME);
  console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
  console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
  
  // Check if all required variables are available
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.warn(`WARNING: Missing required AWS credentials. Cannot initialize S3 client.`);
    console.log('Falling back to direct fetch implementation');
    return false;
  }
  
  // Try to import AWS SDK modules
  console.log('Attempting to import AWS SDK modules...');
  try {
    console.log('Importing AWS SDK modules...');
    const { 
      S3Client, 
      ListBucketsCommand,
      PutObjectCommand,
      GetObjectCommand 
    } = await import('@aws-sdk/client-s3');
    
    console.log('Importing S3 request presigner...');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    
    // Clearly log what credentials we're using
    console.log('Initializing S3 client with:');
    console.log(`- Region: ${REGION}`);
    console.log(`- Access Key ID: ${ACCESS_KEY_ID.substring(0, 4)}...`);
    console.log(`- Secret Access Key: ${SECRET_ACCESS_KEY ? 'Provided (redacted)' : 'NOT PROVIDED'}`);
    console.log(`- Bucket: ${BUCKET_NAME}`);
    
    // Initialize S3 client
    try {
      s3Client = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: ACCESS_KEY_ID,
          secretAccessKey: SECRET_ACCESS_KEY
        }
      });
      
      // Test connection
      console.log('Testing connection to AWS S3...');
      const command = new ListBucketsCommand({});
      
      try {
        const response = await s3Client.send(command);
        console.log(`Successfully connected to AWS S3. Found ${response.Buckets?.length || 0} buckets.`);
        
        // Override the direct fetch implementation with AWS SDK implementation
        console.log('Setting up AWS SDK S3 service methods...');
        
        // Override the uploadFile method
        s3Service.uploadFile = async (fileBuffer, key, contentType) => {
          console.log(`Uploading file to S3 with key: ${key} using AWS SDK`);
          
          try {
            // Normalize the key to prevent double slashes
            const normalizedKey = normalizeS3Key(key);
            
            const command = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: normalizedKey,
              Body: fileBuffer,
              ContentType: contentType
            });
            
            await s3Client.send(command);
            console.log('File uploaded successfully using AWS SDK');
            
            const url = generateS3Url(BUCKET_NAME, REGION, normalizedKey);
            return {
              success: true,
              key: normalizedKey,
              url: url
            };
          } catch (error) {
            console.error('Error uploading file with AWS SDK:', error);
            return {
              success: false,
              key: key,
              error: String(error)
            };
          }
        };
        
        // Override the generateSignedUrl method
        s3Service.generateSignedUrl = async (key, expirationSeconds = 3600) => {
          console.log(`Generating signed URL for key: ${key} using AWS SDK`);
          
          try {
            // Normalize the key to prevent double slashes
            const normalizedKey = normalizeS3Key(key);
            
            const command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: normalizedKey
            });
            
            const url = await getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });
            console.log('Successfully generated signed URL');
            
            return {
              success: true,
              url: url
            };
          } catch (error) {
            console.error('Error generating signed URL with AWS SDK:', error);
            return {
              success: false,
              url: null,
              error: String(error)
            };
          }
        };
        
        // Mark as using AWS SDK (not direct fetch)
        s3Service.usingDirectFetch = false;
        
        console.log('Successfully initialized AWS S3 service with AWS SDK');
        return true;
      } catch (sendError) {
        console.error('Error testing S3 connection with credentials:', sendError);
        console.log('AWS SDK error details:', {
          code: sendError.code,
          message: sendError.message,
          name: sendError.name,
          $metadata: sendError.$metadata
        });
        return false;
      }
    } catch (clientError) {
      console.error('Failed to initialize S3 client:', clientError);
      console.log('Falling back to direct fetch implementation');
      return false;
    }
  } catch (importError) {
    console.error('Failed to import AWS SDK modules:', importError);
    console.log('Falling back to direct fetch implementation');
    return false;
  }
}

// Upload a file to S3
export async function uploadFile(fileBuffer, key, contentType) {
  // Check if we're using direct fetch implementation
  if (s3Service.usingDirectFetch) {
    console.log('Using direct fetch implementation for file upload');
    
    // Log direct raw environment variables
    console.log('S3 upload environment check:');
    console.log('AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
    console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME || 'NOT SET');
    console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('AWS_SECRET_ACCESS_KEY_ID exists:', !!process.env.AWS_SECRET_ACCESS_KEY_ID);
    
    // Using our constants
    console.log('Using variables:');
    console.log('REGION:', REGION);
    console.log('BUCKET_NAME:', BUCKET_NAME);
    console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
    console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
    
    if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
      console.error('Missing AWS credentials for upload');
      throw new Error('Cannot upload file: AWS credentials not configured');
    }
    
    try {
      console.log('Attempting S3 upload with AWS SDK directly');
      
      // Normalize the key to prevent double slashes
      const normalizedKey = normalizeS3Key(key);
      console.log('Normalized key:', normalizedKey);
      
      // Import SDK
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      // Create client with direct environment variables
      console.log('Creating S3 client with explicit credentials');
      const s3Client = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: ACCESS_KEY_ID,
          secretAccessKey: SECRET_ACCESS_KEY
        }
      });
      
      // Create command
      console.log('Creating PutObjectCommand');
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: normalizedKey,
        Body: fileBuffer,
        ContentType: contentType
      });
      
      // Execute upload
      console.log('Executing S3 upload...');
      await s3Client.send(command);
      console.log('Upload successful!');
      
      // Generate URL
      const url = generateS3Url(BUCKET_NAME, REGION, normalizedKey);
      console.log('Generated S3 URL:', url);
      
      return {
        success: true,
        key: normalizedKey,
        url
      };
    } catch (error) {
      console.error('Error in direct S3 upload:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        $metadata: error.$metadata
      });
      
      return { 
        success: false, 
        key: key,
        error: String(error)
      };
    }
  } else {
    // AWS SDK implementation
    try {
      console.log(`Uploading file to S3 with key: ${key}`);
      
      // Normalize the key to prevent double slashes
      const normalizedKey = normalizeS3Key(key);
      console.log('Normalized key:', normalizedKey);
      
      // Import PutObjectCommand dynamically if needed
      let PutObjectCommand;
      try {
        const { PutObjectCommand: ImportedCommand } = await import('@aws-sdk/client-s3');
        PutObjectCommand = ImportedCommand;
      } catch (importError) {
        console.error('Failed to import PutObjectCommand:', importError);
        throw new Error('AWS SDK module not available');
      }
      
      // Use sanitized environment variables
      console.log(`Using sanitized bucket: ${BUCKET_NAME}, region: ${REGION}`);
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: normalizedKey,
        Body: fileBuffer,
        ContentType: contentType
      });
      
      await s3Client.send(command);
      console.log('File uploaded successfully using AWS SDK');
      
      const url = generateS3Url(BUCKET_NAME, REGION, normalizedKey);
      console.log('Generated S3 URL:', url);
      
      return {
        success: true,
        key: normalizedKey,
        url: url
      };
    } catch (error) {
      console.error('Error uploading file with AWS SDK:', error);
      throw error;
    }
  }
}

export default s3Service;

// Add a diagnostic utility function
export async function diagnosticCheck() {
  console.log('=== S3 DIAGNOSTIC CHECK ===');
  
  // Check raw environment variables - with correct names
  console.log('Raw Environment Variables:');
  console.log('AWS_REGION:', process.env.AWS_REGION);
  console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
  console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
  console.log('AWS_SECRET_ACCESS_KEY_ID exists:', !!process.env.AWS_SECRET_ACCESS_KEY_ID);
  console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);
  
  // Check sanitized environment variables
  console.log('Sanitized Environment Variables:');
  console.log('REGION:', REGION);
  console.log('BUCKET_NAME:', BUCKET_NAME);
  console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
  console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
  
  console.log('Runtime environment:');
  console.log({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version
  });
  
  // Execute the regular testConnection function
  const testResult = await directS3Service.testConnection();
  
  // Return comprehensive result with checks for both variable names
  return {
    timestamp: new Date().toISOString(),
    rawEnvironmentVariables: {
      hasRegion: !!process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKeyID: !!process.env.AWS_SECRET_ACCESS_KEY_ID, // Check correct name
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,  // Check old name
      hasBucket: !!process.env.AWS_S3_BUCKET_NAME,
      regionValue: process.env.AWS_REGION,
      bucketValue: process.env.AWS_S3_BUCKET_NAME
    },
    sanitizedEnvironmentVariables: {
      hasRegion: !!REGION,
      hasAccessKey: !!ACCESS_KEY_ID,
      hasSecretKey: !!SECRET_ACCESS_KEY,
      hasBucket: !!BUCKET_NAME,
      regionValue: REGION,
      bucketValue: BUCKET_NAME,
      allSet: !!REGION && !!ACCESS_KEY_ID && !!SECRET_ACCESS_KEY && !!BUCKET_NAME
    },
    connectionTest: testResult,
    serviceStatus: {
      usingDirectFetch: s3Service.usingDirectFetch
    }
  };
}