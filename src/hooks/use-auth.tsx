import { ReactNode, createContext, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import type { SelectUser, InsertUser } from "@db/schema";
import { useToast } from "./use-toast";
import { useLocation } from "wouter";
import { useDispatch, useSelector } from 'react-redux';
import { setSettings, fetchSettings } from '../store/settingsSlice';
import { fetchWithAuth } from "../lib/api";
import { RootState } from '../store/settingsSlice';

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isLoggedIn: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

async function apiRequest(method: string, url: string, data?: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "An unexpected error occurred" }));
    throw new Error(error.error || "An unexpected error occurred");
  }

  return response;
}

async function fetchUserSettings() {
  try {
    const response = await fetchWithAuth('/api/settings');
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user settings: ${response.status} ${response.statusText}. ${errorText}`);
    }
    
    const settings = await response.json();
    console.log('User settings fetched:', settings);
    return settings;
  } catch (error) {
    console.error('Error in fetchUserSettings:', error);
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const settingsState = useSelector((state: RootState) => state.settings);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user");
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Failed to fetch user");
        const userData = await response.json();

        // If we have a user and settings are not already loaded or are currently loading,
        // fetch their settings
        if (userData && (!settingsState || settingsState.isLoading === false)) {
          console.log('User authenticated, dispatching settings fetch');
          dispatch(fetchSettings());
        }

        return userData;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/user"], data);
      
      // After login, manually refresh subscription data with direct API call
      try {
        // Invalidate subscription data to force refetch on next render
        queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
        console.log("Subscription data will be refreshed on next component render");
      } catch (subError) {
        console.error("Error invalidating subscription data:", subError);
      }
      
      // Fetch and set user settings immediately after login
      try {
        console.log('User logged in, dispatching settings fetch');
        await dispatch(fetchSettings());
        
        // Check user subscription status using a direct API call
        try {
          const subResponse = await fetch('/api/subscription/user');
          const subData = await subResponse.json();
          
          // If subscription exists but is not active, redirect to subscription page
          if (
            subData && 
            (!subData.status || 
             !['active', 'on_trial'].includes(subData.status))
          ) {
            toast({
              title: "Login successful",
              description: "Welcome back! Please choose a subscription plan.",
            });
            navigate("/subscription");
            return;
          }
        } catch (subError) {
          console.error("Error checking subscription:", subError);
        }
        
        // Default success toast and navigation
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        navigate("/");
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    },
    onError: (error: Error, variables) => {
      // Check if this is an unverified email error
      if (error.message && error.message.includes("verify your email")) {
        toast({
          title: "Chronolio Email Verification Required",
          description: (
            <div className="space-y-2">
              <p>{error.message}</p>
              <button 
                className="text-xs text-blue-400 underline cursor-pointer"
                onClick={async () => {
                  try {
                    // Call the resend verification API directly with the username
                    const response = await fetch("/api/resend-verification", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ username: variables.username }),
                    });
                    
                    if (response.ok) {
                      toast({
                        title: "Chronolio Verification Email Sent",
                        description: "Please check your inbox for the verification link",
                      });
                    } else {
                      const errorData = await response.json();
                      throw new Error(errorData.error || "Failed to resend verification email");
                    }
                  } catch (resendError: any) {
                    toast({
                      title: "Failed to Resend",
                      description: resendError.message || "Could not resend verification email",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Resend verification email
              </button>
            </div>
          ),
          variant: "destructive",
          duration: 10000, // Show for longer
        });
      } else {
        // Handle other errors
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const response = await apiRequest("POST", "/api/register", newUser);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/user"], data);
      // Fetch and set user settings immediately after registration
      try {
        const settings = await fetchUserSettings();
        dispatch(setSettings(settings));
        
        // Check if email verification was sent
        if (data.emailVerificationSent) {
          toast({
            title: "Registration successful",
            description: "Please check your email for a verification link.",
          });
        } else {
          toast({
            title: "Registration successful",
            description: "Welcome to Chronolio! Choose your subscription plan.",
          });
        }
        
        // Redirect to subscription page instead of home
        navigate("/subscription");
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear the user data from the cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Reset settings in Redux store to initial state with default values
      dispatch(setSettings({
        theme: 'system',
        hidePastEvents: false,
        showCategories: true,
        defaultEventDuration: 30,
        defaultStartTime: '09:00',
        timeIncrement: 5,
        durationIncrement: 5,
        defaultCalendarView: 'quarter',
        defaultSorting: 'date-asc',
        exportFooterText: 'Created with Chronolio.com',
        eventTypes: [
          { type: 'Wedding', color: '#6d28d9' },
          { type: 'Corporate', color: '#2563eb' },
          { type: 'Birthday', color: '#db2777' },
          { type: 'Conference', color: '#059669' },
          { type: 'Festival', color: '#d97706' }
        ],
        contactTypes: [], // Explicitly reset contact types to empty array
        isLoading: false,
        error: null
      }));
      
      // Invalidate all queries to ensure fresh data on next login
      queryClient.invalidateQueries();

      toast({
        title: "Logged out",
        description: "Come back soon!",
      });
      // Redirect to auth page after logout
      navigate("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Determine if user is logged in
  const isLoggedIn = !!user;
  
  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        isLoggedIn,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}