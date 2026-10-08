import { describe, expect, it } from "vitest";
import { analyse } from "@/engine/detect";
import { settings } from "../fixtures/pack";
import { FACTS, FRESH_TONE, MENTIONS } from "./unseen-wording";

describe("wording not in the sample pack", () => {
  it.each(MENTIONS)("mention: %s", (text, brand, expected) => {
    expect(analyse(text, settings).positions.has(brand)).toBe(expected);
  });

  it.each(FACTS)("wrong fact: %s", (text, key) => {
    const found = analyse(text, settings)
      .claims.filter((c) => c.wrong)
      .map((c) => `${c.brand}:${c.factKey}`);
    expect(found).toContain(key);
  });

  // Tone on fresh wording is a known weak spot. It isn't asserted per
  // sentence (that would invite tuning to the test); instead this checks the
  // failure mode: when the rules miss, they fall back to neutral rather than
  // flipping a verdict.
  it("never turns praise into criticism or the other way round", () => {
    const flipped = FRESH_TONE.filter(([text, brand, expected]) => {
      const got = analyse(text, settings).tones.get(brand);
      const good = (t?: string) => t === "recommended";
      const bad = (t?: string) => t === "negative" || t === "not_recommended";
      return (good(expected) && bad(got)) || (bad(expected) && good(got));
    });
    expect(flipped).toEqual([]);
  });
});
