"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  UserPlus,
  ScanFace,
  Fingerprint,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  uid: string;
  name: string;
  privilege: number;
  faceStatus: boolean;
  fingerStatus: boolean;
  cardNumber?: string;
  password?: string;
  role?: string;
}

const FINGERPRINT_OPTIONS = [
  { id: 0, name: "Right Thumb" },
  { id: 1, name: "Right Index Finger" },
  { id: 2, name: "Right Middle Finger" },
  { id: 3, name: "Right Ring Finger" },
  { id: 4, name: "Right Little Finger" },
  { id: 5, name: "Left Thumb" },
  { id: 6, name: "Left Index Finger" },
  { id: 7, name: "Left Middle Finger" },
  { id: 8, name: "Left Ring Finger" },
  { id: 9, name: "Left Little Finger" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [enrollUserUid, setEnrollUserUid] = useState<string | null>(null);
  const [enrollUserName, setEnrollUserName] = useState<string>("");
  const [enrollmentInProgress, setEnrollmentInProgress] = useState(false);
  const [enrollmentFingerprintInProgress, setEnrollmentFingerprintInProgress] =
    useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [syncLoading, setSyncLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // State for Fingerprint Enrollment
  const [isFingerprintDialogOpen, setIsFingerprintDialogOpen] = useState(false);
  const [selectedFingerId, setSelectedFingerId] = useState<number | null>(null);
  const [fingerprintEnrollmentLoading, setFingerprintEnrollmentLoading] =
    useState(false);
  const [registeredFingers, setRegisteredFingers] = useState<number[]>([]);
  const [loadingRegisteredFingers, setLoadingRegisteredFingers] =
    useState(false);

  // Form state - follows syncuser.py pattern
  const [formData, setFormData] = useState({
    uid: "",
    name: "",
    password: "",
    card: "",
  });

  // Load users from middleware, merged with Prisma fingerprint status
  const loadUsers = async () => {
    setLoading(true);
    try {
      const [middlewareRes, fingerRes] = await Promise.all([
        fetch("/api/zkteco/users"),
        fetch("/api/zkteco/fingerprint-status"),
      ]);

      const middlewareData = middlewareRes.ok ? await middlewareRes.json() : { users: [] };
      const fingerData = fingerRes.ok ? await fingerRes.json() : { uidsWithFingers: [] };

      const uidsWithFingers = new Set<string>(fingerData.uidsWithFingers || []);

      // Merge: fingerStatus from Prisma overrides middleware (Prisma is source of truth for fingerprints)
      const mergedUsers = (middlewareData.users || []).map((u: User) => ({
        ...u,
        fingerStatus: uidsWithFingers.has(u.uid) || u.fingerStatus,
      }));

      setUsers(mergedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNextUid = async () => {
    try {
      const response = await fetch("/api/zkteco/users/next-uid");
      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, uid: data.nextUid }));
      }
    } catch (error) {
      console.error("Error loading next UID:", error);
    }
  };

  // Create new user - follows syncuser.py pattern
  const createUser = async () => {
    try {
      if (formData.password && formData.password.length < 6) {
        toast.error("Password must be at least 6 digits");
        return;
      }

      const response = await fetch("/api/zkteco/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: formData.uid,
          name: formData.name,
          password: formData.password,
          card: formData.card,
        }),
      });

      const result = await response.json();
      if (response.ok && result.status === "ok") {
        setShowAddForm(false);
        setEditingUser(null);
        resetForm();
        toast.success(result.message);
        loadUsers();
      } else {
        toast.error(result.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Error creating user");
    }
  };

  // Update existing user - follows syncuser.py pattern
  const updateUser = async () => {
    if (!editingUser) return;

    try {
      if (formData.password && formData.password.length < 6) {
        toast.error("Password must be at least 6 digits");
        return;
      }

      const response = await fetch("/api/zkteco/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: formData.uid,
          name: formData.name,
          password: formData.password,
          card: formData.card,
        }),
      });

      const result = await response.json();
      if (response.ok && result.status === "ok") {
        setShowAddForm(false);
        setEditingUser(null);
        resetForm();
        toast.success(result.message);
        loadUsers();
      } else {
        toast.error(result.message || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Error updating user");
    }
  };

  // Delete user - follows syncuser.py pattern
  const deleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const response = await fetch(
        `/api/zkteco/users/${deleteUserId}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();
      if (response.ok && result.status === "ok") {
        await loadUsers(); // Refresh the list from the middleware
        setDeleteUserId(null);
        toast.success(result.message);
      } else {
        toast.error(result.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user");
    }
  };

  // Handle delete button click
  const handleDeleteClick = (uid: string) => {
    setDeleteUserId(uid);
  };

  // Handle enroll face button click
  const handleEnrollClick = (uid: string, name: string) => {
    setEnrollUserUid(uid);
    setEnrollUserName(name);
  };

  // Load registered fingers for a user
  const loadRegisteredFingers = async (userUid: string) => {
    setLoadingRegisteredFingers(true);
    try {
      const response = await fetch(`/api/zkteco/users/${userUid}/fingerprints`);
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
      setLoadingRegisteredFingers(false);
    }
  };

  // Handle enroll fingerprint button click
  const handleEnrollFingerprintClick = (uid: string, name: string) => {
    setEnrollUserUid(uid);
    setEnrollUserName(name);
    setIsFingerprintDialogOpen(true);
    // Load registered fingers for the user
    loadRegisteredFingers(uid);
  };

  // Enroll face with overlay - uses middleware for sync
  const enrollFace = async () => {
    if (!enrollUserUid) return;

    // Immediately show overlay and close dialog for best UX
    const currentUid = enrollUserUid;
    setEnrollmentInProgress(true);
    setTimeRemaining(30);
    setEnrollUserUid(null);

    try {
      const response = await fetch(
        `/api/zkteco/users/${currentUid}/enroll-face`,
        {
          method: "POST",
        },
      );

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message || "Enrollment command sent!");
        // Simulation of completion (wait for countdown)
        setTimeout(() => {
          setEnrollmentInProgress(false);
          loadUsers();
        }, 30000);
      } else {
        toast.error(result.message || "Failed to start face enrollment");
        setEnrollmentInProgress(false);
      }
    } catch (error) {
      console.error("Error starting face enrollment:", error);
      toast.error("Error starting face enrollment");
      setEnrollmentInProgress(false);
    }
  };

  // Enroll fingerprint function
  const enrollFingerprint = async () => {
    if (!enrollUserUid || selectedFingerId === null) {
      toast.error("Please select a finger to enroll.");
      return;
    }

    // Immediately show overlay and close dialog
    const currentUid = enrollUserUid;
    const currentFingerId = selectedFingerId;

    setIsFingerprintDialogOpen(false);
    setEnrollmentFingerprintInProgress(true);
    setTimeRemaining(20);

    setFingerprintEnrollmentLoading(true);

    try {
      const response = await fetch(
        `/api/zkteco/users/${currentUid}/enroll-fingerprint`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerId: currentFingerId }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Enrollment failed");
      }

      const data = await response.json();
      toast.success(data.message || "Fingerprint enrolled successfully!");

      // Close overlay immediately since the physical scan is finished
      setEnrollmentFingerprintInProgress(false);

      // Update local state directly — fingerprint is saved to Prisma DB,
      // but loadUsers() fetches from middleware (different DB) which won't reflect it.
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === currentUid ? { ...user, fingerStatus: true } : user,
        ),
      );
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
      setEnrollmentFingerprintInProgress(false);
    } finally {
      setFingerprintEnrollmentLoading(false);
      setEnrollUserUid(null);
    }
  };

  // Handle Sync All Users
  const handleSyncAllUsers = async () => {
    setSyncLoading(true);
    try {
      const response = await fetch("/api/zkteco/users/sync", {
        method: "POST",
      });
      const result = await response.json();
      if (response.ok && result.status === "ok") {
        toast.success(result.message || "Full user sync initiated!");
      } else {
        toast.error(result.message || "Failed to initiate full user sync.");
      }
    } catch (error) {
      console.error("Error initiating full user sync:", error);
      toast.error("Error initiating full user sync.");
    } finally {
      setSyncLoading(false);
    }
  };

  // Import users from ACS device into local database
  const handleImportFromDevice = async () => {
    setImportLoading(true);
    try {
      const response = await fetch(
        "/api/zkteco/users/import-from-device",
        { method: "POST" },
      );
      const result = await response.json();
      if (response.ok && result.status === "ok") {
        toast.success(result.message || "Users imported from device!");
        loadUsers();
      } else {
        toast.error(result.error || result.message || "Failed to import users from device.");
      }
    } catch (error) {
      console.error("Error importing users from device:", error);
      toast.error("Cannot connect to middleware. Is it running?");
    } finally {
      setImportLoading(false);
    }
  };

  // Cancel enrollment
  const cancelEnrollment = () => {
    setEnrollmentInProgress(false);
    setEnrollmentFingerprintInProgress(false);
    setTimeRemaining(30);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      uid: "",
      name: "",
      password: "",
      card: "",
    });
  };

  // Start editing
  const startEditing = (user: User) => {
    setEditingUser(user);
    setFormData({
      uid: user.uid,
      name: user.name,
      password: user.password || "",
      card: user.cardNumber || "",
    });
  };

  // Filter users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.uid.includes(searchTerm),
  );

  // Calculate summary statistics
  const totalUsers = users.length;
  const usersWithFace = users.filter((user) => user.faceStatus).length;
  const usersWithFinger = users.filter((user) => user.fingerStatus).length;
  const usersWithCards = users.filter(
    (user) => user.cardNumber && user.cardNumber.trim() !== "",
  ).length;

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      (enrollmentInProgress || enrollmentFingerprintInProgress) &&
      timeRemaining > 0
    ) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [enrollmentInProgress, enrollmentFingerprintInProgress, timeRemaining]);

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <main className="space-y-6 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-blue-500/10 rounded-lg">
            <UserPlus className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Total Users
            </p>
            <p className="text-xl font-bold leading-none">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-green-500/10 rounded-lg">
            <ScanFace className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Face Profile
            </p>
            <p className="text-xl font-bold leading-none">{usersWithFace}</p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-orange-500/10 rounded-lg">
            <Fingerprint className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Fingerprint
            </p>
            <p className="text-xl font-bold leading-none">{usersWithFinger}</p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-purple-500/10 rounded-lg">
            <Plus className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              RFID Cards
            </p>
            <p className="text-xl font-bold leading-none">{usersWithCards}</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-card border rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search Name or UID..."
              className="w-full bg-background border h-10 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Button
            onClick={loadUsers}
            disabled={loading}
            variant="outline"
            className="h-10 px-4 text-xs font-bold gap-2"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            REFRESH
          </Button>
          <Button
            onClick={handleSyncAllUsers}
            disabled={syncLoading}
            variant="outline"
            className="h-10 px-4 text-xs font-bold gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncLoading ? "animate-spin" : ""}`}
            />
            SYNC ALL
          </Button>
          <Button
            onClick={handleImportFromDevice}
            disabled={importLoading}
            variant="outline"
            className="h-10 px-4 text-xs font-bold gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${importLoading ? "animate-spin" : ""}`}
            />
            IMPORT FROM DEVICE
          </Button>

          <div className="w-[1px] h-6 bg-border mx-1"></div>
          <Dialog
            open={showAddForm || !!editingUser}
            onOpenChange={(open) => {
              if (!open) {
                setShowAddForm(false);
                setEditingUser(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                  loadNextUid();
                }}
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs gap-2 shadow-sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                ADD USER
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit User" : "Add New User"}
                </DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? "Update user information."
                    : "Create a new user for the access control system. This will sync to all connected devices."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label
                    htmlFor="uid"
                    className="text-right text-sm font-medium"
                  >
                    UID
                  </label>
                  <Input
                    id="uid"
                    type="number"
                    value={formData.uid}
                    readOnly
                    disabled
                    placeholder="Loading UID..."
                    className="col-span-3 bg-muted cursor-not-allowed opacity-70"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label
                    htmlFor="name"
                    className="text-right text-sm font-medium"
                  >
                    Name
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="User name"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label
                    htmlFor="password"
                    className="text-right text-sm font-medium"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    inputMode="numeric"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password: e.target.value.replace(/[^0-9]/g, ""),
                      })
                    }
                    placeholder="Enter password (min 6 digits)"
                    className="col-span-3"
                    minLength={6}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label
                    htmlFor="card"
                    className="text-right text-sm font-medium"
                  >
                    Card
                  </label>
                  <Input
                    id="card"
                    type="password"
                    value={formData.card}
                    onChange={(e) =>
                      setFormData({ ...formData, card: e.target.value })
                    }
                    placeholder="RFID Card number (optional)"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={editingUser ? updateUser : createUser}>
                  {editingUser ? "Update User" : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={!!deleteUserId}
            onOpenChange={(open) => {
              if (!open) setDeleteUserId(null);
            }}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete user with UID{" "}
                  <strong>{deleteUserId}</strong>? This will remove the user
                  from <strong>all connected devices</strong>. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteUserId(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={deleteUser}>
                  Delete User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Face Enrollment Dialog */}
          <Dialog
            open={!!enrollUserUid && !isFingerprintDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setEnrollUserUid(null);
                setEnrollUserName("");
              }
            }}
          >
            <DialogContent className="sm:max-w-[440px] border-2 border-primary/20 rounded-[2rem] p-0 overflow-hidden bg-card">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

              <div className="p-8 space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-[0.1em]">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <ScanFace className="h-6 w-6 text-primary" />
                    </div>
                    Face Enrollment
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-2">
                    Preparing biometric sync for{" "}
                    <span className="text-primary">{enrollUserName}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Pre-Sync Checklist
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Position user in front of the device camera",
                      "Ensure environment has adequate lighting",
                      "User must remain still during capture",
                      "The device will take multiple samples",
                    ].map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-xs font-medium text-muted-foreground leading-relaxed"
                      >
                        <span className="text-primary/40 font-black">
                          0{i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEnrollUserUid(null);
                      setEnrollUserName("");
                    }}
                    className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-muted-foreground/20 hover:bg-muted/50 text-foreground"
                  >
                    CANCEL
                  </Button>
                  <Button
                    onClick={enrollFace}
                    className="flex-[1.5] h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    <ScanFace className="h-4 w-4 mr-2" />
                    START ENROLLMENT
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Fingerprint Enrollment Dialog */}
          <Dialog
            open={isFingerprintDialogOpen}
            onOpenChange={(open) => {
              setIsFingerprintDialogOpen(open);
              if (!open) {
                // Clear enrollUserUid when closing so face dialog doesn't open
                setEnrollUserUid(null);
                setEnrollUserName("");
              }
            }}
          >
            <DialogContent className="sm:max-w-[440px] border-2 border-orange-500/20 rounded-[2rem] p-0 overflow-hidden bg-card">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse" />

              <div className="p-8 space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-[0.1em]">
                    <div className="p-2 bg-orange-500/10 rounded-xl">
                      <Fingerprint className="h-6 w-6 text-orange-500" />
                    </div>
                    Finger Enrollment
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-2">
                    Configuring Bio-metric data for{" "}
                    <span className="text-orange-500">{enrollUserName}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                      Stored Templates
                    </h4>
                    {loadingRegisteredFingers ? (
                      <div className="h-10 animate-pulse bg-muted rounded-xl w-full" />
                    ) : registeredFingers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {registeredFingers.map((fingerId) => {
                          const finger = FINGERPRINT_OPTIONS.find(
                            (f) => f.id === fingerId,
                          );
                          return (
                            <div
                              key={fingerId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-500/10"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {finger?.name || `ID ${fingerId}`}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-muted-foreground/40 italic uppercase tracking-widest bg-muted/30 p-3 rounded-xl border border-dashed text-center">
                        NO DATA REGISTERED
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Select Scanner Profile
                    </h4>
                    <Select
                      onValueChange={(value) =>
                        setSelectedFingerId(Number(value))
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-background border-muted-foreground/20 focus:ring-orange-500/20 text-xs font-bold">
                        <SelectValue placeholder="Identify finger to enroll..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-orange-500/20">
                        {FINGERPRINT_OPTIONS.map((finger) => (
                          <SelectItem
                            key={finger.id}
                            value={String(finger.id)}
                            className="text-xs font-bold rounded-lg focus:bg-orange-500/10 focus:text-orange-600"
                          >
                            {finger.name}
                            {registeredFingers.includes(finger.id) && (
                              <span className="ml-2 text-green-600">
                                (SYNCED)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 flex items-start gap-3">
                    <div className="p-1.5 bg-orange-500/20 rounded-lg shrink-0">
                      <RefreshCw className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <p className="text-[10px] font-medium text-orange-900/60 dark:text-orange-200/60 leading-relaxed uppercase tracking-widest">
                      ensure device scanner is ready. User will be prompted 3
                      times for validation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsFingerprintDialogOpen(false);
                      setEnrollUserUid(null);
                      setEnrollUserName("");
                    }}
                    className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-muted-foreground/20 hover:bg-muted/50 text-foreground"
                  >
                    CANCEL
                  </Button>
                  <Button
                    onClick={enrollFingerprint}
                    disabled={
                      fingerprintEnrollmentLoading || selectedFingerId === null
                    }
                    className="flex-[1.5] h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-orange-500 text-white hover:opacity-90 shadow-lg shadow-orange-500/20"
                  >
                    {fingerprintEnrollmentLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Fingerprint className="h-4 w-4 mr-2" />
                    )}
                    START ENROLLMENT
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b">
              <TableHead className="w-16 text-[10px] font-bold uppercase tracking-wider border-r">
                #
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider border-r">
                UID
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider border-r">
                Name
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider border-r">
                Face
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider border-r">
                Finger
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider border-r">
                PIN
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider border-r">
                Card
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-6 w-6 text-primary/20 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Hydrating Member Data...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user, index) => (
                <TableRow
                  key={user.uid}
                  className="hover:bg-muted/30 transition-colors group border-b"
                >
                  <TableCell className="font-mono text-[10px] text-muted-foreground/60 border-r">
                    #{String(index + 1).padStart(3, "0")}
                  </TableCell>
                  <TableCell className="font-medium border-r">
                    {user.uid}
                  </TableCell>
                  <TableCell className="border-r">{user.name}</TableCell>
                  <TableCell className="border-r">
                    {user.faceStatus ? (
                      <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-green-500/10">
                        REGISTERED
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-gray-500/10 opacity-40">
                        EMPTY
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="border-r">
                    {user.fingerStatus ? (
                      <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-green-500/10">
                        REGISTERED
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-gray-500/10 opacity-40">
                        EMPTY
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="border-r">
                    {user.password ? (
                      <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-500/10">
                        SET
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-gray-500/10 opacity-40">
                        NONE
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="border-r">
                    {user.cardNumber && String(user.cardNumber).trim() !== "0" ? (
                      <div className="inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-purple-500/10">
                        SET
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-gray-500/10 text-gray-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-gray-500/10 opacity-40">
                        NONE
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(user)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Edit user"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEnrollClick(user.uid, user.name)}
                        className="h-8 w-8 text-green-500 hover:bg-green-500/10 hover:text-green-600"
                        title="Enroll face"
                      >
                        <ScanFace className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleEnrollFingerprintClick(user.uid, user.name)
                        }
                        className="h-8 w-8 text-orange-500 hover:bg-orange-500/10 hover:text-orange-600"
                        title="Enroll fingerprint"
                      >
                        <Fingerprint className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteClick(user.uid)}
                        className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="mt-6 text-sm text-muted-foreground">
        Total users: {users.length} | Showing: {filteredUsers.length}
      </div>

      {/* Face Recognition Overlay */}
      {enrollmentInProgress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card border-2 border-primary/20 rounded-[2rem] p-10 shadow-2xl max-w-sm w-full mx-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

            <div className="relative mb-8">
              {/* Face Outline Animation */}
              <div className="relative w-40 h-40 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-primary/10 animate-ping opacity-20" />
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                >
                  <ellipse
                    cx="60"
                    cy="60"
                    rx="40"
                    ry="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-primary animate-pulse"
                  />
                  <path
                    d="M45,50 Q45,48 47,48 T50,50 M70,50 Q70,48 72,48 T75,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                  />
                  <path
                    d="M55,65 Q60,70 65,65"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                  />
                  <path
                    d="M45,85 Q60,95 75,85"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                    opacity="0.5"
                  />

                  {/* Scanning Line */}
                  <line
                    x1="20"
                    y1="30"
                    x2="100"
                    y2="30"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-green-500"
                  >
                    <animate
                      attributeName="y1"
                      values="30;90;30"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="y2"
                      values="30;90;30"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </line>
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-primary mb-2">
              Face Scan
            </h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-8">
              Align your face to the frame
            </p>

            {/* Countdown Timer */}
            <div className="mb-10 space-y-3">
              <div className="text-5xl font-black font-mono tracking-tighter text-primary">
                {String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:
                {String(timeRemaining % 60).padStart(2, "0")}
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  style={{ width: `${(timeRemaining / 30) * 100}%` }}
                />
              </div>
            </div>

            <Button
              onClick={cancelEnrollment}
              variant="ghost"
              className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-destructive/10 hover:text-destructive transition-all border border-transparent hover:border-destructive/20"
            >
              Abort Enrollment
            </Button>
          </div>
        </div>
      )}

      {/* Fingerprint Recognition Overlay */}
      {enrollmentFingerprintInProgress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in zoom-in duration-300">
          <div className="bg-card border-2 border-orange-500/20 rounded-[2rem] p-10 shadow-2xl max-w-sm w-full mx-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse" />

            <div className="relative mb-8">
              {/* Fingerprint Outline Animation */}
              <div className="relative w-40 h-40 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-orange-500/10 animate-ping opacity-20" />
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                >
                  <path
                    d="M60,20 C40,20 25,35 25,55 C25,65 30,75 35,80 M60,30 C47,30 35,42 35,55 C35,62 38,68 42,72 M60,40 C52,40 45,47 45,55 C45,58 46,62 48,65 M60,50 L60,55"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-orange-500 animate-pulse"
                  />
                  <path
                    d="M60,20 C80,20 95,35 95,55 C95,65 90,75 85,80 M60,30 C73,30 85,42 85,55 C85,62 82,68 78,72 M60,40 C68,40 75,47 75,55 C75,58 74,62 72,65"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-orange-500 animate-pulse"
                  />

                  {/* Scanning line */}
                  <line
                    x1="20"
                    y1="35"
                    x2="100"
                    y2="35"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-green-500 drop-shadow-sm"
                  >
                    <animate
                      attributeName="y1"
                      values="25;95;25"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="y2"
                      values="25;95;25"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </line>
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-orange-500 mb-2">
              Bio Sync
            </h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-8">
              Place finger on sensor
            </p>

            {/* Countdown Timer */}
            <div className="mb-10 space-y-3">
              <div className="text-5xl font-black font-mono tracking-tighter text-orange-500">
                00:{String(timeRemaining).padStart(2, "0")}
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-orange-500 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                  style={{ width: `${(timeRemaining / 20) * 100}%` }}
                />
              </div>
            </div>

            <Button
              onClick={cancelEnrollment}
              variant="ghost"
              className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-destructive/10 hover:text-destructive transition-all border border-transparent hover:border-destructive/20"
            >
              Cancel Enrollment
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
