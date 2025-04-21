import { TimelineItem } from './TimelineItem';
import { useDispatch, useSelector } from 'react-redux';
import { deleteItem } from '@/store/timelineSlice';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface TimelineViewProps {
  items: Array<{
    id: string;
    startTime: string;
    endTime: string;
    duration: string;
    title: string;
    description: string;
    location: string;
    type: string;
    category?: string;
  }>;
  categories: {
    id: string;
    name: string;
    description?: string;
    color?: string;
  }[];
  onUpdateItem: (id: string, updates: Partial<{
    startTime: string;
    endTime: string;
    duration: string;
    title: string;
    description: string;
    location: string;
    type: string;
    category?: string;
  }>) => void;
  onDeleteItem?: (id: string) => void;
  onMoveItem: (dragIndex: number, hoverIndex: number) => void;
  onAddItem: (category?: string, position?: number, prevItemIndex?: number) => void;
  onEditCategory?: (categoryId: string, updates: { name?: string; description?: string; color?: string }) => void;
  onMoveCategory?: (dragIndex: number, hoverIndex: number) => void;
  newItemId?: string | null;
  bulkEditMode?: boolean;
  selectedItems?: string[];
  onSelectItem?: (id: string) => void;
  showCategories?: boolean;
  showLocations?: boolean;
  showDescriptions?: boolean;
  showEndTimes?: boolean;
  showDurations?: boolean;
  showIcons?: boolean;
  showCategoriesOnItems?: boolean;
  showVendorsOnItems?: boolean;
  showVendorTypes?: boolean;
  timelineId?: number;
  showVendors?: boolean;
  onUpdateCustomFields?: (id: string, customFieldValues: Record<string, string | number | boolean | null>) => void;
  isPublicView?: boolean;
}

export function TimelineView({ 
  items: propItems, 
  categories, 
  onUpdateItem, 
  onDeleteItem,
  onMoveItem, 
  onMoveCategory,
  onAddItem, 
  onEditCategory,
  newItemId,
  bulkEditMode = false,
  selectedItems = [],
  onSelectItem,
  showCategories = true,
  showLocations = true,
  showDescriptions = true,
  showEndTimes = false,
  showDurations = true,
  showIcons = true,
  showCategoriesOnItems = true,
  showVendorsOnItems = true,
  showVendorTypes = true,
  timelineId,
  showVendors = true,
  onUpdateCustomFields,
  isPublicView = false,
}: TimelineViewProps) {
  const dispatch = useDispatch();
  
  // Always get the latest timeline items from Redux store
  const reduxItems = useSelector((state: any) => state.timeline.items);
  
  // IMPORTANT: Always use Redux items when available, never fall back to props
  // This is critical for seeing updates after bulk edit operations
  const items = useMemo(() => {
    // Only use props as fallback when Redux is empty (initialization)
    return reduxItems.length > 0 ? reduxItems : propItems;
  }, [reduxItems, propItems]); 
  
  // Use a counter to force re-render on Redux state changes
  const [renderKey, setRenderKey] = useState(0);
  
  // Force re-render when Redux items change
  useEffect(() => {
    setRenderKey(prev => prev + 1);
    
    // Enhanced debug logging
    console.log("TimelineView - Redux state updated:", { 
      reduxItemsCount: reduxItems.length,
      propItemsCount: propItems.length,
      usingReduxItems: reduxItems.length > 0,
      renderKey: renderKey + 1,
      // Log the actual time values for debugging
      reduxItemTimes: reduxItems.slice(0, 3).map(item => ({ 
        id: item.id, 
        startTime: item.startTime,
        endTime: item.endTime
      }))
    });
  }, [reduxItems]);
  
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  // Prevent default behavior for all events to avoid page reloads
  const preventDefaultForEventHandling = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Debug log
  useEffect(() => {
    console.log("TimelineView - Timeline ID:", timelineId);
  }, [timelineId]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  function renderTimelineItems(itemsToRender: typeof items, categoryName?: string) {
    // Add defensive check to ensure itemsToRender is an array
    if (!itemsToRender || !Array.isArray(itemsToRender)) {
      console.warn("Timeline items is not an array:", itemsToRender);
      return (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No events to display</p>
        </div>
      );
    }

    const relevantItems = showCategories && categoryName 
      ? itemsToRender.filter(item => item.category === categoryName)
      : itemsToRender;

    if (relevantItems.length === 0) {
      return (
        <div className="text-center py-4">
          {!isPublicView && (
            <>
              <Button
                variant="ghost"
                onClick={() => onAddItem(showCategories ? categoryName : undefined, 0)}
                className="rounded-full w-10 h-10 p-0 hover:bg-primary/10 bg-white dark:bg-zinc-900 shadow-sm"
              >
                <PlusCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">Add an event</p>
            </>
          )}
          {isPublicView && (
            <p className="text-sm text-muted-foreground">No events in this category</p>
          )}
        </div>
      );
    }

    const sortedItems = [...relevantItems].sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );

    return (
      <div className="space-y-4">
        {sortedItems.map((item, index) => {
          const categoryObj = categories.find(c => c.name === item.category);
          const color = categoryObj?.color || '#6366f1'; // Default to indigo if no color is set
          
          return (
            <div key={`${item.id}-${renderKey}`} className="relative group">
              <TimelineItem
                id={item.id}
                index={index}
                startTime={item.startTime}
                endTime={item.endTime}
                duration={item.duration}
                title={item.title}
                description={item.description}
                location={item.location}
                type={item.type}
                category={item.category}
                categories={categories.map(c => c.name)}
                color={color}
                allEvents={sortedItems}
                onMove={onMoveItem}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem || (() => {})}
                initialEditMode={item.id === newItemId}
                bulkEditMode={bulkEditMode}
                isSelected={selectedItems?.includes(item.id)}
                onSelect={onSelectItem}
                showLocations={showLocations}
                showDescriptions={showDescriptions}
                showEndTimes={showEndTimes}
                showDurations={showDurations}
                showCategories={showCategories && showCategoriesOnItems}
                showIcons={showIcons}
                showVendors={showVendors && showVendorsOnItems}
                showVendorTypes={showVendorTypes}
                timelineId={timelineId && timelineId > 0 ? timelineId : undefined}
                isPublicView={isPublicView}
              />
              
              {!isPublicView && (
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-4 z-10">
                  <Button
                    variant="ghost"
                    onClick={() => onAddItem(showCategories ? item.category : undefined, index + 1, index)}
                    className="rounded-full w-8 h-8 p-0 hover:bg-primary/10 bg-white dark:bg-zinc-900 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <PlusCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Render with the key to force re-render on Redux state changes
  return (
    <div className="space-y-8" key={`timeline-view-${renderKey}`}>
      {showCategories && showCategoriesOnItems && categories.length > 0 ? (
        categories.map((category) => {
          const isCollapsed = collapsedCategories.includes(category.id);
          return (
            <div key={`${category.id}-${renderKey}`} className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
              <div 
                className="flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 p-4 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center">
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 mr-2 text-purple-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 mr-2 text-purple-600" />
                  )}
                  <h3 className="text-lg font-medium text-foreground">
                    {category.name}
                  </h3>
                </div>
                {!isPublicView && !isCollapsed && (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddItem(category.name, 0);
                    }}
                    className="rounded-full w-8 h-8 p-0 hover:bg-primary/10 bg-white dark:bg-zinc-900 shadow-sm"
                  >
                    <PlusCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </Button>
                )}
              </div>
              
              {!isCollapsed && (
                <div className="p-4 space-y-4">
                  {category.description && (
                    <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-zinc-800 p-3 rounded-md mb-4">
                      {category.description}
                    </div>
                  )}
                  {renderTimelineItems(items, category.name)}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
              <Button
                variant="ghost"
                onClick={() => onAddItem()}
                className="rounded-full w-12 h-12 p-0 hover:bg-primary/10 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20"
              >
                <PlusCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </Button>
              <p className="mt-4 text-muted-foreground">Add your first timeline event to get started</p>
            </div>
          ) : (
            renderTimelineItems(items)
          )}
        </div>
      )}
    </div>
  );
}