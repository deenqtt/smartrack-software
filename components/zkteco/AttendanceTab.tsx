"use client";

import { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Calendar,
  Clock,
  Trash2,
  Activity,
  Database,
  CheckCircle2,
  Monitor,
  Info,
  ShieldAlert,
  Fingerprint,
  ScanFace,
  CreditCard,
  Key,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileUp,
  FileDown,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface AttendanceRecord {
  id: number;
  uid: string;
  name: string;
  timestamp: string;
  method?: string;
  deviceName?: string;
  isDeleted: boolean;
}

export default function AttendanceTab() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearType, setClearType] = useState<"soft" | "hard">("soft");
  const [clearPeriod, setClearPeriod] = useState("all");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchAttendance();
    const eventSource = new EventSource('/api/zkteco/attendance/events');
    eventSource.addEventListener('new_attendance', async () => {
      const records = await fetchAttendance();
      const latest = records[0];
      if (latest) {
        const method = latest.method?.toUpperCase() || 'UNKNOWN';
        const time = new Date(latest.timestamp).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        toast.success(`${latest.name || 'Unknown'} berhasil check-in`, {
          description: `${method} • ${latest.deviceName || 'Terminal'} • ${time}`,
          duration: 5000,
        });
      }
    });
    return () => {
      eventSource.close();
    };
  }, []);

  const fetchAttendance = async (): Promise<AttendanceRecord[]> => {
    setLoading(true);
    try {
      const res = await fetch("/api/zkteco/attendance");
      const data = await res.json();
      const records: AttendanceRecord[] = data.attendance || [];
      setAttendance(records);
      return records;
    } catch (err) {
      console.error("Failed to fetch attendance", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/zkteco/attendance/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: clearPeriod,
          type: clearType,
        }),
      });

      const result = await res.json();
      if (result.status === "success") {
        toast.success(result.message);
        setIsClearModalOpen(false);
        fetchAttendance();
      } else {
        toast.error(result.error || "Failed to clear logs");
      }
    } catch (err) {
      toast.error("Network error while clearing logs");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      toast.loading("Preparing CSV export...");
      const res = await fetch("/api/zkteco/attendance/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_export_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss();
      toast.success("Attendance logs exported successfully");
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Failed to export logs");
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a CSV file first");
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("mode", "append");

    try {
      const res = await fetch("/api/zkteco/attendance/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.status === "success") {
        toast.success(result.message);
        setIsImportModalOpen(false);
        setImportFile(null);
        fetchAttendance();
      } else {
        toast.error(result.message || "Import failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while importing logs");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredAttendance = attendance.filter(
    (record) =>
      record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.uid?.includes(searchTerm),
  );

  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
  const paginatedData = filteredAttendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <main className=" space-y-6 animate-in fade-in duration-500">
      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-blue-500/10 rounded-lg">
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Total Records
            </p>
            <p className="text-xl font-bold leading-none">
              {attendance.length}
            </p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-green-500/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Today
            </p>
            <p className="text-xl font-bold leading-none">
              {
                attendance.filter(
                  (a) =>
                    new Date(a.timestamp).toDateString() ===
                    new Date().toDateString(),
                ).length
              }
            </p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-orange-500/10 rounded-lg">
            <Monitor className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Active Sync
            </p>
            <p className="text-xl font-bold leading-none text-green-500">
              Live
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar (Search + Buttons) */}
      <div className="bg-card border rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search UID or Name..."
              className="w-full bg-background border rounded-lg h-10 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 md:flex-none justify-center bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold px-4 h-10 rounded-lg flex items-center gap-2 transition-all border border-primary/20 whitespace-nowrap"
          >
            <FileUp className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex-1 md:flex-none justify-center bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold px-4 h-10 rounded-lg flex items-center gap-2 transition-all border border-primary/20 whitespace-nowrap"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <div className="w-[1px] h-6 bg-border mx-1 hidden md:block"></div>
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex-1 md:flex-none justify-center bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-bold px-4 h-10 rounded-lg flex items-center gap-2 transition-all border border-destructive/20 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Logs
          </button>
          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="p-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg border transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-20">
                  #
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  User Info
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Method
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Device / Location
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary/30" />
                    <p className="text-xs font-bold text-muted-foreground mt-4 uppercase tracking-widest">
                      Hydrating Logs...
                    </p>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Activity className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                    <h3 className="text-sm font-bold">No Records Found</h3>
                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mt-1">
                      Try adjusting your search criteria or refresh the page.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((record, index) => (
                  <tr
                    key={record.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-muted-foreground/50 font-mono">
                        #
                        {String(
                          filteredAttendance.length -
                            ((currentPage - 1) * itemsPerPage + index),
                        ).padStart(3, "0")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm font-mono font-bold leading-none">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {new Date(record.timestamp).toLocaleTimeString([], {
                            hour12: false,
                          })}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(record.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] uppercase">
                          {record.name?.substring(0, 2) || "??"}
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-tight">
                            {record.name || "Unknown"}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            UID: {record.uid}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        const m = record.method?.toUpperCase() || "";
                        if (m.includes("FACE"))
                          return (
                            <Badge
                              icon={<ScanFace className="w-3 h-3" />}
                              color="green"
                            >
                              FACE
                            </Badge>
                          );
                        if (m.includes("FINGER"))
                          return (
                            <Badge
                              icon={<Fingerprint className="w-3 h-3" />}
                              color="orange"
                            >
                              FINGER
                            </Badge>
                          );
                        if (m.includes("CARD"))
                          return (
                            <Badge
                              icon={<CreditCard className="w-3 h-3" />}
                              color="purple"
                            >
                              CARD
                            </Badge>
                          );
                        if (m.includes("PASSWORD") || m.includes("PIN"))
                          return (
                            <Badge
                              icon={<Key className="w-3 h-3" />}
                              color="blue"
                            >
                              PASS
                            </Badge>
                          );
                        return <Badge color="gray">{m || "OTHER"}</Badge>;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-bold tracking-tight">
                          {record.deviceName || "Local Terminal"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-green-500/10">
                        <CheckCircle2 className="w-3 h-3" />
                        SUCCESS
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredAttendance.length > 0 && (
        <div className="flex items-center justify-between pt-2 px-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Showing{" "}
            <span className="text-foreground">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredAttendance.length)}
            </span>{" "}
            of{" "}
            <span className="text-foreground">{filteredAttendance.length}</span>{" "}
            records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold w-16 text-center tabular-nums">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Clear Logs Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => !isDeleting && setIsClearModalOpen(false)}
          ></div>
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-6 border-b bg-destructive/5">
              <div className="flex items-center gap-3 text-destructive mb-2">
                <ShieldAlert className="w-6 h-6" />
                <h2 className="text-lg font-bold">Clear Attendance Logs</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a deletion method and period to purge the system logs.
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Deletion Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setClearType("soft")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${clearType === "soft" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 mb-2 flex items-center justify-center ${clearType === "soft" ? "border-primary" : "border-muted-foreground"}`}
                    >
                      {clearType === "soft" && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs font-bold leading-none mb-1">
                      Soft Delete
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      Database & UI Only. Devices untouched.
                    </p>
                  </button>
                  <button
                    onClick={() => setClearType("hard")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${clearType === "hard" ? "border-destructive bg-destructive/5" : "border-border hover:border-border/80"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 mb-2 flex items-center justify-center ${clearType === "hard" ? "border-destructive" : "border-muted-foreground"}`}
                    >
                      {clearType === "hard" && (
                        <div className="w-2 h-2 bg-destructive rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-destructive leading-none mb-1">
                      Hard Delete
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      DB, UI & All physical devices.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Time Period
                </label>
                <select
                  className="w-full bg-background border rounded-lg h-10 px-3 text-sm font-bold outline-none focus:border-primary transition-all"
                  value={clearPeriod}
                  onChange={(e) => setClearPeriod(e.target.value)}
                >
                  <option value="today">Today Only</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                  <option value="all">Everything (All Time)</option>
                </select>
              </div>

              {clearType === "hard" && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex gap-3 border border-destructive/20 animate-in shake-in duration-300">
                  <ShieldAlert className="w-8 h-8 shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">
                    WARNING: Hard delete will send a purge command to all
                    connected devices. This action is irreversible.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/30 border-t flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 h-10 rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleClearLogs}
                className={`flex-1 h-10 rounded-lg text-xs font-bold text-primary-foreground shadow-lg transition-all ${clearType === "hard" ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"}`}
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  `Clear ${clearPeriod === "all" ? "All" : ""} Logs`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => !isImporting && setIsImportModalOpen(false)}
          ></div>
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Import Attendance</h2>
                  <p className="text-xs text-muted-foreground">
                    Upload CSV file to populate logs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isImporting && setIsImportModalOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8">
              <label
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${importFile ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {importFile ? (
                    <>
                      <FileUp className="w-10 h-10 text-primary mb-3 animate-bounce" />
                      <p className="text-sm font-bold text-primary">
                        {importFile.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                        {(importFile.size / 1024).toFixed(2)} KB • READY
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium text-foreground">
                        Click to select CSV file
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                        Format: UID, Name, Timestamp, Method, Device, Status
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  disabled={isImporting}
                />
              </label>

              {importFile && (
                <div className="mt-6 flex gap-3">
                  <button
                    disabled={isImporting}
                    onClick={() => setImportFile(null)}
                    className="flex-1 h-11 rounded-xl text-xs font-bold text-foreground border hover:bg-muted transition-all"
                  >
                    Reset
                  </button>
                  <button
                    disabled={isImporting}
                    onClick={handleImport}
                    className="flex-[2] h-11 rounded-xl text-xs font-black text-primary-foreground bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isImporting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        START IMPORT
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/30 border-t flex items-center gap-3">
              <Info className="w-4 h-4 text-primary" />
              <p className="text-[9px] font-bold text-muted-foreground leading-tight uppercase tracking-wider">
                Only .csv files generated from this system are guaranteed to
                work. Ensure UIDs exist in the user database.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Badge({
  children,
  color,
  icon,
}: {
  children: React.ReactNode;
  color: string;
  icon?: React.ReactNode;
}) {
  const colors: any = {
    green: "bg-green-500/10 text-green-600 border-green-500/10",
    orange: "bg-orange-500/10 text-orange-600 border-orange-500/10",
    purple: "bg-purple-500/10 text-purple-600 border-purple-500/10",
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/10",
    gray: "bg-gray-500/10 text-gray-600 border-gray-500/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest border ${colors[color]}`}
    >
      {icon}
      {children}
    </span>
  );
}
