"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** After a client-side route change, focus restarts at the main content. */
export function RouteFocus({ target = "main" }: { target?: string }) {
  const pathname = usePathname();
  const first = useRef(pathname);
  useEffect(() => {
    if (first.current === pathname) return;
    first.current = pathname;
    document.getElementById(target)?.focus({ preventScroll: true });
  }, [pathname, target]);
  return null;
}
