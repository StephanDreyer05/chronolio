import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useSubscription } from "@/contexts/subscription-context";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  AlertCircle,
  Loader2,
  Image,
  Users,
  Clock,
  Calendar,
  Share2,
  FileSpreadsheet,
  Settings,
  Layers,
  ChevronLeft,
} from "lucide-react";

export default function SubscriptionPage() {
  const { userSubscription, isLoading, isSubscriptionActive, getCustomerPortal } =
    useSubscription();
  const auth = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const { isLoggedIn } = auth;
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const isPlanActive = isSubscriptionActive();

  // Function to handle opening the customer portal
  const handleManageSubscription = async () => {
    const portalUrl = await getCustomerPortal();
    if (portalUrl) {
      window.open(portalUrl, "_blank");
    }
  };
  
  // Get the current subscription interval (month or year)
  const getCurrentInterval = (): "month" | "year" | null => {
    if (!userSubscription || !userSubscription.variant) return null;
    // If interval is available, determine if monthly or yearly
    return userSubscription.variant.interval === "monthly" ||
      userSubscription.variant.interval === "month"
      ? "month"
      : "year";
  };

  // Set the initial billing interval based on the user's current subscription
  useEffect(() => {
    const currentInterval = getCurrentInterval();
    if (currentInterval) {
      setBillingInterval(currentInterval);
    }
  }, [userSubscription]);

  useEffect(() => {
    // Load the Lemon Squeezy script
    if (
      !document.querySelector(
        'script[src="https://assets.lemonsqueezy.com/lemon.js"]',
      )
    ) {
      const script = document.createElement("script");
      script.src = "https://assets.lemonsqueezy.com/lemon.js";
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }

    // Initialize Lemon Squeezy
    return () => {
      // Clean up if needed
    };
  }, []);

  // Check login status
  useEffect(() => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please log in to subscribe to a plan",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">
          Loading subscription information...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl mb-8 flex justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-bold mb-6 text-foreground">
          Upgrade to Access Premium Features
        </h1>
        <p className="text-lg text-muted-foreground dark:text-gray-300 mb-6">
          Get access to all features and create unlimited timelines
        </p>

        {isPlanActive && (
          <div className="mb-6">
            <Badge className="px-3 py-1 text-sm bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 border-green-200 dark:border-green-700">
              <Check className="mr-1 h-3 w-3" />
              You have an active subscription
            </Badge>
          </div>
        )}

        {/* Premium Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-12 max-w-3xl mx-auto">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">
                Save unlimited timelines
              </h3>
              <p className="text-sm text-muted-foreground">
                Create and store as many events as you need
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Users className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">
                Timeline participants
              </h3>
              <p className="text-sm text-muted-foreground">
                Assign participants to timeline items
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Image className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">Timeline Images</h3>
              <p className="text-sm text-muted-foreground">
                Add images to timelines
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Settings className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">
                Custom event types
              </h3>
              <p className="text-sm text-muted-foreground">
                Create custom event types and custom fields
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Users className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">
                Contact management
              </h3>
              <p className="text-sm text-muted-foreground">
                Track all your contacts & event vendors in one place
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <FileSpreadsheet className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">Templates library</h3>
              <p className="text-sm text-muted-foreground">
                Use templates to speed up your timeline creation
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Share2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">
                Share your timelines
              </h3>
              <p className="text-sm text-muted-foreground">
                Share your timelines via public link or email
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Layers className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground">
                View customisation
              </h3>
              <p className="text-sm text-muted-foreground">
                See all your events in a calendar, list or table view
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-10 w-full max-w-md">
        <Tabs
          defaultValue="month"
          value={billingInterval}
          onValueChange={(value) =>
            setBillingInterval(value as "month" | "year")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="year">Annual (Save 35%)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="w-full max-w-md mx-auto">
        {/* Premium Plan Card */}
        <Card className="bg-card text-card-foreground border shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 text-white p-6 text-center">
            <CardTitle className="text-2xl font-bold text-white">
              Premium Plan
            </CardTitle>
            <CardDescription className="text-white opacity-90">
              Full access to all features
            </CardDescription>
            <div className="mt-4 flex justify-center">
              {billingInterval === "month" ? (
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-white">$29.00</span>
                  <span className="ml-1 text-white opacity-90">/month</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-white">
                      $239.00
                    </span>
                    <span className="ml-1 text-white opacity-90">/year</span>
                  </div>
                  <span className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded-full">
                    Save 35%
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-500 mr-3 shrink-0" />
                <span className="text-foreground">
                  All premium features included
                </span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-500 mr-3 shrink-0" />
                <span className="text-foreground">Export to PDF and Excel</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-500 mr-3 shrink-0" />
                <span className="text-foreground">Premium support</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-500 mr-3 shrink-0" />
                <span className="text-foreground">
                  Regular updates and new features
                </span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="p-6 pt-0 flex justify-center">
            {isPlanActive && getCurrentInterval() === billingInterval ? (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium text-lg py-6"
                disabled={true}
                size="lg"
              >
                Current Plan
              </Button>
            ) : isPlanActive ? (
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-lg py-6"
                onClick={handleManageSubscription}
                size="lg"
              >
                Manage Subscription
              </Button>
            ) : (
              <a
                href={`https://chronolio.lemonsqueezy.com/buy/493c4f30-a5ed-49d5-b2a6-5bc9d874843e?embed=0&logo=0&checkout[custom][userId]=${auth.user?.id || ""}&checkout[email]=${auth.user?.email || ""}&checkout[custom][billingInterval]=${billingInterval}`}
                className="lemonsqueezy-button w-full"
              >
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-lg py-6"
                  disabled={!isLoggedIn}
                  size="lg"
                >
                  Subscribe Now
                </Button>
              </a>
            )}
          </CardFooter>
        </Card>
      </div>

      <Separator className="my-12 w-full max-w-3xl" />

      <div className="w-full max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-foreground text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <div className="bg-card dark:bg-slate-800 rounded-lg p-5 border dark:border-slate-700">
            <h3 className="font-semibold text-lg text-foreground">
              How do I cancel my subscription?
            </h3>
            <p className="text-muted-foreground dark:text-gray-300 mt-2">
              You can cancel your subscription at any time from your account
              page. Your subscription will remain active until the end of your
              current billing period.
            </p>
          </div>
          <div className="bg-card dark:bg-slate-800 rounded-lg p-5 border dark:border-slate-700">
            <h3 className="font-semibold text-lg text-foreground">
              Can I change plans?
            </h3>
            <p className="text-muted-foreground dark:text-gray-300 mt-2">
              Yes, you can upgrade or downgrade your subscription at any time.
              When you upgrade, you'll be charged the prorated difference.
              Downgrades take effect at the end of your current billing period.
            </p>
          </div>
          <div className="bg-card dark:bg-slate-800 rounded-lg p-5 border dark:border-slate-700">
            <h3 className="font-semibold text-lg text-foreground">
              Do you offer refunds?
            </h3>
            <p className="text-muted-foreground dark:text-gray-300 mt-2">
              We don't offer refunds for subscription payments, but you can
              cancel your subscription at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
