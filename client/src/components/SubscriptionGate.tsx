import { ReactNode, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useSubscription } from '@/contexts/subscription-context';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SubscriptionGateProps = {
  children: ReactNode;
};

/**
 * A component that restricts access to children components based on subscription status.
 * If the user doesn't have an active subscription, they will be shown a message to upgrade.
 * Users will still be able to access the settings page to manage their subscription.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { isSubscriptionActive, userSubscription, plans } = useSubscription();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [isSettingsPage] = useRoute('/settings');
  const [isLoginPage] = useRoute('/login');
  const [isRegisterPage] = useRoute('/register');
  const [isSubscriptionPage] = useRoute('/subscription');
  const [isSubscriptionSuccessPage] = useRoute('/subscription/success');
  const [isSubscriptionCancelPage] = useRoute('/subscription/cancel');
  const { toast } = useToast();

  // Check for dashboard and auth pages
  const [isDashboardPage] = useRoute('/dashboard');
  const [isAuthPage] = useRoute('/auth');
  const [isRootPage] = useRoute('/');
  
  // Pages that are always accessible regardless of subscription status
  const isPublicPage = 
    isSettingsPage || 
    isLoginPage || 
    isRegisterPage || 
    isSubscriptionPage || 
    isSubscriptionSuccessPage || 
    isSubscriptionCancelPage || 
    isAuthPage;  // Add auth page to public pages
    
  // Pages that should bypass the loading check
  const bypassLoadingCheck = isAuthPage || isDashboardPage || isRootPage;

  // Fetch the most popular plan variant (for the upgrade button)
  const popularPlan = plans[0]?.variants?.find(v => v.interval === 'year') || plans[0]?.variants?.[0];
  
  // Get the days left in trial or subscription
  const { getTrialDaysLeft, getRemainingDays } = useSubscription();

  useEffect(() => {
    // If the user is logged in, has loaded subscription data, 
    // doesn't have an active subscription, and is not on a public page
    if (isLoggedIn && userSubscription !== null && !isSubscriptionActive() && !isPublicPage) {
      // Show a toast notification
      toast({
        title: "Subscription Required",
        description: "Please subscribe to access this feature.",
        variant: "default",
      });
      
      // Redirect to the subscription page
      navigate('/subscription');
    }
  }, [isLoggedIn, userSubscription, isSubscriptionActive, isPublicPage, location]);

  // If the user is on a public page, allow access regardless of subscription status
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Check if we just came from a payment page (subscription success page)
  const [isFromPayment] = useRoute('/subscription/success');
  
  // If auth is still loading (regardless of subscription), and we're not on a bypass page
  if (authLoading && !bypassLoadingCheck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
        <div className="text-center space-y-2 max-w-md px-4">
          <p className="text-sm text-muted-foreground">Loading your account details...</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
  
  // If user just completed payment and we're waiting for subscription to activate
  if (isFromPayment && userSubscription === null && !bypassLoadingCheck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
        <div className="text-center space-y-2 max-w-md px-4">
          <p className="text-sm text-muted-foreground">Loading your subscription details...</p>
          <p className="text-xs text-muted-foreground">This may take up to a minute after completing payment.</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
  
  // If subscription data is still null but we aren't coming from payment, 
  // show a message about needing to subscribe
  if (userSubscription === null && !bypassLoadingCheck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Full-width banner at the top */}
        <div className="fixed top-0 left-0 w-full z-20">
          <div className="bg-primary text-primary-foreground p-3 text-center">
            <span className="font-medium">No active subscription detected. </span>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => navigate('/subscription')}
              className="ml-2"
            >
              Subscribe Now
            </Button>
          </div>
        </div>
        
        {/* Main content with navigation options */}
        <div className="fixed top-12 left-0 right-0 bg-background border-b z-10 p-2 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/settings')}>
            Back to Settings
          </Button>
        </div>
        
        <Card className="max-w-md w-full mt-16">
          <CardHeader>
            <CardTitle>Subscription Required</CardTitle>
            <CardDescription>
              You need an active subscription to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This feature requires a premium subscription to Chronolio.
            </p>
            <p className="text-sm mt-4">
              Please subscribe to access all features of Chronolio.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
            <Button onClick={() => navigate('/subscription')}>
              Subscribe Now
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Dashboard page with special handling for subscription status
  if (isDashboardPage && isLoggedIn) {
    // If user is logged in and we know they don't have an active subscription, 
    // show subscription required message instead of dashboard
    if (userSubscription !== null && !isSubscriptionActive()) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          {/* Full-width banner at the top */}
          <div className="fixed top-0 left-0 w-full z-20">
            <div className="bg-primary text-primary-foreground p-3 text-center">
              <span className="font-medium">No active subscription detected. </span>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => navigate('/subscription')}
                className="ml-2"
              >
                Subscribe Now
              </Button>
            </div>
          </div>
          
          {/* Main content with navigation options */}
          <div className="fixed top-12 left-0 right-0 bg-background border-b z-10 p-2 flex justify-between items-center">
            <Button variant="ghost" onClick={() => navigate('/settings')}>
              Back to Settings
            </Button>
          </div>
          
          <Card className="max-w-md w-full mt-16">
            <CardHeader>
              <CardTitle>Welcome to Chronolio</CardTitle>
              <CardDescription>
                Subscription required to access the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Your subscription status is: <span className="font-semibold">{userSubscription?.status || 'inactive'}</span>
              </p>
              
              {userSubscription?.status === 'on_trial' && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                  Your trial period ends in {getTrialDaysLeft()} days. Subscribe now to continue using all features.
                </p>
              )}
              
              {userSubscription?.status === 'cancelled' && userSubscription?.currentPeriodEnd && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                  Your subscription is cancelled but remains active until {new Date(userSubscription.currentPeriodEnd).toLocaleDateString()} 
                  ({getRemainingDays()} days left).
                </p>
              )}
              
              <p className="text-sm mt-4">
                You need an active subscription to use Chronolio. Please visit the subscription page to choose a plan.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/settings')}>
                Go to Settings
              </Button>
              <Button onClick={() => navigate('/subscription')}>
                Subscribe Now
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
  }

  // For other pages that bypass the loading check, render content immediately
  if (bypassLoadingCheck) {
    return <>{children}</>;
  }

  // If the user has an active subscription, show the children
  if (isSubscriptionActive()) {
    return <>{children}</>;
  }

  // Otherwise, show subscription required message with navigation
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Full-width banner at the top */}
      <div className="fixed top-0 left-0 w-full z-20">
        <div className="bg-primary text-primary-foreground p-3 text-center">
          <span className="font-medium">No active subscription detected. </span>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate('/subscription')}
            className="ml-2"
          >
            Subscribe Now
          </Button>
        </div>
      </div>
      
      {/* Main content with navigation options */}
      <div className="fixed top-12 left-0 right-0 bg-background border-b z-10 p-2 flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate('/settings')}>
          Back to Settings
        </Button>
      </div>
      
      <Card className="max-w-md w-full mt-16">
        <CardHeader>
          <CardTitle>Subscription Required</CardTitle>
          <CardDescription>
            You need an active subscription to access this feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Your subscription status is: <span className="font-semibold">{userSubscription?.status || 'inactive'}</span>
          </p>
          
          {userSubscription?.status === 'on_trial' && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              Your trial period ends in {getTrialDaysLeft()} days. Subscribe now to continue using all features.
            </p>
          )}
          
          {userSubscription?.status === 'cancelled' && userSubscription?.currentPeriodEnd && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              Your subscription is cancelled but remains active until {new Date(userSubscription.currentPeriodEnd).toLocaleDateString()} 
              ({getRemainingDays()} days left).
            </p>
          )}
          
          <p className="text-sm mt-4">
            Please upgrade your subscription to continue using all features of Chronolio.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/settings')}>
            Go to Settings
          </Button>
          <Button onClick={() => navigate('/subscription')}>
            Subscribe Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}