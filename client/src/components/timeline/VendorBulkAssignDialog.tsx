import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Plus, X, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Vendor {
  id: number;
  name: string;
  type?: {
    id: number;
    name: string;
  } | null;
}

interface TimelineItem {
  id: string;
  title: string;
  startTime: string;
  category?: string;
}

interface VendorBulkAssignDialogProps {
  timelineId?: number | null;
  items: TimelineItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorBulkAssignDialog({
  timelineId,
  items,
  open,
  onOpenChange,
}: VendorBulkAssignDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [selectedItems, setSelectedItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && timelineId) {
      fetchVendors();
    }
  }, [open, timelineId]);

  useEffect(() => {
    // Reset selections when dialog is closed
    if (!open) {
      setSelectedVendors([]);
      setSelectedItems([]);
    }
  }, [open]);

  const fetchVendors = async () => {
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
      
      setVendors(processedVendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: "Failed to fetch vendors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVendorSelection = (vendor: Vendor) => {
    setSelectedVendors(prev => {
      const isSelected = prev.some(v => v.id === vendor.id);
      if (isSelected) {
        return prev.filter(v => v.id !== vendor.id);
      } else {
        return [...prev, vendor];
      }
    });
  };

  const toggleItemSelection = (item: TimelineItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSelectAllVendors = () => {
    if (selectedVendors.length === vendors.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors([...vendors]);
    }
  };

  const handleSelectAllItems = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...items]);
    }
  };

  const handleAssignVendors = async () => {
    if (selectedVendors.length === 0 || selectedItems.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one vendor and one timeline item.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAssigning(true);
      
      let successCount = 0;
      let errorCount = 0;
      
      // For each selected item, assign all selected vendors
      for (const item of selectedItems) {
        for (const vendor of selectedVendors) {
          try {
            const response = await fetch(`/api/timeline-events/${item.id}/vendors`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vendorId: vendor.id }),
            });
            
            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error(`Error assigning vendor ${vendor.id} to item ${item.id}:`, error);
            errorCount++;
          }
        }
      }
      
      // Refresh the page to show updated vendors
      if (successCount > 0) {
        // Force a refresh of the timeline items
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
          const vendorSection = item.querySelector('.vendor-section');
          if (vendorSection) {
            // Force a re-render by adding and removing a class
            vendorSection.classList.add('refreshing');
            setTimeout(() => {
              vendorSection.classList.remove('refreshing');
            }, 10);
          }
        });
        
        toast({
          title: "Participants Assigned",
          description: `Successfully assigned ${successCount} participant${successCount !== 1 ? 's' : ''} to ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}.${errorCount > 0 ? ` ${errorCount} assignment${errorCount !== 1 ? 's' : ''} failed.` : ''}`,
        });
        
        onOpenChange(false);
      } else if (errorCount > 0) {
        toast({
          title: "Assignment Failed",
          description: "Failed to assign participants. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in bulk vendor assignment:", error);
      toast({
        title: "Error",
        description: "An error occurred during assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Assign Participants</DialogTitle>
          <DialogDescription>
            Assign multiple participants to multiple timeline items at once.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
          </div>
        ) : (
          <div className="space-y-4 my-4">
            {/* Vendor Selection Section */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">1. Select Participants</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllVendors}
                  className="h-8"
                >
                  Select All
                </Button>
              </div>
              
              {/* Selected Vendors Display */}
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Selected Participants ({selectedVendors.length}):
                </div>
                {selectedVendors.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No participants selected</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedVendors.map(vendor => (
                      <Badge 
                        key={vendor.id} 
                        variant="default"
                        className="bg-purple-600 text-white py-0.5 px-2 text-xs flex items-center gap-1"
                      >
                        <span className="font-medium">{vendor.name}</span>
                        {vendor.type && (
                          <span className="text-gray-200 text-xs">({vendor.type.name})</span>
                        )}
                        <button
                          onClick={() => toggleVendorSelection(vendor)}
                          className="ml-1 hover:text-red-200 focus:outline-none"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Available Vendors */}
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Click to select participants:
                </div>
                <div className="flex flex-wrap gap-2">
                  {vendors.map(vendor => {
                    const isSelected = selectedVendors.some(v => v.id === vendor.id);
                    return (
                      <Badge 
                        key={vendor.id} 
                        variant={isSelected ? "default" : "outline"}
                        className={`text-xs py-0.5 px-2 cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600'
                        }`}
                        onClick={() => toggleVendorSelection(vendor)}
                      >
                        <span className="font-medium">{vendor.name}</span>
                        {vendor.type && (
                          <span className={`ml-1 text-xs ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                            ({vendor.type.name})
                          </span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeline Items Selection Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">2. Select Timeline Items</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllItems}
                  className="h-8"
                >
                  Select All
                </Button>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Selected Items ({selectedItems.length} of {items.length}):
                </div>
                <div className="space-y-2">
                  {items.map(item => {
                    const isSelected = selectedItems.some(i => i.id === item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center p-2 rounded-md cursor-pointer ${
                          isSelected 
                            ? 'bg-purple-50 dark:bg-purple-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`}
                        onClick={() => toggleItemSelection(item)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          className="mr-2"
                          onCheckedChange={() => toggleItemSelection(item)}
                        />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.startTime}</div>
                        </div>
                        {item.category && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignVendors} 
            disabled={isAssigning || selectedVendors.length === 0 || selectedItems.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isAssigning 
              ? "Assigning..." 
              : `Assign ${selectedVendors.length} Participant${selectedVendors.length !== 1 ? 's' : ''} to ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 