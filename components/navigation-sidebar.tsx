"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import {
  LogOut,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  BlocksIcon,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useMenu } from "@/contexts/MenuContext";
import { useRouter } from "next/navigation";
import { getIconWithFallback } from "@/lib/icon-library";
import { Badge } from "@/components/ui/badge";
import { DemoRestrictedModal } from "@/components/demo-restricted-modal";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Dynamic imports for better hydration
const ThemeToggle = dynamic(
  () =>
    import("@/components/theme-toggle").then((mod) => ({
      default: mod.ThemeToggle,
    })),
  {
    loading: () => (
      <div className="h-8 w-8 bg-muted animate-pulse rounded-md"></div>
    ),
    ssr: false,
  },
);

import { UserProfileDialog } from "@/components/user-profile-dialog";

// Dynamic icon mapping function with all Lucide icons from dynamic import
const getIconComponent = (iconName: string) => {
  // Use getIconWithFallback instead for better compatibility
  return getIconWithFallback(iconName)?.type || BarChart3;
};

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Universal Dashboard";

export const NavigationSidebar = memo(function NavigationSidebar({
  collapsible = false,
}: {
  collapsible?: boolean;
}) {
  // Troubleshooting tag: FORCE_RECOMPILE_V2
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [demoModal, setDemoModal] = useState<{ open: boolean; featureName?: string }>({ open: false });

  const { menuData, loading, error, refreshMenu } = useMenu();
  const { logout, user, isAuthenticated, isLoggingOut } = useAuth();
  const { setOpen } = useSidebar();
  const prevPathname = useRef(pathname);

  // Automatically close sidebar when on dashboard (only on navigation or first load)
  useEffect(() => {
    if (pathname === "/") {
      // Only auto-close if we just arrived at dashboard or it's the first render
      if (prevPathname.current !== "/") {
         setOpen(false);
      }
    }
    prevPathname.current = pathname;
  }, [pathname, setOpen]);

  // Toggle group open/close state
  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Handle logout
  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <Sidebar className="flex flex-col h-full border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 h-24 bg-sidebar/40 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between w-full h-full gap-2">
          <div className="flex items-center gap-4">
            <div className="flex aspect-square size-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-sidebar-border shadow-md overflow-hidden relative shrink-0">
              <img
                src="/images/icon/icon1.svg"
                alt="Smartrack Logo"
                className="h-9 w-9 object-contain dark:hidden"
              />
              <img
                src="/images/icon/icon2.svg"
                alt="Smartrack Logo"
                className="h-9 w-9 object-contain hidden dark:block"
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xl font-black text-sidebar-foreground dark:text-white truncate tracking-tighter uppercase leading-none">
                SMARTRACK
              </p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500/80 uppercase tracking-[0.2em] mt-1.5">IOT SOLUTIONS</p>
            </div>
          </div>
          <div className="flex h-full items-center">
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent
        className="bg-background overflow-auto scrollbar-hide flex-1 min-h-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-4 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sidebar-foreground/50" />
            <div className="text-sm text-sidebar-foreground/70 text-center">
              Loading menu...
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-4 space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div className="text-sm text-red-400 text-center">
              Error loading menu
            </div>
          </div>
        ) : menuData?.menuGroups && menuData.menuGroups.length > 0 ? (
          menuData.menuGroups
            .filter((group) => group.isActive === true)
            .map((group, groupIndex) => {
              const groupId = group.id || `group-${groupIndex}`;
              const items = (group.menuItems || group.items || []).filter(
                (item) => item.isActive !== false,
              );

              const renderMenuItem = (item: any, itemIndex: number, isCollapsible = false) => {
                const IconComponent = getIconComponent(item.icon || "BarChart3");
                const isRestricted = IS_DEMO && item.demoRestricted === true;

                const buttonClass = isCollapsible
                  ? "group flex items-center gap-2 px-3 py-2 rounded-md w-full transition-all duration-200 text-sidebar-foreground hover:bg-muted/50 hover:pl-4 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold data-[active=true]:shadow-sm overflow-hidden relative"
                  : "group flex items-center gap-2 px-3 py-2 rounded-md w-full transition-colors text-sidebar-foreground hover:bg-muted/50 hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:border-l-primary";

                return (
                  <SidebarMenuItem key={item.id || itemIndex} className="relative">
                    {isRestricted ? (
                      <SidebarMenuButton
                        isActive={false}
                        className={`${buttonClass} opacity-60`}
                        onClick={() => setDemoModal({ open: true, featureName: item.label })}
                      >
                        <Lock className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
                        <span className={isCollapsible ? "ml-5" : ""}>{item.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.path}
                        className={buttonClass}
                      >
                        <Link href={item.path} prefetch={false}>
                          {pathname === item.path && <div className="active-indicator-line" />}
                          {isCollapsible ? (
                            <span className="ml-5">{item.label}</span>
                          ) : (
                            <>
                              <IconComponent className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground" />
                              <span>{item.label}</span>
                            </>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              };

              // Special Case: Dashboard direct link (No dropdown)
              if (group.name === "dashboard" && items.length === 1) {
                const item = items[0];
                const IconComponent = getIconComponent(
                  item.icon || group.icon || "LayoutDashboard",
                );
                return (
                  <SidebarGroup key={groupId} className="p-0">
                    <SidebarMenu className="px-2">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.path}
                          className="group flex items-center gap-2 px-3 py-6 rounded-xl w-full transition-all duration-300 text-sidebar-foreground hover:bg-primary/5 hover:scale-[1.02] data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold data-[active=true]:shadow-sm overflow-hidden relative"
                        >
                          <Link href={item.path} prefetch={false}>
                            {pathname === item.path && (
                              <div className="active-indicator-line" />
                            )}
                            <IconComponent className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                            <span className="text-base tracking-tight">
                              {item.label}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroup>
                );
              }

              if (collapsible) {
                const isOpen = openGroups.has(groupId);
                return (
                  <SidebarGroup key={groupId}>
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleGroup(groupId)}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors rounded-md px-2 py-1">
                          <div className="flex items-center gap-2">
                            {group.icon && getIconWithFallback(group.icon)}
                            <span className="text-sidebar-foreground/80 font-medium text-base">
                              {group.label}
                            </span>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 -rotate-90" />
                          )}
                        </SidebarGroupLabel>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {items.map((item, itemIndex) => renderMenuItem(item, itemIndex, true))}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarGroup>
                );
              } else {
                return (
                  <SidebarGroup key={groupId}>
                    <SidebarGroupLabel className="flex items-center gap-2 text-sidebar-foreground/80">
                      {group.icon && getIconWithFallback(group.icon)}
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {items.map((item, itemIndex) => renderMenuItem(item, itemIndex, false))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              }
            })
        ) : menuData?.menuGroups ? (
          <div className="flex items-center justify-center p-4">
            <div className="text-sm text-sidebar-foreground/70">
              Menu loading...
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 space-y-2">
            <div className="text-sm text-sidebar-foreground/70 text-center">
              {error?.includes("Authentication") || error?.includes("401")
                ? "Please login to access menu"
                : "No menu items available"}
            </div>
            {!loading && !error && (
              <button
                onClick={() => refreshMenu()}
                className="text-xs text-primary hover:text-primary/80 underline"
              >
                Refresh menu
              </button>
            )}
            {(error?.includes("Authentication") || error?.includes("401")) && (
              <button
                onClick={() => router.push("/login")}
                className="text-xs text-primary hover:text-primary/80 underline"
              >
                Go to Login
              </button>
            )}
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 bg-background border-t border-sidebar-border flex-shrink-0">
        <UserProfileDialog>
          <div className="flex items-center gap-3 px-3 py-2 mb-2 cursor-pointer hover:bg-muted/50 rounded-md transition-colors">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-medium text-sm">
                {user?.email?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {(user?.email || "User").split("@")[0]}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
            {/* Add a small indicator that it's clickable */}
            <ChevronRight className="h-4 w-4 text-sidebar-foreground/50" />
          </div>
        </UserProfileDialog>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="flex items-center gap-2 text-destructive bg-destructive/5 hover:bg-destructive/20 hover:text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-3 py-2 rounded-md w-full border border-transparent hover:border-destructive/40"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />



      <ConfirmationDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        type="warning"
        title="Confirm Logout"
        description="Are you sure you want to log out? You will need to log in again to access the system."
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        destructive={true}
      />

      <DemoRestrictedModal
        open={demoModal.open}
        featureName={demoModal.featureName}
        onClose={() => setDemoModal({ open: false })}
      />
    </Sidebar>
  );
});
