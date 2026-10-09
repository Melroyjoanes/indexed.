"use client";

import Link from "next/link";
import { useKeepSelection } from "@/components/shell/use-keep-selection";
import { useMemo, useState } from "react";
import { CaretRightIcon, InfoIcon, WarningIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { AnswersSheet } from "@/components/answers/answers-sheet";
import { useDataset } from "@/components/data/dataset-provider";
import { weeklyBrief, factCounts, type FactAlert } from "@/engine/insights";
import { brandColors } from "@/lib/brands";
import { ScoreCards } from "./score-cards";

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function FactRow({ f, week }: { f: FactAlert; week: number }) {
  return (
    <li>
      <AnswersSheet
        title={`${f.claim.charAt(0).toUpperCase()}${f.claim.slice(1)}?`}
        description={`The fact sheet says ${f.truth}. Answers up to week ${week}:`}
        responseIds={f.responseIds}
        trigger={
          <span className="group hover:bg-muted flex w-full items-start gap-3 rounded-lg px-3 py-2.5 transition-colors">
            <WarningIcon
              weight="fill"
              className="text-tone-not-recommended mt-0.5 size-4 shrink-0"
            />
            <span className="flex-1">
              <span className="block">
                {factCounts(f, week).lead}.{" "}
                <span className="text-muted-foreground">In fact, {f.truth}.</span>
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {factCounts(f, week).history}
              </span>
            </span>
            <CaretRightIcon className="text-muted-foreground mt-1 size-4 shrink-0 transition group-hover:translate-x-0.5" />
          </span>
        }
      />
    </li>
  );
}

export function WeeklySummary() {
  const keep = useKeepSelection();
  const { results, scoring, week, setClient } = useDataset();
  const brief = useMemo(() => weeklyBrief(results, scoring, week), [results, scoring, week]);
  const colors = useMemo(() => brandColors(results.pack.settings), [results]);
  const [allFacts, setAllFacts] = useState(false);
  const [allActions, setAllActions] = useState(false);
  const cov = brief.coverage;
  const clientName = brief.cards.find((c) => c.isClient)?.name ?? brief.clientName;
  const answerIds = (promptId: string, engine: string, weeks: number[]) =>
    results.answers
      .filter(
        (a) =>
          a.promptId === promptId &&
          a.engine === engine &&
          a.week !== null &&
          weeks.includes(a.week),
      )
      .sort((x, y) => (x.week ?? 0) - (y.week ?? 0) || (x.run ?? 0) - (y.run ?? 0))
      .map((a) => a.responseId);
  const facts = allFacts ? brief.facts : brief.facts.filter((f) => f.thisWeek > 0).slice(0, 3);

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-muted-foreground text-sm">
          {brief.clientName}, week {week}
        </p>
        <h1 className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">
          {brief.headline}
        </h1>
        {brief.baselineNote ? (
          <p className="text-muted-foreground text-sm">{brief.baselineNote}</p>
        ) : null}
        {cov.level === "major" || cov.level === "none" ? (
          <p className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm">
            <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
            {cov.summary}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{cov.summary}</p>
        )}
      </header>

      {cov.level !== "none" && (
        <>
          <section className="space-y-3">
            <ScoreCards cards={brief.cards} colors={colors} week={week} onSelect={setClient} />
            <p className="text-muted-foreground flex items-start gap-1.5 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                The score (0 to 100) is how strongly AI answers point buyers toward each company.
                Click a card to see everything from that company&apos;s side. A change is clear when
                it&apos;s bigger than the usual difference between two runs of the same question.{" "}
                <Link
                  href={keep("/how-it-works")}
                  className="text-foreground underline underline-offset-4"
                >
                  How it works
                </Link>
              </span>
            </p>
          </section>

          <div className="grid gap-10 lg:grid-cols-5">
            <Section
              title={brief.earlier ? `What changed since week ${brief.earlier}` : "What changed"}
              className="lg:col-span-3"
            >
              {brief.earlier === null ? (
                <p className="text-muted-foreground">
                  This is the first week of data. Changes will show from next week.
                </p>
              ) : brief.changes.length === 0 ? (
                <p className="text-muted-foreground">No question moved for {clientName}.</p>
              ) : (
                <ol className="bg-card divide-y rounded-xl border">
                  {brief.changes.map((c) => (
                    <li key={`${c.promptId}${c.engine}`}>
                      <AnswersSheet
                        title={c.question}
                        description={`${c.engineLabel}, week ${brief.earlier} and week ${week}`}
                        responseIds={answerIds(c.promptId, c.engine, [brief.earlier!, week])}
                        trigger={
                          <span className="group hover:bg-muted/60 flex w-full items-start gap-3 p-4 transition-colors">
                            <span className="flex-1 space-y-1">
                              <span className="block font-medium">{c.question}</span>
                              <span className="text-muted-foreground block text-sm">
                                {c.engineLabel}: {c.before} <span aria-hidden>→</span>{" "}
                                <span className="text-foreground">{c.now}</span>
                              </span>
                            </span>
                            <span
                              className={cn(
                                "tabular text-sm font-medium",
                                c.impact < 0
                                  ? "text-tone-not-recommended"
                                  : "text-tone-recommended",
                              )}
                            >
                              {c.impact > 0 ? "+" : "−"}
                              {Math.abs(c.impact).toFixed(1)}
                            </span>
                            <CaretRightIcon className="text-muted-foreground mt-1 size-4 transition group-hover:translate-x-0.5" />
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ol>
              )}
              {brief.changes.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Points each question moved the overall score. Open one to read the answers.
                </p>
              )}
            </Section>

            <Section title={`Who gained where ${clientName} dropped`} className="lg:col-span-2">
              {brief.gained.length === 0 ? (
                <p className="text-muted-foreground">
                  {brief.earlier === null ? "Shows from next week." : "Nobody in particular."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {brief.gained.slice(0, 4).map((g) => (
                    <li key={g.brand} className="flex gap-3">
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full"
                        style={{ background: colors[g.brand] }}
                        aria-hidden
                      />
                      <span>
                        <span className="font-medium">{g.name}</span>{" "}
                        <span className="text-muted-foreground">
                          gained on {g.pairs.length}{" "}
                          {g.pairs.length === 1 ? "question" : "questions"}, including “
                          {g.pairs[0]!.question}” on {g.pairs[0]!.engineLabel}.
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="grid gap-10 lg:grid-cols-5">
            <Section title="What AI is getting wrong" className="lg:col-span-3">
              {brief.factCheckUnavailable ? (
                <p className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm">
                  <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
                  {brief.factCheckUnavailable}
                </p>
              ) : brief.facts.length === 0 ? (
                <p className="text-muted-foreground">Nothing contradicts the fact sheet so far.</p>
              ) : (
                <>
                  {facts.length === 0 ? (
                    <p className="text-muted-foreground">
                      No wrong facts in this week&apos;s answers.
                    </p>
                  ) : (
                    <ul className="-mx-3">
                      {facts.map((f) => (
                        <FactRow key={f.factKey + f.claimed} f={f} week={week} />
                      ))}
                    </ul>
                  )}
                  {brief.facts.length > facts.length || allFacts ? (
                    <button
                      type="button"
                      onClick={() => setAllFacts((v) => !v)}
                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {allFacts
                        ? "Show this week only"
                        : `Show all ${brief.facts.length} up to week ${week}`}
                    </button>
                  ) : null}
                </>
              )}
            </Section>

            <Section title="Suggested next steps" className="lg:col-span-2">
              <ul className="space-y-4">
                {(allActions ? brief.actions : brief.actions.slice(0, 3)).map((a) => (
                  <li key={a.title} className="space-y-1">
                    <p className="leading-snug font-medium">{a.title}</p>
                    <p className="text-muted-foreground text-sm">{a.detail}</p>
                  </li>
                ))}
              </ul>
              {brief.actions.length > 3 && (
                <button
                  type="button"
                  onClick={() => setAllActions((v) => !v)}
                  className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                >
                  {allActions ? "Show fewer" : `${brief.actions.length - 3} more`}
                </button>
              )}
              <p className="text-muted-foreground text-xs">
                These come from patterns in the answers. They show where to look, not proof of
                cause.
              </p>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
