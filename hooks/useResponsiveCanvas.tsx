import { useState, useEffect } from "react";

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveSettings {
  deviceType: DeviceType;
  canvasWidth: number;
  canvasHeight: number;
  fontSizeMultiplier: number;
  iconSizeMultiplier: number;
  horizontalLayoutPreferred: boolean;
  compactMode: boolean;
  showLabels: boolean;
}

export function useResponsiveCanvas(): ResponsiveSettings {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDeviceType = (width: number): DeviceType => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  const deviceType = getDeviceType(windowSize.width);

  const getResponsiveSettings = (deviceType: DeviceType): Omit<ResponsiveSettings, 'deviceType'> => {
    switch (deviceType) {
      case 'mobile':
        return {
          canvasWidth: Math.min(windowSize.width - 32, 400), // Account for padding
          canvasHeight: 300,
          fontSizeMultiplier: 0.8,
          iconSizeMultiplier: 0.9,
          horizontalLayoutPreferred: false, // Vertical stacking on mobile
          compactMode: true,
          showLabels: false, // Hide labels by default on very small screens
        };

      case 'tablet':
        return {
          canvasWidth: Math.min(windowSize.width - 64, 600),
          canvasHeight: 400,
          fontSizeMultiplier: 1.0,
          iconSizeMultiplier: 1.0,
          horizontalLayoutPreferred: true, // Horizontal layout on tablet
          compactMode: false,
          showLabels: true,
        };

      case 'desktop':
      default:
        return {
          canvasWidth: 800,
          canvasHeight: 600,
          fontSizeMultiplier: 1.2,
          iconSizeMultiplier: 1.2,
          horizontalLayoutPreferred: true,
          compactMode: false,
          showLabels: true,
        };
    }
  };

  const settings = {
    deviceType,
    ...getResponsiveSettings(deviceType),
  };

  return settings;
}
