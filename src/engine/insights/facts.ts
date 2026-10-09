/** Wrong facts grouped into alerts, only ever using weeks up to the one shown. */
import { orderEngines } from "../config";
import type { ClaimRow, Results } from "../run";
import { plural } from "./words";

export interface FactAlert {
  brand: string;
  factKey: string;
  claimed: string;
  actual: string;
  /** "Corvane is based in Chicago" */
  claim: string;
  /** "it's in Columbus, Ohio" */
  truth: string;
  answers: number; // up to and including the week shown
  thisWeek: number;
  firstWeek: number;
  lastWeek: number;
  engines: string[];
  responseIds: string[];
  example: string;
}

const FEATURE_NAMES: Record<string, string> = {
  eld_compliance: "ELD compliance",
  gps_tracking: "GPS tracking",
  fuel_card_integration: "fuel card integration",
  maintenance_alerts: "maintenance alerts",
  driver_app: "a driver app",
  dashcams: "dashcams",
  payroll: "payroll",
};

export function describeFact(
  name: string,
  key: string,
  claimed: string,
  actual: string,
): { claim: string; truth: string } {
  if (key.startsWith("features.")) {
    const f = key.slice("features.".length);
    const feat = FEATURE_NAMES[f] ?? f.replace(/_/g, " ");
    return claimed === "true"
      ? { claim: `${name} offers ${feat}`, truth: "it doesn't" }
      : { claim: `${name} doesn't offer ${feat}`, truth: "it does" };
  }
  switch (key) {
    case "hq":
      return { claim: `${name} is based in ${claimed}`, truth: `it's in ${actual}` };
    case "founded":
      return { claim: `${name} was founded in ${claimed}`, truth: `it was founded in ${actual}` };
    case "starting_price_usd":
      return {
        claim: `${name} starts at $${claimed} per vehicle`,
        truth: `it starts at $${actual}`,
      };
    case "integrations":
      return claimed.startsWith("not ")
        ? { claim: `${name} doesn't work with ${claimed.slice(4)}`, truth: "it does" }
        : {
            claim: `${name} works with ${claimed}`,
            truth: actual ? `its integrations are ${actual}` : "it has no listed integrations",
          };
    default:
      return { claim: `${name}'s ${key} is ${claimed}`, truth: `it's ${actual}` };
  }
}

/**
 * This week's count leads and the running total is labelled as such, so a
 * claim that has been around for weeks doesn't read as a new spike.
 *   lead:    "2 answers this week say Corvane is based in Chicago"
 *   history: "8 answers in total since week 1"
 */
export function factCounts(f: FactAlert, week: number): { lead: string; history: string } {
  const span =
    f.firstWeek === f.lastWeek
      ? `in week ${f.firstWeek}`
      : `from week ${f.firstWeek} to ${f.lastWeek}`;
  if (f.thisWeek === 0)
    return {
      lead: f.claim.charAt(0).toUpperCase() + f.claim.slice(1),
      history: `Not seen this week; ${plural(f.answers, "answer")} ${span}`,
    };
  return {
    lead: `${f.thisWeek} ${f.thisWeek === 1 ? "answer this week says" : "answers this week say"} ${f.claim}`,
    history:
      f.answers === f.thisWeek && f.firstWeek === week
        ? "First seen this week"
        : `${plural(f.answers, "answer")} in total since week ${f.firstWeek}`,
  };
}

export function factAlerts(res: Results, brands: string[], through: number): FactAlert[] {
  const weekOf = new Map(res.answers.map((a) => [a.responseId, a]));
  const rows = res.claims.filter((c) => {
    const w = weekOf.get(c.responseId)?.week;
    return c.wrong && brands.includes(c.brand) && w !== null && w !== undefined && w <= through;
  });
  const groups = new Map<string, ClaimRow[]>();
  for (const c of rows) {
    const k = [c.brand, c.factKey, c.claimed].join("|");
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  const s = res.pack.settings;
  return [...groups.values()]
    .map((g) => {
      const first = g[0]!;
      const ids = [...new Set(g.map((c) => c.responseId))];
      const weeks = ids.map((id) => weekOf.get(id)!.week!);
      const name = s.brands[first.brand]?.name.split(/\s+/)[0] ?? first.brand;
      return {
        brand: first.brand,
        factKey: first.factKey,
        claimed: first.claimed,
        actual: first.actual,
        ...describeFact(name, first.factKey, first.claimed, first.actual),
        answers: ids.length,
        thisWeek: weeks.filter((w) => w === through).length,
        firstWeek: Math.min(...weeks),
        lastWeek: Math.max(...weeks),
        engines: orderEngines(
          ids.map((id) => weekOf.get(id)!.engine),
          s,
        ),
        responseIds: ids,
        example: first.sentence,
      };
    })
    .sort((a, b) => b.thisWeek - a.thisWeek || b.answers - a.answers);
}
