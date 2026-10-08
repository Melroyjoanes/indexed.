import { describe, expect, it } from "vitest";
import { fullWeek, results } from "../../tests/fixtures/build";
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
