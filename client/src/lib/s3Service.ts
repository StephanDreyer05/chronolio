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

// Use AWS SDK when available, otherwise use fallback implementation
let service: any;

try {
  // Try to dynamically import AWS SDK modules
  // This will fail during build but succeed at runtime if AWS SDK is installed
  const importS3Modules = async () => {
    try {
      const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

      // This class will be used when AWS SDK is available
      class AWSS3Service {
        private s3Client: any;
        private bucketName: string;

        constructor() {
          this.bucketName = import.meta.env.VITE_AWS_S3_BUCKET_NAME || '';
          this.s3Client = new S3Client({
            region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
            credentials: {
              accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
              secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
            }
          });
        }

        private generateS3Key(timelineId: number, fileName: string): string {
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '-');
          return `timelines/${timelineId}/images/${timestamp}-${randomString}-${sanitizedFileName}`;
        }

        async uploadToS3(file: File, timelineId: number): Promise<string> {
          try {
            const key = this.generateS3Key(timelineId, file.name);
            const fileContent = await file.arrayBuffer();
            
            const command = new PutObjectCommand({
              Bucket: this.bucketName,
              Key: key,
              Body: fileContent,
              ContentType: file.type,
            });
            
            await this.s3Client.send(command);
            return key;
          } catch (error) {
            console.error('Error uploading file to S3:', error);
            throw new Error('Failed to upload image to S3');
          }
        }

        async deleteFromS3(key: string): Promise<void> {
          try {
            const command = new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: key,
            });
            
            await this.s3Client.send(command);
          } catch (error) {
            console.error('Error deleting file from S3:', error);
            throw new Error('Failed to delete image from S3');
          }
        }

        async getS3SignedUrl(key: string, expirationSeconds = 3600): Promise<string> {
          try {
            const command = new GetObjectCommand({
              Bucket: this.bucketName,
              Key: key,
            });
            
            const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expirationSeconds });
            return signedUrl;
          } catch (error) {
            console.error('Error generating signed URL:', error);
            throw new Error('Failed to generate image URL');
          }
        }

        extractS3KeyFromUrl(imageUrl: string): string {
          if (!imageUrl) return '';
          
          if (!imageUrl.startsWith('http')) {
            return imageUrl;
          }
          
          try {
            const url = new URL(imageUrl);
            const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
            
            if (key.startsWith(this.bucketName + '/')) {
              return key.substring(this.bucketName.length + 1);
            }
            
            return key;
          } catch (error) {
            console.error('Error extracting S3 key from URL:', error);
            return '';
          }
        }
      }

      return new AWSS3Service();
    } catch (error) {
      console.warn('AWS SDK not available, using fallback implementation:', error);
      return new FallbackS3Service();
    }
  };

  // Initialize async - this will be null until initialized
  let servicePromise = importS3Modules();
  
  // Create methods that wait for the service to be initialized
  service = {
    uploadToS3: async (file: File, timelineId: number) => {
      const s3Service = await servicePromise;
      return s3Service.uploadToS3(file, timelineId);
    },
    deleteFromS3: async (key: string) => {
      const s3Service = await servicePromise;
      return s3Service.deleteFromS3(key);
    },
    getS3SignedUrl: async (key: string, expirationSeconds = 3600) => {
      const s3Service = await servicePromise;
      return s3Service.getS3SignedUrl(key, expirationSeconds);
    },
    extractS3KeyFromUrl: (imageUrl: string) => {
      // For this method, use the fallback immediately since it doesn't need to be async
      return new FallbackS3Service().extractS3KeyFromUrl(imageUrl);
    }
  };
} catch (error) {
  console.warn('Error initializing S3 service, using fallback:', error);
  const fallback = new FallbackS3Service();
  service = {
    uploadToS3: fallback.uploadToS3.bind(fallback),
    deleteFromS3: fallback.deleteFromS3.bind(fallback),
    getS3SignedUrl: fallback.getS3SignedUrl.bind(fallback),
    extractS3KeyFromUrl: fallback.extractS3KeyFromUrl.bind(fallback)
  };
}

// Export the service methods
export const { uploadToS3, deleteFromS3, getS3SignedUrl, extractS3KeyFromUrl } = service; 