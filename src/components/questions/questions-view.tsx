"use client";

import { useMemo, useState } from "react";
import { ArrowCounterClockwiseIcon, CaretRightIcon, WarningIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { AnswersSheet } from "@/components/answers/answers-sheet";
import { useDataset } from "@/components/data/dataset-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { engineLabel, focusBrands } from "@/engine/config";
import {
  countsLine,
  coverage,
  filterMatrix,
  findAnswer,
  NO_FILTERS,
  plural,
  questionMatrix,
  stageLabel,
  toneCounts,
  type QuestionEngineResult,
  type QuestionFilters,
  type QuestionRow,
} from "@/engine/insights";
import { brandColors, shortOf } from "@/lib/brands";
import { AnswerByIdSheet } from "./answer-by-id-sheet";
import { EngineOutcome } from "./engine-outcome";
import { QuestionFiltersRow, type Option } from "./question-filters";

function KeyQuestion({ priority }: { priority: number }) {
  if (priority < 3) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="bg-primary/10 text-primary inline-flex cursor-default items-center rounded-full px-2 py-0.5 text-xs font-medium" />
        }
      >
        Key question
      </TooltipTrigger>
      <TooltipContent>Closest to a purchase, so it counts the most in the score.</TooltipContent>
    </Tooltip>
  );
}

function QuestionLabel({ row }: { row: QuestionRow }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="leading-snug font-medium">{row.question}</span>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">{stageLabel(row.stage)}</span>
        <KeyQuestion priority={row.priority} />
      </span>
    </span>
  );
}

export function QuestionsView() {
  const { results, week } = useDataset();
  const s = results.pack.settings;
  const colors = useMemo(() => brandColors(s), [s]);
  const [picked, setPicked] = useState<string | null>(null); // null: follow the header's company
  const [filters, setFilters] = useState<QuestionFilters>(NO_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);

  const company = picked && s.brands[picked] ? picked : s.client;
  const name = shortOf(s, company);
  const full = useMemo(() => questionMatrix(results, company, week), [results, company, week]);
  const cov = useMemo(() => coverage(results, week), [results, week]);
  const lookup = findAnswer(results, filters.text ?? "", week);
  // An answer id isn't question text, so it shouldn't empty the list while it's being opened.
  const shown = filterMatrix(full, lookup.status === "none" ? filters : { ...filters, text: "" });
  const counts = toneCounts(shown);
  const filtered =
    filters.stage !== "all" ||
    filters.engine !== "all" ||
    filters.tone !== "any" ||
    (lookup.status === "none" && !!filters.text?.trim());

  const companies: Option[] = [...new Set([...focusBrands(s), ...Object.keys(s.brands)])].map(
    (k) => ({ value: k, label: s.brands[k]!.name, color: colors[k] }),
  );
  const engines: Option[] = full.engines.map((e) => ({ value: e, label: engineLabel(s, e) }));
  const reset = () => {
    setFilters(NO_FILTERS);
    setPicked(null);
  };

  const sheet = (row: QuestionRow, r: QuestionEngineResult, trigger: React.ReactNode) =>
    r.status === "not_collected" ? (
      <div className="w-full">{trigger}</div>
    ) : (
      <AnswersSheet
        title={row.question}
        description={`${engineLabel(s, r.engine)}, week ${week}, ${plural(r.runs.length, "run")}. ${s.brands[company]!.name} and every other company are highlighted.`}
        responseIds={r.responseIds}
        trigger={trigger}
      />
    );

  return (
    <div className="space-y-6">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Questions</h1>
        <p className="text-muted-foreground">
          How each AI tool answered the {plural(full.rows.length, "buyer question")} in week {week},
          from {s.brands[company]!.name}&apos;s side. Open any answer to read it.
        </p>
      </header>

      <QuestionFiltersRow
        company={company}
        companies={companies}
        onCompany={(k) => setPicked(k)}
        filters={filters}
        onFilters={setFilters}
        stages={full.stages}
        engines={engines}
        onSearch={() => lookup.status === "found" && setOpenId(lookup.responseId)}
      />

      {lookup.status === "found" && (
        <p className="bg-subtle flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-sm">
          <span>
            Answer {lookup.responseId} is from week {lookup.week ?? "unknown"}.
          </span>
          <Button size="sm" variant="outline" onClick={() => setOpenId(lookup.responseId)}>
            Open it
          </Button>
        </p>
      )}
      {lookup.status === "later" && (
        <p className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm">
          <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
          Answer {lookup.responseId} is from week {lookup.week}. Pick that week in the header to
          open it.
        </p>
      )}

      {(cov.level === "major" || cov.level === "none") && (
        <p className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm">
          <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
          {cov.summary}
        </p>
      )}

      {shown.rows.length === 0 ? (
        <div className="bg-subtle flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="font-medium">No questions match these filters.</p>
          <p className="text-muted-foreground text-sm">
            Try a different stage, AI tool or tone, or start again.
          </p>
          <Button variant="outline" onClick={reset}>
            <ArrowCounterClockwiseIcon />
            Reset filters
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm">
            <span className="text-muted-foreground">
              {filtered ? "In the questions shown, " : `In week ${week}, `}
            </span>
            {countsLine(name, counts)}
          </p>

          {/* Wide screens: one row per question, one column per AI tool. */}
          <div className="bg-card hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-subtle border-b text-left">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Question
                  </th>
                  {shown.engines.map((e) => (
                    <th key={e} scope="col" className="w-48 px-3 py-3 font-medium">
                      {engineLabel(s, e)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.rows.map((row) => (
                  <tr key={row.promptId} className="align-top">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <QuestionLabel row={row} />
                    </th>
                    {row.engines.map((r) => (
                      <td key={r.engine} className="p-1.5">
                        {sheet(
                          row,
                          r,
                          <span
                            className={cn(
                              "group flex items-start justify-between gap-2 rounded-lg px-1.5 py-1.5",
                              r.status !== "not_collected" && "hover:bg-muted transition-colors",
                            )}
                          >
                            <EngineOutcome result={r} />
                            {r.status !== "not_collected" && (
                              <CaretRightIcon className="text-muted-foreground mt-1 size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                            )}
                          </span>,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Small screens: one card per question. */}
          <ul className="space-y-3 md:hidden">
            {shown.rows.map((row) => (
              <li key={row.promptId} className="bg-card space-y-3 rounded-xl border p-4">
                <QuestionLabel row={row} />
                <ul className="divide-y border-t">
                  {row.engines.map((r) => (
                    <li key={r.engine}>
                      {sheet(
                        row,
                        r,
                        <span className="flex items-start justify-between gap-3 py-2.5">
                          <span className="text-muted-foreground pt-0.5 text-sm">
                            {engineLabel(s, r.engine)}
                          </span>
                          <span className="flex items-start gap-1.5">
                            <EngineOutcome result={r} className="items-end text-right" />
                            {r.status !== "not_collected" && (
                              <CaretRightIcon className="text-muted-foreground mt-1 size-3.5 shrink-0" />
                            )}
                          </span>
                        </span>,
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground text-xs">
            Each question is asked twice a week on every AI tool. One badge with ×2 means both runs
            agreed. The number next to a badge is where {name} was named among the companies in that
            answer.
          </p>
        </>
      )}

      <AnswerByIdSheet responseId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
