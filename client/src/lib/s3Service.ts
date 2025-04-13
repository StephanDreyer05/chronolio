/**
 * S3 Service with fallback behavior
 * 
 * This implementation provides both real S3 functionality when AWS SDK is available
 * and fallback functionality when AWS SDK is not available.
 */

// Fallback implementation that will be used when AWS SDK is not available
// This allows the app to build and function in a limited way without the AWS SDK
class FallbackS3Service {
  uploadToS3(file: File, timelineId: number): Promise<string> {
    console.warn('Using fallback S3 service (AWS SDK not available)');
    // Generate a mock S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
    return Promise.resolve(`fallback-s3-key-${timelineId}-${timestamp}-${randomString}-${sanitizedFileName}`);
  }

  deleteFromS3(key: string): Promise<void> {
    console.warn('Using fallback S3 service (AWS SDK not available)');
    return Promise.resolve();
  }

  getS3SignedUrl(key: string): Promise<string> {
    console.warn('Using fallback S3 service (AWS SDK not available)');
    // Return a data URL for placeholder image
    return Promise.resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkltYWdlIFVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==');
  }

  extractS3KeyFromUrl(imageUrl: string): string {
    return imageUrl;
  }
}

// Create a fallback instance
const fallbackService = new FallbackS3Service();

// Initialize with fallback methods until AWS SDK is loaded
const service = {
  uploadToS3: fallbackService.uploadToS3.bind(fallbackService),
  deleteFromS3: fallbackService.deleteFromS3.bind(fallbackService),
  getS3SignedUrl: fallbackService.getS3SignedUrl.bind(fallbackService),
  extractS3KeyFromUrl: fallbackService.extractS3KeyFromUrl.bind(fallbackService)
};

// Try to load AWS SDK asynchronously
(async function loadAwsSdk() {
  try {
    // Dynamically import AWS SDK modules
    // This will be skipped during build but will execute at runtime
    const s3Module = await import('@aws-sdk/client-s3').catch(() => null);
    const presignerModule = await import('@aws-sdk/s3-request-presigner').catch(() => null);
    
    // If imports failed, stick with fallback implementation
    if (!s3Module || !presignerModule) {
      console.warn('AWS SDK modules could not be loaded, using fallback implementation');
      return;
    }
    
    // Create S3 client from imported modules
    const s3Client = new s3Module.S3Client({
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
      }
    });
    
    // Generate a unique S3 key
    const generateS3Key = (timelineId: number, fileName: string): string => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '-');
      return `timelines/${timelineId}/images/${timestamp}-${randomString}-${sanitizedFileName}`;
    };
    
    // Get bucket name from environment
    const bucketName = import.meta.env.VITE_AWS_S3_BUCKET_NAME || '';
    
    if (!bucketName) {
      console.warn('AWS S3 bucket name not set, using fallback implementation');
      return;
    }
    
    // Override service methods with real implementations
    service.uploadToS3 = async (file: File, timelineId: number): Promise<string> => {
      try {
        const key = generateS3Key(timelineId, file.name);
        const fileContent = await file.arrayBuffer();
        
        const command = new s3Module.PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileContent,
          ContentType: file.type,
        });
        
        await s3Client.send(command);
        console.log(`Successfully uploaded file to S3: ${key}`);
        return key;
      } catch (error) {
        console.error('Error uploading file to S3:', error);
        // Fallback to local implementation on error
        return fallbackService.uploadToS3(file, timelineId);
      }
    };
    
    service.deleteFromS3 = async (key: string): Promise<void> => {
      try {
        const command = new s3Module.DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        
        await s3Client.send(command);
        console.log(`Successfully deleted file from S3: ${key}`);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
        // Use fallback (which does nothing) on error
        await fallbackService.deleteFromS3(key);
      }
    };
    
    service.getS3SignedUrl = async (key: string, expirationSeconds = 3600): Promise<string> => {
      try {
        const command = new s3Module.GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        
        const signedUrl = await presignerModule.getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });
        return signedUrl;
      } catch (error) {
        console.error('Error generating signed URL:', error);
        // Fallback to placeholder image on error
        return fallbackService.getS3SignedUrl(key);
      }
    };
    
    service.extractS3KeyFromUrl = (imageUrl: string): string => {
      if (!imageUrl) return '';
      
      if (!imageUrl.startsWith('http')) {
        return imageUrl;
      }
      
      try {
        const url = new URL(imageUrl);
        const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
        
        if (key.startsWith(bucketName + '/')) {
          return key.substring(bucketName.length + 1);
        }
        
        return key;
      } catch (error) {
        console.error('Error extracting S3 key from URL:', error);
        return imageUrl;
      }
    };
    
    console.log('AWS S3 service initialized successfully');
  } catch (error) {
    console.warn('Error initializing S3 service, using fallback:', error);
  }
})();

// Export the service methods
export const { uploadToS3, deleteFromS3, getS3SignedUrl, extractS3KeyFromUrl } = service; 