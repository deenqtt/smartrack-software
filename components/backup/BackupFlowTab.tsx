// File: components/backup/BackupFlowTab.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Flow Process Icons
import {
  Database,
  Server,
  Clock,
  HardDrive,
  RefreshCw,
  Info,
  Download,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Cloud,
  Shield,
  CheckCircle2,
  ArrowRight,
  Settings,
  BarChart3,
  Upload,
  Zap,
  Lock,
  FileText,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Layers,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export function BackupFlowTab() {
  const ProcessSection = ({
    icon: Icon,
    title,
    description,
    steps,
    color = "blue",
    className = ""
  }: {
    icon: any;
    title: string;
    description: string;
    steps: Array<{ title: string; description: string; icon?: any }>;
    color?: string;
    className?: string;
  }) => {
    const colorClasses = {
      blue: {
        bg: "bg-blue-50 dark:bg-blue-950/20",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-600 dark:text-blue-400",
        accent: "bg-blue-100 dark:bg-blue-900/40",
      },
      green: {
        bg: "bg-green-50 dark:bg-green-950/20",
        border: "border-green-200 dark:border-green-800",
        icon: "text-green-600 dark:text-green-400",
        accent: "bg-green-100 dark:bg-green-900/40",
      },
      purple: {
        bg: "bg-purple-50 dark:bg-purple-950/20",
        border: "border-purple-200 dark:border-purple-800",
        icon: "text-purple-600 dark:text-purple-400",
        accent: "bg-purple-100 dark:bg-purple-900/40",
      },
      orange: {
        bg: "bg-orange-50 dark:bg-orange-950/20",
        border: "border-orange-200 dark:border-orange-800",
        icon: "text-orange-600 dark:text-orange-400",
        accent: "bg-orange-100 dark:bg-orange-900/40",
      },
      red: {
        bg: "bg-red-50 dark:bg-red-950/20",
        border: "border-red-200 dark:border-red-800",
        icon: "text-red-600 dark:text-red-400",
        accent: "bg-red-100 dark:bg-red-900/40",
      },
    };

    const classes = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
      <Card className={`${classes.bg} ${classes.border} border shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${classes.accent} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${classes.icon}`} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const FlowConnector = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center justify-center py-4 ${className}`}>
      <div className="w-px h-8 bg-border"></div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/60 mx-2" />
      <div className="w-px h-8 bg-border"></div>
    </div>
  );

  const MetricCard = ({
    icon: Icon,
    label,
    value,
    color = "blue"
  }: {
    icon: any;
    label: string;
    value: string;
    color?: string;
  }) => {
    const colorClasses = {
      blue: "text-blue-600 dark:text-blue-400",
      green: "text-green-600 dark:text-green-400",
      purple: "text-purple-600 dark:text-purple-400",
      orange: "text-orange-600 dark:text-orange-400",
      red: "text-red-600 dark:text-red-400",
    };

    return (
      <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
        <Icon className={`h-6 w-6 mx-auto mb-2 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`} />
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <ArrowRight className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Backup Management Process Flow</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Comprehensive overview of backup management workflows and processes
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={TrendingUp} label="Success Rate" value="99.9%" color="green" />
        <MetricCard icon={Clock} label="Avg Time" value="<5min" color="blue" />
        <MetricCard icon={Activity} label="Monitoring" value="24/7" color="purple" />
        <MetricCard icon={Shield} label="Security" value="AES-256" color="orange" />
      </div>

      {/* Primary Backup Process */}
      <ProcessSection
        icon={Database}
        title="Primary Backup Process"
        description="Core backup workflow from configuration to secure storage"
        color="blue"
        steps={[
          { title: "Configuration Setup", description: "Configure backup parameters, compression, encryption, and retention policies" },
          { title: "Database Analysis", description: "Analyze database structure and determine optimal backup strategy" },
          { title: "Backup Execution", description: "Execute pg_dump with parallel processing and integrity checks" },
          { title: "Security & Storage", description: "Apply encryption and store in secure location" },
        ]}
      />

      <FlowConnector />

      {/* Automated Scheduling */}
      <ProcessSection
        icon={Clock}
        title="Automated Scheduling"
        description="Intelligent backup scheduling with cron-based execution"
        color="purple"
        steps={[
          { title: "Schedule Configuration", description: "Create automated schedules with flexible frequency options" },
          { title: "Cron Management", description: "Handle timezone adjustments and execution monitoring" },
          { title: "Automated Execution", description: "Trigger backups at scheduled times with comprehensive logging" },
          { title: "Performance Analytics", description: "Track execution success and generate performance reports" },
        ]}
      />

      <FlowConnector />

      {/* Retention & Cleanup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProcessSection
          icon={Trash2}
          title="Retention Management"
          description="Smart cleanup based on GFS retention policies"
          color="red"
          steps={[
            { title: "Inventory Analysis", description: "Analyze backup inventory and age distribution" },
            { title: "Policy Application", description: "Apply retention rules (Daily/Weekly/Monthly/Yearly)" },
            { title: "Safe Cleanup", description: "Execute cleanup with space reclamation" },
          ]}
        />

        <ProcessSection
          icon={RefreshCw}
          title="Restore Process"
          description="Reliable database restoration with validation"
          color="green"
          steps={[
            { title: "Backup Selection", description: "Choose backup from validated inventory" },
            { title: "Pre-Restore Checks", description: "Verify integrity and compatibility" },
            { title: "Restore Execution", description: "Execute pg_restore with proper handling" },
            { title: "Validation", description: "Verify success and cleanup" },
          ]}
        />
      </div>

      <FlowConnector />

      {/* Monitoring & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProcessSection
          icon={BarChart3}
          title="Monitoring & Analytics"
          description="Real-time monitoring and performance insights"
          color="orange"
          steps={[
            { title: "Real-time Monitoring", description: "Track operations and system health" },
            { title: "Alert Management", description: "Configure notifications and warnings" },
            { title: "Performance Analytics", description: "Generate reports and trend analysis" },
          ]}
        />

        <ProcessSection
          icon={Lock}
          title="Security & Compliance"
          description="Enterprise-grade security and compliance"
          color="red"
          steps={[
            { title: "Data Encryption", description: "AES-256 encryption for all backups" },
            { title: "Access Control", description: "RBAC permissions and audit logging" },
            { title: "Compliance Validation", description: "GDPR/HIPAA compliance checks" },
          ]}
        />
      </div>

      {/* Process Summary */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Process Overview</h3>
              <p className="text-sm text-muted-foreground">Automated and manual backup management processes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Automated Processes
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Schedule-based backup execution
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Automatic retention policy application
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Storage space monitoring and alerts
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Backup integrity verification
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manual Processes
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  On-demand backup creation
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Database restore operations
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Schedule configuration and management
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Data cleanup and archiving
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
