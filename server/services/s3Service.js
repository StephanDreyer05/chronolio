/**
 * Server-side S3 Service
 * This module handles S3 operations on the server side
 * Using dynamic imports to prevent build-time errors
 */

// S3 client instance
let s3Client = null;

// Fallback mock implementation
const mockS3Service = {
  listBuckets: async () => {
    console.log('Using mock S3 service - listBuckets');
    return { success: false, buckets: [], error: 'AWS SDK not available', usingMock: true };
  },
  
  testConnection: async () => {
    console.log('Using mock S3 service - testConnection');
    return { success: false, message: 'AWS SDK not available', usingMock: true };
  },
  
  generateSignedUrl: async (key) => {
    console.log('Using mock S3 service - generateSignedUrl for key:', key);
    return { 
      success: false, 
      url: null, 
      mockUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkltYWdlIFVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==',
      error: 'AWS SDK not available'
    };
  },
  
  uploadFile: async (fileBuffer, key, contentType) => {
    console.log('Using mock S3 service - uploadFile for key:', key);
    return { 
      success: false, 
      key: key,
      error: 'AWS SDK not available',
      usingMock: true 
    };
  }
};

// Create the service object with fallback methods initially
const s3Service = {
  ...mockS3Service
};

// Initialize the S3 service
export async function initializeS3Service() {
  try {
    console.log('Initializing S3 service...');
    
    // Check required environment variables
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      console.warn('S3 service not configured: Missing AWS environment variables');
      return false;
    }
    
    // Safely import AWS SDK modules using dynamic imports
    let S3Client, ListBucketsCommand, GetObjectCommand, getSignedUrl;
    
    try {
      // Import the modules dynamically to prevent build-time errors
      const clientModule = await import('@aws-sdk/client-s3');
      const presignerModule = await import('@aws-sdk/s3-request-presigner');
      
      // Extract the needed components
      S3Client = clientModule.S3Client;
      ListBucketsCommand = clientModule.ListBucketsCommand;
      GetObjectCommand = clientModule.GetObjectCommand;
      getSignedUrl = presignerModule.getSignedUrl;
      
      console.log('AWS SDK modules imported successfully');
    } catch (importError) {
      console.error('Failed to import AWS SDK modules:', importError);
      return false;
    }
    
    // Create the S3 client
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    
    // Test connection by listing buckets
    try {
      const command = new ListBucketsCommand({});
      await s3Client.send(command);
      console.log('S3 service initialized successfully');
    } catch (testError) {
      console.error('S3 connection test failed during initialization:', testError);
      return false;
    }
    
    // Override mock methods with real implementations
    s3Service.listBuckets = async () => {
      try {
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        return { 
          success: true, 
          buckets: response.Buckets.map(bucket => ({ 
            name: bucket.Name, 
            creationDate: bucket.CreationDate 
          }))
        };
      } catch (error) {
        console.error('Error listing S3 buckets:', error);
        return { success: false, buckets: [], error: String(error) };
      }
    };
    
    s3Service.testConnection = async () => {
      try {
        const command = new ListBucketsCommand({});
        await s3Client.send(command);
        return { 
          success: true, 
          message: 'Successfully connected to AWS S3',
          bucket: bucketName,
          region
        };
      } catch (error) {
        console.error('S3 connection test failed:', error);
        return { 
          success: false, 
          message: 'Failed to connect to AWS S3',
          error: String(error)
        };
      }
    };
    
    s3Service.generateSignedUrl = async (key, expirationSeconds = 3600) => {
      try {
        if (!key) {
          throw new Error('Key is required');
        }
        
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key
        });
        
        const url = await getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });
        
        return { success: true, url };
      } catch (error) {
        console.error('Error generating signed URL:', error);
        const mockResult = await mockS3Service.generateSignedUrl(key);
        return { 
          success: false, 
          url: null, 
          error: String(error),
          mockUrl: mockResult.mockUrl
        };
      }
    };
    
    // Add upload file implementation
    s3Service.uploadFile = async (fileBuffer, key, contentType) => {
      try {
        if (!fileBuffer) {
          throw new Error('File buffer is required');
        }
        
        if (!key) {
          throw new Error('Key is required');
        }
        
        // Import the PutObjectCommand dynamically
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType || 'application/octet-stream'
        });
        
        await s3Client.send(command);
        
        console.log(`Successfully uploaded file to S3: ${key}`);
        
        return { 
          success: true, 
          key: key
        };
      } catch (error) {
        console.error('Error uploading file to S3:', error);
        return { 
          success: false, 
          key: key,
          error: String(error)
        };
      }
    };
    
    return true;
  } catch (error) {
    console.error('Failed to initialize S3 service:', error);
    return false;
  }
}

export default s3Service; 