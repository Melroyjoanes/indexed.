/** What moved a company's score between two weeks, and who gained where it dropped. */
import type { Settings, Tone } from "../types";
import { compare, type Cell, type Scoring } from "../score";
import { toneWord } from "./words";

export interface Driver {
  promptId: string;
  engine: string;
  before: string; // e.g. "recommended" or "mentioned / not mentioned" when the two runs differ
  now: string;
  change: number;
  impact: number; // points this pair moved the overall score
}

export interface Gain {
  brand: string;
  pairs: { promptId: string; engine: string; gain: number }[];
  total: number;
}

const pe = (c: { promptId: string; engine: string }) => `${c.promptId}|${c.engine}`;

/** Which earlier week to explain against: last week if that change is clear, else three weeks back. */
export function comparisonWeek(
  sc: Scoring,
  brand: string,
  week: number,
  settings: Settings,
): number | null {
  const weeks = sc.weeks.filter((w) => w <= week);
  if (weeks.length < 2) return null;
  const last = weeks[weeks.length - 2]!;
  if (compare(sc, brand, week, last, settings).clear || weeks.length < 4) return last;
  return weeks[weeks.length - 4]!;
}

export function runStates(
  sc: Scoring,
  brand: string,
  week: number,
  promptId: string,
  engine: string,
): string {
  const tones: (Tone | null)[] = sc.rows
    .filter(
      (r) => r.brand === brand && r.week === week && r.promptId === promptId && r.engine === engine,
    )
    .sort((a, b) => (a.run ?? 0) - (b.run ?? 0))
    .map((r) => (r.mentioned ? r.tone : null));
  const words = [...new Set(tones.map(toneWord))];
  return words.length ? words.join(" / ") : "no answer";
}

function cellsFor(sc: Scoring, brand: string, week: number) {
  return new Map(
    sc.cells.filter((c) => c.brand === brand && c.week === week).map((c) => [pe(c), c]),
  );
}

export function drivers(
  sc: Scoring,
  brand: string,
  week: number,
  earlier: number,
  limit = 3,
): Driver[] {
  const now = cellsFor(sc, brand, week);
  const before = cellsFor(sc, brand, earlier);
  const common = [...now.keys()].filter((k) => before.has(k));
  const totalWeight = common.reduce((a, k) => a + now.get(k)!.priority, 0);
  return common
    .map((k) => {
      const a = now.get(k)!;
      const b = before.get(k)!;
      const change = a.points - b.points;
      return { a, change, impact: (change * a.priority) / totalWeight };
    })
    .filter((d) => Math.abs(d.change) > 0.01)
    .sort((x, y) => Math.abs(y.impact) - Math.abs(x.impact))
    .slice(0, limit)
    .map(({ a, change, impact }) => ({
      promptId: a.promptId,
      engine: a.engine,
      before: runStates(sc, brand, earlier, a.promptId, a.engine),
      now: runStates(sc, brand, week, a.promptId, a.engine),
      change,
      impact,
    }));
}

/** In the question/engine pairs where the client lost points, which company gained the most. */
export function gainedWhereWeDropped(
  sc: Scoring,
  client: string,
  week: number,
  earlier: number,
  others: string[],
): Gain[] {
  const losses = drivers(sc, client, week, earlier, Infinity).filter((d) => d.change < 0);
  const byBrand = new Map<string, Gain>();
  const lookup = (b: string, w: number) => cellsFor(sc, b, w);
  const nowBy = new Map(others.map((b) => [b, lookup(b, week)]));
  const beforeBy = new Map(others.map((b) => [b, lookup(b, earlier)]));
  for (const d of losses) {
    let best: string | null = null;
    let gain = 0;
    for (const b of others) {
      const n: Cell | undefined = nowBy.get(b)!.get(pe(d));
      const p: Cell | undefined = beforeBy.get(b)!.get(pe(d));
      if (n && p && n.points - p.points > gain) {
        best = b;
        gain = n.points - p.points;
      }
    }
    if (!best) continue;
    const g = byBrand.get(best) ?? { brand: best, pairs: [], total: 0 };
    g.pairs.push({ promptId: d.promptId, engine: d.engine, gain });
    g.total += gain;
    byBrand.set(best, g);
  }
  return [...byBrand.values()].sort((a, b) => b.total - a.total);
}
