import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { TimelineView } from "@/components/timeline/TimelineView";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Clock, AlertCircle, CalendarIcon, MapPin } from "lucide-react";

interface PublicTimelineData {
  timeline: any;
  categories: any[];
  events: any[];
  shareToken: string;
  showVendors: boolean;
}

export default function PublicTimelinePage() {
  const { token } = useParams();
  const [processedItems, setProcessedItems] = useState<any[]>([]);
  const [formattedDate, setFormattedDate] = useState("");
  const [showVendors, setShowVendors] = useState<boolean>(false);

  console.log("Rendering PublicTimelinePage with token:", token);

  // Fetch the public timeline data
  const { data, isLoading, error } = useQuery<PublicTimelineData>({
    queryKey: ["publicTimeline", token],
    queryFn: async () => {
      console.log(`Fetching public timeline data for token: ${token}`);
      const response = await fetch(`/api/public/timeline/${token}`);
      if (!response.ok) {
        throw new Error("Failed to fetch timeline");
      }
      const data = await response.json();
      console.log("Received public timeline data:", data);
      console.log("showVendors setting from server:", data.showVendors);
      return data;
    },
    enabled: !!token,
  });

  // Process the timeline data when it arrives
  useEffect(() => {
    if (data) {
      try {
        if (data.timeline && data.timeline.date) {
          setFormattedDate(format(new Date(data.timeline.date), "PPP"));
        } else {
          setFormattedDate("");
        }

        // Initialize processedItems as an empty array by default
        let eventsToProcess: any[] = [];

        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
          console.log('Processing timeline events:', data.events.length);
          // Process events for timeline display
          eventsToProcess = data.events.map((event) => ({
            id: event.id.toString(),
            startTime: event.startTime || '',
            endTime: event.endTime || '',
            duration: event.duration || '0',
            title: event.title || '',
            description: event.description || '',
            location: event.location || '',
            type: event.type || 'event',
            category: event.categoryId ? 
              data.categories.find(c => c.id === event.categoryId)?.name : undefined
          }));
        } else {
          console.log('No events to process or events not in expected format');
        }
        
        setProcessedItems(eventsToProcess);

        // Extract the showVendors setting from the response
        if (data.showVendors !== undefined) {
          console.log('Setting showVendors from server response:', data.showVendors);
          setShowVendors(data.showVendors);
        }
      } catch (err) {
        console.error("Error processing timeline data:", err);
        // Set empty array on error to prevent undefined
        setProcessedItems([]);
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Clock className="h-6 w-6 animate-spin text-purple-600" />
            <h2 className="text-xl font-medium">Loading timeline...</h2>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (error || !data) {
    return (
      <ThemeProvider>
        <div className="container mx-auto max-w-3xl p-4">
          <div className="my-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-lg font-medium">Error Loading Timeline</h2>
            </div>
            <p className="mt-2">
              This timeline is not available or may have been deleted.
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="container mx-auto max-w-6xl p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{data.timeline.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
            {formattedDate && (
              <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1 text-purple-600" />
                <span>{formattedDate}</span>
              </div>
            )}
            {data.timeline.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-purple-600" />
                <span>{data.timeline.location}</span>
              </div>
            )}
          </div>
        </div>

        {data.timeline && data.categories && (() => {
          console.log('Rendering TimelineView with:', {
            timelineId: data.timeline.id,
            categories: data.categories.length,
            items: processedItems.length,
            isPublicView: true,
            showVendors,
            showVendorsOnItems: showVendors
          });
          
          return (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <TimelineView
                items={processedItems}
                categories={data.categories}
                timelineId={data.timeline.id}
                showIcons={true}
                showCategoriesOnItems={true}
                showVendorsOnItems={showVendors}
                showVendors={true}
                isPublicView={true}
                onUpdateItem={() => {}}
                onMoveItem={() => {}}
                onAddItem={() => {}}
              />
            </div>
          );
        })()}
      </div>
    </ThemeProvider>
  );
} 