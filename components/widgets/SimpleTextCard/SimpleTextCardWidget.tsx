"use client";

import React from "react";

export interface SimpleTextCardConfig {
  title?: string;
  content: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: "sm" | "md" | "lg" | "xl";
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  textAlign?: "left" | "center" | "right" | "justify";
  padding?: "sm" | "md" | "lg";
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl";
  showBorder?: boolean;
  borderColor?: string;
}

interface SimpleTextCardWidgetProps {
  config: SimpleTextCardConfig;
}

const fontSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
} as const;

const fontWeightMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

const textAlignMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
} as const;

const paddingMap = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

const borderRadiusMap = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
} as const;

const DEFAULT_BG = "#ffffff";
const DEFAULT_TEXT = "#000000";

export function SimpleTextCardWidget({ config }: SimpleTextCardWidgetProps) {
  const {
    title,
    content,
    textColor = DEFAULT_TEXT,
    backgroundColor = DEFAULT_BG,
    fontSize = "md",
    fontWeight = "normal",
    textAlign = "left",
    padding = "md",
    borderRadius = "md",
    showBorder = true,
    borderColor = "#e5e7eb",
  } = config;

  const useDefaultBg = backgroundColor === DEFAULT_BG;
  const useDefaultText = textColor === DEFAULT_TEXT;

  // When using default colors → apply dark mode Tailwind classes
  // When custom colors → use inline styles (user is responsible for color contrast)
  const borderClass = showBorder
    ? useDefaultBg
      ? "border border-slate-200 dark:border-slate-700"
      : "border"
    : "";

  return (
    <div
      className={[
        "w-full h-full flex flex-col overflow-hidden",
        borderRadiusMap[borderRadius],
        borderClass,
        useDefaultBg ? "bg-white dark:bg-slate-900" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundColor: useDefaultBg ? undefined : backgroundColor,
        borderColor: showBorder && !useDefaultBg ? borderColor : undefined,
      }}
    >
      {/* Title header — styled like IconStatusCard header */}
      {title && (
        <div
          className={[
            "px-4 py-2.5 flex-shrink-0 border-b",
            useDefaultBg
              ? "border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40"
              : "border-slate-200/30",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            borderBottomColor:
              !useDefaultBg && showBorder ? `${borderColor}60` : undefined,
          }}
        >
          <h3
            className={[
              fontSizeMap[fontSize],
              fontWeightMap[fontWeight],
              useDefaultText ? "text-slate-700 dark:text-slate-200" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ color: useDefaultText ? undefined : textColor }}
          >
            {title}
          </h3>
        </div>
      )}

      {/* Content body */}
      <div
        className={[
          paddingMap[padding],
          fontSizeMap[fontSize],
          fontWeightMap[fontWeight],
          textAlignMap[textAlign],
          "whitespace-pre-wrap break-words flex-1 min-h-0 overflow-auto leading-relaxed",
          useDefaultText ? "text-slate-800 dark:text-slate-200" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ color: useDefaultText ? undefined : textColor }}
      >
        {content || (
          <span className="opacity-40 italic text-slate-500 dark:text-slate-400">
            No content
          </span>
        )}
      </div>
    </div>
  );
}
