/**
 * Agreement with the committed labels for the 15-answer sample (see
 * hand-labels.json for who labelled them). If a change makes the tool
 * disagree with a label, this fails and the README has to be updated rather
 * than drifting.
 *
 * Skipped without ./data: the sample pack is client data and isn't in the
 * repository, so public CI can't run it. Run `npm test` and
 * `npm run accuracy -- --write` locally with the pack in place; the report
 * records the commit and a fingerprint of the pack.
 */
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadPackFromDir } from "../../scripts/lib";
import { runPack } from "@/engine/run";
import { compare, type Labels } from "./compare";
import hand from "./hand-labels.json";
import { drawSample } from "./sample";

const hasData = existsSync("data/responses.jsonl");

describe.skipIf(!hasData)("agreement with the 15 committed labels (needs ./data)", () => {
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
