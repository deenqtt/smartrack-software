"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Camera,
  AlertTriangle,
  Users,
  Key,
  Eye,
  ArrowRight,
  Activity,
  Lock,
  Bell,
} from "lucide-react";
import Link from "next/link";

interface SecurityModule {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  status: "active" | "inactive" | "maintenance";
  priority: "high" | "medium" | "low";
}

export default function SecurityPage() {
  // RBAC Permission Checks - Get permissions for security menu
  const { canView } = useMenuItemPermissions("security");
  const { loading: menuLoading } = useMenu();

  // Show loading while checking permissions
  if (menuLoading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  // Check if user has permission to view this page
  if (!canView) {
    return <AccessDenied />;
  }

  const securityModules: SecurityModule[] = [
    {
      id: "alarm-management",
      title: "Alarm Management",
      description: "Configure and monitor security alarms and notifications",
      icon: Bell,
      path: "/security/alarm-management",
      status: "active",
      priority: "high",
    },
    {
      id: "electronic-access-controllers",
      title: "Access Controllers",
      description: "Manage electronic access control systems and door locks",
      icon: Lock,
      path: "/security/electronic-access-controllers",
      status: "active",
      priority: "medium",
    },
    {
      id: "zkteco-access-control",
      title: "ZKTeco Integration",
      description: "Biometric access control with ZKTeco devices",
      icon: Key,
      path: "/security/zkteco-access-control",
      status: "active",
      priority: "medium",
    },
    {
      id: "palm-access-control",
      title: "Palm Recognition",
      description: "Advanced palm biometric access control system",
      icon: Users,
      path: "/security/palm-access-control",
      status: "active",
      priority: "low",
    },
  ];

  const getStatusColor = (status: SecurityModule["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500 hover:bg-green-500";
      case "inactive":
        return "bg-gray-500 hover:bg-gray-500";
      case "maintenance":
        return "bg-yellow-500 hover:bg-yellow-500";
      default:
        return "bg-gray-500 hover:bg-gray-500";
    }
  };

  const getPriorityColor = (priority: SecurityModule["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              Security Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Comprehensive security monitoring and access control management
            </p>
          </div>
        </div>
      </div>

      {/* Security Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Alarms
                </p>
                <p className="text-2xl font-bold text-red-600">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Lock className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Access Points
                </p>
                <p className="text-2xl font-bold">8</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">
                  System Health
                </p>
                <p className="text-2xl font-bold text-green-600">98%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {securityModules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card
              key={module.id}
              className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {module.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getPriorityColor(module.priority)}`}
                        >
                          {module.priority.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getStatusColor(module.status)} text-white`}
                        >
                          {module.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-4 leading-relaxed">
                  {module.description}
                </CardDescription>
                <Link href={module.path}>
                  <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Eye className="h-4 w-4 mr-2" />
                    Open Dashboard
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common security operations and system controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Bell className="h-6 w-6" />
              <span className="text-sm">Check Alarms</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Lock className="h-6 w-6" />
              <span className="text-sm">Access Control</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Shield className="h-6 w-6" />
              <span className="text-sm">System Status</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
