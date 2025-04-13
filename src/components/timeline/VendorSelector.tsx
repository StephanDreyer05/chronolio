import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "../../components/ui/button";
import {
  X,
  Check,
  PlusCircle,
  Users,
  Pencil,
  AlignJustify,
  Search,
  Plus,
  ChevronsUpDown,
  PlusCircleIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { fetchWithAuth } from "../../lib/api";

interface Vendor {
  id: number;
  name: string;
  type?: {
    id: number;
    name: string;
  } | null;
}

interface VendorType {
  id: number;
  name: string;
}

interface VendorSelectorProps {
  timelineId?: number;
  eventId?: number;
  isTimelineVendor?: boolean;
  onVendorsChange?: () => void;
  buttonLabel?: string;
}

export interface VendorSelectorRef {
  refreshVendors: () => Promise<void>;
}

export const VendorSelector = forwardRef<VendorSelectorRef, VendorSelectorProps>(
  ({ timelineId, eventId, isTimelineVendor = false, onVendorsChange, buttonLabel }, ref) => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [assignedVendors, setAssignedVendors] = useState<Vendor[]>([]);
    const [pendingAssignments, setPendingAssignments] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [showNewVendorDialog, setShowNewVendorDialog] = useState(false);
    const [vendorTypes, setVendorTypes] = useState<VendorType[]>([]);
    const { toast } = useToast();

    // New vendor form state
    const [newVendor, setNewVendor] = useState({
      name: "",
      typeId: "",
      contactName: "",
      email: "",
      phone: "",
      alternativePhone: "",
      address: "",
    });

    // Update the useEffect to avoid unnecessary fetches
    useEffect(() => {
      if (open) {
        fetchVendors();
        fetchAssignedVendors();
        fetchVendorTypes();
      }
    }, [open]);

    useEffect(() => {
      if (timelineId || eventId) {
        fetchAssignedVendors();
      }
    }, [timelineId, eventId]);

    const fetchVendorTypes = async () => {
      try {
        const response = await fetchWithAuth("/api/vendor-types");
        if (!response.ok) {
          throw new Error("Failed to fetch vendor types");
        }
        const data = await response.json();
        setVendorTypes(data);
      } catch (error) {
        console.error("Error fetching vendor types:", error);
        toast({
          title: "Error",
          description: "Failed to fetch vendor types",
          variant: "destructive",
        });
      }
    };

    const fetchVendors = async () => {
      try {
        setIsLoading(true);
        let endpoint = "/api/vendors";
        if (!isTimelineVendor && timelineId && timelineId > 0) {
          endpoint = `/api/timelines/${timelineId}/vendors`;
        }

        const response = await fetchWithAuth(endpoint);
        if (!response.ok) {
          throw new Error("Failed to fetch vendors");
        }
        const data = await response.json();

        const processedVendors = Array.isArray(data)
          ? data.map((item) => ({
              id: item.vendor?.id || item.id,
              name: item.vendor?.name || item.name || "Unnamed Vendor",
              type: item.vendor?.type || item.type,
            }))
          : [];

        setVendors(processedVendors);
      } catch (error) {
        // Only show error if it's not a 404 for a new timeline
        if (!(error instanceof Error && error.message.includes("404"))) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to fetch vendors",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAssignedVendors = async () => {
      if (!timelineId && !eventId) return;

      try {
        setIsLoading(true);
        const endpoint = isTimelineVendor
          ? `/api/timelines/${timelineId}/vendors`
          : `/api/timeline-events/${eventId}/vendors`;

        const response = await fetchWithAuth(endpoint);
        if (!response.ok) {
          if (response.status !== 404) { // Ignore 404s for new items
            throw new Error(`Failed to fetch ${isTimelineVendor ? "timeline" : "event"} vendors`);
          }
          return;
        }

        const data = await response.json();
        const processedVendors = Array.isArray(data)
          ? data.map((item) => ({
              id: item.vendor?.id || item.id,
              name: item.vendor?.name || item.name || "Unnamed Vendor",
              type: item.vendor?.type || item.type,
            }))
          : [];

        setAssignedVendors(processedVendors);
        setPendingAssignments(new Set(processedVendors.map((v) => v.id)));
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("404"))) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : `Failed to fetch vendors`,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    const toggleVendorAssignment = (vendorId: number) => {
      setPendingAssignments((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(vendorId)) {
          newSet.delete(vendorId);
        } else {
          newSet.add(vendorId);
        }
        return newSet;
      });
    };

    const saveAssignments = async () => {
      try {
        setIsSaving(true);

        // Get current assignments to compare with pending assignments
        const endpoint = isTimelineVendor
          ? `/api/timelines/${timelineId}/vendors`
          : `/api/timeline-events/${eventId}/vendors`;

        const response = await fetchWithAuth(endpoint);
        const currentAssignedVendors = response.ok ? await response.json() : [];
        
        // Get the IDs of currently assigned vendors
        const currentAssignments = new Set(
          currentAssignedVendors.map((v: any) => v.vendor?.id || v.id)
        );

        // Vendors to add (in pending but not in current)
        const vendorsToAdd = [...pendingAssignments].filter(
          (id) => !currentAssignments.has(id)
        );

        // Vendors to remove (in current but not in pending)
        const vendorsToRemove = [...Array.from(currentAssignments)].filter(
          (id) => !pendingAssignments.has(Number(id))
        );

        // Add new vendors
        for (const vendorId of vendorsToAdd) {
          const addEndpoint = isTimelineVendor
            ? `/api/timelines/${timelineId}/vendors/${vendorId}`
            : `/api/timeline-events/${eventId}/vendors/${vendorId}`;

          const addResponse = await fetchWithAuth(addEndpoint, {
            method: "POST",
          });

          if (!addResponse.ok) {
            throw new Error(`Failed to add vendor ${vendorId}`);
          }
        }

        // Remove vendors
        for (const vendorId of vendorsToRemove) {
          const removeEndpoint = isTimelineVendor
            ? `/api/timelines/${timelineId}/vendors/${vendorId}`
            : `/api/timeline-events/${eventId}/vendors/${vendorId}`;

          const removeResponse = await fetchWithAuth(removeEndpoint, {
            method: "DELETE",
          });

          if (!removeResponse.ok) {
            throw new Error(`Failed to remove vendor ${vendorId}`);
          }
        }

        // Refresh the assigned vendors list
        await fetchAssignedVendors();
        
        if (onVendorsChange) {
          onVendorsChange();
        }
        setOpen(false);
        toast({
          title: "Success",
          description: `Vendors ${isTimelineVendor ? "timeline" : "event"} assignments saved`,
        });
      } catch (error) {
        console.error("Error saving vendor assignments:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to save vendor assignments",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    };

    const handleCreateVendor = async () => {
      try {
        setIsSaving(true);
        const createdVendor = await fetchWithAuth("/api/vendors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newVendor),
        }).then(res => {
          if (!res.ok) {
            throw new Error("Failed to create vendor");
          }
          return res.json();
        });

        // Add the new vendor to the list and mark it as assigned
        setVendors((prev) => [...prev, createdVendor]);
        setPendingAssignments((prev) => {
          const newSet = new Set(prev);
          newSet.add(createdVendor.id);
          return newSet;
        });

        // If this is a timeline item, also add the vendor to the timeline
        if (!isTimelineVendor && timelineId) {
          await fetchWithAuth(`/api/timelines/${timelineId}/vendors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendorId: createdVendor.id }),
          });
        }

        setShowNewVendorDialog(false);
        setNewVendor({
          name: "",
          typeId: "",
          contactName: "",
          email: "",
          phone: "",
          alternativePhone: "",
          address: "",
        });

        toast({
          title: "Success",
          description: "Vendor created and assigned successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create vendor",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({
      refreshVendors: fetchAssignedVendors,
    }));

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-8 ${isTimelineVendor ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300' : ''}`}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {buttonLabel || (isTimelineVendor 
              ? "Manage Timeline Participants" 
              : (assignedVendors.length > 0 
                  ? `Manage Assigned Participants (${assignedVendors.length})` 
                  : "Assign Participants"
                )
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Participants</DialogTitle>
            <DialogDescription>
              {isTimelineVendor
                ? "Assign participants to this timeline. These participants will be available for assignment to individual events."
                : "Select participants to assign to this timeline event."}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
            </div>
          ) : (
            <div className="space-y-4 my-4">
              <h4 className="text-sm font-medium">Assigned Participants</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(pendingAssignments).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No participants assigned yet</p>
                ) : (
                  vendors
                    .filter((vendor) => pendingAssignments.has(vendor.id))
                    .map((vendor) => (
                      <Badge key={vendor.id} variant="secondary" className="flex items-center gap-1 py-1.5 px-3">
                        <span className="font-medium">{vendor.name}</span>
                        {vendor.type && (
                          <span className="text-xs text-muted-foreground">({vendor.type.name})</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                          onClick={() => toggleVendorAssignment(vendor.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Available Participants</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewVendorDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New Participant
                  </Button>
                </div>
                {!isTimelineVendor && timelineId && timelineId > 0 && (
                  <div className="text-xs text-muted-foreground mb-2">
                    Note: Only participants assigned to this timeline are available for selection.
                  </div>
                )}
                <Command className="rounded-lg border shadow-md">
                  <CommandInput placeholder="Search participants..." />
                  <CommandList>
                    <CommandGroup>
                      {vendors.map((vendor) => (
                        <CommandItem
                          key={vendor.id}
                          onSelect={() => toggleVendorAssignment(vendor.id)}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium">{vendor.name}</span>
                            {vendor.type && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({vendor.type.name})
                              </span>
                            )}
                          </div>
                          {pendingAssignments.has(vendor.id) && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingAssignments(new Set(assignedVendors.map((v) => v.id)));
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveAssignments} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>

        {/* New Vendor Dialog */}
        <Dialog open={showNewVendorDialog} onOpenChange={setShowNewVendorDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Participant</DialogTitle>
              <DialogDescription>
                Create a new participant and add them to the current {isTimelineVendor ? "timeline" : "event"}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Participant Name</Label>
                <Input
                  id="name"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter participant name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Participant Type</Label>
                <Select
                  value={newVendor.typeId}
                  onValueChange={(value) => setNewVendor((prev) => ({ ...prev, typeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select participant type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={newVendor.contactName}
                  onChange={(e) => setNewVendor((prev) => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Enter contact name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternativePhone">Alternative Phone Number</Label>
                <Input
                  id="alternativePhone"
                  value={newVendor.alternativePhone}
                  onChange={(e) => setNewVendor((prev) => ({ ...prev, alternativePhone: e.target.value }))}
                  placeholder="Enter alternative phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newVendor.address}
                  onChange={(e) => setNewVendor((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewVendorDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVendor} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Participant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Dialog>
    );
  },
);