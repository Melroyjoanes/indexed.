import { describe, expect, it } from "vitest";
import { BRANDS, CONFIG, FACTS } from "../../tests/fixtures/pack";
import { mentionsCsv, wrongFactsCsv } from "./export";
import { buildPack } from "./pack";
import { runPack } from "./run";

const results = (rows: object[]) =>
  runPack(
    buildPack(
      [
        { name: "brands.json", content: JSON.stringify(BRANDS) },
        { name: "facts.json", content: JSON.stringify(FACTS) },
        { name: "r.jsonl", content: rows.map((r) => JSON.stringify(r)).join("\n") },
      ],
      CONFIG,
    ),
  );

describe("scoring export", () => {
  it("writes six rows per answer, including companies that aren't mentioned", () => {
    const csv = mentionsCsv(
      results([
        {
          response_id: "r1",
          week: 1,
          response_text: "Trakvia is a strong pick. You may also come across Corvane.",
        },
      ]),
    );
    expect(csv.trim().split("\n")).toEqual([
      "response_id,brand,mentioned,position,tone",
      "r1,corvane,true,2,neutral",
      "r1,trakvia,true,1,recommended",
      "r1,routelyne,false,,",
      "r1,gridwell,false,,",
      "r1,fleetora,false,,",
      "r1,novahaul,false,,",
    ]);
  });

  it("gives failed calls six 'not mentioned' rows", () => {
    const csv = mentionsCsv(
      results([{ response_id: "t", week: 1, response_text: "", error: "timeout" }]),
    );
    expect(csv.trim().split("\n").slice(1)).toHaveLength(6);
    expect(csv).not.toContain("true");
  });

  it("quotes claim text that contains commas or quotes", () => {
    const csv = wrongFactsCsv(
      results([
        {
          response_id: "w",
          week: 1,
          response_text: 'Corvane Fleet is "fine". It\'s based in Columbus, Georgia.',
        },
      ]),
    );
    expect(csv.trim().split("\n")).toEqual([
      "response_id,brand,fact_key,claim_text",
      `w,corvane,hq,"It's based in Columbus, Georgia."`,
    ]);
  });
});

describe("wrong-fact evidence from raw answers", () => {
  // Each answer carries a contradiction wrapped in markup the loader cleans up.
  const cases = [
    {
      kind: "footnote markers",
      text: "Corvane Fleet is headquartered in Chicago [1]. Pricing starts at $29 per vehicle [2, 3].",
      factKey: "hq",
      claim: "Corvane Fleet is headquartered in Chicago [1].",
    },
    {
      kind: "HTML entities",
      text: "Gridwell is solid. Trakvia doesn&#39;t integrate with Salesforce &amp; similar CRMs.",
      factKey: "integrations",
      claim: "Trakvia doesn&#39;t integrate with Salesforce &amp; similar CRMs.",
    },
    {
      kind: "curly punctuation",
      text: "Routelyne’s plans start at $49 per vehicle per month — it’s “budget” no more.",
      factKey: "starting_price_usd",
      claim: "Routelyne’s plans start at $49 per vehicle per month — it’s “budget” no more.",
    },
    {
      kind: "Windows line breaks",
      text: "Top picks:\r\n- **Corvane Fleet:** founded in 2009 [4], it covers ELD.\r\nAsk for a demo.",
      factKey: "founded",
      claim: "founded in 2009 [4], it covers ELD.",
    },
  ];

  it.each(cases)("quotes the claim exactly as written, with $kind", ({ text, factKey, claim }) => {
    const res = results([{ response_id: "r1", week: 1, response_text: text }]);
    const wrong = res.claims.filter((c) => c.wrong);
    expect(wrong.map((c) => [c.factKey, c.rawText])).toEqual([[factKey, claim]]);
    expect(text).toContain(wrong[0]!.rawText);
  });

  it("writes the raw claim to wrong_facts.csv", () => {
    const res = results([{ response_id: "r1", week: 1, response_text: cases[1]!.text }]);
    expect(wrongFactsCsv(res).trim().split("\n")[1]).toBe(
      "r1,trakvia,integrations,Trakvia doesn&#39;t integrate with Salesforce &amp; similar CRMs.",
    );
  });
});
