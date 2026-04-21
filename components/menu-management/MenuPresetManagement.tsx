'use client';

import React, { useState, useEffect } from 'react';
import type { MenuPreset } from '@/lib/types/preset';
import { showToast } from '@/lib/toast-utils';
import { useMenu } from '@/contexts/MenuContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Eye, Upload, Download } from 'lucide-react';
import ImportDialog from '@/components/ImportDialog';
import { MenuPresetList } from './MenuPresetList';
import { MenuPresetForm } from './MenuPresetForm';
import { MenuPresetPreviewModal } from './MenuPresetPreviewModal';

export function MenuPresetManagement() {
  const [presets, setPresets] = useState<MenuPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<MenuPreset | null>(null);
  const [editingPreset, setEditingPreset] = useState<MenuPreset | null>(null);
  const [previewingPreset, setPreviewingPreset] = useState<MenuPreset | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [menuStructure, setMenuStructure] = useState<any[]>([]); // Cache menu structure
  const { refreshMenu } = useMenu();

  // Fetch presets
  const fetchPresets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/menu-presets');
      const result = await response.json();

      if (result.success) {
        setPresets(result.data);
      } else {
        showToast.error('Error', result.error || 'Failed to fetch presets');
      }
    } catch (error) {
      showToast.error('Error', 'Failed to fetch presets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleCreatePreset = () => {
    setEditingPreset(null);
    setActiveTab('create');
  };

  const handleEditPreset = (preset: MenuPreset) => {
    setEditingPreset(preset);
    setActiveTab('create');
  };

  const handlePreviewPreset = (preset: MenuPreset) => {
    setPreviewingPreset(preset);
  };

  const handleFormSaved = () => {
    setEditingPreset(null);
    fetchPresets(); // Refresh after creating/editing
    setActiveTab('list');
  };

  const handlePresetToggled = async (presetId: string) => {
    await fetchPresets();
    // Also refresh the menu to update sidebar with new active preset
    await refreshMenu();
  };

  const handleDuplicatePreset = async (preset: MenuPreset) => {
    try {
      showToast.info("Duplicating Preset", `Creating copy of "${preset.name}"...`);

      const response = await fetch('/api/menu-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${preset.name} (Copy)`,
          description: preset.description,
          icon: preset.icon,
          selectedGroupIds: preset.selectedGroups.map((sg: any) => sg.groupId),
          selectedItemIds: preset.selectedItems.map((si: any) => si.itemId),
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success('Success', `Menu preset "${preset.name}" duplicated successfully`);
        fetchPresets();
      } else {
        showToast.error('Duplication Failed', result.error || 'Failed to duplicate preset');
      }
    } catch (error) {
      showToast.error('Error', 'An unexpected error occurred during duplication');
    }
  };

  const handleExportAll = async () => {
    try {
      showToast.info("Preparing Export", "Generating menu presets export file...");
      const response = await fetch("/api/menu-presets/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menu-presets-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success("Export Success", "Menu presets exported successfully");
    } catch (error: any) {
      showToast.error("Export Failed", error.message || "Failed to export menu presets");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-800">
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Menu Presets</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Create and manage custom menu configurations for different use cases</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="mr-2 h-4 w-4" /> Export All
            </Button>
            <Button onClick={handleCreatePreset}>
              <Plus className="mr-2 h-4 w-4" />
              Create Preset
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Available Presets
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {editingPreset ? 'Edit Preset' : 'Create Preset'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Presets</CardTitle>
                <CardDescription>
                  Manage and activate your menu presets. Only one preset can be active at a time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MenuPresetList
                  presets={presets}
                  loading={loading}
                  onEdit={handleEditPreset}
                  onPreview={handlePreviewPreset}
                  onPresetToggled={handlePresetToggled}
                  onDuplicate={handleDuplicatePreset}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{editingPreset ? 'Edit Preset' : 'Create New Preset'}</CardTitle>
                <CardDescription>
                  Select menu groups and items that will be visible when this preset is active.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MenuPresetForm
                  preset={editingPreset}
                  onSave={handleFormSaved}
                  onCancel={() => {
                    setEditingPreset(null);
                    setActiveTab('list');
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Render modal as overlay */}
        <MenuPresetPreviewModal
          preset={previewingPreset}
          isOpen={!!previewingPreset}
          onClose={() => {
            setPreviewingPreset(null);
            setActiveTab('list');
          }}
        />
        {/* Import Dialog */}
        <ImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImportSuccess={() => fetchPresets()}
          title="Import Menu Presets"
          endpoint="/api/menu-presets/import"
          typeLabel="Menu Preset"
        />
      </div>
    </div>
  );
}
