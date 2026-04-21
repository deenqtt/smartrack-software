"use client";

import { useState } from "react";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HardDrive, Network, Cpu } from "lucide-react";
import DeviceManagerPage from "./modbus/page";
import DeviceManagerPageModular from "./modular/page";

export default function DeviceInternalPage() {
  const { canView } = useMenuItemPermissions("devices-internal");
  const { loading: menuLoading } = useMenu();
  const [selectedTab, setSelectedTab] = useState("modbus");

  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view internal devices. Please contact your administrator if you believe this is an error."
        showActions={true}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex-shrink-0">
          <HardDrive className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Internal Devices</h1>
            Manage and monitor Modbus and Modular I2C devices
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="h-10 p-1">
          <TabsTrigger value="modbus" className="flex items-center gap-2 px-4">
            <span>Modbus</span>
          </TabsTrigger>
          <TabsTrigger value="modular" className="flex items-center gap-2 px-4">
            <span>Modular</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="modbus"
          className="mt-4 focus-visible:outline-none focus-visible:ring-0"
        >
          <DeviceManagerPage />
        </TabsContent>

        <TabsContent
          value="modular"
          className="mt-4 focus-visible:outline-none focus-visible:ring-0"
        >
          <DeviceManagerPageModular />
        </TabsContent>
      </Tabs>
    </div>
  );
}
