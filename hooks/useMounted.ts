// File: hooks/useMounted.ts
import { useEffect, useState } from "react";

/**
 * Custom hook to prevent hydration mismatches
 * Returns true only after component has mounted on client-side
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
