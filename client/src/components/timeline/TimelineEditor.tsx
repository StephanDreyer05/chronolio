import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { nanoid } from "nanoid";
import { useToast, toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";
import {
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  Plus,
  MoreVertical,
  Clock,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  Download,
  Edit,
  Edit2,
  Settings,
  Trash,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Table,
  FileText,
  Image,
  Eye,
  Share2,
  ExternalLink,
  Loader2,
  Ban,
  Save,
  CalendarIcon,
  ArrowUpDown,
  List,
  PlusIcon,
  MinusIcon,
  ChevronLeft,
  X,
  GripVertical,
  SortAsc,
  FileDown,
  RotateCcw,
  Upload,
  Layers,
  RefreshCw,
  Users,
  MapPin,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";
import { format, parse, addMinutes, addDays, addMonths, isSameDay, isBefore } from "date-fns";
import { jsPDF } from "jspdf";
import * as XLSX from 'xlsx';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  Table as DocxTable,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  Footer,
  PageNumber,
  NumberFormat,
  HeightRule,
  UnderlineType,
  ExternalHyperlink,
} from "docx";
import {
  addItem,
  updateItem,
  moveItem,
  sortItems,
  undo,
  redo,
  updateWeddingInfo,
  RootState as RootStateType,
  resetTimeline,
  setItems,
  deleteItem,
  setBulkEditMode,
  toggleItemSelection,
  selectAllInCategory,
  clearSelection,
  adjustSelectedTimes,
  deleteSelectedItems,
} from "@/store/timelineSlice";
import { TimelineView } from "./TimelineView";
import { TimelineVendorSelector } from "./TimelineVendorSelector";
import { VendorSelector } from "./VendorSelector";
import { VendorBulkAssignDialog } from "./VendorBulkAssignDialog";
import { VendorSelectorDisplay, VendorSelectorDisplayRef } from "./VendorSelectorDisplay";
import { RootState } from "@/store/store";
import { createPublicShare, revokePublicShare, getPublicShare, shareTimelineViaEmail } from '@/lib/api';

interface WeddingInfo {
  names: string;
  date: string;
  type?: string;
  location?: string;
  customFieldValues?: Record<string, string | number | boolean | null>;
  title?: string;
}

interface TimelineSettings {
  eventTypes: EventType[];
  timeIncrement: number;
  durationIncrement: number;
  defaultEventDuration: number;
  exportFooterText: string;
}

interface ExtendedRootState extends RootStateType {
  settings: TimelineSettings;
}

interface EventType {
  type: string;
  description?: string;
  customFields?: CustomField[];
}

interface CustomField {
  id: string;
  name: string;
  type: "text" | "textarea" | "number" | "boolean" | "date";
  defaultValue?: string | number | boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface TimelineEditorProps {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  showCategories: boolean;
  setShowCategories: (show: boolean) => void;
  showEndTimes: boolean;
  setShowEndTimes: (show: boolean) => void;
  showVendors: boolean;
  setShowVendors: (show: boolean) => void;
  isTemplate?: boolean;
  initialData?: any;
  setItems?: (items: TimelineItem[]) => void;
  items?: TimelineItem[];
  onDeleteItem?: (id: string) => void;
  newItemId?: string | null;
  setNewItemId?: (id: string | null) => void;
  isTrial?: boolean;
  onExport?: () => void; // Function to trigger external export dialog in trial mode
}

interface TimelineItem {
  id: string;
  startTime: string;
  endTime: string;
  duration: string;
  title: string;
  description: string;
  location: string;
  type: string;
  category?: string;
  categoryId?: string; // Added for category mapping
  imageUrl?: string;
  caption?: string;
  customFieldValues?: Record<string, string | number | boolean | null>;
  vendors?: Array<{
    id: number;
    name: string;
    type?: {
      id: number;
      name: string;
    } | null;
  }>;
}

interface Template {
  id: number;
  title: string;
  events: TimelineItem[];
  categories: Category[];
  type?: string;
}

interface BulkEditControlsProps {
  onTimeShift: (minutes: { minutes: number }) => void;
  timeAdjustments: number[];
  onSelectAllInCategory: (category: string) => void;
  onClearSelection: () => void;
  selectedCount: number;
  categories: Category[];
  onDeleteSelected: () => void;
}

const eventTypes: EventType[] = [
  {
    type: "Wedding",
    customFields: [
      { id: "wedding-date", name: "Wedding Date", type: "date" },
      {
        id: "wedding-location",
        name: "Location",
        type: "text",
        defaultValue: "",
      },
      { id: "wedding-budget", name: "Budget", type: "number", defaultValue: 0 },
      {
        id: "wedding-confirmed",
        name: "Confirmed",
        type: "boolean",
        defaultValue: false,
      },
    ],
  },
  { type: "Birthday" },
  { type: "Conference" },
  { type: "Reunion" },
  { type: "Other" },
];

interface CategoryEditDialogProps {
  category: Category;
  onSave: (id: string, updates: { name: string; description: string }) => void;
  onCancel: () => void;
  open: boolean;
}

const CategoryEditDialog = ({
  category,
  onSave,
  onCancel,
  open,
}: CategoryEditDialogProps) => {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");

  // Update state when category changes
  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || "");
    }
  }, [category]);

  const handleSave = () => {
    onSave(category.id, { name, description });
  };

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category.id ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="bg-purple-600 hover:bg-purple-700">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CategoryItem = ({
  category,
  index,
  onEdit,
  onDelete,
  moveCategory,
}: {
  category: Category;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  moveCategory: (dragIndex: number, hoverIndex: number) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: "CATEGORY",
    item: { type: "CATEGORY", id: category.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "CATEGORY",
    hover(item: any, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveCategory(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden group transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="bg-white dark:bg-zinc-900 p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 cursor-move text-gray-400 group-hover:text-purple-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="font-medium text-lg text-foreground">
                {category.name}
              </span>
              <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onEdit}
                >
                  <Edit2 className="h-4 w-4 text-purple-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:text-destructive"
                  onClick={onDelete}
                >
                  <X className="h-4 w-4 text-purple-600 hover:text-red-500" />
                </Button>
              </div>
            </div>
            {category.description && (
              <div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {category.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BulkEditControls = ({
  onTimeShift,
  timeAdjustments,
  onSelectAllInCategory,
  onClearSelection,
  selectedCount,
  categories,
  onDeleteSelected,
}: BulkEditControlsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const selectedItems = useSelector(
    (state: RootStateType) => state.timeline.selectedItems,
  );
  const timelineItems = useSelector(
    (state: RootStateType) => state.timeline.items,
  );

  const selectedCategories = categories.reduce(
    (acc: { [key: string]: boolean }, category) => {
      const categoryItems = timelineItems.filter(
        (item) => item.category === category.name,
      );
      const selectedCategoryItems = categoryItems.filter((item) =>
        selectedItems.includes(item.id),
      );
      acc[category.name] =
        categoryItems.length > 0 &&
        categoryItems.length === selectedCategoryItems.length;
      return acc;
    },
    {},
  );

  return (
    <div className="p-4 bg-card rounded-lg border mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Bulk Edit Mode</h3>
        <div className="text-sm font-medium px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full">
          {selectedCount} items selected
        </div>
      </div>

      <div className="space-y-3">
        {/* Time Adjustments Section */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Time Adjustments</h4>
          <div className="grid grid-cols-2 gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <ChevronLeft className="h-4 w-4 mr-1 text-purple-600" />
                  Earlier
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {timeAdjustments.map((minutes) => (
                  <DropdownMenuItem
                    key={`earlier-${minutes}`}
                    onClick={() => onTimeShift({ minutes: -minutes })}
                  >
                    {minutes} minutes earlier
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  Later
                  <ChevronRight className="h-4 w-4 ml-1 text-purple-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {timeAdjustments.map((minutes) => (
                  <DropdownMenuItem
                    key={`later-${minutes}`}
                    onClick={() => onTimeShift({ minutes })}
                  >
                    {minutes} minutes later
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Select by Category Section */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Select by Category</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={
                  selectedCategories[category.name] ? "default" : "outline"
                }
                size="sm"
                onClick={() => onSelectAllInCategory(category.name)}
                className={`justify-start text-sm h-8 ${
                  selectedCategories[category.name] ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
                }`}
              >
                <span className="truncate">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Actions Section */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="h-9"
          >
            Deselect All
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="h-9"
          >
            Delete Selected
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected items?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSelected();
                setShowDeleteDialog(false);
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Add a helper function to check if refetch should be disabled (ensuring we use the same logic)
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

export function TimelineEditor({
  categories,
  setCategories,
  showCategories,
  setShowCategories,
  showEndTimes,
  setShowEndTimes,
  showVendors,
  setShowVendors,
  isTemplate = false,
  items: propItems,
  setItems: setTemplateItems,
  onDeleteItem,
  isTrial = false,
  onExport,
}: TimelineEditorProps) {
  // Show specific buttons based on trial mode
  const shouldShowTemplatesButton = !isTrial;
  const shouldShowShareButton = !isTrial;
  const shouldShowParticipantsButton = !isTrial;
  const pathId = window.location.pathname.split("/").pop() || "";
  const timelineId = !isTemplate && pathId && /^\d+$/.test(pathId)
    ? parseInt(pathId)
    : null;
  
  // Debug log
  useEffect(() => {
    console.log("TimelineEditor - Path ID:", pathId);
    console.log("TimelineEditor - Timeline ID:", timelineId);
  }, [pathId, timelineId]);

  const dispatch = useDispatch();
  
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateConfirmDialog, setShowTemplateConfirmDialog] =
    useState(false);
  const [templateToApply, setTemplateToApply] = useState<number | null>(null);
  const { toast } = useToast();
  const [localShowCategories, setLocalShowCategories] = useState(showCategories);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [localNewItemId, setLocalNewItemId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  // Email collection for trial users
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    showCategories: true,
    showIcons: true,
    includeUserInfo: true,
    showDurations: true,
    showLocations: true,
    showDescriptions: true,
    showEndTimes: true,
    includeImages: !isTrial, // Disabled for trial users
    showParticipants: !isTrial, // Disabled for trial users
    showContactName: true,
    showEmail: true,
    showPhone: true,
    showAddress: true,
    showNotes: true,
    showVendorTypes: true,
    showAdditionalDetails: !isTrial, // Disabled for trial users
    showItemParticipants: !isTrial, // Disabled for trial users
    showTitle: true,
    showDate: true,
    showLocation: true,
    showHeading: true,
    groupByCategory: true,
  });
  const [showLocations, setShowLocations] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [previewContent, setPreviewContent] = useState("");
  const [showTimelineInfo, setShowTimelineInfo] = useState(false);
  const [showTimelineDetails, setShowTimelineDetails] = useState(false);

  const [showVendorsContent, setShowVendorsContent] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [showBulkVendorDialog, setShowBulkVendorDialog] = useState(false);
  const [showCategoriesSection, setShowCategoriesSection] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [localShowEndTimes, setLocalShowEndTimes] = useState(showEndTimes);
  const timelineVendorDisplayRef = useRef<VendorSelectorDisplayRef>(null);
  // Add a new state variable for the Settings section
  const [showSettings, setShowSettings] = useState(false);
  // Add showDurations state
  const [showDurations, setShowDurations] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [showCategoriesOnItems, setShowCategoriesOnItems] = useState(true);
  const [showVendorsOnItems, setShowVendorsOnItems] = useState(true);
  const [showVendorTypes, setShowVendorTypes] = useState(true);
  const [timelineParticipants, setTimelineParticipants] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customHeading, setCustomHeading] = useState(""); // State for custom heading text
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isRevokingShare, setIsRevokingShare] = useState(false);
  const [showVendorsInShare, setShowVendorsInShare] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  
  // Email sharing state
  const [activeShareTab, setActiveShareTab] = useState<"link" | "email">("link");
  const [recipientEmails, setRecipientEmails] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  // Helper function to format expiry date in a user-friendly way
  const formatExpiryDate = (date: Date | null): string => {
    if (!date) return "No expiry date";
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Check if date is today, tomorrow, within a week, or within a month
    if (isSameDay(date, today)) {
      return `Expires today at ${format(date, "h:mm a")}`;
    } else if (isSameDay(date, tomorrow)) {
      return `Expires tomorrow at ${format(date, "h:mm a")}`;
    } else if (isBefore(date, nextWeek)) {
      return `Expires ${format(date, "EEEE")} at ${format(date, "h:mm a")}`;
    } else if (isBefore(date, nextMonth)) {
      return `Expires on ${format(date, "MMM d")} at ${format(date, "h:mm a")}`;
    } else {
      return `Expires on ${format(date, "PPP")}`;
    }
  };

  // Add effect to fetch share information when dialog opens
  useEffect(() => {
    if (showShareDialog && timelineId) {
      // Fetch current share information
      fetchShareInfo(timelineId);
    }
  }, [showShareDialog, timelineId]);

  // Function to fetch share information
  const fetchShareInfo = async (timelineId: number) => {
    try {
      const shareData = await getPublicShare(timelineId);
      if (shareData && shareData.shareToken) {
        const shareUrl = `${window.location.origin}/public/timeline/${shareData.shareToken}`;
        setShareUrl(shareUrl);
        
        // Set expiry date if it exists
        if (shareData.expiresAt) {
          setExpiryDate(new Date(shareData.expiresAt));
        } else {
          setExpiryDate(null);
        }
        
        // Set show vendors setting
        setShowVendorsInShare(!!shareData.showVendors);
      } else {
        setShareUrl("");
        setExpiryDate(null);
        // Default to showing vendors when creating a new share
        setShowVendorsInShare(true);
      }
    } catch (error) {
      console.error("Error fetching share info:", error);
      setShareUrl("");
      setExpiryDate(null);
      // Default to showing vendors when creating a new share
      setShowVendorsInShare(true);
    }
  };
  
  // Add function to handle creating a public share
  const handleCreatePublicShare = async () => {
    if (!timelineId) {
      console.error("Cannot create share: No timeline ID available");
      toast({
        title: "Error",
        description: "Cannot create share: No timeline ID available",
        variant: "destructive",
      });
      return;
    }
    
    console.log(`Attempting to create public share for timeline ID: ${timelineId} with showVendors=${showVendorsInShare}`);
    setIsCreatingShare(true);
    try {
      const result = await createPublicShare(
        timelineId, 
        showVendorsInShare, 
        expiryDate ? expiryDate.toISOString() : undefined
      );
      console.log("API response:", result);
      console.log("Response showVendors value:", result.showVendors);
      
      if (result && result.shareToken) {
        const shareToken = result.shareToken;
        const shareUrl = `${window.location.origin}/public/timeline/${shareToken}`;
        console.log(`Generated share URL: ${shareUrl}`);
        
        setShareUrl(shareUrl);
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

  // Add function to handle revoking share access
  const handleRevokeAccess = async () => {
    if (!timelineId) return;
    
    try {
      await revokePublicShare(timelineId);
      setShareUrl("");
      
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
    }
  };

  // Add function to handle copying the share link
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

  // Add function to handle sharing via email
  const handleShareViaEmail = async () => {
    if (!timelineId) {
      console.error("Cannot share via email: No timeline ID available");
      toast({
        title: "Error",
        description: "Cannot share via email: No timeline ID available",
        variant: "destructive",
      });
      return;
    }
    
    // Parse email addresses (comma or semicolon separated)
    const emails = recipientEmails
      .split(/[,;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    if (emails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one valid email address",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingEmails(true);
    try {
      // First ensure we have a public share link
      if (!shareUrl) {
        await handleCreatePublicShare();
      }
      
      // Now share the timeline via email
      const result = await shareTimelineViaEmail(
        timelineId,
        emails,
        customMessage
      );
      
      if (result.success) {
        toast({
          title: "Success!",
          description: `Timeline shared with ${emails.length} recipient(s)`,
        });
        
        // Reset the form
        setRecipientEmails("");
        setCustomMessage("");
      } else {
        throw new Error(result.message || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error sharing via email:", error);
      toast({
        title: "Error",
        description: `Failed to share via email: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email submission for trial users
  const handleSubmitEmail = async () => {
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmittingEmail(true);
    setEmailError("");

    try {
      const response = await fetch("/api/trial-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setEmailSubmitted(true);
        setShowEmailDialog(false);
        setShowExportDialog(true);
        
        toast({
          title: "Thank you!",
          description: "Your email has been registered. You can now export your timeline.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit email");
      }
    } catch (error) {
      console.error("Error submitting email:", error);
      setEmailError("Failed to submit email. Please try again.");
      toast({
        title: "Error",
        description: `Failed to submit email: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Add handler for the Share button click
  const handleShareButtonClick = () => {
    setShowShareDialog(true);
    // Reset to the link tab when opening
    setActiveShareTab("link");
  };
  
  const {
    weddingInfo,
    items: timelineItems,
    selectedItems,
    canUndo,
    canRedo,
    bulkEditMode,
  } = useSelector((state: ExtendedRootState) => state.timeline);

  const [stateItems, setStateItems] = useState<TimelineItem[]>(propItems || timelineItems || []);

  useEffect(() => {
    setLocalShowEndTimes(showEndTimes);
  }, [showEndTimes]);

  useEffect(() => {
    if (!isTemplate && timelineItems) {
      setStateItems(timelineItems);
    }
  }, [isTemplate, timelineItems]);

  const {
    eventTypes: reduxEventTypes,
    timeIncrement,
    durationIncrement,
    defaultEventDuration,
    exportFooterText,
  } = useSelector((state: ExtendedRootState) => state.settings);

  const isTrialPage = window.location.pathname === '/try' || 
                      window.location.pathname.startsWith('/try/');

  // Fetch timeline images only when not on trial page
  const {
    data: timelineImages,
    isLoading: imagesLoading,
    error: imagesError,
  } = useQuery({
    queryKey: ["timelineImages"],
    queryFn: async () => {
      const response = await fetch("/api/timeline-images");
      if (!response.ok) {
        throw new Error("Failed to fetch timeline images");
      }
      return response.json();
    },
    enabled: !isTrialPage, // Skip fetching images on trial page
  });

  // Add a query to fetch templates
  const {
    data: templatesData,
    isLoading: templatesLoading,
  } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      return response.json();
    },
    enabled: !isTemplate && !isTrialPage, // Skip fetching templates on trial page
  });

  // Update templates state when data is fetched
  useEffect(() => {
    if (templatesData) {
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    }
  }, [templatesData]);

  useEffect(() => {
    if (templateToApply !== null) {
      setShowTemplateConfirmDialog(true);
    }
  }, [templateToApply]);

  useEffect(() => {
    console.log("Categories state changed:", showCategories);
    setLocalShowCategories(showCategories);
  }, [showCategories]);

  const generatePreview = async (): Promise<string> => {
    try {
      // Fetch vendors for items if needed
      let itemsWithVendors = [...(isTemplate && propItems ? propItems : timelineItems)];
      
      // Fetch timeline images if needed
      let timelineImagesMap: Record<number, any[]> = {};
      if (exportOptions.includeImages && timelineId && !isTrialPage) {
        try {
          const response = await fetch(`/api/timelines/${timelineId}/images`);
          if (response.ok) {
            const images = await response.json();
            timelineImagesMap = images.reduce((acc: Record<number, any[]>, img: any) => {
              if (!acc[img.timelineId]) {
                acc[img.timelineId] = [];
              }
              acc[img.timelineId].push(img);
              return acc;
            }, {});
          }
        } catch (error) {
          console.error("Error fetching timeline images:", error);
        }
      }

      if (exportOptions.showItemParticipants && !isTrialPage) {
        itemsWithVendors = await Promise.all(
          itemsWithVendors.map(async (item) => {
            if (item.id) {
              try {
                const response = await fetch(`/api/timeline-events/${item.id}/vendors`);
                if (response.ok) {
                  const vendors = await response.json();
                  return { ...item, vendors };
                }
              } catch (error) {
                console.error("Error fetching vendors for item:", error);
              }
            }
            return { ...item, vendors: (item as any).vendors || [] };
          })
        );
      }

      let previewHtml = `
        <div class="p-4 bg-white rounded-lg shadow">
      `;

      if (exportOptions.showHeading) {
        const defaultTitle = (weddingInfo as any).title || `${weddingInfo.type || "Event"} Timeline`;
        const headingText = customHeading || defaultTitle;
        previewHtml += `
          <h1 class="text-2xl font-bold text-center mb-4">${headingText}</h1>
        `;
      }
        
      if (exportOptions.showTitle && weddingInfo.names) {
        previewHtml += `
          <p class="text-center text-lg mb-2">${weddingInfo.names}</p>
        `;
      }

      if (exportOptions.showDate && weddingInfo.date) {
        previewHtml += `
          <p class="text-center text-gray-600 mb-2">${format(new Date(weddingInfo.date), "MMMM d, yyyy")}</p>
        `;
      }

      if (exportOptions.showLocation && weddingInfo.location) {
        previewHtml += `
          <p class="text-center text-gray-600 mb-6">Location: ${weddingInfo.location}</p>
        `;
      }

      // Add participants table if needed
      if (exportOptions.showParticipants && timelineParticipants.length > 0) {
        previewHtml += `
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Participants</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full border-collapse">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="p-2 text-left">Name</th>
        `;

        if (exportOptions.showContactName) previewHtml += `<th class="p-2 text-left">Contact Name</th>`;
        if (exportOptions.showEmail) previewHtml += `<th class="p-2 text-left">Email</th>`;
        if (exportOptions.showPhone) previewHtml += `<th class="p-2 text-left">Phone</th>`;
        if (exportOptions.showAddress) {
          previewHtml += `<th class="p-2 text-left">Address</th>`;
        }
        if (exportOptions.showNotes) {
          previewHtml += `<th class="p-2 text-left">Notes</th>`;
        }

        previewHtml += `
                  </tr>
                </thead>
                <tbody>
        `;

        timelineParticipants.forEach((participant) => {
          previewHtml += `
            <tr class="border-t">
              <td class="p-2">${participant.name}${participant.type ? ` (${participant.type.name})` : ""}</td>
          `;

          if (exportOptions.showContactName) {
            previewHtml += `<td class="p-2">${participant.contactName || ""}</td>`;
          }

          if (exportOptions.showEmail) {
            previewHtml += `<td class="p-2">${participant.email || ""}</td>`;
          }

          if (exportOptions.showPhone) {
            previewHtml += `<td class="p-2">${participant.phone || ""}</td>`;
          }

          if (exportOptions.showAddress) {
            previewHtml += `<td class="p-2">${participant.address || ""}</td>`;
          }

          if (exportOptions.showNotes) {
            previewHtml += `<td class="p-2">${participant.notes || ""}</td>`;
          }

          previewHtml += `</tr>`;
        });

        previewHtml += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // Sort items by start time
      const sortedItems = [...itemsWithVendors].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );

      // Group items by category if needed
      let itemsByCategory: Record<string, typeof sortedItems> = {};
      
      if (exportOptions.showCategories) {
        if (exportOptions.groupByCategory) {
          // Group items by category first
          itemsByCategory = sortedItems.reduce((acc: Record<string, typeof sortedItems>, item) => {
            const category = item.category || "Uncategorized";
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(item);
            return acc;
          }, {});
          
          // Sort items within each category by time
          Object.keys(itemsByCategory).forEach(category => {
            itemsByCategory[category].sort((a, b) => 
              a.startTime.localeCompare(b.startTime)
            );
          });
        } else {
          // Original behavior: items already sorted by time, just group by category
          sortedItems.forEach((item) => {
            const category = item.category || "Uncategorized";
            if (!itemsByCategory[category]) {
              itemsByCategory[category] = [];
            }
            itemsByCategory[category].push(item);
          });
        }
      } else {
        itemsByCategory["All Events"] = sortedItems;
      }

      // Add timeline items
      previewHtml += `<div class="timeline">`;
      
      Object.entries(itemsByCategory).forEach(([categoryName, categoryItems]) => {
        if (exportOptions.showCategories && categoryName !== "All Events") {
          previewHtml += `
            <h2 class="text-xl font-semibold mt-4 mb-2 text-purple-700">${categoryName}</h2>
          `;
        }
        
        categoryItems.forEach((item) => {
          previewHtml += `<div class="mb-3 pb-3 border-b">`;
          previewHtml += `<div class="flex justify-between">`;
          previewHtml += `<span class="font-medium">${item.startTime}</span>`;
          if (exportOptions.showEndTimes) {
            previewHtml += `<span class="text-gray-500">End: ${item.endTime}</span>`;
          }
          previewHtml += `</div>`;
          
          previewHtml += `<div class="font-semibold mt-1">${item.title}</div>`;
          
          if (exportOptions.showDescriptions && item.description) {
            previewHtml += `<div class="text-gray-700 mt-1">${item.description}</div>`;
          }

          if (exportOptions.showLocations && item.location) {
            previewHtml += `<div class="text-gray-600 mt-1">Location: ${item.location}</div>`;
          }

          // Add item images if enabled
          if (exportOptions.includeImages && item.imageUrl) {
            previewHtml += `
              <div class="mt-2 relative">
                <img 
                  src="${item.imageUrl}" 
                  alt="${item.caption || 'Item image'}"
                  class="w-full max-h-64 object-cover rounded-lg"
                />
                ${item.caption ? `
                  <div class="absolute bottom-0 left-0 right-0 p-2 bg-black/75 text-white text-sm rounded-b-lg">
                    ${item.caption}
                  </div>
                ` : ''}
              </div>
            `;
          }

          if (exportOptions.showItemParticipants && 'vendors' in item && Array.isArray((item as any).vendors) && (item as any).vendors.length > 0) {
            previewHtml += `<div class="text-gray-600 mt-1">Participants: ${
              (item as any).vendors.map((v: any) => {
                const vendorName = v.vendor?.name || v.name || "Unnamed";
                const vendorType = v.vendor?.type?.name || v.type?.name || "";
                return vendorName + (vendorType && exportOptions.showVendorTypes ? ` (${vendorType})` : "");
              }).join(" | ")
            }</div>`;
          }
          
          previewHtml += `</div>`;
        });
      });
      
      previewHtml += `</div>`;
      previewHtml += `</div>`;
      
      return previewHtml;
    } catch (error) {
      console.error("Error generating preview:", error);
      return `<div class="text-red-500">Error generating preview: ${error}</div>`;
    }
  };
  
  // Function to generate a text preview for clipboard copy and plain text exports
  const generateTextPreview = async (): Promise<string> => {
    const items = isTemplate && propItems ? propItems : timelineItems;
    const sortedItems = [...items].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    let preview = '';

    if (exportOptions.includeUserInfo) {
      const eventType = weddingInfo.type || 'Event';
      preview += `${eventType} Timeline\n`;
      if (weddingInfo.names) {
        preview += `${weddingInfo.names}\n`;
      }
      if (weddingInfo.date) preview += `${format(new Date(weddingInfo.date), 'EEEE d MMMM yyyy')}\n`;
      preview += '\n';
    }

    // Process items differently based on groupByCategory setting
    if (exportOptions.showCategories) {
      if (exportOptions.groupByCategory) {
        // Group by category first
        const itemsByCategory: Record<string, typeof sortedItems> = {};
        
        // Group items by category
        sortedItems.forEach(item => {
          const category = item.category || "Uncategorized";
          if (!itemsByCategory[category]) {
            itemsByCategory[category] = [];
          }
          itemsByCategory[category].push(item);
        });
        
        // Sort items within each category
        Object.keys(itemsByCategory).forEach(category => {
          itemsByCategory[category].sort((a, b) => 
            a.startTime.localeCompare(b.startTime)
          );
        });
        
        // Add each category and its items to the preview
        for (const category of Object.keys(itemsByCategory)) {
          preview += `\n${category}\n`;
          
          itemsByCategory[category].forEach(item => {
            preview += `${item.startTime}`;
            if (exportOptions.showEndTimes) {
              preview += ` - ${calculateEndTime(item.startTime, item.duration)}`;
            }
            
            const titleText = exportOptions.showDurations
              ? `${item.title} (${item.duration} minutes)`
              : item.title;
            
            preview += `\t${titleText}\n`;

            if (exportOptions.showDescriptions && item.description) {
              preview += `  ${item.description}\n`;
            }
            if (exportOptions.showLocations && item.location) {
              preview += `  Location: ${item.location}\n`;
            }
            preview += '\n';
          });
        }
      } else {
        // Original behavior: process all items in time order, showing category headers
        let currentCategory = '';
        sortedItems.forEach(item => {
          if (exportOptions.showCategories && item.category && item.category !== currentCategory) {
            currentCategory = item.category;
            preview += `\n${currentCategory}\n`;
          }

          preview += `${item.startTime}`;
          if (exportOptions.showEndTimes) {
            preview += ` - ${calculateEndTime(item.startTime, item.duration)}`;
          }
          
          // Update to match Word Document format with duration in brackets after title
          const titleText = exportOptions.showDurations
            ? `${item.title} (${item.duration} minutes)`
            : item.title;
          
          preview += `\t${titleText}\n`;

          if (exportOptions.showDescriptions && item.description) {
            preview += `  ${item.description}\n`;
          }
          if (exportOptions.showLocations && item.location) {
            preview += `  Location: ${item.location}\n`;
          }
          preview += '\n';
        });
      }
    } else {
      // No categories - just show all items in time order
      sortedItems.forEach(item => {
        preview += `${item.startTime}`;
        if (exportOptions.showEndTimes) {
          preview += ` - ${calculateEndTime(item.startTime, item.duration)}`;
        }
        
        const titleText = exportOptions.showDurations
          ? `${item.title} (${item.duration} minutes)`
          : item.title;
        
        preview += `\t${titleText}\n`;

        if (exportOptions.showDescriptions && item.description) {
          preview += `  ${item.description}\n`;
        }
        if (exportOptions.showLocations && item.location) {
          preview += `  Location: ${item.location}\n`;
        }
        preview += '\n';
      });
    }

    return preview;
  };

  useEffect(() => {
    if (showExportDialog) {
      generatePreview().then(preview => setPreviewContent(preview));
    }
  }, [showExportDialog, exportOptions]);

  const handleAddItem = (
    category?: string,
    position?: number,
    prevItemIndex?: number,
  ) => {
    let startTime = "12:00";
    let location = "";

    const items = isTemplate && propItems ? propItems : timelineItems;

    const relevantItems =
      localShowCategories && category
        ? items.filter((item) => item.category === category)
        : items;

    const sortedItems = [...relevantItems].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    if (typeof position === "number" && position > 0) {
      if (
        prevItemIndex !== undefined &&
        prevItemIndex >= 0 &&
        prevItemIndex < sortedItems.length
      ) {
        const previousItem = sortedItems[prevItemIndex];
        const startDate = parse(previousItem.startTime, "HH:mm", new Date());
        const endDate = addMinutes(startDate, parseInt(previousItem.duration));
        startTime = format(endDate, "HH:mm");
        location = previousItem.location || "";
      }
    } else if (items.length > 0) {
      location = items[0].location || "";
    }

    const newItemId = Date.now().toString();
    const newItem: TimelineItem = {
      id: newItemId,
      startTime,
      endTime: startTime,
      duration: defaultEventDuration?.toString() || "60",
      title: "New Event",
      description: "",
      location,
      type: "event",
      category,
    };

    if (isTemplate && setTemplateItems && propItems) {
      const newItems = [...propItems];
      if (typeof position === "number") {
        let insertPosition = position;
        if (localShowCategories && category) {
          const categoryItemsBeforePosition = propItems.filter(
            (item) =>
              item.category === category &&
              item.startTime <= sortedItems[prevItemIndex || 0]?.startTime,
          ).length;
          insertPosition = categoryItemsBeforePosition + 1;
        }
        newItems.splice(insertPosition, 0, newItem);
      } else {
        newItems.push(newItem);
      }
      setTemplateItems(newItems);
    } else {
      if (typeof position === "number") {
        const updatedItems = [...timelineItems];
        let insertPosition = position;
        if (localShowCategories && category) {
          const categoryItemsBeforePosition = timelineItems.filter(
            (item) =>
              item.category === category &&
              item.startTime <= sortedItems[prevItemIndex || 0]?.startTime,
          ).length;
          insertPosition = categoryItemsBeforePosition + 1;
        }
        updatedItems.splice(insertPosition, 0, newItem);
        dispatch(setItems(updatedItems));
      } else {
        dispatch(addItem(newItem));
      }
    }

    setLocalNewItemId(newItemId);

    setTimeout(() => {
      setLocalNewItemId(null);
    }, 100);
  };

  const handleAddCategory = () => {
    setEditingCategory({ id: "", name: "", description: "", order: categories.length });
    setShowCategoryDialog(true);
  };

  const handleEditCategory = (id: string, updates: { name: string; description: string }) => {
    if (id) {
      const oldCategory = categories.find(cat => cat.id === id);
      const updatedCategories = categories.map((cat) =>
        cat.id === id ? { ...cat, ...updates } : cat
      );
      setCategories(updatedCategories);
      
      if (oldCategory && oldCategory.name !== updates.name) {
        if (isTemplate && setTemplateItems && propItems) {
          setTemplateItems(
            propItems.map((item) => 
              item.category === oldCategory.name 
                ? { ...item, category: updates.name } 
                : item
            )
          );
        } else {
          dispatch(
            setItems(
              timelineItems.map((item) => 
                item.category === oldCategory.name 
                  ? { ...item, category: updates.name } 
                  : item
              )
            )
          );
        }
      }
    } else {
      const newCat = {
        id: Date.now().toString(),
        name: updates.name,
        description: updates.description,
        order: categories.length,
      };
      
      setCategories([...categories, newCat]);
      
      if (categories.length === 0) {
        if (isTemplate && setTemplateItems && propItems) {
          setTemplateItems(
            propItems.map((item) => ({ ...item, category: updates.name }))
          );
        } else {
          dispatch(
            setItems(
              timelineItems.map((item) => ({ ...item, category: updates.name }))
            )
          );
        }
      }
    }
    
    setShowCategoryDialog(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const categoryToDelete = categories.find((cat) => cat.id === categoryId);
    if (categoryToDelete) {
      const remainingCategories = categories.filter(
        (cat) => cat.id !== categoryId,
      );
      setCategories(remainingCategories);

      if (isTemplate && setTemplateItems && propItems) {
        setTemplateItems(
          propItems.map((item) => {
            if (item.category === categoryToDelete.name) {
              return { ...item, category: undefined };
            }
            return item;
          }),
        );
      } else {
        dispatch(
          setItems(
            timelineItems.map((item) => {
              if (item.category === categoryToDelete.name) {
                return { ...item, category: undefined };
              }
              return item;
            }),
          ),
        );
      }
    }
  };

  const moveCategory = (dragIndex: number, hoverIndex: number) => {
    const newCategories = [...categories];
    const [removed] = newCategories.splice(dragIndex, 1);
    newCategories.splice(hoverIndex, 0, removed);
    setCategories(newCategories);
  };

  const handleReset = () => {
    setShowResetDialog(true);
  };

  const handleResetConfirm = () => {
    dispatch(resetTimeline());
    setCategories([]);
    setLocalShowCategories(false);
    setShowCategories(false);
    setShowResetDialog(false);
  };

  const applyTemplate = async (templateId: number) => {
    if (isTrialPage) {
      // In trial mode, just set the template ID to trigger the confirmation dialog
      setTemplateToApply(templateId);
      return;
    }
    
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch template");
      }

      // Just set the template ID to trigger the confirmation dialog
      // The actual template data will be fetched again in handleTemplateConfirm
      setTemplateToApply(templateId);
    } catch (error) {
      console.error("Template fetch error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch template",
        variant: "destructive",
      });
    }
  };

  const handleTemplateConfirm = async () => {
    if (!templateToApply) return;

    try {
      // Close the dialog immediately in trial mode
      // The template will be handled by the TrialPage component
      if (isTrialPage) {
        setShowTemplateConfirmDialog(false);
        setTemplateToApply(null);
        return;
      }
      
      const response = await fetch(`/api/templates/${templateToApply}`);
      if (!response.ok) {
        throw new Error("Failed to fetch template");
      }

      const template = await response.json();
      console.log("Template data received:", JSON.stringify(template, null, 2));

      // Create new categories with unique IDs
      const newCategories = template.categories.map(
        (cat: any, index: number) => ({
          id: Date.now().toString() + index,
          name: cat.name,
          description: cat.description || "",
          order: cat.order || 0,
        }),
      );
      console.log("New categories created:", newCategories);

      // Update the categories state
      setCategories(newCategories);
      setLocalShowCategories(true);
      setShowCategories(true);

      // Map template events to timeline items
      const templateEvents = template.events.map((event: any, index: number) => {
        console.log(`Processing event ${index}:`, event);
        
        // Keep the original category name from the event
        const categoryName = event.category;
        
        const newEvent = {
          id: Date.now().toString() + index,
          startTime: event.startTime,
          endTime: calculateEndTime(event.startTime, event.duration),
          duration: event.duration,
          title: event.title,
          description: event.description || "",
          location: event.location || "",
          type: event.type || "event",
          category: categoryName, // Use the category name directly
          imageUrl: event.imageUrl || "",
          caption: event.caption || "",
          customFieldValues: event.customFieldValues || {},
        };
        return newEvent;
      });
      console.log("Template events created:", templateEvents);

      // Update the timeline items
      if (isTemplate && setTemplateItems && propItems) {
        console.log("Setting template items");
        setTemplateItems(templateEvents);
      } else {
        console.log("Dispatching setItems action");
        dispatch(setItems(templateEvents));
      }

      // Show success message
      toast({
        title: "Success",
        description: "Template applied successfully",
      });
    } catch (error) {
      console.error("Template application error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to apply template",
        variant: "destructive",
      });
    } finally {
      setTemplateToApply(null);
      setShowTemplateConfirmDialog(false);
    }
  };

  const exportToCSV = () => {
    const items = isTemplate && propItems ? propItems : timelineItems;
    const sortedItems = [...items].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    const csvRows = [
      [
        "Category",
        "Start Time",
        "End Time",
        "Duration (min)",
        "Title",
        "Description",
        "Location",
        "Type",
      ].join(","),
      ...sortedItems.map((item) =>
        [
          item.category || "",
          item.startTime,
          calculateEndTime(item.startTime, item.duration),
          item.duration,
          `"${item.title.replace(/"/g, '""')}"`,
          `"${item.description.replace(/"/g, '""')}"`,
          `"${item.location.replace(/"/g, '""')}"`,
          item.type,
        ].join(","),
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getFormattedFilename()}.csv`;
    link.click();
  };

  const calculateEndTime = (startTime: string, duration: string): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const durationMinutes = parseInt(duration);

    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;

    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  // Create a helper function to extract vendor names from various vendor data structures
  const extractVendorNames = (vendors: any[] | undefined): string[] => {
    const vendorNames: string[] = [];
    if (vendors && Array.isArray(vendors)) {
      vendors.forEach((vendor: any) => {
        if (vendor && typeof vendor === 'object') {
          if (vendor.name) {
            vendorNames.push(vendor.name);
          } else if (vendor.vendor && vendor.vendor.name) {
            // Handle nested vendor structure
            vendorNames.push(vendor.vendor.name);
          }
        }
      });
    }
    return vendorNames;
  };

  // Helper function to add an item row to the worksheet data
  const addItemRow = (item: any, wsData: any[][], participantColumns: string[]) => {
    const endTime = calculateEndTime(item.startTime, item.duration);
    
    const rowData = [
      item.startTime,
      endTime,
      item.duration,
      item.title,
      exportOptions.showDescriptions ? item.description : '',
      exportOptions.showLocations ? item.location : '',
    ];
    
    // Add X for each participant assigned to this item
    if (participantColumns.length > 0) {
      // Extract all vendor names
      const vendorNames = extractVendorNames(item.vendors);
      
      // Debug vendor names extraction
      console.log(`XLSX Export - Extracted vendor names for ${item.title}:`, vendorNames);
      
      participantColumns.forEach(participant => {
        // Debug the vendor assignment
        console.log(`XLSX Export - Checking if ${participant} is assigned to ${item.title}`, 
          vendorNames.includes(participant)
        );
        
        const isAssigned = vendorNames.includes(participant);
        rowData.push(isAssigned ? 'X' : '');
      });
    }
    
    wsData.push(rowData);
  };

  // Add XLSX export function
  const exportToXLSX = async () => {
    // Fetch participants if needed
    if (exportOptions.showParticipants && timelineParticipants.length === 0) {
      await fetchTimelineParticipants();
    }
    
    console.log('Export options (XLSX):', exportOptions);
    console.log('Timeline participants (XLSX):', timelineParticipants);
    
    // Get timeline items
    const items = isTemplate && propItems ? propItems : timelineItems;
    const sortedItems = [...items].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];
    
    // Track cells that need formatting
    const titleCells: string[] = []; // Large, bold title cells
    const headerCells: string[] = []; // Bold header cells
    const categoryCells: string[] = []; // Bold category cells
    
    // Add timeline information in the first few rows
    let rowIndex = 1; // Start from row 1 (1-indexed)
    
    if (exportOptions.showHeading) {
      const defaultTitle = `${weddingInfo.type || "Event"} Timeline`;
      const headingText = customHeading || defaultTitle;
      wsData.push([headingText]);
      titleCells.push(`A${rowIndex}`); // Title cell
      rowIndex++;
      
      if (exportOptions.showTitle && weddingInfo.names) {
        wsData.push([weddingInfo.names]);
        headerCells.push(`A${rowIndex}`);
        rowIndex++;
      }
    }
    
    if (exportOptions.showDate && weddingInfo.date) {
      wsData.push([format(new Date(weddingInfo.date), "MMMM d, yyyy")]);
      headerCells.push(`A${rowIndex}`);
      rowIndex++;
    }
    
    if (exportOptions.showLocation && weddingInfo.location) {
      wsData.push([`Location: ${weddingInfo.location}`]);
      headerCells.push(`A${rowIndex}`);
      rowIndex++;
    }
    
    // Add additional details if enabled
    if (exportOptions.showAdditionalDetails) {
      const eventType = reduxEventTypes.find((et) => et.type === weddingInfo.type);
      if (eventType?.customFields && weddingInfo.customFieldValues) {
        wsData.push(['Additional Details:']);
        headerCells.push(`A${rowIndex}`);
        rowIndex++;
        
        eventType.customFields.forEach(field => {
          const value = weddingInfo.customFieldValues?.[field.id];
          if (value !== undefined && value !== null) {
            wsData.push([`${field.name}: ${value}`]);
            rowIndex++;
          }
        });
      }
    }
    
    // Add empty row as separator
    wsData.push([]);
    rowIndex++;
    
    // Add participants table if enabled
    if (exportOptions.showParticipants && timelineParticipants.length > 0) {
      wsData.push(['Participants']);
      headerCells.push(`A${rowIndex}`);
      rowIndex++;
      
      // Create header row for participants
      const participantHeader = ['Participant'];
      if (exportOptions.showContactName) participantHeader.push('Contact Name');
      if (exportOptions.showEmail) participantHeader.push('Email');
      if (exportOptions.showPhone) participantHeader.push('Phone');
      if (exportOptions.showAddress) participantHeader.push('Address');
      if (exportOptions.showNotes) participantHeader.push('Notes');
      
      wsData.push(participantHeader);
      
      // Mark all cells in the participant header row as bold
      for (let i = 0; i < participantHeader.length; i++) {
        headerCells.push(`${String.fromCharCode(65 + i)}${rowIndex}`); // A, B, C, etc.
      }
      rowIndex++;
      
      // Add participant rows
      timelineParticipants.forEach(participant => {
        const participantRow = [
          exportOptions.showVendorTypes && participant.type 
            ? `${participant.name} (${participant.type.name})`
            : participant.name
        ];
        
        if (exportOptions.showContactName) participantRow.push(participant.contactName || '');
        if (exportOptions.showEmail) participantRow.push(participant.email || '');
        if (exportOptions.showPhone) participantRow.push(participant.phone || '');
        if (exportOptions.showAddress) participantRow.push(participant.address || '');
        if (exportOptions.showNotes) participantRow.push(participant.notes || '');
        
        wsData.push(participantRow);
        rowIndex++;
      });
      
      // Add empty row as separator
      wsData.push([]);
      rowIndex++;
    }
    
    // Add timeline header
    wsData.push(['Timeline']);
    titleCells.push(`A${rowIndex}`);
    rowIndex++;
    
    wsData.push([]);
    rowIndex++;
    
    // STEP 1: Fetch vendors for all items
    console.log("XLSX Export - Original items with categories:", sortedItems.map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      categoryType: typeof item.category
    })));
    
    // Debug all categories
    console.log("XLSX Export - All categories:", categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      order: cat.order
    })));
    
    let itemsWithVendors = await Promise.all(
      sortedItems.map(async (item) => {
        // Debug the item's category before fetching vendors
        console.log(`XLSX Export - Item before participant fetch: ${item.title}, category: ${item.category}, type: ${typeof item.category}`);
        
        // Store the original category to ensure it's preserved
        const originalCategory = item.category;
        console.log(`XLSX Export - Original category for ${item.title}: ${originalCategory}`);
        
        if (item.id) {
          try {
            const response = await fetch(`/api/timeline-events/${item.id}/vendors`);
            if (response.ok) {
              const vendorsData = await response.json();
              console.log(`XLSX Export - Fetched participants for item ${item.id}:`, vendorsData);
              
              // Process vendors to standardize format
              const vendors = Array.isArray(vendorsData) ? vendorsData.map((vendor: any) => {
                if (vendor.vendor && vendor.vendor.name) {
                  // Already has nested vendor structure
                  return vendor;
                } else if (vendor.name) {
                  // Direct vendor object
                  return vendor;
                } else {
                  // Fallback for unexpected structure
                  return {
                    name: vendor.name || "Unknown Vendor",
                    id: vendor.id || 0
                  };
                }
              }) : [];
              
              // Explicitly preserve the category when adding vendors
              const result = { 
                ...item, 
                vendors,
                category: originalCategory // Explicitly set the category to ensure it's preserved
              };
              console.log(`XLSX Export - Item after participant fetch: ${result.title}, category: ${result.category}, vendors:`, vendors);
              return result;
            }
          } catch (error) {
            console.error("Error fetching participants for item:", error);
          }
        }
        // Explicitly preserve the category when no vendors are fetched
        const result = { 
          ...item, 
          vendors: (item as any).vendors || [],
          category: originalCategory // Explicitly set the category to ensure it's preserved
        };
        console.log(`XLSX Export - Item with no participant fetch: ${result.title}, category: ${result.category}`);
        return result;
      })
    );
    
    // Debug all items with their categories
    console.log("XLSX Export - All items with categories:", itemsWithVendors.map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      categoryType: typeof item.category,
      vendors: item.vendors
    })));
    
    // STEP 2: Collect all participants
    const allParticipants = new Set<string>();
    
    // Add all timelineParticipants
    timelineParticipants.forEach(participant => {
      if (participant && participant.name) {
        allParticipants.add(participant.name);
      }
    });
    
    // Add all vendors from items
    itemsWithVendors.forEach(item => {
      const vendorNames = extractVendorNames(item.vendors);
      vendorNames.forEach(name => {
        console.log(`XLSX Export - Adding participant: ${name}`);
        allParticipants.add(name);
      });
    });
    
    // Convert to sorted array
    const participantColumns = Array.from(allParticipants).sort();
    
    // STEP 3: Create timeline header row
    const timelineHeader = [
      'Start Time', 
      'End Time', 
      'Duration (min)', 
      'Title', 
      'Description', 
      'Location'
    ];
    
    // Calculate the starting column index for participants
    const participantStartColumn = timelineHeader.length;
    
    // Add participant columns to header
    participantColumns.forEach(participant => {
      timelineHeader.push(participant);
    });
    
    // Add timeline header row
    wsData.push(timelineHeader);
    
    // Mark all cells in the timeline header row as bold
    for (let i = 0; i < timelineHeader.length; i++) {
      headerCells.push(`${String.fromCharCode(65 + i)}${rowIndex}`); // A, B, C, etc.
    }
    rowIndex++;
    
    // STEP 4: Process items by category or without categories
    if (exportOptions.showCategories) {
      // Get all categories and sort them
      const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
      console.log("XLSX Export - Sorted categories:", sortedCategories.map(c => ({ id: c.id, name: c.name })));
      
      // Create a mapping of category IDs to names for easier lookup
      const categoryMap = new Map<string, string>();
      sortedCategories.forEach(category => {
        categoryMap.set(String(category.id), category.name);
      });
      console.log("XLSX Export - Category map:", Object.fromEntries(categoryMap));
      
      // Group items by category name
      const itemsByCategory: Record<string, any[]> = {};
      
      // First, create entries for all known categories
      sortedCategories.forEach(category => {
        itemsByCategory[category.name] = [];
      });
      
      // Add "No Category" group if needed
      if (!itemsByCategory["No Category"]) {
        itemsByCategory["No Category"] = [];
      }
      
      // Debug entire items with vendors before categorization
      console.log("XLSX Export - All items with vendors before categorization:", 
        itemsWithVendors.map(item => ({
          id: item.id,
          title: item.title,
          category: typeof item.category === 'string' ? item.category : 'unknown',
          vendorCount: item.vendors?.length || 0
        }))
      );
      
      // Assign items to categories, preserving vendor data
      itemsWithVendors.forEach(item => {
        // Determine the category name safely
        let categoryName = "No Category";
        
        if (item.category) {
          if (typeof item.category === 'string') {
            // It's already a string category name
            categoryName = item.category;
          } else if (typeof item.category === 'object' && item.category !== null) {
            // Try to get the name from a category object
            const catObj = item.category as any;
            if (catObj.name) {
              categoryName = catObj.name;
            }
          }
        }
        
        // Create the category if it doesn't exist yet
        if (!itemsByCategory[categoryName]) {
          itemsByCategory[categoryName] = [];
        }
        
        // Debug the vendor data
        console.log(`XLSX Export - Assigning item ${item.title} to category ${categoryName} with ${item.vendors?.length || 0} vendors`);
        
        // Add item to its category group, preserving all properties including vendors
        itemsByCategory[categoryName].push(item);
      });
      
      // Sort each category's items by start time
      Object.keys(itemsByCategory).forEach(categoryName => {
        const categoryItems = itemsByCategory[categoryName];
        
        if (categoryItems && categoryItems.length > 0) {
          itemsByCategory[categoryName] = categoryItems.sort((a, b) => 
            a.startTime.localeCompare(b.startTime)
          );
        }
      });
      
      // Debug sorted items by category
      console.log("XLSX Export - Items by category:", Object.keys(itemsByCategory).map(key => ({
        categoryName: key,
        itemCount: itemsByCategory[key]?.length || 0,
        items: itemsByCategory[key]?.map(i => ({
          title: i.title,
          vendorCount: i.vendors?.length || 0
        })) || []
      })));
      
      // Process each category and its items
      for (const categoryName of Object.keys(itemsByCategory)) {
        const categoryItems = itemsByCategory[categoryName];
        
        // Skip empty categories
        if (!categoryItems || categoryItems.length === 0) {
          console.log(`XLSX Export - Skipping empty category: ${categoryName}`);
          continue;
        }
        
        console.log(`XLSX Export - Processing category ${categoryName} with ${categoryItems.length} items`);
        
        // Add category header row
        wsData.push([categoryName, '', '', '', '', '', ...Array(participantColumns.length).fill('')]);
        categoryCells.push(`A${rowIndex}`);
        rowIndex++;
        
        // Add each item in this category
        categoryItems.forEach(item => {
          // Create row data
          const endTime = calculateEndTime(item.startTime, item.duration);
          const rowData = [
            item.startTime,
            endTime,
            item.duration,
            item.title,
            exportOptions.showDescriptions ? item.description : '',
            exportOptions.showLocations ? item.location : ''
          ];
          
          // Debug vendor information for this item
          console.log(`XLSX Export - Item ${item.title} participants:`, item.vendors);
          
          // Fill in X marks for participants
          const vendorNames = extractVendorNames(item.vendors);
          
          console.log(`XLSX Export - Item ${item.title} participant names:`, vendorNames);
          
          // Add X marks for each participant
          participantColumns.forEach(participant => {
            const isAssigned = vendorNames.includes(participant);
            console.log(`XLSX Export - Is ${participant} assigned to ${item.title}? ${isAssigned}`);
            rowData.push(isAssigned ? 'X' : '');
          });
          
          wsData.push(rowData);
          rowIndex++;
        });
      }
    } else {
        // No categories - just add all items sorted by time
        const sortedItems = [...itemsWithVendors].sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        );
        
        sortedItems.forEach(item => {
          // Create row data
          const endTime = calculateEndTime(item.startTime, item.duration);
          const rowData = [
            item.startTime,
            endTime,
            item.duration,
            item.title,
            exportOptions.showDescriptions ? item.description : '',
            exportOptions.showLocations ? item.location : ''
          ];
          
          // Debug vendor information for this item
          console.log(`XLSX Export - Item ${item.title} vendors:`, item.vendors);
          
          // Fill in X marks for participants
          const vendorNames = extractVendorNames(item.vendors);
          
          console.log(`XLSX Export - Item ${item.title} participant names:`, vendorNames);
          
          // Add X marks for each participant
          participantColumns.forEach(participant => {
            const isAssigned = vendorNames.includes(participant);
            console.log(`XLSX Export - Is ${participant} assigned to ${item.title}? ${isAssigned}`);
            rowData.push(isAssigned ? 'X' : '');
          });
          
          wsData.push(rowData);
          rowIndex++;
        });
    }
    
    // Create worksheet and add to workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = [
      { wch: 10 },  // Start Time
      { wch: 10 },  // End Time
      { wch: 15 },  // Duration
      { wch: 30 },  // Title
      { wch: 40 },  // Description
      { wch: 25 },  // Location
    ];
    
    // Add width for each participant column
    participantColumns.forEach(() => {
      colWidths.push({ wch: 5 });
    });
    
    ws['!cols'] = colWidths;
    
    // Apply cell styles for Excel.js
    // Note: This is a workaround as XLSX doesn't fully support styling
    // For production use, consider using a library with better styling support
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Timeline");
    
    // Generate Excel file
    XLSX.writeFile(wb, `${getFormattedFilename()}.xlsx`);
  };
  
  const exportToPDF = async () => {
    // Fetch participants and images if needed
    if (exportOptions.showParticipants && timelineParticipants.length === 0) {
      await fetchTimelineParticipants();
    }

    // Fetch timeline images if needed
    let timelineImages: any[] = [];
    if (exportOptions.includeImages && timelineId) {
      try {
        console.log(`Fetching images for timeline ${timelineId}`);
        const response = await fetch(`/api/timelines/${timelineId}/images`);
        if (response.ok) {
          timelineImages = await response.json();
          console.log(`Successfully fetched ${timelineImages.length} timeline images:`, timelineImages);
          
          // Validate image data
          if (timelineImages.length > 0) {
            // Check for required fields
            timelineImages.forEach((img, index) => {
              console.log(`Image ${index + 1}:`, {
                id: img.id,
                url: img.imageUrl,
                caption: img.caption,
                order: img.order
              });
              
              // Ensure imageUrl is accessible
              if (!img.imageUrl) {
                console.error(`Image ${index + 1} is missing imageUrl property`);
              }
            });
          } else {
            console.warn("No timeline images found for this timeline");
          }
        } else {
          console.error(`Failed to fetch timeline images. Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Error fetching timeline images:", error);
      }
    }
    
    console.log('Export options:', exportOptions);
    console.log('Timeline participants:', timelineParticipants);
    console.log('Timeline images:', timelineImages);
    
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    let pageNumber = 1;
    const footerMargin = 20;
    const footerHeight = 15;

    // Function to add footer with page numbers
    const addFooter = (currentPage: number) => {
      const footerY = pageHeight - footerMargin;

      // Add page numbers
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Page ${currentPage}`, pdfWidth / 2, footerY, {
        align: "center",
      });

      // Add footer text below page numbers if it exists
      if (exportOptions.includeUserInfo && exportFooterText) {
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(exportFooterText, pdfWidth / 2, footerY + 5, {
          align: "center",
        });
      } else if (exportOptions.includeUserInfo) {
        // Display default footer when exportFooterText is empty
        const defaultFooterText = "Created with Chronolio";
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        
        // Get text width to determine the link position
        const textWidth = pdf.getStringUnitWidth(defaultFooterText) * 8 / pdf.internal.scaleFactor;
        const startX = (pdfWidth / 2) - (textWidth / 2);
        const endX = startX + textWidth;
        
        // Split the text to handle "Chronolio" differently
        const prefix = "Created with ";
        pdf.setTextColor(128, 128, 128);
        pdf.text(prefix, startX, footerY + 5);
        
        // Add "Chronolio" in purple
        const chroniclioText = "Chronolio";
        pdf.setTextColor(121, 80, 242); // Purple color to match app theme
        const prefixWidth = pdf.getStringUnitWidth(prefix) * 8 / pdf.internal.scaleFactor;
        const chroniclioStartX = startX + prefixWidth;
        pdf.text(chroniclioText, chroniclioStartX, footerY + 5);
        
        // Add a link annotation for "Chronolio"
        const chroniclioTextWidth = pdf.getStringUnitWidth(chroniclioText) * 8 / pdf.internal.scaleFactor;
        pdf.link(
          chroniclioStartX,
          footerY + 1,
          chroniclioTextWidth,
          8,
          { url: "https://chronolio.com" }
        );
      }
    };

    // Pre-calculate total pages
    const items = isTemplate && propItems ? propItems : timelineItems;
    let sortedItems = [...items].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    // Process items differently depending on the groupByCategory setting
    let processedItems: TimelineItem[] = [];
    let itemsByCategory: { [key: string]: TimelineItem[] } = {};
    
    if (exportOptions.showCategories && exportOptions.groupByCategory) {
      // Group by category first
      itemsByCategory = sortedItems.reduce((acc: { [key: string]: TimelineItem[] }, item) => {
        const category = item.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});
      
      // Sort items within each category by start time
      Object.keys(itemsByCategory).forEach(category => {
        itemsByCategory[category].sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        );
      });
      
      // Create a flat list for page calculation, preserving category grouping
      const categoryNames = Object.keys(itemsByCategory);
      categoryNames.forEach(category => {
        processedItems = [...processedItems, ...itemsByCategory[category]];
      });
    } else {
      // Just use the time-sorted items
      processedItems = sortedItems;
    }
    
    // Use processedItems for page calculation and later for rendering
    
    // Fetch vendors for items if needed
    let itemsWithVendors = processedItems;
    if (exportOptions.showParticipants) {
      itemsWithVendors = await Promise.all(
        processedItems.map(async (item) => {
          if (item.id) {
            try {
              const response = await fetch(`/api/timeline-events/${item.id}/vendors`);
              if (response.ok) {
                const vendors = await response.json();
                return { ...item, vendors };
              }
            } catch (error) {
              console.error("Error fetching vendors for item:", error);
            }
          }
          // Use type assertion to handle the vendors property
          return { ...item, vendors: (item as any).vendors || [] };
        })
      );
    }
    
    console.log("PDF: itemsWithVendors:", itemsWithVendors);

    let totalPages = 1;
    let tempY = yPosition;

    // Title and basic info
    tempY += 30; // Account for title section

    // Calculate pages needed for items
    itemsWithVendors.forEach((item) => {
      const itemHeight = 7; // Basic height for time and title
      const descriptionLines =
        item.description && exportOptions.showDescriptions
          ? pdf.splitTextToSize(item.description, pdfWidth - margin * 2 - 40)
              .length
          : 0;

      tempY += itemHeight + descriptionLines * 5 + (item.location ? 7 : 0) + 5;

      if (tempY > pageHeight - (footerMargin + footerHeight)) {
        totalPages++;
        tempY = margin;
      }
    });

    // Reset position for actual content
    yPosition = margin;

    const addNewPage = () => {
      addFooter(pageNumber);
      pdf.addPage();
      pageNumber++;
      yPosition = margin;
    };

    // Add title and info
    pdf.setFontSize(24);
    pdf.setTextColor(0, 0, 0);
    const titleEventType = weddingInfo.type || "Event";
    const defaultTitle = `${titleEventType} Timeline`;
    const headingText = customHeading || defaultTitle;
    
    if (exportOptions.showHeading) {
      pdf.text(headingText, pdfWidth / 2, yPosition, { align: "center" });
      yPosition += 10;
    }

    if (exportOptions.showTitle && weddingInfo.names) {
      pdf.setFontSize(20);
      pdf.text(weddingInfo.names, pdfWidth / 2, yPosition, { align: "center" });
      yPosition += 10;
    }

    if (exportOptions.showDate && weddingInfo.date) {
      pdf.setFontSize(14);
      pdf.text(
        format(new Date(weddingInfo.date), "EEEE d MMMM yyyy"), pdfWidth / 2, yPosition, { align: "center" },
      );
      yPosition += 10;
    }

    // Add location if available
    if (exportOptions.showLocation && weddingInfo.location) {
      pdf.setFontSize(14);
      const location = `Location: ${weddingInfo.location}`
      pdf.text(location, pdfWidth / 2, yPosition, { align: "center" });
      yPosition += 10;
    }

    const selectedEventType = reduxEventTypes.find(
      (et) => et.type === weddingInfo.type,
    );

    // Add Timeline Details section first
    const eventType = reduxEventTypes.find(
      (et) => et.type === weddingInfo.type,
    );
    if (exportOptions.showAdditionalDetails && eventType?.customFields) {
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      yPosition += 10;
      
      // Check if we need a new page for custom fields
      if (yPosition > pageHeight - (footerMargin + footerHeight + 40)) {
        addNewPage();
      }
      
      pdf.text("Timeline Details", pdfWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      eventType.customFields.forEach((field) => {
        const value = weddingInfo.customFieldValues?.[field.id];
        if (value !== undefined && value !== null) {
          let displayValue = value;
          if (field.type === "date") {
            displayValue = format(new Date(value as string), "PPP");
          } else if (field.type === "boolean") {
            displayValue = value ? "Yes" : "No";
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.text(`${field.name}:`, margin, yPosition);
          pdf.setFont("helvetica", "normal");
          pdf.text(
            displayValue.toString(),
            margin + 40,
            yPosition,
          );
          yPosition += 7;
        }
      });
      
      yPosition += 10;
    }
    
    // Add Participants section next
    if (exportOptions.showParticipants && timelineParticipants.length > 0) {
      // Check if we need a new page
      if (yPosition > pageHeight - (footerMargin + footerHeight + 60)) {
        addNewPage();
      }
      
      // Add Participants heading
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      //yPosition += 10;
      pdf.text("Participants", pdfWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;
      
      // Define table columns based on selected options
      const columns = ["Participant"];
      if (exportOptions.showContactName) columns.push("Contact Name");
      if (exportOptions.showEmail) columns.push("Email");
      if (exportOptions.showPhone) columns.push("Phone");
      if (exportOptions.showAddress) columns.push("Address");
      if (exportOptions.showNotes) columns.push("Notes");
      
      // Calculate column widths
      const tableWidth = pdfWidth - margin * 2;
      const colWidths = columns.map(() => tableWidth / columns.length);
      const cellPadding = 2;
      
      // Set up table headers
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      
      // Draw table outer border
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.5);
      
      // Draw header cells
      let xPos = margin + cellPadding;
      columns.forEach((col, index) => {
        // Center the header text in the cell
        const headerWidth = colWidths[index] - (cellPadding * 2);
        const textWidth = pdf.getStringUnitWidth(col) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const textX = xPos + (headerWidth - textWidth) / 2;
        
        pdf.text(col, textX, yPosition);
        xPos += colWidths[index];
      });
      
      // Draw header row top and bottom lines
      pdf.line(margin, yPosition - 5, margin + tableWidth, yPosition - 5);
      pdf.line(margin, yPosition + 2, margin + tableWidth, yPosition + 2);
      
      // Store positions for drawing grid lines later
      const tableStartY = yPosition - 5;
      let tableEndY = yPosition + 2;
      const rowPositions = [tableStartY, yPosition + 2];
      
      // Move to first data row
      yPosition += 10;
      
      timelineParticipants.forEach((participant, participantIndex) => {
        // Check if we need a new page
        if (yPosition > pageHeight - (footerMargin + footerHeight + 15)) {
          // Draw all vertical lines for the current page
          for (let i = 0; i <= columns.length; i++) {
            const lineX = margin + (i * (tableWidth / columns.length));
            pdf.line(lineX, tableStartY, lineX, tableEndY);
          }
          
          addNewPage();
          
          // Restart table on new page
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          
          // Draw header row on new page
          xPos = margin + cellPadding;
          columns.forEach((col, index) => {
            const headerWidth = colWidths[index] - (cellPadding * 2);
            const textWidth = pdf.getStringUnitWidth(col) * pdf.getFontSize() / pdf.internal.scaleFactor;
            const textX = xPos + (headerWidth - textWidth) / 2;
            
            pdf.text(col, textX, yPosition);
            xPos += colWidths[index];
          });
          
          // Draw header row lines
          pdf.line(margin, yPosition - 5, margin + tableWidth, yPosition - 5);
          pdf.line(margin, yPosition + 2, margin + tableWidth, yPosition + 2);
          
          // Update table tracking variables
          tableEndY = yPosition + 2;
          rowPositions.length = 0;
          rowPositions.push(yPosition - 5, yPosition + 2);
          
          // Move to first data row on new page
          yPosition += 10;
        }
        
        // Store initial Y position for this row
        const rowStartY = yPosition - 5;
        let rowHeight = 0;
        
        // Add participant data
        xPos = margin + cellPadding; // Add padding from left
        
        // Set font to normal for participant data (not bold)
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        
        // Participant name (vendor name)
        const participantName = participant.name || "";
        
        // Calculate base Y position for this row (centered vertically in the cell)
        const baseYPos = rowStartY + cellPadding + 3; // Reduced from +5 to +3
        
        // Add participant name
        pdf.text(participantName, xPos, baseYPos);
        let cellHeight = 5;
        
        // Add vendor type on next line if enabled
        if (participant.type && exportOptions.showVendorTypes) {
          pdf.setFontSize(7); // Even smaller font for vendor type
          pdf.setTextColor(100, 100, 100);
          pdf.text(participant.type.name, xPos, baseYPos + 5);
          pdf.setFontSize(9); // Reset font size
          pdf.setTextColor(0, 0, 0);
          cellHeight += 5; // Add height for the vendor type
        }
        
        // Track maximum cell height
        rowHeight = Math.max(rowHeight, cellHeight);
        
        // Move to next column
        xPos = margin + colWidths[0] + cellPadding;
        
        // Contact name (if enabled)
        if (exportOptions.showContactName) {
          // Split text if needed
          const contactName = participant.contactName || "";
          if (contactName) {
            const contactNameLines = pdf.splitTextToSize(contactName, colWidths[1] - (cellPadding * 2));
            pdf.text(contactNameLines, xPos, baseYPos);
            const contactHeight = contactNameLines.length * 5;
            rowHeight = Math.max(rowHeight, contactHeight);
          }
          xPos += colWidths[1];
        }
        
        // Email (if enabled)
        if (exportOptions.showEmail) {
          const email = participant.email || "";
          if (email) {
            const emailLines = pdf.splitTextToSize(email, colWidths[exportOptions.showContactName ? 2 : 1] - (cellPadding * 2));
            pdf.text(emailLines, xPos, baseYPos);
            const emailHeight = emailLines.length * 5;
            rowHeight = Math.max(rowHeight, emailHeight);
          }
          xPos += colWidths[exportOptions.showContactName ? 2 : 1];
        }
        
        // Phone (if enabled)
        if (exportOptions.showPhone) {
          const phone = participant.phone || "";
          if (phone) {
            const phoneLines = pdf.splitTextToSize(phone, colWidths[
              (exportOptions.showContactName ? 1 : 0) + 
              (exportOptions.showEmail ? 1 : 0) + 
              1
            ] - (cellPadding * 2));
            pdf.text(phoneLines, xPos, baseYPos);
            const phoneHeight = phoneLines.length * 5;
            rowHeight = Math.max(rowHeight, phoneHeight);
          }
          xPos += colWidths[
            (exportOptions.showContactName ? 1 : 0) + 
            (exportOptions.showEmail ? 1 : 0) + 
            1
          ];
        }
        
        // Address (if enabled)
        if (exportOptions.showAddress) {
          const address = participant.address || "";
          if (address) {
            const addressLines = pdf.splitTextToSize(address, colWidths[
              (exportOptions.showContactName ? 1 : 0) + 
              (exportOptions.showEmail ? 1 : 0) + 
              (exportOptions.showPhone ? 1 : 0) + 
              1
            ] - (cellPadding * 2));
            pdf.text(addressLines, xPos, baseYPos);
            const addressHeight = addressLines.length * 5;
            rowHeight = Math.max(rowHeight, addressHeight);
          }
          xPos += colWidths[
            (exportOptions.showContactName ? 1 : 0) + 
            (exportOptions.showEmail ? 1 : 0) + 
            (exportOptions.showPhone ? 1 : 0) + 
            1
          ];
        }
          
        // Notes (if enabled)
        if (exportOptions.showNotes) {
          const notes = participant.notes || "";
          if (notes) {
            const notesLines = pdf.splitTextToSize(notes, colWidths[
              (exportOptions.showContactName ? 1 : 0) + 
              (exportOptions.showEmail ? 1 : 0) + 
              (exportOptions.showPhone ? 1 : 0) + 
              (exportOptions.showAddress ? 1 : 0) + 
              1
            ] - (cellPadding * 2));
            pdf.text(notesLines, xPos, baseYPos);
            const notesHeight = notesLines.length * 5;
            rowHeight = Math.max(rowHeight, notesHeight);
          }
        }
        
        // Calculate final row height with padding
        rowHeight = Math.max(rowHeight, 5) + (cellPadding * 2);
        
        // Update table end position
        tableEndY = rowStartY + rowHeight;
        
        // Store the position for the next row
        rowPositions.push(tableEndY);
        
        // Move to next row
        yPosition = rowStartY + rowHeight + 5;
      });
      
      // Draw all vertical lines for the entire table at once
      for (let i = 0; i <= columns.length; i++) {
        const lineX = margin + (i * (tableWidth / columns.length));
        // Draw the vertical line from the top of the table to the bottom
        pdf.line(lineX, tableStartY, lineX, tableEndY);
      }
      
      // Draw all horizontal lines for rows using stored positions
      rowPositions.forEach(position => {
        // Draw the horizontal line from the left edge to the right edge of the table
        pdf.line(margin, position, margin + tableWidth, position);
      });
      
      yPosition = tableEndY + 10;
    }

    // Add Timeline heading above the timeline items
    // Check if there's enough space for the heading plus at least one timeline item
    // A typical timeline item needs about 30-40 points of vertical space
    if (yPosition > pageHeight - (footerMargin + footerHeight + 60)) {
      addNewPage();
    }
    
    // Mark the position before adding the Timeline heading
    const timelineHeadingPosition = yPosition;
    
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.text("Timeline", pdfWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 15;

    // Add items
    let currentCategory = "";

    itemsWithVendors.forEach((item, index) => {
      // Debug each item
      console.log(`PDF: Processing item ${item.id}:`, item);
      console.log(`PDF: Item has vendors?`, Boolean((item as any).vendors && Array.isArray((item as any).vendors) && (item as any).vendors.length > 0));
      
      // Check if we need a new page
      if (yPosition > pageHeight - (footerMargin + footerHeight)) {
        addNewPage();
        
        // If this is the first item, redraw the Timeline heading on the new page
        if (index === 0) {
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont("helvetica", "bold");
          pdf.text("Timeline", pdfWidth / 2, yPosition, {
            align: "center",
          });
          yPosition += 15;
        }
      }

      if (
        exportOptions.showCategories &&
        localShowCategories &&
        item.category &&
        item.category !== currentCategory &&
        item.category !== "All Events" // Don't show "All Events" as a category header
      ) {
        currentCategory = item.category;
        if (yPosition > pageHeight - (footerMargin + footerHeight + 20)) {
          addNewPage();
        }
        pdf.setFont("helvetica", "bolditalic"); // Changed from "bold" to "bolditalic"
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        
        // Draw the text
        pdf.text(currentCategory, margin, yPosition);
        
        // Draw an underline for the category text
        const textWidth = pdf.getStringUnitWidth(currentCategory) * 12 / pdf.internal.scaleFactor;
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition + 1, margin + textWidth, yPosition + 1);
        
        // Reduced spacing from 14 to 8
        yPosition += 8;
      }

      const timeWidth = exportOptions.showEndTimes ? 35 : 25;
      const contentStartX = margin + timeWidth + 5;

      // Time
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      if (exportOptions.showEndTimes) {
        const endTime = calculateEndTime(item.startTime, item.duration);
        pdf.text(`${item.startTime} - ${endTime}`, margin, yPosition);
      } else {
        pdf.text(item.startTime, margin, yPosition);
      }

      // Duration - removed as it's now included with the title
      
      // Title
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      
      // Handle multi-line titles
      const titleText = exportOptions.showDurations 
        ? `${item.title} (${item.duration} minutes)`
        : item.title;
        
      const titleLines = pdf.splitTextToSize(
        titleText,
        pdfWidth - contentStartX - margin
      );
      pdf.text(titleLines, contentStartX, yPosition);
      yPosition += 7 + (titleLines.length - 1) * 5;

      // Description
      if (exportOptions.showDescriptions && item.description) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        const descriptionLines = pdf.splitTextToSize(
          item.description,
          pdfWidth - contentStartX - margin,
        );
        pdf.text(descriptionLines, contentStartX, yPosition);
        yPosition += 5 * descriptionLines.length;
      }

      // Item participants if enabled
      if (exportOptions.showParticipants && (item as any).vendors && Array.isArray((item as any).vendors) && (item as any).vendors.length > 0) {
        yPosition += 1
        // For debugging
        console.log("Item has vendors:", item.id, (item as any).vendors);
        pdf.setFont("helvetica", "normal");
        const participantsText = (item as any).vendors.map((vendor: any) => {
          const vendorName = vendor.vendor?.name || vendor.name || "Unnamed";
          const vendorType = vendor.vendor?.type?.name || vendor.type?.name || "";
          return vendorName + (exportOptions.showVendorTypes && vendorType ? ` (${vendorType})` : "");
        }).join(" | ");
        
        // Add "Participants:" label in bold
        pdf.setFont("helvetica", "bold");
        pdf.text("Participants:", contentStartX, yPosition);
        yPosition += 5;
        
        // Add the actual participants list in normal font
        pdf.setFont("helvetica", "normal");
        const participantLines = pdf.splitTextToSize(
          participantsText,
          pdfWidth - (margin * 2) - 40
        );
        
        pdf.text(participantLines, contentStartX, yPosition);
        yPosition += participantLines.length * 5;
      }

      // Location - now in italic
      if (exportOptions.showLocations && item.location) {
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.setFont("helvetica", "italic"); // Changed to italic
        
        // Handle multi-line locations
        const locationLines = pdf.splitTextToSize(
          `Location: ${item.location}`,
          pdfWidth - contentStartX - margin
        );
        pdf.text(locationLines, contentStartX, yPosition);
        yPosition += 5 * locationLines.length;
      }
      
      

      yPosition += 5; // Add space between items
    });

    if (
      exportOptions.includeImages &&
      timelineImages &&
      timelineImages.length > 0
    ) {
      console.log("Starting image export process");
      try {
        // Add a new page for images section
        addNewPage();
        
        // Add "Timeline Images" heading
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        // Explicitly set text color to black for the heading
        pdf.setTextColor(0, 0, 0);
        pdf.text("Timeline Images", pdfWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 10;
        
        console.log("Processing images:", timelineImages.length, timelineImages);
        const maxImageWidth = pdfWidth - margin * 2;
        const imageSpacing = 10; // Reduced from 25 to allow more efficient space usage
        
        // Process each image
        for (let i = 0; i < timelineImages.length; i++) {
          try {
            // Ensure the image URL is properly formed
            let imageUrl = timelineImages[i].imageUrl || "";
            
            // Skip images without a URL
            if (!imageUrl) {
              console.warn(`Image ${i} has no URL, skipping`);
              continue;
            }
            
            // Make sure URL is absolute
            if (imageUrl.startsWith("/uploads/")) {
              // For relative URLs, prefix with origin
              imageUrl = window.location.origin + imageUrl;
            }
            
            console.log("Processing image from URL:", imageUrl);
            
            // Fetch the image as an ArrayBuffer instead of using Image object
            console.log(`Fetching image from ${imageUrl}`);
            const response = await fetch(imageUrl);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            const imageArrayBuffer = await response.arrayBuffer();
            console.log(`Successfully fetched image data, size: ${imageArrayBuffer.byteLength} bytes`);
            
            // Use hardcoded dimensions as a fallback when we can't calculate correctly
            // Standard size for timeline images, can be adjusted based on typical usage
            let imageWidth = maxImageWidth;
            let imageHeight = 300; // Default height if we can't calculate

            try {
              // Create a temporary HTML image to get dimensions
              const img = document.createElement('img');
              img.crossOrigin = "Anonymous";
              
              await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                  console.log(`Image ${i} loaded successfully for dimension calculation: ${img.width}x${img.height}`);
                  // Calculate dimensions while maintaining aspect ratio
                  const aspectRatio = img.width / img.height;
                  imageWidth = maxImageWidth;
                  imageHeight = imageWidth / aspectRatio;
                  
                  // Calculate maximum allowed height to fit at least 2 images per page
                  // Account for: margin, caption space, image spacing
                  const availablePageHeight = pageHeight - (margin * 2);
                  // Each image needs to account for its own height + caption space (5) + spacing (25)
                  const maxAllowedImageHeight = (availablePageHeight / 2) - 30;
                  
                  // If the calculated image height exceeds max allowed, scale it down
                  if (imageHeight > maxAllowedImageHeight) {
                    imageHeight = maxAllowedImageHeight;
                    // Recalculate width to maintain aspect ratio
                    imageWidth = imageHeight * aspectRatio;
                    
                    // Ensure width doesn't exceed maxImageWidth
                    if (imageWidth > maxImageWidth) {
                      imageWidth = maxImageWidth;
                      imageHeight = imageWidth / aspectRatio;
                    }
                  }
                  
                  console.log(`Adjusted image dimensions to fit 2 per page: ${imageWidth}x${imageHeight}`);
                  resolve();
                };
                
                img.onerror = (err) => {
                  console.error(`Error loading image ${i} for dimension calculation:`, err);
                  // Continue with default dimensions
                  
                  // Apply the same max height calculation for default dimensions
                  const availablePageHeight = pageHeight - (margin * 2);
                  // Each image needs to account for its own height + caption space (5) + spacing (15)
                  const maxAllowedImageHeight = (availablePageHeight / 2) - 20;
                  
                  if (imageHeight > maxAllowedImageHeight) {
                    imageHeight = maxAllowedImageHeight;
                    // Calculate width based on a typical aspect ratio if original can't be determined
                    imageWidth = Math.min(maxImageWidth, imageHeight * 1.5); // Assuming 3:2 aspect ratio
                  }
                  
                  resolve();
                };
                
                // Create object URL for the image
                const blob = new Blob([imageArrayBuffer], { type: 'image/jpeg' });
                const objectUrl = URL.createObjectURL(blob);
                img.src = objectUrl;
                
                // Clean up the object URL after loading
                setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
              });
            } catch (dimensionError) {
              console.warn(`Using default image dimensions due to calculation error: ${dimensionError}`);
              // Apply the same max height calculation for default dimensions
              const availablePageHeight = pageHeight - (margin * 2);
              // Each image needs to account for its own height + caption space (5) + spacing (15)
              const maxAllowedImageHeight = (availablePageHeight / 2) - 20;
              
              if (imageHeight > maxAllowedImageHeight) {
                imageHeight = maxAllowedImageHeight;
                // Calculate width based on a typical aspect ratio
                imageWidth = Math.min(maxImageWidth, imageHeight * 1.5); // Assuming 3:2 aspect ratio
              }
            }
            
            // Check if we need a new page for this image
            if (yPosition + imageHeight + 15 > pageHeight - margin) {
              addNewPage();
              yPosition = margin;
              console.log(`Added new page for image ${i}, new yPosition: ${yPosition}`);
            }
            
            // Add caption if available
            if (timelineImages[i].caption) {
              pdf.setFontSize(14);
              pdf.setTextColor(0, 0, 0);
              pdf.setFont("helvetica", "bold");
              pdf.text(
                timelineImages[i].caption || "",
                pdfWidth / 2,
                yPosition,
                { align: "center", maxWidth: maxImageWidth },
              );
              yPosition += 5; // Increased spacing for caption
            }
            
            // Determine image format
            let format = 'JPEG';
            if (imageUrl.toLowerCase().endsWith('.png')) {
              format = 'PNG';
            }
            
            // Convert ArrayBuffer to Uint8Array before adding to PDF
            const uint8Array = new Uint8Array(imageArrayBuffer);
            
            // Calculate center position for the image
            const xCenter = (pdfWidth - imageWidth) / 2;
            
            // Add image directly to PDF using the Uint8Array
            pdf.addImage(
              uint8Array, 
              format, 
              xCenter, 
              yPosition, 
              imageWidth, 
              imageHeight
            );
            
            console.log(`Added image ${i} to PDF at position y=${yPosition}`);
            
            // Update position for next element - using the reduced imageSpacing value
            yPosition += imageHeight + 5 + imageSpacing;
          } catch (error) {
            console.error(`Error processing image ${i}:`, error);
            
            // Add error message in PDF
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "italic");
            pdf.setTextColor(255, 0, 0);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            pdf.text(`[Image ${i+1} could not be processed: ${errorMessage}]`, margin, yPosition, {
              maxWidth: maxImageWidth
            });
            pdf.setTextColor(0, 0, 0);
            // Update position using the reduced imageSpacing value 
            yPosition += 10 + imageSpacing;
          }
        }
      } catch (error) {
        console.error("Error in PDF image processing:", error);
        toast({
          title: "Warning",
          description: "Some images could not be included in the export",
          variant: "destructive",
        });
      }
    } else {
      console.log("Image export conditions not met:", {
        includeImages: exportOptions.includeImages,
        hasTimelineImages: !!timelineImages,
        timelineImagesLength: timelineImages?.length,
      });
    }
    
    // Add footer to the last page
    addFooter(pageNumber);

    pdf.save(`${getFormattedFilename()}.pdf`);
  };

  const exportToWord = async () => {
    // Fetch participants if needed
    if (exportOptions.showParticipants && timelineParticipants.length === 0) {
      await fetchTimelineParticipants();
    }
    
    // Fetch timeline images if needed and not already loaded
    let timelineImages: any[] = [];
    if (exportOptions.includeImages && timelineId) {
      try {
        console.log(`Fetching images for Word export - timeline ${timelineId}`);
        const response = await fetch(`/api/timelines/${timelineId}/images`);
        if (response.ok) {
          timelineImages = await response.json();
          console.log(`Successfully fetched ${timelineImages.length} timeline images for Word export:`, timelineImages);
        } else {
          console.error(`Failed to fetch timeline images for Word export. Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Error fetching timeline images for Word export:", error);
      }
    }
    
    console.log('Export options (Word):', exportOptions);
    console.log('Timeline participants (Word):', timelineParticipants);
    console.log('Timeline images (Word):', timelineImages);
    
    const paragraphs = [];
    const timelineparagraphs = [];
    const participantsparagraphs = [];
    const detailsparagraphs = [];
    const imagesparagraphs = [];
    const tables = [];

    // Title section
    const defaultTitleText = (weddingInfo as any).title || `${weddingInfo.type || "Event"} Timeline`;
    const headingText = customHeading || defaultTitleText;
    
    if (exportOptions.showHeading) {
      paragraphs.push(
        new Paragraph({
          text: headingText,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    // Add names if available
    if (exportOptions.showTitle && weddingInfo.names) {
      paragraphs.push(
        new Paragraph({
          text: weddingInfo.names,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    // Add date if available
    if (exportOptions.showDate && weddingInfo.date) {
      paragraphs.push(
        new Paragraph({
          text: format(new Date(weddingInfo.date), "MMMM d, yyyy"),
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Add location if available
    if (exportOptions.showLocation && weddingInfo.location) {
      paragraphs.push(
        new Paragraph({
          text: `Location: ${weddingInfo.location}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Add timeline details (custom fields) if available
    const eventType = reduxEventTypes.find((et) => et.type === weddingInfo.type);
    if (exportOptions.showAdditionalDetails && eventType?.customFields && eventType.customFields.length > 0) {
      detailsparagraphs.push(
        new Paragraph({
          text: "Timeline Details",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      eventType.customFields.forEach(field => {
        const fieldValue = weddingInfo.customFieldValues?.[field.id] ?? field.defaultValue ?? "";
        if (fieldValue) {
          if (field.type === "textarea") {
            // For textarea fields, create a paragraph for the field name
            detailsparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${field.name}: `,
                    bold: true,
                  }),
                ],
                spacing: { after: 60 },
              })
            );
            
            // Split the text by newlines and create a paragraph for each line
            const lines = String(fieldValue).split('\n');
            lines.forEach((line, index) => {
              // For empty lines, add a small spacer paragraph
              if (line.trim() === '') {
                detailsparagraphs.push(
                  new Paragraph({
                    text: " ",
                    spacing: { after: 60 },
                  })
                );
              } else {
                detailsparagraphs.push(
                  new Paragraph({
                    text: line,
                    spacing: { after: 60 },
                    indent: { left: 360 }, // Add indentation for multi-line text
                  })
                );
              }
            });
            
            // Add some extra spacing after the multi-line field
            detailsparagraphs.push(
              new Paragraph({
                text: "",
                spacing: { after: 200 },
              })
            );
          } else {
            // For other field types, use the original format
            detailsparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${field.name}: `,
                    bold: true,
                  }),
                  new TextRun({
                    text: String(fieldValue),
                  }),
                ],
                spacing: { after: 120 },
              })
            );
          }
        }
      });
    }

    // Add participants section if needed
    if (exportOptions.showParticipants && timelineParticipants.length > 0) {
      participantsparagraphs.push(
        new Paragraph({
          text: "Participants",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      // Create a table for participants
      const participantsTable = new DocxTable({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
        },
        rows: [
          // Header row
          new TableRow({
            tableHeader: true,
            height: { value: 400, rule: HeightRule.ATLEAST },
            cantSplit: true,
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Participant",
                        bold: true,
                      }),
                    ],
                    spacing: { before: 120, after: 120 },
                  }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" },
                margins: {
                  top: 120,
                  bottom: 120,
                  left: 120,
                  right: 120,
                },
              }),
              ...(exportOptions.showContactName ? [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Contact Name",
                          bold: true,
                        }),
                      ],
                      spacing: { before: 120, after: 120 },
                    }),
                  ],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: "F2F2F2" },
                  margins: {
                    top: 120,
                    bottom: 120,
                    left: 120,
                    right: 120,
                  },
                })
              ] : []),
              ...(exportOptions.showEmail ? [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Email",
                          bold: true,
                        }),
                      ],
                      spacing: { before: 120, after: 120 },
                    }),
                  ],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: "F2F2F2" },
                  margins: {
                    top: 120,
                    bottom: 120,
                    left: 120,
                    right: 120,
                  },
                })
              ] : []),
              ...(exportOptions.showPhone ? [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Phone",
                          bold: true,
                        }),
                      ],
                      spacing: { before: 120, after: 120 },
                    }),
                  ],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: "F2F2F2" },
                  margins: {
                    top: 120,
                    bottom: 120,
                    left: 120,
                    right: 120,
                  },
                })
              ] : []),
              ...(exportOptions.showAddress ? [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Address",
                          bold: true,
                        }),
                      ],
                      spacing: { before: 120, after: 120 },
                    }),
                  ],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: "F2F2F2" },
                  margins: {
                    top: 120,
                    bottom: 120,
                    left: 120,
                    right: 120,
                  },
                })
              ] : []),
              ...(exportOptions.showNotes ? [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Notes",
                          bold: true,
                        }),
                      ],
                      spacing: { before: 120, after: 120 },
                    }),
                  ],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: "F2F2F2" },
                  margins: {
                    top: 120,
                    bottom: 120,
                    left: 120,
                    right: 120,
                  },
                })
              ] : []),
            ],
          }),
          // Data rows
          ...timelineParticipants.map(participant => 
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: participant.name,
                          ...(participant.type && exportOptions.showVendorTypes ? { bold: true } : {}),
                        }),
                        ...(participant.type && exportOptions.showVendorTypes ? [
                          new TextRun({
                            text: ` ${participant.type.name}`,
                            italics: true,
                            color: "666666",
                          }),
                        ] : []),
                      ],
                      spacing: { before: 120, after: 120 },
                    }),
                  ],
                  margins: {
                    top: 120,
                    bottom: 120,
                    left: 120,
                    right: 120,
                  },
                }),
                ...(exportOptions.showContactName ? [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: participant.contactName || "",
                        spacing: { before: 120, after: 120 },
                      }),
                    ],
                    margins: {
                      top: 120,
                      bottom: 120,
                      left: 120,
                      right: 120,
                    },
                  })
                ] : []),
                ...(exportOptions.showEmail ? [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: participant.email || "",
                        spacing: { before: 120, after: 120 },
                      }),
                    ],
                    margins: {
                      top: 120,
                      bottom: 120,
                      left: 120,
                      right: 120,
                    },
                  })
                ] : []),
                ...(exportOptions.showPhone ? [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: participant.phone || "",
                        spacing: { before: 120, after: 120 },
                      }),
                    ],
                    margins: {
                      top: 120,
                      bottom: 120,
                      left: 120,
                      right: 120,
                    },
                  })
                ] : []),
                ...(exportOptions.showAddress ? [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: participant.address || "",
                        spacing: { before: 120, after: 120 },
                      }),
                    ],
                    margins: {
                      top: 120,
                      bottom: 120,
                      left: 120,
                      right: 120,
                    },
                  })
                ] : []),
                ...(exportOptions.showNotes ? [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: participant.notes || "",
                        spacing: { before: 120, after: 120 },
                      }),
                    ],
                    margins: {
                      top: 120,
                      bottom: 120,
                      left: 120,
                      right: 120,
                    },
                  })
                ] : []),
              ],
            })
          ),
        ],
      });

      tables.push(participantsTable);
    }

    // Add Timeline heading
    timelineparagraphs.push(
      new Paragraph({
        text: "Timeline",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    const items = isTemplate && propItems ? propItems : timelineItems;
    let sortedItems = [...items].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    // Fetch vendors for items if needed
    if (exportOptions.showParticipants) {
      sortedItems = await Promise.all(
        sortedItems.map(async (item) => {
          if (item.id) {
            try {
              const response = await fetch(`/api/timeline-events/${item.id}/vendors`);
              if (response.ok) {
                const vendors = await response.json();
                return { ...item, vendors };
              }
            } catch (error) {
              console.error("Error fetching vendors for item:", error);
            }
          }
          // Use type assertion to handle the vendors property
          return { ...item, vendors: (item as any).vendors || [] };
        })
      );
    }

    // Group items by category if needed
    let itemsByCategory: { [key: string]: TimelineItem[] } = {};
    
    if (exportOptions.showCategories && exportOptions.groupByCategory) {
      // Group by category first, then sort within each category
      itemsByCategory = sortedItems.reduce((acc: { [key: string]: TimelineItem[] }, item) => {
        const category = item.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});
      
      // Sort items within each category by start time
      Object.keys(itemsByCategory).forEach(category => {
        itemsByCategory[category].sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        );
      });
    } else if (exportOptions.showCategories) {
      // When showing categories but not grouping by category:
      // Create a map of category to their items but preserve overall chronological order
      
      // First, assign each item to its category for rendering headers, but keep them in chronological order
      sortedItems.forEach(item => {
        const category = item.category || "Uncategorized";
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
      });
      
      // Then use a special "ChronologicalOrder" category to maintain the time-sorted order
      itemsByCategory["ChronologicalOrder"] = sortedItems;
    } else {
      // When not showing categories, just use the chronologically sorted items
      itemsByCategory = { "All Events": sortedItems };
    }

    let currentCategory = "";

    // If we're showing categories but not grouping by category, we need to show category headers
    // but keep items in chronological order
    if (exportOptions.showCategories && !exportOptions.groupByCategory) {
      // Use a similar approach to the PDF export, tracking the current category
      let currentCategory = "";
      
      // Then render all items in chronological order
      const allItems = itemsByCategory["ChronologicalOrder"];
      allItems.forEach((item) => {
        // Show category header if category changes
        if (item.category && item.category !== currentCategory) {
          currentCategory = item.category;
          timelineparagraphs.push(
            new Paragraph({
              text: currentCategory,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 200 },
            })
          );
        }
        
        // Time and title paragraph
        const timeText = exportOptions.showEndTimes
          ? `${item.startTime} - ${item.endTime}`
          : item.startTime;
        
        const titleWithDuration = exportOptions.showDurations
          ? `${item.title} (${item.duration} minutes)`
          : item.title;
        
        timelineparagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: timeText,
                bold: true,
              }),
              new TextRun({
                text: "\t",  // Tab character
                bold: true,
              }),
              new TextRun({
                text: titleWithDuration,
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
            keepNext: true, // Keep with next paragraph
          }),
        );

        // Description paragraph
        if (exportOptions.showDescriptions && item.description) {
          timelineparagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.description,
                }),
              ],
              spacing: { line: 360 },
              keepNext: Boolean(exportOptions.showLocations && item.location), // Explicitly convert to boolean
              keepLines: true, // Keep all lines of this paragraph together
            }),
          );
        }
                        
        // Item participants paragraph
        if (exportOptions.showParticipants && 'vendors' in item && Array.isArray((item as any).vendors) && (item as any).vendors.length > 0) {
          const participantsText = (item as any).vendors.map((vendor: any) => {
            const vendorName = vendor.vendor?.name || vendor.name || "Unnamed";
            const vendorType = vendor.vendor?.type?.name || vendor.type?.name || "";
            return vendorName + (vendorType && exportOptions.showVendorTypes ? ` (${vendorType})` : "");
          }).join(" | ");
          
          timelineparagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Participants: ",
                  color: "666666",
                  italics: true,
                  bold: true,
                }),
                new TextRun({
                  text: participantsText,
                  color: "666666",
                  italics: true,
                }),
              ],
              spacing: { line: 360, after: 240 },
              keepLines: true, // Keep all lines of this paragraph together
            }),
          );
        }

        // Location paragraph
        if (exportOptions.showLocations && item.location) {
          timelineparagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Location: ",
                  color: "666666",
                  italics: true,
                  bold: true,
                }),
                new TextRun({
                  text: item.location,
                  color: "666666",
                  italics: true,
                }),
              ],
              spacing: { line: 360, after: exportOptions.showParticipants ? 0 : 240 },
              keepLines: true, // Keep all lines of this paragraph together
            }),
          );
        }
      });
    } else {
      // Normal processing for when groupByCategory is enabled or categories are disabled
      // Process each category
      for (const [category, categoryItems] of Object.entries(itemsByCategory)) {
        // Add category header if we're grouping by category
        if (exportOptions.showCategories && exportOptions.groupByCategory && category !== "All Events") {
          timelineparagraphs.push(
            new Paragraph({
              text: category,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 200 },
            })
          );
        }

        // Process each item in the category
        categoryItems.forEach((item) => {
          // Time and title paragraph
          const timeText = exportOptions.showEndTimes
            ? `${item.startTime} - ${item.endTime}`
            : item.startTime;
          
          const titleWithDuration = exportOptions.showDurations
            ? `${item.title} (${item.duration} minutes)`
            : item.title;
          
          timelineparagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: timeText,
                  bold: true,
                }),
                new TextRun({
                  text: "\t",  // Tab character
                  bold: true,
                }),
                new TextRun({
                  text: titleWithDuration,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
              keepNext: true, // Keep with next paragraph
            }),
          );

          // Description paragraph
          if (exportOptions.showDescriptions && item.description) {
            timelineparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.description,
                  }),
                ],
                spacing: { line: 360 },
                keepNext: Boolean(exportOptions.showLocations && item.location), // Explicitly convert to boolean
                keepLines: true, // Keep all lines of this paragraph together
              }),
            );
          }
                          
          // Item participants paragraph
          if (exportOptions.showParticipants && 'vendors' in item && Array.isArray((item as any).vendors) && (item as any).vendors.length > 0) {
            const participantsText = (item as any).vendors.map((vendor: any) => {
              const vendorName = vendor.vendor?.name || vendor.name || "Unnamed";
              const vendorType = vendor.vendor?.type?.name || vendor.type?.name || "";
              return vendorName + (vendorType && exportOptions.showVendorTypes ? ` (${vendorType})` : "");
            }).join(" | ");
            
            timelineparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Participants: ",
                    color: "666666",
                    italics: true,
                    bold: true,
                  }),
                  new TextRun({
                    text: participantsText,
                    color: "666666",
                    italics: true,
                  }),
                ],
                spacing: { line: 360, after: 240 },
                keepLines: true, // Keep all lines of this paragraph together
              }),
            );
          }

          // Location paragraph
          if (exportOptions.showLocations && item.location) {
            timelineparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Location: ",
                    color: "666666",
                    italics: true,
                    bold: true,
                  }),
                  new TextRun({
                    text: item.location,
                    color: "666666",
                    italics: true,
                  }),
                ],
                spacing: { line: 360, after: exportOptions.showParticipants ? 0 : 240 },
                keepLines: true, // Keep all lines of this paragraph together
              }),
            );
          }
        });
      }
    }

    // Add images section if needed
    if (exportOptions.includeImages && timelineImages && timelineImages.length > 0) {
      console.log("Starting Word document image processing:", timelineImages.length, "images");
      
      // Add a heading for the images section
      imagesparagraphs.push(
        new Paragraph({
          text: "Timeline Images",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      // Process each image
      for (let i = 0; i < timelineImages.length; i++) {
        const image = timelineImages[i];
        console.log(`Processing Word document image ${i + 1}:`, image);
        
        try {
          // Skip images with missing URLs
          if (!image || !image.imageUrl) {
            console.warn(`Image ${i + 1} has no URL, skipping`);
            imagesparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[Image ${i + 1} missing URL]`,
                    italics: true,
                    color: "FF0000",
                  }),
                ],
                spacing: { after: 240 },
              })
            );
            continue;
          }
          
          // Add image caption if available
          if (image.caption) {
            console.log(`Adding caption for image ${i + 1}:`, image.caption);
            imagesparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: image.caption,
                    bold: true,
                  }),
                ],
                spacing: { before: 200, after: 100 },
              })
            );
          }

          // Ensure proper URL format
          let imageUrl = image.imageUrl;
          if (imageUrl.startsWith("/uploads/")) {
            imageUrl = window.location.origin + imageUrl;
          }
          
          console.log(`Processing Word document image ${i + 1} from URL:`, imageUrl);
          
          try {
            // Fetch the image and convert to base64
            console.log(`Fetching image ${i + 1}...`);
            const response = await fetch(imageUrl, { 
              mode: 'cors',
              credentials: 'include',
              headers: {
                'Accept': 'image/*'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            console.log(`Image ${i + 1} fetched successfully, converting to blob...`);
            const blob = await response.blob();
            console.log(`Image ${i + 1} blob type:`, blob.type, `size:`, blob.size);
            
            // Convert blob to base64
            console.log(`Converting image ${i + 1} to base64...`);
            const base64data = await blobToBase64(blob);
            console.log(`Image ${i + 1} converted to base64 successfully, length:`, 
              typeof base64data === 'string' ? base64data.length : 'non-string');
            
            if (!base64data || typeof base64data !== 'string') {
              throw new Error('Failed to convert image to base64');
            }
            
            // Determine image type from blob or URL
            let imageType = "png"; // Default type
            if (blob.type) {
              const mimeType = blob.type.toLowerCase();
              if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
                imageType = "jpeg";
              } else if (mimeType.includes('png')) {
                imageType = "png";
              } else if (mimeType.includes('gif')) {
                imageType = "gif";
              }
            } else if (imageUrl.toLowerCase().endsWith('.jpg') || imageUrl.toLowerCase().endsWith('.jpeg')) {
              imageType = "jpeg";
            } else if (imageUrl.toLowerCase().endsWith('.gif')) {
              imageType = "gif";
            }
            
            console.log(`Adding image ${i + 1} to Word document as ${imageType}...`);
            
            // Add the image to the Word document
            const maxWidth = 600; // Maximum width in points (approximately 8.33 inches)
            
            // Calculate image dimensions while preserving aspect ratio
            const img = document.createElement('img');
            img.src = base64data;
            // Use a promise to wait for the image to load to get dimensions
            await new Promise<void>((resolve) => {
              img.onload = () => {
                console.log(`Image ${i + 1} loaded with dimensions: ${img.width}x${img.height}`);
                resolve();
              };
              img.onerror = () => {
                console.warn(`Could not determine image ${i + 1} dimensions, using default aspect ratio`);
                resolve();
              };
            });
            
            // Calculate height based on actual aspect ratio or use a default
            const aspectRatio = img.width && img.height ? img.width / img.height : 1.5;
            const calculatedHeight = maxWidth / aspectRatio;
            
            console.log(`Using aspect ratio ${aspectRatio} for image ${i + 1}, height: ${calculatedHeight}`);
            
            // Add image to document with proper settings
            imagesparagraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: base64data,
                    transformation: {
                      width: maxWidth,
                      height: calculatedHeight, // Preserve original aspect ratio
                    },
                    type: imageType as any, // Cast to satisfy TypeScript
                  }),
                ],
                spacing: { after: 300 },
                alignment: AlignmentType.CENTER,
              })
            );
            
            console.log(`Image ${i + 1} added to Word document successfully`);
          } catch (error) {
            const imgError = error as Error;
            console.error(`Error processing image ${i + 1} for Word document:`, imgError);
            
            // Add error message in red text
            imagesparagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[Image could not be loaded: ${imgError.message || 'Unknown error'}]`,
                    italics: true,
                    color: "FF0000",
                  }),
                ],
                spacing: { after: 240 },
              })
            );
          }
        } catch (e) {
          const error = e as Error;
          console.error(`Error adding image ${i + 1} to Word document:`, error);
          
          // Add error message
          imagesparagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Error processing image: ${error.message || 'Unknown error'}]`,
                  italics: true,
                  color: "FF0000", 
                }),
              ],
              spacing: { after: 240 },
            })
          );
        }
      }
      
      console.log("Word document image processing complete");
    } else {
      console.log("No images to process for Word document:", {
        includeImages: exportOptions.includeImages,
        hasTimelineImages: !!timelineImages,
        timelineImagesLength: timelineImages?.length,
      });
    }
    
    // Helper function to convert Blob to base64
    async function blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log("FileReader success, result type:", typeof reader.result);
          resolve(reader.result);
        };
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(blob);
        
        // Add timeout to prevent hanging
        setTimeout(() => {
          if (reader.readyState !== 2) {
            console.error("FileReader timed out");
            reject(new Error("FileReader timed out"));
          }
        }, 10000);
      });
    }

    // Add all paragraphs to the document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Arial",
            },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: [
            ...paragraphs,
            ...detailsparagraphs,
            ...participantsparagraphs,
            ...(tables.length > 0 ? tables : []),
            ...timelineparagraphs,
            ...imagesparagraphs,
          ],
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Page ",
                      size: 20,
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 20,
                    }),
                    new TextRun({
                      text: " of ",
                      size: 20,
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 20,
                    }),
                  ],
                }),
                ...(exportOptions.includeUserInfo && exportFooterText ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: exportFooterText,
                        size: 16,
                        color: "808080",
                      }),
                    ],
                  }),
                ] : []),
                ...(exportOptions.includeUserInfo ? [
                  // Display default footer when exportFooterText is empty
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "Created with ",
                        size: 16,
                        color: "808080",
                      }),
                      new ExternalHyperlink({
                        children: [
                          new TextRun({
                            text: "Chronolio",
                            size: 16,
                            color: "7950F2", // Purple color to match app theme
                            underline: {
                              type: UnderlineType.SINGLE,
                            },
                          }),
                        ],
                        link: "https://chronolio.com",
                      }),
                    ],
                  }),
                ] : []),
              ],
            }),
          },
        },
      ],
    });

    // Generate and save the document
    try {
      // Create a blob from the document
      const blob = await Packer.toBlob(doc);
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getFormattedFilename()}.docx`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("Word document created successfully");
      toast({
        title: "Success",
        description: "Word document created successfully",
        variant: "default",
      });
    } catch (e) {
      const error = e as Error;
      console.error("Error generating Word document:", error);
      toast({
        title: "Error",
        description: `Failed to generate Word document: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // Function to generate a formatted filename for exports
  const getFormattedFilename = () => {
    let filename = "";
    
    if (exportOptions.showHeading) {
      if (customHeading) {
        filename = customHeading;
      } else if (exportOptions.showTitle && weddingInfo.names) {
        filename = `${weddingInfo.names} Timeline`;
      } else {
        filename = `${weddingInfo.type || "Event"} Timeline`;
      }
    } else if (exportOptions.showTitle) {
      filename = weddingInfo.names
        ? `${weddingInfo.names} Timeline`
        : `${weddingInfo.type || "Event"} Timeline`;
    } else {
      filename = "Timeline";
    }

    if (exportOptions.showDate && weddingInfo.date) {
      filename += ` - ${format(new Date(weddingInfo.date), "d MMMM yyyy")}`;
    }

    return filename;
  };

  // Function to fetch timeline participants
  const fetchTimelineParticipants = async () => {
    if (!timelineId) return;
    
    try {
      const response = await fetch(`/api/timelines/${timelineId}/vendors`);
      if (!response.ok) {
        throw new Error('Failed to fetch timeline participants');
      }
      
      const data = await response.json();
      console.log('Fetched timeline participants:', data);
      
      // Process the data to ensure we have the right format with all fields
      const processedParticipants = Array.isArray(data) 
        ? data.map(item => {
            if (item.vendor) {
              return {
                id: item.vendor.id,
                name: item.vendor.name || 'Unnamed Vendor',
                contactName: item.vendor.contactName,
                email: item.vendor.email,
                phone: item.vendor.phone,
                address: item.vendor.address,
                notes: item.vendor.notes,
                type: item.vendor.type
              };
            }
            return {
              ...item,
              name: item.name || 'Unnamed Vendor'
            };
          })
        : [];
      
      setTimelineParticipants(processedParticipants);
    } catch (error) {
      console.error('Error fetching timeline participants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch timeline participants for export",
        variant: "destructive",
      });
    }
  };

  // Function to handle opening the export dialog
  const handleOpenExportDialog = () => {
    setShowExportDialog(true);
    // Fetch participants if needed
    if (timelineParticipants.length === 0 && !isTemplate) {
      fetchTimelineParticipants();
    }
    // Generate preview
    generatePreview().then((preview) => setPreviewContent(preview));
  };

  // Add this function to the component
  const refreshTimelineItemVendors = () => {
    // Use setTimeout to ensure this runs after the current render cycle
    setTimeout(() => {
      // Refresh all timeline item participant selectors
      const timelineItems = document.querySelectorAll('.timeline-item');
      timelineItems.forEach(item => {
        const vendorSelector = item.querySelector('.vendor-section');
        if (vendorSelector) {
          // Force a re-render by adding and removing a class
          vendorSelector.classList.add('refreshing');
          setTimeout(() => {
            vendorSelector.classList.remove('refreshing');
          }, 100);
        }
      });
    }, 100);
  };

  const createPdf = async (items: TimelineItem[], weddingInfo: WeddingInfo) => {
    try {
      // Fetch vendors for items if needed
      let itemsWithVendors = [...items];
      if (exportOptions.showParticipants) {
        itemsWithVendors = await Promise.all(
          items.map(async (item) => {
            if (item.id) {
              try {
                const response = await fetch(`/api/timeline-events/${item.id}/vendors`);
                if (response.ok) {
                  const vendors = await response.json();
                  console.log(`Fetched vendors for item ${item.id}:`, vendors);
                  return { ...item, vendors };
                }
              } catch (error) {
                console.error("Error fetching vendors for item:", error);
              }
            }
            return item;
          })
        );
      }

      const doc = new jsPDF();
      let yPos = 20;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;
      let currentPage = 1;

      // Set title
      doc.setFontSize(24);
      doc.text(weddingInfo.title || "Timeline", doc.internal.pageSize.width / 2, yPos, {
        align: "center",
      });
      yPos += 15;

      // Helper function to check if we need a new page
      const checkAndAddPage = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          yPos = 20;
          return true;
        }
        return false;
      };

      // Add custom fields
      const selectedEventType = reduxEventTypes.find(et => et.type === weddingInfo.type);
      if (exportOptions.showAdditionalDetails && selectedEventType?.customFields) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        selectedEventType.customFields.forEach(field => {
          const value = weddingInfo.customFieldValues?.[field.id];
          if (value !== undefined && value !== null) {
            let displayValue = value;
            if (field.type === 'date') {
              displayValue = format(new Date(value as string), 'PPP');
            } else if (field.type === 'boolean') {
              displayValue = value ? 'Yes' : 'No';
            }
            
            if (field.type === 'textarea') {
              // For textarea fields, display the field name first
              checkAndAddPage(8);
              doc.setFont('helvetica', 'bold');
              doc.text(`${field.name}:`, margin, yPos);
              yPos += 6;
              
              // Split the text by newlines and display each line with indentation
              doc.setFont('helvetica', 'normal');
              const lines = String(displayValue).split('\n');
              
              // Calculate total height needed for all lines
              let totalLinesHeight = 0;
              const processedLines: string[] = [];
              
              // Process each line and calculate total height
              for (const line of lines) {
                // Split long lines to fit the page width
                const wrappedLines = doc.splitTextToSize(line, pageWidth - margin * 2 - 10);
                processedLines.push(...wrappedLines);
                totalLinesHeight += wrappedLines.length * 5;
              }
              
              // Check if we need a new page for the entire text block
              if (yPos + totalLinesHeight > pageHeight - margin * 2) {
                doc.addPage();
                currentPage++;
                yPos = 20;
              }
              
              // Now render all lines
              for (const wrappedLine of processedLines) {
                doc.text(wrappedLine, margin + 10, yPos);
                yPos += 5;
              }
              
              yPos += 5; // Add extra space after multi-line text
            } else {
              // For other field types, use the original format
              checkAndAddPage(8);
              doc.setFont('helvetica', 'bold');
              const fieldText = `${field.name}:`;
              doc.text(fieldText, margin, yPos);
              // Get the actual width of the fieldText
              const textWidth = doc.getTextWidth(fieldText);
              doc.setFont('helvetica', 'normal');
              doc.text(` ${displayValue}`, margin + textWidth, yPos);
              yPos += 8;
            }
          }
        });
        yPos += 10; // Add extra space after all custom fields
      }

      // Group items by category if needed
      const groupedItems = exportOptions.showCategories
        ? itemsWithVendors.reduce((acc: { [key: string]: TimelineItem[] }, item) => {
            const category = item.category || "Uncategorized";
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(item);
            return acc;
          }, {})
        : { "All Events": itemsWithVendors };

      for (const [category, categoryItems] of Object.entries(groupedItems)) {
        // Add category header if showing categories
        if (exportOptions.showCategories) {
          doc.setFontSize(16);
          doc.text(category, margin, yPos);
          yPos += 10;
        }

        // Process each item
        for (const item of categoryItems) {
          const itemHeight = 10 + (exportOptions.showDescriptions && item.description ? 5 : 0);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const timeText = exportOptions.showEndTimes
            ? `${item.startTime} - ${item.endTime}`
            : item.startTime;
          doc.text(`${timeText}: ${item.title}`, margin, yPos);
          yPos += 5;

          // Additional details
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);

          if (exportOptions.showDurations) {
            doc.text(`Duration: ${item.duration} minutes`, margin + 5, yPos);
            yPos += 5;
          }

          if (exportOptions.showLocations && item.location) {
            doc.text(`Location: ${item.location}`, margin + 5, yPos);
            yPos += 5;
          }

          if (exportOptions.showDescriptions && item.description) {
            doc.text(`Description: ${item.description}`, margin + 5, yPos);
            yPos += 5;
          }

          // Add vendor information
          if (exportOptions.showParticipants && 'vendors' in item && Array.isArray((item as any).vendors) && (item as any).vendors.length > 0) {
            const vendorsText = (item as any).vendors
              .map((v: any) => {
                const vendorName = v.vendor?.name || v.name || "Unnamed";
                const vendorType = v.vendor?.type?.name || v.type?.name || "";
                return vendorName + (vendorType && exportOptions.showVendorTypes ? ` (${vendorType})` : "");
              })
              .join(" | ");
            
            const participantLines = doc.splitTextToSize(
              `Participants: ${vendorsText}`,
              pageWidth - (margin * 2) - 40
            );
            
            doc.text(participantLines, margin + 5, yPos);
            yPos += participantLines.length * 5;
          }

          yPos += 5; // Add space between items
        }
      }

      // Save the PDF
      doc.save(`${getFormattedFilename()}.pdf`);
    } catch (e) {
      const error = e as Error;
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: `Failed to generate PDF: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  };
  

  // Function to handle updating timeline items
  const handleUpdateItem = (id: string, updates: Partial<TimelineItem>) => {
    if (isTemplate && setTemplateItems && propItems) {
      const updatedItems = propItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      );
      setTemplateItems(updatedItems);
    } else {
      dispatch(updateItem({ id, updates }));
    }
  };
  
  // Function to handle deleting timeline items
  const handleDeleteItem = (id: string) => {
    if (onDeleteItem) {
      onDeleteItem(id);
    } else {
      dispatch(deleteItem(id));
    }
  };
  
  // Function to handle moving timeline items
  const handleMoveItem = (dragIndex: number, hoverIndex: number) => {
    dispatch(moveItem({ dragIndex, hoverIndex }));
  };
  
  // Function to handle category toggle
  const handleCategoryToggle = async (checked: boolean) => {
    setLocalShowCategories(checked);
    setShowCategories(checked);
  };
  
  // Update the time shift handler
  const handleTimeShift = (minutes: { minutes: number }) => {
    const selectedItemsCount = selectedItems.length;
    
    // Ensure we're in bulk edit mode when shifting times
    if (!sessionStorage.getItem('bulkEditActive')) {
      sessionStorage.setItem('bulkEditActive', 'true');
      
      // Store timeline ID if not already set
      if (!sessionStorage.getItem('editingTimelineId') && timelineId) {
        sessionStorage.setItem('editingTimelineId', timelineId.toString());
      }
      
      // Store categories state if not already preserved
      if (!sessionStorage.getItem('preservedCategoriesState')) {
        sessionStorage.setItem('preservedCategoriesState', showCategories ? 'true' : 'false');
      }
    }
    
    console.log('[DEBUG] Time shift operation - using sessionStorage to maintain state');
    
    dispatch(adjustSelectedTimes(minutes));
    
    // Show toast notification
    const direction = minutes.minutes > 0 ? "later" : "earlier";
    const absoluteMinutes = Math.abs(minutes.minutes);
    toast({
      title: `Time Adjusted`,
      description: `${selectedItemsCount} item${selectedItemsCount !== 1 ? 's' : ''} moved ${absoluteMinutes} minute${absoluteMinutes !== 1 ? 's' : ''} ${direction}`,
      variant: "default",
    });
  };
  
  // Function to handle selecting all items in a category
  const handleSelectAllInCategory = (category: string) => {
    dispatch(selectAllInCategory(category));
  };
  
  // Function to handle clearing selection
  const handleClearSelection = () => {
    dispatch(clearSelection());
  };
  
  // Function to handle deleting selected items
  const handleDeleteSelected = () => {
    dispatch(deleteSelectedItems());
  };
  
  // Function to handle updating custom fields
  const handleUpdateCustomFields = (
    itemId: string,
    customFieldValues: Record<string, string | number | boolean | null>,
  ) => {
    if (isTemplate && propItems && setTemplateItems) {
      const updatedItems = [...propItems];
      const itemIndex = updatedItems.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          customFieldValues,
        };
      }
      setTemplateItems(updatedItems);
    } else {
      // @ts-ignore - customFieldValues is used in the component but not in the Redux store
      dispatch(updateItem({ id: itemId, updates: { customFieldValues } }));
    }
  };

  // Export dialog UI
  const renderExportDialog = () => (
    <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
      <DialogContent className="max-w-[600px] p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>{shareUrl ? "Update Export Settings" : "Export Timeline"}</DialogTitle>
          <DialogDescription>
            Choose your export options and click "Export" to download your timeline in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className={`grid w-full ${isTrial ? 'grid-cols-2' : (!isTemplate ? 'grid-cols-4' : 'grid-cols-2')} mb-2`}>
              <TabsTrigger value="general" className="text-sm sm:text-base">General</TabsTrigger>
              {!isTemplate && !isTrial && <TabsTrigger value="participants" className="text-sm sm:text-base">Participants</TabsTrigger>}
              <TabsTrigger value="items" className="text-sm sm:text-base">Items</TabsTrigger>
              {!isTemplate && !isTrial && <TabsTrigger value="images" className="text-sm sm:text-base">Images</TabsTrigger>}
            </TabsList>
            
            {/* General Tab */}
            <TabsContent value="general" className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-heading"
                    checked={exportOptions.showHeading}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showHeading: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-heading" className="text-sm">Show Heading</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-title"
                    checked={exportOptions.showTitle}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showTitle: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-title" className="text-sm">Show Title</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-date"
                    checked={exportOptions.showDate}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showDate: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-date" className="text-sm">Show Date</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-location"
                    checked={exportOptions.showLocation}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showLocation: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-location" className="text-sm">Show Location</Label>
                </div>
                
                {!isTrial && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-additional-details"
                      checked={exportOptions.showAdditionalDetails}
                      onCheckedChange={(checked) =>
                        setExportOptions({
                          ...exportOptions,
                          showAdditionalDetails: checked,
                        })
                      }
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-additional-details" className="text-sm">Show Additional Details</Label>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-user-info"
                    checked={exportOptions.includeUserInfo}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        includeUserInfo: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="include-user-info" className="text-sm">Include Footer</Label>
                </div>
                
                {exportOptions.showHeading && (
                  <div className="col-span-1 sm:col-span-2 mt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Label htmlFor="custom-heading" className="text-xs whitespace-nowrap">Custom Heading:</Label>
                      <Input
                        id="custom-heading"
                        placeholder={`${weddingInfo.type || "Event"} Timeline`}
                        value={customHeading}
                        onChange={(e) => setCustomHeading(e.target.value)}
                        className="h-8 text-sm w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Participants Tab */}
            {!isTemplate && (
              <TabsContent value="participants" className="mt-2">
                <div className="grid gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-participants"
                      checked={exportOptions.showParticipants}
                      onCheckedChange={(checked) =>
                        setExportOptions({
                          ...exportOptions,
                          showParticipants: checked,
                        })
                      }
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-participants" className="text-sm">Show Participants Table</Label>
                  </div>
                  
                  {exportOptions.showParticipants && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pl-6 border-l-2 border-purple-100 dark:border-purple-900/30">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-contact-name"
                          checked={exportOptions.showContactName}
                          onCheckedChange={(checked) =>
                            setExportOptions({
                              ...exportOptions,
                              showContactName: checked,
                            })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor="show-contact-name" className="text-sm">Show Contact Name</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-email"
                          checked={exportOptions.showEmail}
                          onCheckedChange={(checked) =>
                            setExportOptions({
                              ...exportOptions,
                              showEmail: checked,
                            })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor="show-email" className="text-sm">Show Email</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-phone"
                          checked={exportOptions.showPhone}
                          onCheckedChange={(checked) =>
                            setExportOptions({
                              ...exportOptions,
                              showPhone: checked,
                            })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor="show-phone" className="text-sm">Show Phone</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-address"
                          checked={exportOptions.showAddress}
                          onCheckedChange={(checked) =>
                            setExportOptions({
                              ...exportOptions,
                              showAddress: checked,
                            })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor="show-address" className="text-sm">Show Address</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-notes"
                          checked={exportOptions.showNotes}
                          onCheckedChange={(checked) =>
                            setExportOptions({
                              ...exportOptions,
                              showNotes: checked,
                            })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor="show-notes" className="text-sm">Show Notes</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-vendor-types"
                          checked={exportOptions.showVendorTypes}
                          onCheckedChange={(checked) =>
                            setExportOptions({
                              ...exportOptions,
                              showVendorTypes: checked,
                            })
                          }
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor="show-vendor-types" className="text-sm">Show Participant Types</Label>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
            
            {/* Items Tab */}
            <TabsContent value="items" className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-categories"
                    checked={exportOptions.showCategories}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showCategories: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-categories" className="text-sm">Show Categories</Label>
                </div>

                {exportOptions.showCategories && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="group-by-category"
                      checked={exportOptions.groupByCategory}
                      onCheckedChange={(checked) =>
                        setExportOptions({
                          ...exportOptions,
                          groupByCategory: checked,
                        })
                      }
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="group-by-category" className="text-sm">Group Items By Category</Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-durations"
                    checked={exportOptions.showDurations}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showDurations: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-durations" className="text-sm">Show Durations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-descriptions"
                    checked={exportOptions.showDescriptions}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showDescriptions: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-descriptions" className="text-sm">Show Descriptions</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-locations"
                    checked={exportOptions.showLocations}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showLocations: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-locations" className="text-sm">Show Locations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-end-times"
                    checked={exportOptions.showEndTimes}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showEndTimes: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-end-times" className="text-sm">Show End Times</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-icons"
                    checked={exportOptions.showIcons}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        showIcons: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="show-icons" className="text-sm">Show Icons</Label>
                </div>
                
                {!isTrial && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-item-participants"
                      checked={exportOptions.showItemParticipants}
                      onCheckedChange={(checked) =>
                        setExportOptions({
                          ...exportOptions,
                          showItemParticipants: checked,
                        })
                      }
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-item-participants" className="text-sm">Show Participants</Label>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Images Tab */}
            {!isTemplate && (
              <TabsContent value="images" className="mt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-images"
                    checked={exportOptions.includeImages}
                    onCheckedChange={(checked) =>
                      setExportOptions({
                        ...exportOptions,
                        includeImages: checked,
                      })
                    }
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <Label htmlFor="include-images" className="text-sm">Include Images</Label>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Export section for all users */}
          <div className="w-full mt-4">
            {isTrial ? (
              // For trial users - show export buttons directly without tabs
              <>
                <h3 className="text-base font-medium mb-2">Export Options</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    onClick={exportToCSV}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
                    size="sm"
                  >
                    <FileText className="mr-1 h-4 w-4 text-white" />
                    CSV
                  </Button>
                  <Button 
                    onClick={exportToPDF} 
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
                    size="sm"
                  >
                    <FileDown className="mr-1 h-4 w-4 text-white" />
                    PDF
                  </Button>
                  <Button 
                    onClick={exportToWord} 
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
                    size="sm"
                  >
                    <FileDown className="mr-1 h-4 w-4 text-white" />
                    Word
                  </Button>
                </div>
                <div className="mt-2">
                  <Button 
                    onClick={exportToXLSX} 
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium shadow-md"
                    size="sm"
                  >
                    <FileDown className="mr-1 h-4 w-4 text-white" />
                    Export to Excel
                  </Button>
                </div>
              </>
            ) : (
              // For regular users - show preview/export tabs
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview" className="text-sm sm:text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white">Preview (beta)</TabsTrigger>
                  <TabsTrigger value="export" className="text-sm sm:text-base data-[state=active]:bg-purple-600 data-[state=active]:text-white">Export</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-2">
                  <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert" 
                      dangerouslySetInnerHTML={{ __html: previewContent }}
                    />
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="export" className="mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      onClick={exportToCSV}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
                      size="sm"
                    >
                      <FileText className="mr-1 h-4 w-4 text-white" />
                      CSV
                    </Button>
                    <Button 
                      onClick={exportToPDF} 
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
                      size="sm"
                    >
                      <FileDown className="mr-1 h-4 w-4 text-white" />
                      PDF
                    </Button>
                    <Button 
                      onClick={exportToWord} 
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md"
                      size="sm"
                    >
                      <FileDown className="mr-1 h-4 w-4 text-white" />
                      Word
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Button 
                      onClick={exportToXLSX} 
                      className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium shadow-md"
                      size="sm"
                    >
                      <FileDown className="mr-1 h-4 w-4 text-white" />
                      Export to Excel
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Function to copy timeline to clipboard
  const copyToClipboard = async () => {
    const textContent = await generateTextPreview();
    navigator.clipboard
      .writeText(textContent)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Timeline copied to clipboard",
          variant: "default",
        });
      })
      .catch((error) => {
        console.error("Error copying to clipboard:", error);
        toast({
          title: "Error",
          description: "Failed to copy timeline to clipboard",
          variant: "destructive",
        });
      });
  };

  // Update bulk edit button click handler
  const handleToggleBulkEditMode = () => {
    const newBulkEditMode = !bulkEditMode;
    
    // Simple flags in sessionStorage - no timeouts
    if (newBulkEditMode) {
      // Store bulk edit status in sessionStorage
      console.log('[DEBUG] Entering bulk edit mode - using sessionStorage to track state');
      
      // Store the timeline's original categories state
      sessionStorage.setItem('bulkEditActive', 'true');
      sessionStorage.setItem('preservedCategoriesState', showCategories ? 'true' : 'false');
      sessionStorage.setItem('editingTimelineId', timelineId?.toString() || '');
    } else {
      // Clear bulk edit status
      console.log('[DEBUG] Exiting bulk edit mode - cleaning up sessionStorage');
      sessionStorage.removeItem('bulkEditActive');
      sessionStorage.removeItem('editingTimelineId');
      
      // Don't immediately clear preservedCategoriesState to allow it to be used in final state
    }
    
    dispatch(setBulkEditMode(newBulkEditMode));
  };

  // Update useEffect to sync UI with the preserved categories state
  useEffect(() => {
    if (bulkEditMode) {
      // Check for preserved categories state in sessionStorage
      const preservedState = sessionStorage.getItem('preservedCategoriesState');
      if (preservedState === 'true' || preservedState === 'false') {
        const preserved = preservedState === 'true';
        // Ensure the UI reflects the preserved categories state
        setShowCategories(preserved);
        console.log(`[DEBUG] Using preserved categories state from sessionStorage: ${preserved}`);
      }
    } else {
      // When exiting bulk edit mode, restore categories if needed
      const preservedState = sessionStorage.getItem('preservedCategoriesState');
      if (preservedState === 'true' || preservedState === 'false') {
        const preserved = preservedState === 'true';
        setShowCategories(preserved);
        console.log(`[DEBUG] Restoring categories state on exit: ${preserved}`);
        
        // Clear the preserved state after using it on exit
        setTimeout(() => {
          sessionStorage.removeItem('preservedCategoriesState');
        }, 500);
      }
    }
  }, [bulkEditMode, setShowCategories]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {weddingInfo.names || "Untitled Timeline"}
          </h1>
          {weddingInfo.date && (
            <span className="text-muted-foreground">
              • {format(new Date(weddingInfo.date), "EEE, d MMMM yyyy")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isTemplate && (
            <>
              {/* Templates button - hide in trial mode */}
              {!isTrial && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveTemplateDialogOpen(true)}
                  className="bg-white dark:bg-zinc-900"
                >
                  <FileText className="w-4 h-4 mr-2 text-purple-600" />
                  Templates
                </Button>
              )}
              
              {/* Export button - always show but in trial mode trigger parent's export function */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isTrial) {
                    if (emailSubmitted) {
                      // Email already collected, proceed to export
                      setShowExportDialog(true);
                    } else {
                      // Show email collection dialog
                      setShowEmailDialog(true);
                    }
                  } else {
                    // In normal mode, use the built-in export dialog
                    setShowExportDialog(true);
                  }
                }}
                className="bg-white dark:bg-zinc-900"
              >
                <Download className="w-4 h-4 mr-2 text-purple-600" />
                Export
              </Button>
              
              {/* Share button - hide in trial mode */}
              {!isTrial && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareButtonClick}
                  className="bg-white dark:bg-zinc-900"
                >
                  <Share2 className="w-4 h-4 mr-2 text-purple-600" />
                  Share
                </Button>
              )}
            </>
          )}
          {isTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="bg-white dark:bg-zinc-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2 text-purple-600" />
              Back to Templates
            </Button>
          )}
        </div>
      </div>

      {!isTemplate && (
          <><div className="mt-4 border-t pt-4">
      </div>
          {/* Event Overview section with heading */}
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
              onClick={() => setShowTimelineInfo(!showTimelineInfo)}
            >
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
                <h3 className="text-lg font-medium">Event Overview</h3>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-purple-600 transition-transform ${
                  showTimelineInfo ? "transform rotate-180" : ""
                }`}
              />
            </div>
            
            {showTimelineInfo && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full max-w-2xl">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Timeline Name"
                        value={weddingInfo.names || ""}
                        onChange={(e) =>
                          dispatch(
                            updateWeddingInfo({
                              names: e.target.value,
                              date: weddingInfo.date,
                              type: weddingInfo.type,
                              location: weddingInfo.location,
                              customFieldValues: weddingInfo.customFieldValues,
                            }),
                          )
                        }
                        className="text-xl text-center font-semibold pl-10 pr-10 h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-gray-700"
                      />
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-600" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-12 text-left font-medium justify-start relative pl-10"
                        >
                          <CalendarIcon className="absolute left-3 h-5 w-5 text-purple-600" />
                          {weddingInfo.date ? (
                            format(new Date(weddingInfo.date), "EEE, d MMMM yyyy")
                          ) : (
                            <span className="text-muted-foreground">Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={weddingInfo.date ? new Date(weddingInfo.date) : undefined}
                          defaultMonth={weddingInfo.date ? new Date(weddingInfo.date) : undefined}
                          onSelect={(date) =>
                            dispatch(
                              updateWeddingInfo({
                                date: date ? format(date, "yyyy-MM-dd") : undefined,
                                names: weddingInfo.names,
                                type: weddingInfo.type,
                                location: weddingInfo.location,
                                customFieldValues: weddingInfo.customFieldValues,
                              }),
                            )
                          }
                          initialFocus
                          className="border-none"
                          classNames={{
                            day_selected: "bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus:bg-purple-600 focus:text-white",
                            day_today: "bg-purple-100 text-purple-900",
                          }}
                        />
                      </PopoverContent>
                    </Popover>

                    <Select
                      value={weddingInfo.type || ""}
                      onValueChange={(value) =>
                        dispatch(
                          updateWeddingInfo({
                            type: value,
                            date: weddingInfo.date,
                            names: weddingInfo.names,
                            location: weddingInfo.location,
                            customFieldValues: weddingInfo.customFieldValues,
                          }),
                        )
                      }
                    >
                      <SelectTrigger className="h-12 pl-10 relative bg-gray-50 dark:bg-zinc-900">
                        <List className="absolute left-3 h-5 w-5 text-purple-600" />
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reduxEventTypes.map((eventType: any) => (
                          <SelectItem
                            key={eventType.type}
                            value={eventType.type}
                            className="font-medium"
                          >
                            {eventType.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Location"
                        value={weddingInfo.location || ""}
                        onChange={(e) =>
                          dispatch(
                            updateWeddingInfo({
                              location: e.target.value,
                              date: weddingInfo.date,
                              type: weddingInfo.type,
                              names: weddingInfo.names,
                              customFieldValues: weddingInfo.customFieldValues,
                            }),
                          )
                        }
                        className="pl-10 h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-gray-700"
                      />
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Update Timeline Details section to match Categories style and make it expandable */}
          {timelineItems.length > 0 && reduxEventTypes
            .find((et) => et.type === weddingInfo.type)
            ?.customFields?.length > 0 && (
            <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
                onClick={() => setShowTimelineDetails(!showTimelineDetails)}
              >
                <div className="flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-purple-600" />
                  <h3 className="text-lg font-medium">Additional Details</h3>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-purple-600 transition-transform ${
                    showTimelineDetails ? "transform rotate-180" : ""
                  }`}
                />
              </div>
              {showTimelineDetails && (
                <div className="p-6">
                  <div className="space-y-4">
                    {reduxEventTypes
                      .find((et) => et.type === weddingInfo.type)
                      ?.customFields?.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>{field.name}</Label>
                          {field.type === "text" && (
                            <Input
                              id={field.id}
                              value={
                                // @ts-ignore - Type compatibility issue with custom fields
                                weddingInfo.customFieldValues?.[field.id] ??
                                field.defaultValue ??
                                ""
                              }
                              onChange={(e) =>
                                dispatch(
                                  updateWeddingInfo({
                                    ...weddingInfo,
                                    customFieldValues: {
                                      ...(weddingInfo.customFieldValues || {}),
                                      [field.id]: e.target.value,
                                    },
                                  }),
                                )
                              }
                              className="w-full"
                            />
                          )}
                          {field.type === "textarea" && (
                            <textarea
                              id={field.id}
                              value={
                                // @ts-ignore - Type compatibility issue with custom fields
                                weddingInfo.customFieldValues?.[field.id] ??
                                field.defaultValue ??
                                ""
                              }
                              onChange={(e) =>
                                dispatch(
                                  updateWeddingInfo({
                                    ...weddingInfo,
                                    customFieldValues: {
                                      ...(weddingInfo.customFieldValues || {}),
                                      [field.id]: e.target.value,
                                    },
                                  }),
                                )
                              }
                              className="w-full min-h-[100px] p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          )}
                          {field.type === "number" && (
                            <Input
                              id={field.id}
                              type="number"
                              value={
                                // @ts-ignore - Type compatibility issue with custom fields
                                weddingInfo.customFieldValues?.[field.id] ??
                                field.defaultValue ??
                                ""
                              }
                              onChange={(e) =>
                                dispatch(
                                  updateWeddingInfo({
                                    ...weddingInfo,
                                    customFieldValues: {
                                      ...(weddingInfo.customFieldValues || {}),
                                      [field.id]: parseFloat(e.target.value),
                                    },
                                  }),
                                )
                              }
                              className="w-full"
                            />
                          )}
                          {field.type === "boolean" && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={field.id}
                                checked={
                                  // @ts-ignore - Type compatibility issue with custom fields
                                  weddingInfo.customFieldValues?.[field.id] ??
                                  field.defaultValue ??
                                  false
                                }
                                onCheckedChange={(checked) =>
                                  dispatch(
                                    updateWeddingInfo({
                                      ...weddingInfo,
                                      customFieldValues: {
                                        ...(weddingInfo.customFieldValues || {}),
                                        [field.id]: checked,
                                      },
                                    }),
                                  )
                                }
                              />
                              <Label htmlFor={field.id}>Enabled</Label>
                            </div>
                          )}
                          {field.type === "date" && (
                            <div className="grid gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !weddingInfo.customFieldValues?.[field.id] &&
                                        "text-muted-foreground",
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
                                    {weddingInfo.customFieldValues?.[field.id] ? (
                                      format(
                                        new Date(
                                          weddingInfo.customFieldValues[
                                            field.id
                                          ] as string,
                                        ),
                                        "PPP",
                                      )
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={
                                      weddingInfo.customFieldValues?.[field.id]
                                        ? new Date(
                                            weddingInfo.customFieldValues[
                                              field.id
                                            ] as string,
                                          )
                                        : undefined
                                    }
                                    onSelect={(date) =>
                                      dispatch(
                                        updateWeddingInfo({
                                          ...weddingInfo,
                                          customFieldValues: {
                                            ...(weddingInfo.customFieldValues || {}),
                                            [field.id]: date?.toISOString(),
                                          },
                                        }),
                                      )
                                    }
                                    initialFocus
                                    className="border-none"
                                    classNames={{
                                      day_selected: "bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus:bg-purple-600 focus:text-white",
                                      day_today: "bg-purple-100 text-purple-900",
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings section with heading */}
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
              onClick={() => setShowSettings(!showSettings)}
            >
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-purple-600" />
                <h3 className="text-lg font-medium">Settings</h3>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-purple-600 transition-transform ${
                  showSettings ? "transform rotate-180" : ""
                }`}
              />
            </div>
            {showSettings && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-categories"
                      checked={showCategories}
                      onCheckedChange={handleCategoryToggle}
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-categories" className="text-base font-medium">Enable Categories</Label>
                  </div>

                  {/* Participants toggle - hide in trial mode */}
                  {!isTemplate && !isTrial && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-vendors"
                        checked={showVendors}
                        onCheckedChange={(checked) => setShowVendors(checked)}
                        className="data-[state=checked]:bg-purple-600"
                      />
                      <Label htmlFor="show-vendors" className="text-base font-medium">Enable Participants</Label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Categories Section - moved below Timeline Details */}
          {(showCategories || isTemplate) && (
            <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
              <div 
                className="p-3 flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
                onClick={() => setShowCategoriesSection(!showCategoriesSection)}
              >
                <div className="flex items-center">
                  <Layers className="h-5 w-5 mr-2 text-purple-600" />
                  <h3 className="text-lg font-medium">Categories</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCategory();
                    }}
                    className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
                  >
                    <Plus className="h-4 w-4 mr-2 text-purple-600" />
                    Add Category
                  </Button>
                  <ChevronDown
                    className={`h-5 w-5 text-purple-600 transition-transform ${
                      showCategoriesSection ? "transform rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
              {showCategoriesSection && (
                <div className="p-3">
                  {categories.length === 0 ? (
                    <div className="text-center py-3 text-muted-foreground">
                      No categories yet. Add one to organize your timeline.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((category, index) => (
                        <CategoryItem
                          key={category.id}
                          category={category}
                          index={index}
                          onEdit={() => {
                            setEditingCategory(category);
                            setShowCategoryDialog(true);
                          }}
                          onDelete={() => handleDeleteCategory(category.id)}
                          moveCategory={moveCategory}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Timeline Vendors section */}
      {!isTemplate && showVendors && (
        <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
            onClick={() => setShowVendorsContent(!showVendorsContent)}
          >
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              <h3 className="text-lg font-medium">Participants</h3>
            </div>
            <div className="flex items-center gap-2">
              <VendorSelector 
                timelineId={timelineId !== null ? timelineId : undefined} 
                isTimelineVendor={true}
                onVendorsChange={() => {
                  // Force refresh of all timeline items to show updated participants
                  setStateItems(prevItems => [...prevItems]);
                  
                  // Refresh the participant display
                  if (timelineVendorDisplayRef.current) {
                    timelineVendorDisplayRef.current.refreshVendors();
                  }
                  
                  // Refresh all timeline item participant selectors
                  refreshTimelineItemVendors();
                }}
                buttonLabel="Add Participants"
              />
              <ChevronDown
                className={`h-5 w-5 text-purple-600 transition-transform ${
                  showVendorsContent ? "transform rotate-180" : ""
                }`}
              />
            </div>
          </div>
          {showVendorsContent && (
            <div className="p-4">
              <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-md border border-gray-200 dark:border-gray-600">
                <VendorSelectorDisplay 
                  timelineId={timelineId !== null ? timelineId : undefined} 
                  isTimelineVendor={true}
                  showEditHint={false}
                  ref={timelineVendorDisplayRef}
                  showVendorTypes={showVendorTypes}
                />
              </div>
            </div>
          )}
        </div>
      )}
          
          <div className="mt-8 border-t pt-8">
                <h2 className="text-2xl font-serif mb-6">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Items</span>
                </h2>
          </div>


          {/* Timeline Items section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleBulkEditMode}
                className={bulkEditMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-white dark:bg-zinc-900"}
              >
                <Edit2 className={`h-4 w-4 mr-2 ${bulkEditMode ? 'text-white' : 'text-purple-600'}`} />
                {bulkEditMode ? "Exit Bulk Edit" : "Bulk Edit"}
              </Button>
              {!isTemplate && showVendors && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkVendorDialog(true)}
                  className="bg-white dark:bg-zinc-900"
                >
                  <Users className="h-4 w-4 mr-2 text-purple-600" />
                  Bulk Assign
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(undo())}
                disabled={!canUndo}
                className="bg-white dark:bg-zinc-900"
              >
                <Undo2 className="w-4 h-4 mr-2 text-purple-600" /> Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(redo())}
                disabled={!canRedo}
                className="bg-white dark:bg-zinc-900"
              >
                <Redo2 className="w-4 h-4 mr-2 text-purple-600" /> Redo
              </Button>
            </div>
          </div>

      {/* Bulk Edit Controls */}
      {bulkEditMode && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
          <BulkEditControls
            onTimeShift={handleTimeShift}
            timeAdjustments={[5, 10, 15, 20, 25, 30, 40, 50, 60]}
            onSelectAllInCategory={handleSelectAllInCategory}
            onClearSelection={handleClearSelection}
            selectedCount={selectedItems.length}
            categories={categories}
            onDeleteSelected={handleDeleteSelected}
          />
        </div>
      )}
      
{/* View Options section with heading */}
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
              onClick={() => setShowViewOptions(!showViewOptions)}
            >
              <div className="flex items-center">
                <Eye className="h-5 w-5 mr-2 text-purple-600" />
                <h3 className="text-lg font-medium">View Options</h3>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-purple-600 transition-transform ${
                  showViewOptions ? "transform rotate-180" : ""
                }`}
              />
            </div>
            {showViewOptions && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-descriptions"
                      checked={showDescriptions}
                      onCheckedChange={(checked) => setShowDescriptions(checked)}
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-descriptions" className="text-base font-medium">Descriptions</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-locations"
                      checked={showLocations}
                      onCheckedChange={(checked) => setShowLocations(checked)}
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-locations" className="text-base font-medium">Locations</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-end-times"
                      checked={showEndTimes}
                      onCheckedChange={(checked) => setShowEndTimes(checked)}
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-end-times" className="text-base font-medium">End Times</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-durations"
                      checked={showDurations}
                      onCheckedChange={(checked) => setShowDurations(checked)}
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-durations" className="text-base font-medium">Durations</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-icons"
                      checked={showIcons}
                      onCheckedChange={(checked) => setShowIcons(checked)}
                      className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="show-icons" className="text-base font-medium">Icons</Label>
                  </div>

                  {showCategories && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-categories-on-items"
                        checked={showCategoriesOnItems}
                        onCheckedChange={(checked) => setShowCategoriesOnItems(checked)}
                        className="data-[state=checked]:bg-purple-600"
                      />
                      <Label htmlFor="show-categories-on-items" className="text-base font-medium">Categories</Label>
                    </div>
                  )}

                  {showVendors && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-vendors-on-items"
                        checked={showVendorsOnItems}
                        onCheckedChange={(checked) => setShowVendorsOnItems(checked)}
                        className="data-[state=checked]:bg-purple-600"
                      />
                      <Label htmlFor="show-vendors-on-items" className="text-base font-medium">Participants</Label>
                    </div>
                  )}

                  {showVendors && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-vendor-types"
                        checked={showVendorTypes}
                        onCheckedChange={(checked) => setShowVendorTypes(checked)}
                        className="data-[state=checked]:bg-purple-600"
                      />
                      <Label htmlFor="show-vendor-types" className="text-base font-medium">Show Participant Types</Label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

      {/* Timeline Items */}
      <div className="space-y-4">
        <TimelineView
          items={timelineItems}
          categories={categories}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onMoveItem={handleMoveItem}
          onAddItem={handleAddItem}
          newItemId={localNewItemId}
          bulkEditMode={bulkEditMode}
          selectedItems={selectedItems}
          onSelectItem={(id) => dispatch(toggleItemSelection(id))}
          showCategories={showCategories}
          showLocations={showLocations}
          showDescriptions={showDescriptions}
          showEndTimes={showEndTimes}
          showDurations={showDurations}
          showIcons={showIcons}
          showCategoriesOnItems={showCategoriesOnItems}
          showVendorsOnItems={showVendorsOnItems}
          showVendorTypes={showVendorTypes}
          timelineId={timelineId !== null ? timelineId : undefined}
          showVendors={showVendors}
          onUpdateCustomFields={handleUpdateCustomFields}
          isPublicView={false}
        />
      </div>

      {/* Category Edit Dialog */}
      <CategoryEditDialog
        category={editingCategory || { id: "", name: "", description: "", order: 0 }}
        onSave={handleEditCategory}
        onCancel={() => setShowCategoryDialog(false)}
        open={showCategoryDialog}
      />

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all timeline data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-purple-600 hover:bg-purple-700">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Template Dialog */}
      <AlertDialog
        open={showTemplateConfirmDialog}
        onOpenChange={setShowTemplateConfirmDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current timeline with the selected template.
              Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleTemplateConfirm}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Templates Dialog */}
      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>
              Apply a template to your timeline or create a new one
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <h3 className="font-medium text-purple-600">Available Templates</h3>
            {templates.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No templates available. Save your timeline as a template to create one.
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 rounded-md border hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-zinc-900 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">{template.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {template.events?.length || 0} events
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        applyTemplate(template.id);
                        setSaveTemplateDialogOpen(false);
                      }}
                      className="bg-white hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      {renderExportDialog()}

      {showBulkVendorDialog && timelineId && timelineId > 0 && (
        <VendorBulkAssignDialog
          timelineId={timelineId !== null ? timelineId : undefined}
          items={stateItems}
          open={showBulkVendorDialog}
          onOpenChange={(open) => {
            setShowBulkVendorDialog(open);
            if (!open) {
              // When dialog closes, refresh all timeline items to show updated participants
              setStateItems(prevItems => [...prevItems]);
              refreshTimelineItemVendors();
            }
          }}
        />
      )}

      {/* Email Collection Dialog for Trial Users */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Your Email to Export</DialogTitle>
            <DialogDescription>
              Please provide your email address to export your timeline. We'll use this to send you updates about new features and exclusive offers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="yourname@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
            </div>
            <div className="text-sm text-gray-500">
              <p>
                By providing your email, you agree to receive occasional updates about our services. 
                We respect your privacy and will never share your information with third parties.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEmail} 
              disabled={isSubmittingEmail}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmittingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Continue to Export"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-[500px] p-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle>{shareUrl ? "Share Timeline" : "Create Share Link"}</DialogTitle>
            <DialogDescription>
              Share your timeline with others in read-only mode.
            </DialogDescription>
          </DialogHeader>
          
          {/* Share Status Indicator */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <div className="text-sm text-muted-foreground">Status:</div>
            {shareUrl ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300">
                Not Shared
              </Badge>
            )}
            
            {shareUrl && expiryDate && (
              <span className="text-xs text-muted-foreground">
                Expires: {formatExpiryDate(expiryDate)}
              </span>
            )}
          </div>
          
          {/* Tabs for different sharing methods */}
          <Tabs value={activeShareTab} onValueChange={(value) => setActiveShareTab(value as "link" | "email")} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>
            
            {/* Link Sharing Tab */}
            <TabsContent value="link" className="pt-2">
              {shareUrl && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="share-link">
                    Share Link
                  </Label>
                  <div className="flex w-full">
                    <Input
                      id="share-link"
                      readOnly
                      value={shareUrl}
                      className="font-mono text-xs rounded-r-none flex-1 w-0 truncate pr-1"
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
              )}
            </TabsContent>
            
            {/* Email Sharing Tab */}
            <TabsContent value="email" className="pt-2">
              {!shareUrl ? (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-2">
                  <div className="flex items-start">
                    <div className="text-yellow-800 dark:text-yellow-400">
                      <p className="text-sm font-medium">
                        You need to create a share link first
                      </p>
                      <p className="text-xs mt-1">
                        Press the "Create Share Link" button below to generate a shareable link that will be sent via email.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="recipient-emails">
                      Recipient Email Addresses
                    </Label>
                    <Textarea
                      id="recipient-emails"
                      placeholder="Enter email addresses separated by commas"
                      value={recipientEmails}
                      onChange={(e) => setRecipientEmails(e.target.value)}
                      className="h-20 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple email addresses with commas or semicolons.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-message">
                      Custom Message (Optional)
                    </Label>
                    <Textarea
                      id="custom-message"
                      placeholder="Add a personal message"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="h-24 resize-none"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
              
              {/* Manual date display and selector, with centered position */}
              <div className="flex flex-col gap-2 relative">
                <Button
                  id="expiry-date-display"
                  variant="outline"
                  onClick={() => {
                    const picker = document.getElementById('share-date-picker') as HTMLInputElement;
                    if (picker) picker.showPicker();
                  }}
                  className="w-full justify-start text-left font-normal text-xs truncate"
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {expiryDate ? formatExpiryDate(expiryDate) : "No expiry date"}
                </Button>
                
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
                  <input 
                    type="date" 
                    id="share-date-picker"
                    className="opacity-0 pointer-events-auto"
                    min={format(new Date(), "yyyy-MM-dd")}
                    value={expiryDate ? format(expiryDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setExpiryDate(new Date(e.target.value));
                      } else {
                        setExpiryDate(null);
                      }
                    }}
                  />
                </div>
                
                <div className="flex gap-1 justify-between">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setExpiryDate(null)}
                    className="text-xs px-1.5"
                  >
                    No Expiry
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setExpiryDate(addDays(new Date(), 7))}
                    className="text-xs px-1.5"
                  >
                    7 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setExpiryDate(addMonths(new Date(), 1))}
                    className="text-xs px-1.5"
                  >
                    1 Month
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show-vendors"
                checked={showVendorsInShare}
                onCheckedChange={setShowVendorsInShare}
              />
              <Label htmlFor="show-vendors" className="text-sm">Show participants in public view</Label>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col gap-2 mt-4 pt-2 border-t">
            {activeShareTab === "link" && (
              <>
                {shareUrl ? (
                  <div className="flex w-full gap-2">
                    <Button 
                      type="button"
                      variant="destructive"
                      onClick={handleRevokeAccess}
                      className="w-1/2"
                      size="sm"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Revoke Access
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="secondary"
                      onClick={handleCreatePublicShare}
                      disabled={isCreatingShare}
                      className="w-1/2"
                      size="sm"
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
                  </div>
                ) : (
                  <Button 
                    type="button"
                    onClick={handleCreatePublicShare}
                    disabled={isCreatingShare}
                    className="w-full text-xs"
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
                )}
              </>
            )}
            
            {activeShareTab === "email" && (
              <Button 
                type="button"
                onClick={handleShareViaEmail}
                disabled={isSendingEmails || !shareUrl}
                className="w-full"
              >
                {isSendingEmails ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
          
          {/* Open Link button in its own section, outside of the DialogFooter */}
          {shareUrl && (
            <div className="w-full mt-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(shareUrl, '_blank')}
                className="w-full"
                size="sm"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TimelineImage {
  id: number;
  timelineId: number;
  imageUrl: string;
  caption?: string;
  order: number;
}

// Add the email collection dialog right before the component ends
export function TimelineEditorWithEmailCollection(props: TimelineEditorProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <TimelineEditor {...props} />
    </DndProvider>
  );
}
