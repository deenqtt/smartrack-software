// Icon library helper for Lucide React icons
import * as Icons from 'lucide-react';
import React, { ComponentType } from 'react';

export function getIcon(iconName: string): ComponentType<any> | null {
  const icons: Record<string, any> = Icons;
  return icons[iconName] || null;
}

export function renderMenuIcon(iconName: string, className = "h-4 w-4"): React.ReactElement | null {
  const Icon = getIcon(iconName);
  return Icon ? React.createElement(Icon, { className }) : null;
}

export function getIconWithFallback(iconName: string | undefined, className = "h-4 w-4"): React.ReactElement {
  const safeIconName = iconName || 'Menu';
  const Icon = getIcon(safeIconName);
  if (Icon) {
    return React.createElement(Icon, { className });
  }
  // Fallback to default icon (Menu is commonly available)
  return React.createElement(Icons.Menu, { className });
}

// Alias for compatibility with existing imports
export function getIconComponent(iconName: string): ComponentType<any> | null {
  return getIcon(iconName);
}

// Icon library object for components that need the full collection
export const iconLibrary = Icons;
