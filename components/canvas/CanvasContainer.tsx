"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface CanvasContainerProps {
  children: React.ReactNode;
  className?: string;
  canvasZoom?: number;
  canvasPan?: Point;
  onCanvasChange?: (zoom: number, pan: Point) => void;
  isDragMode?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({
  children,
  className = '',
  canvasZoom = 100,
  canvasPan = { x: 0, y: 0 },
  onCanvasChange,
  isDragMode = false,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu
}) => {
  const [zoom, setZoom] = useState(canvasZoom);
  const [panOffset, setPanOffset] = useState<Point>(canvasPan);

  // Sync internal state with props when they change
  useEffect(() => {
    setZoom(canvasZoom);
  }, [canvasZoom]);

  useEffect(() => {
    setPanOffset(canvasPan);
  }, [canvasPan]);
  const [isPanning, setIsPanning] = useState(false);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPanPoint = useRef<Point>({ x: 0, y: 0 });

  // Zoom handler (mouse wheel)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(10, Math.min(500, zoom * zoomFactor));
    setZoom(newZoom);

    if (onCanvasChange) {
      onCanvasChange(newZoom, panOffset);
    }
  }, [zoom, panOffset, onCanvasChange]);

  // Pan handler (mouse drag for both drag mode and middle wheel button)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Call external handler first
    if (onMouseDown) onMouseDown(e);

    if (e.button === 0 && isDragMode) { // Left click in drag mode
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    } else if (e.button === 1) { // Middle mouse wheel button - ALWAYS enable pan
      setIsMiddlePanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, [isDragMode, onMouseDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Call external handler first
    if (onMouseMove) onMouseMove(e);

    if (isPanning || isMiddlePanning) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPoint.current.x;
      const deltaY = e.clientY - lastPanPoint.current.y;

      const newPanOffset = {
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY
      };

      setPanOffset(newPanOffset);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };

      if (onCanvasChange) {
        onCanvasChange(zoom, newPanOffset);
      }
    }
  }, [isPanning, isMiddlePanning, panOffset, zoom, onCanvasChange, onMouseMove]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Call external handler first
    if (onMouseUp) onMouseUp(e);

    setIsPanning(false);
    setIsMiddlePanning(false);

    // Prevent browser's default middle wheel button behavior
    if (e.button === 1) {
      e.preventDefault();
    }
  }, [onMouseUp]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only respond to keyboard shortcuts when not typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          zoomIn();
        }
        break;
      case '-':
      case '_':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          zoomOut();
        }
        break;
      case '0':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          resetView();
        }
        break;
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });

      // Add keyboard listener to document for global shortcuts
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        container.removeEventListener('wheel', handleWheel);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleWheel, handleKeyDown]);

  // Zoom controls
  const resetView = () => {
    const newPanOffset = { x: 0, y: 0 };
    const newZoom = 100;
    setZoom(newZoom);
    setPanOffset(newPanOffset);
    if (onCanvasChange) {
      onCanvasChange(newZoom, newPanOffset);
    }
  };

  const zoomIn = () => {
    const newZoom = Math.min(500, zoom + 25);
    setZoom(newZoom);
    if (onCanvasChange) {
      onCanvasChange(newZoom, panOffset);
    }
  };

  const zoomOut = () => {
    const newZoom = Math.max(10, zoom - 25);
    setZoom(newZoom);
    if (onCanvasChange) {
      onCanvasChange(newZoom, panOffset);
    }
  };



  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900 ${className}`}>
      {/* Canvas Area */}
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden ${isDragMode || isMiddlePanning
          ? 'cursor-grab active:cursor-grabbing'
          : 'cursor-default'
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={onContextMenu}
        style={{
          cursor: isDragMode ? (isPanning ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none'
        }}
      >
        {/* Grid Background */}
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,.15) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,.05) 20px, transparent 20px),
              linear-gradient(90deg, rgba(0,0,0,.05) 20px, transparent 20px)
            `,
            backgroundSize: `20px 20px`,
            backgroundPosition: `${panOffset.x % 20}px ${panOffset.y % 20}px`
          }}
        />

        {/* Canvas Transform Container */}
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Widgets Container */}
          <div className="relative min-w-[3000px] min-h-[2000px] p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasContainer;
