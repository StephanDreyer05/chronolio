import { useState, useEffect } from 'react';
import { getS3SignedUrl, extractS3KeyFromUrl } from '../lib/s3Service';

interface UseS3ImageOptions {
  expirationSeconds?: number;
}

/**
 * Hook to get a signed URL for an S3 image
 * 
 * @param imageUrl - S3 key or signed URL
 * @param options - Configuration options
 * @returns Signed URL or original URL if not an S3 key
 */
export function useS3Image(imageUrl: string | null | undefined, options?: UseS3ImageOptions) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Reset state when imageUrl changes
    setSignedUrl(null);
    setError(null);
    
    if (!imageUrl) {
      return;
    }
    
    // Check if the URL is an S3 key (not a memory placeholder or full URL)
    if (imageUrl.startsWith('memory-storage-placeholder-') || imageUrl.startsWith('http')) {
      // Just use the original URL
      setSignedUrl(imageUrl);
      return;
    }
    
    // Extract the S3 key if it's a signed URL
    const key = extractS3KeyFromUrl(imageUrl);
    
    if (!key) {
      setSignedUrl(imageUrl);
      return;
    }
    
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        const url = await getS3SignedUrl(key, options?.expirationSeconds);
        setSignedUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get signed URL'));
        // Fallback to original URL
        setSignedUrl(imageUrl);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSignedUrl();
  }, [imageUrl, options?.expirationSeconds]);
  
  return { url: signedUrl, loading, error };
} 