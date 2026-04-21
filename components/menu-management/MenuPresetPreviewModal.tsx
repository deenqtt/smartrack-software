'use client';

import React, { useState, useEffect } from 'react';
import type { MenuPreset } from '@/lib/types/preset';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, X, Settings, Layout, Search, Maximize2, Minimize2 } from 'lucide-react';
import { showToast } from '@/lib/toast-utils';
import { getIconWithFallback } from '@/lib/icon-library';

interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  items?: SidebarItem[];
}

interface MenuPresetPreviewModalProps {
  preset: MenuPreset | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MenuPresetPreviewModal({
  preset,
  isOpen,
  onClose
}: MenuPresetPreviewModalProps) {
  console.log('[MODAL] Component rendered with:', { preset: preset?.name, isOpen });
  const [sidebarData, setSidebarData] = useState<SidebarItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch full menu structure for preview
  useEffect(() => {
    if (!isOpen) return;

    const fetchSidebarData = async () => {
      setLoading(true);
      console.log('[PREVIEW] Starting to fetch sidebar data for preset:', preset?.name);

      try {
        const response = await fetch('/api/menu/structure');
        console.log('[PREVIEW] Response status:', response.status);

        const result = await response.json();
        console.log('[PREVIEW] API response:', result);

        if (result.success) {
          // Filter the simple menu structure based on preset
          let filteredData = result.data;
          console.log('[PREVIEW] Raw data received:', result.data?.length, 'groups');

          if (preset) {
            // Filter groups and items based on preset
            const allowedGroupIds = new Set(preset.selectedGroups.map((sg: any) => sg.groupId));
            const allowedItemIds = new Set(preset.selectedItems.map((si: any) => si.itemId));

            console.log('[PREVIEW] Filtering preset:', {
              groupIds: Array.from(allowedGroupIds),
              itemIds: Array.from(allowedItemIds),
              selectedGroups: preset.selectedGroups,
              selectedItems: preset.selectedItems
            });

            filteredData = result.data
              .filter((group: any) => allowedGroupIds.has(group.id))
              .map((group: any) => ({
                ...group,
                items: group.items.filter((item: any) => allowedItemIds.has(item.id))
              }))
              .filter((group: any) => group.items.length > 0);
          }

          console.log('[PREVIEW] Filtered data:', filteredData?.length, 'groups');

          // Transform to sidebar format
          const sidebar: SidebarItem[] = filteredData.map((group: any) => ({
            id: group.id,
            label: group.label,
            path: group.name, // Groups don't have paths, just use name
            icon: group.name, // Use group name as icon identifier
            items: (group.items || []).map((item: any) => ({
              id: item.id,
              label: item.label,
              path: item.path,
              icon: item.icon
            })).filter((item: any) => item.label && item.id) // Filter valid items
          })).filter((group: any) => group.items && group.items.length > 0); // Filter groups with items

          console.log('[PREVIEW] Final sidebar data:', sidebar.length, 'groups');
          setSidebarData(sidebar);
        } else {
          console.error('[PREVIEW] API returned error:', result.error);
          showToast.error('Error', `Failed to load sidebar preview: ${result.error}`);
        }
      } catch (error) {
        console.error('Preview Modal Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        showToast.error('Error', `Failed to load sidebar preview: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarData();
  }, [isOpen, preset?.id]); // Remove toast from dependencies to prevent infinite re-runs

  const toggleExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: SidebarItem[]) => {
      items.forEach(item => {
        if (item.items && item.items.length > 0) {
          allIds.add(item.id);
          collectIds(item.items);
        }
      });
    };
    collectIds(sidebarData);
    setExpandedItems(allIds);
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const filteredSidebarData = searchQuery.trim() === ""
    ? sidebarData
    : sidebarData.map(group => ({
      ...group,
      items: group.items?.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => (group.items && group.items.length > 0) || group.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderSidebar = (items: SidebarItem[], level = 0): React.ReactNode => {
    return items.map((item) => {
      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.items && item.items.length > 0;
      const isGroup = level === 0;

      return (
        <div key={item.id} className={`${level > 0 ? 'ml-4' : ''}`}>
          <div
            className={`
              flex items-center p-2 rounded-md cursor-pointer transition-all duration-200
              hover:bg-accent/50 dark:hover:bg-accent/30 hover:shadow-sm
              ${level === 0
                ? 'font-semibold text-foreground text-base'
                : 'text-muted-foreground text-sm hover:text-foreground'
              }
            `}
            onClick={() => hasChildren && toggleExpansion(item.id)}
          >
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-4 w-4 mr-2 hover:bg-accent/30 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpansion(item.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-4 mr-2" />}
            <div className="flex-1 flex items-center">
              <div className="p-1 rounded-md bg-muted/30 dark:bg-muted/10">
                {getIconWithFallback(item.icon || 'Menu', 'h-3 w-3 text-primary/70')}
              </div>
              <span className="ml-2 font-medium">{item.label}</span>
              {isGroup && (
                <Badge
                  variant="outline"
                  className="ml-2 text-xs border-primary/30 text-primary bg-primary/5 dark:bg-primary/10"
                >
                  Group
                </Badge>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="mt-2 ml-4 border-l-2 border-border/30 pl-2">
              {renderSidebar(item.items!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl dark:shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Sidebar Preview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              How the sidebar will look with "{preset?.name || 'No Preset'}" applied
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[700px] bg-muted/20">
          {/* Toolbar */}
          <div className="p-4 border-b border-border bg-background flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="flex items-center gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="flex items-center gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                Collapse All
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-6 relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <span className="mt-4 text-sm font-medium text-muted-foreground">Generating preview structure...</span>
              </div>
            ) : filteredSidebarData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background border border-dashed border-border rounded-xl">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Layout className="h-10 w-10 text-muted-foreground" />
                </div>
                <h4 className="text-xl font-semibold mb-2">No items match your criteria</h4>
                <p className="text-muted-foreground max-w-sm">
                  Try adjusting your filter or check if the preset "{preset?.name}" has menu items selected.
                </p>
                {searchQuery && (
                  <Button variant="link" onClick={() => setSearchQuery("")} className="mt-4">
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="h-full flex gap-6">
                {/* Simulated Sidebar Container */}
                <div className="w-80 h-full bg-background border border-border rounded-xl shadow-lg flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-sm">
                      N
                    </div>
                    <span className="font-bold text-sm tracking-tight text-foreground">SMARTRACK SYSTEM</span>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-1">
                      {renderSidebar(filteredSidebarData)}
                    </div>
                  </ScrollArea>
                </div>

                {/* Dashboard Placeholder */}
                <div className="flex-1 h-full bg-muted/40 border border-dashed border-border rounded-xl flex items-center justify-center p-8 text-center hidden lg:flex">
                  <div className="max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-sm mx-auto mb-6 flex items-center justify-center">
                      <Layout className="h-8 w-8 text-primary/40" />
                    </div>
                    <h5 className="font-semibold text-foreground mb-2">Dashboard Preview Mode</h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The sidebar on the left represents how your dashboard navigation will look for users assigned to the "{preset?.name}" preset.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 dark:bg-muted/10 border-t border-border flex justify-end">
          <Button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-shadow"
          >
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
