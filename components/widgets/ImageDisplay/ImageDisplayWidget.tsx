"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  config: {
    customName: string;
    imageUrl: string;
    fitMode: "contain" | "cover" | "fill" | "scale-down";
    borderRadius: "none" | "sm" | "md" | "lg" | "xl";
    borderWidth: number;
    borderColor: string;
    backgroundColor: string;
  };
}

export const ImageDisplayWidget = ({ config }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  // Border radius mapping
  const borderRadiusClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
  };

  // Object-fit mapping
  const fitModeClasses = {
    contain: "object-contain",
    cover: "object-cover",
    fill: "object-fill",
    "scale-down": "object-scale-down",
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      {/* Loading State */}
      {isLoading && !imageError && (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-sm text-muted-foreground">Loading image...</p>
        </div>
      )}

      {/* Error State */}
      {imageError && (
        <div className="flex flex-col items-center justify-center h-full w-full text-red-500 p-4">
          <AlertTriangle className="w-12 h-12 mb-4 opacity-70" />
          <p className="text-sm font-medium text-center">Failed to load image</p>
          <p className="text-xs text-muted-foreground mt-2 text-center break-all">
            {config.imageUrl || "No URL provided"}
          </p>
        </div>
      )}

      {/* Image Container */}
      {config.imageUrl && !imageError && (
        <div
          className={`w-full h-full ${borderRadiusClasses[config.borderRadius]}`}
          style={{
            border:
              config.borderWidth > 0
                ? `${config.borderWidth}px solid ${config.borderColor}`
                : "none",
            backgroundColor: config.backgroundColor || "transparent",
            overflow: "hidden",
          }}
        >
          <img
            src={config.imageUrl}
            alt={config.customName || "Image Display"}
            className={`w-full h-full ${fitModeClasses[config.fitMode]}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      )}

      {/* No URL State */}
      {!config.imageUrl && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full w-full text-slate-500 p-4">
          <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm">No image URL configured</p>
        </div>
      )}
    </div>
  );
};
