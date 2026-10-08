import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadPackFromDir } from "../../scripts/lib";
import golden from "../../tests/golden.json";
import { fullWeek, results, type Row } from "../../tests/fixtures/build";
import { viewAs } from "./config";
import { mentionsCsv, wrongFactsCsv } from "./export";
import {
  evaluationFiles,
  plainDashes,
  reportContent,
  runs,
  signedText,
  workbookContent,
  type SheetContent,
} from "./report";
import { runPack } from "./run";
import { score } from "./score";

const build = (rows: Row[]) => {
  const res = results(rows);
  return { res, sc: score(res) };
};

const sheet = (sheets: SheetContent[], name: string) => {
  const s = sheets.find((x) => x.name === name);
  if (!s) throw new Error(`no sheet ${name}`);
  return s;
};

/** Values of one column, by header. */
const column = (s: SheetContent, header: string) => {
  const i = s.columns.findIndex((c) => c.header === header);
  return s.rows.map((r) => r[i]);
};

const twoWeeks: Row[] = [
  ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
  ...fullWeek(2, ["chatgpt"], "Trakvia is a strong pick. You may also come across Corvane."),
  [3, "chatgpt", "P01", 1, "Corvane Fleet is good. It was founded in 2009."],
];

describe("report content", () => {
  it("never uses answers from weeks after the report's week", () => {
    const { res, sc } = build(twoWeeks);
    const r = reportContent(res, sc, 2);
    expect(r.weeks).toEqual([1, 2]);
    expect(r.factsHistory).toEqual([]);

    const book = workbookContent(res, sc, 2);
    expect(sheet(book, "Scores by week").columns.map((c) => c.header)).toEqual([
      "Company",
      "Week 1",
      "Week 2",
    ]);
    expect(sheet(book, "Wrong facts").rows).toEqual([]);
    expect(sheet(workbookContent(res, sc, 3), "Wrong facts").rows).toHaveLength(1);
  });

  it("names the company it was made for in the title and file name", () => {
    const { res, sc } = build(twoWeeks);
    const r = reportContent(res, sc, 2);
    expect(r.title).toBe("AI visibility report, Corvane Fleet, week 2");
    expect(r.fileName).toBe("corvane-ai-visibility-week-2");

    const asTrakvia = {
      ...res,
      pack: { ...res.pack, settings: viewAs(res.pack.settings, "trakvia") },
    };
    const t = reportContent(asTrakvia, sc, 2);
    expect(t.title).toBe("AI visibility report, Trakvia, week 2");
    expect(t.scores[0]?.name).toBe("Trakvia");
  });

  it("calls a clear drop a clear change and says who gained", () => {
    const { res, sc } = build(twoWeeks);
    const r = reportContent(res, sc, 2);
    const corvane = r.scores.find((s) => s.brand === "corvane")!;
    expect(corvane.vsLastWeek).toMatchObject({ against: 1, verdict: "clear change" });
    expect(corvane.vsLastWeek?.text).toMatch(/^-\d+\.\d vs week 1, clear change$/);
    expect(r.changes.length).toBeGreaterThan(0);
    expect(r.gained[0]).toMatch(/^Trakvia gained on 2 questions/);
  });

  it("doesn't invent changes in the first week", () => {
    const { res, sc } = build(fullWeek(1, ["chatgpt"], "Corvane is a strong pick."));
    const r = reportContent(res, sc, 1);
    expect(r.scores.every((s) => s.vsLastWeek === null && s.vsEarlier === null)).toBe(true);
    expect(r.changes).toEqual([]);
    expect(r.changesEmpty).toMatch(/first week of data/);
    expect(r.scoreNote).toMatch(/first week of data/);

    const changes = sheet(workbookContent(res, sc, 1), "Changes");
    expect(new Set(column(changes, "Verdict"))).toEqual(
      new Set(["First week of data, nothing to compare"]),
    );
    expect(new Set(column(changes, "Change"))).toEqual(new Set([null]));
  });

  it("keeps wrong facts this week apart from the history", () => {
    const { res, sc } = build([
      ...fullWeek(1, ["chatgpt"], "Corvane Fleet is good. It's based in Columbus, Georgia."),
      ...fullWeek(2, ["chatgpt"], "Corvane Fleet is good. It was founded in 2009."),
    ]);
    const r = reportContent(res, sc, 2);
    expect(r.factsThisWeek.map((f) => f.text)).toEqual([
      "4 answers say Corvane was founded in 2009. In fact, it was 2014.",
    ]);
    expect(r.factsHistory).toHaveLength(2);
    expect(r.factsHistory[1]?.detail).toBe("Not seen this week, last seen in week 1");
  });

  it("contains no em or en dashes, even when an AI answer does", () => {
    const { res, sc } = build([
      [1, "chatgpt", "P01", 1, "Corvane Fleet is good. It was founded in 2009 — a long time ago."],
    ]);
    const text = JSON.stringify([reportContent(res, sc, 1), workbookContent(res, sc, 1)]);
    expect(text).not.toMatch(/[–—]/);
    expect(column(sheet(workbookContent(res, sc, 1), "Wrong facts"), "The sentence")[0]).toBe(
      "It was founded in 2009, a long time ago.",
    );
  });
});

describe("workbook", () => {
  it("has the sheets in the agreed order", () => {
    const { res, sc } = build(twoWeeks);
    expect(workbookContent(res, sc, 2).map((s) => s.name)).toEqual([
      "Summary",
      "Scores by week",
      "Changes",
      "Wrong facts",
      "Who AI recommends",
      "Sources",
      "Method",
    ]);
  });

  it("spells out ties, nobody recommended and missing answers", () => {
    const { res, sc } = build([
      [1, "chatgpt", "P01", 1, "Routelyne is a strong pick."],
      [1, "chatgpt", "P01", 2, "Trakvia is a strong pick."],
      [
        1,
        "chatgpt",
        "P02",
        1,
        "Routelyne offers low pricing, but some users report slow customer support.",
      ],
      [1, "perplexity", "P01", 1, "Corvane is a strong pick."],
    ]);
    const s = sheet(workbookContent(res, sc, 1), "Who AI recommends");
    expect(s.columns.map((c) => c.header)).toEqual(["Question", "ChatGPT", "Perplexity"]);
    expect(s.rows).toEqual([
      ["Best fleet tracking?", "Tie: Routelyne and Trakvia", "Corvane"],
      ["Cheapest GPS tracking?", "No one recommended", "No answers this week"],
    ]);
  });

  it("shows which AI tools a change compared", () => {
    const { res, sc } = build([
      ...fullWeek(1, ["chatgpt", "perplexity"], "Corvane is a strong pick."),
      ...fullWeek(2, ["chatgpt"], "Corvane is a strong pick."),
    ]);
    const changes = sheet(workbookContent(res, sc, 2), "Changes");
    const corvane = changes.rows.find((r) => r[0] === "Corvane Fleet")!;
    expect(corvane.slice(1, 4)).toEqual(["Week 2 vs week 1", "ChatGPT", 2]);
    expect(corvane[8]).toBe("Normal variation");
  });

  it("counts answers received and expected per week", () => {
    const { res, sc } = build([
      ...fullWeek(1, ["chatgpt"], "Corvane."),
      [2, "chatgpt", "P01", 1, "Corvane."],
    ]);
    const s = sheet(workbookContent(res, sc, 2), "Scores by week");
    expect(s.rows.find((r) => r[0] === "Answers received")).toEqual(["Answers received", 4, 1]);
    expect(s.rows.find((r) => r[0] === "Answers expected")).toEqual(["Answers expected", 4, 4]);
  });
});

describe("wording", () => {
  it("replaces dashes with words a printer can't get wrong", () => {
    expect(plainDashes("weeks 3–5")).toBe("weeks 3 to 5");
    expect(plainDashes("good — mostly")).toBe("good, mostly");
    expect(plainDashes("−2.0")).toBe("-2.0");
  });

  it("says when the two runs of a question disagreed", () => {
    expect(runs("recommended")).toBe("recommended");
    expect(runs("recommended / not mentioned")).toBe(
      "recommended in one run, not mentioned in the other",
    );
  });

  it("signs changes with a plain hyphen", () => {
    expect(signedText(3.14)).toBe("+3.1");
    expect(signedText(-2)).toBe("-2.0");
    expect(signedText(-0.01)).toBe("0.0");
  });
});

describe("evaluation files", () => {
  const { res } = build(twoWeeks);

  it("are the export's own CSV output, not a copy of it", () => {
    const [mentions, wrong] = evaluationFiles(res);
    expect(mentions).toMatchObject({ name: "mentions.csv", content: mentionsCsv(res) });
    expect(wrong).toMatchObject({ name: "wrong_facts.csv", content: wrongFactsCsv(res) });
    expect(mentions?.rows).toBe(res.answers.length * 6);
    expect(wrong?.rows).toBe(1);
  });

  it("don't depend on which company the dashboard is viewed as", () => {
    const asGridwell = {
      ...res,
      pack: { ...res.pack, settings: viewAs(res.pack.settings, "gridwell") },
    };
    expect(evaluationFiles(asGridwell)).toEqual(evaluationFiles(res));
  });

  const hasData = existsSync("data/responses.jsonl");
  it.skipIf(!hasData)("match the files `npm run export` writes for the sample pack", () => {
    const sha = (s: string) => createHash("sha256").update(s).digest("hex");
    const [mentions, wrong] = evaluationFiles(runPack(loadPackFromDir("data")));
    expect(sha(mentions!.content)).toBe(golden.mentionsSha256);
    expect(sha(wrong!.content)).toBe(golden.wrongFactsSha256);
  });
});
