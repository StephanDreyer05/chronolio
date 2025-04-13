import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Subscription Not Completed
          </CardTitle>
          <CardDescription>
            Your subscription checkout was cancelled
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <div className="py-4">
            <p className="mb-4">
              You've cancelled the subscription checkout process. No charges have been made to your account.
            </p>
            <p className="text-sm text-muted-foreground">
              If you encountered any issues during the checkout process or have questions about our subscription plans,
              please don't hesitate to contact our support team.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/subscription">Try Again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}