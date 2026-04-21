"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Monitor,
  Save,
  Eye,
  EyeOff,
  Settings,
  AlertTriangle,
  Sun,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

export function ScreenSettingsTab() {
  const { publish, subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [enabled, setEnabled] = useState(true);
  const [timeoutMinutes, setTimeoutMinutes] = useState(5);
  const [brightness, setBrightness] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<{
    dpms_enabled?: boolean;
    standby_timeout_seconds?: string;
    suspend_timeout_seconds?: string;
    off_timeout_seconds?: string;
    timeout_minutes?: string;
    brightness?: number;
  }>({});

  // MQTT Topics
  const TOPIC_SCREEN_CONFIG = "system/screen/config";
  const TOPIC_SCREEN_STATUS = "system/screen/status";

  // Load current configuration on mount
  useEffect(() => {
    if (isReady) {
      const handleMessage = (topic: string, message: string) => {
        if (topic === TOPIC_SCREEN_STATUS) {
          try {
            const data = JSON.parse(message);
            if (data.result === "success" && data.status) {
              setCurrentStatus(data.status);
              if (data.config && data.config.enabled !== undefined) {
                setEnabled(data.config.enabled);
                if (data.config.enabled && data.config.timeout_minutes) {
                  setTimeoutMinutes(data.config.timeout_minutes);
                }
              }
              if (data.status.brightness !== undefined) {
                setBrightness(data.status.brightness);
              }
            }
          } catch (error) {
            console.error("Error parsing screen status:", error);
          }
        }
      };

      subscribe(TOPIC_SCREEN_STATUS, handleMessage);
      publish(TOPIC_SCREEN_CONFIG, JSON.stringify({ action: "get_status" }));

      return () => {
        unsubscribe(TOPIC_SCREEN_STATUS, handleMessage);
      };
    }
  }, [isReady, publish, subscribe, unsubscribe]);

  const handleApplySettings = async () => {
    if (!isReady) {
      toast.error("MQTT client not connected");
      return;
    }

    setIsLoading(true);

    if (enabled && (timeoutMinutes < 1 || timeoutMinutes > 60)) {
      toast.error("Timeout must be between 1-60 minutes");
      setIsLoading(false);
      return;
    }

    const payload = {
      action: "set_config",
      enabled: enabled,
      timeout_minutes: timeoutMinutes,
      brightness: brightness,
    };

    publish(TOPIC_SCREEN_CONFIG, JSON.stringify(payload));

    const handleResponse = (topic: string, message: string) => {
      if (topic === TOPIC_SCREEN_STATUS) {
        try {
          const data = JSON.parse(message);
          if (data.result === "success") {
            toast.success(data.message || "Screen settings applied successfully");
          } else {
            toast.error(data.message || "Failed to apply screen settings");
          }
          setIsLoading(false);
          unsubscribe(TOPIC_SCREEN_STATUS, handleResponse);
        } catch (error) {
          console.error("Error parsing response:", error);
          setIsLoading(false);
          unsubscribe(TOPIC_SCREEN_STATUS, handleResponse);
        }
      }
    };

    subscribe(TOPIC_SCREEN_STATUS, handleResponse);

    setTimeout(() => {
      if (isLoading) {
        toast.info("Settings applied (no confirmation received).");
        setIsLoading(false);
        unsubscribe(TOPIC_SCREEN_STATUS, handleResponse);
      }
    }, 3000);
  };

  const getStatusBadgeVariant = (enabled?: boolean) => {
    if (enabled === undefined) return "secondary";
    return enabled ? "default" : "destructive";
  };

  const getStatusText = (enabled?: boolean) => {
    if (enabled === undefined) return "Unknown";
    return enabled ? "Enabled" : "Disabled";
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Screen Power Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure automatic screen timeout and power saving
            </p>
          </div>
        </div>
        <Badge
          variant={isReady ? "default" : "destructive"}
          className="font-medium"
        >
          {connectionStatus}
        </Badge>
      </div>

      {/* Current Status Card */}
      <Card className="border-l-4 border-l-cyan-500/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
              <Eye className="h-4 w-4 text-cyan-600" />
            </div>
            Current Screen Status
          </CardTitle>
          <CardDescription className="text-sm">
            Real-time status of screen blanking and DPMS settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${currentStatus.dpms_enabled ? "bg-green-500" : "bg-red-500"
                    }`}
                />
                DPMS Status
              </Label>
              <div>
                <Badge
                  variant={getStatusBadgeVariant(currentStatus.dpms_enabled)}
                  className="text-sm px-3 py-1"
                >
                  {getStatusText(currentStatus.dpms_enabled)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Timeout Setting
              </Label>
              <div className="text-lg font-mono font-medium">
                {currentStatus.timeout_minutes
                  ? `${currentStatus.timeout_minutes} min`
                  : "Not set"}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Screen State
              </Label>
              <div className="text-sm text-muted-foreground">
                {currentStatus.dpms_enabled === true ? "Active" : "Disabled"}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Brightness Level
              </Label>
              <div className="text-lg font-mono font-medium">
                {currentStatus.brightness !== undefined ? `${currentStatus.brightness}%` : "Not detected"}
              </div>
            </div>
          </div>

          {currentStatus.off_timeout_seconds && (
            <div className="bg-muted/50 p-4 rounded-lg border">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                DPMS Configuration Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Standby:</span>
                  <span className="font-mono ml-2">
                    {currentStatus.standby_timeout_seconds}s
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Suspend:</span>
                  <span className="font-mono ml-2">
                    {currentStatus.suspend_timeout_seconds}s
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Off:</span>
                  <span className="font-mono ml-2">
                    {currentStatus.off_timeout_seconds}s
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Configuration Card */}
      <Card className="border-l-4 border-l-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Save className="h-4 w-4 text-primary" />
            </div>
            Screen Timeout Configuration
          </CardTitle>
          <CardDescription className="text-sm">
            Configure automatic screen blanking when the system is inactive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${enabled ? "bg-green-500" : "bg-gray-400"
                  }`}
              />
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  Enable Screen Timeout
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically blank screen after period of inactivity
                </p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!isReady || isLoading}
            />
          </div>

          {/* Timeout Configuration */}
          {enabled && (
            <div className="space-y-4 p-4 bg-green-500/5 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-medium text-green-700">
                  Timeout Duration
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout" className="text-sm font-medium">
                    Minutes
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1}
                    max={60}
                    value={timeoutMinutes}
                    onChange={(e) =>
                      setTimeoutMinutes(parseInt(e.target.value) || 1)
                    }
                    disabled={!isReady || isLoading}
                    className="h-10"
                  />
                </div>
                <div className="flex items-end">
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded border">
                    Range: 1-60 minutes
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                Screen will automatically blank after {timeoutMinutes} minute
                {timeoutMinutes !== 1 ? "s" : ""} of inactivity. Movement or
                keyboard input will wake the screen immediately.
              </div>
            </div>
          )}

          <div className="border-t border-muted/50 my-6" />

          {/* Brightness Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
                <Sun className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="space-y-1">
                <Label className="text-base font-medium">Screen Brightness</Label>
                <p className="text-sm text-muted-foreground">Adjust the LCD/HDMI brightness level ({brightness}%)</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Slider
                min={10}
                max={100}
                step={1}
                value={[brightness]}
                onValueChange={(vals) => {
                  const newBrightness = vals[0];
                  setBrightness(newBrightness);
                  if (isReady) {
                    publish(
                      TOPIC_SCREEN_CONFIG,
                      JSON.stringify({
                        action: "set_config",
                        enabled: enabled,
                        timeout_minutes: timeoutMinutes,
                        brightness: newBrightness,
                      })
                    );
                  }
                }}
                disabled={!isReady || isLoading}
                className="flex-1"
              />
              <Sun className="h-5 w-5 text-yellow-500" />
            </div>
          </div>

          <div className="border-t border-muted/50 my-6" />

          {/* Apply Settings Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleApplySettings}
              disabled={!isReady || isLoading}
              size="lg"
              className="flex-1 h-12 text-base font-medium"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 mr-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Applying Settings...
                </>
              ) : (
                <>
                  <Save className="mr-3 h-5 w-5" />
                  Apply Screen Settings
                </>
              )}
            </Button>
          </div>

          {/* Technical Information */}
          <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-700">
                  How Screen Timeout Works
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    • <strong>Wayland:</strong> Uses swayidle + wlr-randr for
                    modern display management
                  </p>
                  <p>
                    • <strong>X11:</strong> Falls back to DPMS/xset for legacy
                    compatibility
                  </p>
                  <p>
                    • <strong>Wake:</strong> Screen activates on mouse movement
                    or keyboard input
                  </p>
                  <p>
                    • <strong>Power:</strong> Reduces energy consumption during
                    inactivity periods
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Warning */}
          {!isReady && (
            <div className="flex items-center gap-3 text-destructive text-sm p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">MQTT Connection Required</p>
                <p className="text-xs">
                  Settings cannot be applied when disconnected from the broker.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
