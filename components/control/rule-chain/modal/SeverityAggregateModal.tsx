"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ShieldAlert, PlusCircle, Trash2, Loader2 } from "lucide-react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface MqttDevice {
    uniqId: string;
    name: string;
    topic: string;
}

interface SeverityRule {
    id: string;
    deviceUniqId: string | null;
    deviceName?: string | null;
    topic?: string | null;
    selectedKey: string | null;
    operator: string;
    comparisonValue: string;
    severityLevel: "CRITICAL" | "MINOR";
}

const OPERATORS = [
    { value: "==", label: "== (Equal)" },
    { value: "!=", label: "!= (Not Equal)" },
    { value: ">", label: "> (Greater than)" },
    { value: ">=", label: ">= (Greater or equal)" },
    { value: "<", label: "< (Less than)" },
    { value: "<=", label: "<= (Less or equal)" },
];

const SEVERITY_LEVELS = [
    { value: "CRITICAL", label: "CRITICAL (🔴)", color: "text-red-500" },
    { value: "MINOR", label: "MINOR (🟡)", color: "text-yellow-500" },
];

const RuleForm = ({
    rule,
    updateRule,
    removeRule,
    allDevices,
    isLoadingDevices,
    ruleIndex,
}: {
    rule: SeverityRule;
    updateRule: (id: string, field: keyof SeverityRule, value: any) => void;
    removeRule: (id: string) => void;
    allDevices: MqttDevice[];
    isLoadingDevices: boolean;
    ruleIndex: number;
}) => {
    const { subscribe, unsubscribe } = useMqttServer();
    const [availableKeys, setAvailableKeys] = useState<string[]>([]);
    const [isWaitingForKey, setIsWaitingForKey] = useState(false);
    const subscribedTopicRef = useRef<string | null>(null);

    const handleMqttMessage = useCallback(
        (topic: string, payloadString: string) => {
            try {
                const payload = JSON.parse(payloadString);
                const innerPayload =
                    typeof payload.value === "string" ? JSON.parse(payload.value) : {};
                setAvailableKeys(Object.keys(innerPayload));
            } catch (e) {
                console.error("Failed to parse MQTT payload:", e);
            } finally {
                setIsWaitingForKey(false);
                unsubscribe(topic, handleMqttMessage);
                subscribedTopicRef.current = null;
            }
        },
        [unsubscribe]
    );

    useEffect(() => {
        const topic = allDevices.find(
            (d) => d.uniqId === rule.deviceUniqId
        )?.topic;
        if (subscribedTopicRef.current && subscribedTopicRef.current !== topic) {
            unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        }
        if (topic && topic !== subscribedTopicRef.current) {
            setAvailableKeys([]);
            setIsWaitingForKey(true);
            subscribe(topic, handleMqttMessage);
            subscribedTopicRef.current = topic;
        }
    }, [rule.deviceUniqId, allDevices, subscribe, unsubscribe, handleMqttMessage]);

    const handleDeviceChange = (value: string) => {
        const selectedDevice = allDevices.find((d) => d.uniqId === value);
        updateRule(rule.id, "deviceUniqId", value);
        updateRule(rule.id, "deviceName", selectedDevice?.name || null);
        updateRule(rule.id, "topic", selectedDevice?.topic || null);
        updateRule(rule.id, "selectedKey", null);
        setAvailableKeys([]);
    };

    return (
        <div className="flex flex-col gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            {ruleIndex + 1}
                        </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Rule Definition
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                    onClick={() => removeRule(rule.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {/* Row 1: Device and Key */}
                <div className="grid gap-2 flex-1">
                    <Label className="text-xs text-slate-500">Device</Label>
                    {isLoadingDevices ? (
                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-slate-500">Loading...</span>
                        </div>
                    ) : (
                        <Select onValueChange={handleDeviceChange} value={rule.deviceUniqId || ""}>
                            <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                                <SelectValue placeholder="Select device" />
                            </SelectTrigger>
                            <SelectContent>
                                {allDevices.map((d) => (
                                    <SelectItem key={d.uniqId} value={d.uniqId}>
                                        {d.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="grid gap-2 flex-1">
                    <Label className="text-xs text-slate-500">Data Key</Label>
                    <Select
                        onValueChange={(value) => updateRule(rule.id, "selectedKey", value)}
                        value={rule.selectedKey || ""}
                        disabled={!rule.deviceUniqId || availableKeys.length === 0}
                    >
                        <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 disabled:opacity-50">
                            <SelectValue placeholder={isWaitingForKey ? "Waiting..." : "Select key"} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableKeys.map((k) => (
                                <SelectItem key={k} value={k}>
                                    {k}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
                {/* Row 2: Operator, Value, Severity */}
                <div className="grid gap-2">
                    <Label className="text-xs text-slate-500">Operator</Label>
                    <Select onValueChange={(value) => updateRule(rule.id, "operator", value)} value={rule.operator}>
                        <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label className="text-xs text-slate-500">Value</Label>
                    <Input
                        value={rule.comparisonValue}
                        onChange={(e) => updateRule(rule.id, "comparisonValue", e.target.value)}
                        placeholder="e.g. 1 or >"
                        className="dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                <div className="grid gap-2">
                    <Label className="text-xs text-slate-500">Results in Severity</Label>
                    <Select onValueChange={(value) => updateRule(rule.id, "severityLevel", value as 'CRITICAL' | 'MINOR')} value={rule.severityLevel}>
                        <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SEVERITY_LEVELS.map((sev) => (
                                <SelectItem key={sev.value} value={sev.value}>
                                    <span className={sev.color}>{sev.label}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};

interface SeverityAggregateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (nodeName: string, config: { rules: SeverityRule[] }) => void;
    initialConfig?: { [key: string]: any };
}

export default function SeverityAggregateModal({
    isOpen,
    onClose,
    onSelect,
    initialConfig,
}: SeverityAggregateModalProps) {
    const [devices, setDevices] = useState<MqttDevice[]>([]);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [rules, setRules] = useState<SeverityRule[]>([]);
    const [nodeTitle, setNodeTitle] = useState("Severity Aggregate");

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const fetchDevices = async () => {
                setIsLoadingDevices(true);
                try {
                    const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
                    if (!response.ok) throw new Error("Failed to fetch devices");
                    const data = await response.json();
                    setDevices(data);
                } catch (error: any) {
                    showToast.error(error.message);
                    onClose();
                } finally {
                    setIsLoadingDevices(false);
                }
            };
            fetchDevices();

            if (initialConfig?.rules && Array.isArray(initialConfig.rules)) {
                setRules(initialConfig.rules);
                if (initialConfig.nodeTitle) setNodeTitle(initialConfig.nodeTitle);
            } else {
                setRules([
                    {
                        id: `rule-${Date.now()}`,
                        deviceUniqId: null,
                        selectedKey: null,
                        operator: "==",
                        comparisonValue: "1",
                        severityLevel: "CRITICAL",
                    },
                ]);
                setNodeTitle("Severity Aggregate");
            }
        } else {
            setRules([]);
        }
    }, [isOpen, onClose, initialConfig]);

    const addRule = () => {
        setRules((prev) => [
            ...prev,
            {
                id: `rule-${Date.now()}`,
                deviceUniqId: null,
                selectedKey: null,
                operator: "==",
                comparisonValue: "1",
                severityLevel: "CRITICAL",
            },
        ]);
    };

    const removeRule = (id: string) => {
        if (rules.length > 0) {
            setRules((prev) => prev.filter((r) => r.id !== id));
        }
    };

    const updateRule = (id: string, field: keyof SeverityRule, value: any) => {
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const handleConfirm = () => {
        if (rules.length === 0) {
            showToast.warning("Please add at least one rule");
            return;
        }

        for (const rule of rules) {
            if (!rule.deviceUniqId || !rule.selectedKey || !rule.operator || !rule.comparisonValue) {
                showToast.warning("Please complete all fields for every rule.");
                return;
            }
        }

        onSelect(nodeTitle, { rules });
        onClose();
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ShieldAlert size={20} className="text-indigo-600" />
                        Severity Aggregator
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-600 dark:text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="grid gap-2">
                        <Label htmlFor="nodeTitle">Node Label</Label>
                        <Input
                            id="nodeTitle"
                            value={nodeTitle}
                            onChange={(e) => setNodeTitle(e.target.value)}
                            className="dark:bg-slate-800"
                            placeholder="e.g. Server Room Main Severity"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Severity Evaluation Rules
                            </Label>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {rules.length} rule{rules.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {rules.map((rule, index) => (
                                <RuleForm
                                    key={rule.id}
                                    rule={rule}
                                    updateRule={updateRule}
                                    removeRule={removeRule}
                                    allDevices={devices}
                                    isLoadingDevices={isLoadingDevices}
                                    ruleIndex={index}
                                />
                            ))}
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        onClick={addRule}
                        className="w-full flex justify-center mt-2 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Evaluation Rule
                    </Button>

                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                        Rules are evaluated. If multiple rules match, <strong>CRITICAL</strong> takes priority over <strong>MINOR</strong>.<br />
                        If no rules match, the output severity is <strong>NORMAL</strong>.
                    </p>
                </div>

                <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={rules.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Save Aggregator
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
