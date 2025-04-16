import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useS3Image } from '../hooks/useS3Image';
import placeholderImage from '../assets/images/placeholder.svg';

interface S3ImageProps {
  imageUrl: string;
  caption?: string;
  className?: string;
  alt?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * A component for displaying S3 images with better error handling and logging
 */
export function S3Image({ 
  imageUrl, 
  caption, 
  className = '', 
  alt = 'Image',
  onLoad,
  onError
}: S3ImageProps) {
  const { url, loading, error } = useS3Image(imageUrl);
  const [imgError, setImgError] = useState<boolean>(false);
  
  // Log image status for debugging
  useEffect(() => {
    if (error) {
      console.error('S3Image error loading:', imageUrl, error);
      onError?.(error);
    }
  }, [error, imageUrl, onError]);
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error || !url || imgError) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 ${className}`}>
        <img 
          src={placeholderImage} 
          alt="Placeholder"
          className="max-w-full max-h-40 mx-auto"
        />
        <div className="text-center text-gray-500 mt-2">
          <p className="text-xs">{imageUrl ? `Failed to load: ${imageUrl.substring(0, 20)}...` : "Image unavailable"}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      <img
        src={url}
        alt={alt || caption || 'Timeline image'}
        onLoad={() => {
          console.log('Image loaded successfully:', url);
          onLoad?.();
        }}
        onError={(e) => {
          console.error('Image error (direct):', e);
          setImgError(true);
        }}
        className="w-full rounded-md object-contain"
      />
      {caption && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {caption}
        </div>
      )}
    </div>
  );
} 