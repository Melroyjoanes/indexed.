/** Data for the competitor screen: score trend, head-to-head tally and who replaced the client. */
import { focusBrands } from "../config";
import type { Results } from "../run";
import type { Scoring } from "../score";
import type { Settings } from "../types";
import type { Replacement, Winner } from "./competitors";

export interface TrendPoint {
  week: number;
  partial: boolean; // some expected answers were missing that week
  scores: Record<string, number | null>; // client first, then tracked competitors
  /** The client's usual run-to-run range around its score, or null without a score. */
  low: number | null;
  high: number | null;
}

/**
 * Weekly scores of the client and tracked competitors, for weeks up to `through`.
 * The band is the same one the weekly brief uses: clearChangeMultiplier times
 * the client's standard error, so a week outside it is a clear change.
 */
export function scoreTrend(sc: Scoring, settings: Settings, through: number): TrendPoint[] {
  const focus = focusBrands(settings);
  return sc.weeks
    .filter((w) => w <= through)
    .map((week) => {
      const row = (b: string) => sc.table.find((t) => t.brand === b && t.week === week);
      const client = row(settings.client);
      const score = client?.score ?? null;
      const band =
        settings.clearChangeMultiplier * (client && Number.isFinite(client.se) ? client.se : 0);
      return {
        week,
        partial: client?.partial ?? false,
        scores: Object.fromEntries(focus.map((b) => [b, row(b)?.score ?? null])),
        low: score === null ? null : Math.max(0, score - band),
        high: score === null ? null : Math.min(100, score + band),
      };
    });
}

export interface WinnerTally {
  pairs: number;
  led: { brand: string; count: number }[]; // most first
  ties: number;
  none: number;
}

/** How many question and engine pairs each company led outright, plus ties and empty ones. */
export function winnerTally(ws: Winner[]): WinnerTally {
  const led = new Map<string, number>();
  for (const w of ws)
    if (w.status === "win") led.set(w.winners[0]!, (led.get(w.winners[0]!) ?? 0) + 1);
  return {
    pairs: ws.length,
    led: [...led.entries()]
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand)),
    ties: ws.filter((w) => w.status === "tie").length,
    none: ws.filter((w) => w.status === "none").length,
  };
}

/** "Of 45 question and AI tool pairs this week, Trakvia led 12, Corvane 9, ties 5, no one recommended 4." */
export function tallySentence(t: WinnerTally, name: (brand: string) => string): string {
  if (!t.pairs) return "No questions were answered this week.";
  const parts = t.led.map((l, i) =>
    i === 0 ? `${name(l.brand)} led ${l.count}` : `${name(l.brand)} ${l.count}`,
  );
  if (t.ties) parts.push(`ties ${t.ties}`);
  if (t.none) parts.push(`no one recommended ${t.none}`);
  const pairs = `${t.pairs} question and AI tool ${t.pairs === 1 ? "pair" : "pairs"}`;
  return `Of ${pairs} this week, ${parts.join(", ")}.`;
}

export interface ReplacedSummary {
  drops: number; // times the client dropped out of a question on one AI tool
  replacers: { brand: string; times: number }[]; // most first
  unreplaced: number; // drops where no other company newly appeared
  byWeek: { week: number; items: Replacement[] }[]; // latest week first
}

/** Who appeared when the client dropped out of a question, for weeks up to `through`. */
export function whoReplaced(reps: Replacement[], client: string, through: number): ReplacedSummary {
  const mine = reps.filter((r) => r.dropped === client && r.week <= through);
  const times = new Map<string, number>();
  for (const r of mine) for (const b of r.replacedBy) times.set(b, (times.get(b) ?? 0) + 1);
  const weeks = [...new Set(mine.map((r) => r.week))].sort((a, b) => b - a);
  return {
    drops: mine.length,
    replacers: [...times.entries()]
      .map(([brand, n]) => ({ brand, times: n }))
      .sort((a, b) => b.times - a.times || a.brand.localeCompare(b.brand)),
    unreplaced: mine.filter((r) => !r.replacedBy.length).length,
    byWeek: weeks.map((week) => ({
      week,
      items: mine
        .filter((r) => r.week === week)
        .sort((a, b) => a.promptId.localeCompare(b.promptId) || a.engine.localeCompare(b.engine)),
    })),
  };
}

/** The answers behind one question on one engine in the given weeks, oldest first. */
export function pairAnswerIds(
  res: Results,
  promptId: string,
  engine: string,
  weeks: number[],
): string[] {
  return res.answers
    .filter(
      (a) =>
        a.promptId === promptId && a.engine === engine && a.week !== null && weeks.includes(a.week),
    )
    .sort((x, y) => (x.week ?? 0) - (y.week ?? 0) || (x.run ?? 0) - (y.run ?? 0))
    .map((a) => a.responseId);
}
