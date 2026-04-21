import { useState, useEffect, useMemo } from "react";

export type WidgetDeviceType = 'small-mobile' | 'mobile' | 'large-mobile' | 'small-tablet' | 'tablet' | 'desktop' | 'large-desktop' | 'ultra-wide';

export interface ResponsiveWidgetSettings {
  deviceType: WidgetDeviceType;
  isSmallMobile: boolean;
  isMobile: boolean;
  isLargeMobile: boolean;
  isSmallTablet: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isUltraWide: boolean;
  // Screen properties
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  // Typography
  fontSizeScale: number;
  fontSizeClass: string;
  lineHeightScale: number;
  // Spacing - More granular
  spacingScale: number;
  paddingScale: number;
  marginScale: number;
  paddingClass: string;
  marginClass: string;
  gapClass: string;
  // Layout - Enhanced
  layoutDirection: 'horizontal' | 'vertical' | 'grid' | 'adaptive';
  layoutDensity: 'ultra-compact' | 'compact' | 'comfortable' | 'spacious';
  gridColumns: number;
  // Components - More sizes
  componentSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  iconSize: number;
  buttonSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  avatarSize: number;
  // Widget specific - Enhanced
  showLabels: boolean;
  showIcons: boolean;
  truncateText: boolean;
  compactMode: boolean;
  touchMode: boolean;
  maxItemsPerRow?: number;
  containerWidth: number;
  containerHeight: number;
  // Performance
  shouldRenderExpensiveElements: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  // Animations
  enableAnimations: boolean;
  animationDuration: 'fast' | 'normal' | 'slow';
  // BREAKPOINTS
  breakpoints: {
    '2xs': number;  // < 375px
    xs: number;     // < 480px
    sm: number;     // < 640px
    md: number;     // < 768px
    lg: number;     // < 1024px
    xl: number;     // < 1280px
    '2xl': number;  // < 1536px
  };
}

export function useResponsiveWidget(widgetType?: string): ResponsiveWidgetSettings {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
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

  // More granular breakpoints
  const breakpoints = {
    '2xs': 375,  // iPhone SE, small phones
    xs: 480,     // small tablets vertical
    sm: 640,     // large phones horizontal
    md: 768,     // tablets
    lg: 1024,    // small laptops
    xl: 1280,    // laptops
    '2xl': 1536, // large screens
  };

  const getDeviceType = (width: number, height: number): WidgetDeviceType => {
    const aspectRatio = width / height;

    // Ultra wide screens (> 2.5 ratio)
    if (aspectRatio > 2.5 && width > 2000) return 'ultra-wide';

    // Large displays
    if (width >= breakpoints['2xl']) return 'large-desktop';
    if (width >= breakpoints.xl) return 'desktop';

    // Tablets and smaller
    if (width >= breakpoints.lg) return 'tablet';
    if (width >= breakpoints.md) return 'small-tablet';

    // Mobile devices with orientation awareness
    if (width >= breakpoints.sm) {
      // Check if it's landscape phone or small tablet
      return aspectRatio > 1.2 ? 'large-mobile' : 'tablet';
    }
    if (width >= breakpoints.xs) return 'mobile';
    return 'small-mobile';
  };

  const deviceType = getDeviceType(windowSize.width, windowSize.height);

  // Screen properties
  const screenWidth = windowSize.width;
  const screenHeight = windowSize.height;
  const aspectRatio = screenWidth / screenHeight;
  const orientation: 'portrait' | 'landscape' = aspectRatio < 1 ? 'portrait' : 'landscape';
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const getResponsiveSettings = (deviceType: WidgetDeviceType): Omit<ResponsiveWidgetSettings, 'deviceType' | 'isSmallMobile' | 'isMobile' | 'isLargeMobile' | 'isSmallTablet' | 'isTablet' | 'isDesktop' | 'isLargeDesktop' | 'isUltraWide' | 'screenWidth' | 'screenHeight' | 'aspectRatio' | 'orientation' | 'pixelRatio' | 'breakpoints'> => {
    const isTouch = [
      'small-mobile', 'mobile', 'large-mobile', 'small-tablet', 'tablet'
    ].includes(deviceType);

    switch (deviceType) {
      case 'small-mobile': // < 480px
        return {
          // Typography
          fontSizeScale: 0.7,
          fontSizeClass: 'text-xs',
          lineHeightScale: 1.2,
          // Spacing
          spacingScale: 0.5,
          paddingScale: 0.5,
          marginScale: 0.25,
          paddingClass: 'p-1',
          marginClass: 'm-0.5',
          gapClass: 'gap-0.5',
          // Layout
          layoutDirection: 'vertical',
          layoutDensity: 'ultra-compact',
          gridColumns: 1,
          // Components
          componentSize: 'xs',
          iconSize: 12,
          buttonSize: 'xs',
          avatarSize: 24,
          // Widget specific
          showLabels: false,
          showIcons: true,
          truncateText: true,
          compactMode: true,
          touchMode: true,
          maxItemsPerRow: 1,
          containerWidth: screenWidth - 16,
          containerHeight: screenHeight - 100,
          // Performance
          shouldRenderExpensiveElements: false,
          imageQuality: 'low',
          // Animations
          enableAnimations: false,
          animationDuration: 'fast',
        };

      case 'mobile': // 480-640px
        return {
          fontSizeScale: 0.8,
          fontSizeClass: 'text-sm',
          lineHeightScale: 1.3,
          spacingScale: 0.65,
          paddingScale: 0.7,
          marginScale: 0.5,
          paddingClass: 'p-2',
          marginClass: 'm-1',
          gapClass: 'gap-1',
          layoutDirection: 'vertical',
          layoutDensity: 'compact',
          gridColumns: 1,
          componentSize: 'sm',
          iconSize: 16,
          buttonSize: 'sm',
          avatarSize: 28,
          showLabels: false,
          showIcons: true,
          truncateText: true,
          compactMode: true,
          touchMode: true,
          maxItemsPerRow: 1,
          containerWidth: Math.min(screenWidth - 32, 400),
          containerHeight: screenHeight - 120,
          shouldRenderExpensiveElements: false,
          imageQuality: 'low',
          enableAnimations: true,
          animationDuration: 'fast',
        };

      case 'large-mobile': // 640-768px, usually phones in landscape
        return {
          fontSizeScale: 0.85,
          fontSizeClass: 'text-sm',
          lineHeightScale: 1.4,
          spacingScale: 0.75,
          paddingScale: 0.8,
          marginScale: 0.6,
          paddingClass: 'p-2.5',
          marginClass: 'm-1',
          gapClass: 'gap-1.5',
          layoutDirection: orientation === 'landscape' ? 'horizontal' : 'vertical',
          layoutDensity: 'compact',
          gridColumns: orientation === 'landscape' ? 2 : 1,
          componentSize: 'sm',
          iconSize: 18,
          buttonSize: 'sm',
          avatarSize: 32,
          showLabels: orientation === 'landscape',
          showIcons: true,
          truncateText: orientation === 'portrait',
          compactMode: false,
          touchMode: true,
          maxItemsPerRow: orientation === 'landscape' ? 2 : 1,
          containerWidth: Math.min(screenWidth - 40, 600),
          containerHeight: screenHeight - 140,
          shouldRenderExpensiveElements: false,
          imageQuality: 'medium',
          enableAnimations: true,
          animationDuration: 'normal',
        };

      case 'small-tablet': // 768-1024px
        return {
          fontSizeScale: 0.9,
          fontSizeClass: 'text-sm',
          lineHeightScale: 1.4,
          spacingScale: 0.85,
          paddingScale: 0.9,
          marginScale: 0.7,
          paddingClass: 'p-3',
          marginClass: 'm-1',
          gapClass: 'gap-2',
          layoutDirection: 'adaptive',
          layoutDensity: 'comfortable',
          gridColumns: Math.floor((screenWidth - 80) / 200),
          componentSize: 'md',
          iconSize: 20,
          buttonSize: 'sm',
          avatarSize: 36,
          showLabels: true,
          showIcons: true,
          truncateText: false,
          compactMode: false,
          touchMode: true,
          maxItemsPerRow: 2,
          containerWidth: Math.min(screenWidth - 80, 800),
          containerHeight: screenHeight - 160,
          shouldRenderExpensiveElements: true,
          imageQuality: 'medium',
          enableAnimations: true,
          animationDuration: 'normal',
        };

      case 'tablet': // 1024-1280px
        return {
          fontSizeScale: 0.95,
          fontSizeClass: 'text-base',
          lineHeightScale: 1.5,
          spacingScale: 0.95,
          paddingScale: 1.0,
          marginScale: 0.8,
          paddingClass: 'p-4',
          marginClass: 'm-1',
          gapClass: 'gap-3',
          layoutDirection: 'grid',
          layoutDensity: 'comfortable',
          gridColumns: Math.floor((screenWidth - 100) / 220),
          componentSize: 'lg',
          iconSize: 24,
          buttonSize: 'md',
          avatarSize: 40,
          showLabels: true,
          showIcons: true,
          truncateText: false,
          compactMode: false,
          touchMode: true,
          maxItemsPerRow: 3,
          containerWidth: Math.min(screenWidth - 128, 1100),
          containerHeight: screenHeight - 180,
          shouldRenderExpensiveElements: true,
          imageQuality: 'medium',
          enableAnimations: true,
          animationDuration: 'normal',
        };

      case 'desktop': // 1280-1536px
        return {
          fontSizeScale: 1.0,
          fontSizeClass: 'text-base',
          lineHeightScale: 1.6,
          spacingScale: 1.0,
          paddingScale: 1.0,
          marginScale: 1.0,
          paddingClass: 'p-4',
          marginClass: 'm-2',
          gapClass: 'gap-4',
          layoutDirection: 'grid',
          layoutDensity: 'comfortable',
          gridColumns: Math.min(Math.floor((screenWidth - 200) / 280), 4),
          componentSize: 'lg',
          iconSize: 26,
          buttonSize: 'md',
          avatarSize: 44,
          showLabels: true,
          showIcons: true,
          truncateText: false,
          compactMode: false,
          touchMode: false,
          maxItemsPerRow: 4,
          containerWidth: Math.min(screenWidth - 256, 1400),
          containerHeight: screenHeight - 200,
          shouldRenderExpensiveElements: true,
          imageQuality: 'high',
          enableAnimations: true,
          animationDuration: 'normal',
        };

      case 'large-desktop': // 1536-2xl px
        return {
          fontSizeScale: 1.05,
          fontSizeClass: 'text-lg',
          lineHeightScale: 1.6,
          spacingScale: 1.05,
          paddingScale: 1.1,
          marginScale: 1.1,
          paddingClass: 'p-5',
          marginClass: 'm-2',
          gapClass: 'gap-4',
          layoutDirection: 'grid',
          layoutDensity: 'spacious',
          gridColumns: Math.min(Math.floor((screenWidth - 320) / 320), 5),
          componentSize: 'xl',
          iconSize: 28,
          buttonSize: 'lg',
          avatarSize: 48,
          showLabels: true,
          showIcons: true,
          truncateText: false,
          compactMode: false,
          touchMode: false,
          maxItemsPerRow: 5,
          containerWidth: Math.min(screenWidth - 320, 1600),
          containerHeight: screenHeight - 220,
          shouldRenderExpensiveElements: true,
          imageQuality: 'high',
          enableAnimations: true,
          animationDuration: 'slow',
        };

      case 'ultra-wide': // > 2000px width, wide aspect ratio
      default:
        return {
          fontSizeScale: 1.1,
          fontSizeClass: 'text-lg',
          lineHeightScale: 1.7,
          spacingScale: 1.1,
          paddingScale: 1.2,
          marginScale: 1.2,
          paddingClass: 'p-6',
          marginClass: 'm-3',
          gapClass: 'gap-5',
          layoutDirection: 'grid',
          layoutDensity: 'spacious',
          gridColumns: Math.min(Math.floor((screenWidth - 400) / 350), 6),
          componentSize: '2xl',
          iconSize: 32,
          buttonSize: 'xl',
          avatarSize: 56,
          showLabels: true,
          showIcons: true,
          truncateText: false,
          compactMode: false,
          touchMode: false,
          maxItemsPerRow: 6,
          containerWidth: Math.min(screenWidth - 400, 2200),
          containerHeight: screenHeight - 240,
          shouldRenderExpensiveElements: true,
          imageQuality: 'high',
          enableAnimations: true,
          animationDuration: 'slow',
        };
    }
  };

  const baseSettings = getResponsiveSettings(deviceType);

  return {
    // Device detection
    deviceType,
    isSmallMobile: deviceType === 'small-mobile',
    isMobile: deviceType === 'mobile',
    isLargeMobile: deviceType === 'large-mobile',
    isSmallTablet: deviceType === 'small-tablet',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isLargeDesktop: deviceType === 'large-desktop',
    isUltraWide: deviceType === 'ultra-wide',

    // Screen properties
    screenWidth,
    screenHeight,
    aspectRatio,
    orientation,
    pixelRatio,

    // Spread the base settings which include everything else + breakpoints
    ...baseSettings,

    // Breakpoints
    breakpoints,
  };
}
