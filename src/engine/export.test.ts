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
