// File: SectionConfigComponent.tsx
// ✅ ENHANCED VERSION with:
// - Type-to-confirm delete for Section
// - Type-to-confirm delete for Subsection
// - Edit modal for Subsection (already exists, kept intact)

"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { showToast, confirmDeleteWithType, alertWithHtml } from "@/lib/toast-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Settings,
  ListFilter,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Section {
  name: string;
  description: string;
  sectionNumber: string;
  subsectionCount: number;
  sectionType?: "normal" | "log";
  logTopic?: string;
  trapEnabled?: boolean;
}

interface Subsection {
  number: string;
  name: string;
  description: string;
  keywords: string[];
}
const FIXED_SECTIONS = ["Alarm", "AccessControl"];

export default function SectionConfigComponent() {
  const { publish, subscribe, unsubscribe } = useMqtt();

  // State
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [loadingSubsections, setLoadingSubsections] = useState(false);

  // Modal states
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [isAddSubsectionModalOpen, setIsAddSubsectionModalOpen] =
    useState(false);
  const [isEditSubsectionModalOpen, setIsEditSubsectionModalOpen] =
    useState(false);

  // Form states for Section
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionNumber, setNewSectionNumber] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [newSectionType, setNewSectionType] = useState<"normal" | "log">(
    "normal"
  );
  const [newSectionLogTopic, setNewSectionLogTopic] = useState("");
  const [newSectionTrapEnabled, setNewSectionTrapEnabled] = useState(false);
  const [logFields, setLogFields] = useState<
    Array<{ name: string; type: string }>
  >([]);
  const [editSection, setEditSection] = useState<Section | null>(null);

  // Form states for Subsection
  const [newSubsectionNum, setNewSubsectionNum] = useState("");
  const [newSubsectionName, setNewSubsectionName] = useState("");
  const [newSubsectionDesc, setNewSubsectionDesc] = useState("");
  const [newSubsectionKeywords, setNewSubsectionKeywords] = useState("");
  const [editSubsection, setEditSubsection] = useState<Subsection | null>(null);
  // 🆕 Delete Section dialog state
  const [deleteSectionDialogOpen, setDeleteSectionDialogOpen] = useState(false);
  const [deleteSectionTarget, setDeleteSectionTarget] =
    useState<Section | null>(null);
  const [deleteSectionConfirm, setDeleteSectionConfirm] = useState("");
  // Temporary subsections for Add Section modal
  const [tempSubsections, setTempSubsections] = useState<
    Array<{
      number: string;
      name: string;
      description: string;
      keywords: string;
    }>
  >([]);

  // Load all sections on mount
  useEffect(() => {
    loadAllSections();
  }, []);

  // Load subsections when section changes
  useEffect(() => {
    if (selectedSection) {
      loadSubsections(selectedSection);
    } else {
      setSubsections([]);
    }
  }, [selectedSection]);

  const loadAllSections = () => {
    setLoadingSections(true);

    const handleResponse = (topic: string, payloadStr: string) => {
      try {
        console.log("📥 Raw MQTT Response:", payloadStr);
        const payload = JSON.parse(payloadStr);
        console.log("📦 Parsed Payload:", payload);

        if (payload.status === "success" && payload.data) {
          setSections(payload.data);
          console.log("✅ Sections loaded:", payload.data);
        } else if (payload.status === "error") {
          console.error("❌ Error loading sections:", payload.error);
          showToast.error(`Error: ${payload.error || "Failed to load sections"}`);
        }
      } catch (error) {
        console.error("❌ Error parsing sections:", error);
      } finally {
        setLoadingSections(false);
      }
    };

    subscribe("IOT/Containment/protocol/subsection/response", handleResponse);
    publish(
      "IOT/Containment/protocol/subsection/get",
      JSON.stringify({ action: "all" })
    );

    setTimeout(() => {
      unsubscribe("IOT/Containment/protocol/subsection/response", handleResponse);
    }, 3000);
  };

  const loadSubsections = (sectionName: string) => {
    setLoadingSubsections(true);

    const handleResponse = (topic: string, payloadStr: string) => {
      try {
        console.log("📥 Raw MQTT Subsections Response:", payloadStr);
        const payload = JSON.parse(payloadStr);
        console.log("📦 Parsed Subsections Payload:", payload);

        if (payload.status === "success" && payload.subsections) {
          setSubsections(payload.subsections);
          console.log("✅ Subsections loaded:", payload.subsections);
        } else if (payload.status === "error") {
          console.error("❌ Error loading subsections:", payload.error);
          setSubsections([]);
        }
      } catch (error) {
        console.error("❌ Error parsing subsections:", error);
      } finally {
        setLoadingSubsections(false);
      }
    };

    subscribe("IOT/Containment/protocol/subsection/response", handleResponse);
    publish(
      "IOT/Containment/protocol/subsection/get",
      JSON.stringify({
        action: "subsections",
        section_name: sectionName,
      })
    );

    setTimeout(() => {
      unsubscribe("IOT/Containment/protocol/subsection/response", handleResponse);
    }, 3000);
  };

  // ===========================
  // SECTION CRUD OPERATIONS
  // ===========================

  const handleAddSection = () => {
    if (!newSectionName || !newSectionNumber) {
      showToast.warning("Missing Fields", "Please fill in section name and number");
      return;
    }

    // Extra validation for log sections
    if (newSectionType === "log") {
      if (!newSectionLogTopic.trim()) {
        showToast.warning("Missing Log Topic", "For log sections, MQTT Log Topic is required.");
        return;
      }
    }

    const payload: any = {
      action: "section",
      section_name: newSectionName,
      section_number: newSectionNumber,
      description: newSectionDesc,
      section_type: newSectionType,
    };

    if (newSectionType === "log") {
      payload.trap_enabled = newSectionTrapEnabled;
      payload.log_topic = newSectionLogTopic;
      payload.fields = logFields.map((f) => ({
        name: f.name,
        type: f.type,
      }));
    }

    publish("IOT/Containment/protocol/subsection/add", JSON.stringify(payload));

    showToast.success("Section Added!", `Section "${newSectionName}" created successfully`);

    // Reset form
    setNewSectionName("");
    setNewSectionNumber("");
    setNewSectionDesc("");
    setNewSectionType("normal");
    setNewSectionLogTopic("");
    setNewSectionTrapEnabled(false);
    setLogFields([]);
    setTempSubsections([]);
    setIsAddSectionModalOpen(false);

    // Reload sections
    setTimeout(() => loadAllSections(), 1000);
  };

  const handleAddSectionWithSubsections = async () => {
    if (!newSectionName || !newSectionNumber) {
      showToast.warning("Missing Fields", "Please fill in section name and number");
      return;
    }

    // Validate subsections if any
    if (tempSubsections.length > 0) {
      const invalidSubs = tempSubsections.filter(
        (sub) => !sub.number || !sub.name
      );
      if (invalidSubs.length > 0) {
        showToast.warning("Invalid Subsections", "All subsections must have a number and name");
        return;
      }
    }

    // Extra validation for log sections
    if (newSectionType === "log") {
      if (!newSectionLogTopic.trim()) {
        showToast.warning("Missing Log Topic", "For log sections, MQTT Log Topic is required.");
        return;
      }

      if (tempSubsections.length > 1) {
        const hasKeyword = tempSubsections.some(
          (sub) => sub.keywords && sub.keywords.trim().length > 0
        );
        if (!hasKeyword) {
          showToast.warning("Missing Keywords", "For log sections with multiple subsections, at least one subsection must have keywords to distinguish routing.");
          return;
        }
      }
    }

    // Show loading toast
    const loadingToastId = showToast.loading(
      tempSubsections.length > 0
        ? `Creating section and ${tempSubsections.length} subsection${tempSubsections.length > 1 ? "s" : ""}...`
        : "Creating section..."
    );

    // Step 1: Create Section
    const sectionPayload: any = {
      action: "section",
      section_name: newSectionName,
      section_number: newSectionNumber,
      description: newSectionDesc,
      section_type: newSectionType,
    };

    if (newSectionType === "log") {
      sectionPayload.trap_enabled = newSectionTrapEnabled;
      sectionPayload.log_topic = newSectionLogTopic;
      sectionPayload.fields = logFields.map((f) => ({
        name: f.name,
        type: f.type,
      }));
    }

    publish(
      "IOT/Containment/protocol/subsection/add",
      JSON.stringify(sectionPayload)
    );

    // Wait for section to be created
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 2: Create Subsections if any
    if (tempSubsections.length > 0) {
      for (const sub of tempSubsections) {
        const keywords = sub.keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);

        const subsectionPayload = {
          action: "subsection",
          section_name: newSectionName,
          subsection_num: sub.number,
          name: sub.name,
          description: sub.description,
          keywords: keywords,
        };

        publish(
          "IOT/Containment/protocol/subsection/add",
          JSON.stringify(subsectionPayload)
        );

        // Small delay between subsection creations
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Success message
    showToast.success("Section Created!", tempSubsections.length > 0
      ? `Section "${newSectionName}" created with ${tempSubsections.length
      } subsection${tempSubsections.length > 1 ? "s" : ""}!`
      : `Section "${newSectionName}" created successfully!`);

    // Reset form
    setNewSectionName("");
    setNewSectionNumber("");
    setNewSectionDesc("");
    setNewSectionType("normal");
    setNewSectionLogTopic("");
    setNewSectionTrapEnabled(false);
    setLogFields([]);
    setTempSubsections([]);
    setIsAddSectionModalOpen(false);

    // Reload sections
    setTimeout(() => loadAllSections(), 1000);
  };

  const handleEditSectionOpen = (section: Section) => {
    setEditSection(section);
    setNewSectionName(section.name);
    setNewSectionNumber(section.sectionNumber);
    setNewSectionDesc(section.description);

    // 🆕 isi config log (kalau ada)
    const isLog = section.sectionType === "log";
    setNewSectionType(isLog ? "log" : "normal");
    setNewSectionLogTopic(section.logTopic || "");
    setNewSectionTrapEnabled(!!section.trapEnabled);

    // Sementara fields di-edit manual; nanti kalau API kirim fields detail bisa di-prefill di sini
    setLogFields([]);

    setIsEditSectionModalOpen(true);
  };

  const handleSaveEditSection = () => {
    if (!editSection || !newSectionName) {
      showToast.warning("Missing Fields", "Please fill in section name");
      return;
    }

    // Validasi khusus log section
    if (newSectionType === "log" && !newSectionLogTopic.trim()) {
      showToast.warning("Missing Log Topic", "For log sections, MQTT Log Topic is required.");
      return;
    }

    const payload: any = {
      action: "section",
      section_name: editSection.name, // pakai nama lama sebagai key
      description: newSectionDesc,
      section_number: newSectionNumber,
      section_type: newSectionType,
    };

    if (newSectionType === "log") {
      payload.trap_enabled = newSectionTrapEnabled;
      payload.log_topic = newSectionLogTopic;

      // kirim selalu; [] artinya AUTO mode
      payload.fields = logFields.map((f) => ({
        name: f.name,
        type: f.type,
      }));
    }

    publish("IOT/Containment/protocol/subsection/update", JSON.stringify(payload));

    showToast.success("Section Updated!", `Section "${editSection.name}" updated successfully`);

    // Reset form
    setNewSectionName("");
    setNewSectionNumber("");
    setNewSectionDesc("");
    setNewSectionType("normal");
    setNewSectionLogTopic("");
    setNewSectionTrapEnabled(false);
    setLogFields([]);
    setEditSection(null);
    setIsEditSectionModalOpen(false);

    // Reload sections
    setTimeout(() => loadAllSections(), 1000);
  };

  // ============================================
  // 🔴 ENHANCED DELETE SECTION - TYPE TO CONFIRM
  // ============================================
  const handleDeleteSection = (section: Section) => {
    // ⛔ Blokir delete untuk section fixed
    if (FIXED_SECTIONS.includes(section.name)) {
      showToast.info("Protected Section", `Section "${section.name}" is fixed and cannot be deleted.`);
      return;
    }

    // 🆕 Buka dialog custom
    setDeleteSectionTarget(section);
    setDeleteSectionConfirm("");
    setDeleteSectionDialogOpen(true);
  };

  // ===========================
  // SUBSECTION CRUD OPERATIONS
  // ===========================

  const handleAddSubsection = () => {
    if (!selectedSection || !newSubsectionNum || !newSubsectionName) {
      showToast.warning("Missing Fields", "Please fill in all required fields");
      return;
    }

    const keywords = newSubsectionKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    const payload = {
      action: "subsection",
      section_name: selectedSection,
      subsection_num: newSubsectionNum,
      name: newSubsectionName,
      description: newSubsectionDesc,
      keywords: keywords,
    };

    publish("IOT/Containment/protocol/subsection/add", JSON.stringify(payload));

    showToast.success("Subsection Added!", `Subsection "${newSubsectionName}" created`);

    // Reset form
    setNewSubsectionNum("");
    setNewSubsectionName("");
    setNewSubsectionDesc("");
    setNewSubsectionKeywords("");
    setIsAddSubsectionModalOpen(false);

    // Reload both sections and subsections
    setTimeout(() => {
      loadAllSections();
      loadSubsections(selectedSection);
    }, 1000);
  };

  const handleEditSubsection = (subsection: Subsection) => {
    setEditSubsection(subsection);
    setNewSubsectionName(subsection.name);
    setNewSubsectionDesc(subsection.description);
    setNewSubsectionKeywords(subsection.keywords.join(", "));
    setIsEditSubsectionModalOpen(true);
  };

  const handleSaveEditSubsection = () => {
    if (!editSubsection || !selectedSection) {
      return;
    }

    const keywords = newSubsectionKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    const payload = {
      action: "subsection",
      section_name: selectedSection,
      subsection_num: editSubsection.number,
      name: newSubsectionName,
      description: newSubsectionDesc,
      keywords: keywords,
    };

    publish("IOT/Containment/protocol/subsection/update", JSON.stringify(payload));

    showToast.success("Subsection Updated!", `Subsection "${newSubsectionName}" updated`);

    // Reset form
    setNewSubsectionName("");
    setNewSubsectionDesc("");
    setNewSubsectionKeywords("");
    setEditSubsection(null);
    setIsEditSubsectionModalOpen(false);

    // Reload both sections and subsections
    setTimeout(() => {
      loadAllSections();
      loadSubsections(selectedSection);
    }, 1000);
  };

  // ============================================
  // 🔴 ENHANCED DELETE SUBSECTION - TYPE TO CONFIRM
  // ============================================
  const handleDeleteSubsection = async (subsection: Subsection) => {
    const confirmed = await confirmDeleteWithType(subsection.name, "subsection", `Section: "${selectedSection}", Keywords: ${subsection.keywords.join(", ") || "None"}`);

    if (confirmed) {
      const payload = {
        action: "subsection",
        section_name: selectedSection,
        subsection_num: subsection.number,
      };

      publish(
        "IOT/Containment/protocol/subsection/delete",
        JSON.stringify(payload)
      );

      alertWithHtml("Deleted!", `Subsection "${subsection.name}" has been deleted from "${selectedSection}".`, "success");

      // Reload both sections and subsections
      setTimeout(() => {
        loadAllSections();
        loadSubsections(selectedSection);
      }, 1000);
    }
  };

  // Add temporary subsection (for Add Section modal)
  const handleAddTempSubsection = () => {
    setTempSubsections([
      ...tempSubsections,
      {
        number: "",
        name: "",
        description: "",
        keywords: "",
      },
    ]);
  };

  const handleRemoveTempSubsection = (index: number) => {
    setTempSubsections(tempSubsections.filter((_, i) => i !== index));
  };

  return (
    <>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Action Bar - Enhanced */}
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Section Management
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Create and manage protocol sections and subsections
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadAllSections()}
                      className="shadow-sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh sections</TooltipContent>
                </Tooltip>
                <Button
                  onClick={() => setIsAddSectionModalOpen(true)}
                  className="shadow-sm"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sections Card - Enhanced */}
            <Card className="shadow-sm border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sections</CardTitle>
                    <CardDescription className="text-xs">
                      Click on a section to view its subsections
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSections ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Loading sections...</p>
                  </div>
                ) : sections.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                    <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No sections found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Add Section" to create one
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {sections.map((section) => (
                      <Card
                        key={section.name}
                        className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${selectedSection === section.name
                            ? "ring-2 ring-primary shadow-md border-primary"
                            : "border"
                          }`}
                        onClick={() => setSelectedSection(section.name)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-foreground">{section.name}</h3>
                                <Badge variant="secondary" className="font-mono text-xs">
                                  #{section.sectionNumber}
                                </Badge>
                                {section.sectionType === "log" && (
                                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                    LOG
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {section.description || "No description"}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ListFilter className="h-3 w-3" />
                                  {section.subsectionCount} subsection{section.subsectionCount !== 1 ? "s" : ""}
                                </span>
                                {section.sectionType === "log" && section.logTopic && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    📡 {section.logTopic}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2 flex-shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditSectionOpen(section);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit section</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSection(section);
                                    }}
                                    disabled={FIXED_SECTIONS.includes(section.name)}
                                  >
                                    <Trash2 className={`h-4 w-4 ${FIXED_SECTIONS.includes(section.name)
                                        ? "text-muted-foreground"
                                        : "text-destructive"
                                      }`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {FIXED_SECTIONS.includes(section.name)
                                    ? "This section is fixed and cannot be deleted"
                                    : "Delete section"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subsections Card - Enhanced */}
            <Card className="shadow-sm border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <ListFilter className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Subsections</CardTitle>
                      <CardDescription className="text-xs">
                        {selectedSection
                          ? `Managing: "${selectedSection}"`
                          : "Select a section first"}
                      </CardDescription>
                    </div>
                  </div>
                  {selectedSection && (
                    <Button
                      size="sm"
                      onClick={() => setIsAddSubsectionModalOpen(true)}
                      className="shadow-sm"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedSection ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                    <ListFilter className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No Section Selected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a section from the left to view subsections
                    </p>
                  </div>
                ) : loadingSubsections ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Loading subsections...</p>
                  </div>
                ) : subsections.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                    <PlusCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No Subsections</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Add" to create a subsection
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {subsections.map((subsection) => (
                      <Card key={subsection.number} className="border hover:shadow-md transition-all hover:border-primary/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">{subsection.name}</h4>
                                <Badge variant="outline" className="font-mono text-xs">
                                  #{subsection.number}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {subsection.description || "No description"}
                              </p>
                              {subsection.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {subsection.keywords.map((keyword, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      🏷️ {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2 flex-shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditSubsection(subsection)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit subsection</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      handleDeleteSubsection(subsection)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete subsection</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>



      {/* Add Section Modal */}
      <Dialog
        open={isAddSectionModalOpen}
        onOpenChange={setIsAddSectionModalOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section and optionally add subsections
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section-name">
                  Section Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="section-name"
                  placeholder="e.g., Cooling"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section-number">
                  Section Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="section-number"
                  type="number"
                  placeholder="e.g., 2"
                  value={newSectionNumber}
                  onChange={(e) => setNewSectionNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section Type</Label>
                <Select
                  value={newSectionType}
                  onValueChange={(val: string) =>
                    setNewSectionType(val as "normal" | "log")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newSectionType === "log" && (
                <div className="space-y-2">
                  <Label>Protocol Trap</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="trap-enabled"
                      type="checkbox"
                      checked={newSectionTrapEnabled}
                      onChange={(e) =>
                        setNewSectionTrapEnabled(e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor="trap-enabled"
                      className="text-sm font-normal"
                    >
                      Enable Protocol Trap
                    </Label>
                  </div>
                </div>
              )}
            </div>
            {newSectionType === "log" && (
              <div className="space-y-4">
                {/* Log Topic */}
                <div className="space-y-2">
                  <Label htmlFor="log-topic">
                    Log Topic (MQTT) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="log-topic"
                    placeholder="e.g., iot/logs/alarm"
                    value={newSectionLogTopic}
                    onChange={(e) => setNewSectionLogTopic(e.target.value)}
                  />
                </div>

                {/* Log Fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Log Fields <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLogFields((prev) => [
                          ...prev,
                          { name: "", type: "string" },
                        ])
                      }
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>
                  {logFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No fields defined yet. These fields will be used to store
                      log data for this section.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {logFields.map((field, index) => (
                        <Card key={index} className="p-3">
                          <div className="grid grid-cols-3 gap-3 items-center">
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Field Name</Label>
                              <Input
                                placeholder="e.g., deviceId"
                                value={field.name}
                                onChange={(e) => {
                                  const updated = [...logFields];
                                  updated[index].name = e.target.value;
                                  setLogFields(updated);
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(val: string) => {
                                  const updated = [...logFields];
                                  updated[index].type = val;
                                  setLogFields(updated);
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">string</SelectItem>
                                  <SelectItem value="int">int</SelectItem>
                                  <SelectItem value="float">float</SelectItem>
                                  <SelectItem value="bool">bool</SelectItem>
                                  <SelectItem value="datetime">
                                    datetime
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setLogFields((prev) =>
                                  prev.filter((_, i) => i !== index)
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {newSectionType === "log" && (
              <p style={{ fontSize: "12px", color: "#888" }}>
                If you leave the fields empty, automatic schema mode will be
                used. The Protocol structure will be generated when the first log
                arrives.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="section-desc">Description</Label>
              <Input
                id="section-desc"
                placeholder="Brief description..."
                value={newSectionDesc}
                onChange={(e) => setNewSectionDesc(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subsections (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTempSubsection}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Subsection
                </Button>
              </div>
              {tempSubsections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subsections added yet. You can add them later if needed.
                </p>
              ) : (
                <div className="space-y-3">
                  {tempSubsections.map((sub, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="number"
                              placeholder="e.g., 1"
                              value={sub.number}
                              onChange={(e) => {
                                const updated = [...tempSubsections];
                                updated[index].number = e.target.value;
                                setTempSubsections(updated);
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="e.g., Cooling1"
                              value={sub.name}
                              onChange={(e) => {
                                const updated = [...tempSubsections];
                                updated[index].name = e.target.value;
                                setTempSubsections(updated);
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Input
                              placeholder="Description..."
                              value={sub.description}
                              onChange={(e) => {
                                const updated = [...tempSubsections];
                                updated[index].description = e.target.value;
                                setTempSubsections(updated);
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label className="text-xs">
                              Keywords (comma-separated)
                            </Label>
                            <Input
                              placeholder="e.g., rack1, server1"
                              value={sub.keywords}
                              onChange={(e) => {
                                const updated = [...tempSubsections];
                                updated[index].keywords = e.target.value;
                                setTempSubsections(updated);
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveTempSubsection(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewSectionName("");
                setNewSectionNumber("");
                setNewSectionDesc("");
                setNewSectionType("normal");
                setNewSectionLogTopic("");
                setNewSectionTrapEnabled(false);
                setLogFields([]);
                setTempSubsections([]);
                setIsAddSectionModalOpen(false);
              }}
            >
              Cancel
            </Button>

            <Button onClick={handleAddSectionWithSubsections}>
              Create Section{" "}
              {tempSubsections.length > 0 &&
                `+ ${tempSubsections.length} Subsection${tempSubsections.length > 1 ? "s" : ""
                }`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Modal */}
      <Dialog
        open={isEditSectionModalOpen}
        onOpenChange={setIsEditSectionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>Update section details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name read-only */}
            <div className="space-y-2">
              <Label htmlFor="edit-section-name">
                Section Name (Read-only)
              </Label>
              <Input
                id="edit-section-name"
                value={editSection?.name || ""}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-muted-foreground">
                Section name cannot be changed
              </p>
            </div>

            {/* Number + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-section-number">Section Number</Label>
                <Input
                  id="edit-section-number"
                  type="number"
                  value={newSectionNumber}
                  onChange={(e) => setNewSectionNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Section Type</Label>
                <Select
                  value={newSectionType}
                  onValueChange={(val: string) =>
                    setNewSectionType(val as "normal" | "log")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Protocol Trap + Log Topic + Fields hanya kalau type = log */}
            {newSectionType === "log" && (
              <div className="space-y-4">
                {/* Trap toggle */}
                <div className="space-y-2">
                  <Label>Protocol Trap</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="edit-trap-enabled"
                      type="checkbox"
                      checked={newSectionTrapEnabled}
                      onChange={(e) =>
                        setNewSectionTrapEnabled(e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor="edit-trap-enabled"
                      className="text-sm font-normal"
                    >
                      Enable Protocol Trap
                    </Label>
                  </div>
                </div>

                {/* Log topic */}
                <div className="space-y-2">
                  <Label htmlFor="edit-log-topic">
                    Log Topic (MQTT) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-log-topic"
                    placeholder="e.g., iot/logs/cooling"
                    value={newSectionLogTopic}
                    onChange={(e) => setNewSectionLogTopic(e.target.value)}
                  />
                </div>

                {/* Log fields (optional, manual mode) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Log Fields (optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLogFields((prev) => [
                          ...prev,
                          { name: "", type: "string" },
                        ])
                      }
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>

                  {logFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      If you leave this empty, AUTO mode will be used (schema
                      di-generate otomatis dari payload log pertama).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {logFields.map((field, index) => (
                        <Card key={index} className="p-3">
                          <div className="grid grid-cols-3 gap-3 items-center">
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Field Name</Label>
                              <Input
                                placeholder="e.g., deviceId"
                                value={field.name}
                                onChange={(e) => {
                                  const updated = [...logFields];
                                  updated[index].name = e.target.value;
                                  setLogFields(updated);
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(val: string) => {
                                  const updated = [...logFields];
                                  updated[index].type = val;
                                  setLogFields(updated);
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">string</SelectItem>
                                  <SelectItem value="int">int</SelectItem>
                                  <SelectItem value="float">float</SelectItem>
                                  <SelectItem value="bool">bool</SelectItem>
                                  <SelectItem value="datetime">
                                    datetime
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setLogFields((prev) =>
                                  prev.filter((_, i) => i !== index)
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-section-desc">Description</Label>
              <Input
                id="edit-section-desc"
                value={newSectionDesc}
                onChange={(e) => setNewSectionDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewSectionName("");
                setNewSectionNumber("");
                setNewSectionDesc("");
                setEditSection(null);
                setIsEditSectionModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditSection}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subsection Modal */}
      <Dialog
        open={isAddSubsectionModalOpen}
        onOpenChange={setIsAddSubsectionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subsection to {selectedSection}</DialogTitle>
            <DialogDescription>
              Create a new subsection in the selected section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subsection-num">
                Subsection Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subsection-num"
                type="number"
                placeholder="e.g., 3"
                value={newSubsectionNum}
                onChange={(e) => setNewSubsectionNum(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subsection-name">
                Subsection Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subsection-name"
                placeholder="e.g., Cooling3"
                value={newSubsectionName}
                onChange={(e) => setNewSubsectionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subsection-desc">Description</Label>
              <Input
                id="subsection-desc"
                placeholder="Description..."
                value={newSubsectionDesc}
                onChange={(e) => setNewSubsectionDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subsection-keywords">
                Keywords (comma-separated)
              </Label>
              <Input
                id="subsection-keywords"
                placeholder="e.g., cooling3, ac3"
                value={newSubsectionKeywords}
                onChange={(e) => setNewSubsectionKeywords(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewSubsectionNum("");
                setNewSubsectionName("");
                setNewSubsectionDesc("");
                setNewSubsectionKeywords("");
                setIsAddSubsectionModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSubsection}>Create Subsection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subsection Modal */}
      <Dialog
        open={isEditSubsectionModalOpen}
        onOpenChange={setIsEditSubsectionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subsection</DialogTitle>
            <DialogDescription>Update subsection details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-subsection-num">
                Subsection Number (Read-only)
              </Label>
              <Input
                id="edit-subsection-num"
                value={editSubsection?.number || ""}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-muted-foreground">
                Subsection number cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subsection-name">Subsection Name</Label>
              <Input
                id="edit-subsection-name"
                value={newSubsectionName}
                onChange={(e) => setNewSubsectionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subsection-desc">Description</Label>
              <Input
                id="edit-subsection-desc"
                value={newSubsectionDesc}
                onChange={(e) => setNewSubsectionDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subsection-keywords">
                Keywords (comma-separated)
              </Label>
              <Input
                id="edit-subsection-keywords"
                value={newSubsectionKeywords}
                onChange={(e) => setNewSubsectionKeywords(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewSubsectionName("");
                setNewSubsectionDesc("");
                setNewSubsectionKeywords("");
                setEditSubsection(null);
                setIsEditSubsectionModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditSubsection}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🆕 Delete Section Confirm Dialog */}
      <Dialog
        open={deleteSectionDialogOpen}
        onOpenChange={(open: boolean) => {
          setDeleteSectionDialogOpen(open);
          if (!open) {
            setDeleteSectionConfirm("");
            setDeleteSectionTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Delete Section</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. All subsections under{" "}
                  <span className="font-semibold text-foreground">
                    {deleteSectionTarget?.name}
                  </span>{" "}
                  will be removed.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              <p>
                Section:{" "}
                <span className="font-semibold text-foreground">
                  {deleteSectionTarget?.name}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Total subsections:{" "}
                <span className="font-semibold text-destructive">
                  {deleteSectionTarget?.subsectionCount ?? 0}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Type{" "}
                <span className="font-mono font-semibold">
                  {deleteSectionTarget?.name}
                </span>{" "}
                to confirm:
              </p>
              <Input
                autoFocus
                value={deleteSectionConfirm}
                onChange={(e) => setDeleteSectionConfirm(e.target.value)}
                placeholder={
                  deleteSectionTarget
                    ? `Type "${deleteSectionTarget.name}" to confirm`
                    : ""
                }
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This will permanently remove the section and all of its
                subsections.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSectionDialogOpen(false);
                setDeleteSectionConfirm("");
                setDeleteSectionTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !deleteSectionTarget ||
                deleteSectionConfirm.trim() !== deleteSectionTarget.name
              }
              onClick={() => {
                if (!deleteSectionTarget) return;
                const section = deleteSectionTarget;

                const payload = {
                  action: "section",
                  section_name: section.name,
                };

                publish(
                  "IOT/Containment/protocol/subsection/delete",
                  JSON.stringify(payload)
                );

                alertWithHtml("Deleted", `Section "${section.name}" has been deleted. All ${section.subsectionCount} subsection(s) were also removed.`, "success");

                if (selectedSection === section.name) {
                  setSelectedSection("");
                  setSubsections([]);
                }

                setDeleteSectionDialogOpen(false);
                setDeleteSectionConfirm("");
                setDeleteSectionTarget(null);

                setTimeout(() => {
                  loadAllSections();
                }, 1000);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
