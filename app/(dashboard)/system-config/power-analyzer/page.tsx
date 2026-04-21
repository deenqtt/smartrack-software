"use client";

import { MqttProvider } from "@/contexts/MqttContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import {
  Zap,
  Calculator,
  TrendingUp,
  RefreshCw,
  BarChart3,
  DollarSign,
  Activity,
  Settings
} from "lucide-react";

// --- Impor komponen-komponen tab yang sudah dipisah ---
import { BillCalculationTab } from "@/components/power-analyzer/BillCalculationTab";
import { PueTab } from "@/components/power-analyzer/PueTab";
import { PowerAnalyzerTab } from "@/components/power-analyzer/PowerAnalyzerTab";

function PowerAnalyzerPageContent() {
  // RBAC Permission Checks - Get permissions for power-analyzer menu
  const { canView } = useMenuItemPermissions('power-analyzer');
  const { loading: menuLoading } = useMenu();

  // Show loading while checking permissions
  if (menuLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  // Check if user has permission to view this page
  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Power Analyzer</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Monitor and analyze power consumption and efficiency metrics</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Zap className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Power Analysis</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calculator className="h-6 w-6 text-emerald-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Bill Calculation</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">PUE Monitoring</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Real-time Data</p>
                <p className="text-2xl font-bold">Live</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="bill-calculation" className="w-full">
            <div className="border-b px-6 pt-6">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger value="bill-calculation" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Bill Calculation
                </TabsTrigger>
                <TabsTrigger value="pue" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  PUE
                </TabsTrigger>
                <TabsTrigger value="power-analyzer" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Power Analyzer
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="bill-calculation" className="mt-0">
                <BillCalculationTab />
              </TabsContent>
              <TabsContent value="pue" className="mt-0">
                <PueTab />
              </TabsContent>
              <TabsContent value="power-analyzer" className="mt-0">
                <PowerAnalyzerTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PowerAnalyzerPage() {
  return (
    <MqttProvider>
      <PowerAnalyzerPageContent />
    </MqttProvider>
  );
}
