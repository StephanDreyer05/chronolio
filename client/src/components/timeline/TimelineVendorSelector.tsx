import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: number;
  name: string;
  type?: {
    id: number;
    name: string;
  } | null;
}

interface TimelineVendorSelectorProps {
  timelineId?: number;
  eventId?: number;
  onVendorChange?: () => void;
  showVendorTypes?: boolean;
}

export interface TimelineVendorSelectorRef {
  refreshVendors: () => Promise<void>;
}

export const TimelineVendorSelector = forwardRef<TimelineVendorSelectorRef, TimelineVendorSelectorProps>(
  ({ timelineId, eventId, onVendorChange, showVendorTypes = true }, ref) => {
    const [timelineVendors, setTimelineVendors] = useState<Vendor[]>([]);
    const [eventVendors, setEventVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Expose the refreshVendors function through the ref
    useImperativeHandle(ref, () => ({
      refreshVendors: async () => {
        await Promise.all([fetchTimelineVendors(), fetchEventVendors()]);
      }
    }));

    useEffect(() => {
      if (timelineId) {
        fetchTimelineVendors();
        if (eventId) {
          fetchEventVendors();
        }
      }
    }, [timelineId, eventId]);

    const fetchTimelineVendors = async () => {
      if (!timelineId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/timelines/${timelineId}/vendors`);
        if (!response.ok) {
          throw new Error("Failed to fetch timeline vendors");
        }
        const data = await response.json();
        
        const processedVendors = Array.isArray(data) 
          ? data.map(item => {
              if (item.vendor) {
                return {
                  id: item.vendor.id,
                  name: item.vendor.name || 'Unnamed Vendor',
                  type: item.vendor.type
                };
              }
              return {
                ...item,
                name: item.name || 'Unnamed Vendor'
              };
            })
          : [];
        
        setTimelineVendors(processedVendors);
      } catch (error) {
        console.error("Error fetching timeline vendors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchEventVendors = async () => {
      if (!eventId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/timeline-events/${eventId}/vendors`);
        if (!response.ok && response.status !== 404) {
          throw new Error("Failed to fetch event vendors");
        }
        
        if (response.status === 404) {
          setEventVendors([]);
          return;
        }
        
        const data = await response.json();
        
        const processedVendors = Array.isArray(data) 
          ? data.map(item => {
              if (item.vendor) {
                return {
                  id: item.vendor.id,
                  name: item.vendor.name || 'Unnamed Vendor',
                  type: item.vendor.type
                };
              }
              return {
                ...item,
                name: item.name || 'Unnamed Vendor'
              };
            })
          : [];
        
        setEventVendors(processedVendors);
      } catch (error) {
        console.error("Error fetching event participants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const toggleVendorAssignment = async (vendor: Vendor, e: React.MouseEvent) => {
      // Stop event propagation to prevent parent click handlers
      e.stopPropagation();
      
      if (!eventId) return;
      
      try {
        setIsSaving(true);
        const isAssigned = eventVendors.some(v => v.id === vendor.id);
        
        if (isAssigned) {
          // Remove vendor from event
          const response = await fetch(`/api/timeline-events/${eventId}/vendors/${vendor.id}`, {
            method: "DELETE"
          });
          
          if (!response.ok) {
            throw new Error("Failed to remove participant from event");
          }
          
          setEventVendors(prev => prev.filter(v => v.id !== vendor.id));
          
          toast({
            title: "Vendor removed",
            description: `${vendor.name} has been removed from this event`,
          });
        } else {
          // Add vendor to event
          const response = await fetch(`/api/timeline-events/${eventId}/vendors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendorId: vendor.id })
          });
          
          if (!response.ok) {
            throw new Error("Failed to add participant to event");
          }
          
          // Add the vendor to the event vendors list
          setEventVendors(prev => [...prev, vendor]);
          
          toast({
            title: "Vendor assigned",
            description: `${vendor.name} has been assigned to this event`,
          });
        }

        // Call the onVendorChange callback if provided
        if (onVendorChange) {
          onVendorChange();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update participant assignment",
          variant: "destructive"
        });
      } finally {
        setIsSaving(false);
      }
    };

    if (isLoading) {
      return <div className="text-sm text-gray-500">Loading participants...</div>;
    }

    if (timelineVendors.length === 0) {
      return (
        <div className="text-sm text-gray-500 italic">
          No participants assigned to this timeline yet.
        </div>
      );
    }

    return (
      <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-md border border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap gap-2">
          {timelineVendors.map((vendor) => {
            const isAssigned = eventVendors.some(v => v.id === vendor.id);
            return (
              <Badge 
                key={vendor.id} 
                variant={isAssigned ? "default" : "outline"}
                className={`text-xs py-0.5 px-2 cursor-pointer transition-colors ${
                  isAssigned 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-zinc-700 dark:text-gray-500 dark:hover:bg-zinc-600'
                }`}
                onClick={(e) => toggleVendorAssignment(vendor, e)}
              >
                <span className="font-medium">{vendor.name}</span>
                {vendor.type && showVendorTypes && (
                  <span className={`ml-1 text-xs ${isAssigned ? 'text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    ({vendor.type.name})
                  </span>
                )}
              </Badge>
            );
          })}
        </div>
        {isSaving && (
          <div className="text-xs text-gray-500 mt-2 flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700 mr-1"></div>
            Updating...
          </div>
        )}
      </div>
    );
  }
); 