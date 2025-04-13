import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sparkles, FileDown, Home, Share2, FileText } from "lucide-react";
import { setItems, updateWeddingInfo } from "@/store/timelineSlice";
import { RootState } from "@/store/store";
import { TimelineEditor } from "@/components/timeline/TimelineEditor";
import { AITimelineGenerator } from "@/components/timeline/AITimelineGenerator";
import { TimelineExport } from "@/components/timeline/TimelineExport";
import { TemplatesDialog } from "@/components/timeline/TemplatesDialog";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/images/CHRONOLIO logo.png";
import { useTemplateById } from '@/hooks/use-templates';

// Default event types for the trial page
const DEFAULT_EVENT_TYPES = [
  { id: '1', name: 'Wedding', color: '#4F46E5' },
  { id: '2', name: 'Birthday', color: '#EC4899' },
  { id: '3', name: 'Conference', color: '#10B981' },
  { id: '4', name: 'Function', color: '#F59E0B' },
  { id: '5', name: 'Meeting', color: '#6366F1' },
  { id: '6', name: 'Party', color: '#8B5CF6' },
  { id: '7', name: 'Event', color: '#F43F5E' }
];

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

// Helper function to calculate end time based on start time and duration
function calculateEndTime(startTime: string, duration: string): string {
  const [hours, minutes] = duration.split(':').map(Number);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  
  let endHours = startHours + hours;
  let endMinutes = startMinutes + minutes;
  
  // Handle minute overflow
  if (endMinutes >= 60) {
    endHours += Math.floor(endMinutes / 60);
    endMinutes = endMinutes % 60;
  }
  
  // Handle hour overflow
  if (endHours >= 24) {
    endHours = endHours % 24;
  }
  
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

export default function TrialPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [showEndTimes, setShowEndTimes] = useState(false);
  const [showVendors, setShowVendors] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const { toast } = useToast();

  const { items, weddingInfo } = useSelector((state: RootState) => state.timeline);
  
  // Use default event types instead of fetching from settings
  const eventTypes = DEFAULT_EVENT_TYPES;

  const dispatch = useDispatch();

  // Clean up timeline state on unmount
  useEffect(() => {
    return () => {
      dispatch(setItems([]));
      dispatch(updateWeddingInfo({
        names: "",
        date: "",
        type: "Event",
        location: ""
      }));
    };
  }, [dispatch]);

  const handleApplyTemplate = async (templateId: number) => {
    try {
      // Use direct fetch with error handling instead of the hook
      // The hook is meant to be used at the component level, not inside event handlers
      const response = await fetch(`/api/templates/${templateId}`);
      
      if (!response.ok) {
        // If API fails, create a detailed error message and throw it
        console.warn(`API call failed for template ${templateId}: ${response.status}`);
        throw new Error(`Failed to fetch template from API: ${response.statusText}`);
      }
      
      const template = await response.json();

      // Create new categories with unique IDs
      const newCategories = template.categories.map((cat: any, index: number) => ({
        id: Date.now().toString() + index,
        name: cat.name,
        description: cat.description || '',
        order: cat.order || 0,
      }));

      // Update the categories state
      setCategories(newCategories);
      setShowCategories(true);

      // Map template events to timeline items
      const templateEvents = template.events.map((event: any, index: number) => ({
        id: Date.now().toString() + index,
        startTime: event.startTime,
        endTime: calculateEndTime(event.startTime, event.duration),
        duration: event.duration,
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        type: event.type || 'event',
        category: event.category,
      }));

      // Update the timeline items
      dispatch(setItems(templateEvents));

      toast({
        title: "Success",
        description: "Template applied successfully",
      });
    } catch (error) {
      console.error('Template application error:', error);
      
      // Try to use the fallback mock data
      try {
        // Import the mock data directly
        const DETAILED_MOCK_TEMPLATES = {
          1: { // Wedding Day Timeline
            categories: [
              { name: "Preparations", description: "Getting ready activities", order: 1 },
              { name: "Ceremony", description: "Wedding ceremony events", order: 2 },
              { name: "Photos", description: "Photography sessions", order: 3 },
              { name: "Reception", description: "Wedding reception events", order: 4 }
            ],
            events: [
              { startTime: "08:00", duration: "02:00", title: "Hair & Makeup", description: "Bride and bridesmaids hair and makeup session", location: "Bridal Suite", type: "Wedding", category: "Preparations" },
              { startTime: "10:00", duration: "01:00", title: "Groom & Groomsmen Preparation", description: "Groom and groomsmen get ready", location: "Groom's Suite", type: "Wedding", category: "Preparations" },
              { startTime: "11:00", duration: "00:30", title: "Final Touches", description: "Last minute preparations and adjustments", location: "Bridal Suite", type: "Wedding", category: "Preparations" },
              { startTime: "12:00", duration: "00:30", title: "Guest Arrival", description: "Guests arrive and are seated", location: "Ceremony Venue", type: "Wedding", category: "Ceremony" },
              { startTime: "12:30", duration: "01:00", title: "Wedding Ceremony", description: "Exchange of vows and rings", location: "Ceremony Venue", type: "Wedding", category: "Ceremony" },
              { startTime: "13:30", duration: "01:30", title: "Family & Group Photos", description: "Formal photographs with family and wedding party", location: "Garden Area", type: "Wedding", category: "Photos" },
              { startTime: "15:00", duration: "01:00", title: "Cocktail Hour", description: "Guests enjoy drinks and appetizers", location: "Reception Venue", type: "Wedding", category: "Reception" },
              { startTime: "16:00", duration: "00:30", title: "Grand Entrance", description: "Introduction of the wedding party and newlyweds", location: "Reception Hall", type: "Wedding", category: "Reception" },
              { startTime: "16:30", duration: "01:30", title: "Dinner Service", description: "Formal dinner service", location: "Reception Hall", type: "Wedding", category: "Reception" },
              { startTime: "18:00", duration: "00:30", title: "Toasts & Speeches", description: "Best man and maid of honor speeches", location: "Reception Hall", type: "Wedding", category: "Reception" },
              { startTime: "18:30", duration: "00:30", title: "First Dance", description: "Newlyweds' first dance followed by parent dances", location: "Dance Floor", type: "Wedding", category: "Reception" },
              { startTime: "19:00", duration: "02:00", title: "Dancing & Entertainment", description: "Open dance floor and entertainment", location: "Reception Hall", type: "Wedding", category: "Reception" },
              { startTime: "21:00", duration: "00:30", title: "Cake Cutting", description: "Cutting of the wedding cake", location: "Reception Hall", type: "Wedding", category: "Reception" },
              { startTime: "21:30", duration: "00:30", title: "Bouquet & Garter Toss", description: "Traditional bouquet and garter toss", location: "Dance Floor", type: "Wedding", category: "Reception" },
              { startTime: "22:00", duration: "00:30", title: "Grand Exit", description: "Newlyweds' departure", location: "Venue Entrance", type: "Wedding", category: "Reception" }
            ]
          },
          2: { // Corporate Conference
            categories: [
              { name: "Registration", description: "Check-in activities", order: 1 },
              { name: "Sessions", description: "Main conference content", order: 2 },
              { name: "Networking", description: "Networking opportunities", order: 3 }
            ],
            events: [
              { startTime: "08:00", duration: "01:00", title: "Registration & Check-in", description: "Attendees arrive and collect badges", location: "Conference Center Lobby", type: "Conference", category: "Registration" },
              { startTime: "09:00", duration: "00:30", title: "Welcome Address", description: "Opening remarks by conference chair", location: "Main Hall", type: "Conference", category: "Sessions" },
              { startTime: "09:30", duration: "01:00", title: "Keynote Speaker", description: "Industry expert presentation", location: "Main Hall", type: "Conference", category: "Sessions" },
              { startTime: "10:30", duration: "00:30", title: "Coffee Break", description: "Refreshments and networking", location: "Foyer", type: "Conference", category: "Networking" },
              { startTime: "11:00", duration: "01:00", title: "Panel Discussion", description: "Expert panel on industry trends", location: "Main Hall", type: "Conference", category: "Sessions" },
              { startTime: "12:00", duration: "01:00", title: "Lunch", description: "Buffet lunch and networking", location: "Dining Area", type: "Conference", category: "Networking" },
              { startTime: "13:00", duration: "01:30", title: "Breakout Sessions", description: "Specialized topic discussions", location: "Conference Rooms", type: "Conference", category: "Sessions" },
              { startTime: "14:30", duration: "00:30", title: "Afternoon Break", description: "Refreshments and networking", location: "Foyer", type: "Conference", category: "Networking" },
              { startTime: "15:00", duration: "01:30", title: "Workshop", description: "Interactive skill-building session", location: "Workshop Room", type: "Conference", category: "Sessions" },
              { startTime: "16:30", duration: "00:30", title: "Closing Remarks", description: "Summary and next steps", location: "Main Hall", type: "Conference", category: "Sessions" }
            ]
          },
          3: { // Birthday Party
            categories: [
              { name: "Setup", description: "Preparation activities", order: 1 },
              { name: "Party", description: "Main celebration events", order: 2 }
            ],
            events: [
              { startTime: "15:00", duration: "02:00", title: "Venue Setup", description: "Decorating and arranging the venue", location: "Party Venue", type: "Birthday", category: "Setup" },
              { startTime: "17:00", duration: "00:30", title: "Host Preparation", description: "Final touches and getting ready", location: "Home", type: "Birthday", category: "Setup" },
              { startTime: "17:30", duration: "00:30", title: "Guest Arrival", description: "Welcoming guests", location: "Party Venue", type: "Birthday", category: "Party" },
              { startTime: "18:00", duration: "01:00", title: "Drinks & Appetizers", description: "Socializing and light refreshments", location: "Party Venue", type: "Birthday", category: "Party" },
              { startTime: "19:00", duration: "01:00", title: "Dinner", description: "Main meal service", location: "Dining Area", type: "Birthday", category: "Party" },
              { startTime: "20:00", duration: "00:30", title: "Cake & Speeches", description: "Birthday cake presentation and toasts", location: "Party Venue", type: "Birthday", category: "Party" },
              { startTime: "20:30", duration: "02:00", title: "Entertainment & Dancing", description: "Music, dancing and activities", location: "Party Venue", type: "Birthday", category: "Party" },
              { startTime: "22:30", duration: "00:30", title: "Farewell", description: "Saying goodbye to guests", location: "Party Venue", type: "Birthday", category: "Party" }
            ]
          },
          4: { // Team Meeting
            categories: [
              { name: "Introduction", description: "Opening items", order: 1 },
              { name: "Discussion", description: "Main agenda items", order: 2 }
            ],
            events: [
              { startTime: "09:00", duration: "00:15", title: "Welcome & Check-in", description: "Brief introduction and attendee check-in", location: "Meeting Room", type: "Meeting", category: "Introduction" },
              { startTime: "09:15", duration: "00:15", title: "Agenda Overview", description: "Review of meeting objectives and agenda", location: "Meeting Room", type: "Meeting", category: "Introduction" },
              { startTime: "09:30", duration: "00:45", title: "Project Updates", description: "Status updates on current projects", location: "Meeting Room", type: "Meeting", category: "Discussion" },
              { startTime: "10:15", duration: "00:45", title: "Strategy Discussion", description: "Discussion of upcoming strategy and goals", location: "Meeting Room", type: "Meeting", category: "Discussion" },
              { startTime: "11:00", duration: "00:30", title: "Action Items", description: "Assigning tasks and responsibilities", location: "Meeting Room", type: "Meeting", category: "Discussion" },
              { startTime: "11:30", duration: "00:30", title: "Q&A and Closing", description: "Addressing questions and wrapping up", location: "Meeting Room", type: "Meeting", category: "Discussion" }
            ]
          }
        };
        
        // Use mock template data
        const mockTemplate = DETAILED_MOCK_TEMPLATES[templateId as keyof typeof DETAILED_MOCK_TEMPLATES];
        
        if (!mockTemplate) {
          throw new Error('Template not found in mock data');
        }
        
        // Create new categories with unique IDs
        const newCategories = mockTemplate.categories.map((cat: any, index: number) => ({
          id: Date.now().toString() + index,
          name: cat.name,
          description: cat.description || '',
          order: cat.order || 0,
        }));

        // Update the categories state
        setCategories(newCategories);
        setShowCategories(true);

        // Map template events to timeline items
        const templateEvents = mockTemplate.events.map((event: any, index: number) => ({
          id: Date.now().toString() + index,
          startTime: event.startTime,
          endTime: calculateEndTime(event.startTime, event.duration),
          duration: event.duration,
          title: event.title,
          description: event.description || '',
          location: event.location || '',
          type: event.type || 'event',
          category: event.category,
        }));

        // Update the timeline items
        dispatch(setItems(templateEvents));

        toast({
          title: "Success",
          description: "Template applied successfully (using fallback data)",
        });
      } catch (mockError) {
        // If even the mock data fails, show an error
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to apply template",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(246,248,250)] dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/">
              <img src={logoImage} alt="Chronolio Logo" className="h-10" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Free Mode</span>
            <Link href="/auth">
              <Button size="sm" className="gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                Upgrade Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Info card */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Welcome to Chronolio
            </CardTitle>
            <CardDescription className="text-base">
              Create beautiful timelines for any event in minutes with our AI-powered platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-3">
                    In free mode, you can:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Create a timeline with our AI assistant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileDown className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Add, edit, and organize timeline events</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Share2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Export your timeline to PDF, Word & Excel</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">
                    Get started in seconds:
                  </p>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li>1. Click the "Generate Timeline with AI" button below</li>
                    <li>2. Tell us about your event</li>
                    <li>3. Let our AI create your timeline</li>
                    <li>4. Customize and export as needed</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it works section */}
        <Card className="mb-8 bg-white dark:bg-zinc-900 border border-purple-100 dark:border-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-purple-700 dark:text-purple-400">
              How it works
            </CardTitle>
            <CardDescription>
              Create your first timeline in just a few simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">1. Use AI or Choose a Template</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Start with a pre-made template or use our AI to create a custom timeline from your own prompt.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-3">
                  <FileDown className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">2. Customize</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Edit times, add details, and organize your timeline exactly how you want it or even ask AI to do it! Use the "Bulk Edit" to make multiple changes at once.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-3">
                  <Share2 className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">3. Export</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download your timeline in PDF, Word, or Excel format to share with others or edit externally.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button 
            onClick={() => setShowTemplatesDialog(true)}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            Browse Templates
          </Button>
          <Button 
            onClick={() => setShowAIDialog(true)}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {items.length > 0 ? "Edit with AI" : "Generate with AI"}
          </Button>
        </div>

        {/* Timeline Editor */}
        <TimelineEditor
          categories={categories}
          setCategories={setCategories}
          showCategories={showCategories}
          setShowCategories={setShowCategories}
          showEndTimes={showEndTimes}
          setShowEndTimes={setShowEndTimes}
          showVendors={showVendors}
          setShowVendors={setShowVendors}
          isTrial={true}
          onExport={() => setShowExportDialog(true)}
        />

        {/* Premium Features Section */}
        <Card className="mt-12 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-400">
              Upgrade to Access Premium Features
            </CardTitle>
            <CardDescription>
              Get access to all features and create unlimited timelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-2">
                <li><span className="font-medium text-purple-600 dark:text-purple-400">Save unlimited timelines</span> - Create and store as many events as you need</li>
                <li><span className="font-medium text-purple-600 dark:text-purple-400">Timeline participants</span> - Assign participants to timeline items</li>
                <li><span className="font-medium text-purple-600 dark:text-purple-400">Timeline Images</span> - Add images to timelines</li>
                <li><span className="font-medium text-purple-600 dark:text-purple-400">Custom event types</span> - Create custom event types and custom fields</li>
              </ul>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-2">
                <li><span className="font-medium text-purple-600 dark:text-purple-400">Contact management</span> - Track all your contacts & event vendors in one place</li>
                <li><span className="font-medium text-purple-600 dark:text-purple-400">Templates library</span> - Use templates to speed up your timeline creation</li>
                <li><span className="font-medium text-purple-600 dark:text-purple-400">Share your timelines</span> - Share your timelines via public link or email</li>
                <li><span className="font-medium text-purple-600 dark:text-purple-400">View customisation</span> - See all your events in a calendar, list or table view</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-center">
              <Link href="/auth">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8"
                >
                  Upgrade to Full Access
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Templates Dialog */}
        <TemplatesDialog
          open={showTemplatesDialog}
          onOpenChange={setShowTemplatesDialog}
          onApplyTemplate={handleApplyTemplate}
        />

        {/* AI Dialog */}
        <AITimelineGenerator
          open={showAIDialog}
          onClose={() => setShowAIDialog(false)}
          existingItems={items}
          isEditing={items.length > 0}
          setCategories={setCategories}
          setShowCategories={setShowCategories}
          existingTimeline={{
            title: weddingInfo.names,
            date: weddingInfo.date,
            location: weddingInfo.location,
            type: weddingInfo.type,
          }}
          isTrial={true}
        />

        {/* Export Dialog */}
        <TimelineExport
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          timeline={{
            title: weddingInfo.names || "My Timeline",
            date: weddingInfo.date || new Date().toISOString(),
            events: items,
            categories: categories,
          }}
          eventTypes={eventTypes || []}
          isTrial={true}
        />
      </div>
    </div>
  );
}