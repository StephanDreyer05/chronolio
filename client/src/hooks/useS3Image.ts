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
    
    // Check if the URL is an S3 key (not a memory placeholder or a data URL)
    if (imageUrl.startsWith('memory-storage-placeholder-') || 
        imageUrl.startsWith('http') || 
        imageUrl.startsWith('data:')) {
      // Just use the original URL
      setSignedUrl(imageUrl);
      return;
    }
    
    // Handle fallback keys created by our fallback S3 service
    if (imageUrl.startsWith('fallback-s3-key-')) {
      // Generate a placeholder image
      setSignedUrl('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkltYWdlIFVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==');
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
        // Fallback to a placeholder image
        setSignedUrl('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkVycm9yIExvYWRpbmcgSW1hZ2U8L3RleHQ+PC9zdmc+');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSignedUrl();
  }, [imageUrl, options?.expirationSeconds]);
  
  return { url: signedUrl, loading, error };
} 