/**
 * The visibility score and how it moves.
 *
 * Score (0-100): how strongly AI answers point buyers toward a company. Each
 * answer gives a company points for its tone (recommended 100, mentioned 50,
 * criticised 20, advised against or missing 0), a little less if it isn't
 * named first. Points are averaged per question and engine, then across them,
 * with the questions closest to a purchase counting more (priority 1-3).
 *
 * Every question is asked twice per engine per week. The gap between the two
 * runs shows how much a company's score moves by chance; a change only counts
 * as clear when it's bigger than twice that. Week-to-week comparisons use only
 * the question/engine pairs both weeks have, so a missing engine can't look
 * like a drop.
 */
import type { Results } from "./run";
import type { Settings, Tone } from "./types";

export interface ScoredRow {
  responseId: string;
  brand: string;
  week: number;
  promptId: string;
  engine: string;
  run: number | null;
  priority: number;
  mentioned: boolean;
  position: number | null;
  tone: Tone | null;
  evidence: string;
  points: number;
}

/** Average for one company on one question, one engine, one week. */
export interface Cell {
  week: number;
  promptId: string;
  engine: string;
  brand: string;
  points: number;
  runs: number;
  priority: number;
  mentionRate: number;
}

export interface Change {
  delta: number;
  se: number;
  clear: boolean;
  cells: number;
  now: number;
  before: number;
  engines: string[]; // engines both weeks had, i.e. what was compared
  firstWeek: boolean; // nothing earlier to compare with
}

export interface WeekScore {
  brand: string;
  week: number;
  score: number | null;
  se: number;
  answers: number;
  expectedAnswers: number;
  partial: boolean;
  missingEngines: string[];
  mentionRate: number | null;
}

export interface Scoring {
  rows: ScoredRow[];
  cells: Cell[];
  noise: Record<string, number>;
  weeks: number[];
  table: WeekScore[];
}

const cellKey = (c: { week: number; promptId: string; engine: string }) =>
  `${c.week}|${c.promptId}|${c.engine}`;

export function scoreRows(res: Results): ScoredRow[] {
  const s = res.pack.settings;
  const byId = new Map(res.answers.map((a) => [a.responseId, a]));
  const out: ScoredRow[] = [];
  for (const m of res.mentions) {
    const a = byId.get(m.responseId);
    if (!a || !a.ok || a.week === null) continue;
    let points = 0;
    if (m.mentioned && m.tone && m.position) {
      const pw = s.positionWeight;
      points = s.points[m.tone] * (pw.length ? pw[Math.min(m.position - 1, pw.length - 1)]! : 1);
    }
    out.push({
      responseId: m.responseId,
      brand: m.brand,
      week: a.week,
      promptId: a.promptId,
      engine: a.engine,
      run: a.run,
      priority: a.prompt.priority,
      mentioned: m.mentioned,
      position: m.position,
      tone: m.tone,
      evidence: m.evidence,
      points,
    });
  }
  return out;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const g = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = g.get(k);
    if (list) list.push(it);
    else g.set(k, [it]);
  }
  return g;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function cellsOf(rows: ScoredRow[]): Cell[] {
  return [...groupBy(rows, (r) => `${cellKey(r)}|${r.brand}`).values()].map((g) => ({
    week: g[0]!.week,
    promptId: g[0]!.promptId,
    engine: g[0]!.engine,
    brand: g[0]!.brand,
    points: mean(g.map((r) => r.points)),
    runs: g.length,
    priority: g[0]!.priority,
    mentionRate: mean(g.map((r) => (r.mentioned ? 1 : 0))),
  }));
}

/** Per company: variance of a single run, from every pair of runs of the same question. */
export function runNoise(rows: ScoredRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [brand, g] of groupBy(rows, (r) => r.brand)) {
    const sq: number[] = [];
    for (const runs of groupBy(g, cellKey).values()) {
      if (runs.length >= 2) sq.push((runs[0]!.points - runs[1]!.points) ** 2 / 2);
    }
    out[brand] = sq.length ? mean(sq) : 0;
  }
  return out;
}

function weighted(cells: Cell[], var1: number): { score: number; se: number } | null {
  if (!cells.length) return null;
  const sw = cells.reduce((a, c) => a + c.priority, 0);
  const score = cells.reduce((a, c) => a + c.priority * c.points, 0) / sw;
  const se = Math.sqrt(cells.reduce((a, c) => a + (c.priority ** 2 * var1) / c.runs, 0)) / sw;
  return { score, se };
}

/** Like-for-like change between two weeks for one company. */
export function compare(
  sc: Pick<Scoring, "cells" | "noise">,
  brand: string,
  week: number,
  earlier: number | null,
  settings: Settings,
): Change {
  const empty = {
    delta: NaN,
    se: NaN,
    clear: false,
    cells: 0,
    now: NaN,
    before: NaN,
    engines: [] as string[],
  };
  if (earlier === null || earlier >= week) return { ...empty, firstWeek: true };
  const cur = sc.cells.filter((c) => c.brand === brand && c.week === week);
  const old = sc.cells.filter((c) => c.brand === brand && c.week === earlier);
  const pe = (c: Cell) => `${c.promptId}|${c.engine}`;
  const oldKeys = new Set(old.map(pe));
  const keys = new Set(cur.map(pe).filter((k) => oldKeys.has(k)));
  if (!keys.size) return { ...empty, firstWeek: false };
  const v = sc.noise[brand] ?? 0;
  const a = weighted(
    cur.filter((c) => keys.has(pe(c))),
    v,
  )!;
  const b = weighted(
    old.filter((c) => keys.has(pe(c))),
    v,
  )!;
  const delta = a.score - b.score;
  const se = Math.sqrt(a.se ** 2 + b.se ** 2);
  return {
    delta,
    se,
    clear: Math.abs(delta) > settings.clearChangeMultiplier * se && Math.abs(delta) >= 1,
    cells: keys.size,
    now: a.score,
    before: b.score,
    engines: [...new Set([...keys].map((k) => k.split("|")[1]!))].sort(),
    firstWeek: false,
  };
}

/**
 * Engines and questions a week was expected to have: every engine seen up to
 * that week, and every question in prompts.csv plus any other asked by then.
 * Later weeks never change what an earlier week expected.
 */
export function expectedFor(res: Results, week: number): { engines: string[]; prompts: string[] } {
  const upTo = res.answers.filter((a) => a.week !== null && a.week <= week);
  const engines = [...new Set(upTo.map((a) => a.engine))].sort();
  const prompts = [
    ...new Set([...Object.keys(res.pack.prompts), ...upTo.map((a) => a.promptId)]),
  ].sort();
  return { engines, prompts };
}

export function score(res: Results): Scoring {
  const s = res.pack.settings;
  const rows = scoreRows(res);
  const cells = cellsOf(rows);
  const noise = runNoise(rows);
  const weeks = [
    ...new Set(res.answers.map((a) => a.week).filter((w): w is number => w !== null)),
  ].sort((a, b) => a - b);
  const table: WeekScore[] = [];
  for (const week of weeks) {
    const ok = res.answers.filter((a) => a.ok && a.week === week);
    const { engines, prompts } = expectedFor(res, week);
    const expectedAnswers = engines.length * prompts.length * s.runsPerWeek;
    const have = new Set(ok.map((a) => a.engine));
    for (const brand of Object.keys(s.brands)) {
      const cur = cells.filter((c) => c.brand === brand && c.week === week);
      const w = weighted(cur, noise[brand] ?? 0);
      table.push({
        brand,
        week,
        score: w ? w.score : null,
        se: w ? w.se : NaN,
        answers: ok.length,
        expectedAnswers,
        partial: ok.length < expectedAnswers,
        missingEngines: engines.filter((e) => !have.has(e)),
        mentionRate: cur.length ? mean(cur.map((c) => c.mentionRate)) : null,
      });
    }
  }
  return { rows, cells, noise, weeks, table };
}
