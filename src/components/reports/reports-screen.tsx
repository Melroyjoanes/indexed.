"use client";

import { useMemo, useState } from "react";
import { FileCsvIcon, FilePdfIcon, FileXlsIcon, WarningIcon } from "@phosphor-icons/react";
import { useDataset } from "@/components/data/dataset-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { focusBrands } from "@/engine/config";
import { plural } from "@/engine/insights";
import { evaluationFiles, reportContent, workbookContent } from "@/engine/report";
import { DownloadButton } from "./download-button";

/** What each workbook sheet holds, in a few words. */
const SHEET_NOTES: Record<string, (rows: number, cols: number) => string> = {
  Summary: () => "the same key facts as the PDF",
  "Scores by week": (_, cols) =>
    `each company's score for ${plural(cols - 1, "week")}, with answers received and expected`,
  Changes: () => "each like-for-like change, the AI tools compared and the verdict",
  "Wrong facts": (rows) => `${plural(rows, "wrong claim")}, each with its sentence and answer id`,
  "Who AI recommends": (rows, cols) =>
    `who each of ${plural(cols - 1, "AI tool")} recommends for ${plural(rows, "question")}`,
  Sources: (rows) => `${plural(rows, "website")} the AI tools cite`,
  Method: () => "how the score and the variation rule work, and how missing data is handled",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card space-y-5 rounded-xl border p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function ReportsScreen() {
  const { results, scoring, week, weeks } = useDataset();
  const latest = weeks[weeks.length - 1];
  // The report follows the header's week until someone picks another one here.
  const [picked, setPicked] = useState<{ header: number; week: number } | null>(null);
  const reportWeek = picked && picked.header === week ? picked.week : week;

  const report = useMemo(
    () => reportContent(results, scoring, reportWeek),
    [results, scoring, reportWeek],
  );
  const sheets = useMemo(
    () => workbookContent(results, scoring, reportWeek),
    [results, scoring, reportWeek],
  );
  const files = useMemo(() => evaluationFiles(results), [results]);
  const companies = Object.keys(results.pack.settings.brands).length;
  const cov = report.completenessLevel;

  const pdfSections = [
    "Headline and how complete the data is",
    `Scores for the ${focusBrands(results.pack.settings).length} companies, with changes${report.earlier === null ? " (from the second week)" : ""}`,
    "How to read this: the score in plain words",
    report.changes.length
      ? `The ${report.changes.length === 3 ? "three" : report.changes.length} biggest changes and who gained`
      : "The biggest changes and who gained (none yet)",
    `Wrong facts: ${report.factsThisWeek.length} this week, ${report.factsHistory.length} up to week ${reportWeek}`,
    report.nextSteps.length
      ? `${plural(report.nextSteps.length, "suggested next step")}`
      : "Suggested next steps (none this week)",
  ];

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-muted-foreground text-sm">{report.clientName}, reports</p>
        <h1 className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">
          A report to share, and the files for the accuracy check
        </h1>
        <p className="text-muted-foreground">
          The board report summarises one week for {report.clientName}, ready to drop into a monthly
          report. Both files are made in your browser; nothing is sent anywhere.
        </p>
      </header>

      <Section title="Board report">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Select
            value={String(reportWeek)}
            onValueChange={(v) => setPicked({ header: week, week: Number(v) })}
          >
            <SelectTrigger aria-label="Week for the report" className="h-9 w-[150px]">
              <SelectValue>
                {(v: string) => `Week ${v}${Number(v) === latest ? " (latest)" : ""}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {[...weeks].reverse().map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Week {w}
                  {w === latest ? " (latest)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm">
            <span className="font-medium">
              Report for week {reportWeek}, {report.clientName}.
            </span>{" "}
            <span className="text-muted-foreground">
              {report.weeks.length > 1
                ? `It uses weeks ${report.weeks[0]} to ${reportWeek} only.`
                : `It uses week ${reportWeek} only.`}{" "}
              To make it for another company, change the company at the top of the page.
            </span>
          </p>
        </div>

        {cov === "major" || cov === "none" ? (
          <p className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm">
            <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
            {report.completeness} The report says so on its first page.
          </p>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <DownloadButton
              variant="default"
              icon={<FilePdfIcon aria-hidden />}
              label="Download PDF summary"
              busyLabel="Making the PDF..."
              fileName={`${report.fileName}.pdf`}
              make={async () => {
                const { reportPdfBlob } = await import("./report-pdf");
                return reportPdfBlob(report);
              }}
            />
            <div className="text-sm">
              <p className="text-muted-foreground mb-1.5">
                2 to 3 A4 pages that print well in black and white:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {pdfSections.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <DownloadButton
              icon={<FileXlsIcon aria-hidden />}
              label="Download Excel workbook"
              busyLabel="Making the workbook..."
              fileName={`${report.fileName}.xlsx`}
              make={async () => {
                const { workbookBlob } = await import("./report-xlsx");
                return workbookBlob(sheets, report.title);
              }}
            />
            <div className="text-sm">
              <p className="text-muted-foreground mb-1.5">
                {plural(sheets.length, "sheet")} with the numbers behind the PDF:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {sheets.map((s) => (
                  <li key={s.name}>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">
                      : {SHEET_NOTES[s.name]?.(s.rows.length, s.columns.length) ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Files for the accuracy check">
        <p className="text-muted-foreground max-w-3xl text-sm">
          These cover every loaded answer, all {weeks.length} weeks and all {companies} companies,
          whatever week or company is selected; they are exactly what{" "}
          <code className="bg-subtle rounded px-1 py-0.5 text-xs">npm run export</code> writes.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {files.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <DownloadButton
                icon={<FileCsvIcon aria-hidden />}
                label={`Download ${f.name}`}
                busyLabel={`Preparing ${f.name}...`}
                fileName={f.name}
                make={() => new Blob([f.content], { type: "text/csv;charset=utf-8" })}
              />
              <p className="text-muted-foreground text-xs">
                {f.name === "mentions.csv"
                  ? `${f.rows.toLocaleString("en-US")} rows, one per answer and company`
                  : `${plural(f.rows, "row")}, one per claim that contradicts the fact sheet`}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
