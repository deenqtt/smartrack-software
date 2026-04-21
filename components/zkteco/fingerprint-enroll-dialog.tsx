"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fingerprint, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  uid: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  ipAddress: string;
}

interface FingerprintEnrollDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrollStart: (
    sourceDevice: string,
    fingerId: string,
    targetDevices: string[],
  ) => void;
}

const fingers = [
  { id: 0, name: "Jempol Kanan" },
  { id: 1, name: "Telunjuk Kanan" },
  { id: 2, name: "Tengah Kanan" },
  { id: 3, name: "Manis Kanan" },
  { id: 4, name: "Kelingking Kanan" },
  { id: 5, name: "Jempol Kiri" },
  { id: 6, name: "Telunjuk Kiri" },
  { id: 7, name: "Tengah Kiri" },
  { id: 8, name: "Manis Kiri" },
  { id: 9, name: "Kelingking Kiri" },
];

export function FingerprintEnrollDialog({
  user,
  open,
  onOpenChange,
  onEnrollStart,
}: FingerprintEnrollDialogProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sourceDevice, setSourceDevice] = useState<string>("");
  const [fingerId, setFingerId] = useState<string>("");
  const [targetDevices, setTargetDevices] = useState<string[]>([]);
  const [registeredFingers, setRegisteredFingers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const response = await fetch("/api/zkteco/devices");
        if (response.ok) {
          const data = await response.json();
          setDevices(data.devices || []);
        } else {
          setDevices([]);
        }
      } catch (error) {
        console.error("Error loading devices:", error);
        setDevices([]);
      }
    };

    const loadRegisteredFingers = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/zkteco/users/${user.uid}/fingerprints`,
        );
        if (response.ok) {
          const data = await response.json();
          setRegisteredFingers(data.registeredFingers || []);
        } else {
          setRegisteredFingers([]);
        }
      } catch (error) {
        console.error("Error loading registered fingers:", error);
        setRegisteredFingers([]);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadDevices();
      loadRegisteredFingers();
    }
  }, [open, user]);

  const handleEnroll = () => {
    if (!sourceDevice || !fingerId) {
      toast.error("Please select source device and finger.");
      return;
    }
    // For now, target devices will be all devices, as multi-select is not implemented yet.
    const allDeviceIds = devices.map((d) => d.id);
    onEnrollStart(sourceDevice, fingerId, allDeviceIds);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Fingerprint Enrollment
          </DialogTitle>
          <DialogDescription>
            Enroll a new fingerprint for user <strong>{user.name}</strong> (UID:{" "}
            {user.uid}).
          </DialogDescription>
        </DialogHeader>

        {/* Registered Fingers Info */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Registered Fingers:
          </h4>
          {loading ? (
            <div className="text-sm text-gray-500">
              Loading registered fingers...
            </div>
          ) : registeredFingers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {registeredFingers.map((fingerId) => {
                const finger = fingers.find((f) => f.id === fingerId);
                return (
                  <span
                    key={fingerId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {finger?.name || `Finger ${fingerId}`}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No fingerprints registered yet.
            </div>
          )}
        </div>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="source-device"
              className="text-right text-sm font-medium"
            >
              Source Device
            </label>
            <Select onValueChange={setSourceDevice}>
              <SelectTrigger id="source-device" className="col-span-3">
                <SelectValue placeholder="Select a device to enroll from" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name} ({device.ipAddress})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="finger-id"
              className="text-right text-sm font-medium"
            >
              Finger
            </label>
            <Select onValueChange={setFingerId}>
              <SelectTrigger id="finger-id" className="col-span-3">
                <SelectValue placeholder="Select a finger" />
              </SelectTrigger>
              <SelectContent>
                {fingers.map((finger) => (
                  <SelectItem key={finger.id} value={String(finger.id)}>
                    {finger.name}
                    {registeredFingers.includes(finger.id) && (
                      <span className="ml-2 text-green-600 font-medium">
                        (Registered)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Placeholder for target devices selection */}
          <div className="col-span-4">
            <label htmlFor="target-devices" className="text-sm font-medium">
              Sync to Devices
            </label>
            <div className="p-3 mt-2 border rounded-md bg-slate-50 text-slate-500 text-sm">
              For now, the fingerprint will be synced to all available devices.
              Multi-select will be implemented later.
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleEnroll}>
            <Fingerprint className="h-4 w-4 mr-2" />
            Start Enrollment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
