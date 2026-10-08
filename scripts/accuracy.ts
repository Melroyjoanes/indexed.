/**
 * Prints the accuracy report quoted in the README.
 *
 *   npm run accuracy
 */
import { analyse } from "../src/engine/detect";
import { runPack } from "../src/engine/run";
import { compare, type Labels } from "../tests/accuracy/compare";
import hand from "../tests/accuracy/hand-labels.json";
import { drawSample, SEED } from "../tests/accuracy/sample";
import { FACTS, FRESH_TONE, MENTIONS } from "../tests/accuracy/unseen-wording";
import { settings as fixtureSettings } from "../tests/fixtures/pack";
import { loadPackFromDir } from "./lib";

const pct = (a: number, b: number) => `${a}/${b} (${Math.round((100 * a) / b)}%)`;

const res = runPack(loadPackFromDir("data"));
const sample = drawSample(res.pack.answers);
const a = compare(res, hand.labels as unknown as Labels);

console.log(`\n15-answer hand check (seed ${SEED}): ${sample.map((s) => s.responseId).join(", ")}`);
console.log(`  Mentions  ${pct(a.mentionsRight, a.pairs)} answer/company pairs`);
console.log(`  Position  ${pct(a.positionsRight, a.bothMentioned)}`);
console.log(`  Tone      ${pct(a.tonesRight, a.bothMentioned)}`);
for (const d of a.disagreements)
  console.log(`  ✗ ${d.responseId} ${d.brand} ${d.field}: tool ${d.tool}, hand ${d.hand}`);

const s = fixtureSettings;
const m = MENTIONS.filter(([t, b, e]) => analyse(t, s).positions.has(b) === e).length;
const f = FACTS.filter(([t, k]) =>
  analyse(t, s).claims.some((c) => c.wrong && `${c.brand}:${c.factKey}` === k),
).length;
const misses = FRESH_TONE.filter(([t, b, e]) => analyse(t, s).tones.get(b) !== e);
console.log(`\nWording not in the sample pack`);
console.log(`  Mentions     ${pct(m, MENTIONS.length)}`);
console.log(`  Wrong facts  ${pct(f, FACTS.length)}`);
console.log(`  Tone         ${pct(FRESH_TONE.length - misses.length, FRESH_TONE.length)}`);
for (const [t, b, e] of misses)
  console.log(`  ✗ "${t}" ${b}: expected ${e}, got ${analyse(t, s).tones.get(b)}`);
