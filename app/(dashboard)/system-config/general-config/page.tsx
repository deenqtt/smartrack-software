"use client";

import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RtcSyncTab } from "@/components/system-settings/rtc-sync-tab";
import { SystemMonitoringTab } from "@/components/system-settings/system-monitoring-tab";
import { ScreenSettingsTab } from "@/components/system-settings/screen-settings-tab";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { Loader2 } from "lucide-react";

export default function SystemSettingsPage() {
  const { canView } = useMenuItemPermissions('system-general-config');
  const { loading: menuLoading } = useMenu();

  if (menuLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!canView) return <AccessDenied />;

  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Enhanced Tabs */}
        <Tabs defaultValue="rtc-sync" className="flex-1">
          <div className="mb-6">
            <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/50">
              <TabsTrigger
                value="rtc-sync"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                RTC Sync
              </TabsTrigger>
              <TabsTrigger
                value="screen"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Screen Settings
              </TabsTrigger>
              <TabsTrigger
                value="monitoring"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                System Monitoring
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="rtc-sync" className="mt-0">
              <RtcSyncTab />
            </TabsContent>
            <TabsContent value="screen" className="mt-0">
              <ScreenSettingsTab />
            </TabsContent>
            <TabsContent value="monitoring" className="mt-0">
              <SystemMonitoringTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </SidebarInset>
  );
}
