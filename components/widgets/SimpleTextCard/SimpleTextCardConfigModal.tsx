"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Layout, Palette, Type } from "lucide-react";
import {
  SimpleTextCardConfig,
  SimpleTextCardWidget,
} from "./SimpleTextCardWidget";

interface SimpleTextCardConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SimpleTextCardConfig) => void;
  initialConfig?: SimpleTextCardConfig;
}

const defaultConfig: SimpleTextCardConfig = {
  title: "",
  content: "Enter your text content here...",
  textColor: "#000000",
  backgroundColor: "#ffffff",
  fontSize: "md",
  fontWeight: "normal",
  textAlign: "left",
  padding: "md",
  borderRadius: "md",
  showBorder: true,
  borderColor: "#e5e7eb",
};

export function SimpleTextCardConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: SimpleTextCardConfigModalProps) {
  const [config, setConfig] = useState<SimpleTextCardConfig>(defaultConfig);
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    if (initialConfig) {
      setConfig({ ...defaultConfig, ...initialConfig });
    } else {
      setConfig(defaultConfig);
    }
    setContentError("");
  }, [initialConfig, isOpen]);

  const handleSave = () => {
    if (!config.content.trim()) {
      setContentError("Content is required");
      return;
    }
    onSave(config);
  };

  const updateConfig = <K extends keyof SimpleTextCardConfig>(
    key: K,
    value: SimpleTextCardConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    if (key === "content") setContentError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Simple Text Card
          </DialogTitle>
          <DialogDescription>
            Configure a clean text card with customizable styling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Live Preview — uses the real widget component */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[120px] rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <SimpleTextCardWidget config={config} />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="title">
                  Title{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="title"
                  placeholder="Card title..."
                  value={config.title || ""}
                  onChange={(e) => updateConfig("title", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="content">
                  Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  placeholder="Enter your text content..."
                  value={config.content}
                  onChange={(e) => updateConfig("content", e.target.value)}
                  rows={4}
                  className={`mt-1 ${contentError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {contentError ? (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {contentError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports line breaks and multi-line text.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Typography */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Font Size</Label>
                  <Select
                    value={config.fontSize ?? "md"}
                    onValueChange={(value: SimpleTextCardConfig["fontSize"]) =>
                      updateConfig("fontSize", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
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

                <div>
                  <Label>Font Weight</Label>
                  <Select
                    value={config.fontWeight ?? "normal"}
                    onValueChange={(
                      value: SimpleTextCardConfig["fontWeight"]
                    ) => updateConfig("fontWeight", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="semibold">Semi Bold</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Text Alignment</Label>
                  <Select
                    value={config.textAlign ?? "left"}
                    onValueChange={(value: SimpleTextCardConfig["textAlign"]) =>
                      updateConfig("textAlign", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="justify">Justify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Layout */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Layout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Padding</Label>
                  <Select
                    value={config.padding ?? "md"}
                    onValueChange={(value: SimpleTextCardConfig["padding"]) =>
                      updateConfig("padding", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Border Radius</Label>
                  <Select
                    value={config.borderRadius ?? "md"}
                    onValueChange={(
                      value: SimpleTextCardConfig["borderRadius"]
                    ) => updateConfig("borderRadius", value)}
                  >
                    <SelectTrigger className="mt-1">
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

                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="showBorder"
                    checked={config.showBorder ?? true}
                    onCheckedChange={(checked) =>
                      updateConfig("showBorder", checked)
                    }
                  />
                  <Label htmlFor="showBorder" className="cursor-pointer">
                    Show Border
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colors */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      id="textColor"
                      type="color"
                      value={config.textColor}
                      onChange={(e) =>
                        updateConfig("textColor", e.target.value)
                      }
                      className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={config.textColor}
                      onChange={(e) =>
                        updateConfig("textColor", e.target.value)
                      }
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="backgroundColor">Background</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      id="backgroundColor"
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) =>
                        updateConfig("backgroundColor", e.target.value)
                      }
                      className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={config.backgroundColor}
                      onChange={(e) =>
                        updateConfig("backgroundColor", e.target.value)
                      }
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {config.showBorder && (
                  <div>
                    <Label htmlFor="borderColor">Border Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        id="borderColor"
                        type="color"
                        value={config.borderColor}
                        onChange={(e) =>
                          updateConfig("borderColor", e.target.value)
                        }
                        className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={config.borderColor}
                        onChange={(e) =>
                          updateConfig("borderColor", e.target.value)
                        }
                        placeholder="#e5e7eb"
                      />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Default colors (#ffffff / #000000) automatically adapt to dark mode.
                Custom colors are applied as-is.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
