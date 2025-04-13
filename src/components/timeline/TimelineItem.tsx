import { useRef, useState, useEffect } from 'react';
import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TimelineIcons } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { format, addMinutes, parse } from 'date-fns';
import { X, Check, MapPin, GripVertical } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/settingsSlice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VendorSelector, VendorSelectorRef } from './VendorSelector';
import { TimelineVendorSelector, TimelineVendorSelectorRef } from './TimelineVendorSelector';

// Helper function to calculate end time
const calculateEndTime = (startTime: string, duration: string): string => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const durationMinutes = parseInt(duration);

  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
};

interface TimelineItemProps {
  id: string;
  index: number;
  startTime: string;
  endTime: string;
  duration: string;
  title: string;
  description: string;
  location: string;
  type: string;
  category?: string;
  categories: string[];
  color?: string;
  allEvents: Array<{
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
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onUpdate: (id: string, updates: Partial<{
    startTime: string;
    endTime: string;
    duration: string;
    title: string;
    description: string;
    location: string;
    type: string;
    category?: string;
  }>) => void;
  onDelete: (id: string) => void;
  initialEditMode?: boolean;
  bulkEditMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  newItemId?: string | null;
  showLocations?: boolean;
  showDescriptions?: boolean;
  showEndTimes?: boolean;
  showDurations?: boolean;
  showCategories?: boolean;
  showIcons?: boolean;
  timelineId?: number;
  showVendors?: boolean;
  showVendorTypes?: boolean;
  onUpdateCustomFields?: (id: string, customFieldValues: Record<string, string | number | boolean | null>) => void;
  isPublicView?: boolean;
  showVendorsOnItems?: boolean;
}

export function TimelineItem({
  id,
  index,
  startTime,
  endTime,
  duration,
  title,
  description,
  location,
  type,
  category,
  categories,
  color = '#000000',
  allEvents,
  onMove,
  onUpdate,
  onDelete,
  initialEditMode = false,
  bulkEditMode = false,
  isSelected = false,
  onSelect,
  newItemId = null,
  showLocations = true,
  showDescriptions = true,
  showEndTimes = false,
  showDurations = true,
  showCategories = true,
  showIcons = true,
  timelineId,
  showVendors = true,
  showVendorTypes = true,
  onUpdateCustomFields,
  isPublicView = false,
  showVendorsOnItems = true,
}: TimelineItemProps) {
  const [isEditing, setIsEditing] = useState(initialEditMode || id === newItemId);
  const [tempData, setTempData] = useState({
    startTime,
    duration,
    title,
    description,
    location,
    type,
    category,
  });

  const ref = useRef<HTMLDivElement>(null);
  const vendorSelectorRef = useRef<VendorSelectorRef>(null);
  const timelineVendorSelectorRef = useRef<TimelineVendorSelectorRef>(null);

  const { timeIncrement = 5, durationIncrement = 15 } = useSelector((state: RootState) => state.settings);

  const timeOptions = Array.from({ length: 24 * (60 / timeIncrement) }, (_, i) => {
    const minutes = i * timeIncrement;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  });

  const durationOptions = Array.from(
    { length: Math.floor(24 * 60 / durationIncrement) },
    (_, i) => (i + 1) * durationIncrement
  ).filter(duration => duration <= 24 * 60);

  // Debug log
  useEffect(() => {
    console.log(`TimelineItem ${id} - Timeline ID:`, timelineId);
  }, [id, timelineId]);

  const handleCancel = () => {
    if (initialEditMode) {
      onDelete(id);
    } else {
      setIsEditing(false);
      setTempData({
        startTime,
        duration,
        title,
        description,
        location,
        type,
        category,
      });
    }
  };

  const [{ isDragging }, drag] = useDrag({
    type: 'TIMELINE_ITEM',
    item: { id, index, startTime },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'TIMELINE_ITEM',
    hover(item: { id: string; index: number; startTime: string }, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      let newStartTime = startTime;
      if (allEvents.length > 0) {
        if (dragIndex > hoverIndex && hoverIndex > 0) {
          const prevEvent = allEvents[hoverIndex - 1];
          const prevEndTime = format(
            addMinutes(
              parse(prevEvent.startTime, 'HH:mm', new Date()),
              parseInt(prevEvent.duration)
            ),
            'HH:mm'
          );
          newStartTime = prevEndTime;
        } else if (dragIndex < hoverIndex && hoverIndex < allEvents.length - 1) {
          const nextEvent = allEvents[hoverIndex + 1];
          const currentDuration = parseInt(allEvents[dragIndex].duration);
          newStartTime = format(
            addMinutes(
              parse(nextEvent.startTime, 'HH:mm', new Date()),
              -currentDuration
            ),
            'HH:mm'
          );
        }
      }

      onMove(dragIndex, hoverIndex);
      onUpdate(item.id, { startTime: newStartTime });
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const handleSave = () => {
    const updates = {
      startTime: tempData.startTime,
      duration: tempData.duration,
      title: tempData.title,
      description: tempData.description,
      location: tempData.location,
      type: tempData.type,
      category: tempData.category,
    };

    // Calculate and add endTime
    const calculatedEndTime = calculateEndTime(tempData.startTime, tempData.duration);
    
    onUpdate(id, updates);
    setIsEditing(false);
  };

  const IconComponent = TimelineIcons[type as keyof typeof TimelineIcons]?.icon || TimelineIcons.event.icon;

  // Function to refresh vendors
  const handleVendorChange = () => {
    if (timelineVendorSelectorRef.current) {
      timelineVendorSelectorRef.current.refreshVendors();
    }
  };

  if (isEditing) {
    return (
      <div
        ref={ref}
        className={`p-4 sm:p-6 rounded-lg border shadow-sm bg-white dark:bg-zinc-900 ${isDragging ? 'opacity-50' : ''}`}
        style={{ borderColor: color }}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Select
                  value={tempData.type}
                  onValueChange={(value) => setTempData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="w-[60px] focus:ring-purple-500">
                    {tempData.type in TimelineIcons && (
                      <span className="text-purple-500">
                        {React.createElement(
                          TimelineIcons[tempData.type as keyof typeof TimelineIcons].icon, 
                          { className: "w-4 h-4" }
                        )}
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TimelineIcons).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="focus:bg-purple-50 dark:focus:bg-purple-900">
                        <div className="flex items-center gap-2">
                          {React.createElement(value.icon, { className: "w-4 h-4 text-purple-600" })}
                          <span>{value.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={tempData.title}
                  onChange={(e) => setTempData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xl focus-visible:ring-purple-500"
                  placeholder="Event title"
                />
              </div>
            </div>
          </div>

          {showCategories && categories.length > 0 && (
            <Select
              value={tempData.category}
              onValueChange={(value) => setTempData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-full focus:ring-purple-500">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="focus:bg-purple-50 dark:focus:bg-purple-900">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Start Time</label>
              <Select
                value={tempData.startTime}
                onValueChange={(value) => setTempData(prev => ({ ...prev, startTime: value }))}
              >
                <SelectTrigger className="w-full focus:ring-purple-500">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((timeString) => (
                    <SelectItem key={timeString} value={timeString} className="focus:bg-purple-50 dark:focus:bg-purple-900">
                      {timeString}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Duration</label>
              <Select
                value={tempData.duration}
                onValueChange={(value) => setTempData(prev => ({ ...prev, duration: value }))}
              >
                <SelectTrigger className="w-full focus:ring-purple-500">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((mins) => (
                    <SelectItem key={mins} value={mins.toString()} className="focus:bg-purple-50 dark:focus:bg-purple-900">
                      {mins} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
              <Input
                value={tempData.location}
                onChange={(e) => setTempData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full focus-visible:ring-purple-500"
                placeholder="Add location"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <Textarea
              value={tempData.description}
              onChange={(e) => setTempData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full focus-visible:ring-purple-500"
              placeholder="Add description"
            />
          </div>

          {showVendors && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Vendors</label>
              <div className="vendor-section">
                <TimelineVendorSelector 
                  timelineId={timelineId} 
                  eventId={id && !isNaN(parseInt(id)) ? parseInt(id) : undefined}
                  onVendorChange={handleVendorChange}
                  ref={timelineVendorSelectorRef}
                  showVendorTypes={showVendorTypes}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} className="bg-white hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              <X className="w-4 h-4 mr-2 text-purple-600" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!tempData.title.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`flex flex-col sm:flex-row bg-white dark:bg-zinc-900 gap-4 p-4 rounded-lg border shadow-sm 
        ${isPublicView ? '' : 'cursor-pointer'}
        ${isDragging ? 'opacity-50' : ''} 
        ${bulkEditMode ? 'cursor-pointer' : ''} 
        ${isSelected 
          ? 'border-purple-500 border-2 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-200 dark:ring-purple-800/30' 
          : bulkEditMode 
            ? 'opacity-70 hover:opacity-100 hover:border-purple-300 dark:hover:border-purple-700' 
            : 'hover:border-purple-300 dark:hover:border-purple-700'
        } 
        group transition-all duration-200 ease-in-out hover:shadow-md timeline-item`}
      style={{ borderLeft: `${isSelected ? '6px' : '4px'} solid #8b5cf6` }}
      onClick={(e) => {
        // Don't enter edit mode if public view
        if (isPublicView) {
          return;
        }
        
        // Don't enter edit mode if clicking on vendor section
        if (e.target && (e.target as HTMLElement).closest('.vendor-section')) {
          return;
        }
        
        if (bulkEditMode && onSelect) {
          onSelect(id);
        } else if (!bulkEditMode) {
          if (!(e.target as HTMLElement).closest('.action-buttons')) {
            setIsEditing(true);
          }
        }
      }}
    >
      {/* Mobile View Header */}
      <div className="flex items-center justify-between sm:hidden mb-2 w-full">
        <div className="flex items-center">
          {bulkEditMode && !isPublicView ? (
            <div className={`w-6 h-6 rounded-md border-2 ${isSelected ? 'bg-purple-500 border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800/30' : 'border-gray-400 dark:border-gray-600'} flex items-center justify-center mr-2`}>
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>
          ) : null}
          <div className="text-xl text-foreground">{startTime}</div>
          {showDurations && (
            <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">({duration} mins)</div>
          )}
          {showEndTimes && (
            <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
              - {calculateEndTime(startTime, duration)}
            </div>
          )}
        </div>
        {!isPublicView && (
          <div className="action-buttons flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop View Left Column (Time) */}
      <div className="hidden sm:flex-shrink-0 sm:flex sm:flex-col sm:justify-center sm:pr-4 sm:border-r border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-2xl text-foreground">{startTime}</div>
          {showDurations && (
            <div className="text-sm text-gray-600 dark:text-gray-400">{duration} mins</div>
          )}
          {showEndTimes && (
            <div className="text-2xl text-foreground mt-1">
              {calculateEndTime(startTime, duration)}
            </div>
          )}
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {showIcons && type && type in TimelineIcons && (
                  <span className="text-purple-500 flex-shrink-0">
                    {React.createElement(
                      TimelineIcons[type as keyof typeof TimelineIcons].icon, 
                      { className: "w-4 h-4" }
                    )}
                  </span>
                )}
                <h3 className="text-lg sm:text-xl font-medium text-foreground truncate">
                  {title}
                </h3>
                {showCategories && category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {category}
                  </span>
                )}
                {showLocations && location && (
                  <div className="ml-auto flex items-center text-sm text-gray-600 dark:text-gray-400 italic">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-purple-500 flex-shrink-0" />
                    {location}
                  </div>
                )}
              </div>
            </div>
          </div>

          {showDescriptions && description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {description}
            </p>
          )}
          
          {/* Vendor Section - show based on showVendors flag, regardless of view type */}
          {showVendors && (isPublicView ? showVendorsOnItems : true) && (
            <div className="mt-2 vendor-section">
              <TimelineVendorSelector 
                timelineId={timelineId} 
                eventId={id && !isNaN(parseInt(id)) ? parseInt(id) : undefined}
                onVendorChange={handleVendorChange}
                ref={timelineVendorSelectorRef}
                showVendorTypes={showVendorTypes}
              />
            </div>
          )}
        </div>
      </div>

      {/* Drag Handle and Delete Button - only show if not public view */}
      {!isPublicView && (
        <div className="hidden sm:flex sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:ml-2">
          <div className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <GripVertical className="h-5 w-5" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}