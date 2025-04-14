import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Upload, X, Eye, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDrag, useDrop } from 'react-dnd';

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

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="absolute top-2 left-2 cursor-move z-10 text-white">
        <GripVertical className="w-4 h-4" />
      </div>
      <img
        src={image.imageUrl}
        alt={image.caption || 'Timeline image'}
        className="w-full aspect-square object-cover rounded-lg"
      />
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
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [editingCaption, setEditingCaption] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [previewImage, setPreviewImage] = useState<TimelineImage | null>(null);
  const [images, setImages] = useState<TimelineImage[]>([]);

  const { data: fetchedImages, isLoading } = useQuery<TimelineImage[]>({
    queryKey: ['/api/timelines', timelineId, 'images'],
    queryFn: async () => {
      const response = await fetch(`/api/timelines/${timelineId}/images`);
      if (!response.ok) throw new Error('Failed to fetch images');
      const data = await response.json();
      return data;
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
      const response = await fetch(`/api/timelines/${timelineId}/images/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds }),
      });
      if (!response.ok) throw new Error('Failed to reorder images');
      return response.json();
    },
    onSuccess: (newImages) => {
      setImages(newImages);
      queryClient.invalidateQueries({ queryKey: ['/api/timelines', timelineId, 'images'] });
      toast({
        title: "Success",
        description: "Images reordered successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder images",
        variant: "destructive",
      });
    },
  });

  const moveImage = (dragIndex: number, hoverIndex: number) => {
    const draggedImage = images[dragIndex];
    const newImages = [...images];
    newImages.splice(dragIndex, 1);
    newImages.splice(hoverIndex, 0, draggedImage);
    setImages(newImages);
    reorderMutation.mutate(newImages.map(img => img.id));
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/timelines/${timelineId}/images`, {
        method: 'POST',
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
      setSelectedFiles(null);
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
      const response = await fetch(`/api/timelines/${timelineId}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timelines', timelineId, 'images'] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ imageId, caption }: { imageId: number; caption: string }) => {
      const response = await fetch(`/api/timelines/${timelineId}/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (!canUpload) {
      toast({
        title: "Error",
        description: "Maximum limit of 10 images reached",
        variant: "destructive",
      });
      return;
    }

    if (files.length > remainingImages) {
      toast({
        title: "Error",
        description: `You can only upload up to ${remainingImages} more image${remainingImages === 1 ? '' : 's'}`,
        variant: "destructive",
      });
      return;
    }

    if (Array.from(files).some(file => file.size > 5 * 1024 * 1024)) {
      toast({
        title: "Error",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(files);
  };

  const handleUpload = () => {
    if (selectedFiles) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              multiple
              max={remainingImages}
              onChange={handleFileChange}
              className="flex-1"
              disabled={!canUpload}
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFiles || uploadMutation.isPending || !canUpload}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {remainingImages} of 10 images remaining
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {images.map((image, index) => (
            <>
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
              {editingCaption === image.id && (
                <Dialog open={true} onOpenChange={() => setEditingCaption(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Caption</DialogTitle>
                      <DialogDescription>
                        Update the caption for this image.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Enter caption"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingCaption(null)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => updateCaptionMutation.mutate({ 
                            imageId: image.id, 
                            caption 
                          })}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          ))}
        </div>
      )}

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 text-white"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {previewImage && (
              <>
                <img
                  src={previewImage.imageUrl}
                  alt={previewImage.caption || 'Timeline image'}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                {previewImage.caption && (
                  <div className="p-4 bg-black/75 text-white absolute bottom-0 left-0 right-0">
                    {previewImage.caption}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}