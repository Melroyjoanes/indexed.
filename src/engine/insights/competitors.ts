/** Head-to-head: who's most recommended per question and engine, and who replaces whom. */
import type { ScoredRow } from "../score";

export interface Winner {
  promptId: string;
  engine: string;
  status: "win" | "tie" | "none"; // "none": nobody was recommended
  winners: string[];
  points: number;
  runs: number;
}

/**
 * Only companies the AI actually recommended at least once can win. Equal
 * scores are a tie, never broken by sort order.
 */
export function winners(rows: ScoredRow[], weeks: number[]): Winner[] {
  const inRange = rows.filter((r) => weeks.includes(r.week));
  const pairs = new Map<string, ScoredRow[]>();
  for (const r of inRange) {
    const k = `${r.promptId}|${r.engine}`;
    pairs.set(k, [...(pairs.get(k) ?? []), r]);
  }
  const out: Winner[] = [];
  for (const g of pairs.values()) {
    const runs = new Set(g.map((r) => r.responseId)).size;
    const pts = new Map<string, number[]>();
    for (const r of g) pts.set(r.brand, [...(pts.get(r.brand) ?? []), r.points]);
    const avg = (b: string) => {
      const xs = pts.get(b)!;
      return xs.reduce((a, x) => a + x, 0) / xs.length;
    };
    const recommended = [...new Set(g.filter((r) => r.tone === "recommended").map((r) => r.brand))];
    const base = { promptId: g[0]!.promptId, engine: g[0]!.engine, runs };
    if (!recommended.length) {
      out.push({ ...base, status: "none", winners: [], points: 0 });
      continue;
    }
    const top = Math.max(...recommended.map(avg));
    const best = recommended.filter((b) => Math.abs(avg(b) - top) < 1e-9).sort();
    out.push({ ...base, status: best.length > 1 ? "tie" : "win", winners: best, points: top });
  }
  return out.sort(
    (a, b) => a.promptId.localeCompare(b.promptId) || a.engine.localeCompare(b.engine),
  );
}

export interface Replacement {
  week: number;
  promptId: string;
  engine: string;
  dropped: string;
  replacedBy: string[]; // companies that appeared that week but not the week before
}

/** When a company drops out of a question/engine from one week to the next, who appears instead. */
export function replacements(rows: ScoredRow[]): Replacement[] {
  const present = new Map<string, Map<number, Set<string>>>();
  for (const r of rows) {
    if (!r.mentioned) continue;
    const k = `${r.promptId}|${r.engine}`;
    const byWeek = present.get(k) ?? new Map<number, Set<string>>();
    byWeek.set(r.week, (byWeek.get(r.week) ?? new Set()).add(r.brand));
    present.set(k, byWeek);
  }
  const out: Replacement[] = [];
  for (const [k, byWeek] of present) {
    const [promptId, engine] = k.split("|") as [string, string];
    for (const week of [...byWeek.keys()].sort((a, b) => a - b)) {
      const prev = byWeek.get(week - 1);
      const cur = byWeek.get(week)!;
      if (!prev) continue;
      const appeared = [...cur].filter((b) => !prev.has(b)).sort();
      for (const dropped of [...prev].filter((b) => !cur.has(b)).sort()) {
        out.push({ week, promptId, engine, dropped, replacedBy: appeared });
      }
    }
  }
  return out.sort((a, b) => b.week - a.week || a.promptId.localeCompare(b.promptId));
}
