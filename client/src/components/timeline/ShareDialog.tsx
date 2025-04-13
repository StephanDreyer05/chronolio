import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Edit2, Trash2, ArrowUpDown, Calendar as CalendarIcon, List, Search, Table, ChevronUp, ChevronDown, Share2, Check, Loader2, Save, Ban, ExternalLink, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays, addMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { CalendarView } from "@/components/timeline/CalendarView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MainNav } from "@/components/MainNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSelector } from 'react-redux';
import { RootState } from '@/store/settingsSlice';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { createPublicShare, getPublicShareStatus, revokePublicShare, shareTimelineViaEmail } from '@/lib/api';
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";

// Add CSS to prevent propagation globally for calendar
const calendarStyles = `
  .calendar-wrapper * {
    pointer-events: auto !important;
  }
  .calendar-wrapper button {
    pointer-events: auto !important;
  }
  .calendar-wrapper [role="grid"] {
    pointer-events: auto !important;
  }
  .calendar-wrapper table {
    pointer-events: auto !important;
  }
`;

const formatUpdatedAt = (dateString?: string) => {
  if (!dateString) return 'Not available';
  // Simple date formatting from timestamp
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'updated-asc' | 'updated-desc' | 'type-asc' | 'type-desc' | 'location-asc' | 'location-desc';
type ViewType = 'list' | 'calendar' | 'table';

type TimelineGroup = {
  title: string;
  timelines: Array<{
    id: number;
    title: string;
    date: string;
    type?: string;
    location?: string;
    updated_at: string;
    last_modified: string;
  }>;
};

// Table View Component
interface TimelineTableProps {
  timelines: Array<{
    id: number;
    title: string;
    date: string;
    type?: string;
    location?: string;
    updated_at: string;
    last_modified: string;
  }>;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  getEventTypeColor: (type?: string) => string;
  sortBy: SortOption;
  setSortBy: (option: SortOption) => void;
  openShareDialog: (id: number) => Promise<void>;
}

const TimelineTable: React.FC<TimelineTableProps> = ({ 
  timelines, 
  onDelete, 
  onDuplicate, 
  getEventTypeColor,
  sortBy,
  setSortBy,
  openShareDialog
}) => {
  // Helper function to handle sorting clicks on table headers
  const handleSortClick = (field: 'title' | 'date' | 'type' | 'location' | 'updated') => {
    if (sortBy === `${field}-asc`) {
      setSortBy(`${field}-desc` as SortOption);
    } else {
      setSortBy(`${field}-asc` as SortOption);
    }
  };

  // Helper function to get the sort indicator for a specific column
  const getSortIndicator = (field: string) => {
    if (sortBy.startsWith(field)) {
      return sortBy.endsWith('asc') ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
    }
    return null;
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-800 border-b">
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('title')}
              >
                <div className="flex items-center">
                  Title {getSortIndicator('title')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('date')}
              >
                <div className="flex items-center">
                  Date {getSortIndicator('date')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('type')}
              >
                <div className="flex items-center">
                  Type {getSortIndicator('type')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('location')}
              >
                <div className="flex items-center">
                  Location {getSortIndicator('location')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('updated')}
              >
                <div className="flex items-center">
                  Last Modified {getSortIndicator('updated')}
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {timelines.map((timeline) => (
              <tr 
                key={timeline.id}
                className="border-b hover:bg-gray-50 dark:hover:bg-zinc-800/50 group"
              >
                <td className="px-4 py-3">
                  <Link href={`/timeline/${timeline.id}`} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
                    {timeline.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(parseISO(timeline.date), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  {timeline.type ? (
                    <div 
                      className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${getEventTypeColor(timeline.type)}20`,
                        color: getEventTypeColor(timeline.type)
                      }}
                    >
                      {timeline.type}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeline.location || "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatUpdatedAt(timeline.last_modified)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/timeline/${timeline.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit2 className="h-4 w-4 text-purple-500" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onDuplicate(timeline.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4 text-purple-500" />
                      <span className="sr-only">Duplicate</span>
                    </Button>
                    <DropdownMenuItem onClick={() => openShareDialog(timeline.id)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the timeline "{timeline.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(timeline.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {timelines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No timelines found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function TimelinesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [viewType, setViewType] = useState<ViewType>('list');
  const [hidePastEvents, setHidePastEvents] = useState(() => {
    const stored = localStorage.getItem('hidePastEvents');
    return stored === null ? true : JSON.parse(stored);
  });
  const { eventTypes, defaultSorting } = useSelector((state: RootState) => state.settings);
  const [sortBy, setSortBy] = useState<SortOption>((defaultSorting as SortOption) || 'date-asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { collapsed } = useSidebar();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [currentTimelineId, setCurrentTimelineId] = useState<number | null>(null);
  const [showVendorsInShare, setShowVendorsInShare] = useState(false);
  const [isRevokingShare, setIsRevokingShare] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [shareStatus, setShareStatus] = useState<{
    isShared: boolean;
    isExpired: boolean;
    expiresAt: string | null;
  }>({
    isShared: false,
    isExpired: false,
    expiresAt: null
  });
  
  // Email sharing states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Add an effect to log when showVendorsInShare changes
  useEffect(() => {
    console.log(`showVendorsInShare value changed to: ${showVendorsInShare}`);
  }, [showVendorsInShare]);

  useEffect(() => {
    localStorage.setItem('hidePastEvents', JSON.stringify(hidePastEvents));
  }, [hidePastEvents]);

  const { data: timelines, isLoading } = useQuery<Array<{
    id: number;
    title: string;
    date: string;
    type?: string;
    location?: string;
    updated_at: string;
    last_modified: string;
  }>>({
    queryKey: ['/api/timelines'],
    queryFn: async () => {
      const response = await fetch('/api/timelines');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  const deleteTimelineMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/timelines/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/timelines'],
      });
      toast({
        title: "Timeline deleted",
        description: "The timeline has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete timeline",
        variant: "destructive",
      });
    },
  });

  const duplicateTimelineMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/timelines/${id}/duplicate`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/timelines'],
      });
      toast({
        title: "Timeline duplicated",
        description: "The timeline has been successfully duplicated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to duplicate timeline",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTimeline = (id: number) => {
    deleteTimelineMutation.mutate(id);
  };

  const handleDuplicateTimeline = (id: number) => {
    duplicateTimelineMutation.mutate(id);
  };

  const getEventTypeColor = (type?: string) => {
    if (!type || !eventTypes) return '#6d28d9'; 
    const eventType = eventTypes.find((et: any) => et.type === type);
    return eventType?.color || '#6d28d9';
  };

  const filteredTimelines = (timelines || [])
    .filter((timeline) => {
      // Filter by search query
      const titleMatch = timeline.title.toLowerCase().includes(searchQuery.toLowerCase());
      const locationMatch = timeline.location ? timeline.location.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const typeMatch = timeline.type ? timeline.type.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      
      // Filter by type
      const typeFilterMatch = typeFilter === 'all' || timeline.type === typeFilter;
      
      // Filter past events
      const dateMatch = !hidePastEvents || new Date(timeline.date) >= new Date(new Date().setHours(0, 0, 0, 0));
      
      return (titleMatch || locationMatch || typeMatch) && typeFilterMatch && dateMatch;
    })
    .sort((a, b) => {
      // Sort by the selected sort option
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'updated-asc':
          return new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime();
        case 'updated-desc':
          return new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime();
        case 'type-asc':
          return (a.type || '').localeCompare(b.type || '');
        case 'type-desc':
          return (b.type || '').localeCompare(a.type || '');
        case 'location-asc':
          return (a.location || '').localeCompare(b.location || '');
        case 'location-desc':
          return (b.location || '').localeCompare(a.location || '');
        default:
          return 0;
      }
    });

  // Group timelines based on the sort option
  const groupedTimelines: TimelineGroup[] = (() => {
    if (sortBy === 'date-asc' || sortBy === 'date-desc') {
      const groups: Record<string, TimelineGroup> = {};
      
      filteredTimelines.forEach(timeline => {
        const date = new Date(timeline.date);
        const month = format(date, 'MMMM yyyy');
        
        if (!groups[month]) {
          groups[month] = { title: month, timelines: [] };
        }
        
        groups[month].timelines.push(timeline);
      });
      
      return Object.values(groups);
    } else if (sortBy === 'updated-asc' || sortBy === 'updated-desc') {
      const groups: Record<string, TimelineGroup> = {
        'Recently Updated': { title: 'Recently Updated', timelines: [] },
        'Older Updates': { title: 'Older Updates', timelines: [] }
      };
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      filteredTimelines.forEach(timeline => {
        const lastModified = new Date(timeline.last_modified);
        const groupKey = lastModified >= oneWeekAgo ? 'Recently Updated' : 'Older Updates';
        groups[groupKey].timelines.push(timeline);
      });
      
      // Remove empty groups
      return Object.values(groups).filter(group => group.timelines.length > 0);
    } else if (sortBy === 'type-asc' || sortBy === 'type-desc') {
      const groups: Record<string, TimelineGroup> = {};
      
      filteredTimelines.forEach(timeline => {
        const type = timeline.type || 'No Type';
        
        if (!groups[type]) {
          groups[type] = { title: type, timelines: [] };
        }
        
        groups[type].timelines.push(timeline);
      });
      
      return Object.values(groups);
    } else if (sortBy === 'location-asc' || sortBy === 'location-desc') {
      const groups: Record<string, TimelineGroup> = {};
      
      filteredTimelines.forEach(timeline => {
        const location = timeline.location || 'No Location';
        
        if (!groups[location]) {
          groups[location] = { title: location, timelines: [] };
        }
        
        groups[location].timelines.push(timeline);
      });
      
      return Object.values(groups);
    } else {
      // For title sorting, don't use groups
      return [{
        title: '',
        timelines: filteredTimelines
      }];
    }
  })();

  // Get sort label for display
  const getSortLabel = (): string => {
    switch(sortBy) {
      case 'date-asc': return 'Date (earliest)';
      case 'date-desc': return 'Date (latest)';
      case 'title-asc': return 'Name (A-Z)';
      case 'title-desc': return 'Name (Z-A)';      
      case 'type-asc': return 'Type (A-Z)';
      case 'type-desc': return 'Type (Z-A)';
      case 'location-asc': return 'Location (A-Z)';
      case 'location-desc': return 'Location (Z-A)';
      case 'updated-asc': return 'Oldest Updated';
      case 'updated-desc': return 'Recently Updated';
      default: return 'Sort by';
    }
  };

  const handleCreatePublicShare = async (timelineId: number) => {
    console.log(`Attempting to create public share for timeline ID: ${timelineId} with showVendors=${showVendorsInShare}, expiryDate=${expiryDate}`);
    setCurrentTimelineId(timelineId);
    setIsCreatingShare(true);
    try {
      const result = await createPublicShare(timelineId, showVendorsInShare, expiryDate ? expiryDate.toISOString() : null);
      console.log("API response for share creation:", result);
      console.log("Response showVendors value:", result.showVendors);
      
      if (result && result.shareToken) {
        const shareToken = result.shareToken;
        const shareUrl = `${window.location.origin}/public/timeline/${shareToken}`;
        console.log(`Generated share URL: ${shareUrl}`);
        
        setShareUrl(shareUrl);
        setShareStatus({
          isShared: true,
          isExpired: false,
          expiresAt: result.expiresAt || null
        });
        setShowShareDialog(true);
        
        toast({
          title: "Success!",
          description: "Share link created. You can now share this timeline with anyone.",
        });
      } else {
        console.error("Invalid API response:", result);
        throw new Error("Invalid response from server: Share token missing");
      }
    } catch (error) {
      console.error("Error creating share link:", error);
      toast({
        title: "Error",
        description: `Failed to create share link: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!currentTimelineId) return;
    
    setIsRevokingShare(true);
    try {
      await revokePublicShare(currentTimelineId);
      setShareStatus({
        isShared: false,
        isExpired: false,
        expiresAt: null
      });
      
      toast({
        title: "Access Revoked",
        description: "The share link has been disabled and is no longer accessible.",
      });
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({
        title: "Error",
        description: `Failed to revoke access: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsRevokingShare(false);
    }
  };

  const checkShareStatus = async (timelineId: number) => {
    try {
      const status = await getPublicShareStatus(timelineId);
      setShareStatus({
        isShared: status.isShared,
        isExpired: status.isExpired,
        expiresAt: status.expiresAt
      });
      
      if (status.isShared && status.shareToken) {
        setShareUrl(`${window.location.origin}/public/timeline/${status.shareToken}`);
      } else {
        setShareUrl('');
      }
      
      if (status.expiresAt) {
        setExpiryDate(new Date(status.expiresAt));
      } else {
        setExpiryDate(null);
      }
    } catch (error) {
      console.error("Error checking share status:", error);
    }
  };

  const openShareDialog = async (timelineId: number) => {
    setCurrentTimelineId(timelineId);
    setShowShareDialog(true);
    
    // Reset share state
    setShareUrl('');
    setShareStatus({
      isShared: false,
      isExpired: false,
      expiresAt: null
    });
    setExpiryDate(null);
    
    // Check if timeline is already shared
    await checkShareStatus(timelineId);
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // Add styles with useEffect
  useEffect(() => {
    // Add the styles to the document head
    const styleElement = document.createElement('style');
    styleElement.innerHTML = calendarStyles;
    document.head.appendChild(styleElement);
    
    // Clean up
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Function to handle sharing timeline via email
  const handleShareViaEmail = async () => {
    if (!currentTimelineId || !shareStatus.isShared) {
      toast({
        title: "Error",
        description: "You must create a share link before sharing via email",
        variant: "destructive",
      });
      return;
    }
    
    // Simple validation for email addresses
    const emails = recipientEmails.split(',').map(email => email.trim()).filter(email => email);
    if (emails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one valid email address",
        variant: "destructive",
      });
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      toast({
        title: "Invalid Email Addresses",
        description: `The following emails are invalid: ${invalidEmails.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingEmail(true);
    try {
      await shareTimelineViaEmail(currentTimelineId, emails, emailMessage);
      
      // Reset form fields
      setRecipientEmails('');
      setEmailMessage('');
      setShowEmailDialog(false);
      
      toast({
        title: "Email Sent!",
        description: `Timeline successfully shared with ${emails.length} recipient${emails.length > 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error("Error sharing via email:", error);
      toast({
        title: "Error",
        description: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <MainNav />
      <div className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "ml-[70px]" : "ml-[250px]"
      )}>
        <header className="border-b bg-white dark:bg-zinc-900">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Timelines</h1>
              <Button
                asChild
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
              >
                <Link href="/timeline/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Timeline
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-4 w-4" />
                    <Input
                      placeholder="Search timelines, locations or types..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full lg:w-[200px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {eventTypes?.map((type: any) => (
                        <SelectItem key={type.type} value={type.type} className="flex items-center">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: type.color || '#6d28d9' }}
                            />
                            {type.type}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hide-past-events"
                      checked={hidePastEvents}
                      onCheckedChange={setHidePastEvents}
                    />
                    <Label htmlFor="hide-past-events">Hide past events</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex border rounded-md overflow-hidden">
                      <Button
                        variant={viewType === 'list' ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-none"
                        onClick={() => setViewType('list')}
                      >
                        <List className="h-4 w-4 mr-1" />
                        List
                      </Button>
                      <Button
                        variant={viewType === 'calendar' ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-none"
                        onClick={() => setViewType('calendar')}
                      >
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Calendar
                      </Button>
                      <Button
                        variant={viewType === 'table' ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-none"
                        onClick={() => setViewType('table')}
                      >
                        <Table className="h-4 w-4 mr-1" />
                        Table
                      </Button>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800">
                          <ArrowUpDown className="h-4 w-4 mr-2 text-purple-500" />
                          {getSortLabel()}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setSortBy('date-asc')}
                          className={sortBy === 'date-asc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Date (earliest)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('date-desc')}
                          className={sortBy === 'date-desc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Date (latest)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('title-asc')}
                          className={sortBy === 'title-asc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Name (A-Z)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('title-desc')}
                          className={sortBy === 'title-desc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Name (Z-A)
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => setSortBy('type-asc')}
                          className={sortBy === 'type-asc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Type (A-Z)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('type-desc')}
                          className={sortBy === 'type-desc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Type (Z-A)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('location-asc')}
                          className={sortBy === 'location-asc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Location (A-Z)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('location-desc')}
                          className={sortBy === 'location-desc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Location (Z-A)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('updated-desc')}
                          className={sortBy === 'updated-desc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Recently Updated
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSortBy('updated-asc')}
                          className={sortBy === 'updated-asc' ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                        >
                          Oldest Updated
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>

            {viewType === 'list' ? (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-muted-foreground">Loading timelines...</p>
                  </div>
                ) : filteredTimelines.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <p className="text-muted-foreground mb-4">No timelines found</p>
                    <Button
                      asChild
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                    >
                      <Link href="/timeline/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first timeline
                      </Link>
                    </Button>
                  </div>
                ) : (
                  groupedTimelines.map((group) => (
                    <div key={group.title} className="space-y-4">
                      {group.title && (
                        <h3 className="text-lg font-medium text-foreground">{group.title}</h3>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.timelines.map((timeline) => {
                          const color = getEventTypeColor(timeline.type);
                          return (
                            <Card
                              key={timeline.id}
                              className="group bg-white dark:bg-zinc-900 border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex gap-3 flex-1">
                                    {timeline.date && (
                                      <div className="bg-gray-100 dark:bg-zinc-800 rounded-md p-2 flex flex-col items-center justify-center min-w-[50px]">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {format(parseISO(timeline.date), 'MMM')}
                                        </span>
                                        <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                          {format(parseISO(timeline.date), 'd')}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <Link href={`/timeline/${timeline.id}`}>
                                        <h3 className="font-medium text-lg mb-1 text-foreground group-hover:text-purple-600 transition-colors">{timeline.title}</h3>
                                      </Link>
                                      <div className="flex items-center space-x-2 mb-1">
                                        <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
                                        <p className="text-xs text-muted-foreground">
                                          {timeline.date && format(parseISO(timeline.date), 'EEEE, MMMM d, yyyy')}
                                        </p>
                                      </div>
                                      
                                      {timeline.location && (
                                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                          </svg>
                                          <span>{timeline.location}</span>
                                        </div>
                                      )}
                                      {timeline.type && (
                                        <div
                                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1"
                                          style={{
                                            backgroundColor: `${getEventTypeColor(timeline.type)}20`,
                                            color: getEventTypeColor(timeline.type) as string
                                          }}
                                        >
                                          {timeline.type}
                                        </div>
                                      )}
                                      <div className="text-xs text-muted-foreground mt-2 border-t pt-1 border-gray-100 dark:border-gray-700">
                                        Last modified: {formatUpdatedAt(timeline.last_modified)}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                          <span className="sr-only">Open menu</span>
                                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                            <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                          </svg>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                          <Link href={`/timeline/${timeline.id}`}>
                                            <Edit2 className="mr-2 h-4 w-4" />
                                            Edit
                                          </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicateTimeline(timeline.id)}>
                                          <Copy className="mr-2 h-4 w-4" />
                                          Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openShareDialog(timeline.id)}>
                                          <Share2 className="mr-2 h-4 w-4" />
                                          Share
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                              <span className="text-destructive">Delete</span>
                                            </DropdownMenuItem>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete the timeline "{timeline.title}". This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteTimeline(timeline.id)}
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : viewType === 'table' ? (
              <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TimelineTable 
                    timelines={filteredTimelines} 
                    onDelete={handleDeleteTimeline}
                    onDuplicate={handleDuplicateTimeline}
                    getEventTypeColor={getEventTypeColor}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    openShareDialog={openShareDialog}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <CalendarView timelines={filteredTimelines} />
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Timeline</DialogTitle>
            <DialogDescription>
              Share your timeline via link or email.
            </DialogDescription>
          </DialogHeader>
          
          {/* Share Status Indicator */}
          <div className="flex items-center gap-2 mt-2">
            <div className="text-sm text-muted-foreground">Status:</div>
            {shareStatus.isShared ? (
              shareStatus.isExpired ? (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300">
                  Expired
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">
                  Active
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300">
                Not Shared
              </Badge>
            )}
            
            {shareStatus.expiresAt && !shareStatus.isExpired && (
              <span className="text-xs text-muted-foreground">
                Expires: {format(new Date(shareStatus.expiresAt), "PPP")}
              </span>
            )}
          </div>
          
          <div className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="expiry-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : "No expiry date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0" 
                  align="start" 
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onInteractOutside={(e) => {
                    // Prevent outside clicks from propagating when calendar is open
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      // Prevent Escape key from closing
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        e.preventDefault();
                      }
                    }}
                    className="calendar-wrapper"
                  >
                    <Calendar
                      mode="single"
                      selected={expiryDate || undefined}
                      onSelect={(date: Date | undefined) => {
                        console.log("Date selected:", date);
                        setExpiryDate(date || null);
                        // Keep popover open after selection
                        setTimeout(() => {
                          // Keep the popover open after selection
                          const popoverElements = document.querySelectorAll('[data-state="open"]');
                          popoverElements.forEach(el => {
                            el.setAttribute('data-state', 'open');
                          });
                        }, 0);
                      }}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="border-none calendar-no-close react-calendar"
                    />
                    <div className="flex border-t p-3 justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setExpiryDate(null);
                        }}
                      >
                        Clear
                      </Button>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setExpiryDate(addDays(new Date(), 7));
                          }}
                        >
                          7 days
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setExpiryDate(addMonths(new Date(), 1));
                          }}
                        >
                          1 month
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show-vendors"
                checked={showVendorsInShare}
                onCheckedChange={setShowVendorsInShare}
              />
              <Label htmlFor="show-vendors">Show participants in public view</Label>
            </div>
          </div>
          
          {!shareStatus.isShared ? (
            <DialogFooter className="flex mt-6">
              <Button 
                type="button"
                onClick={() => {
                  if (currentTimelineId) {
                    handleCreatePublicShare(currentTimelineId);
                  }
                }}
                disabled={isCreatingShare}
                className="w-full"
              >
                {isCreatingShare ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Create Share Link
                  </>
                )}
              </Button>
            </DialogFooter>
          ) : !shareStatus.isExpired && (
            <div className="mt-6">
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="link">Link</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>
                
                <TabsContent value="link" className="mt-4 space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="share-link">
                      Share Link
                    </Label>
                    <div className="flex w-full">
                      <Input
                        id="share-link"
                        readOnly
                        value={shareUrl}
                        className="font-mono text-sm rounded-r-none text-ellipsis"
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        className="rounded-l-none flex-shrink-0" 
                        onClick={handleCopyShareLink}
                      >
                        {copySuccess ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copy</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <Button 
                      type="button"
                      variant="destructive"
                      onClick={handleRevokeAccess}
                      disabled={isRevokingShare}
                      className="w-full"
                    >
                      {isRevokingShare ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Revoking...
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Revoke Access
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (currentTimelineId) {
                          handleCreatePublicShare(currentTimelineId);
                        }
                      }}
                      disabled={isCreatingShare}
                      className="w-full"
                    >
                      {isCreatingShare ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Update Settings
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(shareUrl, '_blank')}
                      className="w-full sm:col-span-2"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Link
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="email" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-emails">
                        Recipient Email Addresses
                      </Label>
                      <Input
                        id="recipient-emails"
                        placeholder="Enter email addresses separated by commas"
                        value={recipientEmails}
                        onChange={(e) => setRecipientEmails(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter multiple email addresses separated by commas
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email-message">
                        Message (Optional)
                      </Label>
                      <Textarea
                        id="email-message"
                        placeholder="Add a personal message to include in the email"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                    
                    <Button
                      type="button"
                      onClick={handleShareViaEmail}
                      disabled={isSendingEmail}
                      className="w-full"
                    >
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {shareStatus.isShared && shareStatus.isExpired && (
            <DialogFooter className="flex mt-6">
              <Button 
                type="button"
                onClick={() => {
                  if (currentTimelineId) {
                    handleCreatePublicShare(currentTimelineId);
                  }
                }}
                disabled={isCreatingShare}
                className="w-full"
              >
                {isCreatingShare ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renewing...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Renew Share Link
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}