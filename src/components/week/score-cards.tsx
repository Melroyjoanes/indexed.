"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import type { ChangeView, ScoreCard } from "@/engine/insights";
import { percent, score, signed } from "@/lib/format";
import { Sparkline } from "./sparkline";

function Change({ c }: { c: ChangeView | null }) {
  if (!c) return <p className="text-muted-foreground text-sm">First week of data</p>;
  if (c.delta === null)
    return <p className="text-muted-foreground text-sm">No matching answers to compare</p>;
  const Icon =
    Math.abs(c.delta) < 0.5 ? MinusIcon : c.delta > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const tint = !c.clear
    ? "text-muted-foreground"
    : c.delta > 0
      ? "text-tone-recommended"
      : "text-tone-not-recommended";
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
      <span className={cn("tabular inline-flex items-center gap-0.5 font-medium", tint)}>
        <Icon weight="bold" className="size-3.5 self-center" />
        {signed(c.delta, 1)}
      </span>
      <span className="text-muted-foreground">vs week {c.against}</span>
      <span
        className={cn("text-xs", c.clear ? "text-foreground font-medium" : "text-muted-foreground")}
      >
        {c.clear ? "clear change" : "normal variation"}
      </span>
    </p>
  );
}

export function ScoreCards({
  cards,
  colors,
}: {
  cards: ScoreCard[];
  colors: Record<string, string>;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const narrowed = c.vsLastWeek?.comparedOn;
        return (
          <li
            key={c.brand}
            className={cn(
              "bg-card flex flex-col gap-3 rounded-xl border p-4",
              c.isClient && "border-primary/40 ring-primary/20 ring-1",
            )}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">{c.name}</h3>
              <span className="text-muted-foreground tabular text-xs">
                #{c.rank} of {cards.length}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="tabular text-4xl font-semibold tracking-tight">{score(c.score)}</p>
              <div className="w-24">
                <Sparkline points={c.trend} color={colors[c.brand]!} />
              </div>
            </div>
            <div className="space-y-1">
              <Change c={c.vsLastWeek} />
              {c.vsEarlier ? <Change c={c.vsEarlier} /> : null}
            </div>
            <p className="text-muted-foreground mt-auto text-xs">
              Named in {percent(c.mentionRate)} of answers
              {narrowed
                ? `. The change vs week ${c.vsLastWeek?.against} compares ${narrowed.join(" and ")} only (${score(c.vsLastWeek?.before)} to ${score(c.vsLastWeek?.now)}).`
                : "."}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
