import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  LogOut, 
  User, 
  Home, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Lightbulb,
  PlusCircle,
  LayoutDashboard,
  Clock,
  CreditCard
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/hooks/use-sidebar";
import { format } from "date-fns";
import { useTimelineNavigation } from "@/hooks/use-timeline-navigation";
import { useToast } from "@/hooks/use-toast";
import LogoImage from "@/assets/images/CHRONOLIO logo.png";

export function MainNav() {
  const [location] = useLocation();
  const { collapsed, toggle } = useSidebar();
  const [featureRequest, setFeatureRequest] = useState("");
  const [featureEmail, setFeatureEmail] = useState("");
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const currentDate = format(new Date(), "EEEE, dd MMMM yyyy");
  const { handleNavigation } = useTimelineNavigation();
  
  // Check if we're on a timeline page
  const isTimelinePage = location.startsWith('/timeline/');

  const menuItems = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 text-purple-500" /> },
    { href: "/timelines", label: "Timelines", icon: <Clock className="h-5 w-5 text-purple-500" /> },
    { href: "/templates", label: "Templates", icon: <FileText className="h-5 w-5 text-purple-500" /> },
    { href: "/contacts", label: "Contacts", icon: <Users className="h-5 w-5 text-purple-500" /> },
    { href: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 text-purple-500" /> },
  ];

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  const { toast } = useToast();
  
  const handleFeatureSubmit = async () => {
    if (!featureRequest.trim()) {
      toast({
        title: "Error",
        description: "Please provide a feature description",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch('/api/feature-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: featureRequest,
          email: featureEmail || null
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit feature suggestion');
      }
      
      toast({
        title: "Success",
        description: "Your feature suggestion has been submitted. Thank you for your feedback!",
      });
      
      setFeatureDialogOpen(false);
      setFeatureRequest("");
      setFeatureEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit feature suggestion",
        variant: "destructive"
      });
    }
  };

  // Custom navigation handler
  const handleMenuItemClick = (path: string, e: React.MouseEvent) => {
    if (isTimelinePage) {
      e.preventDefault();
      handleNavigation(path);
    }
  };

  return (
    <div className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-background border-r transition-all duration-300",
      collapsed ? "w-[70px]" : "w-[250px]"
    )}>
      {/* Logo and collapse button - Exactly 81px height to match page headers */}
      <div className="flex items-center justify-between p-4 border-b h-[105px]">
        {!collapsed && (
          <div className="font-sans font-bold text-3xl">
            <Link href="/">
              <img 
                src={LogoImage} 
                alt="Chronolio Logo" 
                className="h-10 w-auto"
              />
            </Link>
          </div>
        )}
        <div className={cn("flex items-center", collapsed ? "mx-auto" : "ml-auto")}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggle}
          >
            {collapsed ? <ChevronRight className="h-5 w-5 text-purple-500" /> : <ChevronLeft className="h-5 w-5 text-purple-500" />}
          </Button>
        </div>
      </div>

      {/* Current Date */}
      {!collapsed && (
        <div className="px-4 py-3 text-base text-muted-foreground">
          {currentDate}
        </div>
      )}

      {/* New Timeline button at the top */}
      <div className="px-2 mt-2 mb-4">
        {isTimelinePage ? (
          <Button 
            variant="default"
            className={cn(
              "w-full justify-start bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white",
              collapsed ? "px-2" : "px-3"
            )}
            onClick={(e) => handleMenuItemClick("/timeline/new", e)}
          >
            <span className={cn(
              collapsed ? "mx-auto" : "mr-3"
            )}>
              <PlusCircle className="h-5 w-5 text-white" />
            </span>
            {!collapsed && <span>New Timeline</span>}
          </Button>
        ) : (
          <Link href="/timeline/new">
            <Button 
              variant="default"
              className={cn(
                "w-full justify-start bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white",
                collapsed ? "px-2" : "px-3"
              )}
            >
              <span className={cn(
                collapsed ? "mx-auto" : "mr-3"
              )}>
                <PlusCircle className="h-5 w-5 text-white" />
              </span>
              {!collapsed && <span>New Timeline</span>}
            </Button>
          </Link>
        )}
      </div>

      {/* Navigation items - with settings moved to bottom */}
      <div className="py-4">
        <nav className="space-y-1 px-2">
          {menuItems.filter(item => item.href !== '/settings').map((item) => (
            isTimelinePage ? (
              <Button 
                key={item.href}
                variant={location === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start mb-1",
                  collapsed ? "px-2" : "px-3"
                )}
                onClick={(e) => handleMenuItemClick(item.href, e)}
              >
                <span className={cn(
                  collapsed ? "mx-auto" : "mr-3"
                )}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Button>
            ) : (
              <Link 
                key={item.href} 
                href={item.href}
              >
                <Button 
                  variant={location === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start mb-1",
                    collapsed ? "px-2" : "px-3"
                  )}
                >
                  <span className={cn(
                    collapsed ? "mx-auto" : "mr-3"
                  )}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            )
          ))}
        </nav>
      </div>

      {/* Bottom menu items */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-4 border-t",
        collapsed ? "flex flex-col items-center gap-4" : ""
      )}>
        {/* Suggest a feature moved above settings */}
        <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start mb-3",
                collapsed ? "px-2" : "px-3"
              )}
            >
              <span className={cn(
                collapsed ? "mx-auto" : "mr-3"
              )}>
                <Lightbulb className="h-5 w-5 text-purple-500" />
              </span>
              {!collapsed && <span>Suggest a feature</span>}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suggest a feature</DialogTitle>
              <DialogDescription>
                We value your feedback! Let us know what features you'd like to see.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="feature-request">Feature description</Label>
                <Textarea 
                  id="feature-request" 
                  placeholder="Describe the feature you'd like to see..." 
                  value={featureRequest}
                  onChange={(e) => setFeatureRequest(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={featureEmail}
                  onChange={(e) => setFeatureEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleFeatureSubmit}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings */}
        {isTimelinePage ? (
          <Button 
            variant={location === '/settings' ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start mb-3",
              collapsed ? "px-2" : "px-3"
            )}
            onClick={(e) => handleMenuItemClick("/settings", e)}
          >
            <span className={cn(
              collapsed ? "mx-auto" : "mr-3"
            )}>
              <Settings className="h-5 w-5 text-purple-500" />
            </span>
            {!collapsed && <span>Settings</span>}
          </Button>
        ) : (
          <Link href="/settings">
            <Button 
              variant={location === '/settings' ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start mb-3",
                collapsed ? "px-2" : "px-3"
              )}
            >
              <span className={cn(
                collapsed ? "mx-auto" : "mr-3"
              )}>
                <Settings className="h-5 w-5 text-purple-500" />
              </span>
              {!collapsed && <span>Settings</span>}
            </Button>
          </Link>
        )}

        {/* User profile section */}
        {isTimelinePage ? (
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start mb-3",
              collapsed ? "px-2" : "px-3"
            )}
            onClick={(e) => handleMenuItemClick("/settings", e)}
          >
            <span className={cn(
              collapsed ? "mx-auto" : "mr-3"
            )}>
              <User className="h-5 w-5 text-purple-500" />
            </span>
            {!collapsed && (
              <div className="flex flex-col items-start">
                <span className="font-medium">
                  {user?.username && user.username.length > 15 
                    ? `${user.username.substring(0, 15)}...` 
                    : user?.username}
                </span>
                <span className="text-xs text-muted-foreground">View profile</span>
              </div>
            )}
          </Button>
        ) : (
          <Link href="/settings">
            <Button 
              variant="ghost"
              className={cn(
                "w-full justify-start mb-3",
                collapsed ? "px-2" : "px-3"
              )}
            >
              <span className={cn(
                collapsed ? "mx-auto" : "mr-3"
              )}>
                <User className="h-5 w-5 text-purple-500" />
              </span>
              {!collapsed && (
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {user?.username && user.username.length > 15 
                      ? `${user.username.substring(0, 15)}...` 
                      : user?.username}
                  </span>
                  <span className="text-xs text-muted-foreground">View profile</span>
                </div>
              )}
            </Button>
          </Link>
        )}

        {/* Horizontal line above Sign out */}
        <div className="border-t my-2 w-full"></div>

        {/* Sign out button */}
        <Button 
          variant="ghost" 
          size={collapsed ? "icon" : "default"}
          onClick={handleLogout}
          className={cn(
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full justify-start",
            collapsed ? "px-2" : "px-3"
          )}
        >
          <span className={cn(
            collapsed ? "mx-auto" : "mr-3"
          )}>
            <LogOut className="h-5 w-5 text-red-500" />
          </span>
          {!collapsed && <span>Sign out</span>}
        </Button>
      </div>
    </div>
  );
}