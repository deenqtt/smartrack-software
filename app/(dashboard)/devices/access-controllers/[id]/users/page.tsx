"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  PlusCircle,
  Trash2,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  ServerCog,
  Timer,
  MemoryStick,
  HardDrive,
  Users2,
  FileText,
  UserPlus,
  Download,
  LockKeyhole,
  UserX, // <-- Import ikon baru
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// --- Tipe Data (Tidak ada perubahan) ---
type User = {
  jobId: number;
  cardNumber: string;
  username: string;
};

type AccessController = {
  id: string;
  name: string;
  ipAddress: string;
  status: string;
  uptime?: string;
  freeHeap?: number;
  totalHeap?: number;
  spiffsUsed?: number;
  spiffsTotal?: number;
  logFileSize?: number;
};

// --- Inisialisasi SweetAlert2 (Tidak ada perubahan) ---
const MySwal = withReactContent(Swal);
const Toast = MySwal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export default function UserManagementPage() {
  const router = useRouter();
  const params = useParams();
  const controllerId = params.id as string;

  // --- State Management (Tidak ada perubahan) ---
  const [controller, setController] = useState<AccessController | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [jobId, setJobId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [username, setUsername] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // --- Logika Fetch Data (Tidak ada perubahan) ---
  const fetchControllerData = useCallback(async () => {
    if (!controllerId) return;
    try {
      const response = await fetch(
        `/api/devices/access-controllers/${controllerId}`,
      );
      if (!response.ok) throw new Error("Controller not found.");
      setController(await response.json());
    } catch (error) {
      console.error(error);
    }
  }, [controllerId]);

  const fetchUsers = useCallback(async () => {
    if (!controllerId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/devices/access-controllers/${controllerId}/users`,
      );
      if (!response.ok) throw new Error("Failed to fetch users from device.");
      setUsers(await response.json());
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "Could not load users." });
    } finally {
      setIsLoading(false);
    }
  }, [controllerId]);

  // --- useEffect untuk Polling (Tidak ada perubahan) ---
  useEffect(() => {
    if (!controllerId) return;
    fetchUsers();
    const initialFetch = async () => {
      await fetchControllerData();
    };
    initialFetch();
    const intervalId = setInterval(() => {
      fetchControllerData();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [controllerId, fetchControllerData, fetchUsers]);

  // --- Fungsi Helper & Handler (Tidak ada perubahan logika, hanya penyesuaian kecil jika ada) ---
  const formatBytes = (bytes?: number, decimals = 2) => {
    if (bytes === undefined || bytes === null || bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsFormLoading(true);
    try {
      const response = await fetch(
        `/api/devices/access-controllers/${controllerId}/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: parseInt(jobId),
            cardNumber,
            username,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to send command.");
      Toast.fire({ icon: "success", title: "Add command sent!" });
      setJobId("");
      setCardNumber("");
      setUsername("");
      setTimeout(() => fetchUsers(), 2000);
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: `You will delete user "${user.username}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      try {
        const response = await fetch(
          `/api/devices/access-controllers/${controllerId}/users`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: user.jobId }),
          },
        );
        if (!response.ok) throw new Error("Failed to send command.");
        Toast.fire({ icon: "success", title: "Delete command sent!" });
        setTimeout(() => fetchUsers(), 2000);
      } catch (error) {
        Toast.fire({ icon: "error", title: (error as Error).message });
      }
    }
  };

  const sendDeviceAction = async (command: string, payload?: any) => {
    setIsActionLoading(true);
    try {
      const response = await fetch(
        `/api/devices/access-controllers/${controllerId}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, payload }),
        },
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to send command.");
      }
      Toast.fire({ icon: "success", title: `Command '${command}' sent!` });
      if (command === "REBOOT_DEVICE" || command === "FACTORY_RESET") {
        Toast.fire({
          icon: "info",
          title: "Device is restarting...",
          timer: 5000,
        });
        setTimeout(() => router.push("/devices/access-controllers"), 6000);
      }
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReboot = () => {
    MySwal.fire({
      title: "Reboot Device?",
      text: "The controller will restart. This process takes about 30 seconds.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, reboot",
    }).then((result) => {
      if (result.isConfirmed) sendDeviceAction("REBOOT_DEVICE");
    });
  };

  const handleFactoryReset = () => {
    MySwal.fire({
      title: "ARE YOU SURE?",
      html: "This will perform a <b>factory reset</b>. All users and settings on the device will be deleted. This action cannot be undone.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, reset device!",
    }).then((result) => {
      if (result.isConfirmed) sendDeviceAction("FACTORY_RESET");
    });
  };

  const handleChangeAddress = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      currentAddress: parseInt(currentAddress),
      newAddress: parseInt(newAddress),
    };
    sendDeviceAction("CHANGE_LOCK_ADDRESS", payload);
    setCurrentAddress("");
    setNewAddress("");
  };
  const handleExportLogs = async () => {
    setIsActionLoading(true);
    Toast.fire({
      icon: "info",
      title: "Requesting logs from device... Please wait.",
    });

    try {
      const response = await fetch(
        `/api/devices/access-controllers/${controllerId}/sync-logs`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export logs.");
      }

      // Browser akan otomatis memproses download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Ambil nama file dari header response
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = "logs.csv";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2)
          fileName = fileNameMatch[1];
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      Toast.fire({ icon: "success", title: "Log export started!" });
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsActionLoading(false);
    }
  };
  const handleClearAllUsers = () => {
    MySwal.fire({
      title: "Hapus Semua Pengguna?",
      text: "Aksi ini akan menghapus semua data pengguna dari controller dan semua lock yang terhubung. Aksi ini tidak bisa dibatalkan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, hapus semua",
    }).then((result) => {
      if (result.isConfirmed) {
        sendDeviceAction("CLEAR_ALL_USERS");
      }
    });
  };
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // --- Penjelasan Perubahan ---
  // 1. Latar Belakang: Menggunakan `bg-slate-50` untuk seluruh halaman agar tidak terlalu silau putih.
  // 2. Padding: Mengubah padding menjadi `p-4 sm:p-6` agar lebih pas di layar kecil.
  // 3. Tata Letak Utama: Menggunakan `grid grid-cols-1 lg:grid-cols-3 gap-6` untuk membuat layout 2 kolom di layar besar.
  //    - Kolom utama (span-2) untuk manajemen pengguna.
  //    - Kolom samping (span-1) untuk status dan aksi perangkat.
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 sm:p-6">
      {/* ======================================================================== */}
      {/* HEADER                                                                 */}
      {/* ======================================================================== */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors font-medium shadow-sm"
            title="Back to controller list"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Manage Device
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {controller?.name || "Loading controller..."}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
          {controller?.status === "online" ? (
            <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Wifi size={20} />
              <span className="font-semibold capitalize text-sm">Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <WifiOff size={20} />
              <span className="font-semibold capitalize text-sm">Offline</span>
            </span>
          )}
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
            {controller?.ipAddress}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ======================================================================== */}
        {/* KOLOM UTAMA (Manajemen Pengguna)                                       */}
        {/* ======================================================================== */}
        <div className="lg:col-span-2 space-y-6">
          {/* --- Form Tambah Pengguna --- */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus size={20} />
              Add New User
            </h2>
            <form
              onSubmit={handleFormSubmit}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start"
            >
              {/* --- Penjelasan Perubahan Input --- */}
              {/* 1. Label: Dibuat lebih kecil dan jelas. */}
              {/* 2. Input: Diberi border yang lebih halus, shadow-sm, dan `focus ring` berwarna biru langit (`sky`). */}
              <div className="w-full">
                <label
                  htmlFor="jobId"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Job ID
                </label>
                <input
                  id="jobId"
                  type="text"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  placeholder="e.g., 101"
                  required
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-sky-500 dark:focus:border-sky-400 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="w-full">
                <label
                  htmlFor="cardNumber"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Card Number
                </label>
                <input
                  id="cardNumber"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="e.g., 123456789"
                  required
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-sky-500 dark:focus:border-sky-400 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="w-full">
                <label
                  htmlFor="username"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., John Doe"
                  required
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-sky-500 dark:focus:border-sky-400 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={isFormLoading}
                  className="w-full md:w-auto bg-sky-600 dark:bg-sky-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-700 dark:hover:bg-sky-600 flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PlusCircle size={18} />
                  <span>{isFormLoading ? "Adding..." : "Add User"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* --- Tabel Daftar Pengguna --- */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users2 size={18} />
                Registered Users ({users.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              {/* --- Penjelasan Perubahan Tabel --- */}
              {/* 1. Thead: Dibuat lebih terang (`bg-slate-100/80`). */}
              {/* 2. Tbody: Diberi warna baris belang (`even:bg-slate-50/50`) untuk keterbacaan. */}
              {/* 3. Empty/Loading State: Dibuat lebih menarik secara visual dengan ikon dan teks yang lebih besar. */}
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Job ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Card Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center p-8 text-slate-500 dark:text-slate-400"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="animate-spin" size={24} />
                          <span>Loading users from device...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentUsers.length > 0 ? (
                    currentUsers.map((user) => (
                      <tr
                        key={user.jobId}
                        className="even:bg-slate-50/50 dark:even:bg-slate-700/30 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-800 dark:text-slate-200">
                          {user.jobId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-600 dark:text-slate-400">
                          {user.cardNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                            title={`Delete ${user.username}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center p-8 text-slate-500 dark:text-slate-400"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Users2
                            size={32}
                            className="text-slate-400 dark:text-slate-500"
                          />
                          <span className="font-semibold text-lg">
                            No Users Found
                          </span>
                          <span className="text-sm">
                            Add a user using the form above.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {users.length > usersPerPage && (
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================== */}
        {/* KOLOM SAMPING (Status & Aksi Perangkat)                                */}
        {/* ======================================================================== */}
        <div className="space-y-6">
          {/* --- System Vitals --- */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
              System Vitals
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Timer
                    size={16}
                    className="text-slate-400 dark:text-slate-500"
                  />{" "}
                  <span className="font-medium">Uptime</span>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {controller?.uptime || "..."}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <MemoryStick
                    size={16}
                    className="text-slate-400 dark:text-slate-500"
                  />{" "}
                  <span className="font-medium">RAM Usage</span>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {controller?.totalHeap
                    ? `${formatBytes(
                        controller.totalHeap - (controller.freeHeap || 0),
                        1,
                      )} / ${formatBytes(controller.totalHeap, 1)}`
                    : "..."}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <HardDrive
                    size={16}
                    className="text-slate-400 dark:text-slate-500"
                  />{" "}
                  <span className="font-medium">Storage</span>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {controller?.spiffsTotal
                    ? `${formatBytes(controller.spiffsUsed)} / ${formatBytes(
                        controller.spiffsTotal,
                      )}`
                    : "..."}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <FileText
                    size={16}
                    className="text-slate-400 dark:text-slate-500"
                  />{" "}
                  <span className="font-medium">Log File Size</span>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {formatBytes(controller?.logFileSize)}
                </span>
              </div>
            </div>
          </div>

          {/* --- Change Lock Address --- */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <LockKeyhole size={18} />
              Change Lock Address
            </h3>
            <form onSubmit={handleChangeAddress} className="space-y-4">
              <div>
                <label
                  htmlFor="currentAddress"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Current Address
                </label>
                <input
                  id="currentAddress"
                  type="number"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  placeholder="e.g., 1"
                  required
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-sky-500 dark:focus:border-sky-400 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label
                  htmlFor="newAddress"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  New Address
                </label>
                <input
                  id="newAddress"
                  type="number"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g., 5"
                  required
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-sky-500 dark:focus:border-sky-400 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <button
                type="submit"
                disabled={isActionLoading}
                className="w-full bg-slate-600 dark:bg-slate-700 text-white px-4 py-2 rounded-md shadow-sm hover:bg-slate-700 dark:hover:bg-slate-600 flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ServerCog size={18} />
                <span>
                  {isActionLoading ? "Changing..." : "Change Address"}
                </span>
              </button>
            </form>
          </div>

          {/* --- Device Actions --- */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Device Actions
            </h3>
            <div className="flex items-center justify-between gap-6">
              <button
                onClick={handleReboot}
                disabled={isActionLoading}
                className="flex flex-col items-center text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                <RefreshCw size={24} />
                <span className="text-sm mt-1 font-medium">Reboot</span>
              </button>
              <button
                onClick={handleFactoryReset}
                disabled={isActionLoading}
                className="flex flex-col items-center text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                <AlertTriangle size={24} />
                <span className="text-sm mt-1 font-medium">Factory Reset</span>
              </button>
              <button
                onClick={handleClearAllUsers}
                disabled={isActionLoading}
                className="flex flex-col items-center text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 disabled:opacity-50 transition-colors"
              >
                <UserX size={24} />
                <span className="text-sm mt-1 font-medium">Clear Users</span>
              </button>
              {/* --- TOMBOL EXPORT BARU --- */}
              <button
                onClick={handleExportLogs}
                disabled={isActionLoading}
                className="flex flex-col items-center text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 transition-colors"
              >
                <Download size={24} />
                <span className="text-sm mt-1 font-medium">Export Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
