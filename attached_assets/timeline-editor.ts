// Previous imports remain the same...

const handleCategoryToggle = (enabled: boolean) => {
  if (!enabled) {
    // Just open the dialog, don't change the state yet
    setDisableCategoriesDialogOpen(true);
  } else {
    setShowCategories(true);
    if (categories.length === 0) {
      const defaultCategory = {
        id: Date.now().toString(),
        name: "General",
        description: "",
        order: 0
      };
      setCategories([defaultCategory]);
      // Apply default category to all items
      const updatedItems = isTemplate && propItems ? [...propItems] : [...timelineItems];
      const itemsWithCategory = updatedItems.map(item => ({ ...item, category: "General" }));

      if (isTemplate && setTemplateItems) {
        setTemplateItems(itemsWithCategory);
      } else {
        dispatch(setItems(itemsWithCategory));
      }
    }
  }    
};

const handleDisableCategories = () => {
  // Keep categories in state but remove category assignments from items
  const updatedItems = isTemplate && propItems ? [...propItems] : [...timelineItems];
  const sortedItems = updatedItems
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(item => ({ ...item, category: undefined }));

  if (isTemplate && setTemplateItems) {
    setTemplateItems(sortedItems);
  } else {
    dispatch(setItems(sortedItems));
  }

  // Only update UI state, don't clear categories
  setShowCategories(false);
  setDisableCategoriesDialogOpen(false);
};

// In the JSX:
<div className="flex items-center gap-2 py-4 border-t border-b bg-background">
  <Switch
    id="categories"
    checked={showCategories}
    onCheckedChange={handleCategoryToggle}
  />
  <Label htmlFor="categories">Enable Categories</Label>
</div>

<AlertDialog 
  open={disableCategoriesDialogOpen} 
  onOpenChange={(open) => {
    if (!open) {
      // If dialog is closed without confirming (i.e., cancelled)
      setDisableCategoriesDialogOpen(false);
      // Keep categories enabled
      setShowCategories(true);
    }
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Disable Categories?</AlertDialogTitle>
      <AlertDialogDescription>
        This will remove all category assignments from events. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDisableCategories}>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>