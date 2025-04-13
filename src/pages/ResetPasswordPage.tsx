import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeftIcon, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

// Form validation schema
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(null);
  
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });
  
  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setTokenValidationError("No reset token provided");
        setIsValidatingToken(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/validate-reset-token?token=${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          setTokenValidationError(data.error || "Invalid or expired reset token");
        }
      } catch (error) {
        setTokenValidationError("Failed to validate reset token");
      } finally {
        setIsValidatingToken(false);
      }
    }
    
    validateToken();
  }, [token]);
  
  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setResetComplete(true);
        toast({
          title: "Password reset successful",
          description: "Your password has been updated successfully",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reset password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderContent = () => {
    if (isValidatingToken) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Validating your reset link...</p>
        </div>
      );
    }
    
    if (tokenValidationError) {
      return (
        <div className="py-4">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{tokenValidationError}</AlertDescription>
          </Alert>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            The password reset link may have expired or is invalid. Please request a new password reset link.
          </p>
          <Button
            onClick={() => navigate("/forgot-password")}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            Request New Reset Link
          </Button>
        </div>
      );
    }
    
    if (resetComplete) {
      return (
        <div className="text-center py-4">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Password Reset Complete</h3>
          <p className="mb-4">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            Go to Login
          </Button>
        </div>
      );
    }
    
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Enter your new password" 
                    {...field} 
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Confirm your new password" 
                    {...field} 
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </Form>
    );
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(246,248,250)] dark:bg-black p-4">
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Reset Your Password
            </span>
          </CardTitle>
          <CardDescription>
            {tokenValidationError 
              ? "Invalid or expired reset link"
              : resetComplete
                ? "Password reset complete"
                : "Create a new password for your Chronolio account"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {renderContent()}
        </CardContent>
        
        {!resetComplete && !tokenValidationError && (
          <CardFooter className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Login
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}