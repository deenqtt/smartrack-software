"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Smartphone,
  CheckCircle2,
  Clock,
  Activity,
  ArrowUpRight,
  Fingerprint,
  Radio,
  Monitor,
  Calendar,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalUsers: number;
  totalDevices: number;
  onlineDevices: number;
  todayAttendance: number;
  recentAttendance: any[];
  methodStats: Record<string, number>;
  trendData: any[];
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
];

export default function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Real-time: listen to SSE attendance events
    const eventSource = new EventSource("/api/zkteco/attendance/events");
    eventSource.addEventListener("new_attendance", () => {
      fetchStats();
    });

    // Fallback: refresh every 30s in case SSE misses something
    const interval = setInterval(fetchStats, 30000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/zkteco/dashboard/stats");
      const data = await res.json();
      if (data.status === "success") {
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="p-6 space-y-6 animate-pulse ">
        <div className="h-8 w-48 bg-muted rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 h-72 bg-muted rounded-xl"></div>
          <div className="lg:col-span-4 h-72 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  const pieData = Object.entries(stats.methodStats).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <main className="space-y-6 animate-in fade-in duration-700">
      {/* Summary Cards - More Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Employees */}
        <div className="bg-card rounded-xl border p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Total Employees
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{stats.totalUsers}</span>
            <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              Active
            </span>
          </div>
        </div>

        {/* Presence Today */}
        <div className="bg-card rounded-xl border p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Presence Today
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{stats.todayAttendance}</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Check-ins
            </span>
          </div>
        </div>

        {/* Device Status */}
        <div className="bg-card rounded-xl border p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Smartphone className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Active Devices
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {stats.onlineDevices}
              <span className="text-lg text-muted-foreground/60 font-light ml-0.5">
                /{stats.totalDevices}
              </span>
            </span>
            <div className="ml-2 flex items-center gap-1.5 text-[9px] font-black text-orange-600 bg-orange-500/5 px-2 py-0.5 rounded-full border border-orange-500/10 animate-pulse">
              <div className="w-1 h-1 rounded-full bg-orange-500"></div>
              LIVE
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - Adjusted Height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Attendance Trend */}
        <div className="lg:col-span-8 bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Attendance Trend
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Volume for the last 7 days
              </p>
            </div>
            <div className="text-[9px] font-bold text-primary bg-primary/5 border border-primary/10 px-2 py-1 rounded-lg">
              ACTUAL DATA
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.trendData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Methods */}
        <div className="lg:col-span-4 bg-card rounded-xl border p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wide mb-1">
            Access Methods
          </h3>
          <p className="text-[10px] text-muted-foreground mb-4">
            Verification distribution
          </p>
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "11px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Fingerprint className="w-6 h-6 text-primary/30" />
            </div>
          </div>
          <div className="mt-auto space-y-2 pt-2">
            {pieData.map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">
                    {entry.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Feed Row - Smoothed and Scaled */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Live Attendance Feed */}
        <div className="lg:col-span-8 bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-green-500/5 rounded-lg border border-green-500/10">
                <Activity className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Live Activity Feed
              </h3>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] font-black text-green-600 bg-green-500/5 px-2 py-0.5 rounded-full border border-green-500/10">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-ping"></div>
              REAL-TIME
            </span>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.recentAttendance.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">
                No logs detected.
              </div>
            ) : (
              stats.recentAttendance.map((att, idx) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-transparent hover:border-border transition-all animate-in slide-in-from-right-1 tracking-tight"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                      {att.userName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold">{att.userName}</h4>
                      <p className="text-[9px] font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                        <Monitor className="w-2.5 h-2.5" />
                        {att.deviceName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end mb-0.5">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className="text-[10px] font-bold font-mono text-muted-foreground">
                        {new Date(att.timestamp).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}{" "}
                        •{" "}
                        {new Date(att.timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border tracking-widest ${att.method.toLowerCase().includes("finger") ? "border-orange-500/10 bg-orange-500/5 text-orange-600" : "border-blue-500/10 bg-blue-500/5 text-blue-600"}`}
                    >
                      {att.method.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mini Status Monitor */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide mb-4">
              Device Status
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-blue-600">
                    {stats.onlineDevices}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">
                    Online
                  </span>
                </div>
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-red-600">
                    {stats.totalDevices - stats.onlineDevices}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">
                    Offline
                  </span>
                </div>
              </div>

              <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Sync Health
                  </span>
                  <span className="text-[10px] font-black text-green-500">
                    100%
                  </span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl border border-primary/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold text-primary uppercase">
                Summary
              </h4>
            </div>
            <p className="text-[10px] text-primary/70 leading-relaxed font-medium">
              Active monitoring engaged. Heartbeat signals from Master ZAM230
              and SDK slaves are within normal parity.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
