"use client";

import React, { useState, useRef, useLayoutEffect } from "react";
import { AlertTriangle, Loader2, WifiOff, Wifi, Image as ImageIcon, Link as LinkIcon, ExternalLink } from "lucide-react";

interface Props {
  config: {
    customName: string;
    // Header configuration
    showHeader: boolean;
    headerText: string;
    headerSize: 'sm' | 'md' | 'lg' | 'xl';
    headerColor: string;
    headerAlign: 'left' | 'center' | 'right';
    // Content configuration
    contentText: string;
    contentSize: 'sm' | 'md' | 'lg' | 'xl';
    contentColor: string;
    contentAlign: 'left' | 'center' | 'right';
    // Footer configuration
    showFooter: boolean;
    footerText: string;
    footerSize: 'sm' | 'md' | 'lg' | 'xl';
    footerColor: string;
    footerAlign: 'left' | 'center' | 'right';
    // Image configuration
    showImage: boolean;
    imageUrl: string;
    imageAlt: string;
    imagePosition: 'top' | 'bottom' | 'left' | 'right';
    imageSize: 'sm' | 'md' | 'lg' | 'xl';
    imageFit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    // Links configuration
    showLinks: boolean;
    links: Array<{
      id: string;
      text: string;
      url: string;
      openInNewTab: boolean;
      style: 'button' | 'text' | 'underline';
      color: string;
    }>;
    // Layout configuration
    padding: 'sm' | 'md' | 'lg' | 'xl';
    backgroundColor: string;
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  };
}

export const TextCardWidget = ({ config }: Props) => {
  const [status, setStatus] = useState<"loading" | "error" | "ok">("ok");
  const [imageError, setImageError] = useState(false);

  // Responsive layout system
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal" | "wide">("normal");

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const aspectRatio = width / height;
      const area = width * height;
      const minDimension = Math.min(width, height);

      let currentLayoutMode: "compact" | "normal" | "wide";

      if (area < 10000 || minDimension < 100) {
        currentLayoutMode = "compact";
      } else if (aspectRatio > 1.5 && width > 250) {
        currentLayoutMode = "wide";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  // Size mapping
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  };

  const paddingClasses = {
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8"
  };

  const borderRadiusClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl"
  };

  const shadowClasses = {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl"
  };

  const imageSizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-48 h-48"
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  // Render image component
  const renderImage = () => {
    if (!config.showImage || !config.imageUrl || imageError) {
      if (config.showImage && config.imageUrl && imageError) {
        return (
          <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg ${imageSizeClasses[config.imageSize]}`}>
            <div className="text-center">
              <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <span className="text-xs text-slate-500">Image Error</span>
            </div>
          </div>
        );
      }
      return null;
    }

    return (
      <img
        src={config.imageUrl}
        alt={config.imageAlt || "Widget image"}
        className={`${imageSizeClasses[config.imageSize]} object-${config.imageFit} rounded-lg`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    );
  };

  // Render links component
  const renderLinks = () => {
    if (!config.showLinks || !config.links || config.links.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {config.links.map((link) => {
          const linkClasses = {
            button: `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${link.color || 'bg-blue-500 hover:bg-blue-600 text-white'}`,
            text: `text-sm font-medium transition-colors ${link.color || 'text-blue-500 hover:text-blue-600'}`,
            underline: `text-sm font-medium underline transition-colors ${link.color || 'text-blue-500 hover:text-blue-600'}`
          };

          return (
            <a
              key={link.id}
              href={link.url}
              target={link.openInNewTab ? "_blank" : "_self"}
              rel={link.openInNewTab ? "noopener noreferrer" : undefined}
              className={linkClasses[link.style]}
            >
              {link.text}
              {link.openInNewTab && <ExternalLink className="w-3 h-3 ml-1" />}
            </a>
          );
        })}
      </div>
    );
  };

  // Main render
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden cursor-pointer
                 rounded-xl shadow-sm dark:shadow-lg
                 hover:shadow-md dark:hover:shadow-xl transition-all duration-300"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-4 bg-slate-50/80 dark:bg-slate-800/40
                      flex items-center justify-between"
           style={{ height: "48px" }}>
        <h3 className="font-semibold truncate text-slate-700 dark:text-slate-300">
          {config.customName}
        </h3>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex flex-col" style={{ paddingTop: "52px" }}>
        <div className={`flex-1 overflow-auto ${paddingClasses[config.padding]}`}>
          {status === "loading" && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center h-32 text-red-500">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p className="text-sm">Failed to load content</p>
            </div>
          )}

          {status === "ok" && (
            <div
              className={`w-full h-full flex flex-col justify-center ${config.backgroundColor ? '' : 'bg-transparent'}`}
              style={{ backgroundColor: config.backgroundColor || 'transparent' }}
            >
              {/* Header Text */}
              {config.showHeader && config.headerText && (
                <div className={`mb-4 text-${config.headerAlign}`}>
                  <h4
                    className={`${sizeClasses[config.headerSize]} font-bold`}
                    style={{ color: config.headerColor || '#1f2937' }}
                  >
                    {config.headerText}
                  </h4>
                </div>
              )}

              {/* Image - Top Position */}
              {config.showImage && config.imagePosition === 'top' && (
                <div className="flex justify-center mb-4">
                  {renderImage()}
                </div>
              )}

              {/* Content Layout */}
              <div className={`flex-1 flex ${config.showImage && (config.imagePosition === 'left' || config.imagePosition === 'right') ? 'items-center gap-4' : 'flex-col'}`}>

                {/* Image - Left Position */}
                {config.showImage && config.imagePosition === 'left' && (
                  <div className="flex-shrink-0">
                    {renderImage()}
                  </div>
                )}

                {/* Main Content Text */}
                <div className={`flex-1 text-${config.contentAlign}`}>
                  <div
                    className={`${sizeClasses[config.contentSize]} leading-relaxed`}
                    style={{ color: config.contentColor || '#374151' }}
                    dangerouslySetInnerHTML={{
                      __html: config.contentText.replace(/\n/g, '<br />')
                    }}
                  />
                </div>

                {/* Image - Right Position */}
                {config.showImage && config.imagePosition === 'right' && (
                  <div className="flex-shrink-0">
                    {renderImage()}
                  </div>
                )}
              </div>

              {/* Image - Bottom Position */}
              {config.showImage && config.imagePosition === 'bottom' && (
                <div className="flex justify-center mt-4">
                  {renderImage()}
                </div>
              )}

              {/* Links */}
              {renderLinks()}

              {/* Footer Text */}
              {config.showFooter && config.footerText && (
                <div className={`mt-4 text-${config.footerAlign}`}>
                  <p
                    className={`${sizeClasses[config.footerSize]} text-slate-600 dark:text-slate-400`}
                    style={{ color: config.footerColor || '#6b7280' }}
                  >
                    {config.footerText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
