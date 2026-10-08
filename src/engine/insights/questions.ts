/**
 * The question view: for one company and one week, how each AI tool answered
 * each buyer question. Every outcome keeps the response ids it came from, so
 * the screen can open the original answers.
 */
import { expectedFor } from "../score";
import type { Results } from "../run";
import type { Tone } from "../types";
import { plural } from "./words";

/** One run of one question on one engine, seen from one company's side. */
export type RunOutcome =
  | {
      kind: "answered";
      responseId: string;
      run: number | null;
      mentioned: boolean;
      tone: Tone | null; // null when the company isn't mentioned
      position: number | null;
    }
  | { kind: "failed"; responseId: string; run: number | null; error: string };

export interface QuestionEngineResult {
  engine: string;
  /** "answered": at least one usable run. "failed": every request failed. "not_collected": nothing came in. */
  status: "answered" | "failed" | "not_collected";
  runs: RunOutcome[]; // in run order
  responseIds: string[];
  /** True when every usable run gave the same tone and position. */
  runsAgree: boolean;
}

export interface QuestionRow {
  promptId: string;
  question: string;
  stage: string;
  priority: number;
  engines: QuestionEngineResult[]; // same order as QuestionMatrix.engines
}

export interface ToneCounts {
  answers: number; // usable answers
  mentioned: number; // named at all, any tone
  recommended: number;
  neutral: number;
  negative: number;
  not_recommended: number;
  notMentioned: number;
  failed: number; // requests that errored or came back empty
}

export interface QuestionMatrix {
  brand: string;
  week: number;
  engines: string[]; // every engine expected that week, including ones not collected
  stages: string[]; // stages present, in buying order
  rows: QuestionRow[];
}

/** Narrow the matrix. "all" / "any" mean no filter. */
export type ToneFilter = "any" | Tone | "not_mentioned";

export interface QuestionFilters {
  stage: string; // "all" or a stage from prompts.csv
  engine: string; // "all" or an engine key
  tone: ToneFilter;
  text?: string; // matched against question text and question id
}

export const NO_FILTERS: QuestionFilters = { stage: "all", engine: "all", tone: "any", text: "" };

const STAGE_ORDER = ["early_research", "comparing_options", "specific_company"];

/** How each buying stage is named on screen. */
export const STAGE_LABEL: Record<string, string> = {
  early_research: "Early research",
  comparing_options: "Comparing options",
  specific_company: "Specific company",
};

export function stageLabel(stage: string): string {
  if (STAGE_LABEL[stage]) return STAGE_LABEL[stage];
  const words = stage.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Other";
}

const stageRank = (s: string) => {
  const i = STAGE_ORDER.indexOf(s);
  return i === -1 ? STAGE_ORDER.length : i;
};

/**
 * Builds the matrix for one company in one week. Engines and questions are
 * the ones the week was expected to have (see expectedFor), so a tool that
 * wasn't collected shows as such instead of disappearing. Nothing from later
 * weeks is read.
 */
export function questionMatrix(res: Results, brand: string, week: number): QuestionMatrix {
  const { engines, prompts } = expectedFor(res, week);
  const inWeek = res.answers.filter((a) => a.week === week);
  const mention = new Map(
    res.mentions.filter((m) => m.brand === brand).map((m) => [m.responseId, m]),
  );

  const rows: QuestionRow[] = prompts.map((promptId) => {
    const asked = inWeek.filter((a) => a.promptId === promptId);
    const prompt = res.pack.prompts[promptId] ?? {
      question: promptId,
      stage: "unknown",
      priority: 1,
    };
    return {
      promptId,
      question: prompt.question,
      stage: prompt.stage,
      priority: prompt.priority,
      engines: engines.map((engine) => {
        const runs: RunOutcome[] = asked
          .filter((a) => a.engine === engine)
          .sort((x, y) => (x.run ?? 0) - (y.run ?? 0))
          .map((a) => {
            if (!a.ok)
              return {
                kind: "failed",
                responseId: a.responseId,
                run: a.run,
                error: a.error ?? "empty answer",
              };
            const m = mention.get(a.responseId);
            return {
              kind: "answered",
              responseId: a.responseId,
              run: a.run,
              mentioned: m?.mentioned ?? false,
              tone: m?.mentioned ? m.tone : null,
              position: m?.mentioned ? m.position : null,
            };
          });
        const usable = runs.filter((r) => r.kind === "answered");
        const status = usable.length ? "answered" : runs.length ? "failed" : "not_collected";
        const looks = new Set(usable.map((r) => `${r.tone}|${r.position}`));
        return {
          engine,
          status,
          runs,
          responseIds: runs.map((r) => r.responseId),
          runsAgree: looks.size <= 1,
        };
      }),
    };
  });

  const stages = [...new Set(rows.map((r) => r.stage))].sort(
    (a, b) => stageRank(a) - stageRank(b) || a.localeCompare(b),
  );
  return { brand, week, engines, stages, rows };
}

const matchesTone = (r: RunOutcome, tone: ToneFilter) =>
  r.kind === "answered" && (tone === "not_mentioned" ? !r.mentioned : r.tone === tone);

/**
 * Applies the filters. The engine filter keeps only that engine's column; the
 * tone filter keeps questions where at least one run on the shown engines has
 * that tone.
 */
export function filterMatrix(m: QuestionMatrix, f: QuestionFilters): QuestionMatrix {
  const engines = f.engine === "all" ? m.engines : m.engines.filter((e) => e === f.engine);
  const text = (f.text ?? "").trim().toLowerCase();
  const rows = m.rows
    .filter((r) => f.stage === "all" || r.stage === f.stage)
    .filter(
      (r) => !text || r.question.toLowerCase().includes(text) || r.promptId.toLowerCase() === text,
    )
    .map((r) => ({ ...r, engines: r.engines.filter((e) => engines.includes(e.engine)) }))
    .filter(
      (r) =>
        f.tone === "any" || r.engines.some((e) => e.runs.some((run) => matchesTone(run, f.tone))),
    );
  return { ...m, engines, rows };
}

/** Counts every run in the matrix (after filtering, if it was filtered). */
export function toneCounts(m: QuestionMatrix): ToneCounts {
  const c: ToneCounts = {
    answers: 0,
    mentioned: 0,
    recommended: 0,
    neutral: 0,
    negative: 0,
    not_recommended: 0,
    notMentioned: 0,
    failed: 0,
  };
  for (const row of m.rows)
    for (const e of row.engines)
      for (const r of e.runs) {
        if (r.kind === "failed") {
          c.failed += 1;
          continue;
        }
        c.answers += 1;
        if (r.mentioned && r.tone) {
          c.mentioned += 1;
          c[r.tone] += 1;
        } else c.notMentioned += 1;
      }
  return c;
}

/** "Corvane was named in 50 of 90 answers: recommended in 11, criticised in 3. Not mentioned in 40." */
export function countsLine(name: string, c: ToneCounts): string {
  const failed =
    c.failed > 0
      ? `${plural(c.failed, "request")} failed and ${c.failed === 1 ? "isn't" : "aren't"} counted.`
      : "";
  if (c.answers === 0) return failed ? `No usable answers. ${failed}` : "No answers here.";
  const of = plural(c.answers, "answer");
  let line: string;
  if (c.mentioned === 0) line = `${name} wasn't named in any of the ${of}.`;
  else {
    const verdicts: [number, string][] = [
      [c.recommended, "recommended"],
      [c.negative, "criticised"],
      [c.not_recommended, "advised against"],
    ];
    const detail = verdicts.filter(([n]) => n > 0).map(([n, w]) => `${w} in ${n}`);
    line = `${name} was named in ${c.mentioned} of ${of}`;
    line += detail.length ? `: ${detail.join(", ")}.` : ", never recommended.";
    if (c.notMentioned > 0) line += ` Not mentioned in ${c.notMentioned}.`;
  }
  return failed ? `${line} ${failed}` : line;
}

export type AnswerLookup =
  | { status: "found"; responseId: string; week: number | null }
  | { status: "later"; responseId: string; week: number }
  | { status: "none" };

/** Finds an answer by its id (e.g. r_7fe0f8a5757a), but never one from after the selected week. */
export function findAnswer(res: Results, id: string, week: number): AnswerLookup {
  const q = id.trim().toLowerCase();
  if (!q) return { status: "none" };
  const a = res.answers.find((x) => x.responseId.toLowerCase() === q);
  if (!a) return { status: "none" };
  if (a.week !== null && a.week > week)
    return { status: "later", responseId: a.responseId, week: a.week };
  return { status: "found", responseId: a.responseId, week: a.week };
}
