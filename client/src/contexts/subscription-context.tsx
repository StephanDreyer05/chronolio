import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// Types
export type SubscriptionPlanVariant = {
  id: number;
  planId: number;
  name: string;
  lemonSqueezyVariantId: string;
  price: number;
  interval: string;
  intervalCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPlan = {
  id: number;
  name: string;
  description: string | null;
  lemonSqueezyProductId: string;
  isActive: boolean;
  features: string[];
  createdAt: string;
  updatedAt: string;
  variants: SubscriptionPlanVariant[];
};

export type SubscriptionStatus = 
  'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | 'inactive';

export type UserSubscription = {
  id: number;
  userId: number;
  lemonSqueezyCustomerId: string | null;
  lemonSqueezySubscriptionId: string | null;
  planId: number | null;
  variantId: number | null;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan | null;
  variant: SubscriptionPlanVariant | null;
};

type SubscriptionContextType = {
  plans: SubscriptionPlan[];
  userSubscription: UserSubscription | null;
  isLoading: boolean;
  error: Error | null;
  createCheckout: (variantId: number) => Promise<string | null>;
  getCustomerPortal: () => Promise<string | null>;
  isSubscriptionActive: () => boolean;
  isPremium: () => boolean;
  fetchUserSubscription: () => Promise<void>;
  getRemainingDays: () => number;
  getTrialDaysLeft: () => number;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { toast } = useToast();
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const hasFetchedRef = useRef(false);
  
  // Get values from auth context
  const { user, isLoggedIn } = auth;
  
  // Fetch available subscription plans
  const { 
    data: plans = [],
    isLoading: isPlansLoading,
    error: plansError
  } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }
      return response.json();
    },
    enabled: true, // Always fetch plans, even for non-logged in users
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetching when window regains focus
  });
  
  // Fetch user subscription if logged in
  const { 
    isLoading: isSubscriptionLoading,
    error: subscriptionError,
    refetch
  } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      // Only fetch if we haven't already or if explicitly requested
      if (hasFetchedRef.current && !userSubscription) {
        return null;
      }
      
      const response = await fetch('/api/subscription/user');
      if (!response.ok) {
        throw new Error('Failed to fetch user subscription');
      }
      const data = await response.json();
      setUserSubscription(data);
      hasFetchedRef.current = true;
      return data;
    },
    enabled: isLoggedIn && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetching when window regains focus
  });
  
  const fetchUserSubscription = async () => {
    if (isLoggedIn && user?.id) {
      // Force a refetch by temporarily clearing the hasFetchedRef
      const wasFetched = hasFetchedRef.current;
      hasFetchedRef.current = false;
      await refetch();
      hasFetchedRef.current = true;
    }
  };
  
  // Create checkout session
  const createCheckout = async (variantId: number): Promise<string | null> => {
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variantId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create checkout',
          variant: 'destructive',
        });
        return null;
      }
      
      const { url } = await response.json();
      return url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create checkout',
        variant: 'destructive',
      });
      return null;
    }
  };
  
  // Get customer portal URL
  const getCustomerPortal = async (): Promise<string | null> => {
    try {
      if (!userSubscription || !userSubscription.lemonSqueezySubscriptionId) {
        toast({
          title: 'Error',
          description: 'No active subscription found',
          variant: 'destructive',
        });
        return null;
      }
      
      const response = await fetch('/api/subscription/portal');
      
      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to access customer portal',
          variant: 'destructive',
        });
        return null;
      }
      
      const { url } = await response.json();
      return url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to access customer portal',
        variant: 'destructive',
      });
      return null;
    }
  };
  
  // Check if subscription is active
  const isSubscriptionActive = (): boolean => {
    if (!userSubscription) return false;
    
    // First check if status is active
    if (userSubscription.status === 'active') return true;
    
    // For trial subscriptions, we need to also check if the trial period has ended
    if (userSubscription.status === 'on_trial') {
      // If we have a currentPeriodEnd date, check if it's in the past
      // This safeguards against cases where the backend hasn't updated the status yet
      if (userSubscription.currentPeriodEnd) {
        const now = new Date();
        const trialEndDate = new Date(userSubscription.currentPeriodEnd);
        
        // If trial end date is in the past, subscription may not be active
        // The backend will check with LemonSqueezy to determine if payment went through
        if (trialEndDate < now) {
          console.log('Trial period has ended, subscription might be in transition state');
          // Trial has ended - subscription might be in process of converting to active
          // or might be expiring. We'll treat it as active and let server-side checks
          // update the actual status on next refresh
          return true;
        }
      }
      
      // If trial end date is in the future or not set, trial is still active
      return true;
    }
    
    // For all other statuses (paused, past_due, unpaid, cancelled, expired), check specific rules
    // Currently we only count 'active' and valid 'on_trial' as active subscriptions
    return false;
  };
  
  // Check if user is on premium plan
  const isPremium = (): boolean => {
    return isSubscriptionActive() && !!userSubscription?.planId;
  };
  
  // Calculate days remaining in the subscription period
  const getRemainingDays = (): number => {
    if (!userSubscription || !userSubscription.currentPeriodEnd) return 0;
    
    const now = new Date();
    const endDate = new Date(userSubscription.currentPeriodEnd);
    
    // Calculate difference in days
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };
  
  // Calculate days remaining in the trial period
  const getTrialDaysLeft = (): number => {
    if (!userSubscription || userSubscription.status !== 'on_trial' || !userSubscription.trialEndsAt) {
      return 0;
    }
    
    const now = new Date();
    const trialEndDate = new Date(userSubscription.trialEndsAt);
    
    // Calculate difference in days
    const diffTime = trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };
  
  // Combine loading states and errors
  const isLoading = isPlansLoading || (isLoggedIn && isSubscriptionLoading);
  const error = plansError || subscriptionError || null;
  
  const value = {
    plans,
    userSubscription,
    isLoading,
    error: error as Error | null,
    createCheckout,
    getCustomerPortal,
    isSubscriptionActive,
    isPremium,
    fetchUserSubscription,
    getRemainingDays,
    getTrialDaysLeft,
  };
  
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}