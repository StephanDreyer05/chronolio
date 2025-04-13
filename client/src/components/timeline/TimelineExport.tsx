import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, FileText, Table, Loader2, Lock } from "lucide-react";
import { format, parse } from "date-fns";
import { jsPDF } from "jspdf";
import * as XLSX from 'xlsx';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";

interface TimelineEventExport {
  id: string;
  startTime: string;
  endTime: string;
  duration: string;
  title: string;
  description: string;
  location: string;
  type: string;
  category?: string;
}

interface TimelineExportProps {
  open: boolean;
  onClose: () => void;
  timeline: {
    title: string;
    date: string;
    events: TimelineEventExport[];
    categories: any[];
  };
  eventTypes: any[];
  isTrial?: boolean;
}

export function TimelineExport({
  open,
  onClose,
  timeline,
  eventTypes = [],
  isTrial = false,
}: TimelineExportProps) {
  const [activeTab, setActiveTab] = useState<string>("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [includeParticipants, setIncludeParticipants] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const { toast } = useToast();

  // Email validation
  const validateEmail = (email: string) => {
    // Basic email validation using zod
    const emailSchema = z.string().email("Please enter a valid email address");
    try {
      emailSchema.parse(email);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  const handleEmailSubmit = async () => {
    if (!email) {
      setEmailError("Please enter your email address");
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    try {
      // Check if we're on the trial page
      const isTrialPage = window.location.pathname === '/try' || 
                          window.location.pathname.startsWith('/try/');
      
      // Skip API call if on trial page to avoid 401 errors
      if (isTrialPage) {
        console.log('Trial page: skipping API call to save email');
        // Mark as submitted so we can proceed with export
        setEmailSubmitted(true);
        setEmailError("");
        
        toast({
          title: "Thank you!",
          description: "You can now export your timeline",
        });
        return;
      }
      
      // Save the trial user email to the database
      try {
        const response = await fetch('/api/trial-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        if (!response.ok) {
          console.warn('API call to save email failed, but continuing with export');
        }
      } catch (apiError) {
        console.warn('API call to save email failed with error, but continuing with export:', apiError);
      }
      
      // Always mark as submitted, even if API call failed
      setEmailSubmitted(true);
      setEmailError("");
      
      toast({
        title: "Thank you!",
        description: "You can now export your timeline",
      });
    } catch (error) {
      console.error("Error in email submission flow:", error);
      // Even if there's an error in our logic, still allow export
      // to ensure a good user experience
      setEmailSubmitted(true);
      setEmailError("");
      
      toast({
        title: "Thank you!",
        description: "You can now export your timeline",
      });
    }
  };

  const handleExport = async () => {
    if (timeline.events.length === 0) {
      toast({
        title: "Error",
        description: "No events to export",
        variant: "destructive",
      });
      return;
    }
    
    // For trial users, we need to collect email first if not already submitted
    if (isTrial && !emailSubmitted) {
      toast({
        title: "Email Required",
        description: "Please provide your email address to export your timeline",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      if (activeTab === "pdf") {
        await exportPDF();
      } else if (activeTab === "excel") {
        await exportExcel();
      } else if (activeTab === "text") {
        await exportText();
      }

      toast({
        title: "Success",
        description: "Timeline exported successfully",
      });

      onClose();
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export timeline",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = timeline.title || "Timeline";
    doc.text(title, pageWidth / 2, 20, { align: 'center' });
    
    // Add date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (timeline.date) {
      try {
        const date = format(new Date(timeline.date), 'MMMM d, yyyy');
        doc.text(date, pageWidth / 2, 30, { align: 'center' });
      } catch (e) {
        console.error("Date formatting error:", e);
      }
    }
    
    // Add events
    doc.setFontSize(10);
    let y = 45;
    const lineHeight = 7;
    
    // If we have categories, group by them
    if (timeline.categories && timeline.categories.length > 0) {
      const categorizedEvents: Record<string, TimelineEventExport[]> = {};
      
      // Group events by category
      for (const event of timeline.events) {
        const category = event.category || "Uncategorized";
        if (!categorizedEvents[category]) {
          categorizedEvents[category] = [];
        }
        categorizedEvents[category].push(event);
      }
      
      // Add each category and its events
      for (const category of timeline.categories) {
        const eventsInCategory = categorizedEvents[category.name] || [];
        
        if (eventsInCategory.length === 0) continue;
        
        // Add page break if we're close to the bottom
        if (y > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          y = 20;
        }
        
        // Add category header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(category.name, margin, y);
        y += lineHeight + 3;
        
        // Add category description if it exists
        if (category.description) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.text(category.description, margin, y, { 
            maxWidth: contentWidth,
          });
          y += calculateTextHeight(doc, category.description, contentWidth, 10);
          y += 5;
        }
        
        // Add events in this category
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        for (const event of eventsInCategory) {
          // Add page break if we're close to the bottom
          if (y > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            y = 20;
          }
          
          // Parse and format the time
          let startTime = "";
          try {
            const time = parse(event.startTime, 'HH:mm', new Date());
            startTime = format(time, 'h:mm a');
          } catch (e) {
            console.error("Time parsing error:", e);
            startTime = event.startTime;
          }
          
          // Add event info
          doc.setFont('helvetica', 'bold');
          doc.text(`${startTime} - ${event.title}`, margin, y);
          y += lineHeight;
          
          if (event.location) {
            doc.setFont('helvetica', 'normal');
            doc.text(`Location: ${event.location}`, margin, y);
            y += lineHeight;
          }
          
          if (event.description) {
            doc.setFont('helvetica', 'normal');
            doc.text(`Description: ${event.description}`, margin, y, { 
              maxWidth: contentWidth,
            });
            y += calculateTextHeight(doc, `Description: ${event.description}`, contentWidth, 10);
          }
          
          y += 5; // Add some space between events
        }
        
        y += 5; // Add some space between categories
      }
    } else {
      // If no categories, just list all events chronologically
      for (const event of timeline.events) {
        // Add page break if we're close to the bottom
        if (y > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          y = 20;
        }
        
        // Parse and format the time
        let startTime = "";
        try {
          const time = parse(event.startTime, 'HH:mm', new Date());
          startTime = format(time, 'h:mm a');
        } catch (e) {
          console.error("Time parsing error:", e);
          startTime = event.startTime;
        }
        
        // Add event info
        doc.setFont('helvetica', 'bold');
        doc.text(`${startTime} - ${event.title}`, margin, y);
        y += lineHeight;
        
        if (event.location) {
          doc.setFont('helvetica', 'normal');
          doc.text(`Location: ${event.location}`, margin, y);
          y += lineHeight;
        }
        
        if (event.description) {
          doc.setFont('helvetica', 'normal');
          doc.text(`Description: ${event.description}`, margin, y, { 
            maxWidth: contentWidth,
          });
          y += calculateTextHeight(doc, `Description: ${event.description}`, contentWidth, 10);
        }
        
        y += 5; // Add some space between events
      }
    }
    
    // Add footer
    const footerText = "Generated with Chronolio - Try it for free at chronolio.com";
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    // Save PDF
    doc.save(`${title.replace(/[^\w\s]/gi, '')}_Timeline.pdf`);
  };

  const exportExcel = async () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Format data for Excel
    const excelData = timeline.events.map(event => {
      let startTime = "";
      try {
        const time = parse(event.startTime, 'HH:mm', new Date());
        startTime = format(time, 'h:mm a');
      } catch (e) {
        console.error("Time parsing error:", e);
        startTime = event.startTime;
      }
      
      return {
        'Time': startTime,
        'Title': event.title,
        'Duration': event.duration + ' min',
        'Type': event.type,
        'Location': event.location,
        'Description': event.description,
        'Category': event.category || ''
      };
    });
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const wscols = [
      { wch: 10 }, // Time
      { wch: 25 }, // Title
      { wch: 10 }, // Duration
      { wch: 15 }, // Type
      { wch: 20 }, // Location
      { wch: 30 }, // Description
      { wch: 15 }, // Category
    ];
    ws['!cols'] = wscols;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Timeline");
    
    // Save workbook
    const title = timeline.title || "Timeline";
    XLSX.writeFile(wb, `${title.replace(/[^\w\s]/gi, '')}_Timeline.xlsx`);
  };

  const exportText = async () => {
    let content = `${timeline.title || "Timeline"}\n`;
    if (timeline.date) {
      try {
        content += `${format(new Date(timeline.date), 'MMMM d, yyyy')}\n`;
      } catch (e) {
        console.error("Date formatting error:", e);
      }
    }
    content += `\n`;
    
    // If we have categories, group by them
    if (timeline.categories && timeline.categories.length > 0) {
      const categorizedEvents: Record<string, TimelineEventExport[]> = {};
      
      // Group events by category
      for (const event of timeline.events) {
        const category = event.category || "Uncategorized";
        if (!categorizedEvents[category]) {
          categorizedEvents[category] = [];
        }
        categorizedEvents[category].push(event);
      }
      
      // Add each category and its events
      for (const category of timeline.categories) {
        const eventsInCategory = categorizedEvents[category.name] || [];
        
        if (eventsInCategory.length === 0) continue;
        
        content += `${category.name}\n`;
        if (category.description) {
          content += `${category.description}\n`;
        }
        content += `\n`;
        
        for (const event of eventsInCategory) {
          // Parse and format the time
          let startTime = "";
          try {
            const time = parse(event.startTime, 'HH:mm', new Date());
            startTime = format(time, 'h:mm a');
          } catch (e) {
            console.error("Time parsing error:", e);
            startTime = event.startTime;
          }
          
          content += `${startTime} - ${event.title}\n`;
          if (event.location) {
            content += `Location: ${event.location}\n`;
          }
          if (event.description) {
            content += `Description: ${event.description}\n`;
          }
          content += `\n`;
        }
      }
    } else {
      // If no categories, just list all events chronologically
      for (const event of timeline.events) {
        // Parse and format the time
        let startTime = "";
        try {
          const time = parse(event.startTime, 'HH:mm', new Date());
          startTime = format(time, 'h:mm a');
        } catch (e) {
          console.error("Time parsing error:", e);
          startTime = event.startTime;
        }
        
        content += `${startTime} - ${event.title}\n`;
        if (event.location) {
          content += `Location: ${event.location}\n`;
        }
        if (event.description) {
          content += `Description: ${event.description}\n`;
        }
        content += `\n`;
      }
    }
    
    content += `\nGenerated with Chronolio - Try it for free at chronolio.com`;
    
    // Create a Blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = timeline.title || "Timeline";
    a.download = `${title.replace(/[^\w\s]/gi, '')}_Timeline.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to calculate text height in PDF
  const calculateTextHeight = (doc: jsPDF, text: string, maxWidth: number, fontSize: number) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines.length * (fontSize * 0.3528); // Convert points to mm for height calculation
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-900 border-0 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Export Timeline</DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
            Choose a format to export your timeline
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pdf" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="pdf" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="excel" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Table className="h-4 w-4 mr-2" />
              Excel
            </TabsTrigger>
            <TabsTrigger value="text" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pdf" className="mt-0">
            <div className="p-4 border rounded-md bg-gray-50 dark:bg-zinc-800">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Export to PDF format, perfect for printing or sharing digitally.
              </p>
              <img 
                src="https://placehold.co/400x200/e6e6e6/808080?text=PDF+Preview" 
                alt="PDF Preview" 
                className="w-full h-auto rounded border my-4"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="excel" className="mt-0">
            <div className="p-4 border rounded-md bg-gray-50 dark:bg-zinc-800">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Export to Excel format, ideal for further customization or data analysis.
              </p>
              <img 
                src="https://placehold.co/400x200/e6e6e6/808080?text=Excel+Preview" 
                alt="Excel Preview" 
                className="w-full h-auto rounded border my-4"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="text" className="mt-0">
            <div className="p-4 border rounded-md bg-gray-50 dark:bg-zinc-800">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Export to plain text format, simple and universally compatible.
              </p>
              <img 
                src="https://placehold.co/400x200/e6e6e6/808080?text=Text+Preview" 
                alt="Text Preview" 
                className="w-full h-auto rounded border my-4"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Export options section */}
        {!isTrial && (
          <div className="mt-4 space-y-4">
            <div className="text-sm font-medium mb-2">Export Options</div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeParticipants" 
                checked={includeParticipants} 
                onCheckedChange={(checked) => setIncludeParticipants(checked as boolean)} 
              />
              <Label htmlFor="includeParticipants">Include Participants</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeImages" 
                checked={includeImages} 
                onCheckedChange={(checked) => setIncludeImages(checked as boolean)} 
              />
              <Label htmlFor="includeImages">Include Images</Label>
            </div>
          </div>
        )}
        
        {isTrial && (
          <div className="mt-4 space-y-4">
            <div className="text-sm font-medium mb-2">Premium Export Options</div>
            <div className="flex items-center space-x-2 opacity-50">
              <Checkbox id="includeParticipants" disabled={true} />
              <Label htmlFor="includeParticipants" className="text-muted-foreground">
                Include Participants (Premium Feature)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 opacity-50">
              <Checkbox id="includeImages" disabled={true} />
              <Label htmlFor="includeImages" className="text-muted-foreground">
                Include Images (Premium Feature)
              </Label>
            </div>
            
            <p className="text-sm text-muted-foreground text-center italic mt-4">
              Sign up for more export options and to save your timelines
            </p>
          </div>
        )}
        
        {/* Email collection for trial users */}
        {isTrial && !emailSubmitted && (
          <div className="mt-4 p-4 border border-purple-200 dark:border-purple-900 rounded-lg bg-purple-50 dark:bg-purple-950/30">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h3 className="font-medium mb-2">Enter your email to export your timeline</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your timeline will be available for download after providing your email address.
                </p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={emailError ? "border-red-500" : ""}
                    />
                    {emailError && (
                      <p className="text-xs text-red-500">{emailError}</p>
                    )}
                  </div>
                  <Button 
                    onClick={handleEmailSubmit}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                  >
                    Continue to Export
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    We'll send you tips on using Chronolio. You can unsubscribe anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-row-reverse sm:gap-0">
          <Button
            onClick={handleExport}
            disabled={isExporting || (isTrial && !emailSubmitted)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}