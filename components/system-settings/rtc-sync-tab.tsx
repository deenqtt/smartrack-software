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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Clock,
  RefreshCw,
  Server,
  Cpu,
  Save,
  Send,
  Cloud,
  Laptop,
  CalendarIcon,
  AlertTriangle,
} from "lucide-react";

// --- MQTT Topics ---
const RTC_COMMAND_TOPIC = "system/time/command";
const RTC_RESPONSE_TOPIC = "system/time/response";

export function RtcSyncTab() {
  const { isReady, publish, subscribe, unsubscribe, connectionStatus } =
    useMqtt();
  const [systemTime, setSystemTime] = useState<string | null>(null);
  const [rtcTime, setRtcTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- MQTT Event Handling ---
  useEffect(() => {
    if (!isReady) return;

    const handleMessage = (topic: string, payload: string) => {
      if (topic === RTC_RESPONSE_TOPIC) {
        setIsLoading(false);
        try {
          const response = JSON.parse(payload);
          if (response.result === "success") {
            toast.success(response.message);
            if (response.data.systemTime) {
              setSystemTime(response.data.systemTime);
            }
            if (response.data.rtcTime) {
              setRtcTime(response.data.rtcTime);
            }
          } else {
            toast.error(response.message || "An unknown error occurred.");
          }
        } catch (e) {
          toast.error("Failed to parse RTC response from backend.");
          console.error("Failed to parse MQTT response:", e);
        }
      }
    };

    subscribe(RTC_RESPONSE_TOPIC, handleMessage);

    // Fetch initial times on component mount
    handleGetTimes();

    return () => {
      unsubscribe(RTC_RESPONSE_TOPIC, handleMessage);
    };
  }, [isReady, subscribe, unsubscribe]);

  const publishCommand = (payload: object) => {
    if (!isReady) {
      toast.error("MQTT client not connected.");
      return;
    }
    setIsLoading(true);
    publish(RTC_COMMAND_TOPIC, JSON.stringify(payload));
  };

  const handleGetTimes = () => {
    publishCommand({ command: "get_times" });
  };

  const handleSyncSysToRtc = () => {
    publishCommand({ command: "sync_sys_to_rtc" });
  };

  const handleSyncRtcToSys = () => {
    publishCommand({ command: "sync_rtc_to_sys" });
  };

  const handleSyncBrowserToRtc = () => {
    // Format to 'YYYY-MM-DD HH:MM:SS'
    const now = new Date();
    const isoString = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000,
    ).toISOString();
    const formattedDate = isoString.slice(0, 19).replace("T", " ");

    publishCommand({ command: "set_manual_time", datetime: formattedDate });
  };

  const handleSetManualTime = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both date and time.");
      return;
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);

    // Format to 'YYYY-MM-DD HH:MM:SS'
    const formattedDate = format(dateTime, "yyyy-MM-dd HH:mm:ss");

    publishCommand({ command: "set_manual_time", datetime: formattedDate });
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              RTC Time Synchronization
            </h2>
            <p className="text-sm text-muted-foreground">
              Synchronize system time with hardware RTC module
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
              <Clock className="h-4 w-4 text-cyan-600" />
            </div>
            Current Time Status
          </CardTitle>
          <CardDescription className="text-sm">
            Real-time status of system and RTC time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                System Time (RPi)
              </Label>
              <div className="text-lg font-mono font-medium">
                {systemTime
                  ? new Date(systemTime).toLocaleString()
                  : "Loading..."}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Server className="h-4 w-4" />
                Hardware Clock Time (RTC)
              </Label>
              <div className="text-lg font-mono font-medium">
                {rtcTime ? new Date(rtcTime).toLocaleString() : "Not available"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Synchronization Actions Card */}
      <Card className="border-l-4 border-l-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            Synchronization Actions
          </CardTitle>
          <CardDescription className="text-sm">
            Synchronize time between the system, RTC, and other sources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={handleSyncSysToRtc}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="h-12 text-base font-medium"
            >
              <Send className="mr-3 h-5 w-5" />
              Sync System to RTC
            </Button>
            <Button
              onClick={handleSyncRtcToSys}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="h-12 text-base font-medium"
            >
              <Save className="mr-3 h-5 w-5" />
              Sync RTC to System
            </Button>
            <Button
              onClick={handleSyncBrowserToRtc}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="h-12 text-base font-medium"
            >
              <Laptop className="mr-3 h-5 w-5" />
              Sync Browser to RTC
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Time Setting Card */}
      <Card className="border-l-4 border-l-green-500/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <CalendarIcon className="h-4 w-4 text-green-600" />
            </div>
            Manual Time Setting
          </CardTitle>
          <CardDescription className="text-sm">
            Set the hardware clock (RTC) to a specific date and time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal h-10 ${
                      !selectedDate && "text-muted-foreground"
                    }`}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-input" className="text-sm font-medium">
                Time
              </Label>
              <Input
                id="time-input"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={isLoading}
                className="h-10"
              />
            </div>
          </div>

          {/* Apply Settings Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSetManualTime}
              disabled={isLoading}
              size="lg"
              className="flex-1 h-12 text-base font-medium"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 mr-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Setting Time...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-3 h-5 w-5" />
                  Set Manual Time to RTC
                </>
              )}
            </Button>
          </div>

          {/* Technical Information */}
          <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-700">
                  How RTC Synchronization Works
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    • <strong>System Time:</strong> Current Raspberry Pi system
                    time from the OS
                  </p>
                  <p>
                    • <strong>RTC Time:</strong> Hardware real-time clock module
                    time
                  </p>
                  <p>
                    • <strong>Sync System to RTC:</strong> Copies system time to
                    RTC module
                  </p>
                  <p>
                    • <strong>Sync RTC to System:</strong> Sets system time from
                    RTC module
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
                  Time synchronization requires an active MQTT connection to the
                  backend.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
