"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface AdvancedCardConfig {
  // Header
  showHeader: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  headerIcon?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;

  // Content
  contentType: "text" | "image" | "mixed";
  contentText?: string;
  contentImageUrl?: string;
  contentImageAlt?: string;
  contentImageFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  contentBackgroundColor?: string;
  contentTextColor?: string;
  contentPadding?: "sm" | "md" | "lg";

  // Footer
  showFooter: boolean;
  footerText?: string;
  footerButtons?: Array<{
    id: string;
    label: string;
    variant: "default" | "outline" | "secondary" | "destructive";
    action?: "link" | "modal" | "none";
    actionUrl?: string;
  }>;
  footerBackgroundColor?: string;
  footerTextColor?: string;

  // Card Layout
  cardBackgroundColor?: string;
  cardBorderColor?: string;
  cardBorderRadius?: "none" | "sm" | "md" | "lg" | "xl";
  cardShadow?: "none" | "sm" | "md" | "lg";
  cardWidth?: "auto" | "full";
  cardHeight?: "auto" | "fixed";

  // Badges/Tags
  showBadges?: boolean;
  badges?: Array<{
    id: string;
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }>;
}

interface AdvancedCardWidgetProps {
  config: AdvancedCardConfig;
}

const borderRadiusMap = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
} as const;

const shadowMap = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
} as const;

const paddingMap = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

const imageFitMap = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  none: "object-none",
  "scale-down": "object-scale-down",
} as const;

const DEFAULT_BG = "#ffffff";
const DEFAULT_HEADER_BG = "#f8fafc";
const DEFAULT_TEXT = "#000000";
const DEFAULT_BORDER = "#e5e7eb";

export function AdvancedCardWidget({ config }: AdvancedCardWidgetProps) {
  const {
    showHeader = true,
    headerTitle,
    headerSubtitle,
    headerIcon,
    headerBackgroundColor = DEFAULT_HEADER_BG,
    headerTextColor = DEFAULT_TEXT,

    contentType = "text",
    contentText,
    contentImageUrl,
    contentImageAlt,
    contentImageFit = "cover",
    contentBackgroundColor = DEFAULT_BG,
    contentTextColor = DEFAULT_TEXT,
    contentPadding = "md",

    showFooter = false,
    footerText,
    footerButtons = [],
    footerBackgroundColor = DEFAULT_HEADER_BG,
    footerTextColor = DEFAULT_TEXT,

    cardBackgroundColor = DEFAULT_BG,
    cardBorderColor = DEFAULT_BORDER,
    cardBorderRadius = "md",
    cardShadow = "md",

    showBadges = false,
    badges = [],
  } = config;

  // Smart dark mode: default colors → Tailwind dark classes
  // Custom colors → inline styles (user controls contrast)
  const useDefaultCardBg = cardBackgroundColor === DEFAULT_BG;
  const useDefaultHeaderBg = headerBackgroundColor === DEFAULT_HEADER_BG;
  const useDefaultHeaderText = headerTextColor === DEFAULT_TEXT;
  const useDefaultContentBg = contentBackgroundColor === DEFAULT_BG;
  const useDefaultContentText = contentTextColor === DEFAULT_TEXT;
  const useDefaultFooterBg = footerBackgroundColor === DEFAULT_HEADER_BG;
  const useDefaultFooterText = footerTextColor === DEFAULT_TEXT;
  const useDefaultBorder = cardBorderColor === DEFAULT_BORDER;

  const hasHeader = showHeader && (headerTitle || headerSubtitle);
  const hasFooter =
    showFooter && (footerText || (footerButtons && footerButtons.length > 0));

  return (
    <div
      className={[
        "w-full h-full flex flex-col overflow-hidden",
        borderRadiusMap[cardBorderRadius],
        shadowMap[cardShadow],
        "border",
        useDefaultCardBg ? "bg-card" : "",
        useDefaultBorder
          ? "border-border/60"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundColor: useDefaultCardBg ? undefined : cardBackgroundColor,
        borderColor: useDefaultBorder ? undefined : cardBorderColor,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      {hasHeader && (
        <div
          className={[
            "px-4 py-3 flex-shrink-0 border-b flex items-start justify-between gap-2",
            useDefaultHeaderBg
              ? "bg-muted/30 border-border/40"
              : "border-border/20",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            backgroundColor: useDefaultHeaderBg ? undefined : headerBackgroundColor,
            borderBottomColor: !useDefaultHeaderBg
              ? `${cardBorderColor}60`
              : undefined,
          }}
        >
          <div className="flex-1 min-w-0">
            {headerTitle && (
              <div
                className={[
                  "flex items-center gap-2 font-semibold text-base leading-tight",
                  useDefaultHeaderText
                    ? "text-foreground dark:text-white"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ color: useDefaultHeaderText ? undefined : headerTextColor }}
              >
                {headerIcon && (
                  <span className="text-lg leading-none flex-shrink-0">
                    {headerIcon}
                  </span>
                )}
                <span className="truncate">{headerTitle}</span>
              </div>
            )}
            {headerSubtitle && (
              <p
                className={[
                  "text-sm mt-0.5 leading-snug",
                  useDefaultHeaderText
                    ? "text-muted-foreground"
                    : "opacity-75",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  color: useDefaultHeaderText ? undefined : headerTextColor,
                }}
              >
                {headerSubtitle}
              </p>
            )}
          </div>
 
          {showBadges && badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {badges.map((badge) => (
                <Badge key={badge.id} variant={badge.variant} className="text-xs text-white">
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
 
      {/* ── Content ────────────────────────────────────────────────── */}
      <div
        className={[
          "flex-1 min-h-0 overflow-auto",
          useDefaultContentBg ? "bg-card" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          backgroundColor: useDefaultContentBg ? undefined : contentBackgroundColor,
        }}
      >
        {contentType === "text" && (
          <div
            className={[
              paddingMap[contentPadding],
              "whitespace-pre-wrap break-words text-sm leading-relaxed h-full",
              useDefaultContentText ? "text-slate-800 dark:text-slate-200" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ color: useDefaultContentText ? undefined : contentTextColor }}
          >
            {contentText || (
              <span className="opacity-40 italic text-slate-500 dark:text-slate-400">
                No content
              </span>
            )}
          </div>
        )}

        {contentType === "image" && (
          <div className="w-full h-full min-h-[80px] overflow-hidden">
            {contentImageUrl ? (
              <img
                src={contentImageUrl}
                alt={contentImageAlt || "Card image"}
                className={`w-full h-full ${imageFitMap[contentImageFit]}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                  No image URL set
                </span>
              </div>
            )}
          </div>
        )}

        {contentType === "mixed" && (
          <div className="h-full flex flex-col">
            {contentImageUrl && (
              <div className="w-full flex-shrink-0 overflow-hidden" style={{ height: "45%" }}>
                <img
                  src={contentImageUrl}
                  alt={contentImageAlt || "Card image"}
                  className={`w-full h-full ${imageFitMap[contentImageFit]}`}
                />
              </div>
            )}
            {contentText && (
              <div
                className={[
                  paddingMap[contentPadding],
                  "flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed overflow-auto",
                  useDefaultContentText
                    ? "text-slate-800 dark:text-slate-200"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  color: useDefaultContentText ? undefined : contentTextColor,
                }}
              >
                {contentText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      {hasFooter && (
        <div
          className={[
            "px-4 py-3 flex-shrink-0 border-t",
            useDefaultFooterBg
              ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60"
              : "border-slate-200/30",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            backgroundColor: useDefaultFooterBg ? undefined : footerBackgroundColor,
            borderTopColor: !useDefaultFooterBg
              ? `${cardBorderColor}60`
              : undefined,
          }}
        >
          {footerText && (
            <p
              className={[
                "text-sm mb-2",
                useDefaultFooterText
                  ? "text-slate-600 dark:text-slate-400"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                color: useDefaultFooterText ? undefined : footerTextColor,
              }}
            >
              {footerText}
            </p>
          )}

          {footerButtons && footerButtons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {footerButtons.map((button) => (
                <Button
                  key={button.id}
                  variant={button.variant}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    if (button.action === "link" && button.actionUrl) {
                      window.open(button.actionUrl, "_blank");
                    }
                  }}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
