// File: components/widgets/RackServer3d/RackServer3dConfigModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save, AlertCircle, Server, Settings, Database, CheckSquare, Square, Layers,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export interface RackServer3dConfigData {
  rackId?: string;           // legacy single (kept for backward compat)
  rackIds?: string[];        // NEW: multi-rack
  rackType?: "server" | "smartrack";
  rackSpacing?: number;
}

interface Rack { id: string; name: string; location?: string; rackType?: string; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: RackServer3dConfigData) => void;
  initialConfig?: RackServer3dConfigData | null;
}

export const RackServer3dConfigModal = ({ isOpen, onClose, onSave, initialConfig }: Props) => {
  // Resolve initial selection — support both rackId and rackIds
  const getInitialSelected = (): string[] => {
    if (initialConfig?.rackIds && initialConfig.rackIds.length > 0) return initialConfig.rackIds;
    if (initialConfig?.rackId) return [initialConfig.rackId];
    return [];
  };

  const [selectedRackIds, setSelectedRackIds] = useState<string[]>(getInitialSelected);
  const [rackType, setRackType] = useState<"server" | "smartrack">(initialConfig?.rackType || "server");
  const [rackSpacing, setRackSpacing] = useState<number>(initialConfig?.rackSpacing ?? 64);

  // Data
  const [racks, setRacks] = useState<Rack[]>([]);
  const [isLoadingRacks, setIsLoadingRacks] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Preview devices for the highlighted / last-selected rack
  const [previewDevices, setPreviewDevices] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [highlightedRackId, setHighlightedRackId] = useState<string | null>(null);
  const previewRackId = highlightedRackId ?? selectedRackIds[selectedRackIds.length - 1] ?? null;

  useEffect(() => {
    if (isOpen) {
      setIsLoadingRacks(true);
      fetch("/api/racks").then(r => r.ok ? r.json() : null).then(data => {
        setRacks(data?.racks || []);
      }).catch(console.error).finally(() => setIsLoadingRacks(false));

      // Reset form
      setSelectedRackIds(getInitialSelected());
      setHighlightedRackId(null);
      setRackType(initialConfig?.rackType || "server");
      setRackSpacing(initialConfig?.rackSpacing ?? 140);
      setErrors({});
    }
  }, [isOpen]);

  // Fetch devices whenever the preview target rack changes
  useEffect(() => {
    if (!previewRackId) { setPreviewDevices([]); return; }
    setIsLoadingDevices(true);
    fetch(`/api/racks/${previewRackId}`).then(r => r.ok ? r.json() : null).then(data => {
      setPreviewDevices(data?.devices || []);
    }).catch(console.error).finally(() => setIsLoadingDevices(false));
  }, [previewRackId]);

  const toggleRack = (id: string) => {
    setSelectedRackIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Auto-select the clicked rack in the preview dropdown
      // If deselecting and it was previewed, fall back to first remaining
      if (prev.includes(id) && highlightedRackId === id) {
        const remaining = next.filter(x => x !== id);
        setHighlightedRackId(remaining[0] ?? null);
      } else {
        setHighlightedRackId(id);
      }
      return next;
    });
    setErrors(prev => ({ ...prev, rackIds: "" }));
  };

  const handleSave = () => {
    const newErrors: { [k: string]: string } = {};
    if (selectedRackIds.length === 0) newErrors.rackIds = "Please select at least one rack";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSave({
      rackIds: selectedRackIds,
      rackId: selectedRackIds[0], // backward compat
      rackType,
      rackSpacing: selectedRackIds.length > 1 ? rackSpacing : undefined,
    });
    onClose();
  };

  const getRackLabel = (rack: Rack) => {
    const parts = [rack.name];
    if (rack.location) parts.push(`(${rack.location})`);
    if (rack.rackType === "MAIN") parts.push("★ MAIN");
    return parts.join(" ");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Server className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-xl flex items-center gap-2">
                {initialConfig ? "Edit" : "Configure"} Rack Server 3D
                {selectedRackIds.length > 1 &&
                  <Badge className="bg-blue-600 text-white text-xs ml-2">{selectedRackIds.length} Racks Selected</Badge>
                }
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-normal">
                Select one or multiple racks to render in a shared 3D scene
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {Object.values(errors).some(Boolean) && (
          <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <ul className="list-disc list-inside">{Object.values(errors).filter(Boolean).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          </div>
        )}

        <Tabs defaultValue="racks" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="racks" className="flex items-center gap-2"><Database className="h-4 w-4" />Rack Selection</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" />Display Settings</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pt-4 custom-scrollbar space-y-4">
            {/* ── Rack Selection ── */}
            <TabsContent value="racks" className="space-y-4 mt-0">
              <div className={`space-y-2 p-4 rounded-xl border ${errors.rackIds ? "border-red-500 bg-red-50/30" : "border-border bg-muted/30"}`}>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-500" />
                    Select Racks <span className="text-muted-foreground font-normal">(click to toggle)</span>
                  </Label>
                  {selectedRackIds.length > 0 &&
                    <button onClick={() => setSelectedRackIds([])} className="text-xs text-red-500 hover:underline">Clear all</button>
                  }
                </div>

                {isLoadingRacks ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {racks.map(rack => {
                      const selected = selectedRackIds.includes(rack.id);
                      const isPreviewed = previewRackId === rack.id;
                      const deviceCount = (rack as any).devices?.length ?? 0;
                      return (
                        <button
                          key={rack.id}
                          onClick={() => toggleRack(rack.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${selected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm shadow-blue-100/50"
                            : isPreviewed
                            ? "border-slate-400 bg-muted/30"
                            : "border-border hover:border-blue-300 hover:bg-muted/50"
                          }`}
                        >
                          {selected
                            ? <CheckSquare className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            : <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${selected ? "text-blue-700 dark:text-blue-300" : ""}`}>{rack.name}</p>
                            {rack.location && <p className="text-xs text-muted-foreground truncate">{rack.location}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {rack.rackType === "MAIN" && <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-400/30 text-[10px] border">MAIN</Badge>}
                            <Badge className="bg-muted text-muted-foreground border text-[10px]">{deviceCount}U</Badge>
                            {selected && (
                              <Badge className="bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-400/30 text-[10px] border">
                                #{selectedRackIds.indexOf(rack.id) + 1}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedRackIds.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium pt-1">
                    {selectedRackIds.length === 1 ? "1 rack selected — single rack mode" : `${selectedRackIds.length} racks selected — multi-rack 3D scene`}
                  </p>
                )}
              </div>

              {/* Device preview — dropdown for all selected racks */}
              {selectedRackIds.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground flex-shrink-0">Preview:</Label>
                    <Select
                      value={previewRackId ?? ""}
                      onValueChange={(v) => setHighlightedRackId(v)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select rack to preview..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedRackIds.map((id, idx) => {
                          const rack = racks.find(r => r.id === id);
                          return (
                            <SelectItem key={id} value={id} className="text-xs">
                              #{idx + 1} — {rack?.name ?? id}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-background">
                    {!previewRackId ? (
                      <div className="p-6 text-center"><p className="text-sm text-muted-foreground">Select a rack above to preview its devices</p></div>
                    ) : isLoadingDevices ? (
                      <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                    ) : previewDevices.length === 0 ? (
                      <div className="p-6 text-center"><p className="text-sm text-muted-foreground">No devices in this rack</p></div>
                    ) : (
                      <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-xs">Pos</th>
                              <th className="px-4 py-2 text-left font-semibold text-xs">Device</th>
                              <th className="px-4 py-2 text-right font-semibold text-xs">Size</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {previewDevices.sort((a, b) => (b.positionU || 0) - (a.positionU || 0)).map(d => (
                              <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2 font-mono text-xs text-blue-600 dark:text-blue-400">U{d.positionU ?? "?"}</td>
                                <td className="px-4 py-2 font-medium text-sm">{d.device?.name ?? d.name ?? "—"}</td>
                                <td className="px-4 py-2 text-right text-muted-foreground text-xs">{d.sizeU}U</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Display Settings ── */}
            <TabsContent value="settings" className="space-y-6 mt-0">
              <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
                <Label className="text-sm font-medium">Rack Color / Style</Label>
                <Select value={rackType} onValueChange={(v: "server" | "smartrack") => setRackType(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server">Standard Server Rack (Dark)</SelectItem>
                    <SelectItem value="smartrack">Smart Rack (White)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRackIds.length > 1 && (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Rack Spacing (Multi-Rack)</Label>
                    <span className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{rackSpacing}</span>
                  </div>
                  <Slider
                    min={62} max={300} step={2} value={[rackSpacing]}
                    onValueChange={([v]) => setRackSpacing(v)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>62</strong> = racks touching (nempel). Increase for visible spacing between racks.
                  </p>
                </div>
              )}

              {selectedRackIds.length > 1 && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex gap-3">
                    <Layers className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Multi-Rack 3D Scene</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        All {selectedRackIds.length} racks will render in one shared Three.js scene with a common camera and orbit controls. Use scroll to zoom, drag to orbit, and right-click to pan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {selectedRackIds.length > 1
              ? `Save (${selectedRackIds.length} Racks)`
              : initialConfig ? "Update Configuration" : "Save Configuration"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
