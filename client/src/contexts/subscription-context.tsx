import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  });
  
  // Fetch user subscription if logged in
  const { 
    isLoading: isSubscriptionLoading,
    error: subscriptionError,
    refetch
  } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/subscription/user');
      if (!response.ok) {
        throw new Error('Failed to fetch user subscription');
      }
      const data = await response.json();
      setUserSubscription(data);
      return data;
    },
    enabled: isLoggedIn && !!user?.id,
  });
  
  const fetchUserSubscription = async () => {
    if (isLoggedIn && user?.id) {
      await refetch();
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
    return ['active', 'on_trial'].includes(userSubscription.status);
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