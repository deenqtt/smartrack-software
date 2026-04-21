// Design System for Redesigned Charts
// Unified colors, typography, spacing, and component styles

export const chartDesignSystem = {
  // Color Palette
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb', // Main primary
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Semantic Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a', // Main success
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706', // Main warning
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },

    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626', // Main danger
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    // Neutral Colors
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252', // Main neutral
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },

    // Chart Specific Colors
    chart: {
      blue: '#2563eb',
      green: '#16a34a',
      amber: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
      cyan: '#0891b2',
      orange: '#ea580c',
      pink: '#db2777',
      indigo: '#4338ca',
      teal: '#0d9488',
    },

    // Background Colors
    background: {
      light: '#ffffff',
      dark: '#020617',
      card: '#020617',
      overlay: '#0f172a',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      primary: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, Consolas, monospace',
    },

    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },

    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  // Layout Proportions
  layout: {
    headerHeight: 0.20,    // 20% of total height
    chartArea: 0.70,       // 70% of total height
    footerHeight: 0.10,    // 10% of total height
    sidebarWidth: 280,     // Fixed sidebar width
    minWidgetWidth: 320,   // Minimum widget width
    minWidgetHeight: 240,  // Minimum widget height
  },

  // Chart Specific Settings
  chart: {
    // ECharts theme colors
    theme: {
      color: [
        '#2563eb', // primary
        '#16a34a', // success
        '#d97706', // warning
        '#dc2626', // danger
        '#7c3aed', // purple
        '#0891b2', // cyan
        '#ea580c', // orange
        '#db2777', // pink
      ],
    },

    // Grid settings
    grid: {
      left: '8%',
      right: '8%',
      top: '12%',
      bottom: '12%',
      containLabel: true,
    },

    // Animation settings
    animation: {
      duration: 1000,
      easing: 'cubicOut',
      delay: 0,
    },

    // Tooltip settings
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1e293b',
        fontSize: 12,
      },
      axisPointer: {
        type: 'cross',
        lineStyle: {
          color: '#94a3b8',
          width: 1,
        },
      },
    },

    // Dark mode tooltip settings
    tooltipDark: {
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#475569',
      borderWidth: 1,
      textStyle: {
        color: '#f8fafc',
        fontSize: 12,
      },
      axisPointer: {
        type: 'cross',
        lineStyle: {
          color: '#64748b',
          width: 1,
        },
      },
    },

    // Legend settings
    legend: {
      orient: 'horizontal',
      bottom: '8%',
      textStyle: {
        color: '#64748b',
        fontSize: 12,
      },
    },

    // Dark mode legend settings
    legendDark: {
      orient: 'horizontal',
      bottom: '8%',
      textStyle: {
        color: '#cbd5e1',
        fontSize: 12,
      },
    },

    // Axis and grid colors for light mode
    axisLight: {
      textColor: '#64748b',
      lineColor: '#d4d4d8',
      splitLineColor: '#f1f5f9',
    },

    // Axis and grid colors for dark mode
    axisDark: {
      textColor: '#cbd5e1',
      lineColor: '#475569',
      splitLineColor: '#334155',
    },

    // Text colors for light mode
    textLight: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
    },

    // Text colors for dark mode
    textDark: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      muted: '#64748b',
    },
  },

  // Responsive breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },
};

// Utility functions
export const getChartColor = (index: number): string => {
  const colors = chartDesignSystem.chart.theme.color;
  return colors[index % colors.length];
};

export const getStatusColor = (status: 'success' | 'warning' | 'danger' | 'info'): string => {
  const colors = chartDesignSystem.colors;
  switch (status) {
    case 'success': return colors.success[600];
    case 'warning': return colors.warning[600];
    case 'danger': return colors.danger[600];
    case 'info': return colors.primary[600];
    default: return colors.neutral[600];
  }
};

export const getResponsiveSize = (
  baseSize: number,
  containerWidth: number,
  minSize: number = 8,
  maxSize: number = 24
): number => {
  const scale = Math.min(containerWidth / 400, 2); // Scale based on 400px reference
  return Math.max(minSize, Math.min(maxSize, baseSize * scale));
};

// Export types
export type ChartColorScheme = keyof typeof chartDesignSystem.colors.chart;
export type StatusType = 'success' | 'warning' | 'danger' | 'info';
export type Breakpoint = keyof typeof chartDesignSystem.breakpoints;
