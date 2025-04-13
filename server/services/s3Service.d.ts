/**
 * Type definitions for server/services/s3Service.js
 */

export interface S3UploadResult {
  success: boolean;
  key: string;
  error?: string;
  usingMock?: boolean;
}

export interface S3UrlResult {
  success: boolean;
  url?: string;
  mockUrl?: string;
  error?: string;
}

export interface S3TestResult {
  success: boolean;
  message: string;
  bucket?: string;
  region?: string;
  error?: string;
  usingMock?: boolean;
}

export interface S3ListBucketsResult {
  success: boolean;
  buckets: Array<{
    name: string;
    creationDate: Date;
  }>;
  error?: string;
  usingMock?: boolean;
}

export interface S3Service {
  uploadFile(fileBuffer: Buffer, key: string, contentType?: string): Promise<S3UploadResult>;
  generateSignedUrl(key: string, expirationSeconds?: number): Promise<S3UrlResult>;
  testConnection(): Promise<S3TestResult>;
  listBuckets(): Promise<S3ListBucketsResult>;
}

export function initializeS3Service(): Promise<boolean>;

declare const s3Service: S3Service;
export default s3Service; 