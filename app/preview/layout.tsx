import type React from "react";
import { MqttProvider } from "@/contexts/MqttContext";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MqttProvider>
      <div className="flex flex-col min-h-screen w-full bg-background font-sans selection:bg-blue-500/30 relative overflow-hidden">
        {/* Digital Grid Overlay */}
        <div
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Preview Header */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-background/40 backdrop-blur-xl px-4 md:px-6 relative z-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/images/icon/icon1.svg"
                alt="Logo"
                className="h-7 w-7 object-contain dark:hidden"
              />
              <img
                src="/images/icon/icon2.svg"
                alt="Logo"
                className="h-7 w-7 object-contain hidden dark:block"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-black text-foreground dark:text-white tracking-tight uppercase leading-none">
                SMARTRACK<span className="text-blue-500 italic">IOT</span>
              </h1>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Preview Mode
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Preview Mode — Read Only
            </span>
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
            >
              Login
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden relative z-10">
          {children}
        </div>
      </div>
    </MqttProvider>
  );
}
