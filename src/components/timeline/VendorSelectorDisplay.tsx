import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: number;
  name: string;
  type?: {
    id: number;
    name: string;
  } | null;
}

interface VendorSelectorDisplayProps {
  timelineId?: number;
  eventId?: number;
  isTimelineVendor: boolean;
  showEditHint?: boolean;
  onVendorRemove?: () => void;
  showVendorTypes?: boolean;
}

export interface VendorSelectorDisplayRef {
  refreshVendors: () => Promise<void>;
}

export const VendorSelectorDisplay = forwardRef<VendorSelectorDisplayRef, VendorSelectorDisplayProps>(
  ({ timelineId, eventId, isTimelineVendor, showEditHint = true, onVendorRemove, showVendorTypes = true }, ref) => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Expose the refreshVendors function through the ref
    useImperativeHandle(ref, () => ({
      refreshVendors: async () => {
        await fetchVendors();
      }
    }));

    useEffect(() => {
      fetchVendors();
    }, [timelineId, eventId, isTimelineVendor]);

    const fetchVendors = async () => {
      if ((!timelineId && isTimelineVendor) || (!eventId && !isTimelineVendor)) return;

      try {
        setIsLoading(true);
        let url = isTimelineVendor
          ? `/api/timelines/${timelineId}/vendors`
          : `/api/timeline-events/${eventId}/vendors`;

        const response = await fetch(url);
        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to fetch participants`);
        }

        if (response.status === 404) {
          setVendors([]);
          return;
        }

        const data = await response.json();
        
        const processedVendors = Array.isArray(data) 
          ? data.map(item => {
              if (item.vendor) {
                return {
                  id: item.vendor.id,
                  name: item.vendor.name || 'Unnamed Participant',
                  type: item.vendor.type
                };
              }
              return {
                ...item,
                name: item.name || 'Unnamed Participant'
              };
            })
          : [];
        
        setVendors(processedVendors);
      } catch (error) {
        console.error("Error fetching participants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleRemoveVendor = async (vendorId: number) => {
      if ((!timelineId && isTimelineVendor) || (!eventId && !isTimelineVendor)) return;

      try {
        let url = isTimelineVendor
          ? `/api/timelines/${timelineId}/vendors/${vendorId}`
          : `/api/timeline-events/${eventId}/vendors/${vendorId}`;

        const response = await fetch(url, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove participant");
        }

        setVendors((prev) => prev.filter((v) => v.id !== vendorId));
        
        if (onVendorRemove) {
          onVendorRemove();
        }

        toast({
          title: "Participant removed",
          description: "Participant has been removed successfully",
        });
      } catch (error) {
        console.error("Error removing participant:", error);
        toast({
          title: "Error",
          description: "Failed to remove participant. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (isLoading) {
      return <div className="text-sm text-gray-500">Loading participants...</div>;
    }

    if (vendors.length === 0) {
      return (
        <div className="text-sm text-gray-500 italic">
          {isTimelineVendor
            ? "No participants assigned to this timeline yet."
            : "No participants assigned to this event yet."}
          {showEditHint && (
            <span className="ml-1">Use the form below to add participants.</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {vendors.map((vendor) => (
          <Badge
            key={vendor.id}
            variant="default"
            className="bg-purple-600 text-white py-0.5 px-2 text-xs flex items-center gap-1"
          >
            <span className="font-medium">{vendor.name}</span>
            {vendor.type && showVendorTypes && (
              <span className="text-gray-200 text-xs">({vendor.type.name})</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveVendor(vendor.id);
              }}
              className="ml-1 hover:text-red-200 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    );
  }
); 