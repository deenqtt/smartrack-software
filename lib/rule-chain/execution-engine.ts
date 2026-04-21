import { v4 as uuidv4 } from "uuid";

export interface RuleChainNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeId: string;
    config: any;
  };
}

export interface RuleChainEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: string;
  label?: string;
  data?: {
    edgeType?: string;
    field: string | null;
    operator: string | null;
    value: any;
  };
}

export interface ExecutionContext {
  executionId: string;
  ruleChainId: string;
  triggeredBy: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  initialPayload: any;
  currentPayload: any;
  metadata: {
    topic?: string;
    timestamp: number;
    messageType?: string;
  };
  executionPath: Array<{
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    timestamp: number;
    success: boolean;
    error?: string;
  }>;
  errors: Array<{
    nodeId: string;
    error: string;
    timestamp: number;
  }>;
}

export interface NodeExecutionResult {
  success: boolean;
  data: any;
  error?: string;
  switchResult?: string; // For switch nodes: case ID or "default"
  shouldStop?: boolean;  // For inputNode on-change: true = value unchanged, stop propagation
}

export class RuleChainExecutionEngine {
  private deviceStateStore: Map<string, { value: any; timestamp: number }>;
  private lastInputValueStore: Map<string, any>;

  constructor() {
    this.deviceStateStore = new Map();
    this.lastInputValueStore = new Map();
  }

  /**
   * Build graph structure from nodes and edges
   */
  buildGraph(nodes: RuleChainNode[], edges: RuleChainEdge[]) {
    const graph = {
      nodes: new Map<string, RuleChainNode>(),
      adjacency: new Map<string, RuleChainEdge[]>(),
    };

    // Index nodes
    nodes.forEach((node) => {
      graph.nodes.set(node.id, node);
      graph.adjacency.set(node.id, []);
    });

    // Build adjacency list
    edges.forEach((edge) => {
      const outgoingEdges = graph.adjacency.get(edge.source) || [];
      outgoingEdges.push(edge);
      graph.adjacency.set(edge.source, outgoingEdges);
    });

    return graph;
  }

  /**
   * Update device state store with payload data
   */
  updateDeviceState(deviceUniqId: string, payload: any) {
    Object.keys(payload).forEach((key) => {
      const stateKey = `${deviceUniqId}:${key}`;
      this.deviceStateStore.set(stateKey, {
        value: payload[key],
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Fetch latest telemetry from device state store
   */
  async fetchLatestTelemetry(deviceUniqId: string): Promise<any> {
    const deviceKeys = Array.from(this.deviceStateStore.keys()).filter((key) =>
      key.startsWith(`${deviceUniqId}:`),
    );

    const telemetry: any = {};
    deviceKeys.forEach((key) => {
      const field = key.split(":")[1];
      const state = this.deviceStateStore.get(key);
      if (state) {
        telemetry[field] = state.value;
      }
    });

    return telemetry;
  }

  /**
   * Get tracking field from source node
   */
  getTrackingFieldFromNode(node: RuleChainNode): string | null {
    const { type, data } = node;
    const config = data?.config || {};

    switch (type) {
      case "startNode":
        // Start node has no tracking field
        return null;

      case "inputNode":
        // Input node tracks the selected key
        return config.key || null;

      case "filterNode":
        // Filter node (Check Field Existence) tracks the fieldName
        return config.fieldName || null;

      case "transformNode":
        // Transform node tracks first selected field
        return config.selectedFields?.[0] || null;

      case "analyticsNode":
        // Analytics node tracks the result field (nodeTitle)
        return config.nodeTitle || null;

      default:
        return null;
    }
  }

  /**
   * Convert value to appropriate type based on its string representation
   */
  private convertValueType(value: any): any {
    if (value === undefined || value === null) {
      return value;
    }

    const str = String(value).trim();

    // Check for null
    if (str.toLowerCase() === "null") {
      return null;
    }

    // Check for boolean
    if (str.toLowerCase() === "true") {
      return true;
    }
    if (str.toLowerCase() === "false") {
      return false;
    }

    // Check for number
    if (!isNaN(Number(str)) && str !== "") {
      return Number(str);
    }

    // Check for array
    if (str.startsWith("[") && str.endsWith("]")) {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    }

    // Return as string
    return str;
  }

  /**
   * Evaluate edge - handles all edge types (condition, success, failure, default)
   */
  evaluateEdge(
    edge: RuleChainEdge,
    payload: any,
    graph: ReturnType<typeof this.buildGraph>,
    nodeSuccess: boolean = true,
  ): boolean {
    const { edgeType, operator, value } = edge.data || {};

    // Handle different edge types
    switch (edgeType) {
      case "success":
        // Success edge only executes if node succeeded
        return nodeSuccess;

      case "failure":
        // Failure edge only executes if node failed
        return !nodeSuccess;

      case "default":
        // Default edge always executes (catch-all)
        return true;

      case "condition":
      default:
        // Conditional edge - evaluate with operator and value
        break;
    }

    // Unconditional condition edge (no operator = always execute)
    if (!operator) {
      return true;
    }

    // Get source node to determine tracking field
    const sourceNode = graph.nodes.get(edge.source);
    if (!sourceNode) {
      console.warn(` Source node "${edge.source}" not found for edge`);
      return false;
    }

    // Get tracking field from source node
    const trackingField = this.getTrackingFieldFromNode(sourceNode);

    if (!trackingField) {
      console.warn(
        ` No tracking field found in source node "${sourceNode.data.label}"`,
      );
      console.warn(`   Edge will be treated as unconditional`);
      return true;
    }

    // Get field value from payload
    const fieldValue = payload[trackingField];

    // If field not found in payload
    if (fieldValue === undefined) {
      console.warn(
        ` Field "${trackingField}" not found in payload, edge condition cannot be evaluated`,
      );
      return false;
    }

    // Convert comparison value to appropriate type
    const convertedValue = this.convertValueType(value);

    // Evaluate condition
    let result: boolean;
    switch (operator) {
      case ">":
        result = fieldValue > convertedValue;
        break;
      case "<":
        result = fieldValue < convertedValue;
        break;
      case ">=":
        result = fieldValue >= convertedValue;
        break;
      case "<=":
        result = fieldValue <= convertedValue;
        break;
      case "==":
        result = fieldValue == convertedValue;
        break;
      case "!=":
        result = fieldValue != convertedValue;
        break;
      case "===":
        result = fieldValue === convertedValue;
        break;
      case "!==":
        result = fieldValue !== convertedValue;
        break;
      case "contains":
        result = String(fieldValue).includes(String(convertedValue));
        break;
      case "startsWith":
        result = String(fieldValue).startsWith(String(convertedValue));
        break;
      case "endsWith":
        result = String(fieldValue).endsWith(String(convertedValue));
        break;
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }

    return result;
  }

  /**
   * Template string with data (replace {{field}} with values)
   */
  templateString(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Template object recursively
   */
  templateObject(obj: any, data: any): any {
    if (typeof obj === "string") {
      return this.templateString(obj, data);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.templateObject(item, data));
    }

    if (typeof obj === "object" && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.templateObject(value, data);
      }
      return result;
    }

    return obj;
  }

  /**
   * Preprocess payload - parse nested JSON strings
   */
  preprocessPayload(payload: any): any {
    let processed = { ...payload };

    // Check if there's a "value" field containing JSON string
    if (processed.value && typeof processed.value === "string") {
      try {
        const parsedValue = JSON.parse(processed.value);

        // Merge parsed data with top-level payload
        processed = { ...processed, ...parsedValue };
      } catch (error) {
        console.warn(`   Failed to parse "value" field as JSON`);
      }
    }

    return processed;
  }

  /**
   * Execute rule chain manually (for testing)
   */
  async executeRuleChain(
    ruleChainId: string,
    nodes: RuleChainNode[],
    edges: RuleChainEdge[],
    testPayload: any,
    triggeringNodeId?: string,
  ): Promise<ExecutionContext> {
    // Find input nodes, timer scheduler nodes, and start nodes
    const inputNodes = nodes.filter((n) => n.type === "inputNode");
    const timerNodes = nodes.filter((n) => n.type === "timerSchedulerNode");
    const startNodes = nodes.filter((n) => n.type === "startNode");
    const enrichmentNodes = nodes.filter((n) => n.type === "enrichmentNode");

    // If triggeringNodeId specified, only execute from that node
    let startingNodes: RuleChainNode[];
    if (triggeringNodeId) {
      const triggeringNode = nodes.find((n) => n.id === triggeringNodeId);
      if (!triggeringNode) {
        throw new Error(`Triggering node ${triggeringNodeId} not found`);
      }
      startingNodes = [triggeringNode];
    } else {
      // Combine starting nodes (input nodes + timer nodes + start nodes + enrichment nodes)
      startingNodes = [
        ...inputNodes,
        ...timerNodes,
        ...startNodes,
        ...enrichmentNodes,
      ];

      if (startingNodes.length === 0) {
        throw new Error(
          "No input nodes, start nodes, enrichment nodes, or timer scheduler nodes found in rule chain",
        );
      }
    }

    // Preprocess payload (parse nested JSON strings)
    const preprocessedPayload = this.preprocessPayload(testPayload);

    // Create execution context
    const executionContext: ExecutionContext = {
      executionId: uuidv4(),
      ruleChainId,
      triggeredBy: inputNodes.map((n) => n.id).join(", "),
      startTime: Date.now(),
      initialPayload: testPayload,
      currentPayload: { ...preprocessedPayload },
      metadata: {
        timestamp: Date.now(),
        messageType: "telemetry",
      },
      executionPath: [],
      errors: [],
    };

    // Update device state store (from first input node or use all)
    inputNodes.forEach((inputNode) => {
      if (inputNode.data.config?.deviceUniqId) {
        this.updateDeviceState(
          inputNode.data.config.deviceUniqId,
          preprocessedPayload,
        );
      }
    });

    // Build graph
    const graph = this.buildGraph(nodes, edges);

    // Execute from ALL starting nodes (input + timer) in parallel
    const startingExecutions = startingNodes.map((startingNode) => {
      // Clone context for each starting node
      const nodeContext: ExecutionContext = {
        ...executionContext,
        triggeredBy: startingNode.id,
        currentPayload: { ...preprocessedPayload },
        executionPath: [],
        errors: [],
      };

      const nodeType =
        startingNode.type === "timerSchedulerNode" ? "timer" : "input";
      return this.executeFromNode(startingNode.id, graph, nodeContext);
    });

    // Wait for all starting nodes to complete
    await Promise.all(startingExecutions);

    // Finalize
    executionContext.endTime = Date.now();
    executionContext.duration =
      executionContext.endTime - executionContext.startTime;

    return executionContext;
  }

  /**
   * Execute from a specific node (recursive)
   */
  private async executeFromNode(
    nodeId: string,
    graph: ReturnType<typeof this.buildGraph>,
    executionContext: ExecutionContext,
  ): Promise<void> {
    const node = graph.nodes.get(nodeId);

    if (!node) {
      console.error(`Node ${nodeId} not found`);
      return;
    }

    // Execute node
    let result: NodeExecutionResult;
    try {
      result = await this.executeNode(node, executionContext);

      // Log execution path
      const executionPathEntry: {
        nodeId: string;
        nodeType: string;
        nodeLabel: string;
        timestamp: number;
        success: boolean;
        error?: string;
      } = {
        nodeId,
        nodeType: node.type,
        nodeLabel: node.data.label,
        timestamp: Date.now(),
        success: result.success,
      };

      if (result.error) {
        executionPathEntry.error = result.error;
      }

      executionContext.executionPath.push(executionPathEntry);
    } catch (error: any) {
      console.error(`   Node execution failed:`, error);

      executionContext.errors.push({
        nodeId,
        error: error.message,
        timestamp: Date.now(),
      });

      executionContext.executionPath.push({
        nodeId,
        nodeType: node.type,
        nodeLabel: node.data.label,
        timestamp: Date.now(),
        success: false,
        error: error.message,
      });

      return;
    }

    // Update payload with result
    if (result.data) {
      executionContext.currentPayload = result.data;
    }

    // On-change sentinel: inputNode detected no value change, stop here
    if (result.shouldStop) {
      return;
    }

    // Get outgoing edges
    // Note: We don't stop here even if node failed - failure edges may need to execute
    let outgoingEdges = graph.adjacency.get(nodeId) || [];

    // Special handling for switch nodes with multiple output handles
    if (node.type === "switchNode" && (result as any).switchResult) {
      const switchResult = (result as any).switchResult; // case ID or "default"
      // Filter edges to only those connected to the specific case handle
      outgoingEdges = outgoingEdges.filter(
        (edge) => edge.sourceHandle === switchResult,
      );
    }

    // Special handling for timer nodes with multiple outputs
    if (node.type === "timerSchedulerNode") {
      // For weekly nodes with start/end outputs
      if (executionContext.currentPayload?.outputType) {
        const outputType = executionContext.currentPayload.outputType; // "start" or "end"
        // Filter edges to only those connected to the specific output handle
        outgoingEdges = outgoingEdges.filter(
          (edge) => edge.sourceHandle === outputType,
        );
      }
      // Legacy support for trigger hour
      else if (executionContext.currentPayload?.triggerHour) {
        const triggerHour = executionContext.currentPayload.triggerHour;
        // Filter edges to only those connected to the specific trigger hour handle
        outgoingEdges = outgoingEdges.filter(
          (edge) => edge.sourceHandle === triggerHour,
        );
      }
    }

    if (outgoingEdges.length === 0) {
      return;
    }

    // Evaluate and execute next nodes
    const nextExecutions: Promise<void>[] = [];

    for (const edge of outgoingEdges) {
      const shouldFollow = this.evaluateEdge(
        edge,
        executionContext.currentPayload,
        graph,
        result.success, // Pass node success status
      );

      if (shouldFollow) {
        // Clone context for parallel execution
        const branchContext: ExecutionContext = {
          ...executionContext,
          currentPayload: { ...executionContext.currentPayload },
          executionPath: [...executionContext.executionPath],
          errors: [...executionContext.errors],
        };

        // Execute next node (recursive)
        nextExecutions.push(
          this.executeFromNode(edge.target, graph, branchContext),
        );
      } else {
      }
    }

    // Wait for all parallel branches
    if (nextExecutions.length > 0) {
      await Promise.all(nextExecutions);
    }
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(
    node: RuleChainNode,
    executionContext: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const { type, data } = node;
    const config = data.config || {};

    // Import executors dynamically
    const { executeFilterNode } = await import("./executors/filter-executor");
    const { executeTransformNode } =
      await import("./executors/transform-executor");
    const { executeAnalyticsNode } =
      await import("./executors/analytics-executor");
    const { executeActionNode } = await import("./executors/action-executor");
    const { executeControlNode } = await import("./executors/control-executor");
    const { executeTimerSchedulerNode } =
      await import("./executors/timer-scheduler-executor");
    const { executeSwitchNode } = await import("./executors/switch-executor");
    const { executeEnrichmentNode } =
      await import("./executors/enrichment-executor");
    const { executeDelayNode } = await import("./executors/delay-executor");
    const { executeAlarmNode } = await import("./executors/alarm-executor");

    switch (type) {
      case "startNode":
        // Start node is a manual trigger, just pass through with empty initial payload
        return { success: true, data: executionContext.currentPayload || {} };

      case "inputNode": {
        // On-change detection: only propagate if the tracked key's value changed
        const trackedKey = config.key;
        if (trackedKey) {
          const storeKey = `${executionContext.ruleChainId}:${node.id}:${trackedKey}`;
          const currentValue = executionContext.currentPayload[trackedKey];
          const lastValue = this.lastInputValueStore.get(storeKey);

          // Sentinel: if value unchanged, stop propagation (don't fire downstream nodes)
          if (lastValue !== undefined && JSON.stringify(currentValue) === JSON.stringify(lastValue)) {
            return { success: true, data: executionContext.currentPayload, shouldStop: true };
          }

          this.lastInputValueStore.set(storeKey, currentValue);
        }
        return { success: true, data: executionContext.currentPayload };
      }

      case "filterNode":
        return await executeFilterNode(config, executionContext, this);

      case "transformNode":
        return await executeTransformNode(config, executionContext, this);

      case "analyticsNode":
        return await executeAnalyticsNode(config, executionContext, this);

      case "actionNode":
        return await executeActionNode(config, executionContext, this);

      case "controlNode":
        return await executeControlNode(config, executionContext, this);

      case "timerSchedulerNode":
        return await executeTimerSchedulerNode(config, executionContext, this);

      case "switchNode":
        return await executeSwitchNode(config, executionContext, this);

      case "enrichmentNode":
        return await executeEnrichmentNode(config, executionContext, this);

      case "delayNode":
        return await executeDelayNode(config, executionContext, this);

      case "alarmNode":
        return await executeAlarmNode(config, executionContext, this);

      case "weekly":
        // Weekly schedules are handled by the timer service, but we can still execute them
        return await executeTimerSchedulerNode(config, executionContext, this);

      default:
        throw new Error(`Unknown node type: ${type}`);
    }
  }
}
