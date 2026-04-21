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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/lib/toast-utils";
import { Palette, Image as ImageIcon } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const ImageDisplayConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [config, setConfig] = useState({
    customName: "",
    imageUrl: "",
    fitMode: "contain" as "contain" | "cover" | "fill" | "scale-down",
    borderRadius: "lg" as "none" | "sm" | "md" | "lg" | "xl",
    borderWidth: 0,
    borderColor: "#000000",
    backgroundColor: "#ffffff",
  });

  const [isTransparent, setIsTransparent] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig(initialConfig);
      // Check if background is transparent
      setIsTransparent(initialConfig.backgroundColor === "transparent");
      setImagePreviewError(false);
    } else if (isOpen) {
      setConfig({
        customName: "",
        imageUrl: "",
        fitMode: "contain",
        borderRadius: "lg",
        borderWidth: 0,
        borderColor: "#000000",
        backgroundColor: "#ffffff",
      });
      setIsTransparent(false);
      setImagePreviewError(false);
    }
  }, [isOpen, initialConfig]);

  const handleTransparentChange = (checked: boolean) => {
    setIsTransparent(checked);
    setConfig((prev) => ({
      ...prev,
      backgroundColor: checked ? "transparent" : "#ffffff",
    }));
  };

  const handleSave = () => {
    if (!config.imageUrl.trim()) {
      showToast.error("Please enter an image URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(config.imageUrl);
    } catch (e) {
      showToast.error("Please enter a valid URL");
      return;
    }

    onSave(config);
    showToast.success("Image display configuration saved");
  };

  const handleImagePreviewError = () => {
    setImagePreviewError(true);
  };

  const handleImagePreviewLoad = () => {
    setImagePreviewError(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Configure Image Display
          </DialogTitle>
          <DialogDescription>
            Set up the image URL and display options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customName">Widget Name</Label>
                <Input
                  id="customName"
                  placeholder="e.g., Server Room Camera"
                  value={config.customName}
                  onChange={(e) =>
                    setConfig({ ...config, customName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL *</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={config.imageUrl}
                  onChange={(e) => {
                    setConfig({ ...config, imageUrl: e.target.value });
                    setImagePreviewError(false);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a complete HTTP/HTTPS URL to your image
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Display Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fitMode">Fit Mode</Label>
                <Select value={config.fitMode} onValueChange={(value: any) => setConfig({ ...config, fitMode: value })}>
                  <SelectTrigger id="fitMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">
                      Contain (show entire image, may have padding)
                    </SelectItem>
                    <SelectItem value="cover">
                      Cover (fill space, may crop image)
                    </SelectItem>
                    <SelectItem value="fill">Fill (stretch to fit)</SelectItem>
                    <SelectItem value="scale-down">
                      Scale Down (show smaller or same size)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="borderRadius">Border Radius</Label>
                <Select
                  value={config.borderRadius}
                  onValueChange={(value: any) =>
                    setConfig({ ...config, borderRadius: value })
                  }
                >
                  <SelectTrigger id="borderRadius">
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
            </CardContent>
          </Card>

          {/* Border & Background */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Styling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="borderWidth">Border Width (pixels)</Label>
                <Input
                  id="borderWidth"
                  type="number"
                  min="0"
                  max="20"
                  value={config.borderWidth}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      borderWidth: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="borderColor">Border Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="borderColor"
                      type="color"
                      value={config.borderColor}
                      onChange={(e) =>
                        setConfig({ ...config, borderColor: e.target.value })
                      }
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={config.borderColor}
                      onChange={(e) =>
                        setConfig({ ...config, borderColor: e.target.value })
                      }
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="backgroundColor">Background Color</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="transparentBg" 
                        checked={isTransparent}
                        onCheckedChange={handleTransparentChange}
                      />
                      <label
                        htmlFor="transparentBg"
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Transparent
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={isTransparent ? "#ffffff" : config.backgroundColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          backgroundColor: e.target.value,
                        })
                      }
                      disabled={isTransparent}
                      className="w-12 h-10 p-1 cursor-pointer disabled:opacity-50"
                    />
                    <Input
                      type="text"
                      value={isTransparent ? "transparent" : config.backgroundColor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          backgroundColor: e.target.value,
                        })
                      }
                      disabled={isTransparent}
                      placeholder="#ffffff"
                      className="flex-1 disabled:opacity-50 disabled:bg-muted"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {config.imageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="w-full h-48 rounded border overflow-hidden flex items-center justify-center relative bg-grid-slate-100 dark:bg-grid-slate-900"
                  style={{
                    border:
                      config.borderWidth > 0
                        ? `${config.borderWidth}px solid ${config.borderColor}`
                        : "1px solid #e5e7eb",
                  }}
                >
                  {/* Checkerboard pattern for transparency visualization */}
                  {config.backgroundColor === 'transparent' && (
                    <div className="absolute inset-0 z-0 opacity-20" 
                         style={{ 
                           backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                           backgroundSize: '20px 20px',
                           backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' 
                         }} 
                    />
                  )}
                  
                  <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ backgroundColor: config.backgroundColor }}>
                    {imagePreviewError ? (
                      <div className="text-center text-red-500 text-sm">
                        Failed to load preview
                      </div>
                    ) : (
                      <img
                        src={config.imageUrl}
                        alt="Preview"
                        className={`w-full h-full object-${config.fitMode}`}
                        onLoad={handleImagePreviewLoad}
                        onError={handleImagePreviewError}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!config.imageUrl.trim()}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};