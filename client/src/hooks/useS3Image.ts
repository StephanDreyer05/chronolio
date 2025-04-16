import { useState, useEffect } from 'react';
import { getS3SignedUrl, extractS3KeyFromUrl } from '../lib/s3Service';
import placeholderImage from '../assets/images/placeholder.svg';

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
    
    console.log('useS3Image processing:', imageUrl);
    
    // Check if the URL is an S3 key (not a memory placeholder or a data URL)
    if (imageUrl.startsWith('memory-storage-placeholder-') || 
        imageUrl.startsWith('http') || 
        imageUrl.startsWith('data:')) {
      console.log('Direct URL detected, using as-is:', imageUrl);
      // Just use the original URL
      setSignedUrl(imageUrl);
      return;
    }
    
    // Handle fallback keys created by our fallback S3 service
    if (imageUrl.startsWith('fallback-s3-key-')) {
      console.log('Fallback key detected, using placeholder image');
      // Use placeholder image from assets
      setSignedUrl(placeholderImage);
      return;
    }
    
    // Extract the S3 key if it's a signed URL
    const key = extractS3KeyFromUrl(imageUrl);
    
    if (!key) {
      console.log('No key detected, using original URL:', imageUrl);
      setSignedUrl(imageUrl);
      return;
    }
    
    console.log('S3 key extracted:', key);
    
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        
        // Log the key for debugging
        console.log(`Getting signed URL for image key: ${key}`);
        
        // Try to load using the client's getS3SignedUrl function
        const url = await getS3SignedUrl(key);
        
        // If we got a URL back, use it
        if (url) {
          console.log(`Resolved image URL (success):`, url);
          setSignedUrl(url);
        } else {
          console.error(`Failed to get signed URL: result was empty or null`);
          throw new Error('Failed to get signed URL');
        }
      } catch (err) {
        console.error(`Error getting signed URL for key "${key}":`, err);
        setError(err instanceof Error ? err : new Error('Failed to get signed URL'));
        // Use placeholder image from assets
        setSignedUrl(placeholderImage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSignedUrl();
  }, [imageUrl, options?.expirationSeconds]);
  
  return { url: signedUrl, loading, error };
} 