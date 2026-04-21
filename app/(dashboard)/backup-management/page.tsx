"use client";

// File: app/(dashboard)/backup-management/page.tsx

import { BackupDashboard } from "@/components/backup/BackupDashboard";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";

export default function BackupManagementPage() {
  // RBAC Permission Checks - Get permissions for system-backup-management menu
  const { canView } = useMenuItemPermissions("system-backup-management");
  const { loading: menuLoading } = useMenu();

  // Show loading while checking permissions
  if (menuLoading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  // Check if user has permission to view this page
  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="p-4 lg:p-5 min-h-screen">
      <div className="">
        <BackupDashboard />
      </div>
    </div>
  );
}
