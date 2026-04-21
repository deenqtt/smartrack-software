"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User, Clock, Shield, Mail, Calendar, Key, Timer, LogOut, Edit, Loader2 } from "lucide-react";

export function UserProfileDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loginTime, logout, isLoggingOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for real-time session duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  // Calculate session info using actual login time
  const actualLoginTime = loginTime || currentTime; // Fallback to current time if not set
  const sessionDuration = Math.floor((currentTime.getTime() - actualLoginTime.getTime()) / 1000 / 60); // minutes
  const timeUntilExpiry = Math.max(0, 8 * 60 - sessionDuration); // 8 hours in minutes, minimum 0

  const handleLogout = async () => {
    await logout();
  };

  const handleEditUser = () => {
    router.push("/system-config/user-management");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
          <DialogDescription>
            Detailed information about your current session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-medium text-lg">
                {user.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {(user.email || "User").split('@')[0]}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.email || "No email provided"}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {user.role?.name?.toLowerCase() || 'user'}
            </Badge>
          </div>

          <Separator />

          {/* Session Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Information
            </h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Session Duration</p>
                <p className="font-medium">
                  {Math.floor(sessionDuration / 60)}h {sessionDuration % 60}m
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground">Time Until Expiry</p>
                <p className="font-medium">
                  {Math.floor(timeUntilExpiry / 60)}h {timeUntilExpiry % 60}m
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground">Login Time</p>
                <p className="font-medium">
                  {loginTime ? loginTime.toLocaleTimeString() : 'Unknown'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground">Auto Logout</p>
                <p className="font-medium">
                  {loginTime && loginTime.getTime() + (8 * 60 * 60 * 1000) > Date.now()
                    ? 'Active'
                    : 'Expired'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Details
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Authentication</span>
                <Badge variant="outline" className="text-green-600">
                  JWT Token
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Expires</span>
                <span className="font-medium">24 hours</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Check</span>
                <span className="font-medium">Every 8 hours</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {user.userId?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleEditUser}
              className="flex-1 flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>

            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 flex items-center gap-2"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
