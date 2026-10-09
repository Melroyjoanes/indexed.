/**
 * Scores the detection rules on a labelled set of sentences. Errors are kept
 * apart by kind, because they cost different things: a false contradiction
 * tells a client something untrue, a missed one only leaves a gap.
 */
import { analyse } from "@/engine/detect";
import type { Settings, Tone } from "@/engine/types";

export interface FactResult {
  sentences: number;
  expected: number; // contradictions in the labels
  found: number; // of those, flagged
  missed: string[];
  falsePositives: string[]; // flagged but not in the labels
  controls: number; // sentences with nothing wrong in them
  controlsClean: number;
}

export function measureFacts(cases: [string, string[]][], s: Settings): FactResult {
  const out: FactResult = {
    sentences: cases.length,
    expected: 0,
    found: 0,
    missed: [],
    falsePositives: [],
    controls: 0,
    controlsClean: 0,
  };
  for (const [text, keys] of cases) {
    const got = new Set(
      analyse(text, s)
        .claims.filter((c) => c.wrong)
        .map((c) => `${c.brand}:${c.factKey}`),
    );
    out.expected += keys.length;
    for (const k of keys)
      if (got.has(k)) out.found += 1;
      else out.missed.push(`${k} in "${text}"`);
    for (const k of got) if (!keys.includes(k)) out.falsePositives.push(`${k} in "${text}"`);
    if (!keys.length) {
      out.controls += 1;
      if (!got.size) out.controlsClean += 1;
    }
  }
  return out;
}

export interface ToneResult {
  of: number;
  right: number;
  /** A verdict was expected and the rules said "mentioned". */
  fellBackToNeutral: number;
  /** Praise read as criticism or advice against, or the other way round. */
  flipped: number;
  /** "Mentioned" was expected and the rules gave a verdict. */
  falseVerdict: number;
  /** Right direction, wrong strength (criticised vs advised against). */
  wrongStrength: number;
  misses: string[];
}

const good = (t?: Tone) => t === "recommended";
const bad = (t?: Tone) => t === "negative" || t === "not_recommended";

export function measureTone(cases: [string, string, Tone][], s: Settings): ToneResult {
  const out: ToneResult = {
    of: cases.length,
    right: 0,
    fellBackToNeutral: 0,
    flipped: 0,
    falseVerdict: 0,
    wrongStrength: 0,
    misses: [],
  };
  for (const [text, brand, expected] of cases) {
    const got = analyse(text, s).tones.get(brand);
    if (got === expected) {
      out.right += 1;
      continue;
    }
    out.misses.push(`"${text}" ${brand}: expected ${expected}, got ${got ?? "not mentioned"}`);
    if (expected === "neutral") out.falseVerdict += 1;
    else if (got === "neutral" || got === undefined) out.fellBackToNeutral += 1;
    else if ((good(expected) && bad(got)) || (bad(expected) && good(got))) out.flipped += 1;
    else out.wrongStrength += 1;
  }
  return out;
}
