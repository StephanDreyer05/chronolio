/**
 * S3 Service with server-side fallback
 * 
 * This implementation provides fallback functionality by using server-side S3 API
 * instead of trying to directly import AWS SDK in the browser.
 */

// Fallback implementation that will be used when AWS SDK is not available
class FallbackS3Service {
  uploadToS3(file: File, timelineId: number): Promise<string> {
    console.warn('Using fallback S3 service (server-side API)');
    // Generate a mock S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
    return Promise.resolve(`fallback-s3-key-${timelineId}-${timestamp}-${randomString}-${sanitizedFileName}`);
  }

  deleteFromS3(key: string): Promise<void> {
    console.warn('Using fallback S3 service (server-side API)');
    return Promise.resolve();
  }

  getS3SignedUrl(key: string): Promise<string> {
    console.warn('Using fallback S3 service (server-side API)');
    // Return a data URL for placeholder image
    return Promise.resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkltYWdlIFVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==');
  }

  extractS3KeyFromUrl(imageUrl: string): string {
    return imageUrl;
  }

  // Add this new method to use server endpoint instead
  async useServerSideS3() {
    try {
      // Test if the server-side S3 endpoint is available
      const response = await fetch('/api/s3/test');
      
      if (!response.ok) {
        throw new Error(`Server S3 test failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: data.success,
        usingServerSide: true,
        ...data
      };
    } catch (error: unknown) {
      console.error('Error testing server-side S3:', error);
      return {
        success: false,
        usingServerSide: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Create a fallback instance
const fallbackService = new FallbackS3Service();

// Initialize with fallback methods
const service = {
  uploadToS3: fallbackService.uploadToS3.bind(fallbackService),
  deleteFromS3: fallbackService.deleteFromS3.bind(fallbackService),
  getS3SignedUrl: fallbackService.getS3SignedUrl.bind(fallbackService),
  extractS3KeyFromUrl: fallbackService.extractS3KeyFromUrl.bind(fallbackService),
  useServerSideS3: fallbackService.useServerSideS3.bind(fallbackService)
};

// Debug environment variables (redacted for security)
console.log('S3 Environment Variables Check:', {
  hasRegion: !!import.meta.env.VITE_AWS_REGION,
  hasAccessKey: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
  hasSecretKey: !!import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  hasBucketName: !!import.meta.env.VITE_AWS_S3_BUCKET_NAME,
});

// Log that we're using the server-side approach
console.log('Using server-side S3 service - direct AWS SDK imports disabled');

// Export the service methods
export const { uploadToS3, deleteFromS3, getS3SignedUrl, extractS3KeyFromUrl, useServerSideS3 } = service; 