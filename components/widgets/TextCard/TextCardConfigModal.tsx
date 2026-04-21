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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { showToast } from "@/lib/toast-utils";
import {
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  Layout,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const TextCardConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // Form state
  const [config, setConfig] = useState({
    customName: "",
    // Header configuration
    showHeader: false,
    headerText: "",
    headerSize: 'lg' as 'sm' | 'md' | 'lg' | 'xl',
    headerColor: '#1f2937',
    headerAlign: 'center' as 'left' | 'center' | 'right',
    // Content configuration
    contentText: "",
    contentSize: 'md' as 'sm' | 'md' | 'lg' | 'xl',
    contentColor: '#374151',
    contentAlign: 'center' as 'left' | 'center' | 'right',
    // Footer configuration
    showFooter: false,
    footerText: "",
    footerSize: 'sm' as 'sm' | 'md' | 'lg' | 'xl',
    footerColor: '#6b7280',
    footerAlign: 'center' as 'left' | 'center' | 'right',
    // Image configuration
    showImage: false,
    imageUrl: "",
    imageAlt: "",
    imagePosition: 'top' as 'top' | 'bottom' | 'left' | 'right',
    imageSize: 'md' as 'sm' | 'md' | 'lg' | 'xl',
    imageFit: 'cover' as 'cover' | 'contain' | 'fill' | 'none' | 'scale-down',
    // Links configuration
    showLinks: false,
    links: [] as Array<{
      id: string;
      text: string;
      url: string;
      openInNewTab: boolean;
      style: 'button' | 'text' | 'underline';
      color: string;
    }>,
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
        showHeader: false,
        headerText: "",
        headerSize: 'lg',
        headerColor: '#1f2937',
        headerAlign: 'center',
        contentText: "",
        contentSize: 'md',
        contentColor: '#374151',
        contentAlign: 'center',
        showFooter: false,
        footerText: "",
        footerSize: 'sm',
        footerColor: '#6b7280',
        footerAlign: 'center',
        showImage: false,
        imageUrl: "",
        imageAlt: "",
        imagePosition: 'top',
        imageSize: 'md',
        imageFit: 'cover',
        showLinks: false,
        links: [],
        padding: 'md',
        backgroundColor: '',
        borderRadius: 'lg',
        shadow: 'sm',
      });
    }
  }, [isOpen, initialConfig]);

  // Add new link
  const addLink = () => {
    const newLink = {
      id: Date.now().toString(),
      text: "",
      url: "",
      openInNewTab: false,
      style: 'button' as 'button' | 'text' | 'underline',
      color: '#3b82f6',
    };
    setConfig(prev => ({
      ...prev,
      links: [...prev.links, newLink]
    }));
  };

  // Remove link
  const removeLink = (id: string) => {
    setConfig(prev => ({
      ...prev,
      links: prev.links.filter(link => link.id !== id)
    }));
  };

  // Update link
  const updateLink = (id: string, updates: Partial<typeof config.links[0]>) => {
    setConfig(prev => ({
      ...prev,
      links: prev.links.map(link =>
        link.id === id ? { ...link, ...updates } : link
      )
    }));
  };

  // Validation and save
  const handleSave = () => {
    if (!config.customName.trim()) {
      showToast.error("Widget Name is required");
      return;
    }

    if (!config.contentText.trim()) {
      showToast.error("Content text is required");
      return;
    }

    // Validate links
    if (config.showLinks && config.links.length > 0) {
      for (const link of config.links) {
        if (!link.text.trim() || !link.url.trim()) {
          showToast.error("All links must have text and URL");
          return;
        }
      }
    }

    // Validate image
    if (config.showImage && !config.imageUrl.trim()) {
      showToast.error("Image URL is required when image is enabled");
      return;
    }

    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            {initialConfig ? "Edit" : "Configure"} Text Card Widget
          </DialogTitle>
          <DialogDescription>
            Create dynamic content cards with text, images, and links. All features can be enabled/disabled.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
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
                    placeholder="e.g., Welcome Message"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {/* Header Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Header
                  <Switch
                    checked={config.showHeader}
                    onCheckedChange={(checked) => setConfig({...config, showHeader: checked})}
                  />
                </CardTitle>
              </CardHeader>
              {config.showHeader && (
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="headerText">Header Text</Label>
                    <Input
                      id="headerText"
                      value={config.headerText}
                      onChange={(e) => setConfig({...config, headerText: e.target.value})}
                      placeholder="Enter header text"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Size</Label>
                      <Select value={config.headerSize} onValueChange={(value: any) => setConfig({...config, headerSize: value})}>
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
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={config.headerColor}
                        onChange={(e) => setConfig({...config, headerColor: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Alignment</Label>
                      <Select value={config.headerAlign} onValueChange={(value: any) => setConfig({...config, headerAlign: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Content Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Main Content (Required)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="contentText">Content Text *</Label>
                  <Textarea
                    id="contentText"
                    value={config.contentText}
                    onChange={(e) => setConfig({...config, contentText: e.target.value})}
                    placeholder="Enter your main content here. Supports line breaks."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Size</Label>
                    <Select value={config.contentSize} onValueChange={(value: any) => setConfig({...config, contentSize: value})}>
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
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={config.contentColor}
                      onChange={(e) => setConfig({...config, contentColor: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Alignment</Label>
                    <Select value={config.contentAlign} onValueChange={(value: any) => setConfig({...config, contentAlign: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Footer
                  <Switch
                    checked={config.showFooter}
                    onCheckedChange={(checked) => setConfig({...config, showFooter: checked})}
                  />
                </CardTitle>
              </CardHeader>
              {config.showFooter && (
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="footerText">Footer Text</Label>
                    <Input
                      id="footerText"
                      value={config.footerText}
                      onChange={(e) => setConfig({...config, footerText: e.target.value})}
                      placeholder="Enter footer text"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Size</Label>
                      <Select value={config.footerSize} onValueChange={(value: any) => setConfig({...config, footerSize: value})}>
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
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={config.footerColor}
                        onChange={(e) => setConfig({...config, footerColor: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Alignment</Label>
                      <Select value={config.footerAlign} onValueChange={(value: any) => setConfig({...config, footerAlign: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image
                  <Switch
                    checked={config.showImage}
                    onCheckedChange={(checked) => setConfig({...config, showImage: checked})}
                  />
                </CardTitle>
              </CardHeader>
              {config.showImage && (
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="imageUrl">Image URL *</Label>
                    <Input
                      id="imageUrl"
                      value={config.imageUrl}
                      onChange={(e) => setConfig({...config, imageUrl: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="imageAlt">Alt Text</Label>
                    <Input
                      id="imageAlt"
                      value={config.imageAlt}
                      onChange={(e) => setConfig({...config, imageAlt: e.target.value})}
                      placeholder="Describe the image"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Position</Label>
                      <Select value={config.imagePosition} onValueChange={(value: any) => setConfig({...config, imagePosition: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Size</Label>
                      <Select value={config.imageSize} onValueChange={(value: any) => setConfig({...config, imageSize: value})}>
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
                  </div>
                  <div className="grid gap-2">
                    <Label>Object Fit</Label>
                    <Select value={config.imageFit} onValueChange={(value: any) => setConfig({...config, imageFit: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="scale-down">Scale Down</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Links
                  <Switch
                    checked={config.showLinks}
                    onCheckedChange={(checked) => setConfig({...config, showLinks: checked})}
                  />
                </CardTitle>
              </CardHeader>
              {config.showLinks && (
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Links</Label>
                    <Button onClick={addLink} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Link
                    </Button>
                  </div>

                  {config.links.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No links added yet. Click "Add Link" to create your first link.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {config.links.map((link, index) => (
                        <Card key={link.id} className="border">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-3">
                              <Badge variant="outline">Link {index + 1}</Badge>
                              <Button
                                onClick={() => removeLink(link.id)}
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="grid gap-2">
                                <Label>Link Text</Label>
                                <Input
                                  value={link.text}
                                  onChange={(e) => updateLink(link.id, { text: e.target.value })}
                                  placeholder="Button text"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>URL</Label>
                                <Input
                                  value={link.url}
                                  onChange={(e) => updateLink(link.id, { url: e.target.value })}
                                  placeholder="https://example.com"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="grid gap-2">
                                <Label>Style</Label>
                                <Select
                                  value={link.style}
                                  onValueChange={(value: any) => updateLink(link.id, { style: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="button">Button</SelectItem>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="underline">Underline</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Color</Label>
                                <Input
                                  type="color"
                                  value={link.color}
                                  onChange={(e) => updateLink(link.id, { color: e.target.value })}
                                />
                              </div>
                              <div className="flex items-center space-x-2 pt-8">
                                <Switch
                                  checked={link.openInNewTab}
                                  onCheckedChange={(checked) => updateLink(link.id, { openInNewTab: checked })}
                                />
                                <Label className="text-sm">New Tab</Label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layout className="w-4 h-4" />
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
            {initialConfig ? "Update" : "Save"} Text Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
