"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  type EdgeTypes,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Save, LogOut, LayoutGrid } from "lucide-react";
import { showToast } from "@/lib/toast-utils";

import { StartNode } from "./nodes/StartNode";
import { InputNode } from "./nodes/InputNode";
import { ActionNode } from "./nodes/ActionNode";
import { FilterNode } from "./nodes/FilterNode";
import { TransformNode } from "./nodes/TransformNode";
import { AnalyticsNode } from "./nodes/AnalyticsNode";
import { AlarmNode } from "./nodes/AlarmNode";
import { ControlNode } from "./nodes/ControlNode";
import { TimerSchedulerNode } from "./nodes/TimerSchedulerNode";
import { SwitchNode } from "./nodes/SwitchNode";
import { EnrichmentNode } from "./nodes/EnrichmentNode";
import { DelayNode } from "./nodes/DelayNode";
import { DatabaseNode } from "./nodes/DatabaseNode";
import NodeSidebar from "./NodeSidebar";
import EdgeConfigModal from "./modal/EdgeConfigModal";
import CustomEdge from "./CustomEdge";
import DeviceSelectionModal from "./modal/DeviceSelectionModal";
import WhatsappModal from "./modal/WhatsappModal";
import EmailModal from "./modal/EmailModal";
import TelegramModal from "./modal/TelegramModal";
import MqttPayloadModal from "./modal/MqttPayloadModal";
import MessageTypeFilterModal from "./modal/MessageTypeFilterModal";
import FieldExistenceModal from "./modal/FieldExistenceModal";
import ExtractFieldsModal from "./modal/ExtractFieldsModal";
import MapPayloadModal from "./modal/MapPayloadModal";
import SumValuesModal from "./modal/SumValuesModal";
import BillCalculationModal from "./modal/BillCalculationModal";
import ControlRelayModal from "./modal/ControlRelayModal";
import TimerSchedulerModal from "./modal/TimerSchedulerModal";
import SwitchModal from "./modal/SwitchModal";
import EnrichmentModal from "./modal/EnrichmentModal";
import DelayModal from "./modal/DelayModal";
import AlarmModal from "./modal/AlarmModal";
import LogToDbModal from "./modal/LogToDbModal";
import { RuleChainProvider } from "./RuleChainContext";

// Type declaration for dagre
const dagre: any = require("dagre");


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Context untuk pass addNode callback ke NodeSidebar
export const AddNodeContext = React.createContext<{
  addNodeToViewportCenter: (
    nodeType: string,
    label: string,
    config?: any,
  ) => void;
} | null>(null);

// Custom hook untuk akses context
export function useAddNodeContext() {
  const context = React.useContext(AddNodeContext);
  if (!context) {
    throw new Error("useAddNodeContext must be used within RuleChainCanvas");
  }
  return context;
}

// Child component yang bisa akses useReactFlow
function RuleChainCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  nodeTypes,
  edgeTypes,
  setNodes,
}: {
  nodes: any[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onNodeClick: any;
  onPaneClick: any;
  nodeTypes: any;
  edgeTypes: EdgeTypes;
  setNodes: any;
}) {
  const reactFlow = useReactFlow();

  const addNodeToViewportCenter = useCallback(
    (nodeType: string, label: string, config?: any) => {
      const nodeId = `${Date.now()}-${Math.random()}`;

      try {
        // Get current viewport
        const viewport = reactFlow.getViewport();

        // Calculate center of viewport
        // viewport.x, viewport.y = pan position
        // viewport.zoom = zoom level
        const posX =
          -viewport.x / viewport.zoom +
          (window.innerWidth / 2 - 256) / viewport.zoom;
        const posY =
          -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;

        const newNode: Node = {
          id: nodeId,
          type: nodeType,
          position: {
            x: posX,
            y: posY,
          },
          data: { label, nodeId, ...(config && { config }) },
        };

        setNodes((nds: Node[]) => [...nds, newNode]);
        console.log(
          `✅ Node added at viewport center: (${posX.toFixed(0)}, ${posY.toFixed(0)})`,
        );
      } catch (error) {
        console.warn("Could not get viewport position, using default", error);
        const newNode: Node = {
          id: `${Date.now()}-${Math.random()}`,
          type: nodeType,
          position: { x: 100, y: 100 },
          data: {
            label,
            nodeId: `${Date.now()}-${Math.random()}`,
            ...(config && { config }),
          },
        };
        setNodes((nds: Node[]) => [...nds, newNode]);
      }
    },
    [reactFlow, setNodes],
  );

  return (
    <AddNodeContext.Provider value={{ addNodeToViewportCenter }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-slate-50 dark:bg-slate-900"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </AddNodeContext.Provider>
  );
}

// Define custom node types
const nodeTypes = {
  startNode: StartNode,
  inputNode: InputNode,
  timerSchedulerNode: TimerSchedulerNode,
  actionNode: ActionNode,
  switchNode: SwitchNode,

  filterNode: FilterNode,
  transformNode: TransformNode,
  enrichmentNode: EnrichmentNode,
  delayNode: DelayNode,
  analyticsNode: AnalyticsNode,
  alarmNode: AlarmNode,
  controlNode: ControlNode,
  databaseNode: DatabaseNode,
};

// Define custom edge types
const edgeTypes = {
  custom: CustomEdge,
};

// Initial nodes - empty canvas
const initialNodes: Node[] = [];

// Initial edges - empty canvas
const initialEdges: Edge[] = [];

interface EdgeConnection {
  source: string;
  target: string;
  sourceHandle: string | null; // For multi-output nodes like weekly timers
  targetHandle: string | null;
}

export default function RuleChainEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);
  const [pendingConnection, setPendingConnection] =
    useState<EdgeConnection | null>(null);
  const pendingConnectionRef = useRef<EdgeConnection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentRuleChainId, setCurrentRuleChainId] = useState<string | null>(
    null,
  );
  const [currentRuleChainName, setCurrentRuleChainName] = useState<string>("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingModalType, setEditingModalType] = useState<string | null>(null);
  const [isWhatsappModalOpenForEdit, setIsWhatsappModalOpenForEdit] =
    useState(false);
  const [isEmailModalOpenForEdit, setIsEmailModalOpenForEdit] = useState(false);
  const [isTelegramModalOpenForEdit, setIsTelegramModalOpenForEdit] =
    useState(false);
  const [isMqttPayloadModalOpenForEdit, setIsMqttPayloadModalOpenForEdit] =
    useState(false);
  const [isLogToDbModalOpenForEdit, setIsLogToDbModalOpenForEdit] =
    useState(false);
  const [isDeviceModalOpenForEdit, setIsDeviceModalOpenForEdit] =
    useState(false);
  const [
    isMessageTypeFilterModalOpenForEdit,
    setIsMessageTypeFilterModalOpenForEdit,
  ] = useState(false);
  const [
    isFieldExistenceModalOpenForEdit,
    setIsFieldExistenceModalOpenForEdit,
  ] = useState(false);
  const [isExtractFieldsModalOpenForEdit, setIsExtractFieldsModalOpenForEdit] =
    useState(false);
  const [isMapPayloadModalOpenForEdit, setIsMapPayloadModalOpenForEdit] =
    useState(false);
  const [isSumValuesModalOpenForEdit, setIsSumValuesModalOpenForEdit] =
    useState(false);
  const [
    isBillCalculationModalOpenForEdit,
    setIsBillCalculationModalOpenForEdit,
  ] = useState(false);
  const [isControlRelayModalOpenForEdit, setIsControlRelayModalOpenForEdit] =
    useState(false);
  const [
    isTimerSchedulerModalOpenForEdit,
    setIsTimerSchedulerModalOpenForEdit,
  ] = useState(false);
  const [isSwitchModalOpenForEdit, setIsSwitchModalOpenForEdit] =
    useState(false);
  const [isDelayModalOpenForEdit, setIsDelayModalOpenForEdit] = useState(false);
    useState(false);
  const [isEnrichmentModalOpenForEdit, setIsEnrichmentModalOpenForEdit] =
    useState(false);
  const [isAlarmModalOpenForEdit, setIsAlarmModalOpenForEdit] = useState(false);

  // Auto-load rule chain from URL parameter
  useEffect(() => {
    const chainId = searchParams.get("load");
    if (chainId) {
      loadRuleChainById(chainId);
    }
  }, [searchParams]);

  const onConnect = useCallback((params: Connection) => {
    // Save connection with handle IDs and open edge config modal
    console.log("🔗 Connection detected:", {
      source: params.source,
      sourceHandle: params.sourceHandle,
      target: params.target,
      targetHandle: params.targetHandle,
    });

    setPendingConnection({
      source: params.source || "",
      target: params.target || "",
      sourceHandle: params.sourceHandle || null,
      targetHandle: params.targetHandle || null,
    });
    pendingConnectionRef.current = {
      source: params.source || "",
      target: params.target || "",
      sourceHandle: params.sourceHandle || null,
      targetHandle: params.targetHandle || null,
    };
    setIsEdgeModalOpen(true);
  }, []);

  const handleEdgeConfig = useCallback(
    (
      field: string,
      operator: string,
      value: string,
      label: string,
      edgeData?: any,
    ) => {
      console.log("🔧 handleEdgeConfig called with:", {
        field,
        operator,
        value,
        label,
        edgeData,
      });

      // Use ref instead of state for reliable access
      const connection = pendingConnectionRef.current;
      console.log("📍 pendingConnectionRef.current:", connection);

      if (connection) {
        console.log("✅ pendingConnection exists, creating edge");

        // Create unique edge ID including sourceHandle for multi-output nodes (like weekly timers)
        const edgeId = connection.sourceHandle
          ? `${connection.source}-${connection.sourceHandle}-${connection.target}`
          : `${connection.source}-${connection.target}`;

        const newEdge: Edge = {
          id: edgeId,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: "custom",
          label,
          data: edgeData || {
            field,
            operator,
            value,
          },
          markerEnd: { type: MarkerType.ArrowClosed },
        };
        console.log("🎯 New edge created:", newEdge);
        setEdges((eds) => [...eds, newEdge]);
        setIsEdgeModalOpen(false);
        setPendingConnection(null);
        pendingConnectionRef.current = null;
      } else {
        console.error("❌ pendingConnection is null/undefined!");
      }
    },
    [],
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback(
    (nodeType: string, label: string, config?: any) => {
      const nodeId = `${Date.now()}-${Math.random()}`;

      const newNode: Node = {
        id: nodeId,
        type: nodeType,
        position: {
          x: 100,
          y: 100,
        },
        data: { label, nodeId, ...(config && { config }) },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      setSelectedNode(null);
    },
    [setNodes, setEdges],
  );

  const layoutNodes = useCallback(() => {
    if (nodes.length === 0) {
      showToast.info("No nodes to arrange");
      return;
    }

    try {
      // Create a new directed graph with LR (left-to-right) horizontal layout
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: "LR", nodesep: 150, ranksep: 150 });
      g.setDefaultEdgeLabel(() => ({}));

      // Add nodes to the graph
      nodes.forEach((node) => {
        g.setNode(node.id, { width: 180, height: 80 });
      });

      // Add edges to the graph
      edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
      });

      // Run the layout algorithm
      dagre.layout(g);

      // Update node positions based on layout
      const newNodes = nodes.map((node) => {
        const nodeWithPosition = g.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - 90, // center the node (width/2)
            y: nodeWithPosition.y - 40, // center the node (height/2)
          },
        };
      });

      setNodes(newNodes);
      showToast.success("Nodes arranged successfully!");
    } catch (error: any) {
      console.error("Layout error:", error);
      showToast.error("Failed to arrange nodes: " + error.message);
    }
  }, [nodes, edges, setNodes]);

  const handleNodeEdit = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      console.log("🔧 handleNodeEdit called for nodeId:", nodeId);
      console.log("📍 Node type:", node.type);
      console.log("📋 Node config:", node.data?.config);
      console.log("🏷️ Node label:", node.data?.label);

      setEditingNodeId(nodeId);
      setEditingModalType(node.type || null);

      const config = node.data?.config || {};
      const label = String(node.data?.label || "");

      // Open corresponding modal based on node type
      switch (node.type) {
        case "inputNode":
          console.log("✅ Opening Device Modal for edit");
          setIsDeviceModalOpenForEdit(true);
          break;
        case "actionNode":
          // Determine which action modal to open based on config
          if ((config as any).nodeSubType === "logToDb") {
            console.log("✅ Opening Log to DB Modal for edit");
            setIsLogToDbModalOpenForEdit(true);
          } else if ((config as any).phoneNumber) {
            console.log("✅ Opening WhatsApp Modal for edit");
            setIsWhatsappModalOpenForEdit(true);
          } else if ((config as any).email) {
            console.log("✅ Opening Email Modal for edit");
            setIsEmailModalOpenForEdit(true);
          } else if ((config as any).recipientId) {
            console.log("✅ Opening Telegram Modal for edit");
            setIsTelegramModalOpenForEdit(true);
          } else if ((config as any).topic) {
            console.log("✅ Opening MQTT Payload Modal for edit");
            setIsMqttPayloadModalOpenForEdit(true);
          } else {
            console.warn("⚠️ Unknown action node config:", config);
          }
          break;
        case "filterNode":
          // Determine which filter modal based on label
          if (label.includes("Check Field")) {
            console.log("✅ Opening Field Existence Modal for edit");
            setIsFieldExistenceModalOpenForEdit(true);
          } else if (label.includes("Filter")) {
            console.log("✅ Opening Message Type Filter Modal for edit");
            setIsMessageTypeFilterModalOpenForEdit(true);
          } else {
            console.warn("⚠️ Unknown filter node config:", config);
          }
          break;
        case "transformNode":
          // Determine which transform modal based on label
          if (label.includes("Map")) {
            console.log("✅ Opening Map Payload Modal for edit");
            setIsMapPayloadModalOpenForEdit(true);
          } else if (label.includes("Extract")) {
            console.log("✅ Opening Extract Fields Modal for edit");
            setIsExtractFieldsModalOpenForEdit(true);
          } else {
            console.warn("⚠️ Unknown transform node config:", config);
          }
          break;
        case "analyticsNode":
          // Determine which analytics modal based on label or config
          if (label.includes("Bill")) {
            console.log("✅ Opening Bill Calculation Modal for edit");
            setIsBillCalculationModalOpenForEdit(true);
          } else if (
            label.includes("SUM") ||
            label.includes("AVERAGE") ||
            label.includes("MIN") ||
            label.includes("MAX") ||
            (config as any).calculationType
          ) {
            console.log("✅ Opening Sum Values Modal for edit");
            setIsSumValuesModalOpenForEdit(true);
          } else {
            console.warn("⚠️ Unknown analytics node config:", config);
            console.warn("⚠️ Label:", label);
          }
          break;
        case "controlNode":
          console.log("✅ Opening Control Relay Modal for edit");
          setIsControlRelayModalOpenForEdit(true);
          break;
        case "timerSchedulerNode":
          console.log("✅ Opening Timer Scheduler Modal for edit");
          setIsTimerSchedulerModalOpenForEdit(true);
          break;
        case "switchNode":
          console.log("✅ Opening Switch Modal for edit");
          setIsSwitchModalOpenForEdit(true);
          break;
        case "delayNode":
          console.log("✅ Opening Delay Modal for edit");
          setIsDelayModalOpenForEdit(true);
          break;
        case "enrichmentNode":
          console.log("✅ Opening Enrichment Modal for edit");
          setIsEnrichmentModalOpenForEdit(true);
          break;
        case "alarmNode":
          console.log("✅ Opening Alarm Modal for edit");
          setIsAlarmModalOpenForEdit(true);
          break;
        case "databaseNode":
          console.log("✅ Opening Log to DB Modal for edit");
          setIsLogToDbModalOpenForEdit(true);
          break;
        default:
          console.log("❌ Edit not implemented for node type:", node.type);
      }
    },
    [nodes],
  );

  const handleEditNodeSave = useCallback(
    (
      deviceName: string,
      deviceUniqId: string,
      key?: string,
      topic?: string,
      extraConfig?: Record<string, any>,
    ) => {
      if (!editingNodeId) return;

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            const newLabel = key ? `${deviceName} - ${key}` : deviceName;
            return {
              ...node,
              data: {
                ...node.data,
                label: newLabel,
                config: { deviceName, deviceUniqId, key, topic, ...extraConfig },
              },
            };
          }
          return node;
        }),
      );

      setEditingNodeId(null);
      setIsDeviceModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditWhatsappSave = useCallback(
    (
      phoneNumber: string,
      contactName: string,
      message: string,
      messageMode: "custom" | "autoForward",
    ) => {
      if (!editingNodeId) return;
      const nodeLabel =
        messageMode === "autoForward"
          ? `Forward WhatsApp to: ${contactName}`
          : `WhatsApp to: ${contactName}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: {
                  nodeSubType: "sendWhatsApp",
                  phoneNumber,
                  contactName,
                  message,
                  messageMode,
                },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsWhatsappModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditEmailSave = useCallback(
    (
      email: string,
      recipientName: string,
      subject: string,
      message: string,
      messageMode: "custom" | "autoForward",
    ) => {
      if (!editingNodeId) return;
      const nodeLabel =
        messageMode === "autoForward"
          ? `Forward Email to: ${recipientName}`
          : `Email to: ${recipientName}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: { email, recipientName, subject, message, messageMode },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsEmailModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditTelegramSave = useCallback(
    (
      recipientId: string,
      recipientName: string,
      message: string,
      messageMode: "custom" | "autoForward",
    ) => {
      if (!editingNodeId) return;
      const nodeLabel =
        messageMode === "autoForward"
          ? `Forward Telegram to: ${recipientName}`
          : `Telegram to: ${recipientName}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: { recipientId, recipientName, message, messageMode },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsTelegramModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditMqttPayloadSave = useCallback(
    (topic: string, payload: string, payloadMode: "custom" | "autoForward") => {
      if (!editingNodeId) return;
      const nodeLabel =
        payloadMode === "autoForward"
          ? `Forward to: ${topic}`
          : `Send to: ${topic}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: { topic, payload, payloadMode },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsMqttPayloadModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditLogToDbSave = useCallback(
    (nodeName: string, config: any) => {
      if (!editingNodeId) return;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeName,
                config: config,
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsLogToDbModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditMessageTypeFilterSave = useCallback(
    (selectedTypes: string[]) => {
      if (!editingNodeId) return;
      const nodeLabel = `Filter ${selectedTypes.join(", ")}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: { selectedTypes },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsMessageTypeFilterModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditFieldExistenceSave = useCallback(
    (
      fieldName: string,
      deviceName: string,
      deviceUniqId: string,
      topic?: string,
    ) => {
      if (!editingNodeId) return;
      const nodeLabel = `Check Field: ${fieldName}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: { fieldName, deviceName, deviceUniqId, topic },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsFieldExistenceModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditExtractFieldsSave = useCallback(
    (selectedFields: string[], deviceUniqId?: string, topic?: string) => {
      if (!editingNodeId) return;
      const nodeLabel = `Extract: ${selectedFields.join(", ")}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: { selectedFields, deviceUniqId, topic },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsExtractFieldsModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditMapPayloadSave = useCallback(
    (mappings: any[]) => {
      if (!editingNodeId) return;
      const mappingLabels = mappings
        .map((m) => `${m.sourceField} → ${m.targetField}`)
        .join(", ");
      const nodeLabel = `Map: ${mappingLabels}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: { mappings },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsMapPayloadModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditSumValuesSave = useCallback(
    (nodeName: string, config?: any) => {
      if (!editingNodeId) return;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeName,
                config: config || { nodeName },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsSumValuesModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditBillCalculationSave = useCallback(
    (nodeName: string, config?: any) => {
      if (!editingNodeId) return;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeName,
                config: config || { nodeName },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null as any);
      setIsBillCalculationModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditControlRelaySave = useCallback(
    (
      deviceType: "modbus" | "modular",
      deviceName: string,
      selectedKey: string,
      controlType: string,
      config?: any,
    ) => {
      if (!editingNodeId) return;

      console.log(
        "🎯 RuleChainEditor handleEditControlRelaySave - config:",
        config,
      );

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            const finalConfig = config || {
              deviceType,
              deviceName,
              selectedKey,
              controlType,
            };
            console.log(
              "💾 RuleChainEditor - final config to save:",
              finalConfig,
            );
            return {
              ...node,
              data: {
                ...node.data,
                label: deviceName,
                config: finalConfig,
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsControlRelayModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditTimerSchedulerSave = useCallback(
    (nodeName: string, scheduleType: string, config: any) => {
      if (!editingNodeId) return;

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeName,
                config: config,
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsTimerSchedulerModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditSwitchSave = useCallback(
    (config: {
      field: string;
      cases: Array<{
        id: string;
        condition: string;
        label: string;
        operator: string;
        value: any;
      }>;
      defaultCase?: { label: string };
    }) => {
      if (!editingNodeId) return;

      const nodeLabel = `Switch: ${config.field}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: nodeLabel,
                config: config,
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsSwitchModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditDelaySave = useCallback(
    (
      mode: "delay" | "throttle" | "debounce",
      duration: number,
      unit: "seconds" | "minutes",
    ) => {
      if (!editingNodeId) return;

      const label = `${mode.charAt(0).toUpperCase() + mode.slice(1)}: ${duration}${unit === "seconds" ? "s" : "m"}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: label,
                config: { mode, duration, unit },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsDelayModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditEnrichmentSave = useCallback(
    (
      deviceUniqId: string,
      deviceTopic: string,
      targetTopic: string,
      keyValuePairs: Array<{ keyName: string; keyValue: string }>,
    ) => {
      if (!editingNodeId) return;

      const label = `Enrich: ${targetTopic}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: label,
                config: {
                  deviceUniqId,
                  deviceTopic,
                  targetTopic,
                  keyValuePairs,
                },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsEnrichmentModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );

  const handleEditAlarmSave = useCallback(
    (alarmType: "CRITICAL" | "MAJOR" | "MINOR", customMessage?: string) => {
      if (!editingNodeId) return;

      const label = `Alarm: ${alarmType}`;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: label,
                config: { alarmType, customMessage },
              },
            };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      setEditingModalType(null);
      setIsAlarmModalOpenForEdit(false);
    },
    [editingNodeId, setNodes],
  );


  const handleSaveRuleChain = async () => {
    if (!currentRuleChainId || !currentRuleChainName) {
      showToast.error("No rule chain loaded. Please load a rule chain first.");
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Auto arrange nodes first
      if (nodes.length > 0) {
        console.log("🔄 Auto-arranging nodes before save...");
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: "LR", nodesep: 150, ranksep: 150 });
        g.setDefaultEdgeLabel(() => ({}));

        nodes.forEach((node) => {
          g.setNode(node.id, { width: 180, height: 80 });
        });

        edges.forEach((edge) => {
          g.setEdge(edge.source, edge.target);
        });

        dagre.layout(g);

        const arrangedNodes = nodes.map((node) => {
          const nodeWithPosition = g.node(node.id);
          return {
            ...node,
            position: {
              x: nodeWithPosition.x - 90,
              y: nodeWithPosition.y - 40,
            },
          };
        });

        setNodes(arrangedNodes);
        // Use arrangedNodes for saving instead of nodes
        const response = await fetch(
          `${API_BASE_URL}/api/rule-chains/${currentRuleChainId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nodes: arrangedNodes,
              edges,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save rule chain");
        }

        await response.json();

        // Step 2: After successful save, reload the rule engine to apply changes
        console.log("🔄 Reloading rule engine to apply changes...");
        const reloadResponse = await fetch(
          `${API_BASE_URL}/api/rule-chains/reload`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (reloadResponse.ok) {
          console.log("✅ Rule engine reloaded successfully");
          showToast.success(
            `"${currentRuleChainName}" has been saved and rule engine reloaded`,
          );
        } else {
          console.warn(
            "⚠️ Rule engine reload request failed, but rule chain was saved",
          );
          showToast.success(
            `"${currentRuleChainName}" has been arranged and saved successfully`,
          );
        }
      } else {
        // No nodes to arrange, just save
        const response = await fetch(
          `${API_BASE_URL}/api/rule-chains/${currentRuleChainId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nodes,
              edges,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save rule chain");
        }

        await response.json();

        // Step 2: After successful save, reload the rule engine to apply changes
        console.log("🔄 Reloading rule engine to apply changes...");
        const reloadResponse = await fetch(
          `${API_BASE_URL}/api/rule-chains/reload`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (reloadResponse.ok) {
          console.log("✅ Rule engine reloaded successfully");
          showToast.success(
            `"${currentRuleChainName}" has been saved and rule engine reloaded`,
          );
        } else {
          console.warn(
            "⚠️ Rule engine reload request failed, but rule chain was saved",
          );
          showToast.success(
            `"${currentRuleChainName}" has been saved successfully`,
          );
        }
      }
    } catch (error: any) {
      console.error("Save error:", error);
      showToast.error(error.message || "Failed to save rule chain");
    } finally {
      setIsSaving(false);
    }
  };

  const loadRuleChainById = async (chainId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rule-chains/${chainId}`,
      );
      if (!response.ok) throw new Error("Failed to load rule chain");
      const data = await response.json();

      // Load nodes and edges
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setCurrentRuleChainId(chainId);
      setCurrentRuleChainName(data.name);

      // Show success toast
      showToast.success(`"${data.name}" has been loaded successfully`);
    } catch (error: any) {
      showToast.error(error.message || "Failed to load rule chain");
    }
  };

  // Callback to close all NodeSidebar modals when editing
  const onEditNodeGlobal = useCallback(
    (nodeId: string) => {
      console.log("📤 Edit triggered - NodeSidebar modals should close");
      handleNodeEdit(nodeId);
    },
    [handleNodeEdit],
  );

  return (
    <RuleChainProvider deleteNode={deleteNode} onEditNode={onEditNodeGlobal}>
      <div className="w-full h-full flex flex-col bg-white dark:bg-slate-950">
        {/* Top Header with Save and Exit Buttons */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {currentRuleChainName || "Rule Chain Editor"}
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveRuleChain}
              disabled={isSaving || !currentRuleChainId}
              title="Auto arrange and save rule chain"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:active:bg-blue-800 dark:disabled:bg-slate-700 text-white dark:disabled:text-slate-400 rounded-lg transition-all font-medium text-sm shadow-md hover:shadow-lg disabled:shadow-none"
            >
              <Save size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">
                {isSaving ? "Saving..." : "Save"}
              </span>
            </button>
            <button
              onClick={() => router.push("/manage-rule-chains")}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:active:bg-slate-800 text-white rounded-lg transition-all font-medium text-sm shadow-md hover:shadow-lg"
            >
              <LogOut size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex bg-white dark:bg-slate-950">
          {/* Sidebar */}
          <NodeSidebar
            onAddNode={addNode}
            selectedNode={selectedNode}
            isEditingNode={editingNodeId !== null}
          />

          {/* Main Canvas - static positioning to prevent z-index stacking context */}
          <div className="flex-1">
            <ReactFlowProvider>
              <RuleChainCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                setNodes={setNodes}
              />
            </ReactFlowProvider>
          </div>
        </div>
      </div>

      {/* All Modals - rendered outside main layout to avoid z-index issues */}
      {/* Edge Configuration Modal */}
      <EdgeConfigModal
        isOpen={isEdgeModalOpen}
        onClose={() => {
          setIsEdgeModalOpen(false);
          setPendingConnection(null);
          pendingConnectionRef.current = null;
        }}
        onConfig={handleEdgeConfig}
        pendingConnection={pendingConnection}
      />

      {/* Device Selection Modal for Editing Input Node */}
      <DeviceSelectionModal
        isOpen={isDeviceModalOpenForEdit}
        onClose={() => {
          setIsDeviceModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditNodeSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* WhatsApp Modal for Editing */}
      <WhatsappModal
        isOpen={isWhatsappModalOpenForEdit}
        onClose={() => {
          setIsWhatsappModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditWhatsappSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Email Modal for Editing */}
      <EmailModal
        isOpen={isEmailModalOpenForEdit}
        onClose={() => {
          setIsEmailModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditEmailSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Telegram Modal for Editing */}
      <TelegramModal
        isOpen={isTelegramModalOpenForEdit}
        onClose={() => {
          setIsTelegramModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditTelegramSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* MQTT Payload Modal for Editing */}
      <MqttPayloadModal
        isOpen={isMqttPayloadModalOpenForEdit}
        onClose={() => {
          setIsMqttPayloadModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditMqttPayloadSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Message Type Filter Modal for Editing */}
      <MessageTypeFilterModal
        isOpen={isMessageTypeFilterModalOpenForEdit}
        onClose={() => {
          setIsMessageTypeFilterModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditMessageTypeFilterSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Field Existence Modal for Editing */}
      <FieldExistenceModal
        isOpen={isFieldExistenceModalOpenForEdit}
        onClose={() => {
          setIsFieldExistenceModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditFieldExistenceSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Extract Fields Modal for Editing */}
      <ExtractFieldsModal
        isOpen={isExtractFieldsModalOpenForEdit}
        onClose={() => {
          setIsExtractFieldsModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditExtractFieldsSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Map Payload Modal for Editing */}
      <MapPayloadModal
        isOpen={isMapPayloadModalOpenForEdit}
        onClose={() => {
          setIsMapPayloadModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditMapPayloadSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Sum Values Modal for Editing */}
      <SumValuesModal
        isOpen={isSumValuesModalOpenForEdit}
        onClose={() => {
          setIsSumValuesModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditSumValuesSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Bill Calculation Modal for Editing */}
      <BillCalculationModal
        isOpen={isBillCalculationModalOpenForEdit}
        onClose={() => {
          setIsBillCalculationModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditBillCalculationSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Control Relay Modal for Editing */}
      <ControlRelayModal
        isOpen={isControlRelayModalOpenForEdit}
        onClose={() => {
          setIsControlRelayModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditControlRelaySave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Timer Scheduler Modal for Editing */}
      <TimerSchedulerModal
        isOpen={isTimerSchedulerModalOpenForEdit}
        onClose={() => {
          setIsTimerSchedulerModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditTimerSchedulerSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Switch Modal for Editing */}
      <SwitchModal
        isOpen={isSwitchModalOpenForEdit}
        onClose={() => {
          setIsSwitchModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditSwitchSave as any}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Delay Modal for Editing */}
      <DelayModal
        isOpen={isDelayModalOpenForEdit}
        onClose={() => {
          setIsDelayModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditDelaySave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Enrichment Modal for Editing */}
      <EnrichmentModal
        isOpen={isEnrichmentModalOpenForEdit}
        onClose={() => {
          setIsEnrichmentModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditEnrichmentSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Alarm Modal for Editing */}
      <AlarmModal
        isOpen={isAlarmModalOpenForEdit}
        onClose={() => {
          setIsAlarmModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditAlarmSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />

      {/* Log to DB Modal for Editing */}
      <LogToDbModal
        isOpen={isLogToDbModalOpenForEdit}
        onClose={() => {
          setIsLogToDbModalOpenForEdit(false);
          setEditingNodeId(null);
        }}
        onSelect={handleEditLogToDbSave}
        initialConfig={
          editingNodeId
            ? (nodes.find((n) => n.id === editingNodeId)?.data.config as any)
            : undefined
        }
      />
    </RuleChainProvider>
  );
}
