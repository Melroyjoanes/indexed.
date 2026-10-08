/**
 * The hand check reported in the README. Skipped without ./data. If a change
 * makes the tool disagree with the hand labels, this fails, and the README's
 * accuracy section has to be updated honestly rather than drifting.
 */
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadPackFromDir } from "../../scripts/lib";
import { runPack } from "@/engine/run";
import { compare, type Labels } from "./compare";
import hand from "./hand-labels.json";
import { drawSample } from "./sample";

const hasData = existsSync("data/responses.jsonl");

describe.skipIf(!hasData)("15-answer hand check", () => {
  const res = hasData ? runPack(loadPackFromDir("data")) : null;
  const labels = hand.labels as unknown as Labels;

  it("labels exactly the answers the seeded draw picks", () => {
    expect(
      drawSample(res!.pack.answers)
        .map((a) => a.responseId)
        .sort(),
    ).toEqual(Object.keys(labels).sort());
  });

  it("matches the hand labels on mentions, positions and tone", () => {
    const a = compare(res!, labels);
    expect(a.disagreements).toEqual([]);
    expect({ pairs: a.pairs, mentioned: a.bothMentioned }).toEqual({ pairs: 90, mentioned: 39 });
  });
});
