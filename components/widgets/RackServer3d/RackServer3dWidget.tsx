"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Move3D,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Info,
  DoorOpen,
  DoorClosed,
  Zap,
  Wind,
  Battery,
  X,
  Server,
  Clock,
  MapPin,
  Activity,
  Cpu,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import TWEEN from "three/examples/jsm/libs/tween.module.js";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { InteractiveSidePanel } from "./InteractiveSidePanel";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface DeviceVisConfig { deviceId: string; topic: string; keys: string[]; }
interface VisModeConfig { enabled: boolean; devices: DeviceVisConfig[]; }
interface SpaceVisModeConfig { enabled: boolean; devices?: DeviceVisConfig[]; }
interface VisualizationConfigs {
  temp: VisModeConfig; power: VisModeConfig; cooling: VisModeConfig;
  space: SpaceVisModeConfig; serverDetail: VisModeConfig;
}

// Backward-compatible config: supports single rackId OR array rackIds
interface RackServer3dWidgetConfig {
  customName: string;
  rackId?: string;          // legacy single rack
  rackIds?: string[];       // NEW: multi-rack
  rackType?: "server" | "smartrack";
  targetDashboardId?: string;
  rackSpacing?: number;     // horizontal gap between racks (default 140)
}

interface RackDataFetched {
  id: string; name: string; capacityU: number;
  devices: any[];
  visualizationConfigs: VisualizationConfigs | null;
}

interface Props { config: RackServer3dWidgetConfig; }

export interface DeviceInfo {
  id: string; deviceId: string;
  type: "server" | "ups" | "ac";
  name: string; position: number | null; height: number | null;
  topic?: string; address?: string; status?: string;
  lastPayload?: any; lastUpdatedByMqtt?: string;
  value?: string | number; connectivity?: "online" | "offline" | "warning" | "critical" | "error";
  keys?: string[]; telemetry?: { [key: string]: string | number };
  isRetain?: boolean;
  rackIndex?: number; // Which rack this device belongs to (multi-rack mode)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// ─── Rack Info Modal (toolbar INFO button) ───────────────────────────────────
const RackInfoModal = ({ isOpen, onClose, racksData }: { isOpen: boolean; onClose: () => void; racksData: RackDataFetched[]; }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-lg w-full border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Rack Information</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{racksData.length} rack{racksData.length > 1 ? "s" : ""} in scene</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {racksData.map((rack, i) => {
            const usedU = rack.devices.reduce((s: number, d: any) => s + (d.height || d.sizeU || 0), 0);
            const util = rack.capacityU > 0 ? Math.round((usedU / rack.capacityU) * 100) : 0;
            return (
              <div key={rack.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">#{i + 1}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{rack.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-slate-700/50 rounded">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Capacity</p>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">{rack.capacityU}U</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-700/50 rounded">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Used</p>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">{usedU}U</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-700/50 rounded">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Devices</p>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">{rack.devices.length}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Utilization</span>
                    <span className={util > 80 ? "text-red-500" : util > 60 ? "text-amber-500" : "text-green-500"}>{util}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${util > 80 ? "bg-red-500" : util > 60 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${util}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="w-full px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Device Info Modal (click device in 3D) ───────────────────────────────────
const InfoModal = ({ isOpen, onClose, selectedDeviceInfo }: { isOpen: boolean; onClose: () => void; selectedDeviceInfo: any; }) => {
  if (!isOpen || !selectedDeviceInfo) return null;
  const deviceTypeLabel = selectedDeviceInfo.type === "server" ? "Server" : selectedDeviceInfo.type === "ups" ? "UPS" : "Cooling Unit";
  const handleViewDetails = () => {
    if (selectedDeviceInfo?.targetDashboardId) window.location.href = `/dashboard/${selectedDeviceInfo.targetDashboardId}`;
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-lg w-full border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {selectedDeviceInfo.type === "server" ? <Server className="h-5 w-5 text-slate-600 dark:text-slate-400" /> : selectedDeviceInfo.type === "ups" ? <Battery className="h-5 w-5 text-slate-600 dark:text-slate-400" /> : <Wind className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedDeviceInfo.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{deviceTypeLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          {selectedDeviceInfo.status && (
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${selectedDeviceInfo.status === "ONLINE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : selectedDeviceInfo.status === "WARNING" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{selectedDeviceInfo.status}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Rack Position</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedDeviceInfo.position ? `U${selectedDeviceInfo.position}` : "N/A"}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Form Factor</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedDeviceInfo.height ? `${selectedDeviceInfo.height}U` : "N/A"}</p>
            </div>
          </div>
          {selectedDeviceInfo.address && (<div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Network Address</p><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedDeviceInfo.address}</p></div>)}
          {selectedDeviceInfo.lastUpdatedByMqtt && (<div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Last Updated</p><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{new Date(selectedDeviceInfo.lastUpdatedByMqtt).toLocaleString()}</p></div>)}
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="w-full px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Widget ──────────────────────────────────────────────────────────────
export const RackServer3dWidget = ({ config }: Props) => {
  const { theme, resolvedTheme } = useTheme();
  const { subscribe, unsubscribe } = useMqttServer();

  // Resolve final list of rackIds (supports both legacy rackId and new rackIds array)
  const resolvedRackIds = useMemo<string[]>(() => {
    if (config.rackIds && config.rackIds.length > 0) return config.rackIds;
    if (config.rackId) return [config.rackId];
    return [];
  }, [config.rackIds, config.rackId]);

  const isMultiRack = resolvedRackIds.length > 1;
  const RACK_SPACING = config.rackSpacing ?? 64; // touching racks by default

  // Status
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // UI State
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; content: string; rackName?: string; } | null>(null);

  // Modal State
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showRackInfoModal, setShowRackInfoModal] = useState(false);
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState<DeviceInfo | null>(null);

  // View
  const [viewMode, setViewMode] = useState<"normal" | "temp" | "power" | "cooling" | "space" | "serverDetail">("normal");
  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);

  // Panel
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelDevices, setPanelDevices] = useState<DeviceInfo[]>([]);
  const [panelTitle, setPanelTitle] = useState("");

  // Multi-rack data: one entry per rack
  const [allRacksData, setAllRacksData] = useState<RackDataFetched[]>([]);
  const [allRacksDevices, setAllRacksDevices] = useState<DeviceInfo[][]>([]); // devices[rackIndex]

  // Flat list of all devices across all racks (with rackIndex tagged)
  const flatDevices = useMemo<DeviceInfo[]>(() =>
    allRacksDevices.flatMap((devs, idx) => devs.map(d => ({ ...d, rackIndex: idx }))),
    [allRacksDevices]
  );

  // Primary rack data for single-rack features (vizConfigs, summary modal)
  const primaryRack = allRacksData[0] ?? null;
  const primaryDevices = allRacksDevices[0] ?? [];

  // ─── Three.js Refs ──────────────────────────────────────────────────────────
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Per-scene group refs (indexed by rack position)
  const doorGroupsRef = useRef<THREE.Group[]>([]);
  const panelsRef = useRef<THREE.Mesh[]>([]);
  const deviceMeshesRef = useRef<THREE.Mesh[]>([]);
  const devicesMapRef = useRef<Map<string, DeviceInfo>>(new Map()); // key = mesh uuid
  const groundRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // ─── MQTT (panel) ───────────────────────────────────────────────────────────
  const onMessage = useCallback((topic: string, payload: string, serverId: string, retained?: boolean) => {
    setPanelDevices(prev => {
      let changed = false;
      const next = prev.map(device => {
        if (device.topic !== topic) return device;
        changed = true;
        try {
          const outer = JSON.parse(payload);
          let data: any = outer;
          try { if (typeof outer.value === "string") data = JSON.parse(outer.value); } catch {}
          const newTelemetry: { [k: string]: string | number } = {};
          device.keys?.forEach(k => { if (data[k] !== undefined) newTelemetry[k] = data[k]; });
          return { ...device, connectivity: "online" as const, telemetry: newTelemetry, lastPayload: outer, lastUpdatedByMqtt: new Date().toISOString(), isRetain: retained || false };
        } catch { return { ...device, connectivity: "error" as const }; }
      });
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (!isPanelOpen || viewMode === "normal") return;
    const vizConfig = primaryRack?.visualizationConfigs?.[viewMode];
    if (!vizConfig?.enabled) return;
    const topics = new Set<string>();
    (vizConfig as VisModeConfig).devices?.forEach((d: any) => { if (d.topic) topics.add(d.topic); });
    topics.forEach(t => subscribe(t, onMessage));
    return () => { topics.forEach(t => unsubscribe(t, onMessage)); };
  }, [isPanelOpen, viewMode, primaryRack?.visualizationConfigs, subscribe, unsubscribe, onMessage]);

  // ─── Fetch Racks ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (resolvedRackIds.length === 0) {
      // fallback: find any available rack
      (async () => {
        try {
          const res = await fetch("/api/racks");
          if (res.ok) {
            const data = await res.json();
            const target = data.racks?.find((r: any) => r.rackType === "MAIN") || data.racks?.[0];
            if (target) {
              const rackRes = await fetch(`/api/racks/${target.id}`);
              if (rackRes.ok) {
                const rd = await rackRes.json();
                setAllRacksData([rd]);
                setAllRacksDevices([mapDevices(rd.devices)]);
                setStatus("ok");
              }
            } else { setErrorMessage("No racks available"); setStatus("error"); }
          }
        } catch { setErrorMessage("Failed to load racks"); setStatus("error"); }
      })();
      return;
    }

    setStatus("loading");
    Promise.all(
      resolvedRackIds.map(id => fetch(`/api/racks/${id}`).then(r => (r.ok ? r.json() : null)))
    ).then(results => {
      const valid = results.filter(Boolean) as RackDataFetched[];
      if (valid.length === 0) { setErrorMessage("No racks found"); setStatus("error"); return; }
      setAllRacksData(valid);
      setAllRacksDevices(valid.map(r => mapDevices(r.devices)));
      setStatus("ok");
    }).catch(() => { setErrorMessage("Failed to load racks"); setStatus("error"); });
  }, [resolvedRackIds.join(",")]);

  function mapDevices(rawDevices: any[]): DeviceInfo[] {
    return rawDevices.map((d: any) => {
      const deviceObj = d.device || {};
      const name = deviceObj.name || "Unknown Device";
      const nameLower = name.toLowerCase();
      const typeLower = (d.deviceType || "").toLowerCase();
      let type: "server" | "ups" | "ac" = "server";
      if (nameLower.includes("ups") || typeLower.includes("ups")) type = "ups";
      else if (nameLower.includes("ac") || nameLower.includes("cooling") || typeLower.includes("cooling")) type = "ac";
      return {
        id: d.id, deviceId: d.deviceId || d.id, type, name,
        position: d.positionU, height: d.sizeU,
        topic: deviceObj.topic, address: deviceObj.address, status: d.status,
        lastPayload: deviceObj.lastPayload, lastUpdatedByMqtt: deviceObj.lastUpdatedByMqtt,
        value: undefined,
      };
    });
  }

  // ─── Build ONE Rack Group ─────────────────────────────────────────────────────
  function buildRackGroup(
    scene: THREE.Scene,
    rackData: RackDataFetched,
    devices: DeviceInfo[],
    offsetX: number,
    rackIndex: number,
    isSmartRack: boolean,
    currentTheme: string,
  ): { group: THREE.Group; doorGroup: THREE.Group; sidePanels: THREE.Mesh[]; deviceMeshes: THREE.Mesh[]; meshToDevice: Map<string, DeviceInfo> } {

    const rackGroup = new THREE.Group();
    rackGroup.position.x = offsetX;
    scene.add(rackGroup);

    const uHeight = 4.445;
    const rackWidth = 60;
    const rackDepth = 100;
    const totalHeight = 42 * uHeight + 10;

    // Color logic: Main Rack (index 0) = Blue, Others = Light Green (Emerald)
    const isMainRack = rackIndex === 0;
    const accentColor = isMainRack ? 0x3b82f6 : 0x10b981; // Blue vs Emerald Green
    const glassColor  = isMainRack ? 0x3b82f6 : 0x34d399; // Lighter emerald for glass
    
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: isSmartRack ? 0xf8fafc : (isMainRack ? 0x1e293b : 0x064e3b), // Dark emerald frame for non-main
      roughness: 0.5, metalness: isSmartRack ? 0.2 : 0.8,
    });
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: isSmartRack ? 0xdbeafe : glassColor, // light blue tint for smart rack, accent color for dark rack
      metalness: 0.05, roughness: 0,
      transmission: 0.6, transparent: true, opacity: isSmartRack ? 0.35 : 0.4,
    });

    // Pillars
    const pillarGeo = new THREE.BoxGeometry(2, totalHeight, 2);
    [[-rackWidth/2, totalHeight/2, -rackDepth/2], [rackWidth/2, totalHeight/2, -rackDepth/2],
      [-rackWidth/2, totalHeight/2, rackDepth/2], [rackWidth/2, totalHeight/2, rackDepth/2]
    ].forEach(([px, py, pz]) => {
      const p = new THREE.Mesh(pillarGeo, frameMaterial);
      p.position.set(px, py, pz);
      rackGroup.add(p);
    });

    // U-labels
    const createULabel = (u: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.fillStyle = "#94a3b8"; ctx.font = "bold 40px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(u.toString(), 32, 32); }
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
      sprite.scale.set(4, 4, 1);
      return sprite;
    };
    for (let i = 1; i <= 42; i++) {
      const l = createULabel(i); l.position.set(-rackWidth/2 - 4, (i-1)*uHeight + uHeight/2 + 5, rackDepth/2); rackGroup.add(l);
      const lr = l.clone(); lr.position.set(rackWidth/2 + 4, (i-1)*uHeight + uHeight/2 + 5, rackDepth/2); rackGroup.add(lr);
    }

    // Top/Bottom panels
    const panelGeo = new THREE.BoxGeometry(rackWidth+4, 2, rackDepth+4);
    const bot = new THREE.Mesh(panelGeo, frameMaterial); bot.position.set(0, 1, 0); rackGroup.add(bot);
    const top = new THREE.Mesh(panelGeo, frameMaterial); top.position.set(0, totalHeight, 0); rackGroup.add(top);

    // Name label
    const createNameLabel = (name: string) => {
      const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgba(15,23,42,0.85)"; ctx.roundRect(0, 0, 512, 128, 20); ctx.fill();
        ctx.strokeStyle = isMainRack ? "#3b82f6" : "#10b981"; ctx.lineWidth = 8; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 60px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(name.length > 12 ? name.slice(0, 11) + "…" : name, 256, 64);
      }
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rackWidth*0.8, rackWidth*0.8*(128/512)), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
      return mesh;
    };
    const nameLabel = createNameLabel(rackData.name || `Rack ${rackIndex + 1}`);
    nameLabel.position.set(0, totalHeight + 10, rackDepth/2 + 2);
    rackGroup.add(nameLabel);

    // Side panels
    const sidePanels: THREE.Mesh[] = [];
    const spGeo = new THREE.BoxGeometry(1, totalHeight - 4, rackDepth);
    const lp = new THREE.Mesh(spGeo, frameMaterial); lp.position.set(-rackWidth/2-1, totalHeight/2, 0); rackGroup.add(lp); sidePanels.push(lp);
    const rp = new THREE.Mesh(spGeo, frameMaterial); rp.position.set(rackWidth/2+1, totalHeight/2, 0); rackGroup.add(rp); sidePanels.push(rp);

    // Door
    const doorGroup = new THREE.Group();
    doorGroup.position.set(rackWidth/2, 0, rackDepth/2 + 2);
    rackGroup.add(doorGroup);
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, totalHeight - 4, 1), glassMaterial);
    doorMesh.position.set(-rackWidth/2, totalHeight/2, 0);
    doorGroup.add(doorMesh);

    if (isSmartRack) {
      const coolingMesh = new THREE.Mesh(new THREE.BoxGeometry(rackWidth*0.6, totalHeight*0.4, 4), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.6 }));
      coolingMesh.position.set(-rackWidth/2, totalHeight/2, 2); doorGroup.add(coolingMesh);
    }

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10), new THREE.MeshStandardMaterial({ color: isSmartRack ? 0x64748b : 0x94a3b8 }));
    handle.position.set(-rackWidth + 5, totalHeight/2, 2); doorGroup.add(handle);

    // ─── 🖥️ DOOR DISPLAY (main rack only, rackIndex === 0) ──────────────────────
    // doorGroup pivot: (rackWidth/2, 0, rackDepth/2+2). Door mesh center in doorGroup: (-rackWidth/2, totalHeight/2, 0)
    // Door depth = 1 unit → front face at z = +0.5 in doorGroup space.
    if (rackIndex === 0) {
      const dispW = 48;             // display width (fits inside door width 60)
      const dispH = 36;             // display height
      const dispX = -rackWidth / 2; // horizontally centered on door
      const dispY = totalHeight * 0.72;

      // Z math (doorGroup local space):
      // - Door mesh depth = 1  → door front face at z = +0.5
      // - Bezel sits clearly ahead of door to avoid any bleeding
      const bezelDepth = 1.8;
      const bezelZ     = 0.6 + bezelDepth / 2;              // Centered at 1.5, Front at 2.4
      const screenZ    = bezelZ + bezelDepth / 2 + 0.12;    // Front face at ~2.52 (very safe from bezel face 2.4)

      // Outer bezel frame (dark metallic recess)
      const bezelMat = new THREE.MeshStandardMaterial({ color: 0x060d1a, roughness: 0.2, metalness: 0.95 });
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(dispW + 3, dispH + 3, bezelDepth), bezelMat);
      bezel.position.set(dispX, dispY, bezelZ);
      doorGroup.add(bezel);

      // ── Canvas drawing ──────────────────────────────────────────────────────
      const CW = 1024, CH = 768;   // High-def 4:3
      const screenCanvas = document.createElement("canvas");
      screenCanvas.width  = CW;
      screenCanvas.height = CH;
      const ctx2 = screenCanvas.getContext("2d");

      if (ctx2) {
        const deviceCount = devices.length;
        const usedU  = devices.reduce((s, d) => s + (d.height || 0), 0);
        const totalU = rackData.capacityU || 42;
        const util   = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0;
        const utilColor = util > 80 ? "#ef4444" : util > 60 ? "#f59e0b" : (isMainRack ? "#22c55e" : "#10b981");

        // --- Background gradient ---
        const bgGrad = ctx2.createLinearGradient(0, 0, 0, CH);
        bgGrad.addColorStop(0,   "#020d1f");
        bgGrad.addColorStop(0.5, "#041835");
        bgGrad.addColorStop(1,   "#020d1f");
        ctx2.fillStyle = bgGrad;
        ctx2.fillRect(0, 0, CW, CH);

        // Subtle grid pattern
        ctx2.strokeStyle = "rgba(59,130,246,0.08)";
        ctx2.lineWidth = 1.5;
        for (let gx = 0; gx < CW; gx += 64) {
          ctx2.beginPath(); ctx2.moveTo(gx, 0); ctx2.lineTo(gx, CH); ctx2.stroke();
        }
        for (let gy = 0; gy < CH; gy += 64) {
          ctx2.beginPath(); ctx2.moveTo(0, gy); ctx2.lineTo(CW, gy); ctx2.stroke();
        }

        // Scanlines
        ctx2.globalAlpha = 0.04;
        for (let row = 0; row < CH; row += 4) {
          ctx2.fillStyle = "#ffffff";
          ctx2.fillRect(0, row, CW, 1.5);
        }
        ctx2.globalAlpha = 1;

        // === HEADER BAR ===
        const hGrad = ctx2.createLinearGradient(0, 0, CW, 0);
        hGrad.addColorStop(0, isMainRack ? "rgba(59,130,246,0.5)" : "rgba(16,185,129,0.5)");
        hGrad.addColorStop(1, isMainRack ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)");
        ctx2.fillStyle = hGrad;
        ctx2.fillRect(0, 0, CW, 110);

        // Indicator stripe
        ctx2.fillStyle = isMainRack ? "#3b82f6" : "#10b981";
        ctx2.fillRect(0, 0, 10, 110);

        // Online indicator
        ctx2.fillStyle = "#22c55e";
        ctx2.beginPath(); ctx2.arc(55, 55, 14, 0, Math.PI * 2); ctx2.fill();
        ctx2.fillStyle = "rgba(34,197,94,0.3)";
        ctx2.beginPath(); ctx2.arc(55, 55, 24, 0, Math.PI * 2); ctx2.fill();

        // Title text
        ctx2.fillStyle = "#f0f9ff";
        ctx2.font = "bold 44px monospace";
        ctx2.textBaseline = "middle";
        ctx2.fillText("RACK MONITOR", 100, 55);

        // Rack name
        ctx2.fillStyle = "#94a3b8";
        ctx2.font = "bold 24px monospace";
        ctx2.textAlign = "right";
        ctx2.fillText(rackData.name?.toUpperCase() || "SYSTEM NODE", CW - 30, 55);
        ctx2.textAlign = "left";

        // === 4 STAT CARDS (LIVE TELEMETRY) ===
        const visConf = rackData.visualizationConfigs as any;
        const mappedEnvDevices = visConf?.environment?.enabled ? visConf.environment.devices || [] : [];
        const mappedPwrDevices = visConf?.power?.enabled ? visConf.power.devices || [] : [];
        
        const envDevice = devices.find(d => mappedEnvDevices.some((ed: any) => ed.deviceId === (d as any).uniqId || ed.deviceId === d.id || ed.deviceId === d.deviceId)) 
                       || devices.find(d => d.type === 'ac' || d.name.toLowerCase().includes('temp') || d.name.toLowerCase().includes('sht') || d.name.toLowerCase().includes('env'));

        const pwrDevice = devices.find(d => mappedPwrDevices.some((pd: any) => pd.deviceId === (d as any).uniqId || pd.deviceId === d.id || pd.deviceId === d.deviceId))
                       || devices.find(d => d.type === 'ups' || d.name.toLowerCase().includes('pdu') || d.name.toLowerCase().includes('power'));

        // Temp & Hum (Front & Back)
        const tF = envDevice?.telemetry?.temp_front ?? envDevice?.lastPayload?.value?.temp_front ?? envDevice?.telemetry?.temperature ?? envDevice?.lastPayload?.value?.temperature ?? 24.8;
        const tB = envDevice?.telemetry?.temp_back ?? envDevice?.lastPayload?.value?.temp_back ?? tF;
        const hF = envDevice?.telemetry?.hum_front ?? envDevice?.lastPayload?.value?.hum_front ?? envDevice?.telemetry?.humidity ?? envDevice?.lastPayload?.value?.humidity ?? 45.0;
        const hB = envDevice?.telemetry?.hum_back ?? envDevice?.lastPayload?.value?.hum_back ?? hF;

        // Power
        const pwrVal = pwrDevice?.telemetry?.active_power ?? pwrDevice?.lastPayload?.value?.active_power ?? 1.35;

        // Environment (Water Leak & Vibration)
        const waterLeak = envDevice?.telemetry?.water_leak ?? envDevice?.lastPayload?.value?.water_leak ?? false;
        const vibX = envDevice?.telemetry?.vib_x ?? envDevice?.lastPayload?.value?.vib_x ?? 0;
        const vibY = envDevice?.telemetry?.vib_y ?? envDevice?.lastPayload?.value?.vib_y ?? 0;
        const isTilted = Math.abs(Number(vibX)) > 0.5 || Math.abs(Number(vibY)) > 0.5;

        let envStatus = "NORMAL";
        let envSub = "SAFE";
        let envColor = "#34d399";
        if (waterLeak) { envStatus = "LEAK"; envSub = "WATER DANGER"; envColor = "#ef4444"; }
        else if (isTilted) { envStatus = "TILTED"; envSub = "VIBRATION ALERT"; envColor = "#f59e0b"; }

        const statCards = [
          { label: "FRONT TEMP", value: `${Number(tF).toFixed(1)}°`, color: "#38bdf8", subtitle: `HUM: ${Number(hF).toFixed(0)}%` },
          { label: "REAR TEMP",  value: `${Number(tB).toFixed(1)}°`, color: "#fb7185", subtitle: `HUM: ${Number(hB).toFixed(0)}%` },
          { label: "POWER LOAD", value: `${Number(pwrVal).toFixed(1)}kW`, color: "#a855f7", subtitle: "TOTAL DRAW" },
          { label: "ENVIRONMENT",value: envStatus, color: envColor, subtitle: envSub }
        ];

        const gap = 20;
        const cardW = (CW - gap * (statCards.length + 1)) / statCards.length;
        const cardY = 140;
        const cardH = 160;

        statCards.forEach((s, i) => {
          const cx = gap + i * (cardW + gap);
          
          // Card Box
          ctx2.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx2.roundRect(cx, cardY, cardW, cardH, 12);
          ctx2.fill();
          
          // Top accent line
          ctx2.fillStyle = s.color;
          ctx2.fillRect(cx, cardY, cardW, 6);

          // Label
          ctx2.fillStyle = "#94a3b8";
          ctx2.font = "bold 20px monospace";
          ctx2.fillText(s.label, cx + 15, cardY + 45);

          // Value
          ctx2.fillStyle = s.color === "#ef4444" ? "#ef4444" : "#ffffff";
          ctx2.font = "bold 54px monospace";
          ctx2.fillText(s.value, cx + 15, cardY + 115);
          
          // Subtitle
          ctx2.fillStyle = s.color;
          ctx2.font = "14px monospace";
          ctx2.fillText(s.subtitle, cx + 15, cardY + 145);
        });

        // === UTILIZATION BAR ===
        const barY = 340;
        const barH = 34;
        ctx2.fillStyle = "#0f172a";
        ctx2.roundRect(24, barY, CW - 48, barH, 6); ctx2.fill();
        ctx2.fillStyle = utilColor;
        ctx2.roundRect(24, barY, Math.max(10, (CW - 48) * util / 100), barH, 6); ctx2.fill();
        
        ctx2.fillStyle = "#94a3b8";
        ctx2.font = "18px monospace";
        ctx2.fillText(`USED: ${usedU}U`, 24, barY + 65);
        ctx2.textAlign = "right";
        ctx2.fillText(`FREE: ${totalU - usedU}U`, CW - 24, barY + 65);
        ctx2.textAlign = "left";

        // === INFO ROWS ===
        const infoRows = [
          { label: "STATUS",  value: "OPERATIONAL",                              color: "#22c55e" },
          { label: "TYPE",    value: isSmartRack ? "INTELLIGENT RACK" : "SERVER CABINET", color: "#94a3b8" },
          { label: "UPTIME",  value: "99.98%",                                   color: "#38bdf8" },
          { label: "SERIAL",  value: rackData.id?.slice(-12).toUpperCase() ?? "—", color: "#475569" },
        ];
        infoRows.forEach((r, i) => {
          const ry = 440 + i * 64;
          ctx2.fillStyle = i % 2 === 0 ? "rgba(30,41,59,0.7)" : "rgba(15,23,42,0.5)";
          ctx2.fillRect(0, ry, CW, 64);
          ctx2.strokeStyle = "rgba(59,130,246,0.15)";
          ctx2.lineWidth = 1;
          ctx2.beginPath(); ctx2.moveTo(0, ry); ctx2.lineTo(CW, ry); ctx2.stroke();
          ctx2.fillStyle = "#94a3b8";
          ctx2.font = "20px monospace";
          ctx2.fillText(r.label, 30, ry + 32);
          ctx2.fillStyle = r.color;
          ctx2.font = "bold 22px monospace";
          ctx2.textAlign = "right";
          ctx2.fillText(r.value, CW - 30, ry + 32);
          ctx2.textAlign = "left";
        });

        // === FOOTER ===
        ctx2.fillStyle = "#020617";
        ctx2.fillRect(0, CH - 44, CW, 44);
        ctx2.strokeStyle = isMainRack ? "#3b82f6" : "#10b981";
        ctx2.lineWidth = 2;
        ctx2.beginPath(); ctx2.moveTo(0, CH - 44); ctx2.lineTo(CW, CH - 44); ctx2.stroke();
        ctx2.fillStyle = "#475569";
        ctx2.font = "16px monospace";
        ctx2.fillText(`SYSTEM REVEAL • ${new Date().toLocaleDateString()}`, 30, CH - 22);
        ctx2.textAlign = "right";
        ctx2.fillText("PROPRIETARY SMART-RACK OS v2.4", CW - 30, CH - 22);
        ctx2.textAlign = "left";
      }

      // ── Screen plane — MUST be in front of bezel front face ──────────────────
      const screenTex = new THREE.CanvasTexture(screenCanvas);
      screenTex.generateMipmaps = false;
      screenTex.minFilter = THREE.LinearFilter;
      screenTex.magFilter = THREE.LinearFilter;
      screenTex.needsUpdate = true;
      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(dispW - 0.4, dispH - 0.4),
        new THREE.MeshBasicMaterial({
          map: screenTex,
          side: THREE.DoubleSide,
          depthWrite: false, 
        })
      );
      screenMesh.renderOrder = 2;   // Force on top of everything
      screenMesh.position.set(dispX, dispY, screenZ);
      doorGroup.add(screenMesh);

      // ── Status LED (bottom-right of bezel) ──────────────────────────────────
      const ledMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.8),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      ledMesh.position.set(dispX + dispW / 2 - 1.5, dispY - dispH / 2 - 1.5, screenZ);
      doorGroup.add(ledMesh);
      ledMesh.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.5),
        new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.2 })
      ));

      // ── Screen glow (blue point light in front of screen) ────────────────────
      const screenGlow = new THREE.PointLight(accentColor, 0.5, 80);
      screenGlow.position.set(dispX, dispY, screenZ + 15);
      doorGroup.add(screenGlow);
    }
    // ─── END DOOR DISPLAY ────────────────────────────────────────────────────────

    // Devices

    const deviceMeshes: THREE.Mesh[] = [];
    const meshToDevice = new Map<string, DeviceInfo>();

    devices.forEach(device => {
      if (!device.position || !device.height) return;
      const dh = device.height * uHeight - 0.5;
      const dy = (device.position - 1) * uHeight + dh/2 + 5;
      const dGeo = new THREE.BoxGeometry(rackWidth-5, dh, rackDepth-10);
      const textureLoader = new THREE.TextureLoader();
      let img = "/images/SERVER.png";
      if (device.type === "ups") img = "/images/UPS.png";
      else if (device.type === "ac") img = "/images/COOLING.png";
      const tex = textureLoader.load(img);
      tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
      const mats: THREE.Material[] = [
        new THREE.MeshStandardMaterial({ color: 0x334155 }),
        new THREE.MeshStandardMaterial({ color: 0x334155 }),
        new THREE.MeshStandardMaterial({ color: 0x475569 }),
        new THREE.MeshStandardMaterial({ color: 0x1e293b }),
        new THREE.MeshStandardMaterial({ map: tex }),
        new THREE.MeshStandardMaterial({ color: 0x0f172a }),
      ];
      const mesh = new THREE.Mesh(dGeo, mats);
      mesh.position.set(0, dy, 0);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData = { isDevice: true, deviceId: device.id, rackIndex };
      rackGroup.add(mesh);
      deviceMeshes.push(mesh);
      meshToDevice.set(mesh.uuid, { ...device, rackIndex });

      // LED
      const ledColor = 0x22c55e;
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.8), new THREE.MeshBasicMaterial({ color: ledColor }));
      led.position.set(rackWidth/2 - 5, 0, rackDepth/2 - 4);
      mesh.add(led);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.2), new THREE.MeshBasicMaterial({ color: ledColor, transparent: true, opacity: 0.3 }));
      led.add(glow);
    });

    return { group: rackGroup, doorGroup, sidePanels, deviceMeshes, meshToDevice };
  }

  // ─── THREE.JS SCENE SETUP ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "ok" || !mountRef.current || allRacksData.length === 0) return;

    const currentTheme = resolvedTheme || theme || "light";

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(currentTheme === "dark" ? "#020617" : "#f8fafc");
    sceneRef.current = scene;

    // Camera: position to see all racks
    const totalSpan = (allRacksData.length - 1) * RACK_SPACING;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000);
    const camZ = 450 + totalSpan * 0.4;
    camera.position.set(totalSpan / 2, 200, camZ);
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false, powerPreference: "default" });
    } catch (e) {
      try {
        const canvas = document.createElement("canvas");
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
      } catch (fallbackError) {
        setErrorMessage("WebGL not supported"); setStatus("error"); return;
      }
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    // Anisotropic filtering: removes texture noise/aliasing at oblique angles
    renderer.capabilities.getMaxAnisotropy && (THREE.Texture.DEFAULT_ANISOTROPY = renderer.capabilities.getMaxAnisotropy());
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls: target center of all racks
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;
    controls.minDistance = 80; controls.maxDistance = 1500;
    controls.enablePan = true; controls.enableZoom = true; controls.enableRotate = true;
    controls.target.set(totalSpan / 2, 120, 0);
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100); dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x3b82f6, 0.5);
    pointLight.position.set(totalSpan / 2, 150, 150); scene.add(pointLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-100, 50, -100);
    scene.add(backLight);

    // Ground + Grid
    const gridHelper = new THREE.GridHelper(4000, 200, currentTheme === "dark" ? 0x334155 : 0xcbd5e1, currentTheme === "dark" ? 0x1e293b : 0xe2e8f0);
    gridHelper.position.y = -1; scene.add(gridHelper); gridHelperRef.current = gridHelper;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: currentTheme === "dark" ? 0x020617 : 0xf1f5f9, roughness: 0.8, metalness: 0.2 }));
    groundRef.current = ground; ground.rotation.x = -Math.PI / 2; ground.position.y = -1.01; ground.receiveShadow = true; scene.add(ground);

    // Build all racks
    const isSmartRack = config.rackType === "smartrack";
    doorGroupsRef.current = [];
    panelsRef.current = [];
    deviceMeshesRef.current = [];
    devicesMapRef.current.clear();

    allRacksData.forEach((rackData, idx) => {
      const offsetX = idx * RACK_SPACING;
      const devices = allRacksDevices[idx] ?? [];
      const { doorGroup, sidePanels, deviceMeshes, meshToDevice } = buildRackGroup(scene, rackData, devices, offsetX, idx, isSmartRack, currentTheme);
      doorGroupsRef.current.push(doorGroup);
      panelsRef.current.push(...sidePanels);
      deviceMeshesRef.current.push(...deviceMeshes);
      meshToDevice.forEach((v, k) => devicesMapRef.current.set(k, v));
    });

    // Animate
    const animate = (time: number) => {
      animationRef.current = requestAnimationFrame(animate);
      TWEEN.update(time);
      controls.update();
      renderer.render(scene, camera);
    };
    animate(0);

    // Resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const rw = mountRef.current.clientWidth, rh = mountRef.current.clientHeight;
      cameraRef.current.aspect = rw / rh; cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(rw, rh);
    };
    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserverRef.current?.disconnect();
      try { mountRef.current?.removeChild(renderer.domElement); } catch {}
      renderer.dispose();
    };
  }, [status, resolvedTheme, allRacksData, allRacksDevices, viewMode, RACK_SPACING]);

  // Theme update without full scene rebuild
  useEffect(() => {
    if (!sceneRef.current) return;
    const ct = resolvedTheme || theme || "light";
    sceneRef.current.background = new THREE.Color(ct === "dark" ? "#020617" : "#f8fafc");
    if (groundRef.current && groundRef.current.material instanceof THREE.MeshStandardMaterial)
      groundRef.current.material.color.set(ct === "dark" ? 0x020617 : 0xf1f5f9);
    if (gridHelperRef.current && sceneRef.current) {
      sceneRef.current.remove(gridHelperRef.current);
      const ng = new THREE.GridHelper(4000, 200, ct === "dark" ? 0x334155 : 0xcbd5e1, ct === "dark" ? 0x1e293b : 0xe2e8f0);
      ng.position.y = -1; sceneRef.current.add(ng); gridHelperRef.current = ng;
    }
  }, [resolvedTheme, theme]);

  // ─── Interaction ───────────────────────────────────────────────────────────────
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(deviceMeshesRef.current);

    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;
      const meshUuid = obj.uuid;
      const device = devicesMapRef.current.get(meshUuid);
      const rackIdx = obj.userData.rackIndex ?? 0;
      const rackName = allRacksData[rackIdx]?.name;

      if (meshUuid !== hoveredDeviceId) {
        setHoveredDeviceId(meshUuid);
        document.body.style.cursor = "pointer";
        obj.material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333 });
      }
      if (device) setTooltip({ show: true, x: event.clientX, y: event.clientY, content: device.name, rackName });
    } else {
      setTooltip(null);
      if (hoveredDeviceId) {
        setHoveredDeviceId(null);
        document.body.style.cursor = "default";
        deviceMeshesRef.current.forEach(mesh => {
          const dev = devicesMapRef.current.get(mesh.uuid);
          if (dev) {
            const tl = new THREE.TextureLoader();
            let img = "/images/SERVER.png";
            if (dev.type === "ups") img = "/images/UPS.png";
            else if (dev.type === "ac") img = "/images/COOLING.png";
            (mesh as THREE.Mesh).material = [
              new THREE.MeshStandardMaterial({ color: 0x334155 }),
              new THREE.MeshStandardMaterial({ color: 0x334155 }),
              new THREE.MeshStandardMaterial({ color: 0x475569 }),
              new THREE.MeshStandardMaterial({ color: 0x1e293b }),
              new THREE.MeshStandardMaterial({ map: tl.load(img) }),
              new THREE.MeshStandardMaterial({ color: 0x0f172a }),
            ];
          }
        });
      }
    }
  }, [hoveredDeviceId, allRacksData]);

  const onClick = useCallback(() => {
    if (!hoveredDeviceId) return;
    const device = devicesMapRef.current.get(hoveredDeviceId);
    if (device && cameraRef.current && controlsRef.current) {
      setSelectedDeviceInfo(device);
      setShowInfoModal(true);
      const mesh = deviceMeshesRef.current.find(m => m.uuid === hoveredDeviceId);
      if (mesh) {
        const wp = new THREE.Vector3(); mesh.getWorldPosition(wp);
        const camTarget = wp.clone().add(new THREE.Vector3(100, 50, 100));
        new TWEEN.Tween(cameraRef.current.position).to(camTarget, 1000).easing(TWEEN.Easing.Cubic.Out).start();
        new TWEEN.Tween(controlsRef.current.target).to(wp, 1000).easing(TWEEN.Easing.Cubic.Out).start();
      }
    }
  }, [hoveredDeviceId]);

  const handleViewModeChange = (mode: "normal" | "temp" | "power" | "cooling" | "space" | "serverDetail") => {
    setViewMode(mode);
    if (mode === "normal") { setIsPanelOpen(false); return; }
    const vizConfig = primaryRack?.visualizationConfigs?.[mode];
    if (vizConfig?.enabled) {
      let relevantDevices: DeviceInfo[] = [];
      if (mode === "space") { relevantDevices = primaryDevices; }
      else if ((vizConfig as VisModeConfig).devices) {
        relevantDevices = (vizConfig as VisModeConfig).devices.map(cd => ({
          id: cd.deviceId, deviceId: cd.deviceId,
          name: primaryDevices.find(d => d.deviceId === cd.deviceId)?.name || cd.deviceId,
          topic: cd.topic, keys: cd.keys, type: "server" as const,
          position: null, height: null, connectivity: "offline" as const, telemetry: {},
        }));
      }
      setPanelDevices(relevantDevices);
      setPanelTitle({ normal: "Normal", temp: "Temperature", power: "Power", cooling: "Cooling", space: "Space Utilization", serverDetail: "Server Details" }[mode]);
      setIsPanelOpen(true);
    } else { setIsPanelOpen(false); }
  };

  const setView = (view: "front" | "back" | "top" | "side") => {
    if (!cameraRef.current || !controlsRef.current) return;
    const totalSpan = (allRacksData.length - 1) * RACK_SPACING;
    const cx = totalSpan / 2;
    const pos = { front: [cx, 100, 450 + totalSpan * 0.5], back: [cx, 100, -(450 + totalSpan * 0.5)], side: [cx + 450, 100, 0], top: [cx, 500, 0] }[view] as [number, number, number];
    new TWEEN.Tween(cameraRef.current.position).to({ x: pos[0], y: pos[1], z: pos[2] }, 1000).easing(TWEEN.Easing.Cubic.Out).start();
    controlsRef.current.target.set(cx, 100, 0);
  };

  const toggleDoor = () => {
    doorGroupsRef.current.forEach(dg => {
      const target = isDoorOpen ? 0 : Math.PI / 2;
      new TWEEN.Tween(dg.rotation).to({ y: target }, 1000).easing(TWEEN.Easing.Bounce.Out).start();
    });
    setIsDoorOpen(!isDoorOpen);
  };

  const toggleTransparency = () => {
    setIsTransparent(!isTransparent);
    panelsRef.current.forEach(p => { p.visible = isTransparent; });
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm text-slate-500">Loading 3D Scene{resolvedRackIds.length > 1 ? ` (${resolvedRackIds.length} racks)` : ""}…</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-700 dark:text-red-400">Failed to load rack</p>
        <p className="text-sm text-red-600 dark:text-red-300 mt-1">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}>
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" onMouseMove={onMouseMove} onClick={onClick} />

      {/* Tooltip */}
      {tooltip?.show && (
        <div className="fixed z-[100] pointer-events-none bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-2xl border border-white/10 flex flex-col gap-0.5" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
          <p className="text-xs font-bold whitespace-nowrap">{tooltip.content}</p>
          {tooltip.rackName && <p className="text-[10px] text-slate-400 whitespace-nowrap">{tooltip.rackName}</p>}
        </div>
      )}

      {/* Header */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-lg">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            {isMultiRack ? `${allRacksData.length} Racks` : (allRacksData[0]?.name || config.customName)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {flatDevices.length} Devices • {isDoorOpen ? "Doors Open" : "Doors Closed"}
            {isMultiRack && <span className="ml-2 text-blue-400 font-semibold">Multi-Rack Scene</span>}
          </p>
        </div>
      </div>

      {/* Interactive Side Panel */}
      <InteractiveSidePanel
        isOpen={isPanelOpen} onClose={() => handleViewModeChange("normal")}
        title={panelTitle} devices={panelDevices} onHoverDevice={setHoveredDeviceId}
        hoveredDeviceId={hoveredDeviceId} viewMode={viewMode}
        rackCapacity={primaryRack?.capacityU || 42} allRackDevices={primaryDevices}
      />

      {/* View Mode Tabs */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-xl flex items-center gap-1">
          {(["normal", "temp", "power", "cooling", "space", "serverDetail"] as const).map(m => {
            const label = { normal: "Normal", temp: "Heatmap", power: "Power", cooling: "Cooling", space: "Space", serverDetail: "Server Detail" }[m];
            const color = { normal: "", temp: "bg-orange-500 hover:bg-orange-600", power: "bg-indigo-500 hover:bg-indigo-600", cooling: "bg-cyan-500 hover:bg-cyan-600", space: "bg-blue-500 hover:bg-blue-600", serverDetail: "bg-slate-500 hover:bg-slate-600" }[m];
            if (m !== "normal" && !primaryRack?.visualizationConfigs?.[m]?.enabled) return null;
            return (
              <Button key={m} variant={viewMode === m ? "default" : "ghost"} size="sm" onClick={() => handleViewModeChange(m)} className={`rounded-full h-8 px-3 text-xs ${viewMode === m && m !== "normal" ? color : ""}`}>
                {m === "serverDetail" && <Cpu className="h-3.5 w-3.5 mr-1" />}
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Controls — left side, vertical */}
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${showControls ? "translate-x-0 opacity-100" : "-translate-x-16 opacity-0"}`}>
        <div className="flex flex-col items-center gap-2 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50">
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setView("front")} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"><Move3D className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent side="right">Front View</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setView("side")} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"><RotateCcw className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent side="right">Side View</TooltipContent></Tooltip>
            <div className="h-px w-6 bg-slate-200 dark:bg-slate-700 my-1" />
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleDoor} className={isDoorOpen ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "hover:bg-slate-100 dark:hover:bg-slate-700"}>{isDoorOpen ? <DoorOpen className="h-5 w-5" /> : <DoorClosed className="h-5 w-5" />}</Button></TooltipTrigger><TooltipContent side="right">Toggle Door(s)</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleTransparency} className={isTransparent ? "text-purple-600 bg-purple-50 dark:bg-purple-900/20" : "hover:bg-slate-100 dark:hover:bg-slate-700"}>{isTransparent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Button></TooltipTrigger><TooltipContent side="right">Toggle Side Panels</TooltipContent></Tooltip>
            <div className="h-px w-6 bg-slate-200 dark:bg-slate-700 my-1" />
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setShowRackInfoModal(true)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"><Info className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent side="right">Rack Info</TooltipContent></Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Toggle controls button — bottom left */}
      <Button variant="secondary" size="icon" className="absolute bottom-4 left-4 z-10 rounded-full shadow-lg" onClick={() => setShowControls(!showControls)}>
        {showControls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10 text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={() => setIsFullscreen(!isFullscreen)}>
        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </Button>

      {/* Rack Info Modal (toolbar INFO button) */}
      <RackInfoModal isOpen={showRackInfoModal} onClose={() => setShowRackInfoModal(false)} racksData={allRacksData} />

      {/* Device Info Modal (click device in 3D) */}
      <InfoModal isOpen={showInfoModal && !!selectedDeviceInfo} onClose={() => { setShowInfoModal(false); setSelectedDeviceInfo(null); }} selectedDeviceInfo={selectedDeviceInfo} />

      {/* Rack Summary (single rack only) */}
      {!isMultiRack && (
        <div style={{ display: "none" }}>
          {/* RackSummaryModal removed in multi-rack mode for simplicity */}
        </div>
      )}
    </div>
  );
};
