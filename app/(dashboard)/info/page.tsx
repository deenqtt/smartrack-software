"use client";

import {
  SiNodedotjs,
  SiPython,
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiHtml5,
  SiTailwindcss,
  SiCss3,
} from "react-icons/si";

import {
  FileQuestion,
  Network,
  Server,
  Settings,
  HardDrive,
  RotateCw,
  SatelliteDish,
  GaugeCircle,
  BarChart3,
  Database,
  Wrench,
  Code,
  Calculator,
  Mic,
  Clock,
  ArrowLeftRight,
  Search,
  Shield,
  Wifi,
  Monitor,
  Activity,
  FileText,
  Info,
  Zap,
  Smartphone,
  RadioTower,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useMenu, useMenuItemPermissions } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";

// Function to map menu items to features dynamically from actual menu data
const mapMenuToFeatures = (menuData: any) => {
  const featureMap: Record<string, any> = {
    // Dashboard items
    "Overview Dashboard": {
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      category: "Dashboard",
      description: "Real-time overview dashboard with system metrics and key indicators.",
    },
    "Process Flow": {
      icon: <Network className="w-6 h-6 text-blue-600" />,
      category: "Dashboard",
      description: "Interactive 2D process flow visualization for industrial operations.",
    },

    // Devices items
    "Internal Devices": {
      icon: <HardDrive className="w-6 h-6 text-green-600" />,
      category: "Device Management",
      description: "Manage and monitor internal device racks and data center infrastructure.",
    },
    "External Devices": {
      icon: <RadioTower className="w-6 h-6 text-green-600" />,
      category: "Device Management",
      description: "Handle MQTT-connected external IoT devices and sensors.",
    },
    "Access Controllers": {
      icon: <Shield className="w-6 h-6 text-green-600" />,
      category: "Device Management",
      description: "Configure access control systems and security devices.",
    },
    // Network items
    "Communication Setup": {
      icon: <Network className="w-6 h-6 text-blue-500" />,
      category: "Network Configuration",
      description: "Configure communication protocols and gateway settings.",
    },
    "MQTT Broker": {
      icon: <SatelliteDish className="w-6 h-6 text-blue-500" />,
      category: "Network Configuration",
      description: "Manage MQTT message broker connections and subscriptions.",
    },

    // System Config items
    "User Management": {
      icon: <Shield className="w-6 h-6 text-purple-600" />,
      category: "System Configuration",
      description: "Manage system users, roles, and access permissions.",
    },
    "Power Analyzer": {
      icon: <Zap className="w-6 h-6 text-purple-600" />,
      category: "System Configuration",
      description: "Configure power analysis tools and energy monitoring.",
    },
    "System Backup": {
      icon: <HardDrive className="w-6 h-6 text-purple-600" />,
      category: "System Configuration",
      description: "Manage system backups and data recovery procedures.",
    },
    "Menu Management": {
      icon: <Settings className="w-6 h-6 text-purple-600" />,
      category: "System Configuration",
      description: "Customize and manage system navigation menus.",
    },

    // Analytics items
    "Alarm Management": {
      icon: <Activity className="w-6 h-6 text-red-600" />,
      category: "Analytics & Monitoring",
      description: "Configure alarm thresholds and notification systems.",
    },
    "Alarm Reports": {
      icon: <FileText className="w-6 h-6 text-red-600" />,
      category: "Analytics & Monitoring",
      description: "Generate and analyze alarm reports and historical data.",
    },
    "Device Analytics": {
      icon: <BarChart3 className="w-6 h-6 text-red-600" />,
      category: "Analytics & Monitoring",
      description: "Comprehensive device performance analytics and insights.",
    },

    // Maintenance items
    "Maintenance Schedule": {
      icon: <Wrench className="w-6 h-6 text-orange-600" />,
      category: "Maintenance",
      description: "Schedule and manage preventive maintenance tasks.",
    },
    "Rack Management": {
      icon: <Server className="w-6 h-6 text-orange-600" />,
      category: "Maintenance",
      description: "Monitor and manage server racks and data center equipment.",
    },
    "System Information": {
      icon: <Info className="w-6 h-6 text-orange-600" />,
      category: "Maintenance",
      description: "View comprehensive system information and diagnostics.",
    },

    // VoIP items
    "VoIP Gateway": {
      icon: <Smartphone className="w-6 h-6 text-cyan-600" />,
      category: "Communication",
      description: "Configure VoIP gateway settings and voice communications.",
    },
    "Call Management": {
      icon: <Mic className="w-6 h-6 text-cyan-600" />,
      category: "Communication",
      description: "Manage telephone calls and communication logs.",
    },
  };

  const features: any[] = [];

  if (menuData?.menuGroups) {
    menuData.menuGroups.forEach((group: any) => {
      if (group.items) {
        group.items.forEach((item: any) => {
          if (item.isActive !== false && featureMap[item.label]) {
            features.push({
              title: item.label,
              ...featureMap[item.label]
            });
          }
        });
      }
    });
  }

  return features;
};

export default function InfoPage() {
  // ALL hooks must be called before any conditional return
  const { canView } = useMenuItemPermissions('system-information');
  const { loading: menuLoading, menuData } = useMenu();
  const { theme } = useTheme();

  // Show loading while checking permissions
  if (menuLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  // Check if user has permission to view this page
  if (!canView) {
    return <AccessDenied />;
  }

  // Dynamic image based on theme
  const gatewayImage = theme === 'dark'
    ? "/images/ilustation-mqtt-gateway-dark.png"
    : "/images/ilustation-mqtt-gateway-light.png";

  // Get features dynamically based on enabled menu items
  const features = mapMenuToFeatures(menuData);

  const techStack = [
    { name: "Node.js", icon: <SiNodedotjs size={32} className="text-green-600" />, description: "Backend runtime environment" },
    { name: "Python", icon: <SiPython size={32} className="text-blue-500" />, description: "Device control and automation" },
    { name: "Next.js", icon: <SiNextdotjs size={32} className="text-black dark:text-white" />, description: "React framework for web interface" },
    { name: "TypeScript", icon: <SiTypescript size={32} className="text-sky-600" />, description: "Type-safe JavaScript" },
    { name: "Tailwind CSS", icon: <SiTailwindcss size={32} className="text-cyan-500" />, description: "Utility-first CSS framework" },
    { name: "MQTT", icon: <SatelliteDish size={32} className="text-red-600" />, description: "Lightweight messaging protocol" },
    { name: "Modbus", icon: <Network size={32} className="text-blue-600" />, description: "Industrial communication protocol" },
    { name: "PostgreSQL", icon: <Database size={32} className="text-blue-700" />, description: "Data persistence and logging" },
  ];

  const systemSpecs = [
    { label: "Architecture", value: "Full-stack IoT Gateway" },
    { label: "Communication", value: "MQTT, Modbus RTU/TCP" },
    { label: "Real-time Monitoring", value: "Live data streams & alerts" },
    { label: "Automation", value: "Rule-based triggers & actions" },
    { label: "User Interface", value: "Modern web-based dashboard" },
    { label: "Data Persistence", value: "SQLite/PostgreSQL database" },
    { label: "Security", value: "Authentication & secure communications" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex-1 overflow-y-auto">
        <main className="px-6 py-8 space-y-8 animate-in fade-in-0 duration-1000">
          {/* System Overview */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Network className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold">System Information & More</h2>
            </div>

            {/* MQTT Gateway Illustration and Description */}
            <div className="flex flex-col lg:flex-row items-start gap-8 mb-6">
              {/* Description Section */}
              <div className="flex-1 w-full lg:w-1/2">
                <p className="text-muted-foreground leading-relaxed text-lg">
  Smartrack IOT is a comprehensive IoT gateway solution designed for industrial automation,
  smart infrastructure management, and IoT-centric operations. This unified platform enables seamless
  connectivity and control across diverse industrial and IoT devices through multiple communication protocols.
</p>

<p className="text-muted-foreground leading-relaxed text-lg mt-4">
  At its core, Smartrack IOT serves as a powerful edge computing gateway that bridges traditional industrial systems
  with modern IoT ecosystems. The system provides a sophisticated web-based dashboard for real-time monitoring,
  device configuration, system diagnostics, and performance analytics. Supporting MQTT, Modbus RTU/TCP,
  HTTP APIs and more, it enables flexible integration across heterogeneous networks and devices.
</p>

<p className="text-muted-foreground leading-relaxed text-lg mt-4">
  Key capabilities include automated rule-based triggers for process control, comprehensive alarm management
  with escalation protocols, advanced logging and reporting systems, and secure user authentication with
  role-based access control. The platform excels in data center monitoring, factory floor automation,
  smart building management, and critical infrastructure oversight where reliable, secure, and autonomous
  operation is essential.
</p>

<p className="text-muted-foreground leading-relaxed text-lg mt-4">
  Smartrack IOT transforms complex industrial operations into streamlined, manageable workflows by providing a single
  point of visibility and control. Whether managing server racks in enterprise data centers, optimizing
  manufacturing processes, or maintaining critical infrastructure, Smartrack IOT delivers the connectivity,
  intelligence, and reliability needed for next-generation industrial and IoT applications.
</p>
              </div>
            </div>

            {/* System Specifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {systemSpecs.map((spec, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{spec.label}:</span>
                  <Badge variant="outline">{spec.value}</Badge>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Open Source Credits & Attribution */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Open Source Credits & Attribution</h2>
            </div>

            <div className="space-y-6">
              {/* Core Frameworks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SiNextdotjs className="w-5 h-5 text-black dark:text-white" />
                    Core Frameworks & Runtimes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Frontend Framework</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Next.js 15</strong> - React framework for production</li>
                        <li className="text-xs">Source: https://github.com/vercel/next.js</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Runtime</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Node.js 18+</strong> - JavaScript runtime</li>
                        <li className="text-xs">Source: https://github.com/nodejs/node</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* UI Components & Styling */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SiTailwindcss className="w-5 h-5 text-cyan-500" />
                    UI Components & Styling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">CSS Framework</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Tailwind CSS</strong> - Utility-first CSS</li>
                        <li className="text-xs">Source: https://github.com/tailwindlabs/tailwindcss</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Component Library</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Radix UI</strong> - Headless UI components</li>
                        <li className="text-xs">Source: https://github.com/radix-ui/primitives</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Icons</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Lucide React</strong> - Beautiful icons</li>
                        <li className="text-xs">Source: https://github.com/lucide-icons/lucide</li>
                        <li className="text-xs">License: ISC</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3D Graphics & Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    3D Graphics & Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">3D Engine</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Three.js</strong> - 3D graphics library</li>
                        <li className="text-xs">Source: https://github.com/mrdoob/three.js</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">3D Text Rendering</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Troika Three Text</strong> - 3D text for Three.js</li>
                        <li className="text-xs">Source: https://github.com/protectwise/troika</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Charts & Data Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                    Charts & Data Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Apache ECharts</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>ECharts</strong> - Charting library</li>
                        <li className="text-xs">Source: https://github.com/apache/echarts</li>
                        <li className="text-xs">License: Apache-2.0</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">React Charts</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Recharts</strong> - React charting library</li>
                        <li className="text-xs">Source: https://github.com/recharts/recharts</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Flow Diagrams</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>@xyflow/react</strong> - React flow diagrams</li>
                        <li className="text-xs">Source: https://github.com/xyflow/xyflow</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maps & Geographic Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SatelliteDish className="w-5 h-5 text-blue-500" />
                    Maps & Geographic Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Leaflet</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Leaflet</strong> - Interactive maps</li>
                        <li className="text-xs">Source: https://github.com/Leaflet/Leaflet</li>
                        <li className="text-xs">License: BSD-2-Clause</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">React Leaflet</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>React Leaflet</strong> - React Leaflet integration</li>
                        <li className="text-xs">Source: https://github.com/PaulLeCam/react-leaflet</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Animation & Motion */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-500" />
                    Animation & Motion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Framer Motion</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Framer Motion</strong> - Animation library</li>
                        <li className="text-xs">Source: https://github.com/framer/motion</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">TWEEN.js</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>TWEEN.js</strong> - Tweening engine</li>
                        <li className="text-xs">Source: https://github.com/tweenjs/tween.js</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Database & Data Processing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    Database & Data Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">ORM</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Prisma</strong> - Database toolkit</li>
                        <li className="text-xs">Source: https://github.com/prisma/prisma</li>
                        <li className="text-xs">License: Apache-2.0</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Data Validation</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Zod</strong> - TypeScript-first schema validation</li>
                        <li className="text-xs">Source: https://github.com/colinhacks/zod</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Utilities & Helpers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-gray-500" />
                    Utilities & Helpers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Date Utilities</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>date-fns</strong> - Modern date utility library</li>
                        <li className="text-xs">Source: https://github.com/date-fns/date-fns</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Utility Functions</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Lodash</strong> - Utility library</li>
                        <li className="text-xs">Source: https://github.com/lodash/lodash</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">HTTP Client</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Axios</strong> - HTTP client</li>
                        <li className="text-xs">Source: https://github.com/axios/axios</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SiCss3 className="w-5 h-5 text-blue-600" />
                    Typography & Fonts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Primary Font</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>Inter</strong> - Google Fonts</li>
                        <li className="text-xs">Source: https://fonts.google.com/specimen/Inter</li>
                        <li className="text-xs">License: Open Font License (OFL)</li>
                        <li className="text-xs">Designer: Rasmus Andersson</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Fallback Fonts</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>System fonts: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Development Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SiTypescript className="w-5 h-5 text-blue-600" />
                    Development Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">TypeScript</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>TypeScript</strong> - Typed JavaScript</li>
                        <li className="text-xs">Source: https://github.com/microsoft/TypeScript</li>
                        <li className="text-xs">License: Apache-2.0</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">ESLint</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li><strong>ESLint</strong> - Code linting</li>
                        <li className="text-xs">Source: https://github.com/eslint/eslint</li>
                        <li className="text-xs">License: MIT</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Special Thanks */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Special Thanks</CardTitle>
                  <CardDescription>
                    Additional libraries and tools that power this application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Jose</strong> - JWT utilities
                      <div className="text-xs text-muted-foreground">https://github.com/panva/jose</div>
                    </div>
                    <div>
                      <strong>bcrypt</strong> - Password hashing
                      <div className="text-xs text-muted-foreground">https://github.com/kelektiv/node.bcrypt.js</div>
                    </div>
                    <div>
                      <strong>UUID</strong> - Unique identifiers
                      <div className="text-xs text-muted-foreground">https://github.com/uuidjs/uuid</div>
                    </div>
                    <div>
                      <strong>React Hook Form</strong> - Form handling
                      <div className="text-xs text-muted-foreground">https://github.com/react-hook-form/react-hook-form</div>
                    </div>
                    <div>
                      <strong>React Table</strong> - Data tables
                      <div className="text-xs text-muted-foreground">https://github.com/TanStack/table</div>
                    </div>
                    <div>
                      <strong>React DnD Kit</strong> - Drag & drop
                      <div className="text-xs text-muted-foreground">https://github.com/clauderic/dnd-kit</div>
                    </div>
                    <div>
                      <strong>React Resizable</strong> - Component resizing
                      <div className="text-xs text-muted-foreground">https://github.com/STRML/react-resizable</div>
                    </div>
                    <div>
                      <strong>BullMQ</strong> - Job queues
                      <div className="text-xs text-muted-foreground">https://github.com/taskforcesh/bullmq</div>
                    </div>
                    <div>
                      <strong>IoRedis</strong> - Redis client
                      <div className="text-xs text-muted-foreground">https://github.com/redis/ioredis</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* License Compliance Notice */}
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    License Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-amber-700 dark:text-amber-300">
                    <p>
                      This application uses various open source libraries and components. All libraries are used in accordance with their respective licenses.
                    </p>
                    <p>
                      <strong>Primary Licenses Used:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>MIT License:</strong> Next.js, Tailwind CSS, Three.js, Framer Motion, Radix UI, and many others</li>
                      <li><strong>Apache-2.0 License:</strong> Apache ECharts, Prisma</li>
                      <li><strong>BSD-2-Clause:</strong> Leaflet</li>
                      <li><strong>ISC License:</strong> Lucide React</li>
                      <li><strong>Open Font License (OFL):</strong> Inter font family</li>
                    </ul>
                    <p className="mt-3">
                      Full license texts and attribution requirements are maintained in the project repository.
                      For commercial use, please ensure compliance with all applicable licenses.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Features Overview */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <GaugeCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">System Features</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {feature.icon}
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {feature.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* Technology Stack */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Technology Stack</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {techStack.map((tech, index) => (
                <Card key={index} className="p-4 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    {tech.icon}
                    <h3 className="font-semibold">{tech.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{tech.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* System Architecture */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Architecture Overview</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frontend (Web Interface)</CardTitle>
                  <CardDescription>Modern, responsive dashboard for system management</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Real-time data visualization</li>
                    <li>• Intuitive control interfaces</li>
                    <li>• Multi-device management</li>
                    <li>• Automated monitoring alerts</li>
                    <li>• Responsive design for all devices</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backend (Edge Processing)</CardTitle>
                  <CardDescription>Robust gateway with protocol translation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Multi-protocol communication</li>
                    <li>• Real-time data processing</li>
                    <li>• Rule-based automation engine</li>
                    <li>• Secure MQTT bridging</li>
                    <li>• Industrial-grade reliability</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Getting Started */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Getting Started</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-blue-600">1</span>
                    </div>
                    <CardTitle className="text-lg">Network Setup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Configure IP addresses, WiFi settings, and MQTT broker connections
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-green-600">2</span>
                    </div>
                    <CardTitle className="text-lg">Device Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Add and configure Modbus devices, I2C modules, and communication parameters
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-purple-600">3</span>
                    </div>
                    <CardTitle className="text-lg">Automation Setup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Configure triggers, actions, and automated control logic for your devices
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
