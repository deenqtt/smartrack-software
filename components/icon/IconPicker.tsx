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
import { Switch } from "@/components/ui/switch";
import {
  // Common icons used in IoT/monitoring
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
} from "lucide-react";

export const iconList = [
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
  { name: "VolumeX", icon: VolumeX, category: "audio" }
];

const categories = [
  { key: "all", label: "All Icons" },
  { key: "sensors", label: "Sensors" },
  { key: "electrical", label: "Electrical" },
  { key: "monitoring", label: "Monitoring" },
  { key: "connectivity", label: "Connectivity" },
  { key: "alerts", label: "Alerts" },
  { key: "status", label: "Status" },
  { key: "environmental", label: "Environmental" },
  { key: "security", label: "Security" },
  { key: "buildings", label: "Buildings" },
  { key: "vehicles", label: "Vehicles" },
  { key: "shapes", label: "Shapes" },
  { key: "navigation", label: "Navigation" }
];

interface IconPickerProps {
  showIcon: boolean;
  iconName?: string;
  iconColor?: string;
  onShowIconChange: (show: boolean) => void;
  onIconChange: (iconName: string) => void;
  onIconColorChange: (color: string) => void;
}

export default function IconPicker({
  showIcon,
  iconName,
  iconColor = "#666666",
  onShowIconChange,
  onIconChange,
  onIconColorChange
}: IconPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIcons = iconList.filter(icon => {
    const matchesCategory = selectedCategory === "all" || icon.category === selectedCategory;
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedIcon = iconList.find(icon => icon.name === iconName);
  const IconComponent = selectedIcon?.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="showIcon">Show Icon</Label>
        <Switch
          id="showIcon"
          checked={showIcon}
          onCheckedChange={onShowIconChange}
        />
      </div>

      {showIcon && (
        <>
          <div>
            <Label>Select Icon</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10 mt-1"
                >
                  {IconComponent ? (
                    <div className="flex items-center gap-2">
                      <IconComponent size={16} style={{ color: iconColor }} />
                      <span>{iconName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select an icon</span>
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

                  <div className="grid grid-cols-6 gap-2">
                    {filteredIcons.map((icon) => {
                      const Icon = icon.icon;
                      return (
                        <Button
                          key={icon.name}
                          variant={iconName === icon.name ? "default" : "outline"}
                          size="sm"
                          onClick={() => onIconChange(icon.name)}
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
          </div>

          <div>
            <Label htmlFor="iconColor">Icon Color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="iconColor"
                type="color"
                value={iconColor}
                onChange={(e) => onIconColorChange(e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                value={iconColor}
                onChange={(e) => onIconColorChange(e.target.value)}
                placeholder="#666666"
                className="flex-1"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
