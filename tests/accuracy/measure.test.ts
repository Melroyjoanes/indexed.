import { describe, expect, it } from "vitest";
import { settings } from "../fixtures/pack";
import { measureFacts, measureTone } from "./measure";

describe("accuracy measurement", () => {
  it("counts missed and false contradictions separately", () => {
    const r = measureFacts(
      [
        ["Corvane Fleet is based in Chicago.", ["corvane:hq"]],
        ["Corvane Fleet was founded in 2009.", []],
        ["Corvane Fleet has a driver app.", []],
        ["Corvane Fleet is great.", ["corvane:founded"]],
      ],
      settings,
    );
    expect(r).toMatchObject({ expected: 2, found: 1, controls: 2, controlsClean: 1 });
    expect(r.missed).toHaveLength(1);
    expect(r.falsePositives).toEqual([`corvane:founded in "Corvane Fleet was founded in 2009."`]);
  });

  it("sorts tone misses by the kind of mistake", () => {
    const r = measureTone(
      [
        ["Corvane is a strong pick.", "corvane", "recommended"],
        ["Corvane is a strong pick.", "corvane", "not_recommended"],
        ["Corvane is a strong pick.", "corvane", "neutral"],
        ["Corvane is another option.", "corvane", "recommended"],
      ],
      settings,
    );
    expect(r).toMatchObject({ of: 4, right: 1, flipped: 1, falseVerdict: 1, fellBackToNeutral: 1 });
  });
});
