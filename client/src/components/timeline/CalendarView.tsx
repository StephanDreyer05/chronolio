import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, eachMonthOfInterval, isSameDay, addMonths, addQuarters, addYears, addWeeks, parseISO, parse } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelector } from 'react-redux';
import { RootState } from '@/store/settingsSlice';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ViewMode = 'month' | 'quarter' | 'year';

interface CalendarViewProps {
  timelines: Array<{
    id: number;
    title: string;
    date: string;
    type?: string;
    location?: string;
    updated_at: string;
    last_modified: string; // Added last_modified field
  }>;
}

export function CalendarView({ timelines }: CalendarViewProps) {
  const { eventTypes, defaultCalendarView } = useSelector((state: RootState) => state.settings);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultCalendarView || 'month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNewTimelineDialog, setShowNewTimelineDialog] = useState(false);
  const [newTimelineDate, setNewTimelineDate] = useState<Date | null>(null);
  const [, navigate] = useLocation();

  // Debug: Log the timeline data
  useEffect(() => {
    console.log('All timeline data:', JSON.stringify(timelines, null, 2));
    if (timelines.length > 0) {
      console.log('First timeline object:', timelines[0]);
      console.log('Keys in first timeline:', Object.keys(timelines[0]));
      console.log('updated_at value:', timelines[0].updated_at);
      console.log('updated_at type:', typeof timelines[0].updated_at);
    }
  }, [timelines]);

  const getEventTypeColor = (type?: string) => {
    if (!type || !eventTypes) return '#6d28d9'; // Default purple color
    const eventType = eventTypes.find(et => et.type === type);
    return eventType?.color || '#6d28d9';
  };

  // Format the updated_at date or return null if invalid
  const formatUpdatedAt = (dateString?: string) => {
    if (!dateString) return 'Not available';
    // Simple date formatting from timestamp
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatLastModified = (dateString?: string) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch (error) {
      return 'Not available';
    }
  };

  const handleDayClick = (date: Date) => {
    const hasEvents = getEventsForDate(date).length > 0;
    if (!hasEvents) {
      setNewTimelineDate(date);
      setShowNewTimelineDialog(true);
    }
  };

  const handleCreateTimeline = () => {
    if (newTimelineDate) {
      const formattedDate = format(newTimelineDate, 'yyyy-MM-dd');
      navigate(`/timeline/new?date=${formattedDate}`);
      setShowNewTimelineDialog(false);
    }
  };

  const getDateInterval = (date: Date, mode: ViewMode) => {
    switch (mode) {
      case 'month':
        return { start: startOfMonth(date), end: endOfMonth(date) };
      case 'quarter':
        return { start: startOfQuarter(date), end: endOfQuarter(date) };
      case 'year':
        return { start: startOfYear(date), end: endOfYear(date) };
      default:
        return { start: startOfMonth(date), end: endOfMonth(date) };
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const modifier = direction === 'next' ? 1 : -1;
    switch (viewMode) {
      case 'month':
        setSelectedDate(addMonths(selectedDate, modifier));
        break;
      case 'quarter':
        setSelectedDate(addQuarters(selectedDate, modifier));
        break;
      case 'year':
        setSelectedDate(addYears(selectedDate, modifier));
        break;
    }
  };

  const currentInterval = getDateInterval(selectedDate, viewMode);
  const monthsToShow = eachMonthOfInterval(currentInterval);

  const getEventsForDate = (date: Date) => {
    return timelines.filter(event =>
      isSameDay(new Date(event.date), date)
    );
  };

  const eventsInView = timelines.filter(timeline => {
    const eventDate = new Date(timeline.date);
    return isWithinInterval(eventDate, currentInterval);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('prev')}
            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
          >
            <ChevronLeft className="h-4 w-4 text-purple-500" />
          </Button>
          <h3 className="text-xl font-medium">
            {format(currentInterval.start, 'MMMM d')} - {format(currentInterval.end, 'MMMM d, yyyy')}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('next')}
            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
          >
            <ChevronRight className="h-4 w-4 text-purple-500" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'month' ? 'default' : 'outline'}
            onClick={() => setViewMode('month')}
            className={viewMode === 'month' 
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm" 
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"}
            size="sm"
          >
            Month
          </Button>
          <Button 
            variant={viewMode === 'quarter' ? 'default' : 'outline'}
            onClick={() => setViewMode('quarter')}
            className={viewMode === 'quarter' 
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm" 
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"}
            size="sm"
          >
            Quarter
          </Button>
          <Button 
            variant={viewMode === 'year' ? 'default' : 'outline'}
            onClick={() => setViewMode('year')}
            className={viewMode === 'year' 
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm" 
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"}
            size="sm"
          >
            Year
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${viewMode === 'year' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : viewMode === 'quarter' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {(viewMode === 'year' || viewMode === 'quarter' ? monthsToShow : [selectedDate]).map((month, index) => (
          <div key={index} className="flex justify-center">
            <TooltipProvider>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && handleDayClick(date)}
                month={month}
                className="rounded-md w-full"
                showOutsideDays={false}
                fixedWeeks
                weekStartsOn={1}
                classNames={{
                  nav_button: "hidden",
                  nav_button_previous: "hidden",
                  nav_button_next: "hidden",
                  months: "flex flex-col space-y-4",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-purple-600 dark:text-purple-400 font-medium",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] flex-1 text-center",
                  row: "flex w-full mt-2",
                  cell: "relative p-0 text-center flex-1 h-8 sm:h-10",
                  day: "h-8 w-8 sm:h-10 sm:w-10 p-0 mx-auto font-normal aria-selected:opacity-100",
                  day_selected: "bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus:bg-purple-600 focus:text-white",
                  day_today: "border-2 border-purple-600 rounded-md",
                }}
                components={{
                  Day: ({ date, ...props }: { date: Date } & Record<string, any>) => {
                    const events = getEventsForDate(date);
                    const hasEvents = events.length > 0;

                    return (
                      <div className="flex items-center justify-center">
                        {hasEvents ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                {...props}
                                style={{
                                  backgroundColor: hasEvents ? "rgba(147, 51, 234, 0.15)" : undefined,
                                  color: hasEvents ? "#6d28d9" : undefined,
                                }}
                                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-md font-bold flex items-center justify-center ${props.className || ''}`}
                              >
                                {date.getDate()}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="p-0 overflow-hidden">
                              <div className="max-h-[300px] overflow-y-auto">
                                {events.map(event => (
                                  <Link key={event.id} href={`/timeline/${event.id}`}>
                                    <div className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b last:border-b-0 cursor-pointer">
                                      <div className="font-medium text-foreground">{event.title}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Last modified: {formatLastModified(event.last_modified)} {/* Updated line */}
                                      </div>
                                      {event.type && (
                                        <div 
                                          className="text-xs inline-block px-2 py-0.5 rounded-full mt-1"
                                          style={{ 
                                            backgroundColor: `${getEventTypeColor(event.type)}20`,
                                            color: getEventTypeColor(event.type) 
                                          }}
                                        >
                                          {event.type}
                                        </div>
                                      )}
                                      {event.location && (
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center">
                                          <MapPin className="h-3 w-3 mr-1" />
                                          {event.location}
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <button
                            {...props}
                            onClick={() => handleDayClick(date)}
                            className={`h-8 w-8 sm:h-10 sm:w-10 rounded-md flex items-center justify-center ${props.className || ''}`}
                          >
                            {date.getDate()}
                          </button>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </TooltipProvider>
          </div>
        ))}
      </div>

      {eventsInView.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">
            Events {viewMode === 'month' 
              ? `in ${format(currentInterval.start, 'MMMM yyyy')}` 
              : viewMode === 'quarter' 
                ? `for ${format(currentInterval.start, 'MMMM')} to ${format(currentInterval.end, 'MMMM yyyy')}` 
                : `for ${format(currentInterval.start, 'yyyy')}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventsInView.map(event => {
              const color = getEventTypeColor(event.type);
              return (
                <Link key={event.id} href={`/timeline/${event.id}`}>
                  <Card className="group hover:shadow-md transition-shadow overflow-hidden bg-white dark:bg-zinc-900 border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-gray-100 dark:bg-zinc-800 rounded-md p-2 flex flex-col items-center justify-center min-w-[50px]">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(event.date), 'MMM')}
                          </span>
                          <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                            {format(new Date(event.date), 'd')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground group-hover:text-purple-600 transition-colors">
                            {event.title}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Last modified: {formatLastModified(event.last_modified)} {/* Updated line */}
                          </div>
                          {event.type && (
                            <div 
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1"
                              style={{ 
                                backgroundColor: `${color}20`,
                                color: color 
                              }}
                            >
                              {event.type}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={showNewTimelineDialog} onOpenChange={setShowNewTimelineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Timeline</DialogTitle>
            <DialogDescription>
              Would you like to create a new timeline for {newTimelineDate && format(newTimelineDate, 'MMMM d, yyyy')}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTimelineDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTimeline}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
            >
              Create Timeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}