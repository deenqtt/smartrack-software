"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Home, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const [countdown, setCountdown] = useState(10);

  const attemptedPath = searchParams.get('path') || '/';

  // Auto redirect countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto redirect to home after countdown
      router.push('/');
    }
  }, [countdown, router]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-destructive">
            <AlertTriangle className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            Access Denied
          </CardTitle>
          <CardDescription className="text-base">
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <strong>Attempted URL:</strong>
            <br />
            <code className="text-xs break-all">{attemptedPath}</code>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            If you believe this is an error, please contact your administrator.
          </div>

          <div className="text-sm text-center text-muted-foreground">
            Redirecting to home in <strong>{countdown}</strong> seconds...
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </Button>

            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>

            <Button onClick={handleLogout} variant="outline" className="w-full text-destructive hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            <strong>403 Forbidden</strong> - Insufficient permissions
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
