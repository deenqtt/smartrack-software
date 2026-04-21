"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Download,
  Info,
  RotateCw,
  Upload,
  Server,
  HardDrive,
  Code,
  Terminal,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  FileText,
  Zap,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useMqtt } from "@/contexts/MqttContext";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { Loader2 } from "lucide-react";
import axios from "axios";

// State for OTA page
interface OtaState {
  middlewareVersion: string;
  softwareVersion: string;
  isChecking: boolean;
  isInstalling: boolean;
  installMessage: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";
type UpdateType = "middleware" | "software";

export default function OTAPage() {
  const { canView } = useMenuItemPermissions('system-ota-management');
  const { loading: menuLoading } = useMenu();
  const { publish, subscribe, unsubscribe, isReady, connectionStatus } =
    useMqtt();

  if (menuLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!canView) return <AccessDenied />;
  const [activeTab, setActiveTab] = useState<UpdateType>("middleware");

  const [otaState, setOtaState] = useState<OtaState>({
    middlewareVersion: "Loading...",
    softwareVersion: "Loading...",
    isChecking: false,
    isInstalling: false,
    installMessage: "Waiting for installation to start...",
  });

  // State for HTTP upload
  // Auto-detect device IP from current hostname
  const [deviceIp, setDeviceIp] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Auto-detect device IP from browser URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      setDeviceIp(hostname || "localhost");
    }
  }, []);

  // --- Core Functions ---
  const checkForUpdates = (type: UpdateType) => {
    if (!isReady) {
      toast.error("MQTT not connected");
      return;
    }
    setOtaState((prev) => ({ ...prev, isChecking: true }));
    publish("ota/command/check", JSON.stringify({ type }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.name.endsWith(".tar.gz")) {
        setSelectedFile(file);
      } else {
        toast.error("Invalid file type. Please select a .tar.gz file.");
        setSelectedFile(null);
        event.target.value = "";
      }
    }
  };

  const handleUpload = async (updateType: UpdateType) => {
    if (!selectedFile || !deviceIp) {
      toast.error("Please select a file and enter the device IP.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", updateType);

    setUploadStatus("uploading");
    setUploadProgress(0);
    const toastId = toast.loading(`Uploading ${updateType} package...`);

    try {
      const response = await axios.post(
        `http://${deviceIp}:5000/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) =>
            setUploadProgress(Math.round((e.loaded * 100) / (e.total ?? 1))),
        },
      );
      setUploadStatus("success");
      toast.success(
        response.data.message || "Upload complete! Starting installation...",
        { id: toastId },
      );

      // Auto refresh page after 15 seconds
      toast.info("Page will auto-refresh in 15 seconds...", {
        duration: 15000,
      });
      setTimeout(() => {
        // Clear state before reload
        setSelectedFile(null);
        setUploadStatus("idle");
        setUploadProgress(0);
        window.location.reload();
      }, 15000);
    } catch (error: any) {
      setUploadStatus("error");
      toast.error(
        error.response?.data?.error || error.message || "Upload failed.",
        { id: toastId },
      );
    }
  };

  // Clear form when switching tabs to prevent cross-upload
  useEffect(() => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(0);

    // Also reset the file input elements
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => {
      input.value = "";
    });
  }, [activeTab]);

  // --- MQTT Effect ---
  useEffect(() => {
    if (!isReady) return;

    const handleOtaMessage = (topic: string, payload: string) => {
      try {
        const message = JSON.parse(payload);

        if (topic === "ota/response/check") {
          if (message.type === "middleware") {
            setOtaState((prev) => ({
              ...prev,
              isChecking: false,
              middlewareVersion: message.current_version || "N/A",
            }));
          } else if (message.type === "software") {
            setOtaState((prev) => ({
              ...prev,
              isChecking: false,
              softwareVersion: message.current_version || "N/A",
            }));
          }
        } else if (topic === "ota/response/install") {
          if (message.status === "started") {
            setOtaState((prev) => ({
              ...prev,
              isInstalling: true,
              installMessage: "Installation process has started...",
            }));
            setUploadStatus("idle");
            setSelectedFile(null);
          } else if (
            message.status === "installing" ||
            message.status === "extracting"
          ) {
            setOtaState((prev) => ({
              ...prev,
              isInstalling: true,
              installMessage: message.detail || `${message.status}...`,
            }));
          } else if (message.status === "error") {
            setOtaState((prev) => ({
              ...prev,
              isInstalling: false,
              installMessage: "",
            }));
            toast.error(`Install failed: ${message.error}`);
            setUploadStatus("idle");
          } else if (message.status === "completed") {
            setOtaState((prev) => ({
              ...prev,
              isInstalling: true,
              installMessage:
                "Update successful! Page will refresh automatically...",
            }));
            toast.success("Update completed successfully! Refreshing...");
            setTimeout(() => window.location.reload(), 3000);
          }
        }
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    };

    subscribe("ota/response/check", handleOtaMessage);
    subscribe("ota/response/install", handleOtaMessage);

    checkForUpdates("middleware");
    checkForUpdates("software");

    return () => {
      unsubscribe("ota/response/check", handleOtaMessage);
      unsubscribe("ota/response/install", handleOtaMessage);
    };
  }, [isReady, publish, subscribe, unsubscribe]);

  const isBusy =
    otaState.isChecking ||
    uploadStatus === "uploading" ||
    otaState.isInstalling;

  const renderUploadCard = (
    type: UpdateType,
    title: string,
    description: string,
    includes: string,
  ) => (
    <Card className="border-2 hover:border-primary/50 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {type === "middleware" ? (
                <HardDrive className="h-5 w-5 text-purple-500" />
              ) : (
                <Code className="h-5 w-5 text-green-500" />
              )}
              {title}
            </CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          {selectedFile && activeTab === type && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {selectedFile.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>Includes: {includes}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-500" />
              Device IP Address
            </label>
            <Input
              type="text"
              placeholder="e.g., 192.168.1.10"
              value={deviceIp}
              onChange={(e) => setDeviceIp(e.target.value)}
              disabled={isBusy}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              IP address of the target device
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4 text-orange-500" />
              Update Package
            </label>
            <Input
              type="file"
              accept=".tar.gz"
              onChange={handleFileSelect}
              disabled={isBusy}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground">
              Select a .tar.gz update package
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadStatus === "uploading" && activeTab === type && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <RotateCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="font-medium">Uploading Package</span>
              </div>
              <span className="text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Please wait while the update package is being uploaded...
            </p>
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus === "success" && activeTab === type && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">
              Upload Successful
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Package uploaded successfully. Installation will begin shortly.
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === "error" && activeTab === type && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>
              Failed to upload the update package. Please check your connection
              and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="default"
            size="lg"
            disabled={
              !selectedFile || !deviceIp || isBusy || activeTab !== type
            }
            onClick={() => handleUpload(type)}
            className="flex-1 h-12"
          >
            <Upload className="h-5 w-5 mr-2" />
            {isBusy ? "Processing..." : "Upload & Install Update"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setSelectedFile(null);
              // Reset to auto-detected hostname
              if (typeof window !== "undefined") {
                setDeviceIp(window.location.hostname || "localhost");
              }
              setUploadStatus("idle");
              setUploadProgress(0);
              // Reset file inputs
              const fileInputs =
                document.querySelectorAll('input[type="file"]');
              fileInputs.forEach((input: any) => {
                input.value = "";
              });
            }}
            disabled={isBusy}
            className="h-12"
          >
            Clear Form
          </Button>
        </div>

        {/* Important Notes */}
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Important Notes
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Ensure the device is connected and accessible</li>
              <li>Do not disconnect power during the update process</li>
              <li>
                The page will auto-refresh 15 seconds after upload completion
              </li>
              <li>Installation may take several minutes to complete</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <SidebarInset>
      <main className="p-4 sm:p-6 space-y-6">
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {isReady ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isReady ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-medium">{connectionStatus}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                MQTT connection to device
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-purple-500" />
                Middleware
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-sm">
                {otaState.middlewareVersion}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Backend services & logic
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Code className="h-4 w-4 text-green-500" />
                Software (UI)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-sm">
                {otaState.softwareVersion}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Web interface & frontend
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Installation Progress Alert */}
        {otaState.isInstalling && (
          <Alert className="border-l-4 border-l-blue-500">
            <Terminal className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 animate-pulse text-blue-500" />
              Installation In Progress
            </AlertTitle>
            <AlertDescription className="pt-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{otaState.installMessage}</span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Update Instructions */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Info className="h-5 w-5" />
              How to Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                  1
                </div>
                <div>
                  <p className="font-medium">Select Update Type</p>
                  <p className="text-muted-foreground">
                    Choose middleware or software update
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                  2
                </div>
                <div>
                  <p className="font-medium">Configure Device</p>
                  <p className="text-muted-foreground">
                    Enter device IP address
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                  3
                </div>
                <div>
                  <p className="font-medium">Upload & Install</p>
                  <p className="text-muted-foreground">
                    Select .tar.gz file and upload
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Update Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as UpdateType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="middleware" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="hidden sm:inline">Middleware Update</span>
              <span className="sm:hidden">Middleware</span>
            </TabsTrigger>
            <TabsTrigger value="software" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Software (UI) Update</span>
              <span className="sm:hidden">Software</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="middleware" className="mt-6">
            {renderUploadCard(
              "middleware",
              "Middleware Update",
              "Update backend services, system logic, and core functionality. This ensures optimal performance and new features.",
              "System services, API endpoints, data processing",
            )}
          </TabsContent>

          <TabsContent value="software" className="mt-6">
            {renderUploadCard(
              "software",
              "Software (UI) Update",
              "Update the web interface, user experience improvements, and frontend features for better usability.",
              "Web interface, user dashboard, control panels",
            )}
          </TabsContent>
        </Tabs>
      </main>
    </SidebarInset>
  );
}
