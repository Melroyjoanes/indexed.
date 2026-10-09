"use client";

import { useSearchParams } from "next/navigation";

/** The URL parameters that make up the selection shared by every screen. */
const SHARED = ["as", "week"] as const;

/**
 * Builds internal links that keep the selected company and week, so moving
 * between screens never silently resets them. Screen-specific parameters,
 * like the Questions filters, stay behind.
 */
export function useKeepSelection(): (href: string) => string {
  const params = useSearchParams();
  const keep = new URLSearchParams();
  for (const k of SHARED) {
    const v = params.get(k);
    if (v !== null) keep.set(k, v);
  }
  const qs = keep.toString();
  return (href) => (qs ? `${href}?${qs}` : href);
}
