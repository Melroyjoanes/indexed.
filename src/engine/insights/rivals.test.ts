import { describe, expect, it } from "vitest";
import { fullWeek, results } from "../../../tests/fixtures/build";
import { viewAs } from "../config";
import { score } from "../score";
import type { Replacement, Winner } from "./competitors";
import { pairAnswerIds, scoreTrend, tallySentence, whoReplaced, winnerTally } from "./rivals";

const win = (status: Winner["status"], winners: string[], promptId = "P01"): Winner => ({
  promptId,
  engine: "chatgpt",
  status,
  winners,
  points: status === "none" ? 0 : 100,
  runs: 2,
});

const rep = (
  week: number,
  dropped: string,
  replacedBy: string[],
  promptId = "P01",
  engine = "chatgpt",
): Replacement => ({ week, promptId, engine, dropped, replacedBy });

describe("score trend", () => {
  const res = results([
    ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick. Trakvia is also mentioned."),
    // week 2 is missing one answer, so it's partial
    ...fullWeek(2, ["chatgpt"], "Trakvia is a strong pick.").slice(1),
    ...fullWeek(3, ["chatgpt"], "Corvane is a strong pick."),
  ]);
  const sc = score(res);
  const s = res.pack.settings;

  it("never includes weeks after the one being viewed", () => {
    expect(scoreTrend(sc, s, 2).map((p) => p.week)).toEqual([1, 2]);
  });

  it("lists the client first, then tracked competitors, and marks partial weeks", () => {
    const [w1, w2] = scoreTrend(sc, s, 2);
    expect(Object.keys(w1!.scores)).toEqual(["corvane", "trakvia", "routelyne", "gridwell"]);
    expect(w1!.partial).toBe(false);
    expect(w2!.partial).toBe(true);
  });

  it("shades the client's usual variation using the clear-change multiplier", () => {
    const [w1] = scoreTrend(sc, s, 1);
    const t = sc.table.find((r) => r.brand === "corvane" && r.week === 1)!;
    const band = s.clearChangeMultiplier * t.se;
    expect(w1!.low).toBeCloseTo(Math.max(0, t.score! - band));
    expect(w1!.high).toBeCloseTo(Math.min(100, t.score! + band));
  });

  it("follows whichever company the screen is viewed as", () => {
    const [w1] = scoreTrend(sc, viewAs(s, "trakvia"), 1);
    expect(Object.keys(w1!.scores)[0]).toBe("trakvia");
  });
});

describe("head-to-head tally", () => {
  const t = winnerTally([
    win("win", ["trakvia"]),
    win("win", ["trakvia"]),
    win("win", ["corvane"]),
    win("tie", ["routelyne", "trakvia"]),
    win("none", []),
  ]);

  it("counts outright leads, ties and pairs with no recommendation separately", () => {
    expect(t).toEqual({
      pairs: 5,
      led: [
        { brand: "trakvia", count: 2 },
        { brand: "corvane", count: 1 },
      ],
      ties: 1,
      none: 1,
    });
  });

  it("reads as one plain sentence", () => {
    const name = (b: string) => b.charAt(0).toUpperCase() + b.slice(1);
    expect(tallySentence(t, name)).toBe(
      "Of 5 question and AI tool pairs this week, Trakvia led 2, Corvane 1, ties 1, no one recommended 1.",
    );
  });

  it("leaves out ties and empty pairs when there are none", () => {
    const one = winnerTally([win("win", ["corvane"])]);
    expect(tallySentence(one, (b) => b)).toBe(
      "Of 1 question and AI tool pair this week, corvane led 1.",
    );
  });
});

describe("who replaced the client", () => {
  const reps = [
    rep(3, "corvane", ["trakvia"], "P02"),
    rep(3, "corvane", ["trakvia", "routelyne"], "P01"),
    rep(2, "corvane", []),
    rep(2, "trakvia", ["corvane"]),
    rep(4, "corvane", ["gridwell"]),
  ];

  it("only counts the client's drops, up to the week being viewed", () => {
    const r = whoReplaced(reps, "corvane", 3);
    expect(r.drops).toBe(3);
    expect(r.unreplaced).toBe(1);
    expect(r.replacers).toEqual([
      { brand: "trakvia", times: 2 },
      { brand: "routelyne", times: 1 },
    ]);
  });

  it("groups the drops by week, latest first", () => {
    const r = whoReplaced(reps, "corvane", 3);
    expect(r.byWeek.map((g) => g.week)).toEqual([3, 2]);
    expect(r.byWeek[0]!.items.map((i) => i.promptId)).toEqual(["P01", "P02"]);
  });
});

describe("answers behind a question", () => {
  it("returns one engine's answers for the given weeks, oldest first", () => {
    const res = results([
      ...fullWeek(2, ["chatgpt", "perplexity"], "Corvane."),
      ...fullWeek(1, ["chatgpt"], "Corvane."),
    ]);
    const ids = pairAnswerIds(res, "P01", "chatgpt", [1, 2]);
    const got = ids.map((id) => res.answers.find((a) => a.responseId === id)!);
    expect(got.map((a) => [a.week, a.run])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ]);
    expect(got.every((a) => a.engine === "chatgpt" && a.promptId === "P01")).toBe(true);
  });
});
