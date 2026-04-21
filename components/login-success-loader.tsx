"use client";

import { useState, useEffect } from "react";
import { Loader2, Activity, CheckCircle, Zap, Shield, Cpu, Server } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export function LoginSuccessLoader() {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const loadingSteps = [
    {
      icon: CheckCircle,
      title: "AUTH VERIFIED",
      description: "Credentials validated securely",
      color: "text-emerald-400"
    },
    {
      icon: Shield,
      title: "SECURING SESSION",
      description: "Establishing encrypted connection",
      color: "text-blue-400"
    },
    {
      icon: Server,
      title: "INITIALIZING DCIM",
      description: "Loading enterprise telemetry",
      color: "text-indigo-400"
    },
    {
      icon: Cpu,
      title: "SYNCHRONIZING NODES",
      description: "Connecting to MQTT broker",
      color: "text-cyan-400"
    }
  ];

  useEffect(() => {
    if (!isAuthenticated) return;

    let currentStep = 0;
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 25 * (currentStep + 1)) {
        currentStep = Math.min(currentStep + 1, loadingSteps.length - 1);
        setStep(currentStep);
      }
      setProgress(Math.min(currentProgress, 100));

      if (currentProgress >= 100) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated || progress >= 100) return null;

  const currentStepData = loadingSteps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 font-sans">
      <div className="bg-card border border-border rounded-[40px] shadow-2xl p-8 max-w-sm w-full relative overflow-hidden">

        {/* Top accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-emerald-500" />

        {/* Animated Background Grid */}
        <div
          className="absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
            backgroundSize: "20px 20px"
          }}
        />

        <div className="relative z-10 text-center space-y-8">
          {/* Animated Icon */}
          <div className="relative flex justify-center mt-4">
            <div className="w-20 h-20 bg-muted border border-border rounded-[20px] flex items-center justify-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                  transition={{ duration: 0.3 }}
                >
                  <currentStepData.icon className={`w-10 h-10 ${currentStepData.color}`} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Progress Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-black text-foreground tracking-tight">
              {currentStepData.title}
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              {currentStepData.description}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="w-full bg-muted border border-border rounded-full h-3 overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite] -skew-x-12 translate-x-[-100%]" />
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-muted-foreground">
              <span>System Boot</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Loading Message */}
          <div className="bg-muted border border-border rounded-xl p-3 flex items-center justify-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">
              Initializing Smartrack IOT...
            </span>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
