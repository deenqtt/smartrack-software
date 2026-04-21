"use client";

import React, { useState, useRef, useLayoutEffect } from "react";
import { AlertTriangle, Loader2, WifiOff, Wifi, FileText, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface Props {
  config: {
    customName: string;
    // Document configuration
    documentUrl: string;
    documentTitle: string;
    showDownload: boolean;
    showZoom: boolean;
    showRotate: boolean;
    defaultZoom: number;
    // Layout configuration
    padding: 'sm' | 'md' | 'lg' | 'xl';
    backgroundColor: string;
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  };
  isEditMode?: boolean;
}

export const DocumentViewerWidget = ({ config, isEditMode = false }: Props) => {
  const [status, setStatus] = useState<"loading" | "error" | "ok">("ok");
  const [zoom, setZoom] = useState(config.defaultZoom || 100);
  const [rotation, setRotation] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Document controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (config.documentUrl) {
      const link = document.createElement('a');
      link.href = config.documentUrl;
      link.download = config.documentTitle || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Document viewer toolbar
  const DocumentToolbar = () => (
    <div className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-lg flex items-center gap-2 z-10">
      {config.showZoom && (
        <>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded hover:bg-white/20 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs min-w-[40px] text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded hover:bg-white/20 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </>
      )}

      {config.showRotate && (
        <button
          onClick={handleRotate}
          className="p-2 rounded hover:bg-white/20 transition-colors"
          title="Rotate"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      )}

      {config.showDownload && (
        <button
          onClick={handleDownload}
          className="p-2 rounded hover:bg-white/20 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // Get file extension for preview capability check
  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toLowerCase() || '';
  };

  const canPreview = (url: string) => {
    const ext = getFileExtension(url);
    return ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
  };

  // Main render
  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden
                 bg-slate-50 dark:bg-slate-800 border border-slate-200/60
                 dark:border-slate-700/60 rounded-xl shadow-sm dark:shadow-lg
                 hover:shadow-md dark:hover:shadow-xl transition-all duration-300
                 ${isEditMode ? 'cursor-grab' : 'cursor-pointer'}`}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-4 bg-slate-50/80 dark:bg-slate-800/40
                      flex items-center justify-between z-20"
           style={{ height: "48px" }}>
        <h3 className="font-semibold truncate text-slate-700 dark:text-slate-300">
          {config.customName}
        </h3>
      </div>

      {/* Document Container */}
      <div className="w-full h-full flex flex-col" style={{ paddingTop: "52px" }}>
        <div className={`flex-1 overflow-hidden ${paddingClasses[config.padding]} relative`}>
          {status === "loading" && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p className="text-sm">Failed to load document</p>
            </div>
          )}

          {status === "ok" && config.documentUrl && (
            <div className="relative w-full h-full bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
              {canPreview(config.documentUrl) ? (
                <iframe
                  ref={iframeRef}
                  src={config.documentUrl}
                  className={`w-full h-full border-0 ${isEditMode ? 'pointer-events-none' : ''}`}
                  title={config.documentTitle || "Document Viewer"}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.3s ease'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <FileText className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Document Preview Not Available</p>
                  <p className="text-sm text-center mb-4">
                    This file type cannot be previewed directly in the browser.
                  </p>
                  {config.showDownload && (
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Document
                    </button>
                  )}
                </div>
              )}

              {/* Toolbar */}
              {(config.showZoom || config.showRotate || config.showDownload) && !isEditMode && (
                <DocumentToolbar />
              )}
            </div>
          )}

          {(!config.documentUrl) && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">No document URL configured</p>
            </div>
          )}
        </div>

        {/* Document Title */}
        {config.documentTitle && (
          <div className="px-4 pb-2">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {config.documentTitle}
            </h4>
          </div>
        )}
      </div>
    </div>
  );
};
