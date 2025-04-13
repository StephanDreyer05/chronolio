import { useState, useEffect } from "react";
import { MainNav } from "@/components/MainNav";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Phone, Mail, MapPin, User, Search, ArrowUpDown, Filter, Upload, List, Table, ChevronUp, ChevronDown, Settings } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/settingsSlice";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { CSVImport } from "@/components/CSVImport";
import { Switch } from "@/components/ui/switch";

interface Vendor {
  id: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  address?: string;
  notes?: string;
  customFieldValues?: Record<string, string | number | boolean | null>;
  type?: {
    id: number;
    name: string;
    customFields?: Array<{
      id: string;
      name: string;
      type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
      required: boolean;
      defaultValue?: string | number | boolean | null;
      order?: number;
    }>;
  } | null;
}

// Table View Component
interface VendorTableProps {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
  setGroupByType: (value: boolean) => void;
  vendorTypes: any[];
}

const VendorTable: React.FC<VendorTableProps> = ({
  vendors,
  onEdit,
  onDelete,
  sortOption,
  setSortOption,
  setGroupByType,
  vendorTypes
}) => {
  // Helper function to handle sorting clicks on table headers
  const handleSortClick = (field: 'name' | 'type' | 'contactName' | 'email' | 'phone') => {
    if (sortOption === `${field}-asc`) {
      setSortOption(`${field}-desc`);
      setGroupByType(false);
    } else {
      setSortOption(`${field}-asc`);
      setGroupByType(false);
    }
  };

  // Helper function to get the sort indicator for a specific column
  const getSortIndicator = (field: string) => {
    if (sortOption.startsWith(field)) {
      return sortOption.endsWith('asc') ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
    }
    return null;
  };

  // Get custom field columns - up to 3 most common used fields across all vendors
  const getCustomFieldColumns = () => {
    console.log("Calculating custom field columns for table view");

    // Count frequency of each custom field
    const fieldCounts: Record<string, { count: number, name: string, id: string }> = {};

    // First gather all unique custom field IDs from all vendors
    const allCustomFieldIds = new Set<string>();

    vendors.forEach(vendor => {
      if (vendor.customFieldValues) {
        Object.keys(vendor.customFieldValues).forEach(fieldId => {
          if (vendor.customFieldValues?.[fieldId] !== undefined &&
            vendor.customFieldValues?.[fieldId] !== null &&
            vendor.customFieldValues?.[fieldId] !== '') {
            allCustomFieldIds.add(fieldId);
          }
        });
      }
    });

    console.log(`Found ${allCustomFieldIds.size} unique custom field IDs across all vendors`);

    // Now count each field and try to find its name
    allCustomFieldIds.forEach(fieldId => {
      let fieldName = fieldId; // Default name is the ID
      let fieldCount = 0;

      // Try to find a proper name for this field from any vendor type
      for (const type of vendorTypes) {
        if (type.customFields) {
          const fieldDef = type.customFields.find(f => f.id === fieldId);
          if (fieldDef) {
            fieldName = fieldDef.name;
            break;
          }
        }
      }

      // Count how many vendors have this field with a value
      vendors.forEach(vendor => {
        if (vendor.customFieldValues &&
          vendor.customFieldValues[fieldId] !== undefined &&
          vendor.customFieldValues[fieldId] !== null &&
          vendor.customFieldValues[fieldId] !== '') {
          fieldCount++;
        }
      });

      fieldCounts[fieldId] = { count: fieldCount, name: fieldName, id: fieldId };
    });

    // Get top 3 used fields
    const topFields = Object.values(fieldCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    console.log(`Top custom fields for table: ${topFields.map(f => f.name).join(', ')}`);
    return topFields;
  };

  const customFieldColumns = getCustomFieldColumns();

  // Function to get custom field value for a vendor
  const getCustomFieldValue = (vendor: Vendor, fieldId: string) => {
    console.log(`Getting custom field value for vendor ${vendor.name}, field ID ${fieldId}`);

    // Check if vendor has customFieldValues
    if (!vendor.customFieldValues) {
      console.log(`Vendor ${vendor.name} has no customFieldValues object`);
      return "-";
    }

    const value = vendor.customFieldValues?.[fieldId];

    // Handle undefined, null, or empty string values
    if (value === undefined || value === null || value === '') {
      console.log(`Field ${fieldId} value is empty for vendor ${vendor.name}`);
      return "-";
    }

    // Find field type - first try from vendor's type definition
    let fieldType: string | undefined;

    if (vendor.type?.customFields) {
      fieldType = vendor.type.customFields.find(f => f.id === fieldId)?.type;
    }

    // If not found in vendor's type, try global vendor types
    if (!fieldType && vendor.type?.id) {
      const matchingType = vendorTypes.find(t => t.id === vendor.type?.id);
      if (matchingType?.customFields) {
        fieldType = matchingType.customFields.find(f => f.id === fieldId)?.type;
      }
    }

    // If still no type, infer from value
    if (!fieldType) {
      if (typeof value === 'boolean') {
        fieldType = 'boolean';
      } else if (typeof value === 'number') {
        fieldType = 'number';
      } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        fieldType = 'date';
      } else {
        fieldType = 'text';
      }
    }

    console.log(`Field ${fieldId} type: ${fieldType}, value: ${value}`);

    // Format value based on type with defensive coding to prevent errors
    try {
      if (fieldType === 'boolean') {
        return value === true || value === 'true' || value === 1 ? 'Yes' : 'No';
      } else if (fieldType === 'date' && typeof value === 'string') {
        // Format date if it's a valid date string
        const date = new Date(value);
        return !isNaN(date.getTime())
          ? date.toLocaleDateString()
          : String(value);
      } else if (fieldType === 'number') {
        // Handle number formatting with error checking
        if (typeof value === 'number') {
          return value.toString();
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          return parseFloat(value).toString();
        } else {
          return String(value);
        }
      }
    } catch (error) {
      console.error(`Error formatting custom field ${fieldId}:`, error);
      return String(value);
    }

    // Default: return string representation
    return String(value);
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-800 border-b">
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('name')}
              >
                <div className="flex items-center">
                  Name {getSortIndicator('name')}
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
                onClick={() => handleSortClick('contactName')}
              >
                <div className="flex items-center">
                  Contact Person {getSortIndicator('contactName')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('email')}
              >
                <div className="flex items-center">
                  Email {getSortIndicator('email')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => handleSortClick('phone')}
              >
                <div className="flex items-center">
                  Phone {getSortIndicator('phone')}
                </div>
              </th>
              {customFieldColumns.map(field => (
                <th
                  key={field.id}
                  className="px-4 py-3 text-left font-medium hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  <div className="flex items-center">
                    <span className="text-purple-500">{field.name}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr
                key={vendor.id}
                className="border-b hover:bg-gray-50 dark:hover:bg-zinc-800/50 group"
              >
                <td className="px-4 py-3 font-medium">
                  {vendor.name}
                </td>
                <td className="px-4 py-3">
                  {vendor.type ? (
                    <div
                      className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    >
                      {vendor.type.name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {vendor.contactName || "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {vendor.email || "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {vendor.phone || "-"}
                </td>
                {customFieldColumns.map(field => (
                  <td key={field.id} className="px-4 py-3 text-muted-foreground">
                    {getCustomFieldValue(vendor, field.id)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(vendor)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4 text-purple-500" />
                      <span className="sr-only">Edit</span>
                    </Button>
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
                            This will permanently delete the contact "{vendor.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(vendor)}
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
            {vendors.length === 0 && (
              <tr>
                <td colSpan={6 + customFieldColumns.length} className="px-4 py-8 text-center text-muted-foreground">
                  No contacts found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ContactsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const [groupByType, setGroupByType] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const { toast } = useToast();
  const { vendorTypes } = useSelector((state: RootState) => state.settings);
  const { collapsed } = useSidebar();

  const [formData, setFormData] = useState({
    name: "",
    typeId: "",
    contactName: "",
    email: "",
    phone: "",
    alternativePhone: "",
    address: "",
    notes: "",
    customFieldValues: {} as Record<string, string | number | boolean | null>,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (currentVendor && showEditDialog) {
      setFormData({
        name: currentVendor.name,
        typeId: currentVendor.type?.id.toString() || "",
        contactName: currentVendor.contactName || "",
        email: currentVendor.email || "",
        phone: currentVendor.phone || "",
        alternativePhone: currentVendor.alternativePhone || "",
        address: currentVendor.address || "",
        notes: currentVendor.notes || "",
        customFieldValues: currentVendor.customFieldValues || {},
      });
    }
  }, [currentVendor, showEditDialog]);

  useEffect(() => {
    // Filter and sort vendors whenever vendors, searchQuery, sortOption, or selectedTypeFilter changes
    let result = [...vendors];

    console.log("Filtering and sorting vendors. Initial vendors:", vendors);
    const vendorsWithCustomFields = vendors.filter(vendor =>
      vendor.customFieldValues && Object.keys(vendor.customFieldValues).length > 0
    );
    console.log("Vendors with custom fields before filtering:", vendorsWithCustomFields.length);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        vendor =>
          vendor.name.toLowerCase().includes(query) ||
          (vendor.type?.name.toLowerCase().includes(query) || false) ||
          (vendor.contactName?.toLowerCase().includes(query) || false) ||
          (vendor.email?.toLowerCase().includes(query) || false) ||
          (vendor.phone?.toLowerCase().includes(query) || false)
      );
    }

    // Apply type filter
    if (selectedTypeFilter !== "all") {
      if (selectedTypeFilter === "none") {
        result = result.filter(vendor => !vendor.type);
      } else {
        result = result.filter(vendor => vendor.type?.id.toString() === selectedTypeFilter);
      }
    }

    // Apply sorting
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "type-asc":
        result.sort((a, b) => {
          const typeA = a.type?.name || "";
          const typeB = b.type?.name || "";
          return typeA.localeCompare(typeB) || a.name.localeCompare(b.name);
        });
        break;
      case "type-desc":
        result.sort((a, b) => {
          const typeA = a.type?.name || "";
          const typeB = b.type?.name || "";
          return typeB.localeCompare(typeA) || a.name.localeCompare(b.name);
        });
        break;
      case "contactName-asc":
        result.sort((a, b) => {
          const contactA = a.contactName || "";
          const contactB = b.contactName || "";
          return contactA.localeCompare(contactB) || a.name.localeCompare(b.name);
        });
        break;
      case "contactName-desc":
        result.sort((a, b) => {
          const contactA = a.contactName || "";
          const contactB = b.contactName || "";
          return contactB.localeCompare(contactA) || a.name.localeCompare(b.name);
        });
        break;
      case "email-asc":
        result.sort((a, b) => {
          const emailA = a.email || "";
          const emailB = b.email || "";
          return emailA.localeCompare(emailB) || a.name.localeCompare(b.name);
        });
        break;
      case "email-desc":
        result.sort((a, b) => {
          const emailA = a.email || "";
          const emailB = b.email || "";
          return emailB.localeCompare(emailA) || a.name.localeCompare(b.name);
        });
        break;
      case "phone-asc":
        result.sort((a, b) => {
          const phoneA = a.phone || "";
          const phoneB = b.phone || "";
          return phoneA.localeCompare(phoneB) || a.name.localeCompare(b.name);
        });
        break;
      case "phone-desc":
        result.sort((a, b) => {
          const phoneA = a.phone || "";
          const phoneB = b.phone || "";
          return phoneB.localeCompare(phoneA) || a.name.localeCompare(b.name);
        });
        break;
      default:
        break;
    }

    const resultWithCustomFields = result.filter(vendor =>
      vendor.customFieldValues && Object.keys(vendor.customFieldValues).length > 0
    );
    console.log("Vendors with custom fields after filtering:", resultWithCustomFields.length);
    if (resultWithCustomFields.length > 0) {
      console.log("Example filtered vendor with custom fields:", resultWithCustomFields[0]);
    }

    setFilteredVendors(result);
  }, [vendors, searchQuery, sortOption, selectedTypeFilter, groupByType]);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vendors");
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      const data = await response.json();

      // Debug log to check what data is being returned from the server
      console.log("Fetched vendors data:", data);

      // Check if custom field values are included in the response
      const hasCustomFields = data.some((vendor: Vendor) =>
        vendor.customFieldValues && Object.keys(vendor.customFieldValues).length > 0
      );
      console.log("Vendors with custom fields:", hasCustomFields);

      if (hasCustomFields) {
        // Log a specific vendor with custom fields for detailed inspection
        const vendorWithCustomFields = data.find((vendor: Vendor) =>
          vendor.customFieldValues && Object.keys(vendor.customFieldValues).length > 0
        );
        if (vendorWithCustomFields) {
          console.log("Example vendor with custom fields:", vendorWithCustomFields);
        }
      }

      setVendors(data);
      // Initial sort will be applied by the useEffect
    } catch (error) {
      console.error("Error in fetchVendors:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch contacts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string | number | boolean | null) => {
    // Get the field definition to determine the field type
    const field = formData.typeId && formData.typeId !== "none"
      ? vendorTypes.find(type => type.id.toString() === formData.typeId)?.customFields?.find(f => f.id === fieldId)
      : null;

    let processedValue = value;

    // Handle values based on field type with error prevention
    if (field) {
      try {
        if (field.type === 'number') {
          if (value === '' || value === null) {
            processedValue = null;
          } else if (typeof value === 'string') {
            // Try to convert string to number, set to null if invalid
            const parsed = parseFloat(value);
            processedValue = !isNaN(parsed) ? parsed : null;
          }
        } else if (field.type === 'boolean') {
          // Ensure boolean values are actually booleans
          processedValue = value === true || value === 'true' || value === 1;
        } else if (field.type === 'link') {
          // Ensure link value is a string
          processedValue = value ? value.toString() : '';
        } else if ((field.type === 'text' || field.type === 'textarea' || field.type === 'date') && value === null) {
          processedValue = '';
        }
      } catch (error) {
        console.error(`Error processing custom field ${fieldId}:`, error);
        // Fallback to original value in case of error
      }
    }

    // Update the form data with the processed value
    setFormData(prev => ({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [fieldId]: processedValue
      }
    }));
  };

  // When changing the type, prepopulate any default values for custom fields
  useEffect(() => {
    if (formData.typeId && formData.typeId !== "none") {
      const selectedType = vendorTypes.find(type => type.id.toString() === formData.typeId);

      if (selectedType?.customFields?.length) {
        // Initialize new custom fields with default values when type changes
        const newCustomFieldValues = { ...formData.customFieldValues };

        selectedType.customFields.forEach(field => {
          // Only set default value if the field doesn't already have a value
          if (newCustomFieldValues[field.id] === undefined && field.defaultValue !== undefined) {
            newCustomFieldValues[field.id] = field.defaultValue;
          }
        });

        setFormData(prev => ({
          ...prev,
          customFieldValues: newCustomFieldValues
        }));
      }
    }
  }, [formData.typeId, vendorTypes]);

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      typeId: "",
      contactName: "",
      email: "",
      phone: "",
      alternativePhone: "",
      address: "",
      notes: "",
      customFieldValues: {},
    });
  };

  // Function to validate custom fields before submission
  const validateCustomFields = (): boolean => {
    if (formData.typeId && formData.typeId !== "none") {
      const requiredFields = vendorTypes
        .find(type => type.id.toString() === formData.typeId)
        ?.customFields?.filter(field => field.required) || [];

      for (const field of requiredFields) {
        const value = formData.customFieldValues[field.id];

        if (value === undefined || value === null || value === '') {
          toast({
            title: "Error",
            description: `${field.name} is required`,
            variant: "destructive",
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleAddVendor = async () => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Contact name is required",
          variant: "destructive",
        });
        return;
      }

      // Validate custom fields
      if (!validateCustomFields()) {
        return;
      }

      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          typeId: formData.typeId && formData.typeId !== "none" ? parseInt(formData.typeId) : null,
          contactName: formData.contactName.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          alternativePhone: formData.alternativePhone.trim() || null,
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null,
          customFieldValues: formData.customFieldValues,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add contact");
      }

      const newVendor = await response.json();
      setVendors((prev) => [...prev, newVendor]);
      // The useEffect will handle filtering and sorting
      setShowAddDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add contact",
        variant: "destructive",
      });
    }
  };

  const handleEditVendor = async () => {
    try {
      if (!currentVendor) return;
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Contact name is required",
          variant: "destructive",
        });
        return;
      }

      // Validate custom fields
      if (!validateCustomFields()) {
        return;
      }

      // Sanitize custom field values to avoid sending corrupted data
      const sanitizedCustomFields = { ...formData.customFieldValues };

      // Debug logs before updating
      console.log("Before update - Current vendor:", currentVendor);
      console.log("Before update - Form data:", formData);
      console.log("Before update - Sanitized custom fields:", sanitizedCustomFields);

      // For specific vendor types, ensure we handle the custom fields properly
      if (formData.typeId && formData.typeId !== "none") {
        const selectedType = vendorTypes.find(type => type.id.toString() === formData.typeId);

        if (selectedType?.customFields) {
          selectedType.customFields.forEach(field => {
            const value = sanitizedCustomFields[field.id];

            // Type-specific sanitization
            if (field.type === 'number' && typeof value === 'string' && value !== '') {
              sanitizedCustomFields[field.id] = parseFloat(value) || null;
            }

            // Remove undefined values
            if (value === undefined) {
              delete sanitizedCustomFields[field.id];
            }
          });
        }
      }

      // Log the final sanitized fields
      console.log("After sanitization - Custom fields to send:", sanitizedCustomFields);

      const requestBody = {
        name: formData.name.trim(),
        typeId: formData.typeId && formData.typeId !== "none" ? parseInt(formData.typeId) : null,
        contactName: formData.contactName.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        alternativePhone: formData.alternativePhone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        customFieldValues: sanitizedCustomFields,
      };

      console.log("Update request body:", requestBody);

      const response = await fetch(`/api/vendors/${currentVendor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to update contact");
      }

      const updatedVendor = await response.json();
      console.log("Response from server after update:", updatedVendor);

      setVendors((prev) =>
        prev.map((vendor) => (vendor.id === currentVendor.id ? updatedVendor : vendor))
      );
      // The useEffect will handle filtering and sorting
      setShowEditDialog(false);
      setCurrentVendor(null);
      resetForm();
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    } catch (error) {
      console.error("Error in handleEditVendor:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVendor = async () => {
    try {
      if (!currentVendor) return;

      const response = await fetch(`/api/vendors/${currentVendor.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      setVendors((prev) => prev.filter((vendor) => vendor.id !== currentVendor.id));
      // The useEffect will handle filtering and sorting
      setShowDeleteDialog(false);
      setCurrentVendor(null);
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const handleImportComplete = (importedVendors: Vendor[]) => {
    setVendors(prev => [...prev, ...importedVendors]);
    setShowImportDialog(false);
  };

  // Function to group vendors by type
  const getGroupedVendors = () => {
    if (!groupByType) {
      return { "": filteredVendors };
    }

    const grouped: Record<string, Vendor[]> = {};

    // First, add vendors with types
    filteredVendors.forEach(vendor => {
      const typeName = vendor.type?.name || "No Type";
      if (!grouped[typeName]) {
        grouped[typeName] = [];
      }
      grouped[typeName].push(vendor);
    });

    // Sort the keys alphabetically
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {} as Record<string, Vendor[]>);
  };

  const renderCustomFields = (vendor: Vendor) => {
    if (!vendor.customFieldValues || !vendor.type?.customFields) {
      return null;
    }

    return (
      <div className="grid gap-4 mt-4">
        {vendor.type.customFields.map((field) => {
          const value = vendor.customFieldValues?.[field.id];
          if (value === undefined || value === null || value === '') return null;

          return (
            <div key={field.id} className="flex flex-col gap-1">
              <Label className="text-sm font-medium">{field.name}</Label>
              {(() => {
                switch (field.type) {
                  case 'link':
                    return (
                      <a
                        href={value.toString().startsWith('http') ? value.toString() : `https://${value.toString()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
                      >
                        {value.toString()}
                      </a>
                    );
                  case 'boolean':
                    return <div className="text-sm">{value === true ? 'Yes' : 'No'}</div>;
                  case 'date':
                    return <div className="text-sm">{new Date(value.toString()).toLocaleDateString()}</div>;
                  default:
                    return <div className="text-sm">{value.toString()}</div>;
                }
              })()}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCustomFieldEditor = (field: any, value: any, onChange: (value: any) => void) => {
    switch (field.type) {
      case 'link':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://"
          />
        );
      case 'boolean':
        return (
          <Switch
            checked={value === true}
            onCheckedChange={onChange}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
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
              <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
              <div className="flex space-x-2">
                <Link href="/settings">
                  <Button
                    variant="outline"
                    className="border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Contact Types
                  </Button>
                </Link>
                <Button
                  onClick={() => setShowImportDialog(true)}
                  variant="outline"
                  className="border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-sm p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">Manage your contacts and vendors</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-4 w-4" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full md:w-[250px]"
                    />
                  </div>

                  {/* View type toggle for mobile */}
                  <div className="md:hidden flex rounded-lg border p-1 bg-gray-50 dark:bg-zinc-800 w-full">
                    <Button
                      variant={viewType === 'card' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewType('card')}
                      className="rounded-md px-2.5 flex-1"
                    >
                      <List className="h-4 w-4 mr-2" />
                      Cards
                    </Button>
                    <Button
                      variant={viewType === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewType('table')}
                      className="rounded-md px-2.5 flex-1"
                    >
                      <Table className="h-4 w-4 mr-2" />
                      Table
                    </Button>
                  </div>

                  {/* Filter by Type dropdown */}
                  <Select
                    value={selectedTypeFilter}
                    onValueChange={setSelectedTypeFilter}
                  >
                    <SelectTrigger className="w-full md:w-[160px] border-gray-200 dark:border-gray-700">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2 text-purple-500" />
                        <SelectValue placeholder="Filter by type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="none">No Type</SelectItem>
                      {vendorTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View type buttons - desktop */}
                  <Button
                    variant={viewType === 'card' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('card')}
                    className="hidden md:flex rounded-md"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Cards
                  </Button>
                  <Button
                    variant={viewType === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('table')}
                    className="hidden md:flex rounded-md"
                  >
                    <Table className="h-4 w-4 mr-2" />
                    Table
                  </Button>

                  {/* Sort dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full md:w-auto border-gray-200 dark:border-gray-700">
                        <ArrowUpDown className="h-4 w-4 mr-2 text-purple-500" />
                        <span className="hidden md:inline">
                          {sortOption === "name-asc" ? "Name (A-Z)" :
                            sortOption === "name-desc" ? "Name (Z-A)" :
                              sortOption === "type-asc" ? "Type (A-Z)" :
                                sortOption === "type-desc" ? "Type (Z-A)" :
                                  sortOption === "contactName-asc" ? "Contact (A-Z)" :
                                    sortOption === "contactName-desc" ? "Contact (Z-A)" :
                                      sortOption === "email-asc" ? "Email (A-Z)" :
                                        sortOption === "email-desc" ? "Email (Z-A)" :
                                          sortOption === "phone-asc" ? "Phone (A-Z)" :
                                            sortOption === "phone-desc" ? "Phone (Z-A)" :
                                              "Sort"}
                        </span>
                        <span className="md:hidden">Sort</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSortOption("name-asc");
                          setGroupByType(false);
                        }}
                        className={sortOption === "name-asc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                      >
                        Name (A-Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortOption("name-desc");
                          setGroupByType(false);
                        }}
                        className={sortOption === "name-desc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                      >
                        Name (Z-A)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSortOption("type-asc");
                          setGroupByType(true);
                        }}
                        className={sortOption === "type-asc" && groupByType ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                      >
                        Type (A-Z) Grouped
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortOption("type-desc");
                          setGroupByType(true);
                        }}
                        className={sortOption === "type-desc" && groupByType ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                      >
                        Type (Z-A) Grouped
                      </DropdownMenuItem>
                      {viewType === 'table' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSortOption("contactName-asc");
                              setGroupByType(false);
                            }}
                            className={sortOption === "contactName-asc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                          >
                            Contact Person (A-Z)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortOption("contactName-desc");
                              setGroupByType(false);
                            }}
                            className={sortOption === "contactName-desc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                          >
                            Contact Person (Z-A)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSortOption("email-asc");
                              setGroupByType(false);
                            }}
                            className={sortOption === "email-asc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                          >
                            Email (A-Z)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortOption("email-desc");
                              setGroupByType(false);
                            }}
                            className={sortOption === "email-desc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                          >
                            Email (Z-A)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSortOption("phone-asc");
                              setGroupByType(false);
                            }}
                            className={sortOption === "phone-asc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                          >
                            Phone (A-Z)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortOption("phone-desc");
                              setGroupByType(false);
                            }}
                            className={sortOption === "phone-desc" ? 'bg-purple-50 dark:bg-purple-900/20 font-medium' : ''}
                          >
                            Phone (Z-A)
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Contacts display */}
            <div>
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent" />
                </div>
              ) : vendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <User className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No contacts found</h3>
                  <p className="text-muted-foreground mb-4">You haven't added any contacts yet.</p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add your first contact
                  </Button>
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <User className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No matching contacts</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTypeFilter('all');
                      setSortOption('name-asc');
                      setGroupByType(false);
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              ) : viewType === 'table' ? (
                // Table View
                <VendorTable
                  vendors={filteredVendors}
                  onEdit={(vendor) => {
                    setCurrentVendor(vendor);
                    setShowEditDialog(true);
                  }}
                  onDelete={(vendor) => {
                    setCurrentVendor(vendor);
                    setShowDeleteDialog(true);
                  }}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                  setGroupByType={setGroupByType}
                  vendorTypes={vendorTypes}
                />
              ) : (
                // Card View (existing implementation)
                <div className="space-y-6">
                  {Object.keys(getGroupedVendors()).length > 0 && groupByType ? (
                    Object.entries(getGroupedVendors()).map(([typeName, typeVendors]) => (
                      <div key={typeName} className="space-y-4">
                        <h3 className="text-lg font-semibold">{typeName}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {typeVendors.map((vendor) => (
                            <Card
                              key={vendor.id}
                              className="bg-white dark:bg-zinc-900 border shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
                              onClick={() => {
                                setCurrentVendor(vendor);
                                setShowEditDialog(true);
                              }}
                            >
                              <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h3 className="font-medium text-lg mb-1 text-foreground">{vendor.name}</h3>
                                    {vendor.type && (
                                      <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                        {vendor.type.name}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentVendor(vendor);
                                        setShowDeleteDialog(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {vendor.contactName && (
                                    <div className="flex items-center text-sm">
                                      <User className="h-4 w-4 mr-2 text-purple-500" />
                                      <span>{vendor.contactName}</span>
                                    </div>
                                  )}
                                  {vendor.email && (
                                    <div className="flex items-center text-sm">
                                      <Mail className="h-4 w-4 mr-2 text-purple-500" />
                                      <span>{vendor.email}</span>
                                    </div>
                                  )}
                                  {vendor.phone && (
                                    <div className="flex items-center text-sm">
                                      <Phone className="h-4 w-4 mr-2 text-purple-500" />
                                      <span>{vendor.phone}</span>
                                    </div>
                                  )}
                                  {vendor.address && (
                                    <div className="flex items-center text-sm">
                                      <MapPin className="h-4 w-4 mr-2 text-purple-500" />
                                      <span>{vendor.address}</span>
                                    </div>
                                  )}
                                  {renderCustomFields(vendor)}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredVendors.map((vendor) => (
                        <Card
                          key={vendor.id}
                          className="bg-white dark:bg-zinc-900 border shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
                          onClick={() => {
                            setCurrentVendor(vendor);
                            setShowEditDialog(true);
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-medium text-lg mb-1 text-foreground">{vendor.name}</h3>
                                {vendor.type && (
                                  <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                    {vendor.type.name}
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentVendor(vendor);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {vendor.contactName && (
                                <div className="flex items-center text-sm">
                                  <User className="h-4 w-4 mr-2 text-purple-500" />
                                  <span>{vendor.contactName}</span>
                                </div>
                              )}
                              {vendor.email && (
                                <div className="flex items-center text-sm">
                                  <Mail className="h-4 w-4 mr-2 text-purple-500" />
                                  <span>{vendor.email}</span>
                                </div>
                              )}
                              {vendor.phone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="h-4 w-4 mr-2 text-purple-500" />
                                  <span>{vendor.phone}</span>
                                </div>
                              )}
                              {vendor.address && (
                                <div className="flex items-center text-sm">
                                  <MapPin className="h-4 w-4 mr-2 text-purple-500" />
                                  <span>{vendor.address}</span>
                                </div>
                              )}
                              {renderCustomFields(vendor)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New Contact</DialogTitle>
            <DialogDescription>
              Enter the details of the contact you want to add.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Contact Name *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Contact name (Company or Person)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={formData.typeId}
                onValueChange={(value) => handleSelectChange(value, "typeId")}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select contact type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendorTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactName" className="text-right">
                Contact Person
              </Label>
              <Input
                id="contactName"
                name="contactName"
                value={formData.contactName}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Contact person"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Email address"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Phone number"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alternativePhone" className="text-right">
                Alt. Phone
              </Label>
              <Input
                id="alternativePhone"
                name="alternativePhone"
                value={formData.alternativePhone}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Alternative phone"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Physical address"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Additional notes"
              />
            </div>

            {/* Custom Fields Section */}
            {formData.typeId && formData.typeId !== "none" &&
              vendorTypes.find(type => type.id.toString() === formData.typeId)?.customFields?.length ? (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-center">Custom Fields</h3>
                  {vendorTypes.find(type => type.id.toString() === formData.typeId)?.customFields?.map(field => (
                    <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`add-custom-${field.id}`} className="text-right">
                        {field.name} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {renderCustomFieldEditor(field, formData.customFieldValues[field.id], (value) => handleCustomFieldChange(field.id, value))}
                    </div>
                  ))}
                </div>
              ) : null}
          </div>
          <DialogFooter className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVendor} className="bg-purple-600 hover:bg-purple-700 text-white">Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px] border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Contact</DialogTitle>
            <DialogDescription>
              Update the details of the contact.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              {formData.typeId && formData.typeId !== "none" && 
                vendorTypes.find((type) => type.id.toString() === formData.typeId)?.customFields?.length > 0 && (
                <TabsTrigger value="custom">Custom Fields</TabsTrigger>
              )}
            </TabsList>
            
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="typeId">Type</Label>
                <Select
                  value={formData.typeId}
                  onValueChange={(value) => handleSelectChange(value, "typeId")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendorTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactName">Contact Person</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alternativePhone">Alternative Phone</Label>
                <Input
                  id="alternativePhone"
                  name="alternativePhone"
                  type="tel"
                  value={formData.alternativePhone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
            </TabsContent>
            
            {/* Custom Fields Tab */}
            {formData.typeId && formData.typeId !== "none" && 
              vendorTypes.find((type) => type.id.toString() === formData.typeId)?.customFields?.length > 0 && (
              <TabsContent value="custom" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-medium">Custom Fields</h4>
                  {vendorTypes
                    .find((type) => type.id.toString() === formData.typeId)
                    ?.customFields?.map((field) => (
                      <div key={field.id} className="grid gap-2">
                        <Label>
                          {field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderCustomFieldEditor(
                          field,
                          formData.customFieldValues[field.id],
                          (value) => handleCustomFieldChange(field.id, value)
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
          
          <DialogFooter className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVendor}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contact "{currentVendor?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVendor}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[500px] border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Import Contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import contacts in bulk.
            </DialogDescription>
          </DialogHeader>
          <CSVImport
            isOpen={showImportDialog}
            onClose={() => setShowImportDialog(false)}
            onImportComplete={handleImportComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}