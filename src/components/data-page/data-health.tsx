"use client";

import { Fragment, useMemo } from "react";
import { ArrowRightIcon, WarningIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataset } from "@/components/data/dataset-provider";
import { describeFormats, engineNames, packTotals, weekHealth } from "@/engine/health";
import { listOf, plural } from "@/engine/insights";

function Stat({ value, label, note }: { value: number; label: string; note: string }) {
  return (
    <li className="bg-card space-y-1 rounded-xl border p-4">
      <p className="tabular text-2xl font-semibold">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-muted-foreground text-xs">{note}</p>
    </li>
  );
}

export function DataHealth() {
  const { results, week } = useDataset();
  const s = results.pack.settings;
  const totals = useMemo(() => packTotals(results), [results]);
  const weeks = useMemo(() => weekHealth(results), [results]);
  const formats = useMemo(() => describeFormats(results.pack.report), [results]);
  const names = useMemo(() => engineNames(results.pack.report, s), [results, s]);
  const gaps = weeks.filter((w) => w.coverage.level !== "complete");

  return (
    <div className="space-y-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat value={totals.linesRead} label="Lines read" note={`From ${listOf(totals.files)}`} />
        <Stat
          value={totals.kept}
          label="Answers kept"
          note={
            totals.unplaced
              ? `${totals.scored} of them are scored. ${plural(totals.unplaced, "answer")} ${totals.unplaced === 1 ? "has" : "have"} no week, AI tool or question id, so ${totals.unplaced === 1 ? "it's" : "they're"} only in the export files`
              : `${totals.scored} of them are scored`
          }
        />
        <Stat
          value={totals.duplicates}
          label="Duplicates dropped"
          note="The same answer twice; the first copy is kept"
        />
        <Stat
          value={totals.failed}
          label="Failed requests"
          note="An error or an empty answer; left out of scores"
        />
        <Stat
          value={totals.unreadable.length}
          label="Unreadable lines"
          note={
            totals.unreadable.length
              ? `Skipped: ${totals.unreadable.slice(0, 3).join(", ")}${totals.unreadable.length > 3 ? " and more" : ""}`
              : "Every line could be read"
          }
        />
      </ul>

      <div className="space-y-3">
        <h3 className="font-medium">What came in each week</h3>
        {gaps.length ? (
          <ul className="space-y-2">
            {gaps.map((g) => (
              <li
                key={g.week}
                className={cn(
                  "flex gap-2 rounded-lg px-3 py-2 text-sm",
                  g.missingTools.length || g.coverage.level === "major"
                    ? "bg-warn-surface text-warn"
                    : "bg-subtle",
                )}
              >
                <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium">Week {g.week}.</span> {g.coverage.summary}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Every week is complete.</p>
        )}
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Week</TableHead>
                <TableHead>AI tool</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="pr-4 text-right">Not collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeks.map((w) => (
                <Fragment key={w.week}>
                  {w.coverage.engines.map((e, i) => (
                    <TableRow
                      key={e.engine}
                      className={cn(
                        i === w.coverage.engines.length - 1 ? "" : "border-b-0",
                        w.week === week && "bg-subtle",
                      )}
                    >
                      <TableCell className="pl-4 font-medium">
                        {i === 0 ? (
                          <>
                            Week {w.week}
                            {w.week === week ? (
                              <span className="text-muted-foreground font-normal"> (selected)</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="sr-only">Week {w.week}</span>
                        )}
                      </TableCell>
                      <TableCell>{e.label}</TableCell>
                      <TableCell className="tabular text-right">{e.expected}</TableCell>
                      <TableCell className="tabular text-right">{e.received}</TableCell>
                      <TableCell
                        className={cn(
                          "tabular text-right",
                          e.failed > 0 && "text-warn font-medium",
                        )}
                      >
                        {e.failed}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "tabular pr-4 text-right",
                          e.notCollected > 0 && "text-warn font-medium",
                        )}
                      >
                        {e.notCollected}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground text-xs">
          Covers every week in the data, whichever week is picked above. Expected is every question
          asked {s.runsPerWeek === 2 ? "twice" : `${s.runsPerWeek} times`} on each AI tool seen so
          far.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium">File formats</h3>
          <p className="text-muted-foreground text-sm">
            Exports don&apos;t always look the same. Each format is mapped to one shape when read.
          </p>
          <ul className="space-y-2 text-sm">
            {formats.map((f) => (
              <li key={f.fields.join(",")} className="flex gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    f.usual ? "bg-tone-recommended" : "bg-warn",
                  )}
                  aria-hidden
                />
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">AI tool names</h3>
          <p className="text-muted-foreground text-sm">
            The same AI tool is sometimes spelled differently. These are the names in the files and
            what each was counted as.
          </p>
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name in the files</TableHead>
                  <TableHead>Counted as</TableHead>
                  <TableHead className="pr-4 text-right">Lines</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {names.map((n) => (
                  <TableRow key={n.raw}>
                    <TableCell className="pl-4 font-mono text-xs">{n.raw}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <ArrowRightIcon className="text-muted-foreground size-3.5" aria-hidden />
                        {n.known ? (
                          n.label
                        ) : (
                          <span className="text-warn">
                            Not a known AI tool, kept as “{n.label}”
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="tabular pr-4 text-right">{n.lines}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
