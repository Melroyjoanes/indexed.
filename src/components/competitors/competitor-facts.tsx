"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { AnswersSheet } from "@/components/answers/answers-sheet";
import { useDataset } from "@/components/data/dataset-provider";
import { engineLabel } from "@/engine/config";
import { factCounts, listOf, type FactAlert } from "@/engine/insights";
import { Dot } from "./parts";

const cap = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;

/** Wrong things AI says about tracked competitors, as cards sales can use. */
export function CompetitorFacts({
  facts,
  week,
  colors,
}: {
  facts: FactAlert[];
  week: number;
  colors: Record<string, string>;
}) {
  const { results } = useDataset();
  const s = results.pack.settings;
  if (!facts.length)
    return (
      <p className="text-muted-foreground">
        No answers up to week {week} contradict the competitors&apos; fact sheets.
      </p>
    );
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((f) => (
        <li key={f.brand + f.factKey + f.claimed}>
          <AnswersSheet
            title={`${cap(f.claim)}?`}
            description={`The fact sheet says ${f.truth}. Answers up to week ${week}:`}
            responseIds={f.responseIds}
            trigger={
              <span className="bg-card hover:bg-muted/60 flex h-full flex-col gap-3 rounded-xl border p-4 transition-colors">
                <span className="flex items-start gap-2.5">
                  <WarningIcon
                    weight="fill"
                    className="text-tone-not-recommended mt-1 size-4 shrink-0"
                  />
                  <span className="leading-snug">
                    <span className="block font-medium">{factCounts(f, week).lead}.</span>
                    <span className="block">{cap(f.truth)}.</span>
                  </span>
                </span>
                <span className="text-muted-foreground mt-auto flex items-center gap-2 text-xs">
                  <Dot color={colors[f.brand]} className="size-2" />
                  <span>
                    {factCounts(f, week).history}. On{" "}
                    {listOf(f.engines.map((e) => engineLabel(s, e)))}.
                  </span>
                </span>
              </span>
            }
          />
        </li>
      ))}
    </ul>
  );
}
