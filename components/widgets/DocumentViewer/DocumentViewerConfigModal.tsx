"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { showToast } from "@/lib/toast-utils";
import {
  FileText,
  Settings,
  Palette,
  Download,
  ZoomIn,
  RotateCw,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const DocumentViewerConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // Form state
  const [config, setConfig] = useState({
    customName: "",
    // Document configuration
    documentUrl: "",
    documentTitle: "",
    showDownload: true,
    showZoom: true,
    showRotate: false,
    defaultZoom: 100,
    // Layout configuration
    padding: 'md' as 'sm' | 'md' | 'lg' | 'xl',
    backgroundColor: '',
    borderRadius: 'lg' as 'none' | 'sm' | 'md' | 'lg' | 'xl',
    shadow: 'sm' as 'none' | 'sm' | 'md' | 'lg' | 'xl',
  });

  // Edit mode handling
  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig(initialConfig);
    } else if (isOpen) {
      // Reset for create mode
      setConfig({
        customName: "",
        documentUrl: "",
        documentTitle: "",
        showDownload: true,
        showZoom: true,
        showRotate: false,
        defaultZoom: 100,
        padding: 'md',
        backgroundColor: '',
        borderRadius: 'lg',
        shadow: 'sm',
      });
    }
  }, [isOpen, initialConfig]);

  // Get file extension for supported formats check
  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toLowerCase() || '';
  };

  const getSupportedFormats = () => {
    return ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  };

  const isSupportedFormat = (url: string) => {
    const ext = getFileExtension(url);
    return getSupportedFormats().includes(ext);
  };

  // Validation and save
  const handleSave = () => {
    if (!config.customName.trim()) {
      showToast.error("Widget Name is required");
      return;
    }

    if (!config.documentUrl.trim()) {
      showToast.error("Document URL is required");
      return;
    }

    // Validate URL format
    try {
      new URL(config.documentUrl);
    } catch {
      showToast.error("Please enter a valid document URL");
      return;
    }

    // Check if format is supported
    if (!isSupportedFormat(config.documentUrl)) {
      const supported = getSupportedFormats().join(', ');
      showToast.warning(`File format may not be supported. Supported formats: ${supported}`);
    }

    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {initialConfig ? "Edit" : "Configure"} Document Viewer Widget
          </DialogTitle>
          <DialogDescription>
            Display documents with zoom, rotation, and download capabilities.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="customName">Widget Name *</Label>
                  <Input
                    id="customName"
                    value={config.customName}
                    onChange={(e) => setConfig({...config, customName: e.target.value})}
                    placeholder="e.g., User Manual"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="documentTitle">Document Title</Label>
                  <Input
                    id="documentTitle"
                    value={config.documentTitle}
                    onChange={(e) => setConfig({...config, documentTitle: e.target.value})}
                    placeholder="Optional document title"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="document" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Document Source
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="documentUrl">Document URL *</Label>
                  <Input
                    id="documentUrl"
                    value={config.documentUrl}
                    onChange={(e) => setConfig({...config, documentUrl: e.target.value})}
                    placeholder="https://example.com/document.pdf"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
                  </p>
                </div>

                {config.documentUrl && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        isSupportedFormat(config.documentUrl) ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {isSupportedFormat(config.documentUrl) ? 'Supported Format' : 'Format May Not Be Supported'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Extension: {getFileExtension(config.documentUrl).toUpperCase()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Default View Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Default Zoom Level: {config.defaultZoom}%</Label>
                  <Slider
                    value={[config.defaultZoom]}
                    onValueChange={(value) => setConfig({...config, defaultZoom: value[0]})}
                    min={50}
                    max={200}
                    step={25}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50%</span>
                    <span>200%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Viewer Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="font-medium mb-2">Available Controls:</h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ZoomIn className="w-4 h-4" />
                          <span>Zoom Controls</span>
                        </div>
                        <Switch
                          checked={config.showZoom}
                          onCheckedChange={(checked) => setConfig({...config, showZoom: checked})}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RotateCw className="w-4 h-4" />
                          <span>Rotation Control</span>
                        </div>
                        <Switch
                          checked={config.showRotate}
                          onCheckedChange={(checked) => setConfig({...config, showRotate: checked})}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          <span>Download Button</span>
                        </div>
                        <Switch
                          checked={config.showDownload}
                          onCheckedChange={(checked) => setConfig({...config, showDownload: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Controls appear as a toolbar overlay on the document.
                      Zoom controls allow 50%-300% scaling. Rotation rotates by 90-degree increments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Layout & Styling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Padding</Label>
                    <Select value={config.padding} onValueChange={(value: any) => setConfig({...config, padding: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Border Radius</Label>
                    <Select value={config.borderRadius} onValueChange={(value: any) => setConfig({...config, borderRadius: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Shadow</Label>
                    <Select value={config.shadow} onValueChange={(value: any) => setConfig({...config, shadow: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Background Color</Label>
                    <Input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {initialConfig ? "Update" : "Save"} Document Viewer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
