"use client";

import { Fragment, type ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { AnswersSheet } from "@/components/answers/answers-sheet";
import { useDataset } from "@/components/data/dataset-provider";
import { engineLabel } from "@/engine/config";
import { pairAnswerIds, type Winner } from "@/engine/insights";
import { Dot } from "./parts";

interface Props {
  winners: Winner[];
  week: number;
  name: (brand: string) => string;
  colors: Record<string, string>;
}

/** Who led one question on one AI tool: a company, a tie, or no one. */
function Leader({
  w,
  name,
  colors,
  client,
}: {
  w: Winner | undefined;
  name: (b: string) => string;
  colors: Record<string, string>;
  client: string;
}) {
  if (!w) return <span className="text-muted-foreground">No answers</span>;
  if (w.status === "none") return <span className="text-muted-foreground">No one recommended</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {w.winners.map((b, i) => (
        <Fragment key={b}>
          {i > 0 ? (
            <span className="text-muted-foreground" aria-label="tied with">
              =
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Dot color={colors[b]} />
            <span className={cn(b === client && "font-medium")}>{name(b)}</span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}

function describe(w: Winner, name: (b: string) => string): string {
  if (w.status === "none") return "No company was recommended.";
  if (w.status === "tie") return `${w.winners.map(name).join(" and ")} were recommended equally.`;
  return `${name(w.winners[0]!)} was recommended most.`;
}

/** The 15 questions by AI tool grid, each opening the answers behind it. */
export function HeadToHead({ winners, week, name, colors }: Props) {
  const { results } = useDataset();
  const s = results.pack.settings;
  const present = new Set(winners.map((w) => w.engine));
  const engines = [
    ...Object.keys(s.engines).filter((e) => present.has(e)),
    ...[...present].filter((e) => !s.engines[e]).sort(),
  ];
  const promptIds = [
    ...new Set([...Object.keys(results.pack.prompts), ...winners.map((w) => w.promptId)]),
  ].sort();
  const question = (id: string) => results.pack.prompts[id]?.question ?? id;
  const find = (p: string, e: string) => winners.find((w) => w.promptId === p && w.engine === e);

  const cell = (p: string, e: string, children: ReactNode) => {
    const w = find(p, e);
    if (!w) return children;
    return (
      <AnswersSheet
        title={question(p)}
        description={`${engineLabel(s, e)}, week ${week}. ${describe(w, name)}`}
        responseIds={pairAnswerIds(results, p, e, [week])}
        trigger={children}
      />
    );
  };

  return (
    <>
      {/* Wide screens: one row per question, one column per AI tool */}
      <div className="bg-card hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Most recommended company for each question on each AI tool, week {week}
          </caption>
          <thead className="bg-subtle">
            <tr className="border-b">
              <th scope="col" className="text-muted-foreground px-4 py-2.5 font-medium">
                Question
              </th>
              {engines.map((e) => (
                <th
                  key={e}
                  scope="col"
                  className="text-muted-foreground w-48 px-2 py-2.5 font-medium"
                >
                  {engineLabel(s, e)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promptIds.map((p) => (
              <tr key={p} className="border-b last:border-0">
                <th scope="row" className="px-4 py-2 align-top font-normal">
                  {question(p)}
                </th>
                {engines.map((e) => (
                  <td key={e} className="px-1 py-1 align-top">
                    {cell(
                      p,
                      e,
                      <span
                        className={cn(
                          "block rounded-md px-2 py-1.5",
                          find(p, e) && "hover:bg-muted cursor-pointer transition-colors",
                        )}
                      >
                        <Leader w={find(p, e)} name={name} colors={colors} client={s.client} />
                      </span>,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per question */}
      <ul className="space-y-3 md:hidden">
        {promptIds.map((p) => (
          <li key={p} className="bg-card rounded-xl border p-4">
            <p className="font-medium">{question(p)}</p>
            <ul className="mt-2 divide-y">
              {engines.map((e) => (
                <li key={e}>
                  {cell(
                    p,
                    e,
                    <span className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-muted-foreground shrink-0">{engineLabel(s, e)}</span>
                      <span className="flex items-center gap-2 text-right">
                        <Leader w={find(p, e)} name={name} colors={colors} client={s.client} />
                        {find(p, e) ? (
                          <CaretRightIcon className="text-muted-foreground size-3.5 shrink-0" />
                        ) : null}
                      </span>
                    </span>,
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
