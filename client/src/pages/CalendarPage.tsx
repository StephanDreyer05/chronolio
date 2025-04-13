import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, addMonths, startOfYear, endOfYear } from "date-fns";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSelector } from 'react-redux';
import { RootState } from '@/store/settingsSlice';

interface Timeline {
  id: number;
  title: string;
  date: string;
  type?: string;
  location?: string;
}

type ViewType = 'month' | 'quarter' | 'year';

export default function CalendarPage() {
  const { defaultCalendarView } = useSelector((state: RootState) => state.settings);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewType>(defaultCalendarView || 'month');

  const { data: timelines } = useQuery<Timeline[]>({
    queryKey: ['/api/timelines'],
  });

  const timelineDates = timelines?.reduce((acc, timeline) => {
    const timelineDate = new Date(timeline.date);
    acc[format(timelineDate, 'yyyy-MM-dd')] = true;
    return acc;
  }, {} as Record<string, boolean>);

  const getCalendarFromTo = () => {
    switch (view) {
      case 'month':
        return { from: date, to: addMonths(date, 0) };
      case 'quarter':
        return { from: date, to: addMonths(date, 2) };
      case 'year':
        return { from: startOfYear(date), to: endOfYear(date) };
      default:
        return { from: date, to: addMonths(date, 0) };
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(246,248,250)] dark:bg-black">
      <header className="border-b bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-serif font-bold text-foreground">
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Timeline Generator</span>
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-serif font-bold text-foreground">Calendar View</h2>
          <Button 
            variant="outline" 
            asChild
            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
          >
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2 text-purple-500" />
              Back to List View
            </Link>
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          <Button 
            variant={view === 'month' ? 'default' : 'outline'}
            onClick={() => setView('month')}
            className={view === 'month' 
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md" 
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"}
          >
            Month
          </Button>
          <Button 
            variant={view === 'quarter' ? 'default' : 'outline'}
            onClick={() => setView('quarter')}
            className={view === 'quarter' 
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md" 
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"}
          >
            Quarter
          </Button>
          <Button 
            variant={view === 'year' ? 'default' : 'outline'}
            onClick={() => setView('year')}
            className={view === 'year' 
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md" 
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"}
          >
            Year
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                {...getCalendarFromTo()}
                modifiers={{
                  event: (date) => timelineDates?.[format(date, 'yyyy-MM-dd')] || false
                }}
                modifiersClassNames={{
                  event: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold"
                }}
                numberOfMonths={view === 'quarter' ? 3 : view === 'year' ? 12 : 1}
              />
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4 text-foreground">
                Timelines on {format(date, 'MMMM do, yyyy')}
              </h2>
              <div className="space-y-4">
                {timelines
                  ?.filter(timeline => format(new Date(timeline.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                  .map(timeline => (
                    <Link key={timeline.id} href={`/timeline/${timeline.id}`}>
                      <div className="p-3 rounded-lg border hover:border-purple-400 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
                        <div className="flex items-start gap-3">
                          <div className="bg-gray-100 dark:bg-zinc-800 rounded-md p-2 flex flex-col items-center justify-center min-w-[50px]">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(timeline.date), 'MMM')}
                            </span>
                            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {format(new Date(timeline.date), 'd')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{timeline.title}</h3>
                            {timeline.type && (
                              <div className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                {timeline.type}
                              </div>
                            )}
                            {timeline.location && (
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                  <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <span>{timeline.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                {(!timelines || timelines.filter(timeline => 
                  format(new Date(timeline.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                ).length === 0) && (
                  <p className="text-muted-foreground">No timelines scheduled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}