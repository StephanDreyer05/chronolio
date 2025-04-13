import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>("");
  
  useEffect(() => {
    // Track whether verification has been attempted for this token
    const verificationKey = `verified_${token}`;
    const alreadyVerified = sessionStorage.getItem(verificationKey);

    async function verifyToken() {
      // Don't verify if no token or already verified this token
      if (!token) {
        setStatus('error');
        setMessage("No verification token provided");
        return;
      }
      
      if (alreadyVerified) {
        // If already verified, use the cached result
        if (alreadyVerified === 'success') {
          setStatus('success');
          setMessage("Your email has been successfully verified");
        } else {
          setStatus('error');
          setMessage("This verification link was already used or is invalid");
        }
        return;
      }
      
      try {
        const response = await fetch(`/api/verify-email?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
          // Store successful verification state
          sessionStorage.setItem(verificationKey, 'success');
          setStatus('success');
          setMessage(data.message || "Your email has been successfully verified");
        } else {
          // Store unsuccessful verification state
          sessionStorage.setItem(verificationKey, 'error');
          setStatus('error');
          setMessage(data.error || "Failed to verify your email");
        }
      } catch (error) {
        // Store error state
        sessionStorage.setItem(verificationKey, 'error');
        setStatus('error');
        setMessage("An unexpected error occurred while verifying your email");
        console.error("Verification error:", error);
      }
    }
    
    verifyToken();
  }, [token]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(246,248,250)] dark:bg-black p-4">
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Chronolio Email Verification
            </span>
          </CardTitle>
          <CardDescription>
            {status === 'loading' ? 'Verifying your email address...' : 
              status === 'success' ? 'Your email has been verified!' :
              'There was a problem verifying your email'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center p-6">
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Please wait, this may take a moment...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                You can now log in with your account.
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-600 mx-auto" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                If you're having trouble, try requesting a new verification email.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          {status === 'success' && (
            <Button 
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              Log In
            </Button>
          )}
          
          {status === 'error' && (
            <Button 
              onClick={() => navigate("/auth")}
              variant="outline"
            >
              Back to Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}