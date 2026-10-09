/**
 * Development regressions on wording that isn't in the sample pack. These
 * pin behaviour on the listed sentences only; they say nothing general about
 * new wording. Measured accuracy on fresh text comes from held-out-3.ts, via
 * `npm run accuracy`.
 */
import { describe, expect, it } from "vitest";
import { analyse } from "@/engine/detect";
import { settings } from "../fixtures/pack";
import { HELD_OUT_2 } from "./held-out-2";
import { FACTS, FRESH_TONE, MENTIONS } from "./unseen-wording";

const wrongKeys = (text: string) =>
  analyse(text, settings)
    .claims.filter((c) => c.wrong)
    .map((c) => `${c.brand}:${c.factKey}`)
    .sort();

describe("wording not in the sample pack", () => {
  it.each(MENTIONS)("mention: %s", (text, brand, expected) => {
    expect(analyse(text, settings).positions.has(brand)).toBe(expected);
  });

  it.each(FACTS)("wrong facts, exactly: %s", (text, keys) => {
    expect(wrongKeys(text)).toEqual([...keys].sort());
  });

  // Tone isn't asserted per sentence on these sets (that would invite tuning
  // to them). This pins the failure mode on these 24 sentences only: a miss
  // falls back to neutral rather than flipping praise and criticism.
  it("doesn't flip praise and criticism on the 24 seen tone sentences", () => {
    const sentences = [...FRESH_TONE, ...HELD_OUT_2];
    expect(sentences).toHaveLength(24);
    const flipped = sentences.filter(([text, brand, expected]) => {
      const got = analyse(text, settings).tones.get(brand);
      const good = (t?: string) => t === "recommended";
      const bad = (t?: string) => t === "negative" || t === "not_recommended";
      return (good(expected) && bad(got)) || (bad(expected) && good(got));
    });
    expect(flipped).toEqual([]);
  });
});
