import { describe, expect, it } from "vitest";
import { BRANDS, CONFIG, FACTS } from "../../tests/fixtures/pack";
import { buildPack, PackError, parseCsv, parsePrompts } from "./pack";

describe("prompts.csv", () => {
  it("reads quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('a,b\n"x, y","say ""hi"""\n\n');
    expect(rows).toEqual([{ a: "x, y", b: 'say "hi"' }]);
  });

  it("normalises ids and priorities", () => {
    const p = parsePrompts(
      "prompt_id,question,stage,priority\r\np01,Best ELD providers,comparing_options,3\r\n",
    );
    expect(p.P01).toEqual({
      id: "P01",
      question: "Best ELD providers",
      stage: "comparing_options",
      priority: 3,
    });
  });
});

describe("data pack", () => {
  const base = [
    { name: "brands.json", content: JSON.stringify(BRANDS) },
    { name: "facts.json", content: JSON.stringify(FACTS) },
  ];

  it("reads every .jsonl file as answers, so a new week is just another file", () => {
    const pack = buildPack(
      [
        ...base,
        { name: "responses.jsonl", content: '{"response_id":"a","week":1,"response_text":"x"}' },
        { name: "week7.jsonl", content: '{"response_id":"b","week":7,"response_text":"y"}' },
      ],
      CONFIG,
    );
    expect(pack.answers.map((a) => a.week)).toEqual([1, 7]);
  });

  it("explains what's wrong with an incomplete pack", () => {
    expect(() => buildPack([], CONFIG)).toThrow(PackError);
    expect(() => buildPack(base, CONFIG)).toThrow(/No answer files/);
  });
});

describe("fact sheet validation", () => {
  const answers = {
    name: "r.jsonl",
    content: JSON.stringify({
      response_id: "r1",
      week: 1,
      engine: "chatgpt",
      prompt_id: "P01",
      run: 1,
      response_text: "Corvane Fleet is good. It's based in Chicago.",
    }),
  };
  const pack = (facts?: string) =>
    buildPack(
      [
        { name: "brands.json", content: JSON.stringify(BRANDS) },
        ...(facts === undefined ? [] : [{ name: "facts.json", content: facts }]),
        answers,
      ],
      CONFIG,
    );

  it("refuses a fact sheet with nothing to check, instead of reporting no wrong facts", () => {
    expect(() => pack("{}")).toThrow(PackError);
    expect(() => pack("{}")).toThrow(/no checkable facts/);
    expect(() => pack(JSON.stringify({ _comment: "x", corvane: { name: "Corvane" } }))).toThrow(
      /no checkable facts/,
    );
  });

  it("refuses a fact sheet that isn't an object of companies", () => {
    expect(() => pack("[]")).toThrow(/should be an object/);
    expect(() => pack('"facts"')).toThrow(/should be an object/);
  });

  it("drops fields of the wrong type rather than checking against them", () => {
    const p = pack(JSON.stringify({ corvane: { hq: "Columbus, Ohio", founded: "2014" } }));
    expect(p.settings.facts.corvane).toEqual({ hq: "Columbus, Ohio" });
  });

  it("keeps only the companies it can check when the sheet is partial", () => {
    const p = pack(JSON.stringify({ corvane: FACTS.corvane, unknownco: FACTS.trakvia }));
    expect(Object.keys(p.settings.facts)).toEqual(["corvane"]);
  });

  it("loads without a fact sheet, with nothing marked as checkable", () => {
    expect(pack().settings.facts).toEqual({});
  });
});
