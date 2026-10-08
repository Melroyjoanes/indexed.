import { describe, expect, it } from "vitest";
import { fullWeek, results } from "../../../tests/fixtures/build";
import {
  countsLine,
  filterMatrix,
  findAnswer,
  NO_FILTERS,
  questionMatrix,
  stageLabel,
  toneCounts,
  type QuestionMatrix,
} from "./questions";

const PROMPTS = [
  "prompt_id,question,stage,priority",
  "P01,Best fleet tracking?,comparing_options,3",
  "P02,How do I choose ELD software?,early_research,2",
  "P03,Corvane Fleet reviews,specific_company,3",
].join("\n");

const RECOMMENDED = "Corvane is a strong pick.";
const MENTIONED = "Trakvia is a strong pick. You may also come across Corvane.";
const ABSENT = "Trakvia is a strong pick.";

const cell = (m: QuestionMatrix, promptId: string, engine: string) =>
  m.rows.find((r) => r.promptId === promptId)!.engines.find((e) => e.engine === engine)!;

describe("question matrix", () => {
  it("keeps both runs when they disagree", () => {
    const res = results(
      [
        [1, "chatgpt", "P01", 1, RECOMMENDED],
        [1, "chatgpt", "P01", 2, ABSENT],
      ],
      PROMPTS,
    );
    const c = cell(questionMatrix(res, "corvane", 1), "P01", "chatgpt");
    expect(c.status).toBe("answered");
    expect(c.runsAgree).toBe(false);
    expect(c.runs).toMatchObject([
      { kind: "answered", run: 1, mentioned: true, tone: "recommended", position: 1 },
      { kind: "answered", run: 2, mentioned: false, tone: null, position: null },
    ]);
    expect(c.responseIds).toEqual(["r0", "r1"]);
  });

  it("says the runs agree when tone and position match", () => {
    const res = results(
      [
        [1, "chatgpt", "P01", 1, RECOMMENDED],
        [1, "chatgpt", "P01", 2, RECOMMENDED],
      ],
      PROMPTS,
    );
    expect(cell(questionMatrix(res, "corvane", 1), "P01", "chatgpt").runsAgree).toBe(true);
  });

  it("keeps a failed run apart from a usable one", () => {
    const res = results(
      [
        [1, "chatgpt", "P01", 1, RECOMMENDED],
        [1, "chatgpt", "P01", 2, ""],
        [1, "chatgpt", "P02", 1, ""],
        [1, "chatgpt", "P02", 2, ""],
      ],
      PROMPTS,
    );
    const m = questionMatrix(res, "corvane", 1);
    const p1 = cell(m, "P01", "chatgpt");
    expect(p1.status).toBe("answered");
    expect(p1.runs[1]).toMatchObject({ kind: "failed", error: "timeout" });
    expect(p1.runsAgree).toBe(true);
    expect(cell(m, "P02", "chatgpt").status).toBe("failed");
  });

  it("shows an engine that wasn't collected this week instead of dropping it", () => {
    const res = results(
      [
        ...fullWeek(1, ["chatgpt", "perplexity"], RECOMMENDED),
        ...fullWeek(2, ["chatgpt"], RECOMMENDED),
      ],
      PROMPTS,
    );
    const m = questionMatrix(res, "corvane", 2);
    expect(m.engines).toEqual(["chatgpt", "perplexity"]);
    expect(cell(m, "P01", "perplexity")).toMatchObject({
      status: "not_collected",
      runs: [],
      responseIds: [],
    });
    // P03 is in prompts.csv but was never asked: still listed, with nothing collected.
    expect(cell(m, "P03", "chatgpt").status).toBe("not_collected");
  });

  it("never reads anything after the selected week", () => {
    const res = results(
      [
        [1, "chatgpt", "P01", 1, ABSENT],
        [2, "chatgpt", "P01", 1, RECOMMENDED],
        [2, "claude", "P01", 1, RECOMMENDED],
      ],
      PROMPTS,
    );
    const m = questionMatrix(res, "corvane", 1);
    expect(m.engines).toEqual(["chatgpt"]);
    expect(cell(m, "P01", "chatgpt").responseIds).toEqual(["r0"]);
    expect(toneCounts(m)).toMatchObject({ answers: 1, mentioned: 0, notMentioned: 1 });
  });

  it("reads the chosen company's side of the same answers", () => {
    const res = results([[1, "chatgpt", "P01", 1, MENTIONED]], PROMPTS);
    expect(cell(questionMatrix(res, "corvane", 1), "P01", "chatgpt").runs[0]).toMatchObject({
      tone: "neutral",
      position: 2,
    });
    expect(cell(questionMatrix(res, "trakvia", 1), "P01", "chatgpt").runs[0]).toMatchObject({
      tone: "recommended",
      position: 1,
    });
  });

  it("lists stages in buying order with plain names", () => {
    const res = results([[1, "chatgpt", "P01", 1, RECOMMENDED]], PROMPTS);
    const m = questionMatrix(res, "corvane", 1);
    expect(m.stages).toEqual(["early_research", "comparing_options", "specific_company"]);
    expect(m.stages.map(stageLabel)).toEqual([
      "Early research",
      "Comparing options",
      "Specific company",
    ]);
    expect(stageLabel("after_purchase")).toBe("After purchase");
  });
});

describe("filters", () => {
  const res = results(
    [
      [1, "chatgpt", "P01", 1, RECOMMENDED],
      [1, "chatgpt", "P01", 2, RECOMMENDED],
      [1, "perplexity", "P01", 1, ABSENT],
      [1, "chatgpt", "P02", 1, MENTIONED],
      [1, "perplexity", "P02", 1, RECOMMENDED],
      [1, "chatgpt", "P03", 1, ABSENT],
      [1, "perplexity", "P03", 1, ""],
    ],
    PROMPTS,
  );
  const m = questionMatrix(res, "corvane", 1);
  const ids = (x: QuestionMatrix) => x.rows.map((r) => r.promptId);

  it("does nothing with no filters", () => {
    expect(ids(filterMatrix(m, NO_FILTERS))).toEqual(["P01", "P02", "P03"]);
  });

  it("filters by buying stage", () => {
    expect(ids(filterMatrix(m, { ...NO_FILTERS, stage: "early_research" }))).toEqual(["P02"]);
  });

  it("keeps only the chosen engine's column", () => {
    const f = filterMatrix(m, { ...NO_FILTERS, engine: "perplexity" });
    expect(f.engines).toEqual(["perplexity"]);
    expect(f.rows.every((r) => r.engines.length === 1)).toBe(true);
  });

  it("filters by tone on the engines shown", () => {
    expect(ids(filterMatrix(m, { ...NO_FILTERS, tone: "recommended" }))).toEqual(["P01", "P02"]);
    expect(ids(filterMatrix(m, { ...NO_FILTERS, tone: "neutral" }))).toEqual(["P02"]);
    expect(ids(filterMatrix(m, { ...NO_FILTERS, tone: "not_mentioned" }))).toEqual(["P01", "P03"]);
    expect(
      ids(filterMatrix(m, { ...NO_FILTERS, tone: "recommended", engine: "perplexity" })),
    ).toEqual(["P02"]);
  });

  it("never counts a failed request as not mentioned", () => {
    const f = filterMatrix(m, { ...NO_FILTERS, tone: "not_mentioned", engine: "perplexity" });
    expect(ids(f)).toEqual(["P01"]);
  });

  it("combines filters and can match nothing", () => {
    expect(
      ids(filterMatrix(m, { ...NO_FILTERS, stage: "specific_company", tone: "recommended" })),
    ).toEqual([]);
  });

  it("searches question text and question id", () => {
    expect(ids(filterMatrix(m, { ...NO_FILTERS, text: "eld" }))).toEqual(["P02"]);
    expect(ids(filterMatrix(m, { ...NO_FILTERS, text: "p03" }))).toEqual(["P03"]);
  });
});

describe("summary counts", () => {
  const res = results(
    [
      [1, "chatgpt", "P01", 1, RECOMMENDED],
      [1, "chatgpt", "P01", 2, MENTIONED],
      [1, "chatgpt", "P02", 1, ABSENT],
      [1, "chatgpt", "P02", 2, ""],
    ],
    PROMPTS,
  );

  it("counts every run once and keeps failures apart", () => {
    const c = toneCounts(questionMatrix(res, "corvane", 1));
    expect(c).toEqual({
      answers: 3,
      mentioned: 2,
      recommended: 1,
      neutral: 1,
      negative: 0,
      not_recommended: 0,
      notMentioned: 1,
      failed: 1,
    });
    expect(countsLine("Corvane", c)).toBe(
      "Corvane was named in 2 of 3 answers: recommended in 1. Not mentioned in 1. 1 request failed and isn't counted.",
    );
  });

  it("follows the filters", () => {
    const m = filterMatrix(questionMatrix(res, "corvane", 1), {
      ...NO_FILTERS,
      stage: "early_research",
    });
    expect(toneCounts(m)).toMatchObject({ answers: 1, notMentioned: 1, failed: 1 });
  });

  it("phrases the edge cases plainly", () => {
    const zero = toneCounts({ brand: "x", week: 1, engines: [], stages: [], rows: [] });
    expect(countsLine("Corvane", zero)).toBe("No answers here.");
    expect(countsLine("Corvane", { ...zero, answers: 4, notMentioned: 4 })).toBe(
      "Corvane wasn't named in any of the 4 answers.",
    );
    expect(countsLine("Corvane", { ...zero, answers: 2, mentioned: 2, neutral: 2 })).toBe(
      "Corvane was named in 2 of 2 answers, never recommended.",
    );
  });
});

describe("finding an answer by id", () => {
  const res = results(
    [
      [1, "chatgpt", "P01", 1, RECOMMENDED],
      [2, "chatgpt", "P01", 1, RECOMMENDED],
    ],
    PROMPTS,
  );

  it("finds answers up to the selected week, ignoring case and spaces", () => {
    expect(findAnswer(res, " R0 ", 1)).toEqual({ status: "found", responseId: "r0", week: 1 });
  });

  it("won't open an answer from after the selected week", () => {
    expect(findAnswer(res, "r1", 1)).toEqual({ status: "later", responseId: "r1", week: 2 });
    expect(findAnswer(res, "nope", 2)).toEqual({ status: "none" });
  });
});
