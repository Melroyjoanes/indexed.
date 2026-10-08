/**
 * A data pack: the four kinds of file the client sends. Pure functions over
 * file contents, so the same code runs on the server, in the CLI and in tests.
 */
import { buildSettings, type BrandsFile, type TrackerConfig } from "./config";
import { loadAnswers, type Answer, type LoadReport, type SourceFile } from "./ingest";
import type { Settings } from "./types";

export interface Prompt {
  id: string;
  question: string;
  stage: string;
  priority: number;
}

export interface Pack {
  settings: Settings;
  answers: Answer[];
  prompts: Record<string, Prompt>;
  report: LoadReport;
}

/** Minimal CSV reader: quoted fields, escaped quotes, commas inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export function parsePrompts(csv: string): Record<string, Prompt> {
  const out: Record<string, Prompt> = {};
  for (const r of parseCsv(csv)) {
    const id = (r.prompt_id ?? "").toUpperCase();
    if (!id) continue;
    out[id] = {
      id,
      question: r.question ?? id,
      stage: r.stage || "unknown",
      priority: Number(r.priority) || 1,
    };
  }
  return out;
}

export class PackError extends Error {}

/**
 * Builds a pack from loose files. Answer files are any *.jsonl; the others are
 * found by name. brands.json is required; facts and prompts are optional.
 */
export function buildPack(files: SourceFile[], config: TrackerConfig): Pack {
  const byName = new Map(files.map((f) => [f.name.toLowerCase(), f.content]));
  const brands = byName.get("brands.json");
  if (!brands) throw new PackError("brands.json is missing from the data pack.");
  let brandsFile: BrandsFile;
  let facts: Record<string, unknown> = {};
  try {
    brandsFile = JSON.parse(brands) as BrandsFile;
    const f = byName.get("facts.json");
    if (f) facts = JSON.parse(f) as Record<string, unknown>;
  } catch {
    throw new PackError("brands.json or facts.json isn't valid JSON.");
  }
  const settings = buildSettings(brandsFile, config, facts);
  const answerFiles = files.filter((f) => f.name.toLowerCase().endsWith(".jsonl"));
  if (answerFiles.length === 0) throw new PackError("No answer files (*.jsonl) in the data pack.");
  const { answers, report } = loadAnswers(answerFiles, settings);
  const csv = byName.get("prompts.csv");
  return { settings, answers, prompts: csv ? parsePrompts(csv) : {}, report };
}
