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
import { LOOKALIKE, stripLabel, type Segment } from "./sentences";

const rx = (list: string[]) => list.map((p) => new RegExp(p, "i"));

const ADVISED_AGAINST = rx([
  "\\bavoid\\b",
  // direct advice not to pick a company: "do not choose X", "don't go with X"
  "\\b(?:do not|don'?t|never)\\s+(?:choose|pick|buy|go with|go for|opt for|consider|shortlist)\\b",
  "isn'?t the right (?:choice|fit|option)",
  "not the right (?:choice|fit|option)",
  "probably not\\b",
  "wouldn'?t (?:choose|recommend|pick|go with|use)",
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
  "\\bi'?d avoid\\b",
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
]);

/** Praise that's been negated: "not my pick", "never the best option". */
// (contractions like "isn't" have no word boundary before the n, so n't is matched on its own)
const NEGATED = /(?:\b(?:not|never|no longer|hardly)\b|n['’]t\b)(?:\W+\w+){0,3}?\W+$/i;
const CONTRAST = /(?:,|;|\s)\s*(?:but|though|although|however|yet|even so|that said)\b/i;

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
    if (ADVISED_AGAINST.some((p) => p.test(chunk))) return "not_recommended";
    if (CRITICISED.some((p) => p.test(chunk))) return "negative";
    const v = praise(chunk);
    if (v) return v;
  }
  return null;
}

export interface ToneResult {
  tones: Map<string, Tone>;
  evidence: Map<string, string>; // the sentence the tone came from
}

export function tonesFor(segs: Segment[], mentioned: string[]): ToneResult {
  const verdicts = new Map<string, Tone>();
  const evidence = new Map<string, string>();
  for (const seg of segs) {
    let targets: string[];
    let v: Tone | null;
    if (seg.isTableRow) {
      targets = seg.brands.slice(0, 1);
      v = seg.verdictCell ? classify(seg.verdictCell) : null;
      if (v === null && targets.length) v = "neutral"; // a plain label in a verdict column is still a verdict
    } else {
      targets = seg.subject && seg.subject !== LOOKALIKE ? [seg.subject] : [];
      v = classify(stripLabel(seg.text));
    }
    if (v === null) continue;
    for (const b of targets) {
      verdicts.set(b, v);
      evidence.set(b, seg.text.trim());
    }
  }
  const tones = new Map<string, Tone>(mentioned.map((b) => [b, verdicts.get(b) ?? "neutral"]));
  return { tones, evidence };
}
