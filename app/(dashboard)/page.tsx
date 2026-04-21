// app/(dashboard)/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, AlertCircle, PlusCircle, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";

import { BottomDashboardNavigator, DashboardCategory } from "@/components/BottomDashboardNavigator";
import { getWidgetCategory } from "@/lib/dashboard-utils";
import { CapacityView } from "@/components/dashboard/CapacityView";

const DashboardLayout = dynamic(() => import("@/components/DashboardLayout"), {
  ssr: false,
  loading: () => <p className="text-center">Loading dashboard...</p>,
});

// Define WidgetLayout interface locally to match DashboardLayout expectations
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
  layout: WidgetLayout[] | string; //  Can be string or array
}

//  Helper function to safely parse layout
const parseLayoutSafely = (layoutData: any): WidgetLayout[] => {
  if (!layoutData) return [];

  if (typeof layoutData === "string") {
    try {
      const parsed = JSON.parse(layoutData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  if (Array.isArray(layoutData)) {
    return layoutData;
  }

  return [];
};

export default function MainDashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noDashboardsFound, setNoDashboardsFound] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>("Overview");
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Only load dashboard data when authenticated and auth is loaded
    if (authLoading || !isAuthenticated) {
      if (!authLoading && !isAuthenticated) {
        setIsLoading(false);
      }
      return;
    }

    const timeoutId = setTimeout(async () => {
      await fetchActiveDashboard();
    }, 100);

    async function fetchActiveDashboard() {
      setIsLoading(true);
      setError(null);
      setNoDashboardsFound(false);

      try {
        const response = await fetch('/api/dashboards/active', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setNoDashboardsFound(true);
          } else {
            throw new Error(`Failed to fetch dashboard: ${response.status} ${response.statusText}`);
          }
        } else {
          const data: DashboardData = await response.json();

          const parsedLayout = parseLayoutSafely(data.layout);
          const processedData = {
            ...data,
            layout: parsedLayout,
          };

          setDashboardData(processedData);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setError('Dashboard loading timeout. Please try again.');
        } else {
          setError(err.message || 'Failed to load dashboard');
        }
        setDashboardData(null);
        setNoDashboardsFound(false);
      } finally {
        setIsLoading(false);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, authLoading]);

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

  if (noDashboardsFound) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <LayoutGrid className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-bold">Welcome!</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          It looks like you don't have any dashboards yet. Let's create your
          first one to get started.
        </p>
        <Button size="lg" onClick={() => window.location.reload()}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Refresh Dashboard
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">An Error Occurred</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  // Filter components based on category
  const getFilteredLayout = () => {
    if (!dashboardData || typeof dashboardData.layout === "string") return [];
    
    const categorizedWidgets = dashboardData.layout.map((item: WidgetLayout) => ({
      ...item,
      category: getWidgetCategory(item.widgetType, item.config)
    }));
    
    return categorizedWidgets
      .filter(item => item.category === activeCategory)
      .map(({category, ...item}) => item as WidgetLayout);
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
             <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4 mx-auto opacity-30" />
             <h3 className="text-xl font-medium tracking-tight">No Widgets Found</h3>
             <p className="text-sm text-muted-foreground">There are no widgets configured for the "{activeCategory}" category.</p>
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
