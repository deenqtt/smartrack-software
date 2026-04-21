// Optimized server component layout - client components separated for better SSR
import type React from "react";
import { MqttProvider } from "@/contexts/MqttContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardHeader from "./dashboard-header";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { LoginSuccessLoader } from "@/components/login-success-loader";
import { AIChatPopup } from "@/components/ai-chat-popup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server component - no hooks or client-side logic here
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background font-sans selection:bg-blue-500/30 overflow-hidden relative">
        {/* Digital Grid Overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
          style={{ 
            backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
            backgroundSize: "40px 40px" 
          }} 
        />

        <NavigationSidebar collapsible={true} />
        <div className="flex flex-col flex-1 min-h-0 relative z-10">
          <DashboardHeader />
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {children}
          </div>
        </div>
        <LoginSuccessLoader />
        <AIChatPopup />
      </div>
    </SidebarProvider>
  );
}
