"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  FileInput,
  Network,
  RotateCcw,
  AlertTriangle,
  MapPin,
  Building,
  Server
} from "lucide-react";
import { showToast } from "@/lib/toast-utils";

interface GatewayDashboardImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  createdLocations: number;
  updatedLocations: number;
  createdClients: number;
  errors: string[];
  warnings: string[];
}

interface DashboardPreviewItem {
  data: any;
  status: 'valid' | 'duplicate_name' | 'user_not_found' | 'invalid_data' | 'missing_required';
  warnings: LocationValidation;
  relatedItems: {
    locationValidated: boolean;
    locationCount: number;
    potentialIssues: string[];
    clientReferences: string[];
  };
}

interface LocationValidation {
  devicesNotFound: string[];
  layoutIssues: string[];
}

interface DashboardPreviewResult {
  total: number;
  valid: number;
  dashboards: DashboardPreviewItem[];
  summary: {
    totalLocations: number;
    clientReferences: number;
    layoutWarnings: string[];
  };
}

type ImportMode = 'skip_duplicates' | 'replace_existing' | 'create_new_only';

export default function GatewayDashboardImportExportDialog({
  open,
  onOpenChange,
  onImportSuccess
}: GatewayDashboardImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<DashboardPreviewResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('skip_duplicates');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePreview = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const fileContent = await selectedFile.text();
      const jsonData = JSON.parse(fileContent);
      let dashboards: any[] = [];

      // Handle different export formats
      if (jsonData.dashboard && jsonData.metadata) {
        // Individual dashboard export format: {dashboard: {...}, user: {...}, metadata: {...}}
        let locationsData = jsonData.locations;

        // Locations should already be an array, but handle string format for compatibility
        if (typeof locationsData === 'string') {
          try {
            locationsData = JSON.parse(locationsData);
          } catch (parseError) {
            locationsData = [];
          }
        }

        // Extract client names from nested client objects
        const processedLocations = (locationsData || []).map((location: any) => ({
          ...location,
          clientName: location.client?.name || location.clientName
        }));

        dashboards = [{
          name: jsonData.dashboard.name,
          description: jsonData.dashboard.description,
          isUse: jsonData.dashboard.isUse || false,
          isActive: jsonData.dashboard.isActive || true,
          clientEmail: jsonData.user?.email || 'unknown@example.com',
          locations: processedLocations
        }];
      } else if (jsonData.dashboards && Array.isArray(jsonData.dashboards)) {
        // Bulk export format: {metadata: {...}, dashboards: [...], ...}
        dashboards = jsonData.dashboards.map((dashboardData: any) => {
          let locationsData = dashboardData.locations;

          // Handle locations format (should be array already)
          if (typeof locationsData === 'string') {
            try {
              locationsData = JSON.parse(locationsData);
            } catch (parseError) {
              locationsData = [];
            }
          }

          // Extract client names from nested client objects
          const processedLocations = (locationsData || []).map((location: any) => ({
            ...location,
            clientName: location.client?.name || location.clientName
          }));

          return {
            name: dashboardData.name,
            description: dashboardData.description,
            isUse: dashboardData.isUse || false,
            isActive: dashboardData.isActive || true,
            clientEmail: jsonData.metadata?.clientEmail || 'unknown@example.com',
            locations: processedLocations
          };
        });
      } else if (Array.isArray(jsonData)) {
        // Raw array format for backward compatibility
        dashboards = jsonData.map((item: any) => {
          let locationsData = item.locations;

          if (typeof locationsData === 'string') {
            try {
              locationsData = JSON.parse(locationsData);
            } catch (parseError) {
              locationsData = [];
            }
          }

          // Extract client names from nested client objects
          const processedLocations = (locationsData || []).map((location: any) => ({
            ...location,
            clientName: location.client?.name || location.clientName
          }));

          return {
            name: item.name,
            description: item.description,
            isUse: item.isUse || false,
            isActive: item.isActive || true,
            clientEmail: item.clientEmail,
            locations: processedLocations
          };
        });
      } else if (jsonData.name && jsonData.clientEmail) {
        // Single raw dashboard format without wrapper
        let locationsData = jsonData.locations;

        if (typeof locationsData === 'string') {
          try {
            locationsData = JSON.parse(locationsData);
          } catch (parseError) {
            locationsData = [];
          }
        }

        dashboards = [{
          name: jsonData.name,
          description: jsonData.description,
          isUse: jsonData.isUse || false,
          isActive: jsonData.isActive || true,
          clientEmail: jsonData.clientEmail || 'unknown@example.com',
          locations: locationsData || []
        }];
      } else {
        throw new Error('Invalid dashboard file format. Expected exported dashboard JSON file.');
      }

      const response = await fetch('/api/gateway-dashboards/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboards),
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const result: DashboardPreviewResult = await response.json();
      setPreviewData(result);
    } catch (error) {
      console.error('Preview error:', error);
      showToast.error(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile]);

  const resetImportState = useCallback(() => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportMode('skip_duplicates');
    setImportResult(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDialogClose = useCallback((newOpenState: boolean) => {
    if (!newOpenState) {
      resetImportState();
    }
    onOpenChange(newOpenState);
  }, [onOpenChange, resetImportState]);

  const performImport = useCallback(async () => {
    if (!selectedFile || !previewData || previewData.dashboards.length === 0) return;

    const dashboardsToImport = previewData.dashboards
      .filter(dashboard => previewData.valid > 0 ? dashboard.status === 'valid' : true)
      .map(dashboard => dashboard.data);

    if (dashboardsToImport.length === 0) {
      showToast.error('No valid dashboard to import');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/gateway-dashboards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboards: dashboardsToImport,
          mode: importMode,
          createMissingClients: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult(result);

      if (result.success || result.created > 0) {
        showToast.success(`Import completed: ${result.created || 0} created, ${result.updated || 0} updated`);
        onImportSuccess?.();
      } else {
        showToast.warning('Import completed with issues');
      }

      handleDialogClose(false);
      setSelectedFile(null);
      setPreviewData(null);
    } catch (error) {
      console.error('Import error:', error);
      showToast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, previewData, importMode, onImportSuccess, handleDialogClose]);

  const getStatusBadge = (status: DashboardPreviewItem['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Valid</Badge>;
      case 'duplicate_name':
        return <Badge variant="destructive">Name Conflict</Badge>;
      case 'user_not_found':
        return <Badge variant="destructive">User Not Found</Badge>;
      case 'invalid_data':
        return <Badge variant="secondary">Data Issues</Badge>;
      case 'missing_required':
        return <Badge variant="destructive">Missing Required</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Drag & drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.json')) {
        showToast.error('Invalid file type', 'Please select a JSON file.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast.error('File too large', 'Please select a file smaller than 10MB.');
        return;
      }

      showToast.success('File selected', `Selected: ${file.name}`);
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.json')) {
        showToast.error('Invalid file type', 'Please select a JSON file.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast.error('File too large', 'Please select a file smaller than 10MB.');
        return;
      }

      showToast.success('File selected', `Selected: ${file.name}`);
      setSelectedFile(file);
    }
  }, []);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Gateway Client Dashboards</DialogTitle>
          <DialogDescription>
            Import dashboard configurations with validation and preview.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* File Selection */}
          <div className="border rounded-lg p-4 space-y-4 bg-card">
            <div className="space-y-1">
              <Label className="text-base font-medium">Step 1: Select Dashboard File</Label>
              <p className="text-sm text-muted-foreground">Choose a JSON export file to import</p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {selectedFile && (
                <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium truncate max-w-24">{selectedFile.name}</span>
                </div>
              )}
            </div>

            {/* Drag & Drop Alternative */}
            {!selectedFile && (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">Or drag and drop your JSON file here</p>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`transition-colors p-4 rounded ${dragActive ? 'bg-muted/50' : ''}`}
                >
                  <p className="text-xs text-muted-foreground">Drop file here to select</p>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Supported format: JSON export files only (max 10MB)
            </p>
          </div>

          {/* Preview Button */}
          {selectedFile && !previewData && (
            <div className="border rounded-lg p-4 bg-card">
              <div className="space-y-3">
                <Label className="text-base font-medium">Step 2: Validate Import</Label>
                <Button
                  onClick={handlePreview}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validating Dashboard Data...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Preview & Validate
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Dashboard Preview */}
          {previewData && (
            <>
              <div className="border rounded-lg p-4 space-y-4 bg-card">
                <Label className="text-base font-medium">Dashboard Preview & Validation</Label>

                {previewData.dashboards.map((dashboard, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{dashboard.data.name}</span>
                          {getStatusBadge(dashboard.status)}
                        </div>
                        {dashboard.data.description && (
                          <p className="text-sm text-muted-foreground">{dashboard.data.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          User: {dashboard.data.clientEmail}
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 border rounded">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Locations</div>
                        <MapPin className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-lg font-bold">{dashboard.relatedItems.locationCount}</div>
                        <div className="text-xs text-muted-foreground">
                          total locations
                        </div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Clients</div>
                        <Building className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-lg font-bold">{dashboard.relatedItems.clientReferences.length}</div>
                        <div className="text-xs text-muted-foreground">
                          linked clients
                        </div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Validation</div>
                        {dashboard.relatedItems.locationValidated ? (
                          <CheckCircle className="w-4 h-4 mx-auto mb-1 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
                        )}
                        <div className={dashboard.relatedItems.locationValidated ? 'text-sm text-green-600 dark:text-green-400' : 'text-sm text-yellow-600 dark:text-yellow-400'}>
                          {dashboard.relatedItems.locationValidated ? 'Valid' : `${dashboard.relatedItems.potentialIssues.length} issues`}
                        </div>
                      </div>
                    </div>

                    {/* Location Types - if available */}
                    {dashboard.relatedItems.locationCount > 0 && dashboard.relatedItems.clientReferences.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="text-sm font-medium mb-2">Network Overview</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-orange-50 text-orange-700 border border-orange-200 rounded px-2 py-1 text-center">
                            Servers Available
                          </div>
                          <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 text-center">
                            Gateway Locations
                          </div>
                          <div className="bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-1 text-center">
                            {dashboard.relatedItems.clientReferences.length} Clients Linked
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Issues */}
                    {(dashboard.warnings.layoutIssues.length > 0 || dashboard.relatedItems.potentialIssues.length > 0) && (
                      <Alert className="border-yellow-200 dark:border-yellow-800">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-xs">
                          <strong>Validation Issues:</strong>
                          <ul className="mt-1 text-xs">
                            {[...dashboard.warnings.layoutIssues, ...dashboard.relatedItems.potentialIssues].map((issue, idx) => (
                              <li key={idx}>• {issue}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>

              {/* Import Strategy */}
              <div className="border rounded-lg p-4 space-y-4 bg-card">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Import Strategy</Label>
                  <p className="text-sm text-muted-foreground">Choose how to handle existing dashboards</p>
                </div>

                <RadioGroup value={importMode} onValueChange={(value) => setImportMode(value as ImportMode)}>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 border">
                      <RadioGroupItem value="skip_duplicates" id="skip_duplicates" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="skip_duplicates" className="font-medium cursor-pointer">Skip Duplicates</Label>
                        <p className="text-xs text-muted-foreground mt-1">Skip dashboards that already exist with the same name. Only import new ones.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 border">
                      <RadioGroupItem value="replace_existing" id="replace_existing" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="replace_existing" className="font-medium cursor-pointer">Replace Existing</Label>
                        <p className="text-xs text-muted-foreground mt-1">Replace existing dashboards with the same name. All locations will be recreated.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 border">
                      <RadioGroupItem value="create_new_only" id="create_new_only" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="create_new_only" className="font-medium cursor-pointer">Create New Only</Label>
                        <p className="text-xs text-muted-foreground mt-1">Always create new dashboards, automatically renaming if conflicts occur.</p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                <div className="pt-4 border-t">
                  <Button
                    onClick={performImport}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing Dashboards...
                      </>
                    ) : (
                      `Import ${previewData.dashboards.length} Dashboard${previewData.dashboards.length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="border rounded-lg p-4 space-y-4 bg-card">
              <div className="flex items-center gap-2">
                {(importResult.created > 0 || importResult.updated > 0) ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-medium">
                  {(importResult.created > 0 || importResult.updated > 0) ? 'Import Completed' : 'Import Failed'}
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-muted/50 rounded p-3 text-center">
                  <p className="font-semibold text-lg">{importResult.created}</p>
                  <p className="text-muted-foreground">Dashboards Created</p>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <p className="font-semibold text-lg">{importResult.updated}</p>
                  <p className="text-muted-foreground">Dashboards Updated</p>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <p className="font-semibold text-lg">{importResult.createdLocations}</p>
                  <p className="text-muted-foreground">Locations Created</p>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <p className="font-semibold text-lg">{importResult.createdClients}</p>
                  <p className="text-muted-foreground">Clients Created</p>
                </div>
              </div>

              {importResult.warnings.length > 0 && (
                <Alert className="border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-xs">
                    <strong>{importResult.warnings.length} Warnings:</strong>
                    <ul className="mt-1 list-disc pl-4 text-xs">
                      {importResult.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errors.length > 0 && (
                <Alert className="border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-xs">
                    <strong>{importResult.errors.length} Errors:</strong>
                    <ul className="mt-1 list-disc pl-4 text-xs">
                      {importResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            {previewData && !importResult && !isProcessing && (
              <Button
                variant="ghost"
                onClick={resetImportState}
                className="mr-2"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
