import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import config from "../config/tracker.json";
import type { TrackerConfig } from "../src/engine/config";
import { buildPack, type Pack } from "../src/engine/pack";

export function loadPackFromDir(dir: string): Pack {
  const names = readdirSync(dir).filter(
    (n) => /\.(jsonl|json|csv)$/i.test(n) && !n.startsWith("."),
  );
  const files = names.map((name) => ({
    name,
    content: readFileSync(path.join(dir, name), "utf8"),
  }));
  return buildPack(files, config as TrackerConfig);
}

export function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}
