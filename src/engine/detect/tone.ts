/**
 * Tone of each mention: recommended, neutral, negative (criticised but not
 * ruled out) or not_recommended (advised against).
 *
 * Each sentence about a company is checked for verdict phrases, strongest
 * first. In a mixed sentence the part after "but" / "though" decides, and
 * across the answer the company's last verdict wins, as the brief defines.
 * A company that's named but never judged is neutral.
 */
import type { Tone } from "../types";
import type { Hit } from "./mentions";
import { LOOKALIKE, stripLabel, type Segment } from "./sentences";

const rx = (list: string[]) => list.map((p) => new RegExp(p, "i"));

const ADVISED_AGAINST = rx([
  // "avoid" only counts when it is aimed at a company: "Avoid Trakvia", "I'd avoid it",
  // not "helps avoid outages" (companies are marked as ⟨CO⟩ before classifying)
  "\\bavoid(?:ing)?\\s+(?:⟨CO[^⟩]*⟩|it\\b|them\\b|this one\\b)",
  // direct advice not to pick a company: "do not choose X", "don't go with X"
  "\\b(?:do not|don'?t|never)\\s+(?:choose|pick|buy|go with|go for|opt for|consider|shortlist)\\b",
  "isn'?t the right (?:choice|fit|option)",
  "not the right (?:choice|fit|option)",
  "probably not\\b",
  "wouldn'?t (?:choose|recommend|pick|go with|use|shortlist)",
  "\\bi'?d skip\\b",
  "\\bskip (?:it|this|them)\\b",
  "\\bskip at your size\\b",
  "\\boverkill\\b",
  "not recommended",
  "\\bnot for (?:small|you|your)",
  "steer clear",
  "not a good (?:fit|choice)",
  "(?:don'?t|do not) recommend",
  "\\bnot worth\\b",
  "\\bpass on\\b",
  "\\bnot suit(?:ed|able)\\b",
  "look elsewhere",
  "don'?t bother",
  "\\btoo (?:heavy|big|complex|expensive|pricey|much) for\\b",
  "\\brule (?:it|them) out\\b",
  "\\bnot a (?:fit|match)\\b",
  "\\bwouldn'?t (?:be )?my\\b",
  "\\bnot (?:be )?my (?:pick|choice|recommendation)\\b",
  "n't (?:be )?my (?:pick|choice|recommendation)\\b",
  "\\bwould not (?:choose|recommend|pick|be my)\\b",
  "\\bnot recommend\\b",
]);

const CRITICISED = rx([
  "complain",
  "\\bslow\\b",
  "outage",
  "caution",
  "\\blimited\\b",
  "clunky",
  "expensive",
  "longer than expected",
  "mixed reviews",
  "\\bbuggy\\b",
  "\\bglitch",
  "\\bpoor\\b",
  "\\blacks?\\b",
  "frustrat",
  "\\bdrawbacks?\\b",
  "\\bdownside",
  "\\bcriticis",
  "\\bunreliable\\b",
  "hidden fees",
  "\\bissues?\\b",
  "\\bproblems?\\b",
  "\\bweak\\b",
  "steep learning",
  "\\bdated\\b",
  "overpriced",
  "\\bbasic\\b",
  "\\bpainful\\b",
  "\\brigid\\b",
  "mixed (?:feedback|results|experiences)",
  "\\bconfusing\\b",
  "\\bdifficult\\b",
  "\\bhard to (?:use|set up|learn)\\b",
  "\\bconcerns?\\b",
  "\\bfalls? short\\b",
  "\\bpricey\\b",
  "\\bstruggl",
  "\\bnot great\\b",
  "\\bdisappoint",
  "\\bcrash",
]);

const PRAISE = rx([
  // direct advice to pick a company, at the start of a sentence or clause: "For small fleets, choose X"
  "(?:^|[,;:]\\s*)(?:just\\s+|simply\\s+|definitely\\s+)?(?:choose|pick|go with|go for|opt for|buy|shortlist)\\b",
  "\\bi(?:'d| would)? (?:suggest|choose|pick|go with)\\b",
  "top suggestion",
  "top pick",
  "best overall",
  "best option",
  "hard to beat",
  "strong pick",
  "strong choice",
  "reliable choice",
  "\\bi'?d recommend\\b",
  "\\bi recommend\\b",
  "start your shortlist",
  "\\bi'?d start with\\b",
  "it would be\\b",
  "safest choice",
  "well worth",
  "the one i'?d pick",
  "one of the better",
  "\\bbest (?:choice|pick|fit)\\b",
  "\\bmy pick\\b",
  "\\bgo with\\b",
  "\\bstands out\\b",
  "\\bexcellent\\b",
  "\\bgreat (?:choice|option|fit)\\b",
  "\\bideal\\b",
  "\\bwinner\\b",
  "\\brecommended\\b",
  "\\bworth (?:a look|considering|shortlisting)\\b",
  "\\bfirst choice\\b",
  "\\bgood (?:choice|fit|option)\\b",
  "\\bsolid (?:choice|option|pick)\\b",
  "\\bgo-to\\b",
  "one to beat",
  "leads? the (?:pack|market|field)",
  "\\b(?:highly|strongly) recommend",
  "\\bgood reviews\\b",
  "\\bwell[- ]reviewed\\b",
  "\\beasy to (?:use|set up)\\b",
  "\\bpopular choice\\b",
  "\\bfavou?rite\\b",
  "\\btop choice\\b",
  "can'?t go wrong",
  "\\bstandout\\b",
  "\\bmy first call\\b",
  "\\b(?:i'?d|i would|would)(?: also| still| probably| definitely| personally)? (?:shortlist|lean towards?|choose|pick|recommend)\\b",
  "\\bthe one i'?d (?:shortlist|choose|pick|go with|recommend)\\b",
  "\\blean(?:ing)? towards?\\b",
  "\\b(?:safer|safest|best|better) bet\\b",
  "\\bbetter (?:pick|choice|option|fit)\\b",
]);

/** Praise that's been negated: "not my pick", "never the best option". */
// (contractions like "isn't" have no word boundary before the n, so n't is matched on its own)
const NEGATED = /(?:\b(?:not|never|no longer|hardly)\b|n['’]t\b)(?:\W+\w+){0,3}?\W+$/i;
const CONTRAST = /(?:,|;|\s)\s*(?:but|though|although|however|yet|even so|that said)\b/i;

/** Plain text without ⟨CO⟩ markers: "avoid" followed by a capitalised name (case-sensitive). */
const AVOID_NAMED = /\b[Aa]void(?:ing)?\s+[A-Z]/;

/**
 * A criticism cue that is negated ("no issues", "isn't slow") or is the thing
 * being prevented ("helps avoid outages", "reduces downtime") is not criticism.
 */
const NEGATOR =
  /(?:\b(?:no|not|never|without|hardly|rarely|seldom|few|zero|avoid(?:s|ing)?|prevent(?:s|ing)?|reduc(?:e|es|ing)|fix(?:es|ing)?|eliminat(?:e|es|ing)|cut(?:s|ting)?)\b|n['\u2019]t\b)(?:\W+\w+){0,2}?\W+$/i;

function criticised(s: string): boolean {
  for (const p of CRITICISED) {
    const g = new RegExp(p.source, "gi");
    for (const m of s.matchAll(g)) if (!NEGATOR.test(s.slice(0, m.index))) return true;
  }
  return false;
}

function praise(s: string): Tone | null {
  for (const p of PRAISE) {
    const m = p.exec(s);
    if (m) return NEGATED.test(s.slice(0, m.index)) ? "not_recommended" : "recommended";
  }
  return null;
}

/** The verdict of one sentence, or null if it doesn't judge anyone. */
export function classify(text: string): Tone | null {
  // AI tools often write curly apostrophes; every rule is written with straight ones
  const s = text.replace(/[\u2018\u2019]/g, "'").trim();
  if (!s) return null;
  const parts = s.split(CONTRAST);
  const chunks = parts.length > 1 ? [parts[parts.length - 1]!, s] : [s];
  for (const chunk of chunks) {
    if (ADVISED_AGAINST.some((p) => p.test(chunk)) || AVOID_NAMED.test(chunk))
      return "not_recommended";
    if (criticised(chunk)) return "negative";
    const v = praise(chunk);
    if (v) return v;
  }
  return null;
}

export interface ToneResult {
  tones: Map<string, Tone>;
  evidence: Map<string, string>; // the sentence the tone came from
}

/** Segment text with each company replaced by ⟨CO:key⟩, so rules can see who a phrase is about. */
function coded(seg: Segment, hits: Hit[]): string {
  const end = seg.start + seg.text.length;
  const inSeg = hits
    .filter((h) => seg.start <= h.start && h.end <= end)
    .sort((a, b) => b.start - a.start);
  let t = seg.text;
  for (const h of inSeg)
    t = t.slice(0, h.start - seg.start) + `⟨CO:${h.brand}⟩` + t.slice(h.end - seg.start);
  return t;
}

const companiesIn = (t: string) => [...new Set([...t.matchAll(/⟨CO:([^⟩]+)⟩/g)].map((m) => m[1]!))];

/** Splits a sentence naming several companies into clauses, each judged on its own. */
const CLAUSE_BREAK = /;|,?\s+(?:but|while|whereas|although|though|however|yet)\s+/i;

export function tonesFor(segs: Segment[], mentioned: string[], hits: Hit[] = []): ToneResult {
  const verdicts = new Map<string, Tone>();
  const evidence = new Map<string, string>();
  const judge = (targets: string[], v: Tone | null, seg: Segment) => {
    if (v === null) return;
    for (const b of targets) {
      verdicts.set(b, v);
      evidence.set(b, seg.text.trim());
    }
  };
  for (const seg of segs) {
    if (seg.isTableRow) {
      const targets = seg.brands.slice(0, 1);
      let v = seg.verdictCell ? classify(seg.verdictCell) : null;
      if (v === null && targets.length) v = "neutral"; // a plain label in a verdict column is still a verdict
      judge(targets, v, seg);
      continue;
    }
    const body = stripLabel(coded(seg, hits));
    const named = companiesIn(body);
    if (named.length >= 2 && /\bneither\b[^.]*\bnor\b/i.test(body)) {
      // "Neither A nor B fits, so I'd look elsewhere": one verdict about both
      judge(named, classify(body), seg);
      continue;
    }
    if (named.length >= 2) {
      // e.g. "Corvane is a strong pick, but avoid Trakvia": one verdict per clause, for the
      // company that clause names (the first one if a clause names several)
      for (const clause of body.split(CLAUSE_BREAK)) {
        const [first] = companiesIn(clause);
        if (first) judge([first], classify(clause), seg);
      }
      continue;
    }
    const targets = seg.subject && seg.subject !== LOOKALIKE ? [seg.subject] : [];
    judge(targets, classify(body), seg);
  }
  const tones = new Map<string, Tone>(mentioned.map((b) => [b, verdicts.get(b) ?? "neutral"]));
  return { tones, evidence };
}
