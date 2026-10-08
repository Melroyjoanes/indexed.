import { describe, expect, it } from "vitest";
import { fullWeek, results, type Row } from "../../tests/fixtures/build";
import { settings } from "../../tests/fixtures/pack";
import { compare, score } from "./score";

const at = (sc: ReturnType<typeof score>, brand: string, week: number) =>
  sc.table.find((t) => t.brand === brand && t.week === week)!;

describe("points", () => {
  it("scores tone and position: recommended first = 100, mentioned second = 45", () => {
    const sc = score(
      results([
        [1, "chatgpt", "P01", 1, "Trakvia is a strong pick. You may also come across Corvane."],
      ]),
    );
    const pts = Object.fromEntries(sc.rows.map((r) => [r.brand, r.points]));
    expect(pts).toMatchObject({ trakvia: 100, corvane: 45, routelyne: 0 });
  });

  it("weights questions by priority", () => {
    const sc = score(
      results([
        [1, "chatgpt", "P01", 1, "Corvane is a strong pick."], // priority 3 -> 100
        [1, "chatgpt", "P02", 1, "Avoid Corvane."], // priority 2 -> 0
      ]),
    );
    expect(at(sc, "corvane", 1).score).toBeCloseTo(60); // (3*100 + 2*0) / 5
  });

  it("leaves failed calls out of the score instead of counting them as zero", () => {
    const sc = score(
      results([
        [1, "chatgpt", "P01", 1, "Corvane is a strong pick."],
        [1, "chatgpt", "P01", 2, ""],
      ]),
    );
    expect(at(sc, "corvane", 1).score).toBe(100);
  });
});

describe("changes between weeks", () => {
  it("doesn't show a missing engine as a drop", () => {
    const sc = score(
      results([
        ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
        ...fullWeek(1, ["perplexity"], "Avoid Corvane."),
        ...fullWeek(2, ["chatgpt"], "Corvane is a strong pick."),
      ]),
    );
    const c = compare(sc, "corvane", 2, 1, settings);
    expect(c.delta).toBe(0);
    expect(c.engines).toEqual(["chatgpt"]);
    expect(at(sc, "corvane", 2)).toMatchObject({ partial: true, missingEngines: ["perplexity"] });
  });

  it("calls a change clear only when it's bigger than the run-to-run variation", () => {
    const steady = score(
      results([
        ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
        ...fullWeek(2, ["chatgpt"], "Avoid Corvane."),
      ]),
    );
    expect(compare(steady, "corvane", 2, 1, settings)).toMatchObject({ delta: -100, clear: true });

    // two runs that disagree every time: a 50-point move is within normal variation
    const noisy = score(
      results([
        [1, "chatgpt", "P01", 1, "Corvane is a strong pick."],
        [1, "chatgpt", "P01", 2, "Avoid Corvane."],
        [2, "chatgpt", "P01", 1, "Corvane is a strong pick."],
        [2, "chatgpt", "P01", 2, "Corvane is a strong pick."],
      ]),
    );
    expect(compare(noisy, "corvane", 2, 1, settings)).toMatchObject({ delta: 50, clear: false });
  });

  it("has no change in the first week rather than a change of zero", () => {
    const sc = score(results(fullWeek(1, ["chatgpt"], "Corvane is a strong pick.")));
    const c = compare(sc, "corvane", 1, null, settings);
    expect(c.firstWeek).toBe(true);
    expect(Number.isNaN(c.delta)).toBe(true);
  });
});

describe("expected answers", () => {
  it("counts expected answers from the question list and the engines seen so far", () => {
    const sc = score(results([[1, "chatgpt", "P01", 1, "Corvane is a strong pick."]]));
    expect(at(sc, "corvane", 1)).toMatchObject({ answers: 1, expectedAnswers: 4, partial: true });
  });

  it("never lets a later week change what an earlier week expected", () => {
    const sc = score(
      results([
        ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
        ...fullWeek(2, ["chatgpt", "claude"], "Corvane is a strong pick."),
      ]),
    );
    expect(at(sc, "corvane", 1)).toMatchObject({
      expectedAnswers: 4,
      partial: false,
      missingEngines: [],
    });
    expect(at(sc, "corvane", 2).expectedAnswers).toBe(8);
  });
});

describe("reporting cutoff", () => {
  // Weeks 1 and 2 have runs that agree; week 3 has runs that disagree sharply.
  const early = [
    ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
    [2, "chatgpt", "P01", 1, "You may also come across Corvane."],
    [2, "chatgpt", "P01", 2, "You may also come across Corvane."],
    [2, "chatgpt", "P02", 1, "Corvane is a strong pick."],
    [2, "chatgpt", "P02", 2, "Corvane is a strong pick."],
  ] as Row[];
  const later = [
    [3, "chatgpt", "P01", 1, "Corvane is a strong pick."],
    [3, "chatgpt", "P01", 2, "Avoid Corvane."],
    [3, "chatgpt", "P02", 1, "Corvane is a strong pick."],
    [3, "chatgpt", "P02", 2, "Avoid Corvane."],
  ] as Row[];

  it("never lets a later week change an earlier comparison's uncertainty or verdict", () => {
    const before = compare(score(results(early)), "corvane", 2, 1, settings);
    const after = compare(score(results([...early, ...later])), "corvane", 2, 1, settings);
    expect(after).toEqual(before);
  });

  it("never lets a later week change an earlier week's score or uncertainty", () => {
    const pick = (sc: ReturnType<typeof score>) => sc.table.filter((t) => t.week <= 2);
    expect(pick(score(results([...early, ...later])))).toEqual(pick(score(results(early))));
  });

  it("does use the new disagreement for comparisons that reach the new week", () => {
    const sc = score(results([...early, ...later]));
    expect(sc.noiseAt("corvane", 3)).toBeGreaterThan(sc.noiseAt("corvane", 2));
  });
});
