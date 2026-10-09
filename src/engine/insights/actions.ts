/**
 * Suggested next steps. Each says what we saw, what to try and what to keep
 * watching. The data shows patterns, not causes: a later change in the answers
 * is evidence to look at, not proof that a step worked.
 */
import { engineLabel, shortName } from "../config";
import type { Results } from "../run";
import type { Scoring } from "../score";
import { gainedWhereWeDropped, drivers } from "./changes";
import { factAlerts, factCounts } from "./facts";
import { sources } from "./sources";
import { listOf, plural } from "./words";

export interface Action {
  kind: "facts" | "question" | "complaint" | "sources" | "sales";
  title: string;
  detail: string;
}

const THEMES: [string, RegExp][] = [
  ["setup takes longer than expected", /setup .*longer/i],
  ["slow customer support", /slow customer support|slow support/i],
  ["complaints about contract terms", /contract terms/i],
  ["billing complaints", /billing complaints/i],
  ["it's expensive", /expensive/i],
  ["limited reporting", /reporting is limited/i],
  ["a clunky mobile app", /clunky/i],
  ["outages and slow fixes", /outages/i],
];

export function complaintThemes(
  sc: Scoring,
  brand: string,
  from: number,
  to: number,
): [string, number][] {
  const counts = new Map<string, number>();
  for (const r of sc.rows) {
    if (r.brand !== brand || r.week < from || r.week > to) continue;
    if (r.tone !== "negative" && r.tone !== "not_recommended") continue;
    for (const [name, rx] of THEMES)
      if (rx.test(r.evidence)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function actions(res: Results, sc: Scoring, week: number, earlier: number | null): Action[] {
  const s = res.pack.settings;
  const c = s.client;
  const name = shortName(s, c);
  const question = (id: string) => res.pack.prompts[id]?.question ?? id;
  const out: Action[] = [];

  const facts = factAlerts(res, [c], week)
    .filter((f) => f.thisWeek > 0)
    .slice(0, 3);
  if (facts.length) {
    out.push({
      kind: "facts",
      title: `Correct what AI gets wrong about ${name}`,
      detail:
        facts
          .map((f) => `${factCounts(f, week).lead} (${f.truth}; ${f.answers} in total)`)
          .join("; ") +
        ". Check the pages those answers cite and make sure the website, pricing page and review-site listings say it clearly. Then keep tracking how often the claims appear. Answers vary week to week, so fewer of them is a sign to look at, not proof the correction worked.",
    });
  }

  if (earlier !== null) {
    const others = Object.values(s.brands)
      .filter((b) => b.key !== c && b.role !== "other")
      .map((b) => b.key);
    const gains = gainedWhereWeDropped(sc, c, week, earlier, [
      ...others,
      ...Object.values(s.brands)
        .filter((b) => b.role === "other")
        .map((b) => b.key),
    ]);
    for (const d of drivers(sc, c, week, earlier, 5)
      .filter((x) => x.change < 0)
      .slice(0, 2)) {
      const who = gains.find((g) =>
        g.pairs.some((p) => p.promptId === d.promptId && p.engine === d.engine),
      );
      out.push({
        kind: "question",
        title: `Look at "${question(d.promptId)}" on ${engineLabel(s, d.engine)}`,
        detail:
          `${name} went from ${d.before} to ${d.now} since week ${earlier}` +
          (who ? `, and ${shortName(s, who.brand)} gained there` : "") +
          ". A page that answers this exact question is the most direct thing to try. Keep watching this question afterwards: a change here is worth noting, but on its own it doesn't show the page caused it.",
      });
    }
  }

  const themes = complaintThemes(sc, c, earlier ?? week, week);
  if (themes.length) {
    const [theme, n] = themes[0]!;
    out.push({
      kind: "complaint",
      title: `AI keeps repeating "${theme}" about ${name}`,
      detail: `It came up in ${plural(n, "critical answer")} since week ${earlier ?? week}. Worth checking whether it's still true and, if not, making the current picture visible in reviews and support pages.`,
    });
  }

  const src = sources(res, week).filter((x) => !x.ownedBy && !x.domain.endsWith(".gov"));
  const never = src.filter((x) => x.neverClient).slice(0, 3);
  const behind = src.filter((x) => x.competitorAhead).slice(0, 3);
  if (never.length || behind.length) {
    out.push({
      kind: "sources",
      title: "Show up on the sites AI cites",
      detail: never.length
        ? `${listOf(never.map((x) => x.domain))} are cited next to competitors but never next to ${name}.`
        : `In answers citing ${listOf(behind.map((x) => `${x.domain} (${shortName(s, x.competitorAhead!)} named more)`))}, a competitor comes up more often than ${name}. These are review and listing sites where being present and current is in our hands.`,
    });
  }

  const tracked = Object.values(s.brands)
    .filter((b) => b.role === "tracked")
    .map((b) => b.key);
  // factAlerts already sorts by this week's count, then the total
  const comp = factAlerts(res, tracked, week)[0];
  if (comp) {
    const n = factCounts(comp, week);
    out.push({
      kind: "sales",
      title: `For sales: AI is wrong about ${shortName(s, comp.brand)} too`,
      detail: `${n.lead}, but ${comp.truth} (${n.history.charAt(0).toLowerCase()}${n.history.slice(1)}). Prospects may have read this.`,
    });
  }
  return out;
}
