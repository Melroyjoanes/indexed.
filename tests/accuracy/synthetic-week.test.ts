/**
 * A synthetic 12-answer week written independently of the sample pack, with
 * expected labels (tests/fixtures/synthetic-week). It mixes direct advice,
 * mixed verdicts, the look-alike company, a website mention, an unsupported
 * claim and two wrong facts. The scoring files must match it exactly.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mentionsCsv, wrongFactsCsv } from "@/engine/export";
import { buildPack, parseCsv } from "@/engine/pack";
import { runPack } from "@/engine/run";
import { BRANDS, CONFIG, FACTS } from "../fixtures/pack";

const dir = "tests/fixtures/synthetic-week";
const read = (f: string) => readFileSync(`${dir}/${f}`, "utf8");
const key = (r: Record<string, string>) => Object.values(r).join("|");

describe("synthetic week", () => {
  const res = runPack(
    buildPack(
      [
        { name: "brands.json", content: JSON.stringify(BRANDS) },
        { name: "facts.json", content: JSON.stringify(FACTS) },
        { name: "answers.jsonl", content: read("answers.jsonl") },
      ],
      CONFIG,
    ),
  );

  it("matches every expected mention, position and tone", () => {
    const got = new Set(parseCsv(mentionsCsv(res)).map(key));
    const expected = parseCsv(read("expected_mentions.csv"));
    expect(expected).toHaveLength(72);
    expect(expected.filter((r) => !got.has(key(r)))).toEqual([]);
  });

  it("finds exactly the expected wrong facts and nothing else", () => {
    const got = parseCsv(wrongFactsCsv(res)).map(key).sort();
    expect(got).toEqual(parseCsv(read("expected_wrong_facts.csv")).map(key).sort());
  });
});
