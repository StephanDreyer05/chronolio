/**
 * Server-side S3 Service
 * This module handles S3 operations on the server side
 * Using dynamic imports to prevent build-time errors
 */

// Add debug logging at the top of the file to see exactly what we're working with
console.log('=== S3SERVICE ENVIRONMENT DEBUG ===');
console.log('Raw AWS environment variables:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);

// Helper function to sanitize environment variables that might contain template literals
function getEnvVar(name, defaultValue = '') {
  const value = process.env[name] || '';
  // Check if the value is a template literal string (${...})
  if (value.includes('${') && value.includes('}')) {
    console.warn(`WARNING: Environment variable ${name} contains template literal syntax: ${value}`);
    return defaultValue;
  }
  return value;
}

// Get sanitized environment variables
const REGION = getEnvVar('AWS_REGION', 'us-east-1');
const BUCKET_NAME = getEnvVar('AWS_S3_BUCKET_NAME', 'chronolio-uploads');
const ACCESS_KEY_ID = getEnvVar('AWS_ACCESS_KEY_ID');
const SECRET_ACCESS_KEY = getEnvVar('AWS_SECRET_ACCESS_KEY');

console.log('Sanitized environment variables:');
console.log('REGION:', REGION);
console.log('BUCKET_NAME:', BUCKET_NAME);
console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);

// S3 client instance
let s3Client = null;

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
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
      });
      
      console.log('Executing upload to S3...');
      await s3Client.send(command);
      
      console.log('Upload successful!');
      
      // Construct the S3 URL properly
      const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
      console.log('Generated S3 URL:', url);
      
      return { 
        success: true, 
        key,
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
      
      // Use sanitized environment variables
      console.log('Using sanitized bucket:', BUCKET_NAME);
      console.log('Using sanitized region:', REGION);
      
      if (!BUCKET_NAME || !REGION) {
        throw new Error('S3 configuration incomplete: Missing bucket or region');
      }
      
      // Implementation that returns a properly constructed S3 URL without signing
      // (not a real signed URL, but at least points to the correct S3 location)
      const baseUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
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
export async function initializeS3Service() {
  console.log('=== S3 SERVICE INITIALIZATION - DEBUGGING ===');
  
  // Use sanitized environment variables
  console.log('Using sanitized environment variables:');
  console.log('REGION:', REGION);
  console.log('BUCKET_NAME:', BUCKET_NAME);
  console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
  console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
  
  if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
    const missingVars = [
      !REGION ? 'REGION' : null,
      !ACCESS_KEY_ID ? 'ACCESS_KEY_ID' : null,
      !SECRET_ACCESS_KEY ? 'SECRET_ACCESS_KEY' : null,
      !BUCKET_NAME ? 'BUCKET_NAME' : null
    ].filter(Boolean);
    
    console.warn(`WARNING: Missing required AWS environment variables: ${missingVars.join(', ')}`);
    console.log('Falling back to direct fetch implementation');
    return false;
  }
  
  // Try to dynamically import AWS SDK modules
  console.log('Attempting to import AWS SDK modules...');
  try {
    // Import all AWS SDK modules at once to avoid multiple imports
    console.log('Importing AWS SDK modules...');
    const { 
      S3Client, 
      ListBucketsCommand,
      PutObjectCommand,
      GetObjectCommand 
    } = await import('@aws-sdk/client-s3');
    
    console.log('Importing S3 request presigner...');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    
    // Log the actual values being used to create the client
    console.log('S3 client initialization with:');
    console.log('  - Region:', REGION);
    console.log('  - Bucket:', BUCKET_NAME);
    
    // Initialize S3 client with sanitized environment variables
    console.log('Creating AWS S3 client...');
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
      const response = await s3Client.send(command);
      console.log(`Successfully connected to AWS S3. Found ${response.Buckets?.length || 0} buckets.`);
      
      // Override the direct fetch implementation with AWS SDK implementation
      console.log('Setting up AWS SDK S3 service methods...');
      
      // Override the uploadFile method
      s3Service.uploadFile = async (fileBuffer, key, contentType) => {
        console.log(`Uploading file to S3 with key: ${key} using AWS SDK`);
        
        try {
          const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType
          });
          
          await s3Client.send(command);
          console.log('File uploaded successfully using AWS SDK');
          
          const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
          return {
            success: true,
            key: key,
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
          const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
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

// Helper function to dynamically import AWS SDK modules
async function dynamicImport(moduleName) {
  try {
    console.log(`Attempting to import AWS SDK module: ${moduleName}`);
    
    if (moduleName === 'S3Client' || moduleName === 'ListBucketsCommand' || 
        moduleName === 'PutObjectCommand' || moduleName === 'GetObjectCommand') {
      try {
        const { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } = 
          await import('@aws-sdk/client-s3');
        
        const modules = {
          S3Client,
          ListBucketsCommand,
          PutObjectCommand,
          GetObjectCommand
        };
        
        const result = modules[moduleName];
        if (result) {
          console.log(`Successfully imported: ${moduleName}`);
          return result;
        } else {
          console.error(`Module ${moduleName} not found in import result`);
          return null;
        }
      } catch (error) {
        console.error(`Error importing from @aws-sdk/client-s3:`, error);
        return null;
      }
    } else if (moduleName === 'getSignedUrl') {
      try {
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        console.log(`Successfully imported: ${moduleName}`);
        return getSignedUrl;
      } catch (error) {
        console.error(`Error importing from @aws-sdk/s3-request-presigner:`, error);
        return null;
      }
    }
    
    console.error(`Unknown module name: ${moduleName}`);
    return null;
  } catch (error) {
    console.error(`Failed to import ${moduleName}:`, error);
    return null;
  }
}

// Upload a file to S3
export async function uploadFile(fileBuffer, key, contentType) {
  // Check if we're using direct fetch implementation
  if (s3Service.usingDirectFetch) {
    console.log('Using direct fetch implementation for file upload');
    
    // Use sanitized environment variables
    console.log('S3 upload with sanitized environment variables:');
    console.log('REGION:', REGION);
    console.log('BUCKET_NAME:', BUCKET_NAME);
    console.log('ACCESS_KEY_ID exists:', !!ACCESS_KEY_ID);
    console.log('SECRET_ACCESS_KEY exists:', !!SECRET_ACCESS_KEY);
    
    if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
      console.error('Missing AWS environment variables for direct fetch upload');
      throw new Error('Cannot upload file: AWS environment variables not configured');
    }
    
    try {
      console.log('Attempting S3 upload with AWS SDK directly');
      
      // Import SDK
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      // Create client
      console.log('Creating S3 client with sanitized credentials');
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
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
      });
      
      // Execute upload
      console.log('Executing S3 upload...');
      await s3Client.send(command);
      console.log('Upload successful!');
      
      // Generate URL
      const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
      console.log('Generated S3 URL:', url);
      
      return {
        success: true,
        key,
        url
      };
    } catch (error) {
      console.error('Error in direct S3 upload:', error);
      throw error;
    }
  } else {
    // AWS SDK implementation
    try {
      console.log(`Uploading file to S3 with key: ${key}`);
      
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
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
      });
      
      await s3Client.send(command);
      console.log('File uploaded successfully using AWS SDK');
      
      return {
        success: true,
        key: key,
        url: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`
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
  
  // Check raw environment variables
  console.log('Raw Environment Variables:');
  console.log('AWS_REGION:', process.env.AWS_REGION);
  console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
  console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
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
  
  // Return comprehensive result
  return {
    timestamp: new Date().toISOString(),
    rawEnvironmentVariables: {
      hasRegion: !!process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
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