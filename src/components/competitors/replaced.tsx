"use client";

import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { AnswersSheet } from "@/components/answers/answers-sheet";
import { useDataset } from "@/components/data/dataset-provider";
import { engineLabel } from "@/engine/config";
import { listOf, pairAnswerIds, plural, type ReplacedSummary } from "@/engine/insights";
import { Company, MoreButton } from "./parts";

const FIRST = 8;

/** When the client dropped out of a question, who showed up instead. */
export function Replaced({
  summary,
  week,
  name,
  colors,
}: {
  summary: ReplacedSummary;
  week: number;
  name: (brand: string) => string;
  colors: Record<string, string>;
}) {
  const { results } = useDataset();
  const s = results.pack.settings;
  const client = name(s.client);
  const [all, setAll] = useState(false);
  const question = (id: string) => results.pack.prompts[id]?.question ?? id;

  if (summary.drops === 0)
    return (
      <p className="text-muted-foreground">
        {client} didn&apos;t drop out of any question up to week {week}.
      </p>
    );

  // Keep the first FIRST items overall, still grouped by week.
  const limit = all ? Infinity : FIRST;
  const groups = summary.byWeek
    .map((g, i) => {
      const before = summary.byWeek.slice(0, i).reduce((n, x) => n + x.items.length, 0);
      return { ...g, items: g.items.slice(0, Math.max(0, limit - before)) };
    })
    .filter((g) => g.items.length);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-2">
        <p>
          Up to week {week}, there {summary.drops === 1 ? "was" : "were"}{" "}
          {plural(summary.drops, "time")} {client} was named for a question on an AI tool one week
          and not the next.
        </p>
        {summary.replacers.length ? (
          <ul className="space-y-2">
            {summary.replacers.map((r) => (
              <li key={r.brand} className="flex items-baseline gap-2">
                <Company name={name(r.brand)} color={colors[r.brand]} strong />
                <span className="text-muted-foreground">
                  took {client}&apos;s place {r.times === 1 ? "once" : `${r.times} times`}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {summary.unreplaced > 0 ? (
          <p className="text-muted-foreground text-sm">
            In {plural(summary.unreplaced, "case")}, no company appeared that wasn&apos;t already
            there the week before.
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          A company can take the place of several at once, so the counts can add up to more than the
          number of drops.
        </p>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {groups.map((g) => (
          <div key={g.week} className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-medium">
              Week {g.week - 1} to week {g.week}
            </h3>
            <ul className="bg-card divide-y rounded-xl border">
              {g.items.map((r) => (
                <li key={`${r.promptId}${r.engine}`}>
                  <AnswersSheet
                    title={question(r.promptId)}
                    description={`${engineLabel(s, r.engine)}, week ${g.week - 1} and week ${g.week}`}
                    responseIds={pairAnswerIds(results, r.promptId, r.engine, [g.week - 1, g.week])}
                    trigger={
                      <span className="group hover:bg-muted/60 flex w-full items-start gap-3 p-4 transition-colors">
                        <span className="flex-1 space-y-1">
                          <span className="block font-medium">{question(r.promptId)}</span>
                          <span className="text-muted-foreground block text-sm">
                            {engineLabel(s, r.engine)}:{" "}
                            {r.replacedBy.length ? (
                              <>
                                {client} out,{" "}
                                <span className="text-foreground">
                                  {listOf(r.replacedBy.map(name))}
                                </span>{" "}
                                in
                              </>
                            ) : (
                              `${client} out, no one new in`
                            )}
                          </span>
                        </span>
                        <CaretRightIcon className="text-muted-foreground mt-1 size-4 shrink-0 transition group-hover:translate-x-0.5" />
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        {summary.drops > FIRST ? (
          <MoreButton onClick={() => setAll((v) => !v)}>
            {all ? "Show fewer" : `Show all ${summary.drops}`}
          </MoreButton>
        ) : null}
      </div>
    </div>
  );
}
