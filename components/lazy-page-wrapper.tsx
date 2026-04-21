"use client";

import { Suspense, ComponentType, useMemo } from 'react';
import { LoadingPage } from '@/components/loading-page';
import { getLoadingMessage } from '@/components/lazy-routes';

interface LazyPageWrapperProps {
  children: React.ReactNode;
}

export function LazyPageWrapper({ children }: LazyPageWrapperProps) {
  const loadingMessage = useMemo(() => {
    if (typeof window !== 'undefined') {
      return getLoadingMessage(window.location.pathname);
    }
    return 'Loading page...';
  }, []);

  return (
    <Suspense fallback={<LoadingPage message={loadingMessage} />}>
      {children}
    </Suspense>
  );
}

// Higher-order component untuk membuat component lazy
export function withLazyLoading<T extends {}>(
  Component: ComponentType<T>,
  fallback?: React.ComponentType
) {
  return function LazyComponent(props: T) {
    const FallbackComponent = fallback || LoadingPage;
    return (
      <Suspense fallback={<FallbackComponent />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
