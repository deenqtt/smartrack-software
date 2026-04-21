"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

import { BottomDashboardNavigator, DashboardCategory } from "@/components/BottomDashboardNavigator";
import { getWidgetCategory } from "@/lib/dashboard-utils";
import { CapacityView } from "@/components/dashboard/CapacityView";

const DashboardLayout = dynamic(() => import("@/components/DashboardLayout"), {
  ssr: false,
  loading: () => <p className="text-center">Loading dashboard...</p>,
});

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
  layout: WidgetLayout[] | string;
}

const parseLayoutSafely = (layoutData: any): WidgetLayout[] => {
  if (!layoutData) return [];
  if (typeof layoutData === "string") {
    try {
      const parsed = JSON.parse(layoutData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(layoutData)) return layoutData;
  return [];
};

export default function PreviewPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>("Overview");

  useEffect(() => {
    async function fetchPublicDashboard() {
      try {
        const response = await fetch("/api/dashboards/public-active");
        if (!response.ok) {
          if (response.status === 404) {
            setError("no_dashboard");
          } else {
            throw new Error(`Failed to fetch: ${response.status}`);
          }
          return;
        }
        const data: DashboardData = await response.json();
        setDashboardData({
          ...data,
          layout: parseLayoutSafely(data.layout),
        });
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPublicDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-12 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="col-span-12 sm:col-span-6 lg:col-span-4 h-48 rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error === "no_dashboard") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center gap-4">
        <LayoutGrid className="h-12 w-12 text-primary" />
        <h2 className="text-2xl font-bold">No Dashboard Available</h2>
        <p className="text-muted-foreground max-w-md">
          There is no active dashboard to preview. Please login to set up your dashboard.
        </p>
        <Link href="/login">
          <Button size="lg">
            <LogIn className="mr-2 h-5 w-5" />
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Could Not Load Preview</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const getFilteredLayout = (): WidgetLayout[] => {
    if (!dashboardData || typeof dashboardData.layout === "string") return [];

    return (dashboardData.layout as WidgetLayout[])
      .map((item) => ({
        ...item,
        category: getWidgetCategory(item.widgetType, item.config),
      }))
      .filter((item) => item.category === activeCategory)
      .map(({ category, ...item }) => item as WidgetLayout);
  };

  const filteredLayout = getFilteredLayout();

  return (
    <main className="p-4 md:p-6 pb-24 h-full relative overflow-y-auto no-scrollbar scroll-smooth">
      {activeCategory === "Capacity" ? (
        <CapacityView />
      ) : filteredLayout.length > 0 ? (
        <DashboardLayout layout={filteredLayout} />
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-70">
          <div className="p-12 border-2 border-dashed border-border rounded-3xl">
            <LayoutGrid className="h-16 w-16 text-muted-foreground mb-4 mx-auto opacity-30" />
            <h3 className="text-xl font-medium tracking-tight">No Widgets Found</h3>
            <p className="text-sm text-muted-foreground">
              There are no widgets configured for the "{activeCategory}" category.
            </p>
          </div>
        </div>
      )}

      <BottomDashboardNavigator
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
    </main>
  );
}
