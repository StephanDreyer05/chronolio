/**
 * S3 Service using direct Fetch API instead of AWS SDK
 * This avoids AWS SDK build issues on Vercel
 */

// Helper to generate AWS v4 signature
const generateSignature = async (method, canonicalUri, queryParams, headers, payload, timestamp) => {
  const region = process.env.AWS_REGION;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Implementation would go here - this is complex and requires crypto
  // For this example, just returning an example signature
  console.log('Would generate AWS signature here');
  return 'AWS4-HMAC-SHA256 Credential=...';
};

// Direct S3 service implementation
const s3DirectService = {
  testConnection: async () => {
    try {
      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      const endpoint = `https://${bucket}.s3.${region}.amazonaws.com`;
      
      // Simple HEAD request to check if bucket exists and is accessible
      const response = await fetch(endpoint, {
        method: 'HEAD',
        headers: {
          'Host': `${bucket}.s3.${region}.amazonaws.com`
        }
      });
      
      if (response.ok) {
        return {
          success: true,
          message: 'Successfully connected to S3 bucket',
          bucket,
          region
        };
      } else {
        throw new Error(`Failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('S3 connection test failed:', error);
      return {
        success: false,
        message: 'Failed to connect to AWS S3',
        error: String(error)
      };
    }
  },
  
  uploadFile: async (fileBuffer, key, contentType) => {
    try {
      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      const endpoint = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      
      // For real implementation, you'd need to generate a proper AWS signature
      // This is simplified for illustration
      const date = new Date().toISOString();
      const headers = {
        'Content-Type': contentType || 'application/octet-stream',
        'Host': `${bucket}.s3.${region}.amazonaws.com`,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        'x-amz-date': date
      };
      
      // Generate authorization header
      const authorization = await generateSignature('PUT', `/${key}`, {}, headers, fileBuffer, date);
      
      // Make direct S3 API call
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          ...headers,
          'Authorization': authorization
        },
        body: fileBuffer
      });
      
      if (response.ok) {
        console.log(`Successfully uploaded file to S3: ${key}`);
        return {
          success: true,
          key: key
        };
      } else {
        throw new Error(`Failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      return {
        success: false,
        key: key,
        error: String(error)
      };
    }
  },
  
  generateSignedUrl: async (key, expirationSeconds = 3600) => {
    try {
      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      
      // For a real implementation, you'd generate presigned URL with proper signature
      // This is simplified
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      
      return { success: true, url };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return {
        success: false,
        url: null,
        error: String(error),
        mockUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkltYWdlIFVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
      };
    }
  }
};

export default s3DirectService; 