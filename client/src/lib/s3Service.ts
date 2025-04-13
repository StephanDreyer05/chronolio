import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 configuration
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  }
});

const bucketName = import.meta.env.VITE_AWS_S3_BUCKET_NAME || '';

/**
 * Generates a unique key for an S3 object
 */
const generateS3Key = (timelineId: number, fileName: string): string => {
  // Create a unique file name to avoid collisions
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '-');
  
  return `timelines/${timelineId}/images/${timestamp}-${randomString}-${sanitizedFileName}`;
};

/**
 * Uploads a file to S3 and returns the S3 key
 */
export const uploadToS3 = async (file: File, timelineId: number): Promise<string> => {
  try {
    const key = generateS3Key(timelineId, file.name);
    
    // Convert file to ArrayBuffer
    const fileContent = await file.arrayBuffer();
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: file.type,
    });
    
    await s3Client.send(command);
    
    return key;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload image to S3');
  }
};

/**
 * Deletes a file from S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error('Failed to delete image from S3');
  }
};

/**
 * Gets a signed URL for an S3 object
 */
export const getS3SignedUrl = async (key: string, expirationSeconds = 3600): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate image URL');
  }
};

/**
 * Extracts the S3 key from an imageUrl
 * The URL can be either a full S3 URL or just the key
 */
export const extractS3KeyFromUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // If it's already just a key (doesn't start with http)
  if (!imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Try to extract the key from a signed URL
  try {
    const url = new URL(imageUrl);
    const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    
    // If the URL contains the bucket name in the path, remove it
    if (key.startsWith(bucketName + '/')) {
      return key.substring(bucketName.length + 1);
    }
    
    return key;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return '';
  }
}; 