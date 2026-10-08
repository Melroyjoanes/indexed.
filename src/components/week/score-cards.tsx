"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon, InfoIcon, MinusIcon } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

/** What the small trend line on each card shows. */
function TrendHelp({ name, week }: { name: string; week: number }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="What the trend line shows"
            className="text-muted-foreground hover:text-foreground relative z-10 rounded-full p-0.5"
          />
        }
      >
        <InfoIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-left leading-snug">
        {name}&apos;s score each week up to week {week}, on the same 0 to 100 scale. Each dot is one
        week; the last one is the week shown. An open dot marks a week where some answers were
        missing, so it compares fewer AI tools.
      </TooltipContent>
    </Tooltip>
  );
}

export function ScoreCards({
  cards,
  colors,
  week,
  onSelect,
}: {
  cards: ScoreCard[];
  colors: Record<string, string>;
  week: number;
  onSelect: (brand: string) => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const narrowed = c.vsLastWeek?.comparedOn;
        return (
          <li
            key={c.brand}
            className={cn(
              "bg-card relative flex flex-col gap-3 rounded-xl border p-4 transition-colors",
              c.isClient
                ? "border-primary/50 ring-primary/25 ring-2"
                : "hover:border-primary/30 hover:bg-subtle",
            )}
          >
            {/* the whole card switches the dashboard to this company */}
            <button
              type="button"
              onClick={() => onSelect(c.brand)}
              aria-pressed={c.isClient}
              aria-label={c.isClient ? `Showing ${c.name}` : `Show the dashboard for ${c.name}`}
              className="focus-visible:ring-ring absolute inset-0 rounded-xl outline-none focus-visible:ring-2 active:translate-y-px"
            />
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">
                {c.name}
                {c.isClient ? (
                  <span className="text-primary ml-2 text-xs font-normal">Selected</span>
                ) : null}
              </h3>
              <span className="text-muted-foreground tabular text-xs">
                #{c.rank} of {cards.length}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="tabular text-4xl font-semibold tracking-tight">{score(c.score)}</p>
              <div className="flex items-start gap-1">
                <div className="w-24">
                  <Sparkline points={c.trend} color={colors[c.brand]!} />
                </div>
                <TrendHelp name={c.name} week={week} />
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
