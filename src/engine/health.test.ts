import { describe, expect, it } from "vitest";
import { fullWeek, results } from "../../tests/fixtures/build";
import { BRANDS, CONFIG, FACTS, settings } from "../../tests/fixtures/pack";
import {
  describeFormats,
  engineNames,
  packTotals,
  trackedCompanies,
  weekHealth,
  weekRanges,
} from "./health";
import { mentionsCsv } from "./export";
import { coverage } from "./insights/coverage";
import { buildPack } from "./pack";
import { runPack } from "./run";
import { loadAnswers } from "./ingest";
import { expectedFor, score } from "./score";

const jsonl = (rows: object[]) => rows.map((r) => JSON.stringify(r)).join("\n");
const usual = (id: string, week: number, extra: object = {}) => ({
  response_id: id,
  week,
  engine: "chatgpt",
  prompt_id: "P01",
  run: 1,
  response_text: "Corvane is a strong pick.",
  citations: [],
  collected_at: "2026-09-01",
  ...extra,
});
const week4 = (id: string) => ({
  response_id: id,
  week: 4,
  engine: "ChatGPT",
  prompt_id: "P01",
  run_number: 1,
  answer: "Corvane is a strong pick.",
  sources: [],
  collected: "07/09/2026 21:26",
});

describe("weekRanges", () => {
  it("joins runs of three or more weeks with 'to'", () => {
    expect(weekRanges([6, 1, 2, 3, 5])).toBe("1 to 3, 5 and 6");
    expect(weekRanges([4])).toBe("4");
    expect(weekRanges([])).toBe("");
  });
});

describe("describeFormats", () => {
  const { report } = loadAnswers(
    [
      {
        name: "r.jsonl",
        content: jsonl([
          usual("a", 1),
          usual("b", 2),
          usual("c", 3, { error: "timeout", response_text: "" }),
          week4("d"),
        ]),
      },
    ],
    settings,
  );
  const notes = describeFormats(report);

  it("treats the most common field set as usual, counting failed lines with it", () => {
    expect(notes[0]).toMatchObject({ usual: true, lines: 3, weeks: [1, 2, 3] });
    expect(notes[0]!.text).toBe("Weeks 1 to 3 used the usual format (3 lines).");
  });

  it("names the fields a different week renamed, most telling first", () => {
    expect(notes[1]).toMatchObject({ usual: false, weeks: [4] });
    expect(notes[1]!.renamed).toEqual(["answer", "sources", "collected", "run_number"]);
    expect(notes[1]!.text).toBe(
      "Week 4 used different field names (answer, sources, collected, run_number), 1 line. They were read the same way.",
    );
  });

  it("points out fields the tool doesn't read", () => {
    const { report: r } = loadAnswers(
      [
        {
          name: "r.jsonl",
          content: jsonl([usual("a", 1), usual("b", 1), usual("c", 2, { tokens: 9 })]),
        },
      ],
      settings,
    );
    expect(describeFormats(r)[1]!.ignored).toEqual(["tokens"]);
  });

  it("returns nothing for an empty report", () => {
    expect(describeFormats(loadAnswers([], settings).report)).toEqual([]);
  });
});

describe("engineNames", () => {
  it("shows what each raw engine name was counted as", () => {
    const { report } = loadAnswers(
      [
        {
          name: "r.jsonl",
          content: jsonl([
            usual("a", 1),
            usual("b", 1, { engine: "AI Overview" }),
            usual("c", 1, { engine: "Bard" }),
          ]),
        },
      ],
      settings,
    );
    expect(engineNames(report, settings)).toEqual([
      { raw: "Bard", lines: 1, engine: "bard", label: "bard", known: false },
      { raw: "chatgpt", lines: 1, engine: "chatgpt", label: "ChatGPT", known: true },
      {
        raw: "AI Overview",
        lines: 1,
        engine: "google_ai_overview",
        label: "Google AI Overviews",
        known: true,
      },
    ]);
  });
});

describe("packTotals and weekHealth", () => {
  const res = results([
    ...fullWeek(1, ["chatgpt", "perplexity"], "Corvane is a strong pick."),
    ...fullWeek(2, ["chatgpt"], "Corvane is a strong pick."),
    [2, "chatgpt", "P01", 1, ""],
  ]);

  it("counts what was read, kept and scored", () => {
    expect(packTotals(res)).toMatchObject({
      linesRead: 13,
      duplicates: 0,
      kept: 13,
      failed: 1,
      scored: 12,
    });
  });

  it("notes weeks where an AI tool is missing", () => {
    const h = weekHealth(res);
    expect(h.map((w) => [w.week, w.missingTools])).toEqual([
      [1, []],
      [2, ["Perplexity"]],
    ]);
  });
});

describe("trackedCompanies", () => {
  it("groups companies by role with spellings and look-alikes from config", () => {
    const groups = trackedCompanies(settings);
    expect(groups.map((g) => g.role)).toEqual(["client", "tracked", "other"]);
    const corvane = groups[0]!.companies[0]!;
    expect(corvane).toMatchObject({ key: "corvane", lookalikes: ["Corvane Logistics"] });
    expect(corvane.spellings).toContain("Corvain");
    expect(corvane.spellings).not.toContain("Corvane Fleet");
    expect(groups[1]!.companies.map((c) => c.key)).toEqual(["trakvia", "routelyne", "gridwell"]);
  });
});

describe("answers that can't be placed in a week", () => {
  // Regression: a line like {"week":7} with no AI tool or question invented a
  // week 7 that "expected" 128 answers and became the default week.
  const res = results([
    ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
    [7, "", "", 1, ""],
  ]);

  it("keeps them in the exports but out of every week", () => {
    const sc = score(res);
    expect(sc.weeks).toEqual([1]);
    expect(expectedFor(res, 7).engines).toEqual(["chatgpt"]);
    expect(mentionsCsv(res).trim().split("\n")).toHaveLength(1 + 5 * 6);
    expect(packTotals(res)).toMatchObject({ kept: 5, scored: 4, unplaced: 1 });
  });
});

describe("a week whose answers aren't text", () => {
  // Regression: 90 answers with object-valued text read as "90 of 90 came in"
  // and scored every company zero.
  it("isn't reported as complete or scored", () => {
    const res = results(fullWeek(1, ["chatgpt"], "Corvane is a strong pick."));
    const lines = ["P01", "P02"].flatMap((p) =>
      [1, 2].map((run) =>
        JSON.stringify({
          response_id: `x-${p}-${run}`,
          week: 2,
          engine: "chatgpt",
          prompt_id: p,
          run,
          response_text: { answer: "Corvane Fleet is a strong pick." },
        }),
      ),
    );
    const files = [
      { name: "brands.json", content: JSON.stringify(BRANDS) },
      { name: "facts.json", content: JSON.stringify(FACTS) },
      { name: "a.jsonl", content: lines.join("\n") },
      {
        name: "b.jsonl",
        content: res.pack.answers
          .map((a) =>
            JSON.stringify({
              response_id: a.responseId,
              week: a.week,
              engine: a.engine,
              prompt_id: a.promptId,
              run: a.run,
              response_text: a.text,
            }),
          )
          .join("\n"),
      },
    ];
    const both = runPack(buildPack(files, CONFIG));
    const c = coverage(both, 2);
    expect(c.level).toBe("none");
    expect(c.summary).toMatch(/^0 of 4 expected answers came in/);
    expect(score(both).table.find((t) => t.brand === "corvane" && t.week === 2)?.score).toBeNull();
    expect(packTotals(both).malformed).toBe(4);
  });
});
