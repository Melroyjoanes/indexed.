/**
 * Regression lock on the sample data pack.
 *
 * The client's data isn't in the repo, so this stores only a fingerprint
 * (SHA-256) of the two scoring files the engine produced when its accuracy
 * was checked. Any change to detection that alters a single row fails here.
 * This is a regression fingerprint: it detects that output changed, not
 * whether it is right. Skipped when ./data isn't present, which includes
 * public CI, because the pack is client data and isn't committed.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadPackFromDir } from "../scripts/lib";
import { mentionsCsv, wrongFactsCsv } from "@/engine/export";
import { runPack } from "@/engine/run";
import golden from "./golden.json";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const hasData = existsSync("data/responses.jsonl");

describe.skipIf(!hasData)("sample data pack fingerprint (needs ./data)", () => {
  const res = hasData ? runPack(loadPackFromDir("data")) : null;

  it("produces the same mentions.csv as when accuracy was checked", () => {
    expect(sha(mentionsCsv(res!))).toBe(golden.mentionsSha256);
  });

  it("produces the same wrong_facts.csv as when accuracy was checked", () => {
    expect(sha(wrongFactsCsv(res!))).toBe(golden.wrongFactsSha256);
  });

  it("reads the pack as expected", () => {
    const r = res!.pack.report;
    expect({
      lines: r.linesRead,
      answers: res!.answers.length,
      duplicates: r.duplicates.length,
      failed: r.failed.length,
    }).toEqual(golden.pack);
  });
});
