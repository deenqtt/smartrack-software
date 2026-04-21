// File: components/widgets/DashboardShortcut/DashboardShortcutWidget.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRight,
  Home,
  User,
  Users,
  UserCheck,
  Settings,
  Shield,
  Key,
  Globe,
  Star,
  Monitor,
  Zap,
  Cog,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Home,
  User,
  Users,
  UserCheck,
  Settings,
  Shield,
  Key,
  Globe,
  Star,
  Monitor,
  Zap,
  Cog,
};

interface Props {
  config: {
    shortcutTitle: string;
    targetType?: "dashboard" | "custom" | "manual";
    targetDashboardId?: string;
    customRoute?: string;
    icon?: string;
  };
  isEditMode?: boolean;
}

export const DashboardShortcutWidget = ({
  config,
  isEditMode = false,
}: Props) => {
  const router = useRouter();

  const IconComponent =
    config.icon && iconMap[config.icon]
      ? iconMap[config.icon]
      : LayoutDashboard;

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if in edit mode
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const targetType = config.targetType || "dashboard";
    if (targetType === "dashboard" && config.targetDashboardId) {
      router.push(`/view-dashboard/${config.targetDashboardId}`);
    } else if (
      (targetType === "custom" || targetType === "manual") &&
      config.customRoute
    ) {
      router.push(config.customRoute);
    }
  };

  if (!config || !config.shortcutTitle) {
    return (
      <div className="w-full h-full min-h-[80px] flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure shortcut
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`w-full h-full min-h-[80px] flex items-center p-4 group
                 rounded-xl shadow-sm transition-all duration-300 ease-out
                 ${
                   isEditMode
                     ? "cursor-grab active:cursor-grabbing opacity-75"
                     : "cursor-pointer hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
                 }`}
      title={
        isEditMode
          ? "Click and drag to move widget. Click Edit to save."
          : "Click to open dashboard"
      }
    >
      <div className="flex items-center gap-4 w-full overflow-hidden">
        {/* Icon Container - Flex Row Item */}
        <div
          className={`flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14
                        rounded-lg flex items-center justify-center
                        transition-all duration-300 ease-out
                        border
                        ${
                          isEditMode
                            ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600"
                            : "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800 group-hover:bg-blue-600 group-hover:text-white"
                        }`}
        >
          <IconComponent className="w-6 h-6 lg:w-7 lg:h-7" />
        </div>

        {/* Text Container - Flex Row Item */}
        <div className="flex-grow min-w-0">
          <h3
            className={`font-bold text-sm sm:text-base lg:text-lg
                       leading-tight truncate transition-colors duration-200
                       ${
                         isEditMode
                           ? "text-gray-600 dark:text-gray-400"
                           : "text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                       }`}
          >
            {config.shortcutTitle}
          </h3>

          <div
            className={`flex items-center gap-1 mt-1 text-xs transition-colors
                          ${
                            isEditMode
                              ? "text-gray-400 dark:text-gray-500"
                              : "text-gray-500 dark:text-gray-400 group-hover:text-blue-500"
                          }`}
          >
            <span>{isEditMode ? "Drag to move" : "Open Dashboard"}</span>
            <ArrowRight
              className={`w-3 h-3 transition-transform ${!isEditMode && "group-hover:translate-x-1"}`}
            />
          </div>
        </div>

        {/* Optional: End Arrow (indicator clickable) */}
        <div
          className={`flex-shrink-0 transition-opacity ${isEditMode ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}
        >
          <ArrowRight className="text-blue-500 w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
