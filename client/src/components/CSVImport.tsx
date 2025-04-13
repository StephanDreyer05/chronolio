import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, AlertCircle, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface Vendor {
  id: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  address?: string;
  notes?: string;
  type?: {
    id: number;
    name: string;
  } | null;
}

interface CSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (vendors: Vendor[]) => void;
}

export function CSVImport({ isOpen, onClose, onImportComplete }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    alternativePhone: "",
    address: "",
    notes: "",
    typeName: "",
  });
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Parse CSV for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          const text = event.target.result as string;
          const parsed = parseCSV(text);
          setPreviewData(parsed);
          
          // If we have headers, set up initial mappings
          if (parsed.length > 0) {
            const headers = parsed[0];
            const initialMappings: Record<string, string> = {
              name: "",
              contactName: "",
              email: "",
              phone: "",
              alternativePhone: "",
              address: "",
              notes: "",
              typeName: "",
            };
            
            // Try to auto-map fields based on header names
            headers.forEach((header) => {
              const h = header.toLowerCase();
              if (h.includes("name") && !h.includes("contact")) {
                initialMappings.name = header;
              } else if (h.includes("contact") || h.includes("person")) {
                initialMappings.contactName = header;
              } else if (h.includes("email")) {
                initialMappings.email = header;
              } else if (h.includes("phone") && !h.includes("alt") && !h.includes("other")) {
                initialMappings.phone = header;
              } else if ((h.includes("alt") || h.includes("other") || h.includes("secondary")) && h.includes("phone")) {
                initialMappings.alternativePhone = header;
              } else if (h.includes("address")) {
                initialMappings.address = header;
              } else if (h.includes("note") || h.includes("comment")) {
                initialMappings.notes = header;
              } else if (h.includes("type") || h.includes("category")) {
                initialMappings.typeName = header;
              }
            });
            
            setMappings(initialMappings);
          }
        }
      };
      reader.readAsText(selectedFile);
      setStep(2);
    }
  };

  const parseCSV = (text: string): string[][] => {
    // Basic CSV parsing (handles quoted fields)
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);
    
    lines.forEach((line) => {
      if (line.trim() === "") return;
      
      const fields: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      
      fields.push(current.trim());
      rows.push(fields);
    });
    
    return rows;
  };

  const handleMappingChange = (field: string, value: string) => {
    setMappings(prev => ({ ...prev, [field]: value }));
  };

  const handleImport = async () => {
    if (!file || !previewData.length || previewData.length <= 1) {
      toast({
        title: "Error",
        description: "Invalid CSV file",
        variant: "destructive",
      });
      return;
    }

    // Validate that name field is mapped
    if (!mappings.name) {
      toast({
        title: "Error",
        description: "The 'Name' field is required and must be mapped",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStep(3);
    setErrors([]);
    
    const headers = previewData[0];
    const rows = previewData.slice(1);
    
    // Map indices for each field
    const fieldIndices: Record<string, number> = {};
    Object.entries(mappings).forEach(([field, header]) => {
      if (header) {
        const index = headers.indexOf(header);
        if (index !== -1) {
          fieldIndices[field] = index;
        }
      }
    });
    
    const importedVendors: Vendor[] = [];
    const importErrors: string[] = [];
    
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(Math.floor((i / rows.length) * 100));
        
        // Skip empty rows
        if (row.every(cell => !cell.trim())) continue;
        
        // Validate required fields - check if the mapped name field has a value
        const nameIndex = fieldIndices.name;
        if (nameIndex === undefined || !row[nameIndex] || !row[nameIndex].trim()) {
          importErrors.push(`Row ${i + 2}: Missing required 'Name' field`);
          continue;
        }
        
        const vendorData = {
          name: row[nameIndex].trim(),
          typeName: fieldIndices.typeName !== undefined && row[fieldIndices.typeName] ? row[fieldIndices.typeName].trim() : null,
          contactName: fieldIndices.contactName !== undefined && row[fieldIndices.contactName] ? row[fieldIndices.contactName].trim() : null,
          email: fieldIndices.email !== undefined && row[fieldIndices.email] ? row[fieldIndices.email].trim() : null,
          phone: fieldIndices.phone !== undefined && row[fieldIndices.phone] ? row[fieldIndices.phone].trim() : null,
          alternativePhone: fieldIndices.alternativePhone !== undefined && row[fieldIndices.alternativePhone] ? row[fieldIndices.alternativePhone].trim() : null,
          address: fieldIndices.address !== undefined && row[fieldIndices.address] ? row[fieldIndices.address].trim() : null,
          notes: fieldIndices.notes !== undefined && row[fieldIndices.notes] ? row[fieldIndices.notes].trim() : null,
        };
        
        try {
          // Make API call to create vendor
          const response = await fetch("/api/vendors/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(vendorData),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            importErrors.push(`Row ${i + 2}: ${errorData.message || "Failed to import"}`);
            continue;
          }
          
          const vendor = await response.json();
          importedVendors.push(vendor);
        } catch (error) {
          importErrors.push(`Row ${i + 2}: Import failed - ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      
      setProgress(100);
      setErrors(importErrors);
      
      if (importedVendors.length > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${importedVendors.length} contacts${importErrors.length > 0 ? ` with ${importErrors.length} errors` : ""}.`,
          variant: importErrors.length > 0 ? "default" : "default",
        });
        onImportComplete(importedVendors);
      } else {
        toast({
          title: "Import Failed",
          description: "No contacts were imported. Please check the errors.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import contacts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setMappings({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      alternativePhone: "",
      address: "",
      notes: "",
      typeName: "",
    });
    setStep(1);
    setProgress(0);
    setErrors([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] p-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Import Contacts from CSV (beta)</DialogTitle>
          <DialogDescription>
            {step === 1 && "Upload a CSV file containing your contacts."}
            {step === 2 && "Map your CSV columns to contact fields."}
            {step === 3 && "Importing your contacts..."}
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
          <div className="px-6 py-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 sm:p-8 text-center">
              <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Your CSV file should have columns for contact information like name, email, and phone.
              </p>
              <input
                type="file"
                id="csv-file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button 
                onClick={() => document.getElementById("csv-file")?.click()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                Select CSV File
              </Button>
            </div>
          </div>
        )}
        
        {step === 2 && previewData.length > 0 && (
          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="max-h-[250px] overflow-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    {previewData[0].map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {previewData.slice(1, 6).map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50 dark:bg-zinc-800/30' : ''}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Map CSV Columns to Contact Fields</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      Contact Name
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={mappings.name}
                      onChange={(e) => handleMappingChange("name", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                      required
                    >
                      <option value="">-- Select Column --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Type</label>
                    <select
                      value={mappings.typeName}
                      onChange={(e) => handleMappingChange("typeName", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Person</label>
                    <select
                      value={mappings.contactName}
                      onChange={(e) => handleMappingChange("contactName", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <select
                      value={mappings.email}
                      onChange={(e) => handleMappingChange("email", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <select
                      value={mappings.phone}
                      onChange={(e) => handleMappingChange("phone", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alternative Phone</label>
                    <select
                      value={mappings.alternativePhone}
                      onChange={(e) => handleMappingChange("alternativePhone", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <select
                      value={mappings.address}
                      onChange={(e) => handleMappingChange("address", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <select
                      value={mappings.notes}
                      onChange={(e) => handleMappingChange("notes", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {previewData[0].map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Importing contacts...</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            {errors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Errors</AlertTitle>
                <AlertDescription>
                  <div className="max-h-[200px] overflow-y-auto mt-2">
                    <ul className="list-disc pl-5 space-y-1">
                      {errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DialogFooter className="p-6 pt-2 border-t border-gray-200 dark:border-gray-800">
          {step === 1 && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => {
                reset();
                setStep(1);
              }}>
                Back
              </Button>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                onClick={handleImport}
                disabled={!mappings.name}
              >
                Import Contacts
              </Button>
            </>
          )}
          
          {step === 3 && !isLoading && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImport;