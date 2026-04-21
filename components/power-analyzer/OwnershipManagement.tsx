"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { User, Shield, Share2, UserMinus, UserPlus, RefreshCw } from "lucide-react";
import { showToast } from "@/lib/toast-utils";
import { Badge } from "@/components/ui/badge";

interface OwnershipManagementProps {
    isOpen: boolean;
    onClose: () => void;
    configId: string;
    configName: string;
    configType: "bill" | "pue" | "power-analyzer";
    onUpdated?: () => void;
}

export function OwnershipManagement({
    isOpen,
    onClose,
    configId,
    configName,
    configType,
    onUpdated,
}: OwnershipManagementProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [ownershipData, setOwnershipData] = useState<any>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const endpoint = configType === "bill"
        ? `/api/bill-configs/${configId}/ownership`
        : configType === "pue"
            ? `/api/pue-configs/${configId}/ownership`
            : `/api/power-analyzer/${configId}/ownership`;

    const fetchOwnershipData = async () => {
        try {
            setLoading(true);
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                setOwnershipData(data);
            }
        } catch (error) {
            console.error("Error fetching ownership:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const result = await res.json();
                if (result.success && Array.isArray(result.data)) {
                    setUsers(result.data);
                } else if (Array.isArray(result)) {
                    setUsers(result);
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchOwnershipData();
            fetchAllUsers();
        }
    }, [isOpen]);

    const handleAction = async (action: "transfer" | "share" | "unshare", targetId: string) => {
        try {
            setLoading(true);
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, targetUserId: targetId }),
            });

            const data = await res.json();
            if (res.ok) {
                showToast.success("Success", data.message);
                fetchOwnershipData();
                if (onUpdated) onUpdated();
                if (action === "transfer") onClose(); // Close if transferred ownership
            } else {
                showToast.error("Error", data.message);
            }
        } catch (error) {
            showToast.error("Error", "Failed to update ownership");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-500" />
                        Manage Ownership
                    </DialogTitle>
                    <DialogDescription>
                        Manage who can view and edit <strong>{configName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Current Owner */}
                    <div className="bg-muted/50 p-4 rounded-lg border">
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Primary Owner</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{ownershipData?.user?.email || "Loading..."}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Owner
                            </Badge>
                        </div>
                    </div>

                    {/* Shared Users */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Shared With</p>
                            <Badge variant="secondary">{ownershipData?.sharedUsers?.length || 0} users</Badge>
                        </div>

                        <div className="max-h-[150px] overflow-y-auto border rounded-md">
                            <Table>
                                <TableBody>
                                    {ownershipData?.sharedUsers?.length === 0 ? (
                                        <TableRow>
                                            <TableCell className="text-center text-muted-foreground py-4 text-xs italic">
                                                Not shared with anyone yet
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ownershipData?.sharedUsers?.map((u: any) => (
                                            <TableRow key={u.id}>
                                                <TableCell className="py-2">
                                                    <p className="text-sm">{u.email}</p>
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => handleAction("unshare", u.id)}
                                                        disabled={loading}
                                                    >
                                                        <UserMinus className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Add Sharing / Transfer */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Add Access or Transfer</p>
                        <div className="flex gap-2">
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.isArray(users) && users
                                        .filter((u) => u.id !== ownershipData?.userId && !(ownershipData?.sharedUsers || []).some((su: any) => su.id === u.id))
                                        .map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.email}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleAction("share", selectedUserId)}
                                disabled={!selectedUserId || loading}
                                title="Add to multi-ownership"
                            >
                                <UserPlus className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="outline"
                                size="icon"
                                className="text-orange-500 border-orange-200 hover:bg-orange-50"
                                onClick={() => handleAction("transfer", selectedUserId)}
                                disabled={!selectedUserId || loading}
                                title="Transfer full ownership"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
