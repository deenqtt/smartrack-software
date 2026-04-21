"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Edit, Trash2, Lock, Unlock, RefreshCw } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface CanvasWidgetLayout {
  i: string;
  x: number;      // Absolute X position (pixels)
  y: number;      // Absolute Y position (pixels)
  width: number;  // Widget width (pixels)
  height: number; // Widget height (pixels)
  widgetType: string;
  config: any;
  zIndex?: number;
  minW?: number;
  minH?: number;
  rotation?: number;
  visible?: boolean;
}

interface CanvasWidgetProps {
  layout: CanvasWidgetLayout;
  onLayoutChange: (newLayout: CanvasWidgetLayout, source?: 'drag' | 'resize') => void;
  isSelected: boolean;
  onSelect: () => void;
  onMouseSelect?: (event: React.MouseEvent) => void;
  zoom: number;
  canvasPan: Point;
  isEditMode?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onWidgetResize?: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
  onRotate?: (angle: number) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const CanvasWidget: React.FC<CanvasWidgetProps> = ({
  layout,
  onLayoutChange,
  isSelected,
  onSelect,
  onMouseSelect,
  zoom,
  canvasPan,
  isEditMode = false,
  onEdit,
  onDelete,
  locked = false,
  onToggleLock,
  onRotate,
  onContextMenu,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // Confirmation Dialog State for deletion
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<Point>({ x: 0, y: 0 });
  const dragStartMousePos = useRef<Point>({ x: 0, y: 0 });
  const initialSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!widgetRef.current || locked) return;

    dragStartMousePos.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = {
      x: layout.x,
      y: layout.y
    };
  }, [onMouseSelect, onSelect, layout, locked]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const scaleFactor = zoom / 100;
    const deltaX = (e.clientX - dragStartMousePos.current.x) / scaleFactor;
    const deltaY = (e.clientY - dragStartMousePos.current.y) / scaleFactor;

    // No internal snapping - delegate to parent
    const rawX = dragStartPos.current.x + deltaX;
    const rawY = dragStartPos.current.y + deltaY;

    const newLayout = {
      ...layout,
      x: Math.max(0, rawX),
      y: Math.max(0, rawY)
    };

    onLayoutChange(newLayout, 'drag');
  }, [isDragging, layout, zoom, onLayoutChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setResizeHandle(null);
  }, []);

  // Handle rotation
  const handleRotateMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (locked) return;

    setIsRotating(true);
    dragStartMousePos.current = { x: e.clientX, y: e.clientY };
  }, [locked]);

  const handleRotateMouseMove = useCallback((e: MouseEvent) => {
    if (!isRotating) return;

    const widgetCenterX = layout.x + layout.width / 2;
    const widgetCenterY = layout.y + layout.height / 2;

    const startAngle = Math.atan2(
      dragStartMousePos.current.y - widgetCenterY,
      dragStartMousePos.current.x - widgetCenterX
    );

    const currentAngle = Math.atan2(
      e.clientY - widgetCenterY,
      e.clientX - widgetCenterX
    );

    const angleDiff = ((currentAngle - startAngle) * 180) / Math.PI;

    if (Math.abs(angleDiff) > 1) {
      onRotate?.(angleDiff);
      dragStartMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isRotating, layout, onRotate]);

  // Handle resize
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (locked) return;

    setIsResizing(true);
    setResizeHandle(handle);
    dragStartMousePos.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = {
      x: layout.x,
      y: layout.y
    };
    initialSize.current = {
      width: layout.width,
      height: layout.height
    };
  }, [layout, locked]);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeHandle) return;

    const scaleFactor = zoom / 100;
    const deltaX = (e.clientX - dragStartMousePos.current.x) / scaleFactor;
    const deltaY = (e.clientY - dragStartMousePos.current.y) / scaleFactor;

    const minW = layout.minW || 50;
    const minH = layout.minH || 50;

    let newX = dragStartPos.current.x;
    let newY = dragStartPos.current.y;
    let newWidth = initialSize.current.width;
    let newHeight = initialSize.current.height;

    // Aspect ratio preservation (Shift key to disable)
    const preserveAspectRatio = !e.shiftKey;
    const aspectRatio = initialSize.current.width / initialSize.current.height;

    switch (resizeHandle) {
      case 'e':
        newWidth = Math.max(minW, initialSize.current.width + deltaX);
        break;
      case 'w':
        newWidth = Math.max(minW, initialSize.current.width - deltaX);
        newX = dragStartPos.current.x + (initialSize.current.width - newWidth);
        break;
      case 's':
        newHeight = Math.max(minH, initialSize.current.height + deltaY);
        break;
      case 'n':
        newHeight = Math.max(minH, initialSize.current.height - deltaY);
        newY = dragStartPos.current.y + (initialSize.current.height - newHeight);
        break;
      case 'se':
        newWidth = Math.max(minW, initialSize.current.width + deltaX);
        newHeight = preserveAspectRatio ? newWidth / aspectRatio : Math.max(minH, initialSize.current.height + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(minW, initialSize.current.width - deltaX);
        newHeight = preserveAspectRatio ? newWidth / aspectRatio : Math.max(minH, initialSize.current.height + deltaY);
        newX = dragStartPos.current.x + (initialSize.current.width - newWidth);
        break;
      case 'ne':
        newWidth = Math.max(minW, initialSize.current.width + deltaX);
        newHeight = preserveAspectRatio ? newWidth / aspectRatio : Math.max(minH, initialSize.current.height - deltaY);
        newY = dragStartPos.current.y + (initialSize.current.height - newHeight);
        break;
      case 'nw':
        newWidth = Math.max(minW, initialSize.current.width - deltaX);
        newHeight = preserveAspectRatio ? newWidth / aspectRatio : Math.max(minH, initialSize.current.height - deltaY);
        newX = dragStartPos.current.x + (initialSize.current.width - newWidth);
        newY = dragStartPos.current.y + (initialSize.current.height - newHeight);
        break;
    }

    // Snap to grid (10px)
    if (!preserveAspectRatio) {
      newWidth = Math.round(newWidth / 10) * 10;
      newHeight = Math.round(newHeight / 10) * 10;
      newX = Math.round(newX / 10) * 10;
      newY = Math.round(newY / 10) * 10;
    }

    onLayoutChange({
      ...layout,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    }, 'resize');
  }, [isResizing, resizeHandle, layout, zoom, onLayoutChange]);

  // Set up global listeners
  useEffect(() => {
    const moveHandler = isRotating ? handleRotateMouseMove :
      isResizing ? handleResizeMouseMove :
        handleMouseMove;
    const upHandler = handleMouseUp;

    if (isDragging || isResizing || isRotating) {
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
    }
  }, [isDragging, isResizing, isRotating, handleMouseMove, handleResizeMouseMove, handleRotateMouseMove, handleMouseUp]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmationOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    setDeleteConfirmationOpen(false);
    onDelete?.();
  }, [onDelete]);

  return (
    <div
      ref={widgetRef}
      className={`absolute select-none group ${isSelected ? 'z-50' : 'z-10'
        } ${locked ? 'cursor-not-allowed opacity-90' : 'cursor-move'}`}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        zIndex: layout.zIndex || 1,
        transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)`,
      }}
      onMouseDown={(e) => {
        if (onMouseSelect) onMouseSelect(e);
        else onSelect();

        if (!(e.target as HTMLElement).closest('.widget-controls') && !locked) {
          handleMouseDown(e);
          setIsDragging(true);
        }
      }}
    >
      {/* Selection Border - High contrast, precise */}
      {
        isSelected && (
          <div className={`absolute -inset-[2px] border-2 pointer-events-none ${locked ? 'border-orange-400 border-dashed' : 'border-blue-600'
            }`} />
        )
      }

      {/* Widget Controls - Only show on hover or selection */}
      <div className={`absolute -top-9 right-0 z-50 flex gap-1 transition-opacity duration-200 ${isSelected || isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
        {onEdit && !locked && (
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded shadow-sm border bg-white dark:bg-slate-800 hover:bg-slate-100"
            onClick={handleEditClick}
            title="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}
        {onToggleLock && (
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded shadow-sm border bg-white dark:bg-slate-800 hover:bg-slate-100"
            onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
            title={locked ? "Unlock" : "Lock"}
          >
            {locked ? <Unlock className="h-3.5 w-3.5 text-orange-500" /> : <Lock className="h-3.5 w-3.5" />}
          </Button>
        )}
        {onDelete && !locked && (
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded shadow-sm border bg-white dark:bg-slate-800 hover:bg-red-50 text-red-600"
            onClick={handleDeleteClick}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Content Container - Centered and Contained */}
      <div
        className="w-full h-full relative flex items-center justify-center overflow-hidden"
        style={{
          transform: `rotate(${layout.rotation || 0}deg)`,
          transformOrigin: 'center'
        }}
      >
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          {/* This wrapper ensures children (SVGs) fit within the box without distortion */}
          <div className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Resize Handles - Only when selected and not locked */}
      {isSelected && !locked && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `rotate(${layout.rotation || 0}deg)`,
            transformOrigin: 'center'
          }}
        >
          {['nw', 'ne', 'se', 'sw'].map((handle) => (
            <div
              key={handle}
              className={`absolute w-3 h-3 bg-white border-2 border-blue-600 z-50 pointer-events-auto ${handle === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' :
                handle === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' :
                  handle === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' :
                    '-bottom-1.5 -left-1.5 cursor-sw-resize'
                }`}
              onMouseDown={(e) => handleResizeMouseDown(e, handle)}
            />
          ))}
          {['n', 'e', 's', 'w'].map((handle) => (
            <div
              key={handle}
              className={`absolute w-2.5 h-2.5 bg-white border border-blue-600 z-50 pointer-events-auto ${handle === 'n' ? '-top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize' :
                handle === 'e' ? 'top-1/2 -right-1.5 -translate-y-1/2 cursor-e-resize' :
                  handle === 's' ? '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize' :
                    'top-1/2 -left-1.5 -translate-y-1/2 cursor-w-resize'
                }`}
              onMouseDown={(e) => handleResizeMouseDown(e, handle)}
            />
          ))}

          {/* Rotation Handle */}
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center bg-white border border-blue-600 rounded-full cursor-grab shadow-sm z-50 hover:bg-blue-50 pointer-events-auto"
            onMouseDown={handleRotateMouseDown}
            title="Rotate"
          >
            <RefreshCw className="w-3 h-3 text-blue-600" />
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={deleteConfirmationOpen}
        onOpenChange={setDeleteConfirmationOpen}
        type="destructive"
        title="Delete Widget"
        description="Are you sure you want to delete this widget?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmationOpen(false)}
      />
    </div >
  );
};

export default CanvasWidget;
export type { CanvasWidgetLayout };
