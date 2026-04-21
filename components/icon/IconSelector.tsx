"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  // Common icons used in IoT/monitoring - grouped by categories
  Thermometer,
  Droplets,
  Zap,
  Activity,
  Battery,
  Wifi,
  Signal,
  Power,
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  Clock,
  Calendar,
  MapPin,
  Home,
  Building,
  Factory,
  Car,
  Truck,
  Plane,
  Ship,
  Train,
  Lightbulb,
  Fan,
  Wind,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Flame,
  Eye,
  Camera,
  Lock,
  Unlock,
  Shield,
  Key,
  User,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Bell,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Triangle,
  Star,
  Heart,
  Target,
  Crosshair,
  Navigation,
  Compass,
  Radar,
  Radio,
  BarChart3,
  PieChart,
  LineChart,
  Layers,
  Grid,
  Layout,
  Monitor,
  Database,
  Server,
  Router,
  Globe,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Bluetooth,
  Usb,
  Smartphone,
  Tablet,
  Laptop,
  Printer,
  Keyboard,
  Mouse,
  Speaker,
  Headphones,
  SkipForward,
  SkipBack,
  RotateCcw,
  RefreshCw,
  Download,
  Upload,
  Save,
  Edit,
  Trash2,
  Plus,
  Minus,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Circle,
  CircleDot
} from "lucide-react";

const iconList = [
  { name: "Thermometer", icon: Thermometer, category: "sensors" },
  { name: "Droplets", icon: Droplets, category: "sensors" },
  { name: "Zap", icon: Zap, category: "electrical" },
  { name: "Activity", icon: Activity, category: "monitoring" },
  { name: "Battery", icon: Battery, category: "electrical" },
  { name: "Wifi", icon: Wifi, category: "connectivity" },
  { name: "Signal", icon: Signal, category: "connectivity" },
  { name: "Power", icon: Power, category: "electrical" },
  { name: "Gauge", icon: Gauge, category: "monitoring" },
  { name: "TrendingUp", icon: TrendingUp, category: "trends" },
  { name: "TrendingDown", icon: TrendingDown, category: "trends" },
  { name: "AlertTriangle", icon: AlertTriangle, category: "alerts" },
  { name: "CheckCircle", icon: CheckCircle, category: "status" },
  { name: "XCircle", icon: XCircle, category: "status" },
  { name: "Info", icon: Info, category: "status" },
  { name: "Settings", icon: Settings, category: "controls" },
  { name: "Clock", icon: Clock, category: "time" },
  { name: "Calendar", icon: Calendar, category: "time" },
  { name: "MapPin", icon: MapPin, category: "location" },
  { name: "Home", icon: Home, category: "buildings" },
  { name: "Building", icon: Building, category: "buildings" },
  { name: "Factory", icon: Factory, category: "buildings" },
  { name: "Car", icon: Car, category: "vehicles" },
  { name: "Truck", icon: Truck, category: "vehicles" },
  { name: "Plane", icon: Plane, category: "vehicles" },
  { name: "Ship", icon: Ship, category: "vehicles" },
  { name: "Train", icon: Train, category: "vehicles" },
  { name: "Lightbulb", icon: Lightbulb, category: "electrical" },
  { name: "Fan", icon: Fan, category: "hvac" },
  { name: "Wind", icon: Wind, category: "environmental" },
  { name: "Sun", icon: Sun, category: "environmental" },
  { name: "Moon", icon: Moon, category: "environmental" },
  { name: "CloudRain", icon: CloudRain, category: "environmental" },
  { name: "Snowflake", icon: Snowflake, category: "environmental" },
  { name: "Flame", icon: Flame, category: "environmental" },
  { name: "Eye", icon: Eye, category: "monitoring" },
  { name: "Camera", icon: Camera, category: "monitoring" },
  { name: "Lock", icon: Lock, category: "security" },
  { name: "Unlock", icon: Unlock, category: "security" },
  { name: "Shield", icon: Shield, category: "security" },
  { name: "Key", icon: Key, category: "security" },
  { name: "User", icon: User, category: "people" },
  { name: "Users", icon: Users, category: "people" },
  { name: "Phone", icon: Phone, category: "communication" },
  { name: "Mail", icon: Mail, category: "communication" },
  { name: "MessageSquare", icon: MessageSquare, category: "communication" },
  { name: "Bell", icon: Bell, category: "alerts" },
  { name: "Volume2", icon: Volume2, category: "audio" },
  { name: "VolumeX", icon: VolumeX, category: "audio" },
  { name: "Circle", icon: Circle, category: "shapes" },
  { name: "CircleDot", icon: CircleDot, category: "shapes" },
  { name: "Square", icon: Square, category: "shapes" },
  { name: "Triangle", icon: Triangle, category: "shapes" },
  { name: "Star", icon: Star, category: "shapes" },
  { name: "Heart", icon: Heart, category: "shapes" },
  { name: "Target", icon: Target, category: "navigation" },
  { name: "Crosshair", icon: Crosshair, category: "navigation" },
  { name: "Navigation", icon: Navigation, category: "navigation" },
  { name: "Compass", icon: Compass, category: "navigation" },
  { name: "Radar", icon: Radar, category: "monitoring" },
  { name: "Radio", icon: Radio, category: "connectivity" },
  { name: "BarChart3", icon: BarChart3, category: "charts" },
  { name: "PieChart", icon: PieChart, category: "charts" },
  { name: "LineChart", icon: LineChart, category: "charts" },
  { name: "Layers", icon: Layers, category: "ui" },
  { name: "Grid", icon: Grid, category: "ui" },
  { name: "Layout", icon: Layout, category: "ui" },
  { name: "Monitor", icon: Monitor, category: "devices" },
  { name: "Database", icon: Database, category: "data" },
  { name: "Server", icon: Server, category: "infrastructure" },
  { name: "Router", icon: Router, category: "networking" },
  { name: "Globe", icon: Globe, category: "global" },
  { name: "Cpu", icon: Cpu, category: "hardware" },
  { name: "HardDrive", icon: HardDrive, category: "storage" },
  { name: "MemoryStick", icon: MemoryStick, category: "hardware" },
  { name: "Network", icon: Network, category: "networking" },
  { name: "Bluetooth", icon: Bluetooth, category: "connectivity" },
  { name: "Usb", icon: Usb, category: "connectivity" },
  { name: "Smartphone", icon: Smartphone, category: "devices" },
  { name: "Tablet", icon: Tablet, category: "devices" },
  { name: "Laptop", icon: Laptop, category: "devices" },
  { name: "Printer", icon: Printer, category: "devices" },
  { name: "Keyboard", icon: Keyboard, category: "devices" },
  { name: "Mouse", icon: Mouse, category: "devices" },
  { name: "Speaker", icon: Speaker, category: "audio" },
  { name: "Headphones", icon: Headphones, category: "audio" },
  { name: "SkipForward", icon: SkipForward, category: "media" },
  { name: "SkipBack", icon: SkipBack, category: "media" },
  { name: "RotateCcw", icon: RotateCcw, category: "actions" },
  { name: "RefreshCw", icon: RefreshCw, category: "actions" },
  { name: "Download", icon: Download, category: "actions" },
  { name: "Upload", icon: Upload, category: "actions" },
  { name: "Save", icon: Save, category: "actions" },
  { name: "Edit", icon: Edit, category: "actions" },
  { name: "Trash2", icon: Trash2, category: "actions" },
  { name: "Plus", icon: Plus, category: "actions" },
  { name: "Minus", icon: Minus, category: "actions" },
  { name: "X", icon: X, category: "actions" },
  { name: "Check", icon: Check, category: "actions" },
  { name: "Play", icon: Play, category: "media" },
  { name: "Pause", icon: Pause, category: "media" }
];

const categories = [
  { key: "all", label: "All Icons" },
  { key: "sensors", label: "Sensors" },
  { key: "electrical", label: "Electrical" },
  { key: "monitoring", label: "Monitoring" },
  { key: "connectivity", label: "Connectivity" },
  { key: "alerts", label: "Alerts" },
  { key: "charts", label: "Charts" },
  { key: "status", label: "Status" },
  { key: "environmental", label: "Environment" },
  { key: "security", label: "Security" },
  { key: "buildings", label: "Buildings" },
  { key: "vehicles", label: "Vehicles" },
  { key: "shapes", label: "Shapes" },
  { key: "navigation", label: "Navigation" },
  { key: "ui", label: "UI Elements" },
  { key: "devices", label: "Devices" },
  { key: "data", label: "Data" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "networking", label: "Networking" },
  { key: "hardware", label: "Hardware" },
  { key: "audio", label: "Audio" },
  { key: "media", label: "Media" },
  { key: "actions", label: "Actions" }
];

interface IconSelectorProps {
  value?: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
}

export default function IconSelector({
  value = "",
  onChange,
  placeholder = "Select an icon"
}: IconSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewIcon, setPreviewIcon] = useState<string>("");

  const filteredIcons = iconList.filter(icon => {
    const matchesCategory = selectedCategory === "all" || icon.category === selectedCategory;
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedIcon = iconList.find(icon => icon.name === value);
  const IconComponent = selectedIcon?.icon;
  const previewIconData = iconList.find(icon => icon.name === previewIcon);
  const PreviewIconComponent = previewIconData?.icon;

  return (
    <div className="space-y-2">
      <Label>Select Icon</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start h-10 mt-1"
          >
            {IconComponent ? (
              <div className="flex items-center gap-2">
                <IconComponent size={16} />
                <span>{value}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-96 overflow-auto">
          <div className="space-y-3">
            <Input
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="flex flex-wrap gap-1">
              {categories.map((category) => (
                <Button
                  key={category.key}
                  variant={selectedCategory === category.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.key)}
                  className="text-xs"
                >
                  {category.label}
                </Button>
              ))}
            </div>

            {previewIcon && PreviewIconComponent && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <PreviewIconComponent size={20} />
                <span className="text-sm font-medium">{previewIcon}</span>
              </div>
            )}

            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((icon) => {
                const Icon = icon.icon;
                return (
                  <Button
                    key={icon.name}
                    variant={value === icon.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      onChange(icon.name);
                    }}
                    onMouseEnter={() => setPreviewIcon(icon.name)}
                    onMouseLeave={() => setPreviewIcon("")}
                    className="h-10 w-10 p-0"
                    title={icon.name}
                  >
                    <Icon size={16} />
                  </Button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Icons are from Lucide React. Selected icon will be displayed in the menu.
      </p>
    </div>
  );
}
