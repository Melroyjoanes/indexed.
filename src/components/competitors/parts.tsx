"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

/** One anchored block of the competitor screen. */
export function Section({
  id,
  title,
  intro,
  children,
  className,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24 space-y-4", className)}
    >
      <div className="max-w-3xl space-y-1">
        <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        {intro ? <p className="text-muted-foreground text-sm">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A company's colour dot, to tell companies apart in data. */
export function Dot({ color, className }: { color: string | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ background: color }}
    />
  );
}

/** A company name with its colour dot. */
export function Company({
  name,
  color,
  strong,
}: {
  name: string;
  color: string | undefined;
  strong?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Dot color={color} />
      <span className={cn(strong && "font-medium")}>{name}</span>
    </span>
  );
}

/** "Show all" style link button used under long lists. */
export function MoreButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
    >
      {children}
    </button>
  );
}
