import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePublicTemplates } from "@/hooks/use-templates.tsx";

interface Template {
  id: number;
  title: string;
  type?: string;
  events: any[];
  categories?: any[];
}

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (templateId: number) => void;
}

export function TemplatesDialog({ open, onOpenChange, onApplyTemplate }: TemplatesDialogProps) {
  const [page, setPage] = useState(1);
  const [limit] = useState(9); // 3x3 grid works well with the current layout
  const { toast } = useToast();
  
  // Reset to page 1 when dialog opens
  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open]);

  // Use the new hook for paginated templates
  const { 
    data, 
    isLoading, 
    error 
  } = usePublicTemplates(page, limit);
  
  // Extract templates and pagination info from response
  const templates = data?.templates || [];
  const totalPages = data?.totalPages || 1;
  const totalTemplates = data?.totalTemplates || 0;

  // Handle pagination errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Pagination handlers
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Timeline Templates
          </DialogTitle>
          <DialogDescription>
            Choose a template to get started quickly. Each template includes pre-made events and categories.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No templates available at the moment.
            </div>
          ) : (
            templates.map((template: Template) => (
              <Card
                key={template.id}
                className="bg-white dark:bg-zinc-900 border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg mb-2 text-foreground">{template.title}</h3>
                      {template.type && (
                        <div className="inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          {template.type}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        {template.events?.length || 0} events
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Button
                      variant="default"
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                      onClick={() => {
                        onApplyTemplate(template.id);
                        onOpenChange(false);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && templates.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {templates.length} of {totalTemplates} templates
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous Page</span>
              </Button>
              <div className="text-sm">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next Page</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 