"use client";

import { useMemo } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { useDataset } from "@/components/data/dataset-provider";
import { focusBrands } from "@/engine/config";
import { coverage, listOf, scoreTrend } from "@/engine/insights";
import { brandColors, shortOf } from "@/lib/brands";
import { Section } from "./parts";
import { ScoreTrend } from "./score-trend";

const SECTIONS = [{ id: "trend", label: "Score trend" }];

export function CompetitorsView() {
  const { results, scoring, week } = useDataset();
  const s = results.pack.settings;
  const colors = useMemo(() => brandColors(s), [s]);
  const name = useMemo(() => (b: string) => shortOf(s, b), [s]);
  const focus = useMemo(() => focusBrands(s), [s]);
  const client = name(s.client);
  const cov = useMemo(() => coverage(results, week), [results, week]);
  const trend = useMemo(() => scoreTrend(scoring, s, week), [scoring, s, week]);

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-muted-foreground text-sm">
          {s.brands[s.client]?.name ?? client} and competitors, week {week}
        </p>
        <h1 className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">
          How {client} compares with {listOf(focus.slice(1).map(name))}.
        </h1>
        {cov.level === "major" || cov.level === "none" ? (
          <p className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm">
            <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
            {cov.summary}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{cov.summary}</p>
        )}
      </header>

      <nav aria-label="On this page" className="-mt-4 flex flex-wrap gap-2">
        {SECTIONS.map((x) => (
          <a
            key={x.id}
            href={`#${x.id}`}
            className="bg-secondary text-secondary-foreground hover:bg-muted rounded-full px-3 py-1 text-sm transition-colors"
          >
            {x.label}
          </a>
        ))}
      </nav>

      <Section
        id="trend"
        title="Score trend"
        intro={`Each company's score (0 to 100) every week up to week ${week}. Higher means AI answers point buyers toward them more strongly.`}
      >
        <ScoreTrend points={trend} brands={focus} client={s.client} name={name} colors={colors} />
      </Section>
    </div>
  );
}
