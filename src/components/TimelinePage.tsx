import { useState } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, Save, Edit2, RefreshCw, CornerDownRight, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TimelineView } from '@/components/timeline/TimelineView';
import { format } from 'date-fns';

export const TimelinePage = () => {
  const [eventName, setEventName] = useState('Nicole & Stephan\'s Wedding123');
  const [eventDate, setEventDate] = useState('2025-04-22');
  const [eventType, setEventType] = useState('Wedding');
  const [venue, setVenue] = useState('Belair Pavilion');
  const [guestCount, setGuestCount] = useState('');
  const [rehearsalDate, setRehearsalDate] = useState('');
  const [livingIn, setLivingIn] = useState('');
  const [lastModified, setLastModified] = useState('2025-03-15T14:30:00Z');

  const [showCategories, setShowCategories] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [showDescriptions, setShowDescriptions] = useState(false);
  const [showEndTimes, setShowEndTimes] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 max-w-4xl">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/timelines" className="flex items-center space-x-2 text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-5 w-5" />
            <span>Back to Timelines</span>
          </Link>
          <div className="flex space-x-2">
            <Button variant="outline">Save as Template</Button>
            <Button variant="outline">Edit with AI</Button>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-6 mb-8">
          <div className="text-center">
            <Input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="text-2xl font-bold text-center border-none shadow-none"
            />
            <div className="text-sm text-muted-foreground mt-1">
              Last modified: {format(new Date(lastModified), 'MMM d, yyyy h:mm a')}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-48 text-center"
            />
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wedding">Wedding</SelectItem>
                <SelectItem value="Birthday">Birthday</SelectItem>
                <SelectItem value="Anniversary">Anniversary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="text-center text-muted-foreground"
            placeholder="Venue"
          />
        </div>

        {/* Toggle Options */}
        <Card className="mb-6">
          <CardContent className="flex justify-between items-center py-4">
            <div className="flex space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showCategories}
                  onCheckedChange={setShowCategories}
                />
                <Label>Show categories</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showLocations}
                  onCheckedChange={setShowLocations}
                />
                <Label>Show locations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showDescriptions}
                  onCheckedChange={setShowDescriptions}
                />
                <Label>Show descriptions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showEndTimes}
                  onCheckedChange={setShowEndTimes}
                />
                <Label>Show end times</Label>
              </div>
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save Details</span>
            </Button>
          </CardContent>
        </Card>

        {/* Timeline Details */}
        <Card>
          <CardContent className="py-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Guest Count</Label>
                <Input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  placeholder="Enter guest count"
                />
              </div>
              <div className="space-y-2">
                <Label>Rehearsal Date</Label>
                <Input
                  type="date"
                  value={rehearsalDate}
                  onChange={(e) => setRehearsalDate(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Living in</Label>
                <Input
                  value={livingIn}
                  onChange={(e) => setLivingIn(e.target.value)}
                  placeholder="Enter living location"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline View */}
        <TimelineView
          items={items}
          categories={categories}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onMoveItem={handleMoveItem}
          onAddItem={handleAddItem}
          onEditCategory={handleEditCategory}
          onMoveCategory={handleMoveCategory}
          newItemId={newItemId}
          showCategories={showCategories}
          showLocations={showLocations}
          showDescriptions={showDescriptions}
          showEndTimes={showEndTimes}
        />

        {/* Bottom Actions */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button variant="outline" className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline">Bulk Edit</Button>
            <Button>Export</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePage;

const items = [];
const categories = [];
const handleUpdateItem = () => {};
const handleDeleteItem = () => {};
const handleMoveItem = () => {};
const handleAddItem = () => {};
const handleEditCategory = () => {};
const handleMoveCategory = () => {};
const newItemId = '';