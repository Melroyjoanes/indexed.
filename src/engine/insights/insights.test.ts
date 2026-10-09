import { describe, expect, it } from "vitest";
import { fullWeek, results, type Row } from "../../../tests/fixtures/build";
import { score } from "../score";
import {
  coverage,
  describeFact,
  factAlerts,
  factCounts,
  replacements,
  sources,
  weeklyBrief,
  winners,
} from ".";

const brief = (rows: Row[], week: number) => {
  const res = results(rows);
  return weeklyBrief(res, score(res), week);
};

describe("coverage", () => {
  it("separates failed requests from engines that weren't collected", () => {
    const res = results([
      ...fullWeek(1, ["chatgpt", "perplexity"], "Corvane is a strong pick."),
      [2, "chatgpt", "P01", 1, "Corvane is a strong pick."],
      [2, "chatgpt", "P01", 2, ""],
    ]);
    const c = coverage(res, 2);
    const by = Object.fromEntries(c.engines.map((e) => [e.engine, e]));
    expect(by.chatgpt).toMatchObject({ received: 1, failed: 1, notCollected: 2 });
    expect(by.perplexity).toMatchObject({ received: 0, notCollected: 4 });
    expect(c.level).toBe("major");
    expect(c.summary).toContain("Perplexity wasn't collected this week");
    expect(c.summary).toContain("1 request failed and is left out");
  });

  it("says when every request failed, rather than calling the engine missing", () => {
    const res = results([
      [1, "chatgpt", "P01", 1, "Corvane is a strong pick."],
      [2, "chatgpt", "P01", 1, ""],
    ]);
    const c = coverage(res, 2);
    expect(c.level).toBe("none");
    expect(c.summary).toContain("every ChatGPT request failed");
    expect(c.summary).not.toContain("wasn't collected");
  });

  it("isn't affected by an engine added in a later week", () => {
    const res = results([
      ...fullWeek(1, ["chatgpt"], "Corvane."),
      ...fullWeek(2, ["chatgpt", "claude"], "Corvane."),
    ]);
    expect(coverage(res, 1)).toMatchObject({ level: "complete", expected: 4, received: 4 });
  });
});

describe("wrong-fact alerts", () => {
  const res = results([
    [1, "chatgpt", "P01", 1, "Corvane Fleet is good. It's based in Columbus, Georgia."],
    [2, "chatgpt", "P01", 1, "Corvane Fleet is good. It was founded in 2009."],
    [
      2,
      "chatgpt",
      "P01",
      2,
      "Corvane Fleet is good. It was founded in 2009. It was founded in 2009 indeed.",
    ],
  ]);

  it("never shows facts from weeks after the one being viewed", () => {
    expect(factAlerts(res, ["corvane"], 1).map((f) => f.factKey)).toEqual(["hq"]);
  });

  it("counts answers, not sentences, and puts this week's first", () => {
    const [first] = factAlerts(res, ["corvane"], 2);
    expect(first).toMatchObject({ factKey: "founded", answers: 2, thisWeek: 2, firstWeek: 2 });
  });

  it("phrases each claim in plain English", () => {
    expect(describeFact("Corvane", "hq", "Chicago", "Columbus, Ohio")).toEqual({
      claim: "Corvane is based in Chicago",
      truth: "it's in Columbus, Ohio",
    });
    expect(describeFact("Routelyne", "features.eld_compliance", "true", "false").claim).toBe(
      "Routelyne offers ELD compliance",
    );
  });
});

describe("wrong-fact counts", () => {
  const alerts = (week: number) =>
    factAlerts(
      results([
        ...fullWeek(1, ["chatgpt"], "Corvane Fleet is good. It's based in Chicago."),
        [2, "chatgpt", "P01", 1, "Corvane Fleet is good. It's based in Chicago."],
        [2, "chatgpt", "P01", 2, "Corvane Fleet is good. It was founded in 2009."],
      ]),
      ["corvane"],
      week,
    );

  it("leads with this week's count and labels the running total", () => {
    const [hq, founded] = alerts(2);
    expect(factCounts(hq!, 2)).toEqual({
      lead: "1 answer this week says Corvane is based in Chicago",
      history: "5 answers in total since week 1",
    });
    expect(factCounts(founded!, 2)).toEqual({
      lead: "1 answer this week says Corvane was founded in 2009",
      history: "First seen this week",
    });
  });

  it("says when a claim wasn't repeated this week", () => {
    const later = factAlerts(
      results([
        ...fullWeek(1, ["chatgpt"], "Corvane Fleet is good. It's based in Chicago."),
        ...fullWeek(2, ["chatgpt"], "Corvane is a strong pick."),
      ]),
      ["corvane"],
      2,
    );
    expect(factCounts(later[0]!, 2)).toEqual({
      lead: "Corvane is based in Chicago",
      history: "Not seen this week; 4 answers in week 1",
    });
  });
});

describe("head-to-head", () => {
  it("names no winner when nobody was recommended", () => {
    const res = results([
      [
        1,
        "chatgpt",
        "P01",
        1,
        "Routelyne offers low pricing, but some users report slow customer support.",
      ],
      [
        1,
        "chatgpt",
        "P01",
        2,
        "Trakvia covers the basics, though reviewers mention a clunky mobile app.",
      ],
    ]);
    expect(winners(score(res).rows, [1])[0]).toMatchObject({ status: "none", winners: [] });
  });

  it("shows equal scores as a tie", () => {
    const res = results([
      [1, "chatgpt", "P01", 1, "Routelyne is a strong pick."],
      [1, "chatgpt", "P01", 2, "Trakvia is a strong pick."],
    ]);
    expect(winners(score(res).rows, [1])[0]).toMatchObject({
      status: "tie",
      winners: ["routelyne", "trakvia"],
    });
  });

  it("lists who appeared when a company dropped out", () => {
    const res = results([
      [1, "chatgpt", "P01", 1, "Corvane is a strong pick."],
      [2, "chatgpt", "P01", 1, "Trakvia is a strong pick."],
    ]);
    expect(replacements(score(res).rows)).toEqual([
      { week: 2, promptId: "P01", engine: "chatgpt", dropped: "corvane", replacedBy: ["trakvia"] },
    ]);
  });
});

describe("sources", () => {
  it("flags sites cited next to competitors but never next to the client", () => {
    const res = results([[1, "chatgpt", "P01", 1, "Trakvia is a strong pick."]]);
    res.answers[0]!.citations = ["https://www.g2.com/fleet"];
    const [g2] = sources(res, 1);
    expect(g2).toMatchObject({ domain: "g2.com", neverClient: true, competitorAhead: "trakvia" });
  });
});

describe("weekly brief", () => {
  it("doesn't invent a change for the first week", () => {
    const b = brief(fullWeek(1, ["chatgpt"], "Corvane is a strong pick."), 1);
    expect(b.headline).toMatch(/first week of data/);
    expect(b.cards[0]?.vsLastWeek).toBeNull();
    expect(b.changes).toEqual([]);
  });

  it("reports a clear drop in plain words, and who gained", () => {
    const b = brief(
      [
        ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
        ...fullWeek(2, ["chatgpt"], "Trakvia is a strong pick. You may also come across Corvane."),
      ],
      2,
    );
    expect(b.headline).toMatch(/^Corvane is down \d+\.\d points since week 1\./);
    expect(b.gained[0]?.name).toBe("Trakvia");
    expect(b.cards.find((c) => c.brand === "corvane")?.vsLastWeek?.clear).toBe(true);
  });

  it("explains why it compares with an earlier week", () => {
    const steady = "Corvane is a strong pick. Trakvia is another option.";
    const b = brief(
      [
        ...fullWeek(1, ["chatgpt"], steady),
        ...fullWeek(2, ["chatgpt"], steady),
        ...fullWeek(3, ["chatgpt"], steady),
        ...fullWeek(4, ["chatgpt"], steady),
      ],
      4,
    );
    expect(b.earlier).toBe(1);
    expect(b.baselineNote).toMatch(
      /^Week 3 to week 4 is within normal variation for Corvane, so this summary compares with week 1 instead./,
    );
    const last = brief(
      [...fullWeek(1, ["chatgpt"], steady), ...fullWeek(2, ["chatgpt"], steady)],
      2,
    );
    expect(last.earlier).toBe(1);
    expect(last.baselineNote).toBeNull();
  });

  it("words next steps as things to monitor, not proof", () => {
    const b = brief(
      [
        ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
        ...fullWeek(2, ["chatgpt"], "Trakvia is a strong pick. Corvane Fleet is based in Chicago."),
      ],
      2,
    );
    const text = b.actions.map((a) => a.detail).join(" ");
    expect(text).toMatch(/keep watching|keep tracking/i);
    expect(text).not.toMatch(/show whether it worked|fade/);
    expect(b.actions.find((a) => a.kind === "facts")?.detail).toMatch(
      /^4 answers this week say Corvane is based in Chicago \(it's in Columbus, Ohio; 4 in total\)/,
    );
  });

  it("shows nothing to act on in a week with no usable answers", () => {
    const b = brief(
      [...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."), [2, "chatgpt", "P01", 1, ""]],
      2,
    );
    expect(b.coverage.level).toBe("none");
    expect(b.actions).toEqual([]);
    expect(b.headline).toMatch(/No usable answers/);
  });
});
