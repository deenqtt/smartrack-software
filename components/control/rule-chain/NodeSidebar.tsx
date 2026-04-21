"use client";

import React, { useState, useContext } from "react";
import type { Node } from "@xyflow/react";
import { AddNodeContext } from "./RuleChainEditor";
import {
  Radio,
  Filter,
  Zap,
  Settings,
  BarChart3,
  Link as LinkIcon,
  Cpu,
  AlertCircle,
  ArrowRightLeft,
  Sparkles, // Added for Enrichment
  RefreshCw, // Added for Transform/Transformation
  Gamepad2, // Added for Control/Relay
  ChevronDown,
  Database, // Added for Log to DB
} from "lucide-react";
import DeviceSelectionModal from "./modal/DeviceSelectionModal";
import TimerSchedulerModal from "./modal/TimerSchedulerModal";
import MessageTypeFilterModal from "./modal/MessageTypeFilterModal";
import FieldExistenceModal from "./modal/FieldExistenceModal";
import ExtractFieldsModal from "./modal/ExtractFieldsModal";
import MapPayloadModal from "./modal/MapPayloadModal";
import SumValuesModal from "./modal/SumValuesModal";
import MqttPayloadModal from "./modal/MqttPayloadModal";
import WhatsappModal from "./modal/WhatsappModal";
import EmailModal from "./modal/EmailModal";
import TelegramModal from "./modal/TelegramModal";
import ControlRelayModal from "./modal/ControlRelayModal";
import BillCalculationModal from "./modal/BillCalculationModal";
import SwitchModal from "./modal/SwitchModal";
import EnrichmentModal from "./modal/EnrichmentModal";
import DelayModal from "./modal/DelayModal";
import AlarmModal from "./modal/AlarmModal";
import LogToDbModal from "./modal/LogToDbModal";
import SeverityAggregateModal from "./modal/SeverityAggregateModal";

interface NodeSidebarProps {
  onAddNode: (nodeType: string, label: string, config?: any) => void;
  selectedNode: Node | null;
  isEditingNode?: boolean;
}

export default function NodeSidebar({
  onAddNode,
  selectedNode,
  isEditingNode = false,
}: NodeSidebarProps) {
  const addNodeContext = useContext(AddNodeContext);
  const addNode = addNodeContext?.addNodeToViewportCenter || onAddNode;

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    deviceSources: true,
    filter: true,
    action: true,
    transformation: true,
    analytics: true,
    control: true,
    alarm: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isTimerSchedulerModalOpen, setIsTimerSchedulerModalOpen] =
    useState(false);
  const [isMessageTypeFilterModalOpen, setIsMessageTypeFilterModalOpen] =
    useState(false);
  const [isFieldExistenceModalOpen, setIsFieldExistenceModalOpen] =
    useState(false);
  const [isExtractFieldsModalOpen, setIsExtractFieldsModalOpen] =
    useState(false);
  const [isMapPayloadModalOpen, setIsMapPayloadModalOpen] = useState(false);
  const [isSumValuesModalOpen, setIsSumValuesModalOpen] = useState(false);
  const [isMqttPayloadModalOpen, setIsMqttPayloadModalOpen] = useState(false);
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isControlRelayModalOpen, setIsControlRelayModalOpen] = useState(false);
  const [isBillCalculationModalOpen, setIsBillCalculationModalOpen] =
    useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isLogToDbModalOpen, setIsLogToDbModalOpen] = useState(false);
  const [isSeverityAggregateModalOpen, setIsSeverityAggregateModalOpen] = useState(false);

  // Close all modals when editing a node
  React.useEffect(() => {
    if (isEditingNode) {
      console.log("🔐 Closing all NodeSidebar modals because user is editing");
      setIsDeviceModalOpen(false);
      setIsTimerSchedulerModalOpen(false);
      setIsMessageTypeFilterModalOpen(false);
      setIsFieldExistenceModalOpen(false);
      setIsExtractFieldsModalOpen(false);
      setIsMapPayloadModalOpen(false);
      setIsSumValuesModalOpen(false);
      setIsMqttPayloadModalOpen(false);
      setIsWhatsappModalOpen(false);
      setIsEmailModalOpen(false);
      setIsTelegramModalOpen(false);
      setIsControlRelayModalOpen(false);
      setIsBillCalculationModalOpen(false);
      setIsSwitchModalOpen(false);
      setIsEnrichmentModalOpen(false);
      setIsDelayModalOpen(false);
      setIsAlarmModalOpen(false);
      setIsLogToDbModalOpen(false);
      setIsSeverityAggregateModalOpen(false);
    }
  }, [isEditingNode]);

  const handleDeviceSelect = (
    deviceName: string,
    deviceUniqId: string,
    key?: string,
    topic?: string,
    extraConfig?: Record<string, any>,
  ) => {
    const nodeLabel = key ? `${deviceName} - ${key}` : deviceName;
    addNode("inputNode", nodeLabel, { deviceName, deviceUniqId, key, topic, ...extraConfig });
    setIsDeviceModalOpen(false);
  };

  const handleTimerSchedulerSelect = (
    nodeName: string,
    scheduleType: string,
    config: any,
  ) => {
    addNode("timerSchedulerNode", nodeName, config);
    setIsTimerSchedulerModalOpen(false);
  };

  const handleMessageTypeFilterSelect = (selectedTypes: string[]) => {
    const nodeLabel = `Filter ${selectedTypes.join(", ")}`;
    addNode("filterNode", nodeLabel, { selectedTypes });
    setIsMessageTypeFilterModalOpen(false);
  };

  const handleFieldExistenceSelect = (
    fieldName: string,
    deviceName: string,
    deviceUniqId: string,
  ) => {
    const nodeLabel = `Check Field: ${fieldName}`;
    addNode("filterNode", nodeLabel, { fieldName, deviceName, deviceUniqId });
    setIsFieldExistenceModalOpen(false);
  };

  const handleExtractFieldsSelect = (selectedFields: string[]) => {
    const nodeLabel = `Extract: ${selectedFields.join(", ")}`;
    addNode("transformNode", nodeLabel, {
      nodeSubType: "extractFields",
      selectedFields,
      // ✅ No deviceUniqId or deviceTopic - using edge flow!
    });
    setIsExtractFieldsModalOpen(false);
  };

  const handleMapPayloadSelect = (mappings: any[]) => {
    const mappingLabels = mappings
      .map((m) => `${m.sourceField} → ${m.targetField}`)
      .join(", ");
    const nodeLabel = `Map: ${mappingLabels}`;
    addNode("transformNode", nodeLabel, {
      nodeSubType: "mapPayload",
      mappings,
      // ✅ No deviceUniqId or deviceTopic - using edge flow!
    });
    setIsMapPayloadModalOpen(false);
  };

  const handleSumValuesSelect = (nodeName: string, config: any) => {
    addNode("analyticsNode", nodeName, {
      ...config,
      nodeSubType: "sumValues",
    });
    setIsSumValuesModalOpen(false);
  };

  const handleSeverityAggregateSelect = (nodeName: string, config: any) => {
    addNode("analyticsNode", nodeName, {
      ...config,
      nodeSubType: "severityAggregate",
    });
    setIsSeverityAggregateModalOpen(false);
  };

  const handleMqttPayloadSelect = (
    topic: string,
    payload: string,
    payloadMode: "custom" | "autoForward",
  ) => {
    const nodeLabel =
      payloadMode === "autoForward"
        ? `Forward to: ${topic}`
        : `Send to: ${topic}`;
    addNode("actionNode", nodeLabel, { topic, payload, payloadMode });
    setIsMqttPayloadModalOpen(false);
  };

  const handleWhatsappSelect = (
    phoneNumber: string,
    contactName: string,
    message: string,
    messageMode: "custom" | "autoForward",
  ) => {
    const nodeLabel =
      messageMode === "autoForward"
        ? `Forward WhatsApp to: ${contactName}`
        : `WhatsApp to: ${contactName}`;
    addNode("actionNode", nodeLabel, {
      phoneNumber,
      contactName,
      message,
      messageMode,
    });
    setIsWhatsappModalOpen(false);
  };

  const handleEmailSelect = (
    email: string,
    recipientName: string,
    subject: string,
    message: string,
    messageMode: "custom" | "autoForward",
  ) => {
    const nodeLabel =
      messageMode === "autoForward"
        ? `Forward Email to: ${recipientName}`
        : `Email to: ${recipientName}`;
    addNode("actionNode", nodeLabel, {
      email,
      recipientName,
      subject,
      message,
      messageMode,
    });
    setIsEmailModalOpen(false);
  };

  const handleTelegramSelect = (
    recipientId: string,
    recipientName: string,
    message: string,
    messageMode: "custom" | "autoForward",
  ) => {
    const nodeLabel =
      messageMode === "autoForward"
        ? `Forward Telegram to: ${recipientName}`
        : `Telegram to: ${recipientName}`;
    addNode("actionNode", nodeLabel, {
      recipientId,
      recipientName,
      message,
      messageMode,
    });
    setIsTelegramModalOpen(false);
  };

  const handleLogToDbSelect = (nodeName: string, config: any) => {
    addNode("actionNode", nodeName, config);
    setIsLogToDbModalOpen(false);
  };

  const handleControlRelaySelect = (
    deviceType: "modbus" | "modular",
    deviceName: string,
    selectedKey: string,
    controlType: string,
    config?: any,
  ) => {
    console.log(
      "📥 NodeSidebar handleControlRelaySelect - config received:",
      config,
    );
    onAddNode(
      "controlNode",
      deviceName,
      config || { deviceType, deviceName, selectedKey, controlType },
    );
    setIsControlRelayModalOpen(false);
  };

  const handleBillCalculationSelect = (nodeName: string, config?: any) => {
    addNode("analyticsNode", nodeName, {
      ...config,
      nodeSubType: "billCalculation",
    });
    setIsBillCalculationModalOpen(false);
  };

  const handleSwitchSelect = (config: {
    leftOperand?: {
      type: "deviceField" | "staticValue";
      deviceName?: string;
      deviceUniqId?: string;
      key?: string;
      value?: any;
    };
    cases: Array<{
      id: string;
      label: string;
      operator: string;
      rightOperand: {
        type: "deviceField" | "staticValue";
        deviceName?: string;
        deviceUniqId?: string;
        key?: string;
        value?: any;
      };
    }>;
    defaultCase?: { label: string };
  }) => {
    // Generate label from leftOperand
    let nodeLabel = "Switch";
    if (config.leftOperand) {
      if (config.leftOperand.type === "deviceField") {
        if (config.leftOperand.deviceName && config.leftOperand.key) {
          nodeLabel = `Switch: ${config.leftOperand.deviceName} - ${config.leftOperand.key}`;
        } else if (config.leftOperand.deviceName) {
          nodeLabel = `Switch: ${config.leftOperand.deviceName}`;
        }
      } else if (config.leftOperand.type === "staticValue") {
        nodeLabel = `Switch: ${config.leftOperand.value || "Static"}`;
      }
    }

    addNode("switchNode", nodeLabel, config);
    setIsSwitchModalOpen(false);
  };

  const handleEnrichmentSelect = (
    deviceUniqId: string,
    deviceTopic: string,
    targetTopic: string,
    keyValuePairs: Array<{ keyName: string; keyValue: string }>,
  ) => {
    const label = `Enrich: ${keyValuePairs.length} field${keyValuePairs.length !== 1 ? "s" : ""}`;
    addNode("enrichmentNode", label, {
      deviceUniqId,
      deviceTopic,
      keyValuePairs,
    });
    setIsEnrichmentModalOpen(false);
  };

  const handleDelaySelect = (
    mode: "delay" | "throttle" | "debounce",
    duration: number,
    unit: "seconds" | "minutes",
  ) => {
    const label = `${mode.charAt(0).toUpperCase() + mode.slice(1)
      }: ${duration}${unit === "seconds" ? "s" : "m"}`;
    addNode("delayNode", label, { mode, duration, unit });
    setIsDelayModalOpen(false);
  };

  const handleAlarmSelect = (
    alarmType: "CRITICAL" | "MAJOR" | "MINOR",
    customMessage?: string,
  ) => {
    const label = `Alarm: ${alarmType}`;
    addNode("alarmNode", label, { alarmType, customMessage });
    setIsAlarmModalOpen(false);
  };

  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-screen flex flex-col overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-1 px-2 py-3">
        {/* Device Sources Section */}
        <div>
          <button
            onClick={() => toggleSection("deviceSources")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <Radio size={14} />
              Device Sources
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expandedSections.deviceSources ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {expandedSections.deviceSources && (
            <div className="space-y-1 px-1">
              {/* Device External */}
              <button
                onClick={() => setIsDeviceModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Device External
              </button>

              {/* Timer/Scheduler */}
              <button
                onClick={() => setIsTimerSchedulerModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Timer/Scheduler
              </button>
            </div>
          )}
        </div>

        {/* Filter Section */}
        <div>
          <button
            onClick={() => toggleSection("filter")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <Filter size={14} />
              Filter
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expandedSections.filter ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {expandedSections.filter && (
            <div className="space-y-1 px-1">
              <button
                onClick={() => setIsMessageTypeFilterModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Message Type Filter
              </button>
              <button
                onClick={() => setIsFieldExistenceModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Check Field Existence
              </button>
            </div>
          )}
        </div>

        {/* Action Section */}
        <div>
          <button
            onClick={() => toggleSection("action")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <Zap size={14} />
              Action
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expandedSections.action ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {expandedSections.action && (
            <div className="space-y-1 px-1">
              <button
                onClick={() => setIsMqttPayloadModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Send MQTT Payload
              </button>
              <button
                onClick={() => setIsWhatsappModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Send WhatsApp
              </button>
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Send Email
              </button>
              <button
                onClick={() => setIsTelegramModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Send Telegram
              </button>
              <button
                onClick={() => setIsLogToDbModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded text-xs font-semibold">
                  <Database size={12} />
                </span>
                Log to Database
              </button>
            </div>
          )}
        </div>

        {/* Transform/Transformation Section */}
        <div>
          <button
            onClick={() => toggleSection("transformation")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <RefreshCw size={14} />
              Transformation
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expandedSections.transformation ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {expandedSections.transformation && (
            <div className="space-y-1 px-1">
              <button
                onClick={() => setIsExtractFieldsModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Extract Fields
              </button>
              <button
                onClick={() => setIsMapPayloadModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Map Payload
              </button>
              <button
                onClick={() => setIsSwitchModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Switch/Case
              </button>
              <button
                onClick={() => setIsEnrichmentModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Data Enrichment
              </button>
              <button
                onClick={() => setIsDelayModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Delay / Throttle
              </button>
            </div>
          )}
        </div>

        {/* Analytics/Aggregation Section */}
        <div>
          <button
            onClick={() => toggleSection("analytics")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <BarChart3 size={14} />
              Analytics/Aggregation
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expandedSections.analytics ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {expandedSections.analytics && (
            <div className="space-y-1 px-1">
              <button
                onClick={() => setIsSumValuesModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Sum Values
              </button>
              <button
                onClick={() => setIsBillCalculationModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Bill Calculation
              </button>
              <button
                onClick={() => setIsSeverityAggregateModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Severity Aggregate
              </button>
            </div>
          )}
        </div>

        {/* Control/Relay Section */}
        <div>
          <button
            onClick={() => toggleSection("control")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <Gamepad2 size={14} />
              Control/Relay
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expandedSections.control ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {expandedSections.control && (
            <div className="space-y-1 px-1">
              <button
                onClick={() => setIsControlRelayModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Relay Control
              </button>
            </div>
          )}
        </div>

        {/* Alarm Section */}
        <div>
          <button
            onClick={() => toggleSection("alarm")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={14} />
              Alarm
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expandedSections.alarm ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
          {expandedSections.alarm && (
            <div className="space-y-1 px-1">
              <button
                onClick={() => setIsAlarmModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-200 rounded text-xs font-semibold">
                  ≡
                </span>
                Create Alarm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* All Modals - Rendered Outside Scrollable Container */}
      {/* Device Selection Modal */}
      <DeviceSelectionModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        onSelect={handleDeviceSelect}
      />

      {/* Timer Scheduler Modal */}
      <TimerSchedulerModal
        isOpen={isTimerSchedulerModalOpen}
        onClose={() => setIsTimerSchedulerModalOpen(false)}
        onSelect={handleTimerSchedulerSelect}
      />

      {/* Message Type Filter Modal */}
      <MessageTypeFilterModal
        isOpen={isMessageTypeFilterModalOpen}
        onClose={() => setIsMessageTypeFilterModalOpen(false)}
        onSelect={handleMessageTypeFilterSelect}
      />

      {/* Field Existence Modal */}
      <FieldExistenceModal
        isOpen={isFieldExistenceModalOpen}
        onClose={() => setIsFieldExistenceModalOpen(false)}
        onSelect={handleFieldExistenceSelect}
      />

      {/* Extract Fields Modal */}
      <ExtractFieldsModal
        isOpen={isExtractFieldsModalOpen}
        onClose={() => setIsExtractFieldsModalOpen(false)}
        onSelect={handleExtractFieldsSelect}
      />

      {/* Map Payload Modal */}
      <MapPayloadModal
        isOpen={isMapPayloadModalOpen}
        onClose={() => setIsMapPayloadModalOpen(false)}
        onSelect={handleMapPayloadSelect}
      />

      {/* Sum Values Modal */}
      <SumValuesModal
        isOpen={isSumValuesModalOpen}
        onClose={() => setIsSumValuesModalOpen(false)}
        onSelect={handleSumValuesSelect}
      />

      {/* MQTT Payload Modal */}
      <MqttPayloadModal
        isOpen={isMqttPayloadModalOpen}
        onClose={() => setIsMqttPayloadModalOpen(false)}
        onSelect={handleMqttPayloadSelect}
      />

      {/* WhatsApp Modal */}
      <WhatsappModal
        isOpen={isWhatsappModalOpen}
        onClose={() => setIsWhatsappModalOpen(false)}
        onSelect={handleWhatsappSelect}
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSelect={handleEmailSelect}
      />

      {/* Telegram Modal */}
      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onSelect={handleTelegramSelect}
      />

      {/* Control Relay Modal */}
      <ControlRelayModal
        isOpen={isControlRelayModalOpen}
        onClose={() => setIsControlRelayModalOpen(false)}
        onSelect={handleControlRelaySelect}
      />

      {/* Bill Calculation Modal */}
      <BillCalculationModal
        isOpen={isBillCalculationModalOpen}
        onClose={() => setIsBillCalculationModalOpen(false)}
        onSelect={handleBillCalculationSelect}
      />

      {/* Switch Modal */}
      <SwitchModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        onSelect={handleSwitchSelect}
      />

      {/* Enrichment Modal */}
      <EnrichmentModal
        isOpen={isEnrichmentModalOpen}
        onClose={() => setIsEnrichmentModalOpen(false)}
        onSelect={handleEnrichmentSelect}
      />

      {/* Delay Modal */}
      <DelayModal
        isOpen={isDelayModalOpen}
        onClose={() => setIsDelayModalOpen(false)}
        onSelect={handleDelaySelect}
      />

      {/* Severity Aggregate Modal */}
      <SeverityAggregateModal
        isOpen={isSeverityAggregateModalOpen}
        onClose={() => setIsSeverityAggregateModalOpen(false)}
        onSelect={handleSeverityAggregateSelect}
      />

      {/* Alarm Modal */}
      <AlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        onSelect={handleAlarmSelect}
      />
      <LogToDbModal
        isOpen={isLogToDbModalOpen}
        onClose={() => setIsLogToDbModalOpen(false)}
        onSelect={handleLogToDbSelect}
      />
    </div>
  );
}
