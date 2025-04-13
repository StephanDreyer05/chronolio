import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Calendar,
  Users,
  FileText,
  Tag,
  Clock,
  Edit,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  PlusCircle,
  MapPin,
  CalendarDays,
  Clock3,
  Crown,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  parseISO,
  isBefore,
  addDays,
  differenceInDays,
} from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { MainNav } from "@/components/MainNav";
import { useSelector } from "react-redux";
import { RootState } from "@/store/settingsSlice";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { useTimelineNavigation } from "@/hooks/use-timeline-navigation";
import { useLocation } from "wouter";
import { useSubscription } from "@/contexts/subscription-context";

export default function DashboardPage() {
  const { toast } = useToast();
  const { eventTypes } = useSelector((state: RootState) => state.settings);
  const { collapsed } = useSidebar();
  const currentDate = format(new Date(), "EEEE, dd MMMM yyyy");
  const { handleNavigation } = useTimelineNavigation();
  const [, setLocation] = useLocation();

  // Fetch timelines
  const { data: timelines, isLoading: timelinesLoading } = useQuery<
    Array<{
      id: number;
      title: string;
      date: string;
      type?: string;
      location?: string;
      updated_at: string;
      last_modified: string;
    }>
  >({
    queryKey: ["/api/timelines"],
    queryFn: async () => {
      const response = await fetch("/api/timelines");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery<
    Array<{
      id: number;
      title: string;
    }>
  >({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });

  // Fetch vendors (contacts)
  const { data: vendors, isLoading: vendorsLoading } = useQuery<
    Array<{
      id: number;
      name: string;
    }>
  >({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });

  // Get upcoming events (next 30 days)
  const getUpcomingEvents = () => {
    if (!timelines) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = addDays(today, 30);

    return timelines
      .filter((timeline) => {
        const eventDate = new Date(timeline.date);
        return (
          !isBefore(eventDate, today) && isBefore(eventDate, thirtyDaysFromNow)
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5); // Show 5 upcoming events
  };

  // Get recently modified timelines
  const getRecentlyModifiedTimelines = () => {
    if (!timelines) return [];

    return [...timelines]
      .sort(
        (a, b) =>
          new Date(b.last_modified).getTime() -
          new Date(a.last_modified).getTime(),
      )
      .slice(0, 5); // Show 5 most recently modified
  };

  const formatUpdatedAt = (dateString?: string) => {
    if (!dateString) return "Not available";
    // Simple date formatting from timestamp
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getEventTypeColor = (type?: string) => {
    if (!type)
      return "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300";

    const typeObj = eventTypes?.find((t: any) => t.type === type);
    if (!typeObj)
      return "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300";

    return typeObj.color
      ? `${typeObj.color} text-white`
      : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300";
  };

  // Handle create with AI click
  const handleCreateWithAI = () => {
    handleNavigation("/timeline/new?ai=true");
  };

  // Function to calculate days until an event
  const getDaysUntilEvent = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateString);
    return differenceInDays(eventDate, today);
  };

  // Metrics cards
  const timelinesCount = timelinesLoading ? "..." : timelines?.length || 0;
  const contactsCount = vendorsLoading ? "..." : vendors?.length || 0;
  const templatesCount = templatesLoading ? "..." : templates?.length || 0;
  const eventTypesCount = eventTypes?.length || 0;

  // Get subscription status
  const {
    userSubscription,
    isSubscriptionActive,
    getTrialDaysLeft,
    getRemainingDays,
  } = useSubscription();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <MainNav />

      {/* Subscription status banner */}
      {userSubscription && (
        <div className="w-full z-20">
          {userSubscription.status === "on_trial" && (
            <div className="bg-amber-500 text-white p-2 text-center">
              <span className="font-medium flex items-center justify-center gap-2">
                <Crown className="h-4 w-4" />
                Trial active: {getTrialDaysLeft()} days remaining
              </span>
            </div>
          )}

          {userSubscription.status === "active" && (
            <div className="bg-green-600 text-white p-2 text-center">
              <span className="font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Premium subscription active
              </span>
            </div>
          )}

          {userSubscription.status === "cancelled" &&
            userSubscription.currentPeriodEnd && (
              <div className="bg-amber-500 text-white p-2 text-center">
                <span className="font-medium flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  Subscription cancelled but active until{" "}
                  {new Date(
                    userSubscription.currentPeriodEnd,
                  ).toLocaleDateString()}{" "}
                  ({getRemainingDays()} days left)
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLocation("/subscription")}
                    className="ml-2 bg-white text-amber-600 hover:bg-white/90"
                  >
                    Reactivate
                  </Button>
                </span>
              </div>
            )}

          {!isSubscriptionActive() &&
            userSubscription.status !== "on_trial" &&
            userSubscription.status !== "cancelled" && (
              <div className="bg-red-600 text-white p-2 text-center">
                <span className="font-medium flex items-center justify-center gap-2">
                  <span>No active subscription</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLocation("/subscription")}
                    className="ml-2 bg-white text-red-600 hover:bg-white/90"
                  >
                    Subscribe Now
                  </Button>
                </span>
              </div>
            )}
        </div>
      )}

      <div
        className={cn(
          "transition-all duration-300 min-h-screen",
          collapsed ? "ml-[70px]" : "ml-[250px]",
        )}
      >
        <header className="border-b bg-white dark:bg-black">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="space-y-8">
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card
                className="overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer bg-white dark:bg-zinc-900"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: "transparent",
                  backgroundImage:
                    "linear-gradient(to right, var(--primary-500/10) 0%, transparent 10%)",
                }}
                onClick={() => setLocation("/timelines")}
              >
                <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-primary to-secondary" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <Clock className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-60" />
                  </div>
                  <CardTitle className="text-2xl font-bold mt-2">
                    {timelinesCount}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Timelines</p>
                </CardContent>
              </Card>

              <Card
                className="overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer bg-white dark:bg-zinc-900"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: "transparent",
                  backgroundImage:
                    "linear-gradient(to right, var(--primary-500/10) 0%, transparent 10%)",
                }}
                onClick={() => setLocation("/contacts")}
              >
                <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-primary to-secondary" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <Users className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-60" />
                  </div>
                  <CardTitle className="text-2xl font-bold mt-2">
                    {contactsCount}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Contacts</p>
                </CardContent>
              </Card>

              <Card
                className="overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer bg-white dark:bg-zinc-900"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: "transparent",
                  backgroundImage:
                    "linear-gradient(to right, var(--primary-500/10) 0%, transparent 10%)",
                }}
                onClick={() => setLocation("/templates")}
              >
                <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-primary to-secondary" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <FileText className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-60" />
                  </div>
                  <CardTitle className="text-2xl font-bold mt-2">
                    {templatesCount}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Templates</p>
                </CardContent>
              </Card>

              <Card
                className="overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer bg-white dark:bg-zinc-900"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: "transparent",
                  backgroundImage:
                    "linear-gradient(to right, var(--primary-500/10) 0%, transparent 10%)",
                }}
                onClick={() => setLocation("/settings")}
              >
                <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-primary to-secondary" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <Calendar className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-60" />
                  </div>
                  <CardTitle className="text-2xl font-bold mt-2">
                    {eventTypesCount}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Event Types</p>
                </CardContent>
              </Card>
            </div>

            {/* Create New Timeline Section */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Create New Timeline
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                      Generate with AI
                    </CardTitle>
                    <CardDescription>
                      Let AI create your timeline based on your event details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Describe your event and let our AI suggest a detailed
                      timeline with all the necessary events.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={handleCreateWithAI}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                      Generate with AI
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PlusCircle className="h-5 w-5 mr-2 text-purple-500" />
                      Start from Scratch
                    </CardTitle>
                    <CardDescription>
                      Create a blank timeline and build it yourself
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Begin with a blank timeline and add your own custom
                      events, categories, and details.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                      <Link href="/timeline/new">Create New Timeline</Link>
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileSpreadsheet className="h-5 w-5 mr-2 text-purple-500" />
                      Use a Template
                    </CardTitle>
                    <CardDescription>
                      Start with a pre-configured timeline template
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose from{" "}
                      {templatesLoading ? "..." : templates?.length || 0} Try
                      templates to kickstart your timeline planning process.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                      <Link href="/templates">Create from a Template</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upcoming Events Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Upcoming Events
                  </h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href="/timelines"
                      className="flex items-center text-sm"
                    >
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {timelinesLoading ? (
                      <div className="p-6 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                        <p className="text-muted-foreground">
                          Loading events...
                        </p>
                      </div>
                    ) : getUpcomingEvents().length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-muted-foreground mb-2">
                          No upcoming events in the next 30 days
                        </p>
                        <Button asChild size="sm" className="mt-2">
                          <Link href="/timeline/new">Create Event</Link>
                        </Button>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {getUpcomingEvents().map((timeline) => (
                          <li
                            key={timeline.id}
                            className="hover:bg-gray-50 dark:hover:bg-zinc-900/60"
                          >
                            <Link href={`/timeline/${timeline.id}`}>
                              <div className="flex items-center p-4 cursor-pointer">
                                <div className="bg-gray-100 dark:bg-zinc-800 rounded-md p-2 flex flex-col items-center justify-center min-w-[50px] mr-4">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {format(parseISO(timeline.date), "MMM")}
                                  </span>
                                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                    {format(parseISO(timeline.date), "d")}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-foreground">
                                    {timeline.title}
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {timeline.location && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="w-3.5 h-3.5 text-purple-500 mr-1"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                          <circle
                                            cx="12"
                                            cy="10"
                                            r="3"
                                          ></circle>
                                        </svg>
                                        <span>{timeline.location}</span>
                                      </div>
                                    )}
                                    {timeline.type && (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEventTypeColor(timeline.type)}`}
                                      >
                                        {timeline.type}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last modified:{" "}
                                    {formatUpdatedAt(timeline.last_modified)}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end justify-center">
                                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                                    {getDaysUntilEvent(timeline.date)} days to
                                    go
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Recently Modified Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Recently Modified
                  </h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href="/timelines"
                      className="flex items-center text-sm"
                    >
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {timelinesLoading ? (
                      <div className="p-6 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                        <p className="text-muted-foreground">
                          Loading timelines...
                        </p>
                      </div>
                    ) : getRecentlyModifiedTimelines().length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-muted-foreground mb-2">
                          No recently modified timelines
                        </p>
                        <Button asChild size="sm" className="mt-2">
                          <Link href="/timeline/new">Create Timeline</Link>
                        </Button>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {getRecentlyModifiedTimelines().map((timeline) => (
                          <li
                            key={timeline.id}
                            className="hover:bg-gray-50 dark:hover:bg-zinc-900/60"
                          >
                            <Link href={`/timeline/${timeline.id}`}>
                              <div className="flex items-center p-4 cursor-pointer">
                                <div className="bg-gray-100 dark:bg-zinc-800 rounded-md p-2 flex flex-col items-center justify-center min-w-[50px] mr-4">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {format(parseISO(timeline.date), "MMM")}
                                  </span>
                                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                    {format(parseISO(timeline.date), "d")}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-foreground">
                                    {timeline.title}
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {timeline.location && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="w-3.5 h-3.5 text-purple-500 mr-1"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                          <circle
                                            cx="12"
                                            cy="10"
                                            r="3"
                                          ></circle>
                                        </svg>
                                        <span>{timeline.location}</span>
                                      </div>
                                    )}
                                    {timeline.type && (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEventTypeColor(timeline.type)}`}
                                      >
                                        {timeline.type}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last modified:{" "}
                                    {formatUpdatedAt(timeline.last_modified)}
                                  </p>
                                </div>
                                <Edit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
