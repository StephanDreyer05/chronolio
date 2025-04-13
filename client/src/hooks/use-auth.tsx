import { ReactNode, createContext, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import type { SelectUser, InsertUser } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useDispatch } from 'react-redux';
import { setSettings, fetchSettings } from '@/store/settingsSlice';

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

async function fetchUserSettings(dispatch: any) {
  try {
    console.log('Fetching user settings from auth context...');
    // Use the Redux action for consistent settings handling
    await dispatch(fetchSettings());
    console.log('User settings fetched successfully via Redux action');
    return true;
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
  const pathname = window.location.pathname;
  const isTrialPage = pathname === '/try' || pathname.startsWith('/try/');

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Skip API call if on trial page
        if (isTrialPage) {
          console.log('Trial page detected, skipping user auth check');
          return null;
        }

        const response = await fetch("/api/user");
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Failed to fetch user");
        const userData = await response.json();

        // If we have a user, fetch their settings
        if (userData) {
          await fetchUserSettings(dispatch);
        }

        return userData;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    // Set staleTime to infinity for the trial page to prevent refetching
    staleTime: isTrialPage ? Infinity : 5 * 60 * 1000, // 5 minutes for normal pages, infinite for trial
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/user"], data);
      // Fetch and set user settings immediately after login
      try {
        await fetchUserSettings(dispatch);
        
        // Check user subscription status
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
          console.error("Error fetching subscription:", subError);
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
        await fetchUserSettings(dispatch);
        
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