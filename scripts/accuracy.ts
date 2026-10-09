/**
 * Prints the accuracy report quoted in the README.
 *
 *   npm run accuracy              print it
 *   npm run accuracy -- --write   also save tests/accuracy/REPORT.md
 *
 * The saved report names the commit it was run on and a SHA-256 fingerprint
 * of the data pack, so a result can be tied to code and data without
 * publishing the pack.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { analyse } from "../src/engine/detect";
import { runPack } from "../src/engine/run";
import { compare, type Labels } from "../tests/accuracy/compare";
import hand from "../tests/accuracy/hand-labels.json";
import { HELD_OUT_2 } from "../tests/accuracy/held-out-2";
import { HELD_OUT_3_FACTS, HELD_OUT_3_TONE } from "../tests/accuracy/held-out-3";
import {
  measureFacts,
  measureTone,
  type FactResult,
  type ToneResult,
} from "../tests/accuracy/measure";
import { drawSample, SEED } from "../tests/accuracy/sample";
import { FACTS, FRESH_TONE, MENTIONS } from "../tests/accuracy/unseen-wording";
import { settings as s } from "../tests/fixtures/pack";
import { loadPackFromDir } from "./lib";

const lines: string[] = [];
const say = (l = "") => lines.push(l);
const frac = (a: number, b: number) => `${a} / ${b}`;

const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};
const commit = git("rev-parse --short HEAD") || "unknown";
const dirty = git("status --porcelain -- src config tests scripts") !== "";

function tone(title: string, r: ToneResult) {
  say(`${title}: ${frac(r.right, r.of)} right`);
  say(
    `  misses: ${r.fellBackToNeutral} fell back to mentioned, ${r.falseVerdict} gave a verdict to a neutral sentence, ${r.wrongStrength} right direction but wrong strength, ${r.flipped} flipped`,
  );
  for (const m of r.misses) say(`  - ${m}`);
}

function facts(title: string, r: FactResult) {
  say(`${title}: ${frac(r.found, r.expected)} contradictions found`);
  say(
    `  ${r.missed.length} missed, ${r.falsePositives.length} false contradictions, ${frac(r.controlsClean, r.controls)} negative controls clean`,
  );
  for (const m of r.missed) say(`  - missed ${m}`);
  for (const m of r.falsePositives) say(`  - false ${m}`);
}

say(`# Accuracy report`);
say();
say(`Commit ${commit}${dirty ? " with uncommitted changes" : ""}.`);

const dataDir = "data";
if (existsSync(path.join(dataDir, "responses.jsonl"))) {
  const hash = createHash("sha256");
  for (const n of readdirSync(dataDir).sort())
    hash.update(n).update(readFileSync(path.join(dataDir, n)));
  const res = runPack(loadPackFromDir(dataDir));
  const a = compare(res, hand.labels as unknown as Labels);
  const sample = drawSample(res.pack.answers);
  say(`Data pack fingerprint (SHA-256 of the files in data/): ${hash.digest("hex").slice(0, 16)}.`);
  say();
  say(`## Agreement with the committed labels (sample pack)`);
  say();
  say(`15 answers drawn with seed ${SEED}: ${sample.map((x) => x.responseId).join(", ")}.`);
  say(`Labels: ${hand.provenance}`);
  say();
  say(`- Named or not: ${frac(a.mentionsRight, a.pairs)} answer and company pairs`);
  say(`- Position: ${frac(a.positionsRight, a.bothMentioned)}`);
  say(`- Tone: ${frac(a.tonesRight, a.bothMentioned)}`);
  for (const d of a.disagreements)
    say(`  - ${d.responseId} ${d.brand} ${d.field}: tool ${d.tool}, label ${d.hand}`);
} else {
  say();
  say(`No data/ folder, so the sample-pack sections were skipped.`);
}

say();
say(`## Fresh evaluation (held-out set 3, run once, never tuned on)`);
say();
tone("Tone", measureTone(HELD_OUT_3_TONE, s));
facts("Wrong facts", measureFacts(HELD_OUT_3_FACTS, s));

say();
say(`## Development regressions (seen while building; not an accuracy estimate)`);
say();
const m = MENTIONS.filter(([t, b, e]) => analyse(t, s).positions.has(b) === e).length;
say(`Mentions: ${frac(m, MENTIONS.length)}`);
facts("Wrong facts", measureFacts(FACTS, s));
tone("Tone, set 1 (first reported at 5 / 12)", measureTone(FRESH_TONE, s));
tone("Tone, set 2 (first reported at 4 / 12)", measureTone(HELD_OUT_2, s));

const text = lines.join("\n") + "\n";
console.log(text);
if (process.argv.includes("--write")) {
  writeFileSync("tests/accuracy/REPORT.md", text);
  console.log("Saved tests/accuracy/REPORT.md");
}
