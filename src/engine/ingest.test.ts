import { describe, expect, it } from "vitest";
import { settings } from "../../tests/fixtures/pack";
import { cleanText, domainOf, loadAnswers, normaliseEngine, parseDate } from "./ingest";

const jsonl = (rows: object[]) => rows.map((r) => JSON.stringify(r)).join("\n");

describe("reading answer files", () => {
  it("maps both export formats to one shape", () => {
    const { answers } = loadAnswers(
      [
        {
          name: "week1.jsonl",
          content: jsonl([
            {
              response_id: "a1",
              week: 1,
              engine: "chatgpt",
              prompt_id: "P01",
              run: 1,
              collected_at: "2026-08-17T12:00:00Z",
              response_text: "Corvane is a strong pick.",
              citations: null,
            },
          ]),
        },
        {
          name: "week4.jsonl",
          content: jsonl([
            {
              response_id: "b1",
              week: 4,
              engine: "AI Overview",
              prompt_id: "p01",
              run_number: 2,
              collected: "07/09/2026 21:26",
              answer: "Trakvia &amp; Routelyne [1]",
              sources: ["https://www.trakvia.com/x?utm_source=ai"],
            },
          ]),
        },
      ],
      settings,
    );
    expect(answers[0]).toMatchObject({ engine: "chatgpt", run: 1, citations: [], ok: true });
    expect(answers[1]).toMatchObject({
      engine: "google_ai_overview",
      promptId: "P01",
      run: 2,
      collectedAt: "2026-09-07T21:26:00.000Z",
      text: "Trakvia & Routelyne",
    });
  });

  it("keeps the first copy of a duplicate id and reports it", () => {
    const row = {
      response_id: "x",
      week: 2,
      engine: "chatgpt",
      prompt_id: "P01",
      response_text: "hi",
    };
    const { answers, report } = loadAnswers(
      [{ name: "a.jsonl", content: jsonl([row, row]) }],
      settings,
    );
    expect(answers).toHaveLength(1);
    expect(report.duplicates).toEqual(["x"]);
  });

  it("keeps failed calls but marks them, so they show as gaps rather than disappearing", () => {
    const { answers, report } = loadAnswers(
      [
        {
          name: "a.jsonl",
          content: jsonl([
            {
              response_id: "t",
              week: 1,
              engine: "chatgpt",
              prompt_id: "P01",
              response_text: "",
              error: "timeout",
            },
          ]),
        },
      ],
      settings,
    );
    expect(answers[0]?.ok).toBe(false);
    expect(report.failed).toEqual(["t"]);
  });

  it("skips unreadable lines and reports where they were", () => {
    const { answers, report } = loadAnswers(
      [{ name: "a.jsonl", content: '{"response_id":"ok","response_text":"x"}\n{not json\n\n' }],
      settings,
    );
    expect(answers).toHaveLength(1);
    expect(report.unreadable).toEqual(["a.jsonl:2"]);
  });

  it("records every format and engine name it saw", () => {
    const { report } = loadAnswers(
      [
        {
          name: "a.jsonl",
          content: jsonl([
            { answer: "x", engine: "ChatGPT" },
            { response_text: "y", engine: "chatgpt" },
          ]),
        },
      ],
      settings,
    );
    expect(Object.keys(report.formats)).toHaveLength(2);
    expect(report.engineNames).toEqual({ ChatGPT: 1, chatgpt: 1 });
  });
});

describe("normalising values", () => {
  it.each([
    ["ChatGPT", "chatgpt"],
    ["AI Overview", "google_ai_overview"],
    ["google_ai_overview", "google_ai_overview"],
    ["Perplexity Pro", "perplexity"],
    ["Claude", "claude"],
  ])("engine %s -> %s", (raw, key) => {
    expect(normaliseEngine(raw, settings)).toBe(key);
  });

  it("parses ISO dates with offsets and day/month dates", () => {
    expect(parseDate("2026-08-18T14:18:00+05:30")).toBe("2026-08-18T08:48:00.000Z");
    expect(parseDate("07/09/2026")).toBe("2026-09-07T00:00:00.000Z");
    expect(parseDate("soon")).toBeNull();
  });

  it("cleans entities and footnote markers", () => {
    expect(cleanText("A &amp; B [2]. C [1, 3]")).toBe("A & B. C");
  });

  it("reduces citations to their domain", () => {
    expect(domainOf("https://www.g2.com/categories/fleet?utm_source=ai")).toBe("g2.com");
    expect(domainOf("routelyne.com")).toBe("routelyne.com");
  });
});
