import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useSubscription } from "@/contexts/subscription-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function SubscriptionSuccessPage() {
  const [, navigate] = useLocation();
  const { fetchUserSubscription, isLoading, userSubscription } = useSubscription();
  const { toast } = useToast();
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(20);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  
  // Auto-refresh functionality
  useEffect(() => {
    // If subscription is already active, no need to refresh
    if (userSubscription && userSubscription.status !== 'inactive') {
      return;
    }
    
    // Set up auto-refresh timer (20 seconds)
    const timer = setInterval(() => {
      setAutoRefreshSeconds(prev => {
        if (prev <= 1) {
          // When timer reaches zero, clear interval and refresh
          clearInterval(timer);
          fetchUserSubscription();
          setRefreshCount(prev => prev + 1);
          return 20; // Reset for next cycle
        }
        return prev - 1;
      });
      
      // Update progress bar
      setRefreshProgress(prev => {
        const newProgress = ((20 - autoRefreshSeconds + 1) / 20) * 100;
        return newProgress;
      });
    }, 1000);
    
    // Initial fetch immediately 
    fetchUserSubscription();
    
    // Clean up timer on component unmount
    return () => clearInterval(timer);
  }, [fetchUserSubscription, refreshCount, userSubscription]);
  
  // Initial subscription fetch
  useEffect(() => {
    const updateSubscription = async () => {
      try {
        await fetchUserSubscription();
        
        if (userSubscription && userSubscription.status !== 'inactive') {
          toast({
            title: "Subscription Activated",
            description: "Your subscription has been successfully activated. Thank you for your support!",
          });
        }
      } catch (error) {
        console.error("Error updating subscription status:", error);
        toast({
          title: "Subscription Update Error",
          description: "There was an issue updating your subscription status. Please contact support if this problem persists.",
          variant: "destructive",
        });
      }
    };
    
    updateSubscription();
  }, [fetchUserSubscription, toast]);
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Check className="h-6 w-6 text-green-500" />
            Subscription Activated
          </CardTitle>
          <CardDescription>
            Thank you for subscribing to Chronolio!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="py-4">
              <p className="mb-4">
                Your subscription has been successfully activated. You now have access to all premium features.
              </p>
              
              {(!userSubscription || userSubscription.status === 'inactive') && (
                <div className="mb-6 mt-2 space-y-3">
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Checking subscription status... Auto-refresh in {autoRefreshSeconds} seconds
                  </p>
                  <Progress value={refreshProgress} className="w-full h-1" />
                  <p className="text-xs text-muted-foreground">
                    Webhook processing may take a moment. Please wait or use the button below to check now.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      fetchUserSubscription();
                      setRefreshCount(prev => prev + 1);
                      setAutoRefreshSeconds(20);
                    }}
                    className="mt-2"
                  >
                    Check Now
                  </Button>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-4">
                If you have any questions about your subscription, please don't hesitate to contact our support team.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/subscription">Manage Subscription</Link>
          </Button>
          <Button asChild>
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}