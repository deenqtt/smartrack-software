"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Monitor,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Clock,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Dashboard {
  id: string;
  name: string;
}

interface Props {
  config: {
    customName: string;
    dashboardIds: string[]; // Array of dashboard IDs to cycle through
    intervalSeconds: number; // Time per dashboard in seconds
    isLooping: boolean; // Whether to loop continuously or stop after one cycle
    isAutoStart: boolean; // Whether to start automatically
  };
  isEditMode?: boolean;
}

export const DashboardAutoSwitcherWidget = ({ config, isEditMode = false }: Props) => {
  const router = useRouter();
  const params = useParams();
  const currentDashboardId = params.id as string;

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isPlaying, setIsPlaying] = useState(config.isAutoStart);

  const [currentIndex, setCurrentIndexState] = useState(0);
  const currentIndexRef = useRef(0);
  const setCurrentIndex = (index: number) => {
    setCurrentIndexState(index);
    currentIndexRef.current = index;
  };

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [timeLeft, setTimeLeft] = useState(config.intervalSeconds);
  const [isLoading, setIsLoading] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available dashboards
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboards`);
        if (!response.ok) throw new Error("Failed to fetch dashboards");
        const data = await response.json();
        setDashboards(data);

        // Find current dashboard index in the configured list
        if (config.dashboardIds.length > 0) {
          const currentIndexInConfig = config.dashboardIds.indexOf(currentDashboardId);
          if (currentIndexInConfig >= 0) {
            setCurrentIndex(currentIndexInConfig);
          } else {
            // Not in config (e.g. root dashboard without ID in URL)
            // Start at -1 so the very first auto-switch jumps to the 0th config dashboard.
            setCurrentIndex(-1);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboards:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboards();
  }, [config.dashboardIds, currentDashboardId]);

  // Auto-switch timer
  useEffect(() => {
    if (!isPlaying || config.dashboardIds.length === 0 || isEditMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startTimer = () => {
      setTimeLeft(config.intervalSeconds);

      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up, switch to next dashboard
            switchToNextDashboardInternal();
            const currentConfigObj = configRef.current;
            return currentConfigObj.intervalSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    };

    startTimer();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isEditMode]); // We use refs for other deps to prevent stale closures

  const handleSafelyNavigate = (targetDashboardId: string) => {
    if (isEditMode) return;
    router.push(`/view-dashboard/${targetDashboardId}`);
  };

  const switchToNextDashboardInternal = () => {
    const currentConfig = configRef.current;
    if (currentConfig.dashboardIds.length === 0 || isEditMode) return;

    let nextIndex = currentIndexRef.current + 1;

    // Check if we've reached the end
    if (nextIndex >= currentConfig.dashboardIds.length) {
      if (currentConfig.isLooping) {
        nextIndex = 0; // Loop back to start
      } else {
        // Stop auto-switching
        setIsPlaying(false);
        return;
      }
    }

    setCurrentIndex(nextIndex);
    const nextDashboardId = currentConfig.dashboardIds[nextIndex];
    handleSafelyNavigate(nextDashboardId);
  };

  const switchToNextDashboard = () => {
    switchToNextDashboardInternal();
    setTimeLeft(config.intervalSeconds); // Reset timer on manual action
  };

  const switchToPreviousDashboard = () => {
    const currentConfig = configRef.current;
    if (currentConfig.dashboardIds.length === 0 || isEditMode) return;

    let prevIndex = currentIndexRef.current - 1;
    if (prevIndex < 0) {
      prevIndex = currentConfig.dashboardIds.length - 1;
    }

    setCurrentIndex(prevIndex);
    const prevDashboardId = currentConfig.dashboardIds[prevIndex];
    handleSafelyNavigate(prevDashboardId);
    setTimeLeft(config.intervalSeconds); // Reset timer
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetTimer = () => {
    setTimeLeft(config.intervalSeconds);
  };

  const getCurrentDashboard = () => {
    const dashboardId = config.dashboardIds[currentIndex];
    return dashboards.find(d => d.id === dashboardId);
  };

  const getNextDashboard = () => {
    if (config.dashboardIds.length === 0) return null;
    let nextIndex = currentIndex + 1;
    if (nextIndex >= config.dashboardIds.length) {
      nextIndex = config.isLooping ? 0 : currentIndex;
    }
    const nextDashboardId = config.dashboardIds[nextIndex];
    return dashboards.find(d => d.id === nextDashboardId);
  };

  const progressPercentage = config.intervalSeconds > 0
    ? ((config.intervalSeconds - timeLeft) / config.intervalSeconds) * 100
    : 0;

  const currentDashboard = getCurrentDashboard();
  const nextDashboard = getNextDashboard();

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (config.dashboardIds.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
        <Settings className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No dashboards configured for auto-switching
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-600/80">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">
            {config.customName}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlayPause}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isEditMode}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>

          {/* Reset Timer */}
          <Button
            onClick={resetTimer}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isEditMode || !isPlaying}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Current Dashboard Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Current Dashboard
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {currentIndex + 1} of {config.dashboardIds.length}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {currentDashboard?.name || "Unknown Dashboard"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEditMode ? "Paused (Edit Mode)" : (isPlaying ? "Auto-switching active" : "Auto-switching paused")}
                </p>
              </div>

              {!isEditMode && isPlaying && (
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                    <Clock className="w-4 h-4" />
                    {timeLeft}s
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {!isEditMode && isPlaying && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Time until next switch</span>
              <span>{timeLeft}s remaining</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Next Dashboard Preview */}
        {nextDashboard && (isPlaying || (!isPlaying && !config.isLooping && currentIndex < config.dashboardIds.length - 1)) && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Next Dashboard
            </span>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {nextDashboard.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {config.isLooping && currentIndex === config.dashboardIds.length - 1
                      ? "Looping back to start"
                      : "Next in sequence"}
                  </p>
                </div>

                <Button
                  onClick={switchToNextDashboard}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={isEditMode}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Summary */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Configuration
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border">
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {config.intervalSeconds}s
              </div>
              <div className="text-slate-500 dark:text-slate-400">Interval</div>
            </div>

            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border">
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {config.isLooping ? "Loop" : "Once"}
              </div>
              <div className="text-slate-500 dark:text-slate-400">Mode</div>
            </div>
          </div>
        </div>

        {/* Manual Controls */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={switchToPreviousDashboard}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={config.dashboardIds.length <= 1 || isEditMode}
          >
            Previous
          </Button>

          <Button
            onClick={switchToNextDashboard}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={config.dashboardIds.length <= 1 || isEditMode}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};