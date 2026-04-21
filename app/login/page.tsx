"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  Server,
  Activity,
  Shield,
  Cpu,
  Database,
  Globe,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { showToast } from "@/lib/toast-utils";
import { motion } from "framer-motion";
import RealtimeClockWithRefresh from "@/components/realtime-clock";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────
const SHOW_ACCOUNT_DROPDOWN = process.env.NEXT_PUBLIC_USER_LOGIN_DROPDOWN === "true";

const FEATURES = [
  { icon: Activity, label: "Real-time MQTT Monitoring", desc: "Live telemetry from all connected devices", color: "text-blue-500 dark:text-blue-400" },
  { icon: Server, label: "Multi-Rack Management", desc: "Centralized control for your entire infrastructure", color: "text-emerald-500 dark:text-emerald-400" },
  { icon: Cpu, label: "Modbus RTU/TCP Integration", desc: "Direct communication with industrial devices", color: "text-violet-500 dark:text-violet-400" },
  { icon: Shield, label: "Role-Based Access Control", desc: "Fine-grained permissions per user and resource", color: "text-red-500 dark:text-red-400" },
];

const ACCOUNT_PRESETS = [
  {
    id: "admin",
    label: "Administrator (admin@smartrack.com)",
    email: "admin@smartrack.com",
    password: "admin123",
  },
  { id: "custom", label: "Custom Account", email: "", password: "" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(
    SHOW_ACCOUNT_DROPDOWN ? ACCOUNT_PRESETS[0].id : "custom",
  );

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    const preset = ACCOUNT_PRESETS.find(
      (acct) => acct.id === selectedAccountId,
    );
    if (preset && preset.id !== "custom") {
      setEmail(preset.email);
      setPassword(preset.password);
    } else {
      setEmail("");
      setPassword("");
    }
  }, [selectedAccountId]);

  const isCustomAccount = selectedAccountId === "custom";
  const accountSelectClasses = cn(
    "h-12 w-full rounded-2xl border border-slate-200 dark:border-white/5",
    "bg-slate-100 dark:bg-slate-950/50 px-4 text-sm font-medium",
    "text-slate-900 dark:text-white focus:border-blue-500 transition-all",
  );

  const inputClasses = cn(
    "h-12 bg-slate-100 dark:bg-slate-950/50",
    "border-slate-200 dark:border-white/5 rounded-2xl",
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-700",
    "focus:border-blue-500 transition-all font-medium",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      showToast.error(
        "Login Failed",
        err.message || "Please check your credentials.",
      );
      setIsLoading(false);
    }
  };

  if (!isReady) return null;

  return (
    <div className="h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* ── Background Layer ────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
          style={{ backgroundImage: "url('/images/smartrack_login_bg.png')" }}
        />
        {/* Light mode: white/light overlay; Dark mode: dark overlay */}
        <div className="absolute inset-0 bg-white/85 dark:bg-slate-950/80 backdrop-blur-[1px] z-10" />

        {/* Digital Grid Overlay */}
        <div
          className="absolute inset-0 z-20 opacity-[0.04] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-100/90 dark:from-slate-950 via-transparent to-slate-100/50 dark:to-slate-950/50" />

        {/* Scanline Effect */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden opacity-[0.04] dark:opacity-[0.05]">
          <motion.div
            animate={{ y: ["0%", "100%"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-full h-[50%] bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"
          />
        </div>

        {/* Animated gradients */}
        <motion.div
          animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[150px] z-10"
        />
        <motion.div
          animate={{ opacity: [0.05, 0.12, 0.05], scale: [1.2, 1, 1.2] }}
          transition={{ duration: 18, repeat: Infinity }}
          className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] z-10"
        />
      </div>

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 p-1 sm:p-6 flex flex-row justify-between items-center z-50 gap-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 sm:gap-4 min-w-0"
        >
          <div className="size-9 sm:size-16 shrink-0 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg sm:rounded-2xl shadow-xl border border-slate-200 dark:border-white/20">
            <img
              src="/images/icon/icon1.svg"
              alt="Logo"
              className="h-5 w-5 sm:h-9 sm:w-9 object-contain dark:hidden"
            />
            <img
              src="/images/icon/icon2.svg"
              alt="Logo"
              className="h-5 w-5 sm:h-9 sm:w-9 object-contain hidden dark:block"
            />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none truncate">
              SMARTRACK<span className="text-blue-500 italic">IOT</span>
            </h1>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 truncate mt-0.5 hidden sm:block">
              Next-Gen Rack Management
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-lg sm:rounded-2xl px-2 py-1 sm:px-4 sm:py-2">
            <RealtimeClockWithRefresh />
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="container relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-0">
        <div className="w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side: Branding + Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:flex flex-col gap-6"
          >
            <div className="space-y-4">
              <h2 className="text-5xl xl:text-6xl font-black text-slate-900 dark:text-white leading-[1.05] tracking-tight">
                Universal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">
                  Monitoring
                </span>{" "}
                <br />& Control.
              </h2>
              <p className="text-base xl:text-lg text-slate-600 dark:text-slate-400 max-w-md font-medium leading-relaxed">
                Elevate your infrastructure with Enterprise-grade IoT telemetry
                and intelligent automation control systems.
              </p>
            </div>

            {/* 4 Feature Cards — 2×2 grid under the heading */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-4 py-3.5 rounded-2xl group hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-white/90 dark:hover:bg-slate-900/60 transition-all duration-200"
                >
                  <div className={cn("p-2 rounded-xl bg-slate-100 dark:bg-white/5 shrink-0 group-hover:scale-110 transition-transform duration-200", feat.color)}>
                    <feat.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-slate-900 dark:text-white leading-none mb-1">{feat.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500 font-medium leading-tight">{feat.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side: Login Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              {/* Top accent */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-emerald-500" />

              <div className="mb-6 sm:mb-7 relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">
                    Authorized Access
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1 sm:mb-2">
                  System Login
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Securely sign-in to the control dashboard
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-3 sm:space-y-4">
                  {SHOW_ACCOUNT_DROPDOWN ? (
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">
                        Select Account
                      </Label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className={accountSelectClasses}
                      >
                        {ACCOUNT_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  {isCustomAccount ? (
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">
                        Email Address
                      </Label>
                      <Input
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={inputClasses}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 ml-1">
                      Signing in as <span className="font-bold text-slate-900 dark:text-white">Administrator</span>
                    </p>
                  )}
                  {isCustomAccount && (
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className={cn(inputClasses, "pr-12")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-1">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                    className="rounded-md border-slate-300 dark:border-white/10 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <label
                    htmlFor="remember"
                    className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none"
                  >
                    Remember me{" "}
                    <span className="font-normal text-slate-400 dark:text-slate-600 hidden sm:inline">
                      ({rememberMe ? "30 days" : "session only"})
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black text-sm sm:text-base shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <LogIn className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4">
                <Link href="/preview">
                  <button
                    type="button"
                    className="w-full h-10 sm:h-12 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Preview Dashboard
                  </button>
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                <div className="flex gap-4">
                  <Globe className="h-4 w-4 text-slate-400 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer" />
                  <Cpu className="h-4 w-4 text-slate-400 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer" />
                  <Database className="h-4 w-4 text-slate-400 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer" />
                </div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest">
                  v1.2.0 Build 2026
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Background Branding ─────────────────────────────────────────────── */}
      <div className="absolute -bottom-10 sm:-bottom-20 -left-10 z-0 opacity-[0.03] dark:opacity-[0.02] select-none pointer-events-none">
        <h1 className="text-[120px] sm:text-[200px] lg:text-[300px] font-black leading-none uppercase tracking-tighter text-slate-900 dark:text-white">
          SMARTRACK
        </h1>
      </div>

      {/* ── Custom Styles ───────────────────────────────────────────────────── */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap");
        html,
        body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: "Outfit", sans-serif !important;
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
}

