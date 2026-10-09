/** Everything the weekly summary screen shows, as plain data. */
import { engineLabel, shortName } from "../config";
import type { Results } from "../run";
import { compare, type Change, type Scoring } from "../score";
import { actions, type Action } from "./actions";
import { comparisonWeek, drivers, gainedWhereWeDropped, type Driver } from "./changes";
import { coverage, type Coverage } from "./coverage";
import { factAlerts, type FactAlert } from "./facts";

export interface ChangeView {
  against: number;
  delta: number | null;
  clear: boolean;
  comparedOn: string[] | null; // engine labels, only when fewer engines than usual were compared
  before: number | null;
  now: number | null;
}

export interface ScoreCard {
  brand: string;
  name: string;
  isClient: boolean;
  score: number | null;
  rank: number;
  mentionRate: number | null;
  vsLastWeek: ChangeView | null;
  vsEarlier: ChangeView | null;
  trend: { week: number; score: number | null; partial: boolean; band: number }[];
}

export interface WeeklyBrief {
  week: number;
  weeks: number[];
  clientName: string;
  earlier: number | null;
  /** Why the summary compares with an earlier week than the last one, when it does. */
  baselineNote: string | null;
  coverage: Coverage;
  headline: string;
  cards: ScoreCard[];
  changes: (Driver & { question: string; engineLabel: string })[];
  gained: { brand: string; name: string; pairs: { question: string; engineLabel: string }[] }[];
  facts: FactAlert[];
  /** Set when the client has no checkable facts, so "no wrong facts" would mislead. */
  factCheckUnavailable: string | null;
  competitorFacts: FactAlert[];
  /** Tracked competitors the fact sheet doesn't cover. */
  uncheckedCompetitors: string[];
  actions: Action[];
}

/** Shown instead of "no wrong facts" when there's nothing to check against. */
export const factCheckUnavailable = (name: string) =>
  `Fact-checking is unavailable for ${name}: the fact sheet has no checkable facts for it, so wrong claims can't be found. This doesn't mean the answers are accurate.`;

const finite = (n: number) => (Number.isFinite(n) ? n : null);

function changeView(
  c: Change,
  against: number,
  allEngines: string[],
  label: (e: string) => string,
): ChangeView | null {
  if (c.firstWeek) return null;
  return {
    against,
    delta: finite(c.delta),
    clear: c.clear,
    comparedOn:
      c.engines.length && c.engines.length < allEngines.length ? c.engines.map(label) : null,
    before: finite(c.before),
    now: finite(c.now),
  };
}

export function weeklyBrief(res: Results, sc: Scoring, week: number): WeeklyBrief {
  const s = res.pack.settings;
  const weeks = sc.weeks.filter((w) => w <= week);
  const prev = weeks.length > 1 ? weeks[weeks.length - 2]! : null;
  const back = weeks.length >= 4 ? weeks[weeks.length - 4]! : null;
  const allEngines = [
    ...new Set(res.answers.filter((a) => a.week !== null && a.week <= week).map((a) => a.engine)),
  ];
  const label = (e: string) => engineLabel(s, e);
  const question = (id: string) => res.pack.prompts[id]?.question ?? id;
  // cards keep a fixed order (as in brands.json) so selecting a company only moves the highlight
  const focus = Object.values(s.brands)
    .filter((b) => b.role === "client" || b.role === "tracked")
    .map((b) => b.key);
  const cov = coverage(res, week);

  const snap = (b: string) => sc.table.find((t) => t.brand === b && t.week === week);
  const ranked = [...focus].sort((a, b) => (snap(b)?.score ?? -1) - (snap(a)?.score ?? -1));
  const cards: ScoreCard[] = focus.map((b) => {
    const t = snap(b);
    return {
      brand: b,
      name: shortName(s, b),
      isClient: b === s.client,
      score: t?.score ?? null,
      rank: ranked.indexOf(b) + 1,
      mentionRate: t?.mentionRate ?? null,
      vsLastWeek:
        prev === null ? null : changeView(compare(sc, b, week, prev, s), prev, allEngines, label),
      vsEarlier:
        back === null ? null : changeView(compare(sc, b, week, back, s), back, allEngines, label),
      trend: weeks.map((w) => {
        const r = sc.table.find((x) => x.brand === b && x.week === w)!;
        return {
          week: w,
          score: r.score,
          partial: r.partial,
          band: s.clearChangeMultiplier * (Number.isFinite(r.se) ? r.se : 0),
        };
      }),
    };
  });

  const client = shortName(s, s.client);
  const earlier = comparisonWeek(sc, s.client, week, s);
  let headline: string;
  if (cov.level === "none") headline = `No usable answers came in for week ${week}.`;
  else if (earlier === null)
    headline = `Week ${week} is the first week of data, so there's nothing to compare with yet.`;
  else {
    const c = compare(sc, s.client, week, earlier, s);
    headline = c.clear
      ? `${client} is ${c.delta > 0 ? "up" : "down"} ${Math.abs(c.delta).toFixed(1)} points since week ${earlier}. That's more than the usual run-to-run variation, so it looks like a real shift.`
      : `No clear change for ${client} since week ${earlier}: the difference is within the usual run-to-run variation.`;
  }
  if (cov.level !== "none") {
    const leader = ranked[0]!;
    headline +=
      leader === s.client
        ? ` ${client} has the highest score this week.`
        : ` ${shortName(s, leader)} has the highest score this week.`;
  }

  const baselineNote =
    earlier !== null && prev !== null && earlier !== prev && cov.level !== "none"
      ? `Week ${prev} to week ${week} is within normal variation for ${client}, so this summary compares with week ${earlier} instead. A slow drift can stay inside the weekly variation every week and still add up to a real change.`
      : null;

  const others = Object.keys(s.brands).filter((b) => b !== s.client);
  const tracked = Object.values(s.brands)
    .filter((b) => b.role === "tracked")
    .map((b) => b.key);
  return {
    week,
    weeks,
    clientName: s.brands[s.client]?.name ?? client,
    earlier,
    baselineNote,
    coverage: cov,
    headline,
    cards,
    changes:
      earlier === null || cov.level === "none"
        ? []
        : drivers(sc, s.client, week, earlier, 3).map((d) => ({
            ...d,
            question: question(d.promptId),
            engineLabel: label(d.engine),
          })),
    gained:
      earlier === null || cov.level === "none"
        ? []
        : gainedWhereWeDropped(sc, s.client, week, earlier, others).map((g) => ({
            brand: g.brand,
            name: shortName(s, g.brand),
            pairs: g.pairs.map((p) => ({
              question: question(p.promptId),
              engineLabel: label(p.engine),
            })),
          })),
    facts: s.facts[s.client] ? factAlerts(res, [s.client], week) : [],
    factCheckUnavailable: s.facts[s.client] ? null : factCheckUnavailable(client),
    uncheckedCompetitors: tracked.filter((b) => !s.facts[b]).map((b) => shortName(s, b)),
    competitorFacts: factAlerts(
      res,
      tracked.filter((b) => s.facts[b]),
      week,
    ),
    actions: cov.level === "none" ? [] : actions(res, sc, week, earlier),
  };
}
