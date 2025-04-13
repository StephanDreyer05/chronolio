import { Switch, Route, Redirect } from "wouter";
import TimelinePage from "./pages/TimelinePage";
import DashboardPage from "./pages/DashboardPage";
import TimelinesPage from "./pages/TimelinesPage";
import CalendarPage from "./pages/CalendarPage";
import TemplatesPage from "./pages/TemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import VendorsPage from "./pages/VendorsPage";
import AuthPage from "./pages/AuthPage";
import PublicTimelinePage from "./pages/PublicTimelinePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TrialPage from "./pages/TrialPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import SubscriptionSuccessPage from "./pages/SubscriptionSuccessPage";
import SubscriptionCancelPage from "./pages/SubscriptionCancelPage";
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ThemeProvider } from "./components/ThemeProvider";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { TimelineNavigationProvider } from "@/hooks/use-timeline-navigation";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useEffect } from "react";
import { fetchSettings } from "@/store/settingsSlice";
import { useAuth } from "@/hooks/use-auth";

// Subscription-Protected Route component combining auth protection and subscription check
const SubscriptionProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType<any>, path: string }) => {
  return (
    <ProtectedRoute 
      {...rest} 
      component={() => (
        <SubscriptionGate>
          <Component />
        </SubscriptionGate>
      )} 
    />
  );
};

// Root Route component that redirects based on authentication status
const RootRoute = () => {
  const { isLoggedIn, isLoading } = useAuth();
  
  // Simplify the logic - we don't need to wait for isLoading to complete
  // Just use a simple check if user is already known to be logged in
  
  // If logged in, go to dashboard, otherwise go to auth page
  if (isLoggedIn) {
    return <Redirect to="/dashboard" />;
  } else {
    return <Redirect to="/auth" />;
  }
};

function AppContent() {
  const { isLoggedIn, isLoading } = useAuth();
  const dispatch = store.dispatch;
  
  useEffect(() => {
    // Only fetch settings if user is logged in and auth state is loaded
    // This effect runs only on authentication state changes
    if (!isLoading && isLoggedIn) {
      console.log('App component detected authenticated user, checking if settings need to be loaded');
      
      // Get current settings state
      const currentState = store.getState().settings;
      
      // Only fetch if settings aren't already loaded or loading
      if (currentState.eventTypes.length === 0 && !currentState.isLoading) {
        console.log('No settings data found, initiating fetch from App component');
        dispatch(fetchSettings());
      } else {
        console.log('Settings already loaded or loading, skipping fetch from App component');
      }
    }
  }, [isLoggedIn, isLoading]);

  return (
    <TimelineNavigationProvider>
      <Switch>
        {/* Root route that redirects based on auth status */}
        <Route path="/" component={RootRoute} />
        
        {/* Public routes - no authentication or subscription required */}
        <Route path="/auth" component={AuthPage} />
        <Route path="/verify-email" component={VerifyEmailPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/public/timeline/:token" component={PublicTimelinePage} />
        <Route path="/try" component={TrialPage} />
        
        {/* Subscription-related pages - authenticated but no subscription required */}
        <Route path="/subscription" component={SubscriptionPage} />
        <Route path="/subscription/success" component={SubscriptionSuccessPage} />
        <Route path="/subscription/cancel" component={SubscriptionCancelPage} />
        
        {/* Settings page - authenticated but no subscription required */}
        <ProtectedRoute path="/settings" component={SettingsPage} />
        
        {/* Protected routes that require subscription */}
        <SubscriptionProtectedRoute path="/timeline/new" component={TimelinePage} />
        <SubscriptionProtectedRoute path="/timeline/:id" component={TimelinePage} />
        <SubscriptionProtectedRoute path="/dashboard" component={DashboardPage} />
        <SubscriptionProtectedRoute path="/timelines" component={TimelinesPage} />
        <SubscriptionProtectedRoute path="/calendar" component={CalendarPage} />
        <SubscriptionProtectedRoute path="/templates" component={TemplatesPage} />
        <SubscriptionProtectedRoute path="/contacts" component={VendorsPage} />
        <SubscriptionProtectedRoute path="/vendors" component={VendorsPage} />
        
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </TimelineNavigationProvider>
  );
}

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Provider store={store}>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="app-theme">
            <SubscriptionProvider>
              <AppContent />
            </SubscriptionProvider>
          </ThemeProvider>
        </AuthProvider>
      </Provider>
    </DndProvider>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;