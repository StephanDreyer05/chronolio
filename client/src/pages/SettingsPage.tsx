import React, { useState, useEffect } from "react";
import { MainNav } from "@/components/MainNav";
import { useDispatch, useSelector } from 'react-redux';
import {
  RootState,
  fetchSettings,
  updateSettingsApi,
  resetSettingsApi,
  addEventTypeApi,
  removeEventTypeApi,
  updateEventTypeColorApi,
  updateEventTypeNameApi,
  updateEventTypeCustomFieldsApi,
  reorderEventTypeCustomFieldsApi,
  addVendorTypeApi,
  removeVendorTypeApi,
  updateVendorTypeNameApi,
  updateVendorTypeCustomFieldsApi,
  reorderVendorTypeCustomFieldsApi,
  setSettings,
  setLoading,
  setError
} from '@/store/settingsSlice';
import { useSubscription } from '@/contexts/subscription-context';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Check, AlertCircle, RotateCcw, Save, Edit2, X, 
  ArrowUp, ArrowDown, PlusCircle, XCircle, CalendarRange, 
  Settings2, Palette, Calendar, Bell
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/ThemeProvider";
import { useForm } from 'react-hook-form';
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { fetchWithAuth } from "@/lib/api";

interface EventType {
  type: string;
  color: string;
  customFields?: Array<{
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue?: string | number | boolean | null;
    order?: number;
  }>;
}

// Subscription management component
const SubscriptionSection = () => {
  const { 
    userSubscription, 
    plans, 
    isLoading, 
    createCheckout, 
    getCustomerPortal,
    isSubscriptionActive,
    isPremium,
    fetchUserSubscription
  } = useSubscription();
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();

  const getPlanByInterval = () => {
    if (!plans || plans.length === 0) return null;
    
    // Find the premium plan
    const premiumPlan = plans.find(plan => plan.name === 'Premium');
    if (!premiumPlan) return null;
    
    // Get the variant based on selected billing interval
    return premiumPlan.variants.find(variant => variant.interval === billingInterval);
  };
  
  // Use the subscription context to get days left
  const { getRemainingDays, getTrialDaysLeft } = useSubscription();

  // Helper function to get days left in the current subscription period
  const daysLeft = () => {
    return getRemainingDays();
  };

  // Helper function to get days left in the trial period
  const trialDaysLeft = () => {
    return getTrialDaysLeft();
  };
  
  const handleSubscribe = () => {
    setIsCheckingOut(true);
    
    try {
      // Get the current user's email and ID to pass to the checkout form
      const userEmail = user?.email || '';
      const userId = user?.id || '';
      
      // Direct checkout URLs provided by the user
      const MONTHLY_CHECKOUT_URL = 'https://chronolio.lemonsqueezy.com/buy/493c4f30-a5ed-49d5-b2a6-5bc9d874843e';
      const ANNUAL_CHECKOUT_URL = 'https://chronolio.lemonsqueezy.com/buy/493c4f30-a5ed-49d5-b2a6-5bc9d874843e';
      
      // Choose URL based on selected billing interval
      const baseUrl = billingInterval === 'month' ? MONTHLY_CHECKOUT_URL : ANNUAL_CHECKOUT_URL;
      
      // Build full checkout URL with query parameters
      // 1. Add user email for pre-filling checkout form
      // 2. Add user ID as custom data for webhooks/API
      const checkoutUrl = `${baseUrl}?checkout[email]=${encodeURIComponent(userEmail)}&checkout[custom][user_id]=${userId}`;
      
      // Redirect to checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      });
      setIsCheckingOut(false);
    }
  };
  
  // Handle managing the subscription through customer portal
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  
  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      // Get customer portal URL from Lemon Squeezy
      const url = await getCustomerPortal();
      
      if (url) {
        // Redirect to customer portal
        window.location.href = url;
      } else {
        throw new Error("Could not access subscription management portal");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to access subscription management portal",
        variant: "destructive",
      });
    } finally {
      setIsManagingSubscription(false);
    }
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };
  
  return (
    <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {userSubscription ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{userSubscription.plan?.name || 'Premium'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {userSubscription.status === 'on_trial' ? 'Trial Period' : 'Active Subscription'}
                      </p>
                    </div>
                    <Badge 
                      className={userSubscription.status === 'active' || userSubscription.status === 'on_trial' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
                      }
                    >
                      {userSubscription.status === 'on_trial' ? 'Trial' : 
                       userSubscription.status === 'active' ? 'Active' : 
                       userSubscription.status === 'cancelled' ? 'Cancelled' : 
                       userSubscription.status}
                    </Badge>
                  </div>
                </div>
                
                {userSubscription.status === 'on_trial' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-900 dark:text-amber-200">Trial Period</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Your trial ends in {trialDaysLeft()} days.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {userSubscription.variant && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <span className="text-sm font-medium">{userSubscription.plan?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Billing</span>
                      <span className="text-sm font-medium">
                        {formatPrice(userSubscription.variant.price)} / 
                        {userSubscription.variant.interval === 'month' ? 'month' : 'year'}
                      </span>
                    </div>
                    {userSubscription.currentPeriodEnd && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Next billing date</span>
                        <span className="text-sm font-medium">
                          {new Date(userSubscription.currentPeriodEnd).toLocaleDateString()} 
                          <span className="text-xs text-muted-foreground ml-1">({daysLeft()} days left)</span>
                        </span>
                      </div>
                    )}
                    {userSubscription.status === 'on_trial' && userSubscription.trialEndsAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Trial ends</span>
                        <span className="text-sm font-medium">
                          {new Date(userSubscription.trialEndsAt).toLocaleDateString()} 
                          <span className="text-xs text-muted-foreground ml-1">({trialDaysLeft()} days left)</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Add the Manage Subscription button only for active or on_trial subscriptions */}
                {(userSubscription.status === 'active' || userSubscription.status === 'on_trial') && 
                  userSubscription.lemonSqueezySubscriptionId && (
                  <Button
                    className="w-full mt-4"
                    onClick={handleManageSubscription}
                    disabled={isManagingSubscription}
                  >
                    {isManagingSubscription ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Manage Your Subscription
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900 dark:text-red-200">No Active Subscription</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        If you do have a subscription, please refresh this page. Otherwise subscribe to a plan to access premium features.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Tabs 
                    defaultValue="month" 
                    className="w-full"
                    onValueChange={(value) => setBillingInterval(value as 'month' | 'year')}
                  >
                    <div className="flex justify-center mb-4">
                      <TabsList>
                        <TabsTrigger value="month">Monthly</TabsTrigger>
                        <TabsTrigger value="year">Annual <Badge className="ml-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Save 35%</Badge></TabsTrigger>
                      </TabsList>
                    </div>
                  </Tabs>
                  
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <CardTitle className="text-xl flex justify-between items-center">
                        <span>Premium Plan</span>
                        <Badge className="ml-2 text-xs">Favourite</Badge>
                      </CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          {billingInterval === 'month' ? '$29.00' : '$239.00'}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          /{billingInterval === 'month' ? 'month' : 'year'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span>Unlimited timelines</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span>Advanced vendor management</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span>Priority customer support</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span>Export to PDF/Excel formats</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span>Advanced AI features</span>
                        </li>
                      </ul>
                      
                      <Button 
                        className="w-full" 
                        onClick={handleSubscribe}
                        disabled={isCheckingOut}
                      >
                        {isCheckingOut ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Subscribe Now'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const UserProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>
          Manage your account settings and change your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Account Information</h3>
              <p className="text-sm text-muted-foreground">
                Username: {user?.username}
              </p>
              <p className="text-sm text-muted-foreground">
                Email: {user?.email}
                {user?.isEmailVerified ? (
                  <span className="ml-2 text-green-500 text-xs">(Verified)</span>
                ) : (
                  <span className="ml-2 text-amber-500 text-xs">(Not Verified)</span>
                )}
              </p>
            </div>
            <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
              Edit Profile
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                {...form.register('username')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                {...form.register('email')}
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                {...form.register('currentPassword')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                {...form.register('newPassword')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...form.register('confirmPassword')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default function SettingsPage() {
  const dispatch = useDispatch();
  const [, navigate] = useLocation();
  const savedSettings = useSelector((state: RootState) => state.settings);
  const [settings, setSettings] = useState(savedSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const [newEventType, setNewEventType] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editedTypeName, setEditedTypeName] = useState('');
  const { theme: globalTheme, setTheme } = useTheme();
  const [localTheme, setLocalTheme] = useState<"dark" | "light" | "system">(globalTheme);
  const [editingCustomFields, setEditingCustomFields] = useState<string | null>(null);
  const [customFieldsDialogOpen, setCustomFieldsDialogOpen] = useState(false);
  const [newCustomField, setNewCustomField] = useState<{
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue: string;
  }>({
    name: '',
    type: 'text',
    required: false,
    defaultValue: '',
  });
  const [newVendorType, setNewVendorType] = useState('');
  const [editingVendorType, setEditingVendorType] = useState<number | null>(null);
  const [editedVendorTypeName, setEditedVendorTypeName] = useState('');
  const { collapsed } = useSidebar();
  const [editingVendorCustomFields, setEditingVendorCustomFields] = useState<number | null>(null);
  const [vendorCustomFieldsDialogOpen, setVendorCustomFieldsDialogOpen] = useState(false);
  const [newVendorCustomField, setNewVendorCustomField] = useState<{
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue: string;
    order?: number;
  }>({
    name: '',
    type: 'text',
    required: false,
    defaultValue: '',
  });
  const [editingEventField, setEditingEventField] = useState<{
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue?: string | number | boolean | null;
  } | null>(null);
  const [editingField, setEditingField] = useState<{
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue?: string | number | boolean | null;
  } | null>(null);
  
  // Fetch latest settings when page loads
  useEffect(() => {
    console.log('SettingsPage: Initial load effect triggered');
    const loadSettings = async () => {
      try {
        console.log('SettingsPage: Loading settings from API');
        await dispatch(fetchSettings());
        console.log('SettingsPage: Settings loaded successfully');
      } catch (error) {
        console.error('SettingsPage: Error loading settings:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load settings",
          variant: "destructive",
        });
      }
    };
    
    loadSettings();
  }, [dispatch]);

  // When settings in Redux store change, update local state
  useEffect(() => {
    console.log('SettingsPage: savedSettings changed, updating local state', savedSettings);
    
    // Handle error state first
    if (savedSettings.error) {
      toast({
        title: "Error loading settings",
        description: savedSettings.error,
        variant: "destructive",
      });
      return;
    }
    
    // Only update if settings are loaded and not still loading
    if (!savedSettings.isLoading) {
      setSettings(savedSettings);
      if (savedSettings.theme) {
        setLocalTheme(savedSettings.theme);
      }
    }
  }, [savedSettings, toast]);

  // Show loading state if settings are still loading
  if (savedSettings.isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error and no data
  if (savedSettings.error && !savedSettings.eventTypes?.length) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-lg p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-4">Failed to load settings</h2>
          <p className="text-muted-foreground mb-6">{savedSettings.error}</p>
          <Button 
            onClick={() => dispatch(fetchSettings())}
            className="mx-auto"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await dispatch(updateSettingsApi({
        theme: settings.theme,
        hidePastEvents: settings.hidePastEvents,
        showCategories: settings.showCategories,
        defaultEventDuration: settings.defaultEventDuration,
        defaultStartTime: settings.defaultStartTime,
        timeIncrement: settings.timeIncrement,
        durationIncrement: settings.durationIncrement,
        eventTypes: settings.eventTypes,
        defaultCalendarView: settings.defaultCalendarView,
        defaultSorting: settings.defaultSorting,
        defaultTimelineViewType: settings.defaultTimelineViewType,
        exportFooterText: settings.exportFooterText,
        contactTypes: settings.contactTypes,
      }));

      if (settings.theme !== globalTheme) {
        setTheme(settings.theme);
      }

      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Your settings have been successfully saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDiscard = () => {
    dispatch(fetchSettings());
    setHasChanges(false);
    setLocalTheme(globalTheme);
    toast({
      title: "Changes Discarded",
      description: "Your changes have been discarded.",
    });
    navigate('/');
  };

  const handleReset = async () => {
    try {
      await dispatch(resetSettingsApi());
      setHasChanges(false);
      setLocalTheme("system");
      setTheme("system");
      toast({
        title: "Settings Reset",
        description: "All settings have been restored to their default values.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddEventType = async () => {
    if (newEventType.trim()) {
      try {
        await dispatch(addEventTypeApi({ type: newEventType.trim(), color: selectedColor }));
        setNewEventType('');
        setSelectedColor('#000000');
        dispatch(fetchSettings());
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add event type.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveEventType = async (type: string) => {
    try {
      await dispatch(removeEventTypeApi(type));
      dispatch(fetchSettings());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove event type.",
        variant: "destructive",
      });
    }
  };

  const handleColorChange = async (type: string, color: string) => {
    try {
      await dispatch(updateEventTypeColorApi(type, color));
      dispatch(fetchSettings());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event color.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTypeName = async (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      try {
        await dispatch(updateEventTypeNameApi(oldName, newName.trim()));
        dispatch(fetchSettings());
        toast({
          title: "Success",
          description: "Event type name updated successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update event type name.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddCustomField = async (eventType: string) => {
    if (!newCustomField.name.trim()) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      });
      return;
    }

    const eventTypeObj = settings.eventTypes.find(et => et.type === eventType);
    const customFields = eventTypeObj?.customFields || [];

    const newField = {
      id: `${Date.now()}`,
      name: newCustomField.name.trim(),
      type: newCustomField.type,
      required: newCustomField.required,
      defaultValue: newCustomField.defaultValue || null,
    };

    try {
      await dispatch(updateEventTypeCustomFieldsApi(eventType, [...customFields, newField]));
      setNewCustomField({
        name: '',
        type: 'text',
        required: false,
        defaultValue: '',
      });
      dispatch(fetchSettings());
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add custom field",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCustomField = async (eventType: string, fieldId: string) => {
    const type = settings.eventTypes.find(et => et.type === eventType);
    if (!type) return;

    const customFields = type.customFields || [];
    const updatedFields = customFields.filter(field => field.id !== fieldId);

    try {
      await dispatch(updateEventTypeCustomFieldsApi(eventType, updatedFields));
      dispatch(fetchSettings());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove custom field.",
        variant: "destructive",
      });
    }
  };

  const handleAddVendorType = async () => {
    if (newVendorType.trim()) {
      try {
        await dispatch(addVendorTypeApi(newVendorType.trim()));
        setNewVendorType('');
        dispatch(fetchSettings());
        toast({
          title: "Success",
          description: "Contact type added successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add contact type.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveVendorType = async (id: number) => {
    try {
      await dispatch(removeVendorTypeApi(id));
      dispatch(fetchSettings());
      toast({
        title: "Success",
        description: "Contact type removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove contact type.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateVendorTypeName = async (id: number, newName: string) => {
    if (newName.trim()) {
      try {
        await dispatch(updateVendorTypeNameApi(id, newName.trim()));
        dispatch(fetchSettings());
        toast({
          title: "Success",
          description: "Contact type name updated successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update contact type name.",
          variant: "destructive",
        });
      }
    }
  };

  const handleThemeChange = (value: "dark" | "light" | "system") => {
    setLocalTheme(value);
    handleSettingChange('theme', value);
  };

  const handleAddVendorCustomField = () => {
    if (!editingVendorCustomFields || !newCustomField.name) return;
    
    const vendorType = savedSettings.contactTypes.find(c => c.id === editingVendorCustomFields);
    
    if (!vendorType) return;
    
    const customFields = [...(vendorType.customFields || [])];
    const newField = {
      id: crypto.randomUUID(),
      name: newCustomField.name,
      type: newCustomField.type,
      required: newCustomField.required,
      defaultValue: newCustomField.defaultValue || null,
      order: customFields.length
    };
    
    dispatch(updateVendorTypeCustomFieldsApi(editingVendorCustomFields, [...customFields, newField]));
    setNewCustomField({
      name: '',
      type: 'text',
      required: false,
      defaultValue: '',
    });
  };

  const handleRemoveVendorCustomField = async (vendorTypeId: number, fieldId: string) => {
    const contactType = settings.contactTypes.find(vt => vt.id === vendorTypeId);
    if (!contactType) return;

    const customFields = contactType.customFields || [];
    const updatedFields = customFields.filter(field => field.id !== fieldId);

    try {
      await dispatch(updateVendorTypeCustomFieldsApi(vendorTypeId, updatedFields));
      dispatch(fetchSettings());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove custom field.",
        variant: "destructive",
      });
    }
  };

  const handleMoveField = async (vendorTypeId: number, currentIndex: number, direction: 'up' | 'down') => {
    const contactType = settings.contactTypes.find(vt => vt.id === vendorTypeId);
    if (!contactType?.customFields) return;

    const customFields = Array.from(contactType.customFields);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= customFields.length) return;

    // Swap the fields
    [customFields[currentIndex], customFields[newIndex]] = [customFields[newIndex], customFields[currentIndex]];

    // Update order properties
    const updatedFields = customFields.map((field, index) => ({
      ...field,
      order: index
    }));

    try {
      await dispatch(reorderVendorTypeCustomFieldsApi(vendorTypeId, updatedFields));
      dispatch(fetchSettings());
      toast({
        title: "Success",
        description: "Custom fields reordered successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder custom fields.",
        variant: "destructive",
      });
    }
  };

  const handleMoveEventField = async (eventType: string, currentIndex: number, direction: 'up' | 'down') => {
    const eventTypeObj = settings.eventTypes.find(et => et.type === eventType);
    if (!eventTypeObj?.customFields) return;

    const customFields = Array.from(eventTypeObj.customFields);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= customFields.length) return;

    // Swap the fields
    [customFields[currentIndex], customFields[newIndex]] = [customFields[newIndex], customFields[currentIndex]];

    // Update order properties
    const updatedFields = customFields.map((field, index) => ({
      ...field,
      order: index
    }));

    try {
      await dispatch(reorderEventTypeCustomFieldsApi(eventType, updatedFields));
      dispatch(fetchSettings());
      toast({
        title: "Success",
        description: "Custom fields reordered successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder custom fields.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEventField = async (eventType: string) => {
    if (!editingEventField) return;
    
    const eventTypeObj = settings.eventTypes.find(et => et.type === eventType);
    if (!eventTypeObj) return;
    
    const customFields = eventTypeObj.customFields || [];
    const updatedFields = customFields.map(field => 
      field.id === editingEventField.id ? editingEventField : field
    );
    
    try {
      await dispatch(updateEventTypeCustomFieldsApi(eventType, updatedFields));
      setEditingEventField(null);
      dispatch(fetchSettings());
      toast({
        title: "Success", 
        description: "Custom field updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update custom field.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <MainNav />
      <div className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "ml-[70px]" : "ml-[250px]"
      )}>
        <header className="border-b bg-white dark:bg-zinc-900">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDiscard}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
                >
                  Discard Changes
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="md:col-span-1 space-y-6">
              <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle>User Profile</CardTitle>
                  <CardDescription>Manage your account settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserProfile />
                </CardContent>
              </Card>
              
              <SubscriptionSection />

              <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure application defaults</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="themeMode">Theme Mode</Label>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="light"
                          name="theme"
                          value="light"
                          checked={localTheme === "light"}
                          onChange={() => handleThemeChange("light")}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor="light" className="cursor-pointer">Light</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="dark"
                          name="theme"
                          value="dark"
                          checked={localTheme === "dark"}
                          onChange={() => handleThemeChange("dark")}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="system"
                          name="theme"
                          value="system"
                          checked={localTheme === "system"}
                          onChange={() => handleThemeChange("system")}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor="system" className="cursor-pointer">System</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeIncrement">Time Increment (minutes)</Label>
                    <Select
                      value={settings.timeIncrement.toString()}
                      onValueChange={(value) => handleSettingChange('timeIncrement', parseInt(value))}
                    >
                      <SelectTrigger id="timeIncrement">
                        <SelectValue placeholder="Select time increment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="durationIncrement">Duration Increment (minutes)</Label>
                    <Select
                      value={settings.durationIncrement.toString()}
                      onValueChange={(value) => handleSettingChange('durationIncrement', parseInt(value))}
                    >
                      <SelectTrigger id="durationIncrement">
                        <SelectValue placeholder="Select duration increment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultEventDuration">Default Event Duration (minutes)</Label>
                    <Select
                      value={settings.defaultEventDuration.toString()}
                      onValueChange={(value) => handleSettingChange('defaultEventDuration', parseInt(value))}
                    >
                      <SelectTrigger id="defaultEventDuration">
                        <SelectValue placeholder="Select default duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultSorting">Default Timeline Sorting</Label>
                    <Select
                      value={settings.defaultSorting || 'date-asc'}
                      onValueChange={(value) => handleSettingChange('defaultSorting', value)}
                    >
                      <SelectTrigger id="defaultSorting">
                        <SelectValue placeholder="Select default sorting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-asc">Date (Ascending)</SelectItem>
                        <SelectItem value="date-desc">Date (Descending)</SelectItem>
                        <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                        <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                        <SelectItem value="type-asc">Type (A-Z)</SelectItem>
                        <SelectItem value="type-desc">Type (Z-A)</SelectItem>
                        <SelectItem value="location-asc">Location (A-Z)</SelectItem>
                        <SelectItem value="location-desc">Location (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultCalendarView">Default Calendar View</Label>
                    <Select
                      value={settings.defaultCalendarView || 'month'}
                      onValueChange={(value) => handleSettingChange('defaultCalendarView', value)}
                    >
                      <SelectTrigger id="defaultCalendarView">
                        <SelectValue placeholder="Select default calendar view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="quarter">Quarter</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="defaultTimelineViewType">Default Timeline View</Label>
                    <Select
                      value={settings.defaultTimelineViewType || 'list'}
                      onValueChange={(value) => handleSettingChange('defaultTimelineViewType', value)}
                    >
                      <SelectTrigger id="defaultTimelineViewType">
                        <SelectValue placeholder="Select default timeline view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="calendar">Calendar</SelectItem>
                        <SelectItem value="table">Table</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exportFooterText">Export Footer Text</Label>
                    <Input
                      id="exportFooterText"
                      value={settings.exportFooterText || ''}
                      onChange={(e) => handleSettingChange('exportFooterText', e.target.value)}
                      placeholder="Text to display in the footer of exports"
                    />
                  </div>

                  <div className="pt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
                        >
                          <RotateCcw className="w-4 h-4 mr-2 text-purple-500" />
                          Reset to Defaults
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] max-w-[500px] p-4 sm:p-6">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Settings?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reset all settings to their default values. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                          <AlertDialogCancel className="mt-2 sm:mt-0">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-8">
              <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle>Event Types</CardTitle>
                  <CardDescription>
                    Manage event types and their custom fields
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="New event type"
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value)}
                        className="w-full sm:max-w-xs"
                      />
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            >
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: selectedColor }}
                              />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3">
                            <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
                          </PopoverContent>
                        </Popover>
                        <Button
                          onClick={handleAddEventType}
                          className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                        >
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Add Type
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {settings.eventTypes.map((eventType) => (
                        <div key={eventType.type} className="space-y-4">
                          <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group">
                            <span className="flex-1 font-medium truncate">{eventType.type}</span>
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                  >
                                    <div
                                      className="w-4 h-4 rounded"
                                      style={{ backgroundColor: eventType.color }}
                                    />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3">
                                  <HexColorPicker
                                    color={eventType.color}
                                    onChange={(color) => handleColorChange(eventType.type, color)}
                                  />
                                </PopoverContent>
                              </Popover>
                              <Dialog open={editingCustomFields === eventType.type && customFieldsDialogOpen} onOpenChange={(open) => {
                                if (!open) {
                                  setEditingCustomFields(null);
                                }
                                setCustomFieldsDialogOpen(open);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingCustomFields(eventType.type);
                                      setCustomFieldsDialogOpen(true);
                                    }}
                                    className="text-gray-500 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[95vw] max-w-[500px] p-4 sm:p-6">
                                  <DialogHeader>
                                    <DialogTitle>Edit {eventType.type}</DialogTitle>
                                    <DialogDescription>
                                      Edit name and manage custom fields for this event type.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="py-4 space-y-6">
                                    <div className="space-y-2">
                                      <Label htmlFor={`event-type-name-${eventType.type}`}>Event Type Name</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          id={`event-type-name-${eventType.type}`}
                                          defaultValue={eventType.type}
                                          className="flex-1"
                                          onBlur={(e) => handleUpdateTypeName(eventType.type, e.target.value)}
                                        />
                                      </div>
                                    </div>

                                    {/* Add/Edit custom field form */}
                                    <div className="space-y-4 border-b pb-4">
                                      <h4 className="font-medium">{editingEventField ? 'Edit Field' : 'Add New Field'}</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input
                                          placeholder="Field name"
                                          value={editingEventField ? editingEventField.name : newCustomField.name}
                                          onChange={(e) =>
                                            editingEventField
                                              ? setEditingEventField({ ...editingEventField, name: e.target.value })
                                              : setNewCustomField(prev => ({ ...prev, name: e.target.value }))
                                          }
                                        />
                                        <Select
                                          value={editingEventField ? editingEventField.type : newCustomField.type}
                                          onValueChange={(value: any) =>
                                            editingEventField
                                              ? setEditingEventField({ ...editingEventField, type: value })
                                              : setNewCustomField(prev => ({ ...prev, type: value }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Field type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="textarea">Multi-line Text</SelectItem>
                                            <SelectItem value="number">Number</SelectItem>
                                            <SelectItem value="boolean">Yes/No</SelectItem>
                                            <SelectItem value="date">Date</SelectItem>
                                            <SelectItem value="link">Link</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`required-field-${eventType.type}`}
                                          checked={editingEventField ? editingEventField.required : newCustomField.required}
                                          onCheckedChange={(checked) =>
                                            editingEventField
                                              ? setEditingEventField({ ...editingEventField, required: checked as boolean })
                                              : setNewCustomField(prev => ({ ...prev, required: checked as boolean }))
                                          }
                                        />
                                        <Label htmlFor={`required-field-${eventType.type}`}>Required field</Label>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => {
                                            if (editingEventField) {
                                              handleUpdateEventField(eventType.type);
                                            } else {
                                              handleAddCustomField(eventType.type);
                                            }
                                          }}
                                          disabled={
                                            editingEventField
                                              ? !editingEventField.name.trim()
                                              : !newCustomField.name.trim()
                                          }
                                          className="w-full sm:w-auto"
                                        >
                                          {editingEventField ? 'Update Field' : 'Add Field'}
                                        </Button>
                                        {editingEventField && (
                                          <Button
                                            variant="outline"
                                            onClick={() => setEditingEventField(null)}
                                            className="w-full sm:w-auto"
                                          >
                                            Cancel
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Existing custom fields */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium">Existing Fields</h4>
                                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {(eventType.customFields || []).length === 0 ? (
                                          <p className="text-center text-muted-foreground py-4">No custom fields added yet</p>
                                        ) : (
                                          [...(eventType.customFields || [])]
                                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                                            .map((field, index, array) => (
                                              <div
                                                key={field.id}
                                                className="flex items-center gap-2 p-2 rounded-lg border bg-white dark:bg-zinc-900"
                                              >
                                                <div className="flex flex-col gap-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    disabled={index === 0}
                                                    onClick={() => handleMoveEventField(eventType.type, index, 'up')}
                                                  >
                                                    <ArrowUp className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    disabled={index === array.length - 1}
                                                    onClick={() => handleMoveEventField(eventType.type, index, 'down')}
                                                  >
                                                    <ArrowDown className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                  <div>{field.name}</div>
                                                  <div className="text-gray-500">{field.type}</div>
                                                  <div className="text-gray-500">
                                                    {field.required ? "Required" : "Optional"}
                                                  </div>
                                                </div>
                                                <div className="flex gap-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingEventField(field)}
                                                    className="h-8 w-8"
                                                  >
                                                    <Edit2 className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveCustomField(eventType.type, field.id)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                                  >
                                                    <X className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button
                                      onClick={() => {
                                        setEditingCustomFields(null);
                                        setCustomFieldsDialogOpen(false);
                                      }}
                                    >
                                      Done
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] max-w-[500px] p-4 sm:p-6">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove the event type "{eventType.type}" and all its custom fields. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                                    <AlertDialogCancel className="mt-2 sm:mt-0">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveEventType(eventType.type)}>
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle>Contact Types</CardTitle>
                  <CardDescription>
                    Manage contact types and their custom fields
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="New contact type"
                        value={newVendorType}
                        onChange={(e) => setNewVendorType(e.target.value)}
                        className="w-full sm:max-w-xs"
                      />
                      <Button
                        onClick={handleAddVendorType}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Type
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {settings.contactTypes.map((contactType) => (
                        <div key={contactType.id} className="space-y-4">
                          <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group">
                            {editingVendorType === contactType.id ? (
                              <div className="flex-1">
                                <Input
                                  value={editedVendorTypeName}
                                  onChange={(e) => setEditedVendorTypeName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateVendorTypeName(contactType.id, editedVendorTypeName);
                                      setEditingVendorType(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingVendorType(null);
                                    }
                                  }}
                                  className="h-7"
                                />
                              </div>
                            ) : (
                              <span className="flex-1 font-medium truncate">{contactType.name}</span>
                            )}
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {editingVendorType === contactType.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      handleUpdateVendorTypeName(contactType.id, editedVendorTypeName);
                                      setEditingVendorType(null);
                                    }}
                                    className="h-7 w-7"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingVendorType(null)}
                                    className="h-7 w-7"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Dialog open={editingVendorCustomFields === contactType.id && vendorCustomFieldsDialogOpen} onOpenChange={(open) => {
                                  if (!open) {
                                    setEditingVendorCustomFields(null);
                                  }
                                  setVendorCustomFieldsDialogOpen(open);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingVendorCustomFields(contactType.id);
                                        setVendorCustomFieldsDialogOpen(true);
                                        setEditedVendorTypeName(contactType.name);
                                      }}
                                      className="text-gray-500 hover:text-purple-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      Edit
                                    </Button>
                                  </DialogTrigger>
                                </Dialog>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-red-500"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Contact Type?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the contact type "{contactType.name}" and all its custom fields.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRemoveVendorType(contactType.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Custom Fields Dialog for Contact Types */}
        <Dialog open={vendorCustomFieldsDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingVendorCustomFields(null);
          }
          setVendorCustomFieldsDialogOpen(open);
        }}>
          <DialogContent className="w-[95vw] max-w-[500px] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Contact Type</DialogTitle>
              <DialogDescription>
                Edit name and manage custom fields for this contact type
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
              {/* Contact Type Name */}
              {editingVendorCustomFields !== null && (
                <div className="space-y-2">
                  <Label htmlFor="contact-type-name">Contact Type Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="contact-type-name"
                      value={editedVendorTypeName}
                      onChange={(e) => setEditedVendorTypeName(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {/* Add/Edit custom field form */}
              <div className="space-y-4 border-b pb-4">
                <h4 className="font-medium">{editingField ? 'Edit Field' : 'Add New Field'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Field name"
                    value={editingField ? editingField.name : newVendorCustomField.name}
                    onChange={(e) =>
                      editingField
                        ? setEditingField({ ...editingField, name: e.target.value })
                        : setNewVendorCustomField((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                  <Select
                    value={editingField ? editingField.type : newVendorCustomField.type}
                    onValueChange={(value: any) =>
                      editingField
                        ? setEditingField({ ...editingField, type: value })
                        : setNewVendorCustomField((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Field type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Multi-line Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={editingField ? editingField.required : newVendorCustomField.required}
                    onCheckedChange={(checked) =>
                      editingField
                        ? setEditingField({ ...editingField, required: checked as boolean })
                        : setNewVendorCustomField((prev) => ({ ...prev, required: checked as boolean }))
                    }
                  />
                  <Label htmlFor="required">Required field</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (editingField && editingVendorCustomFields !== null) {
                        const contactType = settings.contactTypes.find(
                          (vt) => vt.id === editingVendorCustomFields
                        );
                        if (contactType) {
                          const updatedFields = (contactType.customFields || []).map((field) =>
                            field.id === editingField.id
                              ? {
                                  ...field,
                                  name: editingField.name,
                                  type: editingField.type,
                                  required: editingField.required,
                                }
                              : field
                          );
                          dispatch(updateVendorTypeCustomFieldsApi(editingVendorCustomFields, updatedFields));
                          setEditingField(null);
                        }
                      } else if (editingVendorCustomFields !== null) {
                        handleAddVendorCustomField();
                      }
                    }}
                    disabled={
                      editingField
                        ? !editingField.name.trim()
                        : !newVendorCustomField.name.trim()
                    }
                    className="w-full sm:w-auto"
                  >
                    {editingField ? 'Update Field' : 'Add Field'}
                  </Button>
                  {editingField && (
                    <Button
                      variant="outline"
                      onClick={() => setEditingField(null)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Existing custom fields */}
              <div className="space-y-2">
                <h4 className="font-medium">Existing Fields</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {editingVendorCustomFields !== null && (
                    [...(settings.contactTypes
                      .find((vt) => vt.id === editingVendorCustomFields)
                      ?.customFields || [])].length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No custom fields added yet</p>
                      ) : (
                        [...(settings.contactTypes
                          .find((vt) => vt.id === editingVendorCustomFields)
                          ?.customFields || [])]
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((field, index, array) => (
                            <div
                              key={field.id}
                              className="flex items-center gap-2 p-2 rounded-lg border bg-white dark:bg-zinc-900 group"
                            >
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={index === 0}
                                  onClick={() => handleMoveField(editingVendorCustomFields, index, 'up')}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={index === array.length - 1}
                                  onClick={() => handleMoveField(editingVendorCustomFields, index, 'down')}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>{field.name}</div>
                                <div className="text-gray-500">{field.type}</div>
                                <div className="text-gray-500">
                                  {field.required ? "Required" : "Optional"}
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingField(field)}
                                  className="h-8 w-8"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (editingVendorCustomFields !== null) {
                                      handleRemoveVendorCustomField(
                                        editingVendorCustomFields,
                                        field.id
                                      );
                                    }
                                  }}
                                  className="h-8 w-8 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                      )
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setVendorCustomFieldsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingVendorCustomFields !== null) {
                    handleUpdateVendorTypeName(editingVendorCustomFields, editedVendorTypeName);
                    setVendorCustomFieldsDialogOpen(false);
                  }
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}