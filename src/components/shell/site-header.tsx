"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "cn";
import { useMaybeDataset } from "@/components/data/dataset-provider";
import { WeekPicker } from "./week-picker";
import { ViewAs } from "./view-as";

const NAV = [
  { href: "/", label: "This week" },
  { href: "/questions", label: "Questions" },
  { href: "/competitors", label: "Competitors" },
  { href: "/reports", label: "Reports" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const params = useSearchParams();
  const data = useMaybeDataset();
  const qs = params.toString();
  const keep = (href: string) => (qs ? `${href}?${qs}` : href);

  return (
    <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href={keep("/")} className="text-[17px] font-semibold tracking-tight">
          indexed<span className="text-primary">.</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={keep(n.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        {data ? (
          <div className="ml-auto flex items-center gap-2">
            <ViewAs />
            <WeekPicker />
          </div>
        ) : null}
      </div>
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-t px-4 py-2 md:hidden">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={keep(n.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm",
                active ? "bg-secondary font-medium" : "text-muted-foreground",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
