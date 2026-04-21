"use client";

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Settings, 
  Box, 
  CheckCircle2, 
  AlertCircle,
  Save,
  RotateCcw,
  Smartphone,
  Monitor,
  Layout,
  Eye,
  EyeOff,
  Info,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Layers,
  Search,
  Check,
  ChevronRight,
  ArrowRightLeft,
  Maximize2,
  Minus,
  Plus as PlusIcon,
  List,
  Lock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { widgets } from "@/lib/widget-data";
import { getWidgetCategory, DashboardCategory } from "@/lib/dashboard-utils";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";

import { WidgetConfigSelector } from "@/components/widgets/WidgetConfigSelector";
import { Responsive, WidthProvider } from "react-grid-layout";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Rack {
  id: string;
  name: string;
  rackType: "MAIN" | "NORMAL";
  location: string | null;
}

interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  widgetType: string;
  config: any;
}

interface DashboardData {
  id: string;
  name: string;
  layout: WidgetLayout[];
}

const DASHBOARD_CATEGORIES: DashboardCategory[] = [
  "Overview", "Security", "Analytic", "Power", "UPS", "Cooling", "Environment"
];

export default function DashboardSettingsPage() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Tab Management
  const [activeEditorTab, setActiveEditorTab] = useState<DashboardCategory>("Overview");
  const [viewMode, setViewMode] = useState<"list" | "visual">("list");

  // Widget Library Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWidgetToAdd, setSelectedWidgetToAdd] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Widget Configuration State
  const [editingWidget, setEditingWidget] = useState<WidgetLayout | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [racksRes, dashRes] = await Promise.all([
        fetch("/api/racks"),
        fetch("/api/dashboards/active")
      ]);

      if (racksRes.ok) {
        const data = await racksRes.json();
        setRacks(data.racks || []);
      }

      if (dashRes.ok) {
        const data = await dashRes.json();
        let layout = data.layout;
        if (typeof layout === "string") {
          try {
            layout = JSON.parse(layout);
          } catch (e) {
            layout = [];
          }
        }
        setDashboardData({
          id: data.id,
          name: data.name,
          layout: Array.isArray(layout) ? layout : []
        });
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleSetMainRack = async (rackId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/racks/${rackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rackType: "MAIN" }),
      });

      if (res.ok) {
        toast.success("Main rack updated successfully");
        fetchInitialData();
      } else {
        toast.error("Failed to update main rack");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const removeWidget = (id: string) => {
    if (!dashboardData) return;
    setDashboardData({
      ...dashboardData,
      layout: dashboardData.layout.filter(w => w.i !== id)
    });
    toast.info("Widget removed from draft");
  };

  const addWidget = () => {
    if (!dashboardData || !selectedWidgetToAdd) return;
    
    // Attempt to find a default rack (Main rack first, then first available)
    const defaultRack = racks.find(r => r.rackType === "MAIN") || racks[0];

    // Auto-assign the active tab as the category
    const newWidget: WidgetLayout = {
      i: `${selectedWidgetToAdd.name.replace(/\s+/g, "-")}-${Date.now()}`,
      x: 0,
      y: Infinity,
      w: selectedWidgetToAdd.name === "Server Rack 3D" ? 6 : 4,
      h: selectedWidgetToAdd.name === "Server Rack 3D" ? 10 : 4,
      widgetType: selectedWidgetToAdd.name,
      config: {
        widgetTitle: selectedWidgetToAdd.name,
        assignedCategory: activeEditorTab, // Set the current tab as category
        // If it's a rack widget, auto-assign the default rack ID
        rackId: (selectedWidgetToAdd.name.includes("Rack") || selectedWidgetToAdd.name.includes("3D")) 
          ? (defaultRack?.id || "") 
          : undefined
      }
    };

    setDashboardData({
      ...dashboardData,
      layout: [...dashboardData.layout, newWidget]
    });

    setIsAddModalOpen(false);
    setSelectedWidgetToAdd(null);
    toast.success(`${selectedWidgetToAdd.name} added to ${activeEditorTab}${defaultRack ? ` (Linked to ${defaultRack.name})` : ""}`);
  };

  const changeWidgetCategory = (widgetId: string, newCategory: DashboardCategory) => {
    if (!dashboardData) return;
    
    setDashboardData({
      ...dashboardData,
      layout: dashboardData.layout.map(w => {
        if (w.i === widgetId) {
          return {
            ...w,
            config: {
              ...w.config,
              assignedCategory: newCategory
            }
          };
        }
        return w;
      })
    });
    
    toast.success(`Widget moved to ${newCategory}`);
  };

  const updateWidgetSize = (widgetId: string, deltaW: number, deltaH: number) => {
    if (!dashboardData) return;
    
    setDashboardData({
      ...dashboardData,
      layout: dashboardData.layout.map(w => {
        if (w.i === widgetId) {
          const newW = Math.max(1, Math.min(12, (w.w || 1) + deltaW));
          const newH = Math.max(1, Math.min(24, (w.h || 1) + deltaH));
          return { ...w, w: newW, h: newH };
        }
        return w;
      })
    });
  };

  const handleLayoutChange = (currentLayout: any[]) => {
    if (!dashboardData) return;

    setDashboardData({
      ...dashboardData,
      layout: dashboardData.layout.map(w => {
        if (getWidgetCategory(w.widgetType, w.config) === activeEditorTab) {
          const match = currentLayout.find(l => l.i === w.i);
          if (match) {
            return { ...w, x: match.x, y: match.y, w: match.w, h: match.h };
          }
        }
        return w;
      })
    });
  };

  const handleEditConfig = (widget: WidgetLayout) => {
    setEditingWidget(widget);
    setIsConfigModalOpen(true);
  };

  const handleSaveWidgetConfig = async (newConfig: any) => {
    if (!editingWidget || !dashboardData) return;

    const newLayout = dashboardData.layout.map(w => {
      if (w.i === editingWidget.i) {
        return {
          ...w,
          config: {
            ...w.config,
            ...newConfig,
          },
        };
      }
      return w;
    });

    setDashboardData({ ...dashboardData, layout: newLayout });
    setEditingWidget(null);
    setIsConfigModalOpen(false);

    try {
      const res = await fetch(`/api/dashboards/${dashboardData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: newLayout }),
      });
      if (res.ok) {
        toast.success(`${editingWidget.widgetType} configuration saved`);
      } else {
        toast.error("Failed to save widget configuration");
      }
    } catch {
      toast.error("Failed to save widget configuration");
    }
  };

  const saveLayout = async () => {
    if (!dashboardData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: dashboardData.layout
        }),
      });

      if (res.ok) {
        toast.success("Dashboard layout saved successfully");
      } else {
        toast.error("Failed to save layout");
      }
    } catch (err) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const filteredLibrary = widgets.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWidgetsForActiveTab = (): WidgetLayout[] => {
    if (!dashboardData) return [];
    return dashboardData.layout.filter(w => {
      const category = getWidgetCategory(w.widgetType, w.config);
      return category === activeEditorTab;
    });
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 w-full max-w-[1920px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Management</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage tabs, widgets, and primary monitoring targets.</p>
      </div>

      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-2xl mb-8 self-start">
          <TabsTrigger value="layout" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm font-bold transition-all">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Tab & Widget Editor
          </TabsTrigger>
          <TabsTrigger value="rack" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm font-bold transition-all">
            <Box className="h-4 w-4 mr-2" />
            Rack Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
            
            {/* Sidebar: Tab Selection only */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-6">
                   <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Dashboard Tabs</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="flex flex-col gap-1">
                    {DASHBOARD_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveEditorTab(cat)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold text-sm",
                          activeEditorTab === cat 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none translate-x-1" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {cat}
                        <ChevronRight className={cn("h-4 w-4 transition-transform", activeEditorTab === cat ? "rotate-0" : "-rotate-90 opacity-0")} />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Editor: Per-Tab Widget Management */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-8 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                       <Badge className="bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 border-0 rounded-lg px-2 text-[10px] uppercase font-black tracking-widest">Selected Tab</Badge>
                       <CardTitle className="text-2xl font-black tracking-tight">{activeEditorTab}</CardTitle>
                    </div>
                    <CardDescription>Customizing widgets for the <b>{activeEditorTab}</b> dashboard view.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mr-4">
                      <Button 
                        variant={viewMode === "list" ? "secondary" : "ghost"} 
                        size="sm" 
                        className={cn("rounded-xl font-bold px-4", viewMode === "list" && "bg-white dark:bg-slate-700 shadow-sm")}
                        onClick={() => setViewMode("list")}
                      >
                        <List className="h-4 w-4 mr-2" /> LIST
                      </Button>
                      <Button 
                        variant={viewMode === "visual" ? "secondary" : "ghost"} 
                        size="sm" 
                        className={cn("rounded-xl font-bold px-4", viewMode === "visual" && "bg-white dark:bg-slate-700 shadow-sm")}
                        onClick={() => setViewMode("visual")}
                      >
                        <Maximize2 className="h-4 w-4 mr-2" /> VISUAL
                      </Button>
                    </div>

                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 font-black h-12 shadow-lg shadow-blue-600/20">
                          <Plus className="mr-2 h-5 w-5" /> ADD TO {activeEditorTab.toUpperCase()}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-0 shadow-2xl">
                        <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                          <DialogTitle className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">Widget Library</DialogTitle>
                          <DialogDescription className="font-medium">Selected widget will be added specifically to the <b>{activeEditorTab}</b> tab.</DialogDescription>
                          <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                              placeholder="Search widgets by name or category..." 
                              className="pl-10 rounded-xl bg-white dark:bg-black border-slate-200 dark:border-slate-800 h-11"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] p-4">
                          <div className="grid grid-cols-2 gap-3 p-2">
                            {filteredLibrary.map((widget) => (
                              <div 
                                key={widget.name}
                                onClick={() => setSelectedWidgetToAdd(widget)}
                                className={cn(
                                  "p-4 rounded-3xl border-2 transition-all cursor-pointer flex flex-col gap-2 group",
                                  selectedWidgetToAdd?.name === widget.name 
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                                    : "border-transparent bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                    selectedWidgetToAdd?.name === widget.name ? "bg-blue-500 text-white" : "bg-white dark:bg-slate-700 text-slate-500"
                                  )}>
                                    <Box className="h-5 w-5" />
                                  </div>
                                  {selectedWidgetToAdd?.name === widget.name && <Check className="h-5 w-5 text-blue-500" />}
                                </div>
                                <div className="mt-1">
                                  <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{widget.name}</div>
                                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{widget.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 gap-3">
                          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl font-bold">CANCEL</Button>
                          <Button 
                            disabled={!selectedWidgetToAdd} 
                            onClick={addWidget}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-black"
                          >
                            CONFIRM ADD
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-slate-50/30 dark:bg-black/20 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-black tracking-widest text-slate-400 uppercase">
                    <span className="pl-12">Assigned Widgets in "{activeEditorTab}"</span>
                    <span className="pr-12">Actions</span>
                  </div>
                  {viewMode === "list" ? (
                    <ScrollArea className="h-[450px]">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      <AnimatePresence initial={false}>
                        {getWidgetsForActiveTab().map((item) => (
                          <motion.div 
                            key={item.i}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="p-6 flex items-center justify-between hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group"
                          >
                            <div className="flex items-center gap-6">
                              <div className="text-slate-300 group-hover:text-blue-400 transition-colors">
                                <GripVertical className="h-5 w-5" />
                              </div>
                              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shadow-sm">
                                <Monitor className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{item.widgetType}</div>
                                <div className="text-[10px] font-mono text-slate-400">{item.i}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1 gap-2 mr-2">
                                 <div className="flex flex-col items-center">
                                   <span className="text-[8px] font-black text-slate-400 uppercase">Width</span>
                                   <div className="flex items-center gap-1">
                                      <button onClick={() => updateWidgetSize(item.i, -1, 0)} className="h-5 w-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"><Minus className="h-3 w-3" /></button>
                                      <span className="text-xs font-black min-w-[20px] text-center">{item.w}</span>
                                      <button onClick={() => updateWidgetSize(item.i, 1, 0)} className="h-5 w-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"><PlusIcon className="h-3 w-3" /></button>
                                   </div>
                                 </div>
                                 <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                                 <div className="flex flex-col items-center">
                                   <span className="text-[8px] font-black text-slate-400 uppercase">Height</span>
                                   <div className="flex items-center gap-1">
                                      <button onClick={() => updateWidgetSize(item.i, 0, -1)} className="h-5 w-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"><Minus className="h-3 w-3" /></button>
                                      <span className="text-xs font-black min-w-[20px] text-center">{item.h}</span>
                                      <button onClick={() => updateWidgetSize(item.i, 0, 1)} className="h-5 w-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"><PlusIcon className="h-3 w-3" /></button>
                                   </div>
                                 </div>
                               </div>

                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50">
                                     <ArrowRightLeft className="h-4 w-4" />
                                   </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-0 shadow-2xl">
                                   <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-slate-400">Move to Tab</DropdownMenuLabel>
                                   <DropdownMenuSeparator />
                                   {DASHBOARD_CATEGORIES.filter(c => c !== activeEditorTab).map(cat => (
                                     <DropdownMenuItem 
                                       key={cat} 
                                       className="rounded-xl font-bold p-3 cursor-pointer"
                                       onClick={() => changeWidgetCategory(item.i, cat)}
                                     >
                                       {cat}
                                     </DropdownMenuItem>
                                   ))}
                                 </DropdownMenuContent>
                               </DropdownMenu>

                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                                 onClick={() => handleEditConfig(item)}
                               >
                                 <Edit className="h-4 w-4" />
                               </Button>
                               
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                 onClick={() => removeWidget(item.i)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {getWidgetsForActiveTab().length === 0 && (
                        <div className="p-24 text-center">
                          <AlertCircle className="h-12 w-12 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold mb-1 italic">Tab "{activeEditorTab}" is currently empty.</p>
                          <p className="text-[11px] text-slate-300 max-w-[200px] mx-auto leading-relaxed">Add widgets from the library or move widgets from other tabs.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    {/* Info bar: visual mode uses same config as real dashboard */}
                    <div className="flex items-center justify-between px-6 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50">
                      <div className="flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        <Eye className="h-3.5 w-3.5" />
                        Visual preview — matches actual dashboard layout (12 cols · 40px row height · 12px gap)
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Drag & resize to reposition widgets</span>
                    </div>
                    <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-auto" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 320px)' }}>
                     {/* Use IDENTICAL grid config as DashboardLayout.tsx */}
                     <ResponsiveGridLayout
                       className="layout"
                       layouts={{ lg: getWidgetsForActiveTab() }}
                       breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                       cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
                       rowHeight={40}
                       margin={[12, 12]}
                       isDraggable={true}
                       isResizable={true}
                       onLayoutChange={handleLayoutChange}
                     >
                       {getWidgetsForActiveTab().map((item) => {
                         const isHardcoded = item.i.startsWith("hardcoded-");
                         return (
                           <div 
                             key={item.i} 
                             className={cn(
                               "group relative rounded-lg border shadow-sm flex flex-col overflow-hidden",
                               isHardcoded 
                                 ? "bg-slate-50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 opacity-80" 
                                 : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800"
                             )}
                           >
                             {/* Widget label - top left */}
                             <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                               <div className={cn(
                                 "h-5 w-5 rounded-lg flex items-center justify-center text-white scale-75",
                                 isHardcoded ? "bg-slate-400" : "bg-blue-600"
                               )}>
                                 {isHardcoded ? <Lock className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                               </div>
                               <span className="text-[9px] font-black uppercase text-slate-900 dark:text-white bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm shadow-sm">
                                 {isHardcoded ? "System Default" : item.widgetType}
                               </span>
                             </div>
                             
                             {/* Widget content */}
                             <div className="flex-1 w-full h-full relative overflow-hidden">
                               {isHardcoded ? (
                                 <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                                    <Lock className="h-4 w-4 mb-2 text-slate-400" />
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center px-4 leading-tight">SYSTEM COMPONENT</div>
                                 </div>
                               ) : (
                                 <WidgetRenderer item={item} />
                               )}
                               
                               {/* Size badge - top right, show on hover */}
                               <div className="absolute top-2 right-2 bg-blue-600 px-1.5 py-0.5 rounded-md shadow-lg z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                 <div className="text-[9px] font-mono font-black text-white uppercase tracking-tighter">
                                   w{item.w} × h{item.h}
                                 </div>
                               </div>
                             </div>

                             {/* Action buttons - bottom right, show on hover */}
                             {!isHardcoded && (
                               <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleEditConfig(item); }}
                                   className="h-7 w-7 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:text-blue-500 transition-colors"
                                 >
                                   <Edit className="h-3.5 w-3.5" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); removeWidget(item.i); }}
                                   className="h-7 w-7 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:text-red-500 transition-colors"
                                 >
                                   <Trash2 className="h-3.5 w-3.5" />
                                 </button>
                               </div>
                             )}

                             {/* Subtle dot grid overlay */}
                             <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                               <div className="h-full w-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:10px_10px]" />
                             </div>
                           </div>
                         );
                       })}
                     </ResponsiveGridLayout>
                    </div>
                  </div>
                )}
                  <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                     <Button variant="ghost" className="rounded-xl font-bold px-6" onClick={() => fetchInitialData()}>RESTORE</Button>
                     <Button 
                       className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl px-12 font-black h-12 shadow-xl hover:scale-105 transition-transform"
                       onClick={saveLayout}
                       disabled={saving}
                     >
                       {saving ? "SYNCING..." : "SAVE ALL DASHBOARD TABS"}
                     </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rack" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-6">
                <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] text-white shadow-2xl flex flex-col gap-6 overflow-hidden relative">
                   <Box className="absolute -bottom-6 -right-6 h-32 w-32 opacity-10 rotate-12" />
                   <h3 className="text-2xl font-black leading-tight tracking-tighter">Primary Monitoring Target</h3>
                   <p className="text-blue-100 text-sm leading-relaxed font-medium">Assign a rack as MAIN to enable direct 2D/3D monitoring in the primary dashboard slots.</p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-8">
                    <CardTitle className="text-xl font-black tracking-tight">Registered Racks</CardTitle>
                    <CardDescription>Select which smart rack is designated as the MAIN system.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {racks.map((rack) => (
                        <div key={rack.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl transition-all",
                              rack.rackType === "MAIN" 
                                ? "bg-blue-600 text-white" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-300"
                            )}>
                              <LayoutDashboard className="h-7 w-7" />
                            </div>
                            <div>
                                <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight block">{rack.name}</span>
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{rack.location || "Central Data Hub"}</span>
                            </div>
                          </div>
                          
                          <Button 
                            disabled={rack.rackType === "MAIN" || saving}
                            variant={rack.rackType === "MAIN" ? "outline" : "default"}
                            className={cn(
                              "rounded-2xl font-black h-11 px-6",
                              rack.rackType === "MAIN" ? "bg-white dark:bg-slate-900" : "bg-blue-600"
                            )}
                            onClick={() => handleSetMainRack(rack.id)}
                          >
                            {rack.rackType === "MAIN" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : "SET AS MAIN"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
           </div>
        </TabsContent>
      </Tabs>

      {/* Dynamic Widget Configuration Modal */}
      {editingWidget && (
        <WidgetConfigSelector
          isOpen={isConfigModalOpen}
          onClose={() => {
            setIsConfigModalOpen(false);
            setEditingWidget(null);
          }}
          widgetType={editingWidget.widgetType}
          initialConfig={editingWidget.config}
          onSave={handleSaveWidgetConfig}
        />
      )}
    </div>
  );
}
