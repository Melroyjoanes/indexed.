/**
 * Numbers for the "How it works" page, read from the loaded data and the
 * scoring settings so the explanation can't drift from what the code does.
 */
import { engineLabel, orderEngines } from "./config";
import { coverage } from "./insights/coverage";
import type { Results } from "./run";
import type { ScoredRow, Scoring } from "./score";
import type { Settings, Tone } from "./types";

/** One sentence per tone, in the style AI answers use. Each one is checked by a test. */
export const TONE_EXAMPLES: Record<Tone, string> = {
  recommended: "For a small trucking company, Corvane Fleet is a strong pick.",
  neutral: "Corvane Fleet offers GPS tracking and a driver app.",
  negative: "Some users complain that Corvane Fleet's reports are clunky.",
  not_recommended: "At your size I'd avoid Corvane Fleet.",
};

/** A mixed answer: praise first, then a verdict against. The last verdict wins. */
export const LAST_VERDICT_EXAMPLE =
  "Trakvia is a strong pick for large fleets. For a team of five trucks, though, I'd avoid Trakvia.";

export interface MethodFacts {
  engines: string[]; // labels, in the order the data first had them
  questions: number;
  runsPerWeek: number;
  perWeek: number; // answers a complete week has
  weeks: number[];
  answers: number; // answers that came back and are scored
  byPriority: Record<number, number>; // priority -> number of questions
}

export function methodFacts(res: Results): MethodFacts {
  const s = res.pack.settings;
  const engines = orderEngines(
    res.answers.map((a) => a.engine),
    res.pack.settings,
  );
  const promptIds = new Set([
    ...Object.keys(res.pack.prompts),
    ...res.answers.map((a) => a.promptId),
  ]);
  const byPriority: Record<number, number> = {};
  for (const id of promptIds) {
    const p = res.pack.prompts[id]?.priority ?? 1;
    byPriority[p] = (byPriority[p] ?? 0) + 1;
  }
  const weeks = [
    ...new Set(res.answers.map((a) => a.week).filter((w): w is number => w !== null)),
  ].sort((a, b) => a - b);
  return {
    engines: engines.map((e) => engineLabel(s, e)),
    questions: promptIds.size,
    runsPerWeek: s.runsPerWeek,
    perWeek: engines.length * promptIds.size * s.runsPerWeek,
    weeks,
    answers: res.answers.filter((a) => a.ok).length,
    byPriority,
  };
}

/** Weight for being named 1st, 2nd, ... ; the last entry covers every later place. */
export function positionWeightFor(settings: Settings, position: number): number {
  const pw = settings.positionWeight;
  return pw.length ? pw[Math.min(position - 1, pw.length - 1)]! : 1;
}

export interface WorkedRun {
  responseId: string;
  run: number | null;
  tone: Tone | null;
  position: number | null;
  points: number;
}

export interface WorkedExample {
  brand: string;
  week: number;
  responseId: string;
  promptId: string;
  question: string;
  engine: string;
  engineLabel: string;
  run: number | null;
  tone: Tone;
  position: number;
  basePoints: number;
  weight: number;
  points: number;
  evidence: string;
  runs: WorkedRun[]; // every run of this question on this AI tool in the week
  average: number;
  priority: number;
  weekScore: number | null;
}

/**
 * One of the company's answers in a week, with each step of its points spelled
 * out. Prefers an answer where the company was named second or later, so the
 * place adjustment shows, and a recommendation, so the numbers are easy to follow.
 */
export function workedExample(
  res: Results,
  sc: Scoring,
  brand: string,
  week: number,
): WorkedExample | null {
  const s = res.pack.settings;
  const rows = sc.rows
    .filter((r) => r.brand === brand && r.week === week && r.mentioned && r.tone && r.position)
    .sort(
      (a, b) =>
        a.promptId.localeCompare(b.promptId) ||
        a.engine.localeCompare(b.engine) ||
        (a.run ?? 0) - (b.run ?? 0),
    );
  const rank = (r: ScoredRow) => (r.position! > 1 ? 0 : 2) + (r.tone === "recommended" ? 0 : 1);
  const pick = [...rows].sort((a, b) => rank(a) - rank(b))[0];
  if (!pick) return null;

  const runs = sc.rows
    .filter(
      (r) =>
        r.brand === brand &&
        r.week === week &&
        r.promptId === pick.promptId &&
        r.engine === pick.engine,
    )
    .sort((a, b) => (a.run ?? 0) - (b.run ?? 0))
    .map((r) => ({
      responseId: r.responseId,
      run: r.run,
      tone: r.tone,
      position: r.position,
      points: r.points,
    }));
  const answer = res.answers.find((a) => a.responseId === pick.responseId)!;
  const weekScore = sc.table.find((t) => t.brand === brand && t.week === week)?.score ?? null;
  return {
    brand,
    week,
    responseId: pick.responseId,
    promptId: pick.promptId,
    question: answer.prompt.question,
    engine: pick.engine,
    engineLabel: engineLabel(s, pick.engine),
    run: pick.run,
    tone: pick.tone!,
    position: pick.position!,
    basePoints: s.points[pick.tone!],
    weight: positionWeightFor(s, pick.position!),
    points: pick.points,
    evidence: pick.evidence,
    runs,
    average: runs.reduce((a, r) => a + r.points, 0) / runs.length,
    priority: pick.priority,
    weekScore,
  };
}

export interface MissingToolWeek {
  week: number;
  missing: string[]; // AI tool labels with no answers that week
  comparedOn: string[]; // AI tool labels changes were compared on
}

/** The first week up to `upTo` where a whole AI tool is missing, to show how gaps are handled. */
export function missingToolExample(res: Results, upTo: number): MissingToolWeek | null {
  const weeks = [
    ...new Set(res.answers.map((a) => a.week).filter((w): w is number => w !== null && w <= upTo)),
  ].sort((a, b) => a - b);
  for (const week of weeks) {
    const c = coverage(res, week);
    const missing = c.engines.filter((e) => e.received === 0).map((e) => e.label);
    if (missing.length && c.comparedOn.length) return { week, missing, comparedOn: c.comparedOn };
  }
  return null;
}
