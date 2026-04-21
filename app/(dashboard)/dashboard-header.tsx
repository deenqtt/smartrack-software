"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePagePrefetch } from "@/components/page-prefetch";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

const RealtimeClockWithRefresh = dynamic(
  () => import("@/components/realtime-clock"),
  {
    loading: () => (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Loading time...</span>
      </div>
    ),
    ssr: false
  }
);

function generateTitleFromPathname(pathname: string): string {
  if (pathname === "/") return "Main Dashboard";

  const routeMap: Record<string, string> = {
    "alarms": "Alarms",
    "analytics": "Analytics",
    "control": "Control Panel",
    "devices": "Devices",
    "dashboard-settings": "Display Settings",
    "info": "Information",
    "maintenance": "Maintenance",
    "manage-menu": "Menu Management",
    "backup-management": "Backup Management",
    "network": "Network",
    "payload": "Payload Data",
    "racks": "Racks",
    "system-config": "System Configuration",
    "monitoring": "Monitoring",
  };

  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  return routeMap[lastSegment] || lastSegment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = generateTitleFromPathname(pathname);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Minimal prefetching - only on explicit actions
  usePagePrefetch();

  // Load zoom level from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedZoom = localStorage.getItem("dashboard-zoom");
      if (savedZoom) {
        const zoom = parseInt(savedZoom, 10);
        setZoomLevel(zoom);
        applyZoom(zoom);
      }
    }
  }, []);

  const applyZoom = (zoom: number) => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      html.style.zoom = `${zoom}%`;
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(200, zoomLevel + 10);
    setZoomLevel(newZoom);
    applyZoom(newZoom);
    if (typeof window !== 'undefined') {
      localStorage.setItem("dashboard-zoom", newZoom.toString());
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(50, zoomLevel - 10);
    setZoomLevel(newZoom);
    applyZoom(newZoom);
    if (typeof window !== 'undefined') {
      localStorage.setItem("dashboard-zoom", newZoom.toString());
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-background/40 backdrop-blur-xl px-4 md:px-6 relative z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="text-muted-foreground hover:text-blue-500 transition-colors" />
        </div>
        <Separator orientation="vertical" className="h-6 bg-border hidden md:block" />
        <div className="flex flex-col">
          <h1 className="text-base font-black text-foreground dark:text-white tracking-tight uppercase leading-none">
            {title}
          </h1>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Control Center</span>
        </div>
        <Separator orientation="vertical" className="h-6 bg-border hidden md:block" />
        <div className="hidden md:block bg-muted/40 dark:bg-slate-950/40 px-3 py-1 rounded-full border border-border">
          <RealtimeClockWithRefresh />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1 bg-muted/40 dark:bg-slate-950/40 p-1 rounded-xl border border-border">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-muted-foreground hover:text-blue-500">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Link href="/dashboard-settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-blue-500">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <NotificationBell />
      </div>
    </header>
  );
}
