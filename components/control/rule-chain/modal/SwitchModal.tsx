"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Database, Hash } from "lucide-react";
import { useMqttServer } from "@/contexts/MqttServerProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Device {
  uniqId: string;
  name: string;
  topic: string;
}

interface Operand {
  type: "deviceField" | "staticValue";
  deviceName?: string;
  deviceUniqId?: string;
  deviceTopic?: string;
  key?: string;
  value?: any;
}

interface SwitchCase {
  id: string;
  label: string;
  operator: string;
  rightOperand: Operand;
}

interface SwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (config: {
    leftOperand: Operand;
    cases: SwitchCase[];
    defaultCase?: { label: string };
  }) => void;
  initialConfig?: {
    leftOperand?: Operand;
    cases?: SwitchCase[];
    defaultCase?: { label: string };
  };
}

const SwitchModal: React.FC<SwitchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [devices, setDevices] = useState<Device[]>([]);
  const [leftOperand, setLeftOperand] = useState<Operand>(
    initialConfig?.leftOperand || { type: "deviceField" }
  );
  const [cases, setCases] = useState<SwitchCase[]>(initialConfig?.cases || []);
  const [defaultCaseLabel, setDefaultCaseLabel] = useState(
    initialConfig?.defaultCase?.label || ""
  );

  // Available keys per device
  const [leftKeys, setLeftKeys] = useState<string[]>([]);
  const [rightKeys, setRightKeys] = useState<Map<number, string[]>>(new Map());
  const [isWaitingForLeftKeys, setIsWaitingForLeftKeys] = useState(false);
  const [waitingForRightKeys, setWaitingForRightKeys] = useState<Set<number>>(
    new Set()
  );

  const subscribedTopics = useRef<Map<string, (topic: string, payload: string) => void>>(
    new Map()
  );

  // Fetch devices saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      fetchDevices();
      setLeftOperand(initialConfig?.leftOperand || { type: "deviceField" });
      setCases(initialConfig?.cases || []);
      setDefaultCaseLabel(initialConfig?.defaultCase?.label || "");

      // Restore keys if editing
      if (initialConfig?.leftOperand?.key) {
        setLeftKeys([initialConfig.leftOperand.key]);
      }
    } else {
      // Cleanup subscriptions when modal closes
      subscribedTopics.current.forEach((handler, topic) => {
        unsubscribe(topic, handler);
      });
      subscribedTopics.current.clear();
    }
  }, [isOpen, initialConfig, unsubscribe]);

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  // Handle MQTT message untuk left operand
  const handleLeftMqttMessage = useCallback((topic: string, payloadString: string) => {
    try {
      const payload = JSON.parse(payloadString);
      if (typeof payload.value === "string") {
        const innerPayload = JSON.parse(payload.value);
        const keys = Object.keys(innerPayload);
        setLeftKeys((prev) => [...new Set([...prev, ...keys])]);
      }
    } catch (e) {
      console.error("Failed to parse MQTT payload:", e);
    } finally {
      setIsWaitingForLeftKeys(false);
    }
  }, []);

  // Handle MQTT message untuk right operand
  const handleRightMqttMessage = useCallback(
    (caseIndex: number) => (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        if (typeof payload.value === "string") {
          const innerPayload = JSON.parse(payload.value);
          const keys = Object.keys(innerPayload);
          setRightKeys((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(caseIndex) || [];
            newMap.set(caseIndex, [...new Set([...existing, ...keys])]);
            return newMap;
          });
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setWaitingForRightKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(caseIndex);
          return newSet;
        });
      }
    },
    []
  );

  const handleLeftDeviceChange = (deviceUniqId: string) => {
    const device = devices.find((d) => d.uniqId === deviceUniqId);
    if (device) {
      setLeftOperand({
        type: "deviceField",
        deviceUniqId: device.uniqId,
        deviceName: device.name,
        deviceTopic: device.topic,
        key: undefined,
      });

      // Unsubscribe from previous topic if exists
      const prevTopic = subscribedTopics.current.get("left");
      if (prevTopic) {
        const handler = subscribedTopics.current.get("left-handler");
        if (handler) {
          unsubscribe(prevTopic, handler);
        }
      }

      // Subscribe to new device topic
      setLeftKeys([]);
      setIsWaitingForLeftKeys(true);
      subscribe(device.topic, handleLeftMqttMessage);
      subscribedTopics.current.set("left", device.topic);
      subscribedTopics.current.set("left-handler", handleLeftMqttMessage as any);
    }
  };

  const handleRightDeviceChange = (caseIndex: number, deviceUniqId: string) => {
    const device = devices.find((d) => d.uniqId === deviceUniqId);
    if (device) {
      updateCase(caseIndex, {
        rightOperand: {
          type: "deviceField",
          deviceUniqId: device.uniqId,
          deviceName: device.name,
          deviceTopic: device.topic,
          key: undefined,
        },
      });

      // Unsubscribe from previous topic if exists
      const prevTopicKey = `right-${caseIndex}`;
      const prevTopic = subscribedTopics.current.get(prevTopicKey);
      if (prevTopic) {
        const handler = subscribedTopics.current.get(`${prevTopicKey}-handler`);
        if (handler) {
          unsubscribe(prevTopic, handler);
        }
      }

      // Subscribe to new device topic
      setRightKeys((prev) => {
        const newMap = new Map(prev);
        newMap.set(caseIndex, []);
        return newMap;
      });
      setWaitingForRightKeys((prev) => new Set(prev).add(caseIndex));

      const handler = handleRightMqttMessage(caseIndex);
      subscribe(device.topic, handler);
      subscribedTopics.current.set(prevTopicKey, device.topic);
      subscribedTopics.current.set(`${prevTopicKey}-handler`, handler as any);
    }
  };

  const addCase = () => {
    setCases([
      ...cases,
      {
        id: `case_${Date.now()}`,
        label: `Case ${cases.length + 1}`,
        operator: "==",
        rightOperand: { type: "staticValue", value: "" },
      },
    ]);
  };

  const removeCase = (index: number) => {
    // Unsubscribe from topic if exists
    const topicKey = `right-${index}`;
    const topic = subscribedTopics.current.get(topicKey);
    if (topic) {
      const handler = subscribedTopics.current.get(`${topicKey}-handler`);
      if (handler) {
        unsubscribe(topic, handler);
      }
      subscribedTopics.current.delete(topicKey);
      subscribedTopics.current.delete(`${topicKey}-handler`);
    }

    setCases(cases.filter((_, i) => i !== index));
    setRightKeys((prev) => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  const updateCase = (index: number, updates: Partial<SwitchCase>) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], ...updates };
    setCases(updated);
  };

  const handleSubmit = () => {
    // Validate
    if (leftOperand.type === "deviceField") {
      if (!leftOperand.deviceUniqId) {
        alert("Please select a device for comparison");
        return;
      }
      if (!leftOperand.key) {
        alert("Please select a field for comparison");
        return;
      }
    }
    if (leftOperand.type === "staticValue" && !leftOperand.value) {
      alert("Please enter a value for comparison");
      return;
    }
    if (cases.length === 0) {
      alert("Please add at least one case");
      return;
    }

    for (let i = 0; i < cases.length; i++) {
      if (!cases[i].label.trim()) {
        alert(`Case ${i + 1}: Please enter a label`);
        return;
      }
      if (cases[i].rightOperand.type === "deviceField") {
        if (!cases[i].rightOperand.deviceUniqId) {
          alert(`Case ${i + 1}: Please select a device`);
          return;
        }
        if (!cases[i].rightOperand.key) {
          alert(`Case ${i + 1}: Please select a field`);
          return;
        }
      }
      if (
        cases[i].rightOperand.type === "staticValue" &&
        !cases[i].rightOperand.value
      ) {
        alert(`Case ${i + 1}: Please enter a value`);
        return;
      }
    }

    onSelect({
      leftOperand,
      cases,
      defaultCase: defaultCaseLabel.trim()
        ? { label: defaultCaseLabel.trim() }
        : undefined,
    });
  };

  const getOperandLabel = (operand: Operand): string => {
    if (operand.type === "deviceField") {
      if (operand.deviceName && operand.key) {
        return `${operand.deviceName} - ${operand.key}`;
      }
      if (operand.deviceName) return operand.deviceName;
      return "Not selected";
    }
    return operand.value || "Not set";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Switch/Case Node</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Compare values and route to different paths
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Left Operand */}
          <div className="space-y-2">
            <Label className="font-semibold">Compare</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={leftOperand.type === "deviceField" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setLeftOperand({ type: "deviceField" });
                  setLeftKeys([]);
                }}
                className="flex-1"
              >
                <Database className="w-4 h-4 mr-1" />
                Device
              </Button>
              <Button
                type="button"
                variant={leftOperand.type === "staticValue" ? "default" : "outline"}
                size="sm"
                onClick={() => setLeftOperand({ type: "staticValue", value: "" })}
                className="flex-1"
              >
                <Hash className="w-4 h-4 mr-1" />
                Value
              </Button>
            </div>

            {leftOperand.type === "deviceField" ? (
              <div className="space-y-2">
                <Select
                  value={leftOperand.deviceUniqId || ""}
                  onValueChange={handleLeftDeviceChange}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.uniqId} value={device.uniqId}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {leftOperand.deviceUniqId && (
                  <Select
                    value={leftOperand.key || ""}
                    onValueChange={(key) =>
                      setLeftOperand({ ...leftOperand, key })
                    }
                    disabled={leftKeys.length === 0}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue
                        placeholder={
                          isWaitingForLeftKeys
                            ? "Waiting for device data..."
                            : "Select field"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {leftKeys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {leftOperand.deviceUniqId &&
                  !isWaitingForLeftKeys &&
                  leftKeys.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No data received. Ensure the device is publishing.
                    </p>
                  )}
              </div>
            ) : (
              <Input
                value={leftOperand.value || ""}
                onChange={(e) =>
                  setLeftOperand({ ...leftOperand, value: e.target.value })
                }
                placeholder="Enter value (e.g., 30, 'active')"
                className="h-10"
              />
            )}
          </div>

          {/* Cases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Cases ({cases.length})</Label>
              <Button onClick={addCase} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {cases.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                No cases yet. Click "Add" to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {cases.map((caseItem, index) => (
                  <div
                    key={caseItem.id}
                    className="border rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-900"
                  >
                    {/* Case Header */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-12">
                        Case {index + 1}
                      </span>
                      <Input
                        value={caseItem.label}
                        onChange={(e) =>
                          updateCase(index, { label: e.target.value })
                        }
                        placeholder="Label"
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        onClick={() => removeCase(index)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Operator & Right Operand */}
                    <div className="flex items-start gap-2 pl-12">
                      <Select
                        value={caseItem.operator}
                        onValueChange={(value) =>
                          updateCase(index, { operator: value })
                        }
                      >
                        <SelectTrigger className="w-24 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="==">Equals (==)</SelectItem>
                          <SelectItem value="!=">Not Equals (!=)</SelectItem>
                          <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                          <SelectItem value="<">Less Than (&lt;)</SelectItem>
                          <SelectItem value=">=">Greater or Equal (&gt;=)</SelectItem>
                          <SelectItem value="<=">Less or Equal (&lt;=)</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="startsWith">Starts With</SelectItem>
                          <SelectItem value="endsWith">Ends With</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex-1 space-y-1">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant={
                              caseItem.rightOperand.type === "deviceField"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              updateCase(index, {
                                rightOperand: { type: "deviceField" },
                              })
                            }
                            className="h-8 px-2"
                          >
                            <Database className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant={
                              caseItem.rightOperand.type === "staticValue"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              updateCase(index, {
                                rightOperand: { type: "staticValue", value: "" },
                              })
                            }
                            className="h-8 px-2"
                          >
                            <Hash className="w-3 h-3" />
                          </Button>
                        </div>

                        {caseItem.rightOperand.type === "deviceField" ? (
                          <div className="space-y-1">
                            <Select
                              value={caseItem.rightOperand.deviceUniqId || ""}
                              onValueChange={(value) =>
                                handleRightDeviceChange(index, value)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select device" />
                              </SelectTrigger>
                              <SelectContent>
                                {devices.map((device) => (
                                  <SelectItem
                                    key={device.uniqId}
                                    value={device.uniqId}
                                  >
                                    {device.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {caseItem.rightOperand.deviceUniqId && (
                              <Select
                                value={caseItem.rightOperand.key || ""}
                                onValueChange={(key) =>
                                  updateCase(index, {
                                    rightOperand: {
                                      ...caseItem.rightOperand,
                                      key,
                                    },
                                  })
                                }
                                disabled={(rightKeys.get(index) || []).length === 0}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue
                                    placeholder={
                                      waitingForRightKeys.has(index)
                                        ? "Waiting..."
                                        : "Select field"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {(rightKeys.get(index) || []).map((key) => (
                                    <SelectItem key={key} value={key}>
                                      {key}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ) : (
                          <Input
                            value={caseItem.rightOperand.value || ""}
                            onChange={(e) =>
                              updateCase(index, {
                                rightOperand: {
                                  ...caseItem.rightOperand,
                                  value: e.target.value,
                                },
                              })
                            }
                            placeholder="Value"
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="text-xs text-blue-600 dark:text-blue-400 pl-12 font-mono">
                      {getOperandLabel(leftOperand)} {caseItem.operator}{" "}
                      {getOperandLabel(caseItem.rightOperand)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Default Case */}
          <div className="space-y-2">
            <Label className="text-sm">Default Case (Optional)</Label>
            <Input
              value={defaultCaseLabel}
              onChange={(e) => setDefaultCaseLabel(e.target.value)}
              placeholder="e.g., No Match"
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwitchModal;
