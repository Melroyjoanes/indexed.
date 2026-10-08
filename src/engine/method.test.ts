import { describe, expect, it } from "vitest";
import { fullWeek, results } from "../../tests/fixtures/build";
import { settings } from "../../tests/fixtures/pack";
import { analyse, classify } from "./detect";
import {
  LAST_VERDICT_EXAMPLE,
  methodFacts,
  missingToolExample,
  positionWeightFor,
  TONE_EXAMPLES,
  workedExample,
} from "./method";
import { score } from "./score";
import type { Tone } from "./types";

describe("tone examples on the How it works page", () => {
  it.each(Object.entries(TONE_EXAMPLES) as [Tone, string][])(
    "reads the %s example the way the page says",
    (tone, sentence) => {
      expect(analyse(sentence, settings).tones.get("corvane")).toBe(tone);
      if (tone !== "neutral") expect(classify(sentence)).toBe(tone);
    },
  );

  it("lets the last verdict in an answer win", () => {
    expect(analyse(LAST_VERDICT_EXAMPLE, settings).tones.get("trakvia")).toBe("not_recommended");
  });
});

describe("methodFacts", () => {
  it("counts AI tools, questions and what a complete week holds", () => {
    const f = methodFacts(
      results([...fullWeek(1, ["chatgpt", "perplexity"], "Corvane is a strong pick.")]),
    );
    expect(f).toMatchObject({
      engines: ["ChatGPT", "Perplexity"],
      questions: 2,
      runsPerWeek: 2,
      perWeek: 8,
      weeks: [1],
      answers: 8,
      byPriority: { 3: 1, 2: 1 },
    });
  });

  it("leaves failed requests out of the answer count", () => {
    const f = methodFacts(results([[1, "chatgpt", "P01", 1, ""]]));
    expect(f.answers).toBe(0);
  });
});

describe("positionWeightFor", () => {
  it("uses the last weight for every later place", () => {
    expect(positionWeightFor(settings, 1)).toBe(1);
    expect(positionWeightFor(settings, 2)).toBe(0.9);
    expect(positionWeightFor(settings, 7)).toBe(0.8);
  });
});

describe("workedExample", () => {
  it("prefers an answer where the company is named second and recommended", () => {
    const res = results([
      [1, "chatgpt", "P01", 1, "Corvane is a strong pick."],
      [1, "chatgpt", "P02", 1, "Trakvia is popular. Corvane is a strong pick."],
      [1, "chatgpt", "P02", 2, "Avoid Corvane."],
    ]);
    const ex = workedExample(res, score(res), "corvane", 1)!;
    expect(ex).toMatchObject({
      promptId: "P02",
      run: 1,
      tone: "recommended",
      position: 2,
      basePoints: 100,
      weight: 0.9,
      points: 90,
      priority: 2,
      engineLabel: "ChatGPT",
    });
    expect(ex.runs.map((r) => r.points)).toEqual([90, 0]);
    expect(ex.average).toBe(45);
    expect(ex.weekScore).toBeCloseTo((3 * 100 + 2 * 45) / 5);
  });

  it("returns null when the company isn't named that week", () => {
    const res = results([[1, "chatgpt", "P01", 1, "Trakvia is a strong pick."]]);
    expect(workedExample(res, score(res), "corvane", 1)).toBeNull();
  });
});

describe("missingToolExample", () => {
  const res = results([
    ...fullWeek(1, ["chatgpt", "perplexity"], "Corvane is a strong pick."),
    ...fullWeek(2, ["chatgpt"], "Corvane is a strong pick."),
  ]);

  it("finds the first week an AI tool is missing", () => {
    expect(missingToolExample(res, 2)).toEqual({
      week: 2,
      missing: ["Perplexity"],
      comparedOn: ["ChatGPT"],
    });
  });

  it("never looks past the selected week", () => {
    expect(missingToolExample(res, 1)).toBeNull();
  });
});
