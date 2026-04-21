"use client";

import React, { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyWrapperProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string | undefined;
}

/**
 * LazyWrapper Component
 *
 * Provides a standardized way to lazy load heavy components
 * with consistent loading states and error boundaries.
 */
export function LazyWrapper({
  children,
  fallback,
  className = ""
}: LazyWrapperProps) {
  const defaultFallback = (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

interface LazyComponentProps {
  importFunc: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * LazyComponent
 *
 * Dynamically loads a component with lazy loading
 */
export function LazyComponent({
  importFunc,
  fallback,
  className,
  ...props
}: LazyComponentProps & Record<string, any>) {
  const LazyComp = lazy(importFunc);

  return (
    <LazyWrapper fallback={fallback} className={className}>
      <LazyComp {...props} />
    </LazyWrapper>
  );
}

/**
 * Memory-safe lazy loading for heavy components
 *
 * Usage:
 * ```tsx
 * import { lazyLoad } from '@/components/lazy-wrapper';
 *
 * const HeavyChart = lazyLoad(() => import('@/components/widgets/HeavyChart'));
 *
 * // In component:
 * <HeavyChart data={data} />
 * ```
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return lazy(importFunc);
}

/**
 * Preload a lazy component
 *
 * Usage:
 * ```tsx
 * const preloadHeavyComponent = () => {
 *   import('@/components/widgets/HeavyChart');
 * };
 *
 * // Call when user hovers or focuses on trigger
 * <button onMouseEnter={preloadHeavyComponent}>
 *   Load Heavy Component
 * </button>
 * ```
 */
export function preloadLazyComponent(importFunc: () => Promise<any>) {
  // Preload the module without rendering
  importFunc().catch(() => {
    // Silently handle preload failures
  });
}

/**
 * Error Boundary for lazy loaded components
 */
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-4 text-red-500">
          <span>Failed to load component</span>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * LazyWrapper with Error Boundary
 */
export function SafeLazyWrapper({
  children,
  fallback,
  errorFallback,
  className
}: LazyWrapperProps & { errorFallback?: React.ReactNode }) {
  return (
    <LazyErrorBoundary fallback={errorFallback}>
      <LazyWrapper fallback={fallback} className={className}>
        {children}
      </LazyWrapper>
    </LazyErrorBoundary>
  );
}

export default LazyWrapper;
