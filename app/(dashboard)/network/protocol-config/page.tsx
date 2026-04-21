// File: app/(dashboard)/network/protocol-config/page.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import { showToast } from "@/lib/toast-utils";
import SectionConfigComponent from "./SectionConfigComponent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  AlertCircle,
  Activity,
  WifiOff,
  RefreshCw,
  Server,
  Database,
} from "lucide-react";

// =================================================================
// --- Main Content Component ---
// =================================================================
function ProtocolConfigContent() {
  const { isReady, publish } = useMqtt();

  // Protocol configuration state
  const [protocolStats, setProtocolStats] = useState({
    totalParameters: 0,
    configuredSections: 0,
    activeProtocols: 5, // Modbus, BACnet, GOOSE, PROFINET, Protocol_OUT
    mqttConnected: false,
  });

  // Update MQTT connection status
  useEffect(() => {
    setProtocolStats(prev => ({
      ...prev,
      mqttConnected: isReady
    }));
  }, [isReady]);

  // Handle refresh all configurations
  const handleRefreshConfig = useCallback(() => {
    if (!isReady) {
      showToast.error("MQTT not connected", "Please wait for connection before refreshing.");
      return;
    }

    showToast.info("Refreshing protocol configuration...");

    // Publish refresh commands for all protocols
    const protocols = ['modbus_tcp', 'bacnet', 'goose', 'profinet', 'protocolout'];
    protocols.forEach(protocol => {
      publish("IOT/Containment/config/request", JSON.stringify({
        action: "get",
        protocol: protocol
      }));
    });
  }, [isReady, publish]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Protocol Configuration</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage protocol sections and parameters for Modbus, BACnet, GOOSE & PROFINET</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshConfig}
            disabled={!isReady}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${!isReady ? '' : 'animate-spin-slow'}`} />
            Refresh All
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Active Protocols</p>
                <p className="text-2xl font-bold text-blue-600">{protocolStats.activeProtocols}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">MQTT Status</p>
                <p className={`text-2xl font-bold ${isReady ? 'text-green-600' : 'text-red-600'}`}>
                  {isReady ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${isReady ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                {isReady ? (
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Configured Sections</p>
                <p className="text-2xl font-bold text-orange-600">{protocolStats.configuredSections}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <Settings className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning Alert */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
      >
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Protocol Configuration Management
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Changes to protocol settings may affect industrial communication. Ensure proper configuration before deployment.
          </p>
        </div>
      </motion.div>

      {/* Main Configuration Content */}
      <div className="rounded-2xl bg-background/50 shadow-xl border border-border overflow-hidden backdrop-blur-sm p-6">
        <SectionConfigComponent />
      </div>

      {/* Footer Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <Card className="border-0 shadow-md bg-background/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Protocols</p>
                <p className="text-lg font-bold text-foreground mt-1">5 Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-background/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parameters</p>
                <p className="text-lg font-bold text-foreground mt-1">{protocolStats.totalParameters}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-background/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sections</p>
                <p className="text-lg font-bold text-foreground mt-1">{protocolStats.configuredSections}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// =================================================================
// --- Root Page Component ---
// =================================================================
export default function ProtocolConfigPage() {
  return (
    <MqttProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ProtocolConfigContent />
      </div>
    </MqttProvider>
  );
}
