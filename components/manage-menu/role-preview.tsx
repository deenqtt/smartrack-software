"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, ChevronDown, ChevronRight, LayoutGrid, Columns2 } from "lucide-react";
import { LoadingPage } from "@/components/loading-page";
import { getIconWithFallback } from "@/lib/icon-library";
import { useTheme } from "next-themes";

interface MenuItem {
  id: string;
  name: string;
  label: string;
  path: string;
  icon?: string;
  order: number;
  isActive: boolean;
  isDeveloper: boolean;
}

interface MenuGroup {
  id: string;
  name: string;
  label: string;
  icon?: string;
  order: number;
  isActive: boolean;
  menuItems: MenuItem[];
}

interface RolePreviewCardProps {
  userRole: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
}

export function RolePreviewCard({ userRole }: RolePreviewCardProps) {
  const { theme } = useTheme();
  const [visibleMenus, setVisibleMenus] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>(userRole?.id || "");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedRole) {
      fetchRoleMenus(selectedRole);
    }
  }, [selectedRole]);

  useEffect(() => {
    // Initialize with current user's role
    if (userRole?.id) {
      setSelectedRole(userRole.id);
    }
  }, [userRole]);

  const fetchRoleMenus = async (roleId: string) => {
    setLoading(true);
    try {
      // Note: In real implementation, you'd need an API endpoint that can preview menus for any role
      // For now, we'll simulate by fetching current user's menu
      const response = await fetch('/api/menu');
      const data = await response.json();

      if (data.success) {
        setVisibleMenus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch role menus:', error);
      setVisibleMenus([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleId: string, roleName: string) => {
    setSelectedRole(roleId);
    // Reset open groups when switching roles
    setOpenGroups(new Set());
    // In real implementation, this would fetch menus for the selected role
    console.log(`Previewing menus for role: ${roleName}`);
  };

  const toggleGroup = (groupId: string) => {
    const newOpenGroups = new Set(openGroups);
    if (newOpenGroups.has(groupId)) {
      newOpenGroups.delete(groupId);
    } else {
      newOpenGroups.add(groupId);
    }
    setOpenGroups(newOpenGroups);
  };

  // Mock roles for demonstration (in real app, fetch from API)
  const availableRoles = [
    { id: "admin-role-id", name: "ADMIN", description: "Full access to all features" },
    { id: "user-role-id", name: "USER", description: "Limited access to basic features" },
    { id: "developer-role-id", name: "DEVELOPER", description: "Advanced features and development tools" },
  ];

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-500" />
          Menu Preview
        </CardTitle>
        <CardDescription>
          Preview which menus are accessible to different user roles
        </CardDescription>

        {/* Role Selector */}
        <div className="flex gap-2 mt-4">
          {availableRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleRoleChange(role.id, role.name)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedRole === role.id
                  ? `bg-${role.name === 'ADMIN' ? 'red' : role.name === 'DEVELOPER' ? 'purple' : 'blue'}-100 text-${role.name === 'ADMIN' ? 'red' : role.name === 'DEVELOPER' ? 'purple' : 'blue'}-800 border border-${role.name === 'ADMIN' ? 'red' : role.name === 'DEVELOPER' ? 'purple' : 'blue'}-200`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role.name}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingPage variant="minimal" message="Loading menu preview..." />
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMenus.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No menus accessible for the selected role
              </p>
            ) : (
              // SIDEBAR-STYLE PREVIEW - Dropdown menus with theme support
              <div className={`rounded-lg shadow-sm max-w-sm mx-auto border ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                {/* Mock Navigation Bar */}
                <div className="bg-gray-800 text-white px-4 py-3 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-sm font-bold">
                        U
                      </div>
                      <span className="text-sm font-medium">
                        User ({selectedRole.split('-')[0].toUpperCase()})
                      </span>
                    </div>
                    <div className="w-6 h-6 bg-gray-600 rounded"></div>
                  </div>
                </div>

                {/* Sidebar Content with Dark/Light Theme */}
                <div className={`p-4 space-y-1 min-h-[400px] ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  {visibleMenus.map(group => {
                    const isOpen = openGroups.has(group.id);
                    return (
                      <div key={group.id}>
                        {/* Group Header */}
                        <div
                          className={`font-semibold text-xs uppercase tracking-wider py-2 px-3 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {group.label.toUpperCase()}
                        </div>

                        {/* Menu Items */}
                        {group.menuItems.map((item, index) => (
                          <button
                            key={item.id}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                              theme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                          >
                            {getIconWithFallback(item.icon || 'Menu', 'h-4 w-4')}
                            <span className="text-sm">{item.label}</span>
                            {item.isDeveloper && (
                              <Badge
                                variant={theme === 'dark' ? 'outline' : 'secondary'}
                                className="text-xs ml-auto"
                              >
                                Dev
                              </Badge>
                            )}
                          </button>
                        ))}

                        {/* Separator if not last group */}
                        {group !== visibleMenus[visibleMenus.length - 1] && (
                          <div className={`mx-3 my-2 border-t ${
                            theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="bg-gray-800 text-white px-4 py-2 rounded-b-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-600 rounded"></div>
                    <span className="text-xs text-gray-300">
                      {visibleMenus.reduce((acc, group) => acc + group.menuItems.length, 0)} menu items visible
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="text-xs text-muted-foreground mt-4 p-3 bg-gray-50 rounded">
              <strong>Note:</strong> This preview shows the current menu configuration.
              Changes made in this management interface will be reflected here immediately.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
