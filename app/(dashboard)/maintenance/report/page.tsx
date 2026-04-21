"use client";

import dynamic from "next/dynamic";

// Lazy load the heavy MaintenanceReportContent component
const MaintenanceReportContent = dynamic(
  () => import('./MaintenanceReportContent'),
  {
    loading: () => <MaintenanceReportSkeleton />,
    ssr: false
  }
);

// Loading skeleton for the maintenance report page - matching device-external style
function MaintenanceReportSkeleton() {
  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted animate-pulse flex-shrink-0"></div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center animate-pulse">
              <div className="w-6 h-6 bg-muted rounded mr-3"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-6 bg-muted rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Controls Skeleton */}
      <div className="border rounded-lg p-6">
        <div className="space-y-4 animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-muted rounded"></div>
            <div className="h-5 bg-muted rounded w-32"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 h-10 bg-muted rounded"></div>
            <div className="flex gap-2">
              <div className="h-9 bg-muted rounded w-24"></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-48 h-10 bg-muted rounded"></div>
            <div className="sm:w-48 h-10 bg-muted rounded"></div>
            <div className="sm:w-48 h-10 bg-muted rounded"></div>
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-lg">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-muted rounded"></div>
              <div className="h-5 bg-muted rounded w-32"></div>
            </div>
            <div className="h-4 bg-muted rounded w-48"></div>
          </div>
          <div className="h-4 bg-muted rounded w-64 mt-2"></div>
        </div>
        <div className="p-6">
          <div className="hidden lg:block animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-muted rounded w-8"></div>
                <div className="h-4 bg-muted rounded flex-1 max-w-48"></div>
                <div className="h-4 bg-muted rounded flex-1 max-w-32"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 bg-muted rounded w-16"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-8 ml-auto"></div>
              </div>
            ))}
          </div>
          <div className="lg:hidden space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                    <div className="w-16 h-5 bg-muted rounded"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-muted rounded w-32"></div>
                    <div className="h-4 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaintenanceReportPage() {
  return (
    <MaintenanceReportContent />
  );
}
