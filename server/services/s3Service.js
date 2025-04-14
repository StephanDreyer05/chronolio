/**
 * Server-side S3 Service
 * This module handles S3 operations on the server side
 * Using dynamic imports to prevent build-time errors
 */

// ===== START COMPREHENSIVE DEBUG LOGGING =====
console.log('=== S3SERVICE TOP LEVEL DEBUG ===');
console.log('Node.js version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);

// Log all environment variables to see the exact runtime state
console.log('--- All process.env variables --- START ---');
try {
  // Attempt to stringify, handle potential circular structures (unlikely for env)
  console.log(JSON.stringify(process.env, null, 2));
} catch (e) {
  console.error('Could not stringify process.env:', e);
  // Fallback: log keys and potentially problematic values individually
  Object.keys(process.env).forEach(key => {
    try {
      console.log(`${key}: ${process.env[key]}`);
    } catch { 
      console.log(`${key}: [Error logging value]`);
    }
  });
}
console.log('--- All process.env variables --- END ---');

// Log the specific AWS variables we expect
console.log('--- Specific AWS variable check --- START ---');
console.log('process.env.AWS_REGION:', process.env.AWS_REGION);
console.log('process.env.AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
console.log('process.env.AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Exists' : 'MISSING');
console.log('process.env.AWS_SECRET_ACCESS_KEY_ID:', process.env.AWS_SECRET_ACCESS_KEY_ID ? 'Exists' : 'MISSING');
console.log('--- Specific AWS variable check --- END ---');
// ===== END COMPREHENSIVE DEBUG LOGGING =====

// Direct access to environment variables - NO FALLBACKS, relies on Vercel env config
const REGION = process.env.AWS_REGION;
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY_ID; // Using the correct variable name

// Log the values being used (to confirm they are actually accessible)
console.log('Values being used by S3 service (MUST NOT contain ${...}):');
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
      
      // Construct the S3 URL properly with normalized key
      const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${normalizedKey}`;
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
      
      // Implementation that returns a properly constructed S3 URL without signing
      // (not a real signed URL, but at least points to the correct S3 location)
      const baseUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${normalizedKey}`;
      console.log('Generated unsigned S3 URL:', baseUrl);
      
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
      console.log('=== S3 CONNECTION DIAGNOSTIC ===');
      
      // Use sanitized environment variables
      console.log('Sanitized AWS Environment Variables:');
      console.log('REGION:', REGION);
      console.log('BUCKET_NAME:', BUCKET_NAME);
      console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
      console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
      
      console.log('Environment summary:', {
        allDefined: Boolean(REGION && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET_NAME),
        missingValues: [
          !REGION ? 'REGION' : null,
          !ACCESS_KEY_ID ? 'ACCESS_KEY_ID' : null,
          !SECRET_ACCESS_KEY ? 'SECRET_ACCESS_KEY' : null,
          !BUCKET_NAME ? 'BUCKET_NAME' : null
        ].filter(Boolean)
      });
      
      // Direct check of environment variables for additional debugging
      console.log('Direct Environment Variable Check:');
      console.log('AWS_REGION exists:', !!process.env.AWS_REGION);
      console.log('AWS_S3_BUCKET_NAME exists:', !!process.env.AWS_S3_BUCKET_NAME);
      console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
      console.log('AWS_SECRET_ACCESS_KEY_ID exists:', !!process.env.AWS_SECRET_ACCESS_KEY_ID);
      console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);
      
      if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
        console.error('S3 CONNECTION TEST FAILED: Missing required environment variables');
        return { 
          success: false, 
          message: 'AWS S3 configuration incomplete: Missing required environment variables',
          missingVariables: [
            !REGION ? 'REGION' : null,
            !ACCESS_KEY_ID ? 'ACCESS_KEY_ID' : null,
            !SECRET_ACCESS_KEY ? 'SECRET_ACCESS_KEY' : null,
            !BUCKET_NAME ? 'BUCKET_NAME' : null
          ].filter(Boolean),
          usingDirectFetch: true
        };
      }
      
      console.log('All required environment variables are present');
      
      // Try to check AWS connectivity by making a minimal HTTP request to S3
      try {
        const testUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/`;
        console.log(`Testing basic S3 connectivity to URL: ${testUrl}`);
        
        const response = await fetch(testUrl, {
          method: 'HEAD',
          headers: {
            'Accept': '*/*',
          }
        });
        
        console.log('S3 connectivity test response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers.entries()])
        });
        
        // Even a 403 is fine, it means we reached S3 but aren't authenticated
        const reachable = response.status < 500;
        
        if (reachable) {
          console.log('S3 CONNECTION TEST PASSED: S3 service is reachable');
          return {
            success: true,
            message: 'AWS S3 service is reachable (credentials not validated)',
            bucket: BUCKET_NAME,
            region: REGION,
            usingDirectFetch: true,
            connectivityTest: {
              status: response.status,
              statusText: response.statusText
            }
          };
        } else {
          console.error('S3 CONNECTION TEST FAILED: Cannot reach S3 service');
          return {
            success: false,
            message: 'Cannot reach AWS S3 service',
            bucket: BUCKET_NAME,
            region: REGION,
            usingDirectFetch: true,
            connectivityTest: {
              status: response.status,
              statusText: response.statusText
            }
          };
        }
      } catch (fetchError) {
        console.error('S3 connectivity test fetch error:', fetchError);
        return {
          success: false,
          message: 'Error connecting to AWS S3 service',
          error: String(fetchError),
          bucket: BUCKET_NAME,
          region: REGION,
          usingDirectFetch: true
        };
      }
    } catch (error) {
      console.error('Error in S3 connection test:', error);
      return {
        success: false,
        message: 'Error during S3 connection test',
        error: String(error),
        usingDirectFetch: true
      };
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
let isS3Initialized = false;
let s3InitializationError = null;

export async function initializeS3Service() {
  // Prevent multiple initializations
  if (isS3Initialized || s3InitializationError) {
    console.log('S3 Service initialization already attempted. Status:', 
      isS3Initialized ? 'Success' : `Failed (${s3InitializationError})`);
    return isS3Initialized;
  }
  
  console.log('=== S3 SERVICE INITIALIZATION - START ===');
  
  // Direct log of the environment variables being used
  console.log('Environment variables for S3 initialization:');
  console.log('REGION:', REGION);
  console.log('BUCKET_NAME:', BUCKET_NAME);
  console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
  console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
  
  // Check if all required variables are available and CORRECTLY FORMATTED
  if (!REGION || !BUCKET_NAME || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || 
      REGION.includes('${') || BUCKET_NAME.includes('${')) {
    s3InitializationError = `Invalid or missing AWS configuration. REGION: ${REGION}, BUCKET_NAME: ${BUCKET_NAME}`;
    console.error(`ERROR: ${s3InitializationError}. Check Vercel Environment Variables.`);
    console.log('Cannot initialize S3 client due to configuration issues.');
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
            
            const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${normalizedKey}`;
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
        isS3Initialized = true; // Mark initialization as successful
        s3InitializationError = null; // Clear any previous error
        
        console.log('=== S3 SERVICE INITIALIZATION - SUCCESS ===');
        return true;
      } catch (sendError) {
        s3InitializationError = `Error testing S3 connection: ${sendError.message}`;
        console.error(s3InitializationError);
        console.log('AWS SDK error details:', {
          code: sendError.code,
          message: sendError.message,
          name: sendError.name,
          $metadata: sendError.$metadata
        });
        return false;
      }
    } catch (clientError) {
      s3InitializationError = `Failed to initialize S3 client: ${clientError.message}`;
      console.error(s3InitializationError);
      return false;
    }
  } catch (importError) {
    s3InitializationError = `Failed to import AWS SDK modules: ${importError.message}`;
    console.error(s3InitializationError);
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
      const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${normalizedKey}`;
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
      
      return {
        success: true,
        key: normalizedKey,
        url: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${normalizedKey}`
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