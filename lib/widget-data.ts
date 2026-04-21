import {
  type LucideIcon,
  Activity,
  AreaChart,
  Gauge,
  Table,
  ToggleRight,
  Box,
  AlertTriangle,
  Zap,
  LayoutPanelLeft,
  HardDrive,
  Bell,
  Plug,
  PowerOff,
  SlidersHorizontal,
  Server,
  Container,
  Building,
  CircuitBoard,
  Sigma,
  Clock,
  BatteryCharging,
  TrendingUp,
  ChevronRightSquare,
  ChevronRight,
  Thermometer,
  RadioTower,
  Wind,
  LineChart,
  BarChart,
  PieChart,
  List,
  ShieldCheck,
  Lock,
  Move3D,
  Radio,
  MonitorPlay,
  Wrench,
  Calendar,
  Router,
  Smartphone,
  Signal,
  Lightbulb,
  Layout,
  Type,
  Users,
  MapPin,
  Database,
  Image,
  Fan,
  Sparkles,
} from "lucide-react";

// Tipe untuk memperjelas struktur data
interface Widget {
  name: string;
  category: string;
  icon?: LucideIcon | string; // Support both Lucide icons and SVG paths
  description: string;
}

interface MainWidgetCategory {
  name: string;
  category: string;
  icon?: LucideIcon | string; // Support both Lucide icons and SVG paths
  description: string;
}

// Main widget categories organized by dashboard priority:
// 1. Critical monitoring (safety, power, temperature - show system health)
// 2. Control systems (buttons, switches - enable active intervention)
// 3. Data visualization (charts, trends - understand system behavior)
// 4. System communication (alarms - external monitoring)
// 5. Operational management (schedules, maintenance - long-term operations)
// 6. Content & Media (text, images, media content)
// 7. Advanced visualization (3D views - specialized insights)
export const mainWidgets: MainWidgetCategory[] = [
  {
    name: "System Health",
    category: "Health",
    icon: ShieldCheck,
    description:
      "Critical system monitoring and status indicators for operational safety.",
  },
  {
    name: "Device Controls",
    category: "Controls",
    icon: SlidersHorizontal,
    description: "Interactive controls for device management and operation.",
  },
  {
    name: "Data & Charts",
    category: "Analytics",
    icon: BarChart,
    description: "Charts, graphs, and data visualization tools for analysis.",
  },
  {
    name: "Alerts & Security",
    category: "Security",
    icon: Bell,
    description: "Alarms, notifications, and security monitoring systems.",
  },
  {
    name: "IoT & Connectivity",
    category: "IoT",
    icon: Radio,
    description: "IoT devices and network connectivity management.",
  },
  {
    name: "Operations",
    category: "Operations",
    icon: Wrench,
    description: "Maintenance, scheduling, and operational management.",
  },
  {
    name: "Content & Media",
    category: "Content",
    icon: Layout,
    description: "Text cards, images, and media content for dashboards.",
  },
  {
    name: "3D Visualization",
    category: "Visualization",
    icon: Box,
    description: "3D models and advanced visual components.",
  },
  {
    name: "Custom Widget",
    category: "Custom",
    icon: Box,
    description: "",
  },
];

// All widgets organized by dashboard priority for better user workflow
export const widgets: Widget[] = [
  // === SYSTEM HEALTH (Priority 1: System Health) ===
  // Essential status indicators that show if systems are operating safely
  {
    name: "Ups Dashboard",
    category: "Custom",
    icon: Lock,
    description:
      "Monitor real-time status of Uninterruptible Power Supply (UPS) systems in the smart rack.",
  },

  {
    name: "Cooling Dashboard",
    category: "Custom",
    icon: Fan,
    description:
      "Monitor and visualize HVAC and cooling systems status and airflow.",
  },
  {
    name: "Environment Monitor",
    category: "Custom",
    icon: Thermometer,
    description:
      "Monitor rack environment including temperature, humidity, vibration, and water leaks.",
  },
  {
    name: "PDM Topology",
    category: "Custom",
    icon: Zap,
    description:
      "Power Distribution Management topology visualization for monitoring power flow and distribution infrastructure.",
  },
  {
    name: "Circuit Breaker Status",
    category: "Health",
    icon: PowerOff,
    description: "Electrical circuit breaker monitoring and protection status.",
  },
  {
    name: "Status Indicator Card",
    category: "Health",
    icon: ShieldCheck,
    description:
      "Visual status indicators for system health and operational status.",
  },
  {
    name: "Metric Display",
    category: "Health",
    icon: Activity,
    description:
      "Display key performance indicators and critical system metrics.",
  },
  {
    name: "Status Dashboard",
    category: "Health",
    icon: List,
    description:
      "Comprehensive overview of system status across multiple components.",
  },
  {
    name: "Temperature Gauge",
    category: "Health",
    icon: Thermometer,
    description: "Temperature monitoring with visual indicators and alerts.",
  },
  {
    name: "Analog Meter",
    category: "Health",
    icon: Gauge,
    description:
      "Traditional analog-style meters for pressure, flow, and other parameters.",
  },
  {
    name: "Equipment Runtime",
    category: "Health",
    icon: Clock,
    description: "Track operational hours and equipment usage statistics.",
  },
  {
    name: "Computed Metric",
    category: "Health",
    icon: Sigma,
    description:
      "Display calculated values and derived performance indicators.",
  },
  {
    name: "Protocol Monitor",
    category: "Health",
    icon: RadioTower,
    description:
      "Monitor communication protocols and network connectivity status.",
  },

  // === DEVICE CONTROLS (Priority 2: Active Intervention) ===
  // Controls that allow operators to actively manage systems

  {
    name: "Device Control Panel",
    category: "Controls",
    icon: SlidersHorizontal,
    description:
      "Control panel for devices with parameter write capabilities, validation, and real-time feedback via MQTT.",
  },
  {
    name: "Modular Control Button",
    category: "Controls",
    icon: Plug,
    description: "Interactive button controls for modular device systems.",
  },
  {
    name: "Modbus Button Control",
    category: "Controls",
    icon: ToggleRight,
    description: "ON/OFF button control for a single key on a Modbus device.",
  },
  {
    name: "Modular Button Control",
    category: "Controls",
    icon: ToggleRight,
    description:
      "ON/OFF button control for a single key on a Modular/I2C device.",
  },

  // === DATA & CHARTS (Priority 3: Understanding Behavior) ===
  // Charts and graphs to understand system performance and trends
  {
    name: "Simple Trend Chart",
    category: "Analytics",
    icon: LineChart,
    description:
      "Basic trending charts for analyzing single value changes over time.",
  },
  {
    name: "Line Chart",
    category: "Analytics",
    icon: LineChart,
    description: "Display data trends and patterns over time periods.",
  },
  {
    name: "Bar Chart",
    category: "Analytics",
    icon: BarChart,
    description: "Compare values across different categories or time periods.",
  },
  {
    name: "Multi-Line Chart",
    category: "Analytics",
    icon: LineChart,
    description: "Display multiple data series trends on a single chart.",
  },
  {
    name: "Power Analysis Chart",
    category: "Analytics",
    icon: Zap,
    description:
      "Specialized charts for detailed power analyzer data analysis.",
  },
  {
    name: "Power Generation Chart",
    category: "Analytics",
    icon: Wind,
    description: "Real-time power generation monitoring and analysis charts.",
  },
  {
    name: "Energy Target Chart",
    category: "Analytics",
    icon: TrendingUp,
    description:
      "Compare energy targets versus actual consumption with variance analysis.",
  },
  {
    name: "Carbon Emissions",
    category: "Analytics",
    icon: Wind,
    description:
      "Real-time carbon footprint monitoring and historical emission tracking.",
  },
  {
    name: "Predictive Billing",
    category: "Analytics",
    icon: TrendingUp,
    description: "AI-powered power consumption forecast and cost estimation.",
  },
  {
    name: "AI Energy Advisor",
    category: "Analytics",
    icon: Sparkles,
    description:
      "Artificial Intelligence energy advisor for smart recommendations, anomaly detection and optimization tips.",
  },
  {
    name: "Top Values Comparator",
    category: "Analytics",
    icon: TrendingUp,
    description:
      "Compare and rank top/bottom values across multiple devices for efficient monitoring.",
  },
  {
    name: "Data Chart",
    category: "Analytics",
    icon: AreaChart,
    description:
      "Flexible chart for manual logs with a summary display (Total, Average, etc.).",
  },
  {
    name: "Daily Device Summary",
    category: "Analytics",
    icon: List,
    description: "Daily summary of device performance and log counts.",
  },
  {
    name: "Daily Device Detail",
    category: "Analytics",
    icon: Activity,
    description: "Detailed daily statistics for a specific device.",
  },
  {
    name: "Daily Key Detail",
    category: "Analytics",
    icon: SlidersHorizontal,
    description: "In-depth daily analysis of a specific device parameter.",
  },

  // === ALERTS & SECURITY (Priority 4: External Awareness) ===
  // Alarms and notifications that communicate system status externally
  {
    name: "Active Alarms",
    category: "Security",
    icon: Bell,
    description:
      "Summary of active alarm count and priority levels with real-time updates.",
  },
  {
    name: "Alarm History",
    category: "Security",
    icon: HardDrive,
    description:
      "Historical log of all alarm events, actions, and resolutions.",
  },
  {
    name: "Dynamic Alarm",
    category: "Security",
    icon: AlertTriangle,
    description:
      "Configurable alarm monitor with dynamic conditions and priority levels.",
  },
  {
    name: "MQTT Status Card",
    category: "Security",
    icon: RadioTower,
    description:
      "Monitor a single key value from a Modbus or Modular MQTT device with icon and status indicator.",
  },
  {
    name: "Grouped MQTT Status",
    category: "Security",
    icon: RadioTower,
    description:
      "Display multiple keys from a single MQTT topic in a grouped list, each with independent condition logic and custom labels.",
  },

  // === IOT & CONNECTIVITY (Priority 5: Device Management) ===
  // IoT and network device monitoring and control
  {
    name: "Connection",
    category: "IoT",
    icon: Plug,
    description:
      "Monitor and control device connections and communication status.",
  },

  // === OPERATIONS (Priority 6: Long-term Operations) ===
  // Maintenance, energy tracking, and operational oversight
  {
    name: "System Health",
    category: "Operations",
    icon: ShieldCheck,
    description:
      "Monitor overall system health with CPU, memory, containers, and services status.",
  },
  {
    name: "Docker Status",
    category: "Operations",
    icon: Container,
    description:
      "Monitor Docker containers, images, and services with health status indicators.",
  },
  {
    name: "Database Status",
    category: "Operations",
    icon: Database,
    description:
      "Monitor PostgreSQL database connections, performance metrics, and health status.",
  },
  {
    name: "Storage Capacity",
    category: "Operations",
    icon: HardDrive,
    description:
      "Monitor disk usage, database size, and storage capacity with donut charts.",
  },
  {
    name: "Device Activity Logs",
    category: "Operations",
    icon: Activity,
    description:
      "Monitor real-time device activity logs and MQTT message streams.",
  },
  {
    name: "Device Connectivity Summary",
    category: "Operations",
    icon: Server,
    description:
      "Display total devices, active connections, and connectivity status overview.",
  },
  {
    name: "Energy Variance Tracker",
    category: "Operations",
    icon: TrendingUp,
    description:
      "Track variance between energy targets and actual consumption with alerts.",
  },
  {
    name: "Current Month Energy Usage",
    category: "Operations",
    icon: BatteryCharging,
    description:
      "Monitor total energy consumption for the current month with trend analysis.",
  },
  {
    name: "Previous Month Energy Usage",
    category: "Operations",
    icon: BatteryCharging,
    description:
      "Review energy consumption data from the previous month with comparisons.",
  },
  {
    name: "Maintenance Schedule",
    category: "Operations",
    icon: Calendar,
    description:
      "Calendar view of scheduled maintenance tasks, deadlines, and assignments.",
  },
  {
    name: "Maintenance Tasks",
    category: "Operations",
    icon: Wrench,
    description:
      "Recent maintenance tasks with status tracking and completion metrics.",
  },
  {
    name: "Maintenance Analytics",
    category: "Operations",
    icon: BarChart,
    description:
      "Overview of maintenance completion rates, costs, and performance metrics.",
  },
  {
    name: "User List",
    category: "Operations",
    icon: Users,
    description:
      "Comprehensive user management with role-based filtering, search, and activity monitoring.",
  },
  {
    name: "Dashboard Auto Switcher",
    category: "Operations",
    icon: Layout,
    description:
      "Automatically cycle through multiple dashboard views at specified intervals.",
  },

  // === IOT & CONNECTIVITY (Priority 5: Device Management) ===
  // IoT and network device monitoring and control

  // === CONTENT & MEDIA (Priority 7: Content) ===
  // Text cards, images, and media content
  {
    name: "Dynamic Content Card",
    category: "Content",
    icon: Type,
    description:
      "Dynamic content cards with text, images, and links. Fully customizable with enable/disable features.",
  },
  {
    name: "Simple Text Card",
    category: "Content",
    icon: Type,
    description:
      "Clean and simple text-only card with customizable styling, perfect for announcements and information display.",
  },
  {
    name: "Advanced Card",
    category: "Content",
    icon: Layout,
    description:
      "Full-featured card with header, content, and footer sections. Supports rich content, images, and interactive elements.",
  },
  {
    name: "Image Display",
    category: "Content",
    icon: Image,
    description:
      "Display single images with zoom, fit options, and customizable borders. Supports various image formats.",
  },
  {
    name: "Dashboard Shortcut",
    category: "Content",
    icon: LayoutPanelLeft,
    description:
      "Quick navigation shortcuts to other dashboard views and pages.",
  },
  {
    name: "Document Viewer",
    category: "Content",
    icon: HardDrive,
    description:
      "Document viewer for PDF, DOC, and other file formats with navigation and search.",
  },

  // === 3D VISUALIZATION (Priority 8: Advanced Visual) ===
  // 3D models and advanced visual components
  {
    name: "Server Rack 3D",
    category: "Visualization",
    icon: Server,
    description:
      "3D visualization of equipment racks and server layouts with real-time status.",
  },
  {
    name: "Smart Rack 2D",
    category: "Visualization",
    icon: Layout,
    description:
      "2D layout visualization for Single or Multi Smart Racks with real-time utilization.",
  },
];

// --- Helper Functions ---

// Function to get widget data by widget ID
export const getWidgetData = (widgetId: string) => {
  const baseName = widgetId.split("-widget-")[0].replace(/-/g, " ");
  return widgets.find((w) => w.name.toLowerCase() === baseName.toLowerCase());
};

// Function to count widgets in a specific category
export const getWidgetCount = (category: string): number => {
  return widgets.filter((w) => w.category === category).length;
};

// Function to get widgets by priority order (for dashboard workflow)
export const getWidgetsByPriority = () => {
  return widgets.slice(); // Priority order already established in export
};

// Function to get widgets filtered by category
export const getWidgetsByCategory = (category: string) => {
  return widgets.filter((w) => w.category === category);
};

// Function to get main categories in priority order
export const getMainCategoriesByPriority = () => {
  return mainWidgets.slice();
};
