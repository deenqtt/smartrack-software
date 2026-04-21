"use client";

import { useEffect, useState, ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly component - Only renders children on the client side
 * Prevents hydration mismatches for client-only components
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * ClientOnlySkeleton - ClientOnly with a skeleton fallback
 */
export function ClientOnlySkeleton({
  children,
  className = "animate-pulse bg-muted rounded"
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ClientOnly fallback={<div className={className} />}>
      {children}
    </ClientOnly>
  );
}
