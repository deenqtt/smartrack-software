'use client';

import React, { useState, useEffect } from 'react';
import type { MenuPreset } from '@/lib/types/preset';
import { showToast } from '@/lib/toast-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { IconPicker } from './IconPicker';
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react';

interface MenuGroupData {
  id: string;
  name: string;
  label: string;
  items: {
    id: string;
    name: string;
    label: string;
  }[];
}

interface MenuPresetFormProps {
  preset?: MenuPreset | null;
  onSave: () => void;
  onCancel: () => void;
}

export function MenuPresetForm({
  preset,
  onSave,
  onCancel
}: MenuPresetFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuData, setMenuData] = useState<MenuGroupData[]>([]);
  const [formData, setFormData] = useState({
    name: preset?.name || '',
    description: preset?.description || '',
    icon: preset?.icon || 'Menu'
  });
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch menu structure - only once when component mounts
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchMenuStructure = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/menu/structure', {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && isMounted) {
          setMenuData(result.data);
        } else if (isMounted) {
          console.error('API Error:', result.error);
          // Set empty data instead of showing toast to prevent loops
          setMenuData([]);
        }
      } catch (error) {
        if (isMounted && (error as Error).name !== 'AbortError') {
          console.error('Fetch error:', error);
          // Set empty data instead of showing toast to prevent loops
          setMenuData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMenuStructure();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []); // No dependencies to prevent re-runs

  // Initialize selections from preset
  useEffect(() => {
    if (preset && menuData.length > 0) {
      const groupIds = new Set(preset.selectedGroups?.map((sg: any) => sg.groupId) || []);
      const itemIds = new Set(preset.selectedItems?.map((si: any) => si.itemId) || []);

      setSelectedGroups(groupIds);
      setSelectedItems(itemIds);

      // Auto-expand selected groups
      setExpandedGroups(groupIds);
    }
  }, [preset, menuData]);

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const newSelectedGroups = new Set(selectedGroups);

    if (checked) {
      newSelectedGroups.add(groupId);
    } else {
      newSelectedGroups.delete(groupId);
      // Also unselect all items in this group
      const newSelectedItems = new Set(selectedItems);
      const group = menuData.find(g => g.id === groupId);
      group?.items.forEach(item => newSelectedItems.delete(item.id));
      setSelectedItems(newSelectedItems);
    }

    setSelectedGroups(newSelectedGroups);
  };

  const handleItemToggle = (itemId: string, groupId: string, checked: boolean) => {
    const newSelectedItems = new Set(selectedItems);

    if (checked) {
      newSelectedItems.add(itemId);
      // Also select the group if not already selected
      const newSelectedGroups = new Set(selectedGroups);
      newSelectedGroups.add(groupId);
      setSelectedGroups(newSelectedGroups);
    } else {
      newSelectedItems.delete(itemId);
    }

    setSelectedItems(newSelectedItems);
  };

  const handleSelectAllInGroup = (groupId: string, checked: boolean) => {
    const group = menuData.find(g => g.id === groupId);
    if (!group) return;

    const newSelectedItems = new Set(selectedItems);

    if (checked) {
      group.items.forEach(item => newSelectedItems.add(item.id));
    } else {
      group.items.forEach(item => newSelectedItems.delete(item.id));
    }

    setSelectedItems(newSelectedItems);
  };

  const handleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast.error('Validation Error', 'Preset name is required');
      return;
    }

    if (selectedGroups.size === 0) {
      showToast.error('Validation Error', 'Please select at least one menu group');
      return;
    }

    // Validate preset name uniqueness (client-side check for better UX)
    if (!preset) {
      try {
        const checkResponse = await fetch(`/api/menu-presets?name=${encodeURIComponent(formData.name.trim())}`);
        const checkResult = await checkResponse.json();

        if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
          showToast.error('Validation Error', 'A preset with this name already exists. Please choose a different name.');
          return;
        }
      } catch (error) {
        // If check fails, continue with server validation
        console.warn('Could not check name uniqueness, proceeding with save');
      }
    }

    setSaving(true);
    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: formData.icon || 'Menu',
        selectedGroupIds: Array.from(selectedGroups),
        selectedItemIds: Array.from(selectedItems)
      };

      const url = preset ? `/api/menu-presets/${preset.id}` : '/api/menu-presets';
      const method = preset ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success('Success', preset ? 'Menu preset updated successfully' : 'Menu preset created successfully');
        onSave();
      } else {
        showToast.error('Error', result.error || `Failed to ${preset ? 'update' : 'create'} menu preset`);
      }
    } catch (error) {
      showToast.error('Error', `Failed to ${preset ? 'update' : 'create'} preset`);
    } finally {
      setSaving(false);
    }
  };

  const getGroupSelectionState = (groupId: string) => {
    const group = menuData.find(g => g.id === groupId);
    if (!group) return { all: false, some: false };

    const groupItems = group.items.map(item => item.id);
    const selectedInGroup = groupItems.filter(id => selectedItems.has(id));

    return {
      all: selectedInGroup.length === groupItems.length && groupItems.length > 0,
      some: selectedInGroup.length > 0 && selectedInGroup.length < groupItems.length
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading menu structure...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 border-b border-border/50">
          <CardTitle className="text-card-foreground font-semibold">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Preset Name *</Label>
              <Input
                id="name"
                placeholder="Enter preset name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={saving}
              />
            </div>
            <IconPicker
              value={formData.icon}
              onChange={(iconName) => setFormData(prev => ({ ...prev, icon: iconName }))}
              disabled={saving}
              placeholder="Select preset icon"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter preset description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Menu Selection */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 border-b border-border/50">
          <CardTitle className="text-card-foreground font-semibold">Menu Selection</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select the menu groups and items that will be visible when this preset is active.
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full">
            <div className="space-y-2">
              {menuData.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const selectionState = getGroupSelectionState(group.id);
                const isGroupSelected = selectedGroups.has(group.id);

                return (
                  <div key={group.id} className="border border-border/40 rounded-lg bg-card/30 hover:bg-card/50 transition-colors">
                    <div
                      className="flex items-center p-4 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors rounded-t-lg"
                      onClick={() => handleGroupExpansion(group.id)}
                    >
                      <Checkbox
                        checked={isGroupSelected}
                        onCheckedChange={(checked) => handleGroupToggle(group.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-3"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupExpansion(group.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <span className="font-medium">{group.label}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({group.items.length} items)
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border/30 bg-muted/30 dark:bg-muted/10 rounded-b-lg">
                        <div className="p-4">
                          <div className="flex items-center mb-4 p-3 bg-background/50 dark:bg-background/30 rounded-md">
                            <Checkbox
                              checked={selectionState.all}
                              onCheckedChange={(checked) => handleSelectAllInGroup(group.id, checked as boolean)}
                              className="mr-3"
                            />
                            <span className="text-sm font-medium text-foreground">
                              Select All Items in This Group
                            </span>
                          </div>
                          <div className="space-y-3 pl-4">
                            {group.items.map((item) => {
                              const isItemSelected = selectedItems.has(item.id);
                              return (
                                <div key={item.id} className="flex items-center p-2 rounded-md hover:bg-background/60 dark:hover:bg-background/20 transition-colors">
                                  <Checkbox
                                    checked={isItemSelected}
                                    onCheckedChange={(checked) =>
                                      handleItemToggle(item.id, group.id, checked as boolean)
                                    }
                                    className="mr-3"
                                  />
                                  <span className="text-sm text-foreground/80 hover:text-foreground transition-colors">{item.label}</span>
                                </div>
                              );
                            })}
                            {group.items.length === 0 && (
                              <div className="text-sm text-muted-foreground italic p-4 bg-muted/50 dark:bg-muted/20 rounded-md">
                                No menu items in this group
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Separator className="my-4" />

          <div className="text-sm text-muted-foreground">
            <div>Selected Groups: {selectedGroups.size}</div>
            <div>Selected Items: {selectedItems.size}</div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {preset ? 'Update Preset' : 'Create Preset'}
        </Button>
      </div>
    </div>
  );
}
