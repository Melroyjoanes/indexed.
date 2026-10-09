/**
 * Factual claims about a company, checked against facts.json.
 *
 * Only claims facts.json covers are checked: starting price, HQ, founding
 * year, listed features and integrations. Anything else ("4.6 stars on
 * Capterra") is unverified, not wrong, and is ignored.
 */
import type { BrandFacts, Settings } from "../types";
import { LOOKALIKE, stripLabel, type Segment } from "./sentences";

export interface Claim {
  brand: string;
  factKey: string; // dotted path into facts.json, e.g. "features.dashcams"
  claimed: string;
  actual: string;
  sentence: string;
  /** Position of `sentence` in the analysed text, [start, end). */
  start: number;
  end: number;
  wrong: boolean;
}

/** A claim as a rule finds it, before its position is attached. */
type Found = Omit<Claim, "start" | "end">;

const FEATURES: Record<string, string> = {
  dashcams: "dash[\\s\\-]?cam",
  eld_compliance: "\\bELD\\b|electronic logging",
  fuel_card_integration: "fuel[\\s\\-]card",
  maintenance_alerts: "maintenance (?:alert|remind)",
  driver_app: "driver app|mobile app for drivers",
  payroll: "payroll",
  gps_tracking: "GPS tracking",
};

/** Phrases about the buyer, not the product ("carriers that need ELD compliance"). */
const ABOUT_THE_BUYER = [
  /\bfor [^,.;:]*?\b(?:that|who) (?:need|want|run|use)[^,.;:]*/gi,
  /\bif [^,.;:]*?(?:matters|concern|priority|need|value|shopping)[^,.;:]*[,:]/gi,
  /\*\*[^*]*\*\*:?/gi,
  /\bfleets? (?:focused on|that need)[^,.;:]*/gi,
];
const ASSERTS =
  "(?:offers?|includes?|including|handles?|supports?|provides?|sends?|delivers?|comes with|has|have|built[\\s\\-]in|known for|focus(?:es)? on|stands out for|thanks to|because of|with|value|need|features?)";
const DENIES = "(?:doesn'?t|does not|don'?t|do not|no|lacks?|without|isn'?t|not|missing|never)";

/**
 * A starting subscription price. A price only counts when the wording says it's
 * where plans start ("starts at", "from", "as low as") or it's quoted per
 * vehicle / per month. Installation, setup and hardware fees are other claims
 * the fact sheet doesn't cover, so they're left alone.
 */
const PRICE =
  /(?<lead>start(?:s|ing)?(?: at)?|from|as low as|(?:plans?|pricing) (?:begins?|starts?)(?: at)?|costs?|priced at|pay|charges?|charging)\s+(?:about|around|roughly|approximately|just|only|~)?\s*\$\s?(?<amount>\d+(?:\.\d+)?)(?<after>[^.;]{0,40})/i;
const STARTING_LEAD = /^(?:start|from|as low as|plans?|pricing)/i;
const PER_UNIT =
  /^\s*(?:\/|per|a|each|every)\s*(?:vehicle|truck|unit|asset|month|mo\b|user|driver|seat)/i;
const OTHER_FEE =
  /\b(?:installation|install|set-?up|hardware|onboarding|devices?|equipment|one[- ]time|activation)\b/i;
const PRICE_RANGE = /between \$\s?\d+\s*(?:and|-|to)\s*\$?\s?\d+/i;
const HQ =
  /(?:based (?:in|out of)|headquartered in|headquarters (?:is |are )?in|HQ (?:is )?in|located in)\s+([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+)*)(?:,\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*))?/;
/**
 * A founding year. Bare "since 2020" or "launched in 2020" can be about a
 * feature or a product, so only founding wording counts.
 */
const FOUNDED =
  /(?:founded|established|(?:been )?around since|in business since|operating since|trading since|since (?:its|the company's) founding in)\s+(?:in\s+)?((?:19|20)\d{2})/i;
const INTEGRATES =
  /(?<neg>(?:doesn'?t|does not|don'?t|do not|can'?t|cannot|won'?t|no)\s+)?(?:integrat\w*\s+with|connects?\s+(?:to|with)|syncs?\s+with|works\s+with|plugs\s+into)\s+(?<list>[A-Z]\w*(?:\s[A-Z]\w*)?(?:(?:,\s*|\s+(?:and|or|&)\s+)[A-Z]\w*(?:\s[A-Z]\w*)?)*)/g;

const cityState = (v: string): [string, string] => {
  const [city = "", state = ""] = v.split(",").map((p) => p.trim().toLowerCase());
  return [city, state];
};

function priceClaim(b: string, f: BrandFacts, s: string, sentence: string, out: Found[]) {
  if (f.starting_price_usd === undefined || PRICE_RANGE.test(s)) return;
  const m = PRICE.exec(s);
  if (!m?.groups) return;
  const { lead = "", amount = "", after = "" } = m.groups;
  if (OTHER_FEE.test(after)) return;
  if (!STARTING_LEAD.test(lead) && !PER_UNIT.test(after)) return;
  const val = Number(amount);
  const actual = Number(f.starting_price_usd);
  out.push({
    brand: b,
    factKey: "starting_price_usd",
    claimed: String(val),
    actual: String(actual),
    sentence,
    wrong: Math.abs(val - actual) > 0.5,
  });
}

function hqClaim(b: string, f: BrandFacts, s: string, sentence: string, out: Found[]) {
  if (!f.hq) return;
  const m = HQ.exec(s);
  if (!m) return;
  const city = m[1]!.toLowerCase().replace(/\.+$/, "");
  const state = (m[2] ?? "").toLowerCase();
  const [aCity, aState] = cityState(f.hq);
  const wrong =
    city === aState && !state ? false : city !== aCity || (state !== "" && state !== aState);
  const claimed = m[1]!.replace(/\.+$/, "") + (m[2] ? `, ${m[2]}` : "");
  out.push({ brand: b, factKey: "hq", claimed, actual: f.hq, sentence, wrong });
}

function foundedClaim(b: string, f: BrandFacts, s: string, sentence: string, out: Found[]) {
  if (f.founded === undefined) return;
  const m = FOUNDED.exec(s);
  if (!m) return;
  const yr = Number(m[1]);
  out.push({
    brand: b,
    factKey: "founded",
    claimed: String(yr),
    actual: String(f.founded),
    sentence,
    wrong: yr !== Number(f.founded),
  });
}

function integrationClaims(b: string, f: BrandFacts, s: string, sentence: string, out: Found[]) {
  if (!f.integrations) return;
  const known = f.integrations.map((i) => i.toLowerCase());
  for (const m of s.matchAll(INTEGRATES)) {
    const negated = Boolean(m.groups?.neg);
    for (const raw of (m.groups?.list ?? "").split(/,\s*|\s+(?:and|or|&)\s+/)) {
      const name = raw.trim();
      const first = name.split(/\s+/)[0]?.toLowerCase() ?? "";
      if (!first) continue;
      const listed = known.includes(first) || known.some((k) => k.startsWith(first));
      out.push({
        brand: b,
        factKey: "integrations",
        claimed: (negated ? "not " : "") + name,
        actual: f.integrations.join(", "),
        sentence,
        wrong: negated ? listed : !listed,
      });
    }
  }
}

/**
 * Where the clause that mentions a feature begins. A negation only applies
 * within its own clause: "has no dashcams and offers GPS tracking" is two
 * clauses, split where a new verb starts after "and" or a comma. It still
 * carries across "or" ("doesn't offer dashcams or payroll" denies both).
 */
const CLAUSE_VERB =
  "(?:offers?|includes?|handles?|supports?|provides?|sends?|delivers?|comes with|has|have|lacks?|features?|doesn'?t|does not|don'?t|do not|isn'?t|is not)";
const CLAUSE_START = new RegExp(
  `(?:[;:]|\\bbut\\b|(?:,\\s*|\\s+)(?:and|while|whereas|plus)\\s+(?=(?:it\\s+|also\\s+)*${CLAUSE_VERB}\\b)|,\\s+(?=(?:it\\s+|also\\s+)*${CLAUSE_VERB}\\b))`,
  "gi",
);

function clauseBefore(before: string): string {
  let from = 0;
  for (const m of before.matchAll(CLAUSE_START)) from = m.index + m[0].length;
  return before.slice(from);
}

function featureClaims(b: string, f: BrandFacts, s: string, sentence: string, out: Found[]) {
  const feats = f.features;
  if (!feats) return;
  let scrubbed = s;
  for (const rx of ABOUT_THE_BUYER) scrubbed = scrubbed.replace(rx, " ");
  for (const [key, pattern] of Object.entries(FEATURES)) {
    if (!(key in feats)) continue;
    for (const m of scrubbed.matchAll(new RegExp(pattern, "gi"))) {
      const before = scrubbed.slice(Math.max(0, m.index - 60), m.index);
      const clause = clauseBefore(before);
      let claimed: boolean;
      if (new RegExp(`\\b${DENIES}\\b[^.]*$`, "i").test(clause)) claimed = false;
      else if (
        new RegExp(`\\b${ASSERTS}\\b`, "i").test(clause) ||
        new RegExp(
          `(?:${pattern})[^.]{0,30}\\b(?:is|are) (?:included|built[\\s\\-]in|standard|supported)`,
          "i",
        ).test(scrubbed.slice(m.index))
      )
        claimed = true;
      else continue;
      out.push({
        brand: b,
        factKey: `features.${key}`,
        claimed: String(claimed),
        actual: String(Boolean(feats[key])),
        sentence,
        wrong: claimed !== Boolean(feats[key]),
      });
      break;
    }
  }
}

export function extractClaims(segs: Segment[], settings: Settings): Claim[] {
  const claims: Claim[] = [];
  for (const seg of segs) {
    const b = seg.subject;
    if (!b || b === LOOKALIKE || seg.isTableRow) continue;
    const f = settings.facts[b];
    if (!f) continue;
    // a sentence that also names another company: we can't be sure who the claim is about
    if (seg.brands.some((x) => x !== b)) continue;
    // match on straight apostrophes, but keep the sentence exactly as the AI wrote it
    const stripped = stripLabel(seg.text);
    const sentence = stripped.trim();
    // the label is a prefix, so the sentence ends where the segment's trimmed text ends
    const start = seg.start + seg.text.length - stripped.trimStart().length;
    const s = sentence.replace(/[\u2018\u2019]/g, "'");
    const found: Found[] = [];
    priceClaim(b, f, s, sentence, found);
    hqClaim(b, f, s, sentence, found);
    foundedClaim(b, f, s, sentence, found);
    integrationClaims(b, f, s, sentence, found);
    featureClaims(b, f, s, sentence, found);
    for (const c of found) claims.push({ ...c, start, end: start + sentence.length });
  }
  const seen = new Set<string>();
  return claims.filter((c) => {
    const k = [c.brand, c.factKey, c.sentence, c.claimed].join("\u0000");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
