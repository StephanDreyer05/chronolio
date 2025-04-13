import { useState } from 'react';
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, ArrowLeft, ChevronLeft, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MainNav } from "@/components/MainNav";
import { useEffect } from 'react';
import { Undo2, Redo2 } from "lucide-react";
import { TimelineEditor } from "@/components/timeline/TimelineEditor";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { useUserTemplates } from "../hooks/use-templates";


interface Template {
  id: number;
  title: string;
  type?: string;
  events: any[];
  categories?: any[];
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
}

interface Category {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface StateHistory {
  items: TimelineItem[];
  categories: Category[];
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [renameTemplate, setRenameTemplate] = useState<Template | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const [history, setHistory] = useState<StateHistory[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCategoriesSection, setShowCategoriesSection] = useState(false);
  const { collapsed } = useSidebar();

  const { data: templatesData, isLoading, error } = useUserTemplates();
  
  const templates = templatesData || [];

  useEffect(() => {
    if (editingTemplate) {
      const newState = { items, categories };

      if (currentHistoryIndex >= 0 &&
        JSON.stringify(history[currentHistoryIndex]) === JSON.stringify(newState)) {
        return;
      }

      const newHistory = history.slice(0, currentHistoryIndex + 1);
      newHistory.push(newState);

      setHistory(newHistory);
      setCurrentHistoryIndex(newHistory.length - 1);
      setCanUndo(newHistory.length > 1);
      setCanRedo(false);
    }
  }, [items, categories, currentHistoryIndex, history]);

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      const prevState = history[currentHistoryIndex - 1];
      setItems(prevState.items);
      setCategories(prevState.categories);
      setCurrentHistoryIndex(currentHistoryIndex - 1);
      setCanUndo(currentHistoryIndex - 1 > 0);
      setCanRedo(true);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      const nextState = history[currentHistoryIndex + 1];
      setItems(nextState.items);
      setCategories(nextState.categories);
      setCurrentHistoryIndex(currentHistoryIndex + 1);
      setCanUndo(true);
      setCanRedo(currentHistoryIndex + 1 < history.length - 1);
    }
  };

  const renderEditorToolbar = () => (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleUndo}
        disabled={!canUndo}
        className="font-serif"
      >
        <Undo2 className="w-4 h-4 mr-1" /> Undo
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRedo}
        disabled={!canRedo}
        className="font-serif"
      >
        <Redo2 className="w-4 h-4 mr-1" /> Redo
      </Button>
    </div>
  );

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      console.log(`Deleting template with ID: ${templateId}`);

      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to delete template: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Delete success response:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setTemplateToDelete(null);
      setShowDeleteDialog(false);
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      setTemplateToDelete(null);
      setShowDeleteDialog(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTemplate = () => {
    if (templateToDelete) {
      console.log(`Confirming delete for template ID: ${templateToDelete.id}`);
      deleteTemplateMutation.mutate(templateToDelete.id);
    }
  };

  const openDeleteDialog = (template: Template) => {
    console.log(`Opening delete dialog for template: ${template.title} (ID: ${template.id})`);
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const renameTemplateMutation = useMutation({
    mutationFn: async ({ templateId, newTitle }: { templateId: number; newTitle: string }) => {
      console.log('Renaming template:', templateId, 'to:', newTitle); 
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          events: templates.find((t: Template) => t.id === templateId)?.events || [],
          categories: templates.find((t: Template) => t.id === templateId)?.categories || []
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to rename template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setRenameTemplate(null);
      setNewTitle('');
      toast({
        title: "Success",
        description: "Template renamed successfully",
      });
    },
    onError: (error) => {
      console.error('Template rename error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename template",
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: { title: string, events: any[] }) => {
      console.log('Creating new template:', template);
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create template');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      handleEditTemplate(data);
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    },
    onError: (error) => {
      console.error('Template creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const handleOpenRenameDialog = (template: Template) => {
    setRenameTemplate(template);
    setNewTitle(template.title);
  };

  const handleRename = () => {
    if (renameTemplate && newTitle.trim()) {
      renameTemplateMutation.mutate({
        templateId: renameTemplate.id,
        newTitle: newTitle.trim()
      });
    }
  };

  const handleBack = () => {
    if (editingTemplate) {
      setShowBackDialog(true);
    } else {
      setEditingTemplate(null);
    }
  };

  const handleItemDelete = (itemId: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== itemId));
  };

  const applyTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      const templateData = await response.json();

      const newTimelineResponse = await fetch('/api/timelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${templateData.title} - Copy`,
          date: new Date().toISOString().split('T')[0],
          type: templateData.type || '',
          events: templateData.events || [],
          categories: templateData.categories || [],
          categoriesEnabled: !!templateData.categories?.length,
        }),
      });

      if (!newTimelineResponse.ok) {
        throw new Error('Failed to create new timeline from template');
      }

      const newTimeline = await newTimelineResponse.json();

      navigate(`/timeline/${newTimeline.id}`);

      toast({
        title: "Success",
        description: "New timeline created from template",
      });
    } catch (error) {
      console.error('Template application error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = (template: any) => {
    const templateEvents = template.events.map((event: any) => ({
      ...event,
      id: event.id || `${Date.now()}-${Math.random()}`,
    }));

    setEditingTemplate({
      ...template,
      type: template.type || ''
    });
    setCategories(template.categories || []);
    setItems(templateEvents);
    setShowCategories(true);
    setShowCategoriesSection(true);
  };

  const updateTemplateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTemplate.title,
          type: editingTemplate.type,
          events: updates.events,
          categories: updates.categories
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setEditingTemplate(null);
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const moveCategory = (dragIndex: number, hoverIndex: number) => {
    const dragCategory = categories[dragIndex];
    const updatedCategories = [...categories];
    updatedCategories.splice(dragIndex, 1);
    updatedCategories.splice(hoverIndex, 0, dragCategory);
    setCategories(updatedCategories);
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <MainNav />
      <div className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "ml-[70px]" : "ml-[250px]"
      )}>
        {editingTemplate ? (
          <>
            <header className="border-b bg-white dark:bg-zinc-900">
              <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="mr-4"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <h1 className="text-2xl font-bold">
                      {editingTemplate.title}
                    </h1>
                  </div>
                  <Button
                    onClick={() => {
                      updateTemplateMutation.mutate({
                        id: editingTemplate.id,
                        title: editingTemplate.title,
                        type: editingTemplate.type,
                        events: items,
                        categories: categories,
                      });
                    }}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </header>

            <main className="container mx-auto px-6 py-8">
              {renderEditorToolbar()}
              <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden mt-6">
                <CardContent className="p-6">
                  <TimelineEditor
                    categories={categories}
                    setCategories={setCategories}
                    showCategories={true}
                    setShowCategories={setShowCategories}
                    showEndTimes={true}
                    setShowEndTimes={() => {}}
                    isTemplate={true}
                    items={items}
                    setItems={setItems}
                    onDeleteItem={handleItemDelete}
                    newItemId={newItemId}
                    setNewItemId={setNewItemId}
                    showVendors={false}
                    setShowVendors={() => {}}
                  />
                </CardContent>
              </Card>
            </main>
          </>
        ) : (
          <>
            <header className="border-b bg-white dark:bg-zinc-900">
              <div className="container mx-auto px-6 py-8">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-foreground">Templates</h1>
                  <Button
                    onClick={() => {
                      createTemplateMutation.mutate({
                        title: "New Template",
                        events: []
                      });
                    }}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
              </div>
            </header>

            <main className="container mx-auto px-6 py-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Create and manage reusable timeline templates</p>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-muted-foreground">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
                    <CardContent className="p-12 text-center">
                      <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">No templates yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Templates help you create timelines faster by reusing common event structures.
                      </p>
                      <Button
                        onClick={() => {
                          createTemplateMutation.mutate({
                            title: "New Template",
                            events: []
                          });
                        }}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first template
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template: Template) => (
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-500 hover:text-red-500"
                              onClick={() => openDeleteDialog(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Button
                              variant="default"
                              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                              onClick={() => applyTemplate(template.id.toString())}
                            >
                              Use Template
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Dialog open={!!renameTemplate} onOpenChange={(open) => !open && setRenameTemplate(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rename Template</DialogTitle>
                    <DialogDescription>
                      Enter a new name for this template
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Template name"
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRenameTemplate(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRename}>
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </main>
          </>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}