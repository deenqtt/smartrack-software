'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { showToast } from '@/lib/toast-utils';
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

interface DeviceImportData {
  uniqId?: string;
  name: string;
  topic: string;
  address?: string;
}

interface PreviewItem {
  data: DeviceImportData;
  status: 'valid' | 'duplicate_topic' | 'duplicate_uniqId' | 'duplicate_name' | 'invalid';
  conflictInfo?: {
    existingTopic?: string;
    existingUniqId?: string;
    existingName?: string;
  };
}

interface PreviewResult {
  total: number;
  valid: number;
  duplicates: {
    topic: string[];
    uniqId: string[];
    name: string[];
  };
  items: PreviewItem[];
}

type ImportMode = 'add_only' | 'update_existing' | 'replace_all';

interface DeviceImportExportDialogProps {
  onDevicesImported?: () => void;
}

export default function DeviceImportExportDialog({ onDevicesImported }: DeviceImportExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('add_only');
  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(new Set());
  const [allDevices, setAllDevices] = useState<any[]>([]);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'conflict' | 'invalid'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDevicesForExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/api/devices/external');
      if (response.ok) {
        const data = await response.json();
        setAllDevices(data);
        // Initially select all for export
        setSelectedExportIds(new Set(data.map((d: any) => d.id)));
      }
    } catch (error) {
      console.error('Fetch devices error:', error);
    } finally {
      setExportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && activeTab === 'export') {
      fetchDevicesForExport();
    }
  }, [open, activeTab, fetchDevicesForExport]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast.error('Please select a JSON file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast.error('File size too large (max 10MB)');
      return;
    }

    setSelectedFile(file);
    setSelectedDevices(new Set());
  }, []);

  const handlePreview = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const fileContent = await selectedFile.text();
      const jsonData = JSON.parse(fileContent);

      if (!Array.isArray(jsonData)) {
        showToast.error('Invalid file format: Expected array of devices');
        return;
      }

      const response = await fetch('/api/devices/external/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Preview failed');
      }

      const result: PreviewResult = await response.json();
      setPreviewData(result);

      const validIndices = result.items
        .map((item, index) => item.status === 'valid' ? index : -1)
        .filter(index => index !== -1);
      setSelectedDevices(new Set(validIndices));

    } catch (error) {
      console.error('Preview error:', error);
      showToast.error(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !previewData) return;

    const devicesToImport = Array.from(selectedDevices).map(index =>
      previewData.items[index]?.data
    ).filter(Boolean);

    if (devicesToImport.length === 0) {
      showToast.error('Please select at least one device to import');
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        devices: devicesToImport,
        mode: importMode
      };

      const response = await fetch('/api/devices/external/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await response.json();
      showToast.success(`Import completed: ${result.created || 0} created, ${result.updated || 0} updated`);

      if (onDevicesImported) {
        onDevicesImported();
      }

      setOpen(false);
      setSelectedFile(null);
      setPreviewData(null);
      setSelectedDevices(new Set());

    } catch (error) {
      console.error('Import error:', error);
      showToast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, previewData, selectedDevices, importMode, onDevicesImported]);

  const handleExport = useCallback(async () => {
    try {
      if (selectedExportIds.size === 0) {
        showToast.error('Please select at least one device to export');
        return;
      }

      const devicesToExport = allDevices.filter(d => selectedExportIds.has(d.id));
      const blob = new Blob([JSON.stringify(devicesToExport, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device-external-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success(`${devicesToExport.length} device(s) exported successfully`);

    } catch (error) {
      console.error('Export error:', error);
      showToast.error('Export failed');
    }
  }, [selectedExportIds, allDevices]);

  const toggleExportDeviceSelection = (id: string) => {
    setSelectedExportIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAllExport = (checked: boolean) => {
    if (checked) {
      setSelectedExportIds(new Set(allDevices.map(d => d.id)));
    } else {
      setSelectedExportIds(new Set());
    }
  };

  const handleDeviceSelection = useCallback((index: number, checked: boolean) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!previewData) return;

    if (checked) {
      const selectableIndices = previewData.items
        .map((item, index) => {
          // In skip duplicates mode, only select valid ones
          // In update or replace mode, everything can be selected (since they will be updated or replaced)
          if (importMode === 'add_only') {
            return item.status === 'valid' ? index : -1;
          }
          return item.status !== 'invalid' ? index : -1;
        })
        .filter(index => index !== -1);
      setSelectedDevices(new Set(selectableIndices));
    } else {
      setSelectedDevices(new Set());
    }
  }, [previewData, importMode]);

  const getStatusBadge = (status: PreviewItem['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Ready</Badge>;
      case 'duplicate_topic':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Topic Exists</Badge>;
      case 'duplicate_uniqId':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />ID Exists</Badge>;
      case 'duplicate_name':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200"><AlertCircle className="w-3 h-3 mr-1" />Name Exists</Badge>;
      case 'invalid':
        return <Badge variant="destructive" className="bg-gray-100 text-gray-800 border-gray-200"><XCircle className="w-3 h-3 mr-1" />Invalid</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getImportModeDescription = (mode: ImportMode) => {
    switch (mode) {
      case 'add_only':
        return 'Add new devices only (skip duplicates)';
      case 'update_existing':
        return 'Update existing devices, add new ones';
      case 'replace_all':
        return 'Replace all existing devices (dangerous!)';
      default:
        return '';
    }
  };

  const resetImportState = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setSelectedDevices(new Set());
    setImportMode('add_only');
    setIsLoading(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
          <Upload className="w-4 h-4 mr-2" />
          Import/Export Devices
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Device Data Import/Export</DialogTitle>
          <DialogDescription>
            Import device configurations from JSON file or export all existing devices.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'import' | 'export')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="import" onClick={resetImportState}>Import Devices</TabsTrigger>
            <TabsTrigger value="export">Export All Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="flex-1 overflow-y-auto flex flex-col gap-4 mt-4">
            {/* Step 1: Select File */}
            <div className="border rounded-lg p-4 space-y-4 bg-card">
              <div className="space-y-1">
                <Label className="text-base font-medium">Step 1: Select Device JSON File</Label>
                <p className="text-sm text-muted-foreground">Choose a JSON export file to import devices</p>
              </div>

              <div className="flex items-center space-x-3 mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  disabled={isLoading || isImporting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {selectedFile && (
                  <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium truncate max-w-24">{selectedFile.name}</span>
                  </div>
                )}
                {selectedFile && !previewData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetImportState}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Supported format: JSON export files only (max 10MB)
              </p>
            </div>

            {/* Step 2: Preview Button */}
            {selectedFile && !previewData && (
              <div className="border rounded-lg p-4 bg-card">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Step 2: Analyze Import</Label>
                  <Button
                    onClick={handlePreview}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing Device...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Preview Import
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Import Preview and Selection */}
            {previewData && (
              <>
                {/* Import Mode Selection */}
                <div className="border rounded-lg p-4 space-y-4 bg-card">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Import Strategy</Label>
                    <p className="text-sm text-muted-foreground">Choose how to handle existing devices</p>
                  </div>

                  <RadioGroup value={importMode} onValueChange={(value: string) => setImportMode(value as ImportMode)}>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 border">
                        <RadioGroupItem value="add_only" id="add_only" className="mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="add_only" className="font-medium cursor-pointer">Skip Duplicates</Label>
                          <p className="text-xs text-muted-foreground mt-1">Skip devices that already exist with the same topic or uniqId. Only import new ones.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 border">
                        <RadioGroupItem value="update_existing" id="update_existing" className="mt-0.5" />
                        <div className="flex-1">
                          <Label htmlFor="update_existing" className="font-medium cursor-pointer">Update Existing</Label>
                          <p className="text-xs text-muted-foreground mt-1">Update existing devices with matching topic or uniqId. Create new devices for others.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 border border-destructive/20 bg-destructive/5">
                        <RadioGroupItem value="replace_all" id="replace_all" className="mt-0.5 text-destructive border-destructive" />
                        <div className="flex-1">
                          <Label htmlFor="replace_all" className="font-medium cursor-pointer text-destructive">Replace All</Label>
                          <p className="text-xs text-destructive mt-1">WARNING: This will delete ALL existing devices before importing. Use with extreme caution!</p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Device Preview and Selection */}
                <div className="border rounded-lg p-4 bg-card">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Device Import Preview</Label>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="text-center p-3 border rounded">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Total</div>
                        <div className="text-lg font-bold">{previewData.total}</div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Valid</div>
                        <div className="text-lg font-bold text-green-600">{previewData.valid}</div>
                      </div>
                      <div className="text-center p-3 border rounded text-destructive">
                        <div className="text-xs font-medium mb-1">Already Exists (Topic/ID)</div>
                        <div className="text-lg font-bold">
                          {previewData.duplicates.topic.length + previewData.duplicates.uniqId.length}
                        </div>
                      </div>
                      <div className="text-center p-3 border rounded text-orange-600">
                        <div className="text-xs font-medium mb-1">Already Exists (Name)</div>
                        <div className="text-lg font-bold">
                          {previewData.duplicates.name.length}
                        </div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Invalid</div>
                        <div className="text-lg font-bold text-gray-600">
                          {previewData.items.filter(item => item.status === 'invalid').length}
                        </div>
                      </div>
                    </div>

                    {/* Conflicts Summary */}
                    {(previewData.duplicates.topic.length > 0 ||
                      previewData.duplicates.uniqId.length > 0 ||
                      previewData.duplicates.name.length > 0) && (
                        <Alert className="border-yellow-200 dark:border-yellow-800">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-xs">
                            {previewData.duplicates.topic.length > 0 && (
                              <span>{previewData.duplicates.topic.length} topic conflict{previewData.duplicates.topic.length !== 1 ? 's' : ''}, </span>
                            )}
                            {previewData.duplicates.uniqId.length > 0 && (
                              <span>{previewData.duplicates.uniqId.length} uniqId conflict{previewData.duplicates.uniqId.length !== 1 ? 's' : ''}, </span>
                            )}
                            {previewData.duplicates.name.length > 0 && (
                              <span>{previewData.duplicates.name.length} name conflict{previewData.duplicates.name.length !== 1 ? 's' : ''}</span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                    {/* Device Selection Table */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">Device List</h4>
                        <Badge variant="outline">{previewData.items.length} devices</Badge>

                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant={previewFilter === 'all' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setPreviewFilter('all')}
                          >
                            All
                          </Button>
                          <Button
                            variant={previewFilter === 'valid' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 text-[10px] text-green-600"
                            onClick={() => setPreviewFilter('valid')}
                          >
                            Valid ({previewData.valid})
                          </Button>
                          <Button
                            variant={previewFilter === 'conflict' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 text-[10px] text-orange-600"
                            onClick={() => setPreviewFilter('conflict')}
                          >
                            Conflicts ({previewData.duplicates.topic.length + previewData.duplicates.uniqId.length + previewData.duplicates.name.length})
                          </Button>
                          <Button
                            variant={previewFilter === 'invalid' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 text-[10px] text-gray-500"
                            onClick={() => setPreviewFilter('invalid')}
                          >
                            Invalid ({previewData.items.filter(i => i.status === 'invalid').length})
                          </Button>
                        </div>
                      </div>
                      {previewData.items.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all-valid"
                            checked={
                              previewData.items.length > 0 &&
                              previewData.items.every((item, idx) => {
                                if (importMode === 'add_only') {
                                  return item.status !== 'valid' || selectedDevices.has(idx);
                                }
                                return item.status === 'invalid' || selectedDevices.has(idx);
                              }) && selectedDevices.size > 0
                            }
                            onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                          />
                          <Label htmlFor="select-all-valid" className="text-sm font-medium">
                            Select All {importMode === 'add_only' ? 'Valid' : 'Selectable'}
                          </Label>
                        </div>
                      )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  previewData.items.length > 0 &&
                                  previewData.items.every((item, idx) => {
                                    if (importMode === 'add_only') {
                                      return item.status !== 'valid' || selectedDevices.has(idx);
                                    }
                                    return item.status === 'invalid' || selectedDevices.has(idx);
                                  }) && selectedDevices.size > 0
                                }
                                onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                              />
                            </TableHead>
                            <TableHead className="w-48">Device Name</TableHead>
                            <TableHead className="w-64">Topic</TableHead>
                            <TableHead className="w-32">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const filteredItems = previewData.items
                              .map((item, index) => ({ ...item, originalIndex: index }))
                              .filter(item => {
                                if (previewFilter === 'all') return true;
                                if (previewFilter === 'valid') return item.status === 'valid';
                                if (previewFilter === 'conflict') return ['duplicate_topic', 'duplicate_uniqId', 'duplicate_name'].includes(item.status);
                                if (previewFilter === 'invalid') return item.status === 'invalid';
                                return true;
                              });

                            if (filteredItems.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No devices match the selected filter
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return filteredItems.map((item) => (
                              <TableRow key={item.originalIndex} className={item.status !== 'valid' ? 'opacity-75' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedDevices.has(item.originalIndex)}
                                    onCheckedChange={(checked: boolean) => handleDeviceSelection(item.originalIndex, checked)}
                                    disabled={importMode === 'add_only' ? item.status !== 'valid' : item.status === 'invalid'}
                                  />
                                </TableCell>
                                <TableCell className="font-medium truncate" title={item.data.name}>
                                  <div className="flex items-center gap-2">
                                    {item.data.name}
                                    {item.status === 'duplicate_name' && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1 bg-orange-50 text-orange-600 border-orange-200">EXISTING</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs truncate" title={item.data.topic}>
                                  <div className="flex items-center gap-2">
                                    {item.data.topic}
                                    {item.status === 'duplicate_topic' && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-50 text-red-600 border-red-200">EXISTING</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {getStatusBadge(item.status)}
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="export" className="overflow-y-auto flex flex-col gap-4 mt-4 min-h-0">
            <div className="border rounded-lg p-4 bg-card flex flex-col min-h-0">
              <div className="space-y-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Export Device Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Select devices to export to JSON file.
                    </p>
                  </div>
                  <Button
                    onClick={handleExport}
                    disabled={selectedExportIds.size === 0 || exportLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export {selectedExportIds.size} Selected
                  </Button>
                </div>

                <div className="space-y-2 flex flex-col min-h-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-export"
                        checked={allDevices.length > 0 && selectedExportIds.size === allDevices.length}
                        onCheckedChange={(checked) => handleSelectAllExport(!!checked)}
                      />
                      <Label htmlFor="select-all-export" className="text-xs font-medium cursor-pointer">
                        Select All ({allDevices.length})
                      </Label>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedExportIds.size} of {allDevices.length} selected
                    </Badge>
                  </div>

                  <div className="border rounded-md overflow-hidden flex-1 min-h-[300px] flex flex-col">
                    <div className="overflow-y-auto flex-1">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="w-12">Select</TableHead>
                            <TableHead>Device Name</TableHead>
                            <TableHead>Topic</TableHead>
                            <TableHead className="hidden md:table-cell">Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exportLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell colSpan={4} className="h-10 animate-pulse bg-muted/20" />
                              </TableRow>
                            ))
                          ) : allDevices.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                No devices found to export.
                              </TableCell>
                            </TableRow>
                          ) : (
                            allDevices.map((device) => (
                              <TableRow
                                key={device.id}
                                className="hover:bg-muted/30 cursor-pointer"
                                onClick={() => toggleExportDeviceSelection(device.id)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedExportIds.has(device.id)}
                                    onCheckedChange={() => toggleExportDeviceSelection(device.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{device.name}</TableCell>
                                <TableCell className="font-mono text-xs">{device.topic}</TableCell>
                                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                                  {device.address || "-"}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <Alert className="bg-muted/50 border-muted">
                  <Download className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This JSON file can be used to import these devices into another system or as a backup.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0">
          <div className="flex flex-col w-full gap-4">
            {/* Alert Information */}
            {activeTab === 'import' && previewData && selectedDevices.size === 0 && (
              <Alert className="border-destructive">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  Please select at least one device to import. No valid devices selected.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              {activeTab === 'import' && previewData && selectedDevices.size > 0 && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  {selectedDevices.size} device{selectedDevices.size !== 1 ? 's' : ''} selected for import
                </div>
              )}

              <div className="flex space-x-2 ml-auto">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>

                {activeTab === 'import' && previewData && selectedDevices.size > 0 && (
                  <Button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isImporting ? 'Importing...' : `Import ${selectedDevices.size} Selected Devices`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  );
}
