"use client"

import { Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { showToast } from "@/lib/toast-utils";
import MenuManagement from "@/components/manage-menu/menu-management";
import { RolePreviewCard } from "@/components/manage-menu/role-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Users, FolderOpen, Menu, Shield, RefreshCw, RotateCcw, Upload, Download, Loader2 } from "lucide-react";
import ImportDialog from "@/components/ImportDialog";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/loading-page";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";

export default function ManageMenuPage() {
  const { canView, canCreate, canUpdate, canDelete } = useMenuItemPermissions('manage-menu');
  const { loading: menuLoading } = useMenu();

  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const handleExport = async () => {
    try {
      showToast.info("Preparing Export", "Generating menu structure export file...");
      const response = await fetch("/api/menu-management/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menu-structure-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success("Export Success", "Menu structure exported successfully");
    } catch (error: any) {
      showToast.error("Export Failed", error.message || "Failed to export menu structure");
    }
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      setShowResetDialog(false);
      const groupsResponse = await fetch("/api/menu-groups");
      const groupsResult = await groupsResponse.json();
      if (!groupsResult.success) { showToast.error("Error", "Failed to fetch menu groups"); return; }

      const itemsResponse = await fetch("/api/menu-items");
      const itemsResult = await itemsResponse.json();
      if (!itemsResult.success) { showToast.error("Error", "Failed to fetch menu items"); return; }

      const inactiveGroups = groupsResult.data.filter((group: any) => !group.isActive);
      const inactiveItems = itemsResult.data.filter((item: any) => !item.isActive);

      showToast.info("Processing", `Activating ${inactiveGroups.length} groups and ${inactiveItems.length} items...`);

      const groupPromises = inactiveGroups.map(async (group: any) => {
        const response = await fetch(`/api/menu-groups/${group.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({ name: group.name, label: group.label, icon: group.icon, order: group.order, isActive: true, isDeveloper: group.isDeveloper }),
        });
        if (!response.ok) throw new Error(`Failed to activate group ${group.label}`);
        return response.json();
      });

      const itemPromises = inactiveItems.map(async (item: any) => {
        const response = await fetch(`/api/menu-items/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({ menuGroupId: item.menuGroupId, name: item.name, label: item.label, path: item.path, icon: item.icon, component: item.component, order: item.order, isActive: true, isDeveloper: item.isDeveloper }),
        });
        if (!response.ok) throw new Error(`Failed to activate item ${item.label}`);
        return response.json();
      });

      await Promise.allSettled([...groupPromises, ...itemPromises]);
      showToast.success("Success", `Activated all settings (${inactiveGroups.length} groups, ${inactiveItems.length} items)`);
      handleRefresh();
    } catch (error) {
      showToast.error("Error", "Failed to reset menu settings");
    } finally {
      setIsResetting(false);
    }
  };

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
    <TooltipProvider>
      <div className="space-y-6 p-6">

        {/* ── Section Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
              <Menu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
                Menu <span className="text-primary">Management</span>
              </h1>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Sidebar structure, access control & role permissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            {canDelete && (
              <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="rounded-xl" disabled={isResetting}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {isResetting ? "Resetting..." : "Reset All"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Reset Menu Settings</DialogTitle>
                    <DialogDescription>
                      This will activate all inactive menu groups and items, restoring full sidebar visibility. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleResetAll} disabled={isResetting}>
                      {isResetting ? "Resetting..." : "Confirm Reset"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Users className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Total Roles</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-foreground">3</div>
              <p className="text-[10px] font-bold text-primary uppercase mt-2">System roles</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <FolderOpen className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Menu Groups</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-foreground">11</div>
              <p className="text-[10px] font-bold text-primary uppercase mt-2">Active groups</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Menu className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Menu Items</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-foreground">70+</div>
              <p className="text-[10px] font-bold text-primary uppercase mt-2">Total items</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Shield className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Permissions</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-foreground">210+</div>
              <p className="text-[10px] font-bold text-primary uppercase mt-2">Role assignments</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Tabs ── */}
        <Card className="rounded-[32px] border-border/50 shadow-sm">
          <CardContent className="p-6">
            <Tabs defaultValue="management" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-2xl mb-6">
                <TabsTrigger value="management" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-xs tracking-widest">
                  Menu Management
                </TabsTrigger>
                <TabsTrigger value="preview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-xs tracking-widest">
                  Role Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="management" className="mt-0">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-64">
                      <LoadingPage variant="minimal" message="Loading menu management..." />
                    </div>
                  }
                  key={refreshKey}
                >
                  <MenuManagement />
                </Suspense>
              </TabsContent>

              <TabsContent value="preview" className="mt-0 space-y-6">
                {user && <RolePreviewCard userRole={user.role} key={refreshKey} />}

                <Card className="rounded-[24px] border-border/50">
                  <CardHeader className="px-6 pt-6 pb-3">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Menu className="h-4 w-4" />
                      Menu Structure Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      <div className="space-y-2">
                        <h4 className="font-black text-xs uppercase tracking-widest text-green-600 dark:text-green-400">Available Menus</h4>
                        <ul className="space-y-1 text-muted-foreground text-xs">
                          <li>• Dashboard items</li>
                          <li>• Control features</li>
                          <li>• Device management</li>
                          <li>• Network settings</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-black text-xs uppercase tracking-widest text-orange-500">Restricted Items</h4>
                        <ul className="space-y-1 text-muted-foreground text-xs">
                          <li>• Developer tools</li>
                          <li>• Advanced configs</li>
                          <li>• System settings</li>
                          <li>• Admin privileges</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-black text-xs uppercase tracking-widest text-primary">Role Types</h4>
                        <ul className="space-y-1 text-muted-foreground text-xs">
                          <li>• <span className="font-bold text-foreground">ADMIN</span> — Full access</li>
                          <li>• <span className="font-bold text-foreground">USER</span> — Basic features</li>
                          <li>• <span className="font-bold text-foreground">DEVELOPER</span> — Dev tools</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Import Dialog */}
        <ImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImportSuccess={() => handleRefresh()}
          title="Import Menu Structure"
          endpoint="/api/menu-management/import"
          typeLabel="Menu Structure"
        />
      </div>
    </TooltipProvider>
  );
}
