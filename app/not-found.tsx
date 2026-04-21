"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Home, Search, ArrowLeft, FileQuestion, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-muted/30">
      {/* Clean Header */}
      <header className="flex h-16 items-center border-b px-4 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <FileQuestion size={18} className="text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">
              Page Not Found
            </h1>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8 bg-gradient-to-br from-background via-muted/10 to-muted/30">
        <div className="text-center space-y-6 animate-bounce-in">
          {/* Enhanced Alert Icon with Animation */}
          <div className="relative mb-8">
            {/* Pulsing background ring */}
            <div className="absolute inset-0 w-40 h-40 mx-auto bg-red-500/30 rounded-3xl animate-ping opacity-75"></div>

            {/* Main icon container with enhanced zoom-bounce animation */}
            <div className="relative w-40 h-40 mx-auto bg-red-50 dark:bg-red-950/30 rounded-3xl flex items-center justify-center shadow-lg border-2 border-red-200 dark:border-red-800/50 animate-zoom-bounce">
              <AlertTriangle className="w-20 h-20 text-red-600 dark:text-red-400" />
            </div>

            {/* Custom CSS for enhanced zoom-bounce animation */}
            <style jsx>{`
              @keyframes zoomBounce {
                0%, 100% {
                  transform: scale(1) translateY(0);
                }
                25% {
                  transform: scale(1.1) translateY(-8px);
                }
                50% {
                  transform: scale(0.95) translateY(-4px);
                }
                75% {
                  transform: scale(1.05) translateY(-12px);
                }
              }

              .animate-zoom-bounce {
                animation: zoomBounce 2s ease-in-out infinite;
              }
            `}</style>
          </div>

          {/* Error Code */}
          <div className="space-y-2">
            <h1 className="text-8xl lg:text-9xl font-bold text-foreground">
              404
            </h1>
            <div className="w-20 h-1 bg-border rounded-full mx-auto"></div>
          </div>

          {/* Error Message */}
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
              Oops! Page Not Found
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The page you're looking for doesn't exist or has been moved to a different location.
            </p>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 border">
              <p className="mb-2">This could happen because:</p>
              <ul className="text-left space-y-1 list-disc list-inside">
                <li>The URL was typed incorrectly</li>
                <li>The page has been deleted or moved</li>
                <li>You don't have permission to access this page</li>
                <li>The link you followed is broken</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="lg"
              className="flex items-center gap-2 h-12"
            >
              <ArrowLeft size={18} />
              Go Back
            </Button>

            <Link href="/">
              <Button
                size="lg"
                className="flex items-center gap-2 h-12 w-full sm:w-auto"
              >
                <Home size={18} />
                Go to Homepage
              </Button>
            </Link>

            <Link href="/dashboard-overview">
              <Button
                variant="outline"
                size="lg"
                className="flex items-center gap-2 h-12 w-full sm:w-auto"
              >
                <Search size={18} />
                Go to Dashboard
              </Button>
            </Link>
          </div>

          {/* Additional Help */}
          <div className="pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Contact support or check our documentation for assistance.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
