"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useMaybeDataset, useUploadActions } from "@/components/data/dataset-provider";
import { WeekPicker } from "./week-picker";
import { useKeepSelection } from "./use-keep-selection";
import { ViewAs } from "./view-as";

const NAV = [
  { href: "/", label: "This week" },
  { href: "/questions", label: "Questions" },
  { href: "/competitors", label: "Competitors" },
  { href: "/reports", label: "Reports" },
  { href: "/data", label: "Data" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const data = useMaybeDataset();
  const upload = useUploadActions();
  const keep = useKeepSelection();

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
        {upload.source === "upload" ? (
          <span className="bg-warn-surface text-warn ml-auto inline-flex items-center gap-2 rounded-full py-1 pr-1 pl-3 text-xs font-medium">
            Uploaded data, this tab only
            <button
              type="button"
              onClick={upload.clear}
              className="text-foreground rounded-full bg-white/80 px-2 py-0.5 hover:bg-white"
            >
              Reset
            </button>
          </span>
        ) : null}
        {data ? (
          <div
            className={cn("flex items-center gap-2", upload.source === "upload" ? "" : "ml-auto")}
          >
            <ViewAs />
            <WeekPicker />
          </div>
        ) : null}
      </div>
      {data ? (
        <div className="flex items-center gap-2 border-t px-4 py-2 sm:hidden">
          <span className="text-muted-foreground text-sm">Viewing as</span>
          <ViewAs className="h-8 flex-1" />
        </div>
      ) : null}
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
