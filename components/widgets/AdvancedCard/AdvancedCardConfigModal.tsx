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
import {
  Columns2,
  FileImage,
  Image,
  Layers,
  LayoutTemplate,
  Palette,
  PlusCircle,
  Square,
  Tag,
  Trash2,
  Type,
} from "lucide-react";
import { AdvancedCardConfig, AdvancedCardWidget } from "./AdvancedCardWidget";

interface AdvancedCardConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AdvancedCardConfig) => void;
  initialConfig?: AdvancedCardConfig;
}

const defaultConfig: AdvancedCardConfig = {
  // Header
  showHeader: true,
  headerTitle: "Card Title",
  headerSubtitle: "",
  headerIcon: "",
  headerBackgroundColor: "#f8fafc",
  headerTextColor: "#000000",

  // Content
  contentType: "text",
  contentText: "Enter your content here...",
  contentImageUrl: "",
  contentImageAlt: "",
  contentImageFit: "cover",
  contentBackgroundColor: "#ffffff",
  contentTextColor: "#000000",
  contentPadding: "md",

  // Footer
  showFooter: false,
  footerText: "",
  footerButtons: [],
  footerBackgroundColor: "#f8fafc",
  footerTextColor: "#000000",

  // Card Layout
  cardBackgroundColor: "#ffffff",
  cardBorderColor: "#e5e7eb",
  cardBorderRadius: "md",
  cardShadow: "md",
  cardWidth: "auto",
  cardHeight: "auto",

  // Badges
  showBadges: false,
  badges: [],
};

export function AdvancedCardConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: AdvancedCardConfigModalProps) {
  const [config, setConfig] = useState<AdvancedCardConfig>(defaultConfig);

  useEffect(() => {
    if (initialConfig) {
      setConfig({ ...defaultConfig, ...initialConfig });
    } else {
      setConfig(defaultConfig);
    }
  }, [initialConfig, isOpen]);

  const updateConfig = <K extends keyof AdvancedCardConfig>(
    key: K,
    value: AdvancedCardConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // ── Footer buttons ──────────────────────────────────────────────
  const addFooterButton = () => {
    const newBtn: AdvancedCardConfig["footerButtons"][0] = {
      id: `btn-${Date.now()}`,
      label: "Button",
      variant: "default",
      action: "none",
      actionUrl: "",
    };
    updateConfig("footerButtons", [...(config.footerButtons ?? []), newBtn]);
  };

  const updateFooterButton = (
    id: string,
    field: keyof AdvancedCardConfig["footerButtons"][0],
    value: string
  ) => {
    updateConfig(
      "footerButtons",
      (config.footerButtons ?? []).map((btn) =>
        btn.id === id ? { ...btn, [field]: value } : btn
      )
    );
  };

  const removeFooterButton = (id: string) => {
    updateConfig(
      "footerButtons",
      (config.footerButtons ?? []).filter((btn) => btn.id !== id)
    );
  };

  // ── Badges ──────────────────────────────────────────────────────
  const addBadge = () => {
    const newBadge: AdvancedCardConfig["badges"][0] = {
      id: `badge-${Date.now()}`,
      label: "Badge",
      variant: "secondary",
    };
    updateConfig("badges", [...(config.badges ?? []), newBadge]);
  };

  const updateBadge = (
    id: string,
    field: keyof AdvancedCardConfig["badges"][0],
    value: string
  ) => {
    updateConfig(
      "badges",
      (config.badges ?? []).map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      )
    );
  };

  const removeBadge = (id: string) => {
    updateConfig(
      "badges",
      (config.badges ?? []).filter((b) => b.id !== id)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Advanced Card
          </DialogTitle>
          <DialogDescription>
            Configure a rich card with header, content, footer, and badges.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Live Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[140px] rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <AdvancedCardWidget config={config} />
              </div>
            </CardContent>
          </Card>

          {/* ── Card Layout ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Square className="h-4 w-4" />
                Card Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Border Radius</Label>
                  <Select
                    value={config.cardBorderRadius ?? "md"}
                    onValueChange={(
                      v: AdvancedCardConfig["cardBorderRadius"]
                    ) => updateConfig("cardBorderRadius", v)}
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

                <div>
                  <Label>Shadow</Label>
                  <Select
                    value={config.cardShadow ?? "md"}
                    onValueChange={(v: AdvancedCardConfig["cardShadow"]) =>
                      updateConfig("cardShadow", v)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Card Background</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.cardBackgroundColor}
                      onChange={(e) =>
                        updateConfig("cardBackgroundColor", e.target.value)
                      }
                      className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={config.cardBackgroundColor}
                      onChange={(e) =>
                        updateConfig("cardBackgroundColor", e.target.value)
                      }
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div>
                  <Label>Border Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.cardBorderColor}
                      onChange={(e) =>
                        updateConfig("cardBorderColor", e.target.value)
                      }
                      className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={config.cardBorderColor}
                      onChange={(e) =>
                        updateConfig("cardBorderColor", e.target.value)
                      }
                      placeholder="#e5e7eb"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Header ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Columns2 className="h-4 w-4" />
                  Header
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="showHeader"
                    checked={config.showHeader}
                    onCheckedChange={(v) => updateConfig("showHeader", v)}
                  />
                  <Label htmlFor="showHeader" className="cursor-pointer text-xs font-normal">
                    {config.showHeader ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </CardTitle>
            </CardHeader>
            {config.showHeader && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="headerTitle">Title</Label>
                    <Input
                      id="headerTitle"
                      placeholder="Card title..."
                      value={config.headerTitle ?? ""}
                      onChange={(e) =>
                        updateConfig("headerTitle", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="headerIcon">
                      Icon{" "}
                      <span className="text-muted-foreground text-xs">
                        (emoji)
                      </span>
                    </Label>
                    <Input
                      id="headerIcon"
                      placeholder="e.g. 🚀"
                      value={config.headerIcon ?? ""}
                      onChange={(e) =>
                        updateConfig("headerIcon", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="headerSubtitle">Subtitle</Label>
                  <Input
                    id="headerSubtitle"
                    placeholder="Optional subtitle..."
                    value={config.headerSubtitle ?? ""}
                    onChange={(e) =>
                      updateConfig("headerSubtitle", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Background</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={config.headerBackgroundColor}
                        onChange={(e) =>
                          updateConfig("headerBackgroundColor", e.target.value)
                        }
                        className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={config.headerBackgroundColor}
                        onChange={(e) =>
                          updateConfig("headerBackgroundColor", e.target.value)
                        }
                        placeholder="#f8fafc"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={config.headerTextColor}
                        onChange={(e) =>
                          updateConfig("headerTextColor", e.target.value)
                        }
                        className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={config.headerTextColor}
                        onChange={(e) =>
                          updateConfig("headerTextColor", e.target.value)
                        }
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>

                {/* Badges sub-section — placed in header since they render there */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Badges</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="showBadges"
                        checked={config.showBadges ?? false}
                        onCheckedChange={(v) => updateConfig("showBadges", v)}
                      />
                      {config.showBadges && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={addBadge}
                        >
                          <PlusCircle className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>

                  {config.showBadges &&
                    (config.badges ?? []).map((badge) => (
                      <div
                        key={badge.id}
                        className="flex gap-2 items-center mb-2"
                      >
                        <Input
                          placeholder="Label"
                          value={badge.label}
                          onChange={(e) =>
                            updateBadge(badge.id, "label", e.target.value)
                          }
                          className="flex-1 h-8 text-sm"
                        />
                        <Select
                          value={badge.variant}
                          onValueChange={(v) =>
                            updateBadge(badge.id, "variant", v)
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="secondary">
                              Secondary
                            </SelectItem>
                            <SelectItem value="destructive">
                              Destructive
                            </SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeBadge(badge.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* ── Content ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="h-4 w-4" />
                Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Content Type</Label>
                  <Select
                    value={config.contentType}
                    onValueChange={(v: AdvancedCardConfig["contentType"]) =>
                      updateConfig("contentType", v)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text only</SelectItem>
                      <SelectItem value="image">Image only</SelectItem>
                      <SelectItem value="mixed">Image + Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Padding</Label>
                  <Select
                    value={config.contentPadding ?? "md"}
                    onValueChange={(v: AdvancedCardConfig["contentPadding"]) =>
                      updateConfig("contentPadding", v)
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
              </div>

              {/* Text field */}
              {(config.contentType === "text" ||
                config.contentType === "mixed") && (
                <div>
                  <Label htmlFor="contentText">Text</Label>
                  <Textarea
                    id="contentText"
                    placeholder="Enter your content text..."
                    value={config.contentText ?? ""}
                    onChange={(e) =>
                      updateConfig("contentText", e.target.value)
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Image fields */}
              {(config.contentType === "image" ||
                config.contentType === "mixed") && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="contentImageUrl">
                      <span className="flex items-center gap-1">
                        <Image className="h-3.5 w-3.5" />
                        Image URL
                      </span>
                    </Label>
                    <Input
                      id="contentImageUrl"
                      placeholder="https://example.com/image.jpg"
                      value={config.contentImageUrl ?? ""}
                      onChange={(e) =>
                        updateConfig("contentImageUrl", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="contentImageAlt">Alt Text</Label>
                      <Input
                        id="contentImageAlt"
                        placeholder="Image description"
                        value={config.contentImageAlt ?? ""}
                        onChange={(e) =>
                          updateConfig("contentImageAlt", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Image Fit</Label>
                      <Select
                        value={config.contentImageFit ?? "cover"}
                        onValueChange={(
                          v: AdvancedCardConfig["contentImageFit"]
                        ) => updateConfig("contentImageFit", v)}
                      >
                        <SelectTrigger className="mt-1">
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
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label>Background</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.contentBackgroundColor}
                      onChange={(e) =>
                        updateConfig("contentBackgroundColor", e.target.value)
                      }
                      className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={config.contentBackgroundColor}
                      onChange={(e) =>
                        updateConfig("contentBackgroundColor", e.target.value)
                      }
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div>
                  <Label>Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.contentTextColor}
                      onChange={(e) =>
                        updateConfig("contentTextColor", e.target.value)
                      }
                      className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={config.contentTextColor}
                      onChange={(e) =>
                        updateConfig("contentTextColor", e.target.value)
                      }
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Footer
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="showFooter"
                    checked={config.showFooter}
                    onCheckedChange={(v) => updateConfig("showFooter", v)}
                  />
                  <Label
                    htmlFor="showFooter"
                    className="cursor-pointer text-xs font-normal"
                  >
                    {config.showFooter ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </CardTitle>
            </CardHeader>
            {config.showFooter && (
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="footerText">
                    Footer Text{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="footerText"
                    placeholder="Footer note..."
                    value={config.footerText ?? ""}
                    onChange={(e) =>
                      updateConfig("footerText", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Background</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={config.footerBackgroundColor}
                        onChange={(e) =>
                          updateConfig("footerBackgroundColor", e.target.value)
                        }
                        className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={config.footerBackgroundColor}
                        onChange={(e) =>
                          updateConfig("footerBackgroundColor", e.target.value)
                        }
                        placeholder="#f8fafc"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={config.footerTextColor}
                        onChange={(e) =>
                          updateConfig("footerTextColor", e.target.value)
                        }
                        className="w-10 h-10 p-0.5 border rounded-md cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={config.footerTextColor}
                        onChange={(e) =>
                          updateConfig("footerTextColor", e.target.value)
                        }
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Buttons</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={addFooterButton}
                      disabled={(config.footerButtons ?? []).length >= 4}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add Button
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(config.footerButtons ?? []).map((btn) => (
                      <div
                        key={btn.id}
                        className="p-3 rounded-md border bg-muted/30 space-y-2"
                      >
                        <div className="flex gap-2">
                          <Input
                            placeholder="Label"
                            value={btn.label}
                            onChange={(e) =>
                              updateFooterButton(btn.id, "label", e.target.value)
                            }
                            className="flex-1 h-8 text-sm"
                          />
                          <Select
                            value={btn.variant}
                            onValueChange={(v) =>
                              updateFooterButton(btn.id, "variant", v)
                            }
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="outline">Outline</SelectItem>
                              <SelectItem value="secondary">
                                Secondary
                              </SelectItem>
                              <SelectItem value="destructive">
                                Destructive
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeFooterButton(btn.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Select
                            value={btn.action ?? "none"}
                            onValueChange={(v) =>
                              updateFooterButton(btn.id, "action", v)
                            }
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No action</SelectItem>
                              <SelectItem value="link">Open link</SelectItem>
                            </SelectContent>
                          </Select>

                          {btn.action === "link" && (
                            <Input
                              placeholder="https://..."
                              value={btn.actionUrl ?? ""}
                              onChange={(e) =>
                                updateFooterButton(
                                  btn.id,
                                  "actionUrl",
                                  e.target.value
                                )
                              }
                              className="flex-1 h-8 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(config)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
