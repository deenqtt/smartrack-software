"use client";

import { Loader2 } from "lucide-react";

interface LoadingPageProps {
  message?: string;
  variant?: "default" | "inline" | "minimal" | "skeleton";
}

export function LoadingPage({
  message = "Loading...",
  variant = "default"
}: LoadingPageProps) {

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        {/* Simple skeleton header */}
        <div className="h-8 bg-muted rounded-lg animate-pulse w-2/3" />

        {/* Simple skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Simple spinning icon */}
        <div className="mb-6 flex justify-center">
          <div className="bg-card border border-border rounded-xl p-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Loading Dashboard
        </h2>

        <p className="text-muted-foreground mb-4">
          {message}
        </p>

        {/* Simple progress indicator */}
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div className="bg-primary h-2 rounded-full animate-pulse w-3/4" />
        </div>

        <p className="text-xs text-muted-foreground">
          Please wait...
        </p>
      </div>
    </div>
  );
}
