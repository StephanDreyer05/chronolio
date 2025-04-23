import { TimelineEditor } from "@/components/timeline/TimelineEditor";
import { TimelineImages } from "@/components/timeline/TimelineImages";
import { ParticipantInformation } from "@/components/timeline/ParticipantInformation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Save, Sparkles, Loader2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, resetTimeline, addItem, updateWeddingInfo, setItems as setReduxItems, deleteItem } from "@/store/timelineSlice";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { format } from 'date-fns';
import { AITimelineGenerator } from "@/components/timeline/AITimelineGenerator";
import { MainNav } from "@/components/MainNav";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { useTimelineNavigation } from "@/hooks/use-timeline-navigation";
import { fetchWithAuth } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface TimelineImage {
  id: number;
  timelineId: number;
  imageUrl: string;
  caption: string;
  order: number;
}

interface Timeline {
  id: number;
  title: string;
  date: string;
  type: string;
  location: string;
  categoriesEnabled: boolean;
  vendorsEnabled: boolean;
  categories: Array<{
    id: number;
    name: string;
    description?: string;
    order: number;
  }>;
  events: Array<{
    id: number;
    startTime: string;
    endTime: string;
    duration: string;
    title: string;
    description?: string;
    location?: string;
    type: string;
    categoryId?: number;
    order: number;
    vendors?: Array<{
      id: number;
      name: string;
      type: string;
      contactInfo?: string;
    }>;
  }>;
  images?: TimelineImage[];
  customFieldValues?: any;
  vendors?: Array<{
    id: number;
    name: string;
    type: string;
    contactInfo?: string;
  }>;
}

const sortByOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

// Add a helper function to check if refetch should be disabled
const shouldDisableRefetch = (timelineId: number | undefined): boolean => {
  if (!timelineId) return false;
  
  const disableUntilKey = `disableRefetchUntil_timeline_${timelineId}`;
  const disableUntilTimestamp = sessionStorage.getItem(disableUntilKey);
  
  if (!disableUntilTimestamp) return false;
  
  const disableUntil = parseInt(disableUntilTimestamp, 10);
  return disableUntil > Date.now();
};

// Add a helper to set the disable refetch flag
const disableRefetchFor = (timelineId: number | undefined, minutes: number = 5): void => {
  if (!timelineId) return;
  
  console.log(`[DEBUG] Setting disableRefetchUntil for timeline ${timelineId} for ${minutes} minutes`);
  const disableUntilKey = `disableRefetchUntil_timeline_${timelineId}`;
  const disableUntil = Date.now() + (minutes * 60 * 1000);
  sessionStorage.setItem(disableUntilKey, disableUntil.toString());
};

export default function TimelinePage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { collapsed } = useSidebar();
  const { items, weddingInfo } = useSelector((state: RootState) => state.timeline);
  const [showCategories, setShowCategories] = useState(false);
  const [showEndTimes, setShowEndTimes] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showVendors, setShowVendors] = useState(false);
  
  const { 
    showSaveDialog, 
    setShowSaveDialog, 
    navigationPath, 
    setNavigationPath,
    handleNavigation,
    setHasUnsavedChanges
  } = useTimelineNavigation();

  useEffect(() => {
    setHasUnsavedChanges(items.length > 0);
  }, [items, setHasUnsavedChanges]);

  useEffect(() => {
    if (!id) {
      dispatch(resetTimeline());
      dispatch(updateWeddingInfo({
        names: '',
        date: '',
        type: '',
        location: ''
      }));
      const searchParams = new URLSearchParams(window.location.search);
      const dateParam = searchParams.get('date');
      if (dateParam) {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          dispatch(updateWeddingInfo({
            names: '',
            date: format(parsedDate, 'yyyy-MM-dd'),
            type: '',
            location: ''
          }));
        }
      }
    }
  }, [id, dispatch]);

  const { data: existingTimeline, isLoading, error: timelineError } = useQuery<Timeline>({
    queryKey: [`/api/timelines/${id}`],
    enabled: !!id,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      console.log(`Fetching timeline with ID: ${id}`);
      
      // Check if we should disable refetch due to bulk edit mode
      const bulkEditActive = sessionStorage.getItem('bulkEditActive') === 'true';
      const editingTimelineId = sessionStorage.getItem('editingTimelineId');
      
      // Skip fetch if this is the timeline currently being edited
      if (bulkEditActive && editingTimelineId === id) {
        console.log(`[DEBUG] Aborting timeline fetch because bulk edit mode is active in sessionStorage`);
        // Return the existing data from the query client to prevent refetching
        const existing = queryClient.getQueryData([`/api/timelines/${id}`]) as Timeline;
        if (existing) {
          return existing;
        }
      }
      
      try {
        const response = await fetchWithAuth(`/api/timelines/${id}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch timeline data: ${response.status} ${errorText}`);
          throw new Error(`Failed to fetch timeline: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Timeline data retrieved:', data);
        return data;
      } catch (error) {
        console.error('Error fetching timeline:', error);
        throw error;
      }
    }
  });

  useEffect(() => {
    if (timelineError) {
      toast({
        title: "Error loading timeline",
        description: timelineError instanceof Error ? timelineError.message : "Failed to load timeline data",
        variant: "destructive",
      });
    }
  }, [timelineError, toast]);

  useEffect(() => {
    if (!existingTimeline) return;
    
    // Check if we're in bulk edit mode using sessionStorage
    const bulkEditActive = sessionStorage.getItem('bulkEditActive') === 'true';
    const editingTimelineId = sessionStorage.getItem('editingTimelineId');
    
    // Skip timeline processing if in bulk edit mode for this timeline
    if (bulkEditActive && editingTimelineId === id) {
      console.log('[DEBUG] Skipping timeline data processing because bulk edit mode is active in sessionStorage');
      return;
    }
    
    if (existingTimeline && id) {
      console.log('Loading timeline:', existingTimeline);
      dispatch(resetTimeline());
      dispatch(updateWeddingInfo({
        names: existingTimeline.title,
        date: existingTimeline.date,
        type: existingTimeline.type || '',
        location: existingTimeline.location || '',
        customFieldValues: existingTimeline.customFieldValues || {},
      }));
      setShowCategories(existingTimeline.categoriesEnabled);
      setShowVendors(existingTimeline.vendorsEnabled);
      
      const mappedCategories = existingTimeline.categories
        .sort(sortByOrder)
        .map((cat: {
          id: number;
          name: string;
          description?: string;
          order: number
        }) => ({
          id: cat.id.toString(),
          name: cat.name,
          description: cat.description || '',
          order: cat.order,
        }));
      setCategories(mappedCategories);
      
      existingTimeline.events
        .sort(sortByOrder)
        .forEach(event => {
          const categoryName = event.categoryId
            ? existingTimeline.categories.find(c => c.id === event.categoryId)?.name
            : undefined;
            
          console.log(`Loading event: ${event.title}, categoryId: ${event.categoryId}, categoryName: ${categoryName}`);
          
          dispatch(addItem({
            id: event.id.toString(),
            startTime: event.startTime,
            endTime: event.endTime,
            duration: event.duration,
            title: event.title,
            description: event.description || '',
            location: event.location || '',
            type: event.type,
            category: categoryName,
            categoryId: event.categoryId ? event.categoryId.toString() : undefined, // Explicitly store categoryId
            vendors: event.vendors?.map(v => ({
              id: v.id.toString(),
              name: v.name,
              type: v.type,
              contactInfo: v.contactInfo
            }))
          }));
        });
    }
  }, [existingTimeline, id, dispatch, queryClient]);

  // Handle bulk edit mode changes
  const { bulkEditMode } = useSelector((state: RootState) => state.timeline);
  
  useEffect(() => {
    if (bulkEditMode && id) {
      // When entering bulk edit mode, disable refetching for 5 minutes
      disableRefetchFor(parseInt(id, 10), 5);
    }
  }, [bulkEditMode, id]);

  const saveMutation = useMutation({
    mutationFn: async (data?: {
      title: string;
      date: string;
      type?: string;
      location?: string;
      categoriesEnabled: boolean;
      vendorsEnabled: boolean;
      customFieldValues?: Record<string, string | number | boolean | null>;
      categories: Array<{
        name: string;
        description?: string;
        order: number;
        id?: number;
      }>;
      events: Array<{
        startTime: string;
        endTime: string;
        duration: string;
        title: string;
        description?: string;
        location?: string;
        type: string;
        category?: string;
        order: number;
      }>;
    }) => {
      const endpoint = id ? `/api/timelines/${id}` : '/api/timelines';
      const method = id ? 'PUT' : 'POST';

      // Check if we should use the preserved categories state
      const bulkEditActive = sessionStorage.getItem('bulkEditActive') === 'true';
      const preservedCategoriesState = sessionStorage.getItem('preservedCategoriesState');
      
      // If in bulk edit mode, use the preserved categories state
      const effectiveCategoriesEnabled = bulkEditActive && preservedCategoriesState !== null
        ? preservedCategoriesState === 'true'
        : showCategories;

      console.log(`[DEBUG] Saving timeline with categoriesEnabled=${effectiveCategoriesEnabled} ` +
        `(current=${showCategories}, preserved=${preservedCategoriesState}, bulkEdit=${bulkEditActive})`);

      const payload = data || {
        title: weddingInfo.names,
        date: weddingInfo.date,
        type: weddingInfo.type,
        location: weddingInfo.location,
        categoriesEnabled: effectiveCategoriesEnabled,
        vendorsEnabled: showVendors,
        customFieldValues: weddingInfo.customFieldValues || {},
        categories: showCategories ? categories.map((category, index) => ({
          name: category.name,
          description: category.description,
          order: category.order || index,
          ...(category.id && !isNaN(parseInt(category.id)) ? { id: parseInt(category.id) } : {}),
        })) : [],
        events: items.map((item, index) => {
          // Find the category ID if the item has a category, regardless of current showCategories setting
          let categoryId = undefined;
          
          // First, check if the item has a direct categoryId reference (this takes precedence)
          if (item.categoryId && !isNaN(parseInt(item.categoryId))) {
            categoryId = parseInt(item.categoryId);
            console.log(`Using direct categoryId ${categoryId} for item: ${item.title}`);
          } 
          // Otherwise, try to find by category name if the item has a category
          else if (item.category) {
            const matchingCategory = categories.find(cat => cat.name === item.category);
            if (matchingCategory) {
              categoryId = matchingCategory.id && !isNaN(parseInt(matchingCategory.id)) 
                ? parseInt(matchingCategory.id) 
                : undefined;
              console.log(`Resolved categoryId ${categoryId} from name: ${item.category} for item: ${item.title}`);
            }
          }
          
          console.log(`Saving item: ${item.title} with category: ${item.category}, categoryId: ${categoryId}`);
          
          return {
            startTime: item.startTime,
            endTime: item.endTime,
            duration: item.duration,
            title: item.title,
            description: item.description || '',
            location: item.location || '',
            type: item.type,
            category: item.category,
            categoryId: categoryId, // Include the category ID explicitly
            order: index,
          };
        }),
      };

      console.log(`Saving timeline ${id ? 'update' : 'creation'}:`, payload);
      
      const response = await fetchWithAuth(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error saving timeline: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to save timeline: ${errorText}`);
      }

      if (id && bulkEditMode) {
        // Extend the refetch disable time during save in bulk edit mode
        disableRefetchFor(parseInt(id, 10), 5);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timeline saved successfully",
      });
      
      // Check if we're in bulk edit mode using sessionStorage
      const bulkEditActive = sessionStorage.getItem('bulkEditActive') === 'true';
      
      if (!bulkEditActive) {
        // Only invalidate queries if not in bulk edit mode
        queryClient.invalidateQueries({ queryKey: ['/api/timelines'] });
        if (id) {
          queryClient.invalidateQueries({ queryKey: [`/api/timelines/${id}`] });
        }
      } else {
        console.log('[DEBUG] Skipping query invalidation because bulk edit mode is active');
      }
      
      if (!showSaveDialog) {
        navigate('/');
      }
    },
    onError: (error) => {
      console.error('Failed to save timeline:', error);
      toast({
        title: "Error",
        description: `Failed to save timeline: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      console.log('Creating template with data:', {
        title: templateName,
        events: items,
        categories: categories,
      });

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: templateName,
          type: weddingInfo.type,
          events: items.map(item => ({
            startTime: item.startTime,
            endTime: item.endTime,
            duration: item.duration,
            title: item.title,
            description: item.description || '',
            location: item.location || '',
            type: item.type,
            category: item.category,
          })),
          categories: categories.map((cat, index) => ({
            name: cat.name,
            description: cat.description || '',
            order: index,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setShowTemplateDialog(false);
      setTemplateName('');
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
    },
    onError: (error) => {
      console.error('Template creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const handleSaveAndNavigate = async () => {
    // Reset bulk edit mode when manually saving
    sessionStorage.removeItem('bulkEditActive');
    sessionStorage.removeItem('editingTimelineId');
    // Keep preservedCategoriesState until it's used for the save operation
    
    // Get the preserved categories state if available
    const preservedCategoriesState = sessionStorage.getItem('preservedCategoriesState');
    const effectiveCategoriesEnabled = preservedCategoriesState !== null
      ? preservedCategoriesState === 'true'
      : showCategories;
      
    try {
      await saveMutation.mutateAsync({
        title: weddingInfo.names,
        date: weddingInfo.date,
        type: weddingInfo.type,
        location: weddingInfo.location,
        categoriesEnabled: effectiveCategoriesEnabled,
        vendorsEnabled: showVendors,
        customFieldValues: weddingInfo.customFieldValues || {},
        categories: showCategories ? categories.map((category, index) => ({
          name: category.name,
          description: category.description,
          order: category.order || index,
          ...(category.id && !isNaN(parseInt(category.id)) ? { id: parseInt(category.id) } : {}),
        })) : [],
        events: items.map((item, index) => {
          // Find the category ID if the item has a category, regardless of current showCategories setting
          let categoryId = undefined;
          
          // First, check if the item has a direct categoryId reference (this takes precedence)
          if (item.categoryId && !isNaN(parseInt(item.categoryId))) {
            categoryId = parseInt(item.categoryId);
            console.log(`Using direct categoryId ${categoryId} for item: ${item.title}`);
          } 
          // Otherwise, try to find by category name if the item has a category
          else if (item.category) {
            const matchingCategory = categories.find(cat => cat.name === item.category);
            if (matchingCategory) {
              categoryId = matchingCategory.id && !isNaN(parseInt(matchingCategory.id)) 
                ? parseInt(matchingCategory.id) 
                : undefined;
              console.log(`Resolved categoryId ${categoryId} from name: ${item.category} for item: ${item.title}`);
            }
          }
          
          console.log(`Saving item: ${item.title} with category: ${item.category}, categoryId: ${categoryId}`);
          
          return {
            startTime: item.startTime,
            endTime: item.endTime,
            duration: item.duration,
            title: item.title,
            description: item.description || '',
            location: item.location || '',
            type: item.type,
            category: item.category,
            categoryId: categoryId, // Include the category ID explicitly
            order: index,
          };
        }),
      });
      setShowSaveDialog(false);
      if (navigationPath) {
        navigate(navigationPath);
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save timeline",
        variant: "destructive",
      });
    }
  };

  const handleDiscardAndNavigate = () => {
    setShowSaveDialog(false);
    if (navigationPath) {
      navigate(navigationPath);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (items.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [items]);

  const getCurrentTimeline = () => {
    if (!items.length) return null;

    return {
      title: weddingInfo.names || "",
      date: weddingInfo.date || "",
      type: weddingInfo.type || "",
      location: weddingInfo.location || "",
      categoriesEnabled: showCategories,
      vendorsEnabled: showVendors,
      categories: categories.map((cat, index) => ({
        id: cat.id || `temp-${index}`,
        name: cat.name || "",
        description: cat.description || "",
        order: cat.order || index,
      })),
      events: items.map((item, index) => ({
        id: item.id || `temp-${index}`,
        startTime: item.startTime || "",
        endTime: item.endTime || "",
        duration: item.duration || "",
        title: item.title || "",
        description: item.description || "",
        location: item.location || "",
        type: item.type || "event",
        category: item.category || "",
        categoryId: item.categoryId,
        order: index,
      })),
    };
  };

  const setItems = (newItems: any[]) => {
    dispatch(setReduxItems(newItems));
  };

  const handleDeleteItem = (id: string) => {
    dispatch(deleteItem(id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-foreground text-lg">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (timelineError) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-lg p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-4">Failed to load timeline</h2>
          <p className="text-muted-foreground mb-6">
            {timelineError instanceof Error ? timelineError.message : "The server encountered an error loading this timeline"}
          </p>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/timelines/${id}`] })}
              className="mx-auto"
            >
              Retry
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/timelines')}
              className="mx-auto"
            >
              Back to Timelines
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[rgb(246,248,250)] dark:bg-black">
      <MainNav />
      <div className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "ml-[70px]" : "ml-[250px]"
      )}>
        <main className="p-4 md:p-8 bg-[rgb(246,248,250)] dark:bg-black">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              onClick={() => handleNavigation("/timelines")}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-purple-600 dark:hover:text-purple-400"
            >
              <ArrowLeft className="w-4 h-4 mr-2 text-purple-500" />
              Back to Timelines
            </Button>

            <div className="flex items-center gap-2">
              {!id ? (
                <Button
                  variant="default"
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                  onClick={() => setShowAIGenerator(true)}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate with AI
                </Button>
              ) : items.length > 0 && (
                <Button
                  variant="default"
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                  onClick={() => setShowAIGenerator(true)}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Edit with AI
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                {items.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => saveMutation.mutate({
                        title: weddingInfo.names,
                        date: weddingInfo.date,
                        type: weddingInfo.type,
                        location: weddingInfo.location,
                        categoriesEnabled: showCategories,
                        vendorsEnabled: showVendors,
                        customFieldValues: weddingInfo.customFieldValues || {},
                        categories: showCategories ? categories.map((category, index) => ({
                          name: category.name,
                          description: category.description,
                          order: category.order || index,
                          ...(category.id && !isNaN(parseInt(category.id)) ? { id: parseInt(category.id) } : {}),
                        })) : [],
                        events: items.map((item, index) => {
                          // Find the category ID if the item has a category, regardless of current showCategories setting
                          let categoryId = undefined;
                          
                          // First, check if the item has a direct categoryId reference (this takes precedence)
                          if (item.categoryId && !isNaN(parseInt(item.categoryId))) {
                            categoryId = parseInt(item.categoryId);
                            console.log(`Using direct categoryId ${categoryId} for item: ${item.title}`);
                          } 
                          // Otherwise, try to find by category name if the item has a category
                          else if (item.category) {
                            const matchingCategory = categories.find(cat => cat.name === item.category);
                            if (matchingCategory) {
                              categoryId = matchingCategory.id && !isNaN(parseInt(matchingCategory.id)) 
                                ? parseInt(matchingCategory.id) 
                                : undefined;
                              console.log(`Resolved categoryId ${categoryId} from name: ${item.category} for item: ${item.title}`);
                            }
                          }
                          
                          console.log(`Saving item: ${item.title} with category: ${item.category}, categoryId: ${categoryId}`);
                          
                          return {
                            startTime: item.startTime,
                            endTime: item.endTime,
                            duration: item.duration,
                            title: item.title,
                            description: item.description || '',
                            location: item.location || '',
                            type: item.type,
                            category: item.category,
                            categoryId: categoryId, // Include the category ID explicitly
                            order: index,
                          };
                        }),
                      })}
                      disabled={saveMutation.isPending || !weddingInfo.names || !weddingInfo.date}
                      className="ml-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 font-medium"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2 text-purple-500" />
                          Save Timeline
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTemplateDialog(true)}
                      className="ml-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 font-medium"
                    >
                      <Save className="w-4 h-4 mr-2 text-purple-500" />
                      Save as Template
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <Card className="bg-white dark:bg-zinc-900 border shadow-sm mb-8">
            <CardContent className="p-6">
              <TimelineEditor
                categories={categories}
                setCategories={setCategories}
                showCategories={showCategories}
                setShowCategories={setShowCategories}
                showEndTimes={showEndTimes}
                setShowEndTimes={setShowEndTimes}
                isTemplate={false}
                items={items}
                setItems={setItems}
                onDeleteItem={handleDeleteItem}
                newItemId={null}
                setNewItemId={() => {}}
                showVendors={showVendors}
                setShowVendors={setShowVendors}
              />

              {id && (
                <>
                  {showVendors && (
                    <div className="mt-8 border-t pt-8">
                      <h2 className="text-2xl font-serif mb-6">
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Participant Information</span>
                      </h2>
                      <ParticipantInformation timelineId={parseInt(id)} />
                    </div>
                  )}
                  
                  <div className="mt-8 border-t pt-8">
                    <h2 className="text-2xl font-serif mb-6">
                      <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Images</span>
                    </h2>
                    <TimelineImages timelineId={parseInt(id)} />
                  </div>
                </>
              )}

              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => saveMutation.mutate({
                    title: weddingInfo.names,
                    date: weddingInfo.date,
                    type: weddingInfo.type,
                    location: weddingInfo.location,
                    categoriesEnabled: showCategories,
                    vendorsEnabled: showVendors,
                    customFieldValues: weddingInfo.customFieldValues || {},
                    categories: showCategories ? categories.map((category, index) => ({
                      name: category.name,
                      description: category.description,
                      order: category.order || index,
                      ...(category.id && !isNaN(parseInt(category.id)) ? { id: parseInt(category.id) } : {}),
                    })) : [],
                    events: items.map((item, index) => {
                      // Find the category ID if the item has a category, regardless of current showCategories setting
                      let categoryId = undefined;
                      
                      // First, check if the item has a direct categoryId reference (this takes precedence)
                      if (item.categoryId && !isNaN(parseInt(item.categoryId))) {
                        categoryId = parseInt(item.categoryId);
                        console.log(`Using direct categoryId ${categoryId} for item: ${item.title}`);
                      } 
                      // Otherwise, try to find by category name if the item has a category
                      else if (item.category) {
                        const matchingCategory = categories.find(cat => cat.name === item.category);
                        if (matchingCategory) {
                          categoryId = matchingCategory.id && !isNaN(parseInt(matchingCategory.id)) 
                            ? parseInt(matchingCategory.id) 
                            : undefined;
                          console.log(`Resolved categoryId ${categoryId} from name: ${item.category} for item: ${item.title}`);
                        }
                      }
                      
                      console.log(`Saving item: ${item.title} with category: ${item.category}, categoryId: ${categoryId}`);
                      
                      return {
                        startTime: item.startTime,
                        endTime: item.endTime,
                        duration: item.duration,
                        title: item.title,
                        description: item.description || '',
                        location: item.location || '',
                        type: item.type,
                        category: item.category,
                        categoryId: categoryId, // Include the category ID explicitly
                        order: index,
                      };
                    }),
                  })}
                  disabled={saveMutation.isPending || !weddingInfo.names || !weddingInfo.date}
                  variant="default"
                  size="lg"
                  className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Timeline"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <AITimelineGenerator
            open={showAIGenerator}
            onClose={() => setShowAIGenerator(false)}
            existingItems={items}
            isEditing={!!id && items.length > 0}
            setCategories={setCategories}
            setShowCategories={setShowCategories}
            existingTimeline={!!id && items.length > 0 ? getCurrentTimeline() : undefined}
          />
        </main>
      </div>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-purple-600">Save as Template</DialogTitle>
            <DialogDescription>
              Enter a name for your template. This template can be used as a starting point for future timelines.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              autoFocus
              className="border-gray-300 dark:border-gray-600 focus-visible:ring-purple-500"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateDialog(false)}
              className="bg-white hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createTemplateMutation.mutate()}
              disabled={!templateName.trim() || createTemplateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {createTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent className="border-purple-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-purple-700">Save Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSaveDialog(false)}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleDiscardAndNavigate}>
              Discard
            </Button>
            <AlertDialogAction className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveAndNavigate}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}