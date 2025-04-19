import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Upload, X, Eye, GripVertical, Trash, PlusCircle, Loader2, AlertCircle, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useDrag, useDrop } from 'react-dnd';
import { fetchWithAuth } from "../../lib/api";
import { uploadToS3, deleteFromS3, extractS3KeyFromUrl } from '../../lib/s3Service';
import { useS3Image } from '../../hooks/useS3Image';

interface TimelineImage {
  id: number;
  timelineId: number;
  imageUrl: string;
  caption: string;
  order: number;
}

interface TimelineImagesProps {
  timelineId: number;
}

interface DraggableImageProps {
  image: TimelineImage;
  index: number;
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

const DraggableImage = ({ image, index, moveImage, onEdit, onDelete, onPreview }: DraggableImageProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'IMAGE',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'IMAGE',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveImage(item.index, index);
        item.index = index;
      }
    },
  });

  // Use our S3 image hook to get the signed URL
  const { url: signedImageUrl, loading: imageLoading } = useS3Image(image.imageUrl);

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="absolute top-2 left-2 cursor-move z-10 text-white">
        <GripVertical className="w-4 h-4" />
      </div>
      {imageLoading ? (
        <div className="w-full aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <img
          src={signedImageUrl || ''}
          alt={image.caption || 'Timeline image'}
          className="w-full aspect-square object-cover rounded-lg"
        />
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onPreview}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {image.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/75 text-white rounded-b-lg">
          {image.caption}
        </div>
      )}
    </div>
  );
};

export function TimelineImages({ timelineId }: TimelineImagesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingCaption, setEditingCaption] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [previewImage, setPreviewImage] = useState<TimelineImage | null>(null);
  const [images, setImages] = useState<TimelineImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: fetchedImages, isLoading, error: imagesError } = useQuery<TimelineImage[]>({
    queryKey: [`/api/timelines/${timelineId}/images`],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(`/api/timelines/${timelineId}/images`);
        if (!response.ok) {
          if (response.status === 404) {
            // If 404, return empty array since there might not be any images yet
            return [];
          }
          const errorText = await response.text();
          console.error(`Error loading timeline images: ${response.status} ${errorText}`);
          throw new Error(`Failed to load timeline images: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching timeline images:', error);
        throw error;
      }
    },
    // Don't retry on 404s since that's not an error condition
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Update the images state whenever fetchedImages changes
  useEffect(() => {
    if (fetchedImages) {
      setImages(fetchedImages);
    }
  }, [fetchedImages]);
  
  const remainingImages = 10 - (images?.length || 0);
  const canUpload = remainingImages > 0;

  const reorderMutation = useMutation({
    mutationFn: async (imageIds: number[]) => {
      // Server expects a simple array of image IDs where the position in the array
      // determines the order value that will be set in the database
      
      // Validate IDs to ensure they're all valid numbers
      const validatedIds = imageIds.filter(id => {
        const isValid = !isNaN(Number(id)) && Number(id) > 0;
        if (!isValid) {
          console.error('Invalid image ID detected and removed:', id);
        }
        return isValid;
      });
      
      if (validatedIds.length === 0) {
        throw new Error('No valid image IDs to reorder');
      }
      
      console.log('Sending reorder request with IDs array:', validatedIds);
      
      try {
        // Send exactly what the server expects - a simple object with an imageIds array
        const response = await fetchWithAuth(`/api/timelines/${timelineId}/images/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ imageIds: validatedIds }),
        });
        
        // Handle non-OK responses
        if (!response.ok) {
          let errorMessage = `Server returned ${response.status}`;
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If can't parse JSON, try to get text
            errorMessage = await response.text() || errorMessage;
          }
          
          throw new Error(`Failed to reorder images: ${errorMessage}`);
        }
        
        console.log('Reorder successful with status:', response.status);
        return response.json();
      } catch (error) {
        console.error('Reorder request failed:', error);
        throw error;
      }
    },
    onSuccess: (newImages) => {
      // Update local state with the server response
      setImages(newImages);
      
      // Invalidate the query cache to ensure data consistency
      queryClient.invalidateQueries({ queryKey: [`/api/timelines/${timelineId}/images`] });
      
      toast({
        title: "Success",
        description: "Images reordered successfully",
      });
    },
    onError: (error) => {
      console.error('Reorder mutation error:', error);
      
      // Revert to the original state if available
      if (fetchedImages) {
        setImages(fetchedImages);
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder images",
        variant: "destructive",
      });
    },
  });

  // Add a reference to store the timeout ID for debouncing
  const reorderTimeoutRef = useRef<number | null>(null);

  const moveImage = (dragIndex: number, hoverIndex: number) => {
    // Validate indices to prevent out-of-bounds errors
    if (dragIndex < 0 || dragIndex >= images.length || hoverIndex < 0 || hoverIndex >= images.length) {
      console.error('Invalid drag or hover index:', { dragIndex, hoverIndex, imagesLength: images.length });
      return;
    }
    
    try {
      // Create a new array to avoid mutating the original state
      const updatedImages = [...images];
      
      // Remove the dragged item from the array
      const draggedImage = updatedImages[dragIndex];
      updatedImages.splice(dragIndex, 1);
      
      // Insert it at the new position
      updatedImages.splice(hoverIndex, 0, draggedImage);
      
      // Update local state immediately for responsive UI
      setImages(updatedImages);
      
      // Clear any existing timeout to avoid multiple API calls
      if (reorderTimeoutRef.current) {
        clearTimeout(reorderTimeoutRef.current);
      }
      
      // Set a new timeout to debounce the API call (wait 800ms before sending)
      reorderTimeoutRef.current = setTimeout(() => {
        // Extract just the image IDs in their new order
        const imageIds = updatedImages.map(img => Number(img.id));
        
        // Filter out any invalid IDs before sending the request
        const validIds = imageIds.filter(id => !isNaN(id) && id > 0);
        
        if (validIds.length !== imageIds.length) {
          console.warn('Some invalid IDs were filtered out during reordering');
        }
        
        if (validIds.length > 0) {
          // Trigger the mutation with the updated order
          reorderMutation.mutate(validIds);
        } else {
          console.error('No valid IDs to reorder');
          toast({
            title: "Error",
            description: "Failed to reorder images - no valid IDs",
            variant: "destructive",
          });
        }
        
        // Clear the reference
        reorderTimeoutRef.current = null;
      }, 800);
      
    } catch (error) {
      console.error('Error during image reordering:', error);
      
      // If anything went wrong, revert to the original state
      if (fetchedImages) {
        setImages(fetchedImages);
      }
      
      // Notify the user
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder images",
        variant: "destructive",
      });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetchWithAuth(`/api/timelines/${timelineId}/images`, {
        method: 'POST',
        headers: undefined,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload images');
      }
      return response.json();
    },
    onSuccess: (newImages) => {
      setImages([...images, ...newImages]);
      queryClient.invalidateQueries({ queryKey: ['/api/timelines', timelineId, 'images'] });
      setSelectedFiles([]);
      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      // First, get the image to extract the S3 key
      const imageToDelete = images.find(img => img.id === imageId);
      if (!imageToDelete) {
        throw new Error('Image not found');
      }

      // Extract S3 key from the URL
      const s3Key = extractS3KeyFromUrl(imageToDelete.imageUrl);
      
      // Delete from database first
      const response = await fetchWithAuth(`/api/timelines/${timelineId}/images/${imageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete image from database');
      }
      
      // If it's an S3 key, also delete from S3
      if (s3Key && !imageToDelete.imageUrl.startsWith('memory-storage-placeholder-')) {
        try {
          await deleteFromS3(s3Key);
        } catch (s3Error) {
          // Log the error but don't fail the whole operation - the database record is already deleted
          console.error('Failed to delete image from S3:', s3Error);
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timelines', timelineId, 'images'] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ imageId, caption }: { imageId: number; caption: string }) => {
      const response = await fetchWithAuth(`/api/timelines/${timelineId}/images/${imageId}`, {
        method: 'PUT',
        body: JSON.stringify({ caption }),
      });
      if (!response.ok) throw new Error('Failed to update caption');
      return response.json();
    },
    onSuccess: (updatedImage) => {
      setImages(currentImages => 
        currentImages.map(img => 
          img.id === updatedImage.id ? updatedImage : img
        )
      );
      queryClient.invalidateQueries({ queryKey: ['/api/timelines', timelineId, 'images'] });
      setEditingCaption(null);
      toast({
        title: "Success",
        description: "Caption updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update caption",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      // Try to upload files to S3 first
      const uploadPromises = selectedFiles.map(async (file) => {
        try {
          // Upload to S3 and get the key
          const s3Key = await uploadToS3(file, timelineId);
          return {
            file,
            s3Key,
            success: true
          };
        } catch (err) {
          console.error(`Failed to upload ${file.name} to S3:`, err);
          return {
            file,
            s3Key: null,
            success: false
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length === 0) {
        throw new Error('All uploads to S3 failed');
      }

      // Check if uploaded keys are fallback keys (when S3 is not available)
      const hasFallbackKeys = successfulUploads.some(upload => 
        upload.s3Key?.startsWith('fallback-s3-key-')
      );

      if (hasFallbackKeys) {
        // If using fallback keys, fall back to the standard file upload endpoint
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('images', file);
        });

        const response = await fetchWithAuth(`/api/timelines/${timelineId}/images`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload images to server');
        }
      } else {
        // S3 upload was successful, just register the keys with the server
        const response = await fetchWithAuth(`/api/timelines/${timelineId}/images/register-s3`, {
          method: 'POST',
          body: JSON.stringify({
            s3Keys: successfulUploads.map(r => r.s3Key),
            filenames: successfulUploads.map(r => r.file.name)
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to register S3 uploads with server');
        }
      }

      // Reset selected files
      setSelectedFiles([]);
      
      // Refresh the images list
      queryClient.invalidateQueries({ queryKey: [`/api/timelines/${timelineId}/images`] });
      
      toast({
        title: "Success",
        description: `Successfully uploaded ${successfulUploads.length} images`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (imagesError) {
    return (
      <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Error loading images</span>
        </div>
        <p className="text-sm mb-3">The system encountered an error while loading timeline images.</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/timelines/${timelineId}/images`] })}
          className="text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images && images.length > 0 ? (
          images.map((image, index) => (
            <DraggableImage
              key={image.id}
              image={image}
              index={index}
              moveImage={moveImage}
              onEdit={() => {
                setEditingCaption(image.id);
                setCaption(image.caption || '');
              }}
              onDelete={() => deleteMutation.mutate(image.id)}
              onPreview={() => setPreviewImage(image)}
            />
          ))
        ) : (
          <div className="col-span-full text-center p-6 border border-dashed rounded-md text-gray-500 dark:text-gray-400">
            No images uploaded yet. Add images to enhance your timeline.
          </div>
        )}
      </div>

      <div className="mt-4 p-4 border border-dashed rounded-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/20 dark:file:text-purple-300"
          />
          
          <div className="flex flex-1 flex-col">
            {selectedFiles.length > 0 && (
              <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                {selectedFiles.length} file(s) selected
              </div>
            )}
            
            <Button
              variant="default"
              size="sm"
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Upload Images
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Preview Image Dialog */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="sm:max-w-3xl">
            <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
              <S3Image 
                imageUrl={previewImage.imageUrl} 
                caption={previewImage.caption} 
                showFullscreenButton={true} 
                className="max-h-[70vh] w-auto object-contain mx-auto"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Caption Editing Dialog */}
      {editingCaption !== null && (
        <Dialog open={editingCaption !== null} onOpenChange={() => setEditingCaption(null)}>
          <DialogContent className="sm:max-w-md">
            <div className="space-y-4">
              <div className="font-medium">Edit Image Caption</div>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Enter a caption for this image"
                className="w-full"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingCaption(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingCaption !== null) {
                      updateCaptionMutation.mutate({
                        imageId: editingCaption,
                        caption
                      });
                    }
                  }}
                  disabled={updateCaptionMutation.isPending}
                >
                  {updateCaptionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : 'Save Caption'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create a helper component for displaying S3 images
interface S3ImageProps {
  imageUrl: string;
  caption?: string;
  className?: string;
  showFullscreenButton?: boolean;
}

function S3Image({ imageUrl, caption, className = '', showFullscreenButton = false }: S3ImageProps) {
  const { url, loading, error } = useS3Image(imageUrl);
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error || !url) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Failed to load image</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={url}
        alt={caption || 'Timeline image'}
        className="w-full h-full rounded-md object-contain"
      />
      {showFullscreenButton && (
        <Button 
          variant="outline" 
          size="sm"
          className="absolute top-2 right-2 bg-white/80 dark:bg-gray-800/80"
          onClick={() => window.open(url, '_blank')}
        >
          <Maximize2 className="w-4 h-4 mr-1" />
          <span className="text-xs">Fullscreen</span>
        </Button>
      )}
      {caption && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {caption}
        </div>
      )}
    </div>
  );
}