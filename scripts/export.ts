/**
 * Writes the scoring files.
 *
 *   npm run export                       # reads ./data, writes ./out
 *   npm run export -- --data some/dir --out results
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { mentionsCsv, wrongFactsCsv } from "../src/engine/export";
import { runPack } from "../src/engine/run";
import { arg, loadPackFromDir } from "./lib";

const dataDir = arg("data", "data");
const outDir = arg("out", "out");

const res = runPack(loadPackFromDir(dataDir));
const r = res.pack.report;
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "mentions.csv"), mentionsCsv(res));
writeFileSync(path.join(outDir, "wrong_facts.csv"), wrongFactsCsv(res));

console.log(`Read ${r.linesRead} lines from ${r.files.join(", ")}`);
console.log(
  `  ${res.answers.length} answers kept · ${r.duplicates.length} duplicates dropped · ` +
    `${r.failed.length} failed calls · ${r.unreadable.length} unreadable lines`,
);
console.log(
  `  ${res.mentions.filter((m) => m.mentioned).length} mentions · ${res.claims.filter((c) => c.wrong).length} wrong facts`,
);
console.log(
  `Wrote ${path.join(outDir, "mentions.csv")} and ${path.join(outDir, "wrong_facts.csv")}`,
);
