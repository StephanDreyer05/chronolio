import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDispatch } from "react-redux";
import { setItems, updateWeddingInfo } from "@/store/timelineSlice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface AITimelineGeneratorProps {
  open: boolean;
  onClose: () => void;
  existingItems?: any[];
  isEditing?: boolean;
  setCategories?: (categories: Category[]) => void;
  setShowCategories?: (show: boolean) => void;
  existingTimeline?: any;
  isTrial?: boolean;
}

export function AITimelineGenerator({
  open,
  onClose,
  existingItems = [],
  isEditing = false,
  setCategories,
  setShowCategories,
  existingTimeline,
  isTrial = false,
}: AITimelineGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [enableCategories, setEnableCategories] = useState(existingTimeline?.categoriesEnabled ?? true);
  const { toast } = useToast();
  const dispatch = useDispatch();
  const { id } = useParams();
  const queryClient = useQueryClient();

  // Effect to update enableCategories when existingTimeline changes
  useEffect(() => {
    if (existingTimeline) {
      setEnableCategories(existingTimeline.categoriesEnabled ?? true);
    }
  }, [existingTimeline]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Create an AbortController for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const response = await fetch("/api/ai/generate-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt,
          existingTimeline,
          categoriesEnabled: enableCategories
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId); // Clear the timeout if the request completes

      if (!response.ok) {
        throw new Error(isEditing ? "Failed to edit timeline" : "Failed to generate timeline");
      }

      const data = await response.json();
      console.log("Received timeline data:", data);

      // Update wedding info
      if (data.title || data.date || data.type || data.location) {
        dispatch(updateWeddingInfo({
          names: data.title,
          date: data.date,
          type: data.type || 'event',
          location: data.location,
        }));
      }

      // Create a mapping of category names to their formatted IDs
      const categoryNameToId = new Map<string, string>();
      let formattedCategories: Category[] = [];
      
      // Always respect the user's choice for categoriesEnabled
      const shouldEnableCategories = enableCategories;
      
      // Handle categories if they exist
      if (data.categories && Array.isArray(data.categories)) {
        formattedCategories = data.categories.map(
          (cat: any, index: number) => ({
            id: `ai-cat-${index}`,
            name: cat.name,
            description: cat.description || "",
            order: index,
          })
        );

        // Create category mapping regardless of whether categories are enabled
        formattedCategories.forEach((cat: Category) => {
          categoryNameToId.set(cat.name, cat.id);
        });
        
        // Only update UI categories if we have a setter and categoriesEnabled is true
        if (setCategories && shouldEnableCategories) {
          setCategories(formattedCategories);
          if (setShowCategories) {
            setShowCategories(shouldEnableCategories);
          }
        } else if (setShowCategories) {
          // If categories should be disabled, update the UI
          setShowCategories(false);
        }
      }

      // Format items with the correct category mapping
      let formattedItems: any[] = [];
      
      // Handle events with category mappings
      if (data.events && Array.isArray(data.events)) {
        formattedItems = data.events.map((event: any, index: number) => {
          // Map the category name to the corresponding category ID
          const categoryId = event.category && categoryNameToId.has(event.category) 
            ? categoryNameToId.get(event.category) 
            : undefined;
            
          return {
            id: `ai-${index}`,
            startTime: event.startTime,
            endTime: event.endTime,
            duration: event.duration,
            title: event.title,
            description: event.description || "",
            location: event.location || "",
            type: event.type || "event",
            category: data.categoriesEnabled ? event.category : undefined, // Only include category name if categories are enabled
            categoryId: categoryId, // Always include the categoryId reference for database mapping
          };
        });

        dispatch(setItems(formattedItems));
      }

      // If we're editing an existing timeline, save the changes immediately
      if (isEditing && id) {
        // Save the changes to avoid them being overwritten on reload
        try {
          const saveResponse = await fetchWithAuth(`/api/timelines/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: data.title,
              date: data.date,
              type: data.type || 'event',
              location: data.location,
              categoriesEnabled: shouldEnableCategories,
              vendorsEnabled: existingTimeline?.vendorsEnabled || false,
              customFieldValues: existingTimeline?.customFieldValues || {},
              categories: formattedCategories.map((cat, index) => ({
                name: cat.name,
                description: cat.description || "",
                order: index,
              })),
              events: formattedItems.map((item, index) => ({
                startTime: item.startTime,
                endTime: item.endTime,
                duration: item.duration,
                title: item.title,
                description: item.description || "",
                location: item.location || "",
                type: item.type || "event",
                category: item.category,
                categoryId: item.categoryId,
                order: index,
              })),
            }),
          });

          if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            console.error("Failed to save AI-generated timeline changes:", errorText);
            throw new Error("Failed to save timeline changes");
          } else {
            // Invalidate queries to ensure fresh data
            queryClient.invalidateQueries({ queryKey: ['/api/timelines'] });
            queryClient.invalidateQueries({ queryKey: [`/api/timelines/${id}`] });
            
            toast({
              title: "Success",
              description: "Timeline updated and saved successfully",
            });
          }
        } catch (saveError) {
          console.error("Error saving timeline:", saveError);
          toast({
            title: "Warning",
            description: "Timeline was generated but could not be saved automatically. Please save manually.",
            variant: "destructive",
          });
        }
      } else if (id && !isEditing) {
        // If there's an ID but we're not in edit mode (creating a new timeline from AI)
        toast({
          title: "Success",
          description: "Timeline generated successfully. Please save to keep your changes.",
        });
      } else {
        toast({
          title: "Success",
          description: "Timeline generated successfully",
        });
      }

      onClose();
    } catch (error: any) {
      console.error("Error with timeline:", error);
      toast({
        title: "Error",
        description: error.message || (isEditing ? "Failed to edit timeline" : "Failed to generate timeline"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-zinc-900 border-0 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            {isEditing ? "Edit Timeline with AI" : "Generate Timeline with AI"}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
            {isEditing 
              ? "Provide instructions to modify your existing timeline." 
              : "Describe your event and we'll generate a timeline for you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Textarea
            placeholder={
              isEditing
                ? "Enter your instructions for editing the timeline. For example: Add a photography session after the ceremony, extend the reception by 1 hour"
                : "Describe your event in detail. For example: We are Stephan & Nicole and are getting married on 20 February 2025 at The Stables Wedding Venue and we are a Jewish couple"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[150px] p-4 text-base border-gray-300 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400"
          />

          <div className="flex items-center space-x-3">
            <Switch
              id="enable-categories"
              checked={enableCategories}
              onCheckedChange={setEnableCategories}
              className="data-[state=checked]:bg-purple-600"
            />
            <Label htmlFor="enable-categories" className="text-base font-medium">Enable Categories</Label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Timeline" : "Generate Timeline"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}