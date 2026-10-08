/**
 * Reading answer files.
 *
 * Exports from different weeks don't look the same: field names, engine
 * names and date formats all changed in the sample data. Everything is mapped
 * to one shape here so nothing downstream has to care.
 */
import type { Settings } from "./types";

export interface Answer {
  responseId: string;
  week: number | null;
  engine: string;
  promptId: string;
  run: number | null;
  collectedAt: string | null; // ISO 8601
  text: string;
  citations: string[];
  error: string | null;
  sourceFile: string;
  ok: boolean;
}

export interface LoadReport {
  files: string[];
  linesRead: number;
  unreadable: string[]; // "file:line"
  duplicates: string[]; // response ids seen more than once (first copy kept)
  failed: string[]; // calls that errored or came back empty
  formats: Record<string, number>; // field set -> lines
  engineNames: Record<string, number>; // raw engine name -> lines
}

export interface SourceFile {
  name: string;
  content: string;
}

const FIELDS = {
  responseId: ["response_id", "id", "answer_id"],
  week: ["week", "week_number", "week_no"],
  engine: ["engine", "model", "platform", "ai_engine"],
  promptId: ["prompt_id", "question_id", "prompt", "query_id"],
  run: ["run", "run_number", "run_no", "attempt"],
  collectedAt: ["collected_at", "collected", "timestamp", "date", "created_at"],
  text: ["response_text", "answer", "text", "response", "output", "content"],
  citations: ["citations", "sources", "references", "links"],
  error: ["error", "error_message"],
} as const;

type Row = Record<string, unknown>;

function pick(row: Row, field: keyof typeof FIELDS): unknown {
  for (const k of FIELDS[field]) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const m = String(v).match(/\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * ISO dates, plus the "07/09/2026 21:26" style seen in week 4. Collection
 * dates elsewhere put that week in early September, so it's day/month/year.
 */
export function parseDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, hh = "0", mi = "0"] = m;
    const d = new Date(Date.UTC(+yyyy!, +mm! - 1, +dd!, +hh, +mi));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

/** "AI Overview", "google_ai_overview" -> "google_ai_overview". Unknown names pass through. */
export function normaliseEngine(raw: unknown, settings: Settings): string {
  const s = norm(String(raw ?? ""));
  const engines = Object.entries(settings.engines);
  for (const [key, e] of engines) if (e.aliases.some((a) => norm(a) === s)) return key;
  for (const [key, e] of engines) if (e.aliases.some((a) => s.includes(norm(a)))) return key;
  return s.replace(/ /g, "_") || "unknown";
}

function citations(v: unknown): string[] {
  if (!v) return [];
  const list = Array.isArray(v) ? v : String(v).split(/[\s,;]+/);
  return list
    .map((c) => {
      if (c && typeof c === "object") {
        const o = c as Record<string, unknown>;
        return String(o.url ?? o.link ?? o.href ?? "");
      }
      return String(c ?? "");
    })
    .map((c) => c.trim())
    .filter(Boolean);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

/** Decode HTML entities (&amp;) and drop Perplexity-style [1] footnote markers. */
export function cleanText(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e] ?? _)
    .replace(/[ \t]*\[\d+(?:,\s*\d+)*\]/g, "")
    .replace(/\r\n/g, "\n");
}

/** "https://www.g2.com/x?utm=1" -> "g2.com" */
export function domainOf(url: string): string {
  let u = url.trim();
  if (!u.includes("://")) u = `http://${u}`;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return u.toLowerCase();
  }
}

export function loadAnswers(
  files: SourceFile[],
  settings: Settings,
): { answers: Answer[]; report: LoadReport } {
  const report: LoadReport = {
    files: [],
    linesRead: 0,
    unreadable: [],
    duplicates: [],
    failed: [],
    formats: {},
    engineNames: {},
  };
  const seen = new Set<string>();
  const answers: Answer[] = [];

  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    report.files.push(file.name);
    file.content.split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      report.linesRead += 1;
      let row: Row;
      try {
        const parsed: unknown = JSON.parse(line);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
        row = parsed as Row;
      } catch {
        report.unreadable.push(`${file.name}:${i + 1}`);
        return;
      }
      const shape = Object.keys(row).sort().join(",");
      report.formats[shape] = (report.formats[shape] ?? 0) + 1;
      const rawEngine = String(pick(row, "engine") ?? "");
      report.engineNames[rawEngine] = (report.engineNames[rawEngine] ?? 0) + 1;

      const responseId = String(pick(row, "responseId") ?? `${file.name}:${i + 1}`);
      if (seen.has(responseId)) {
        report.duplicates.push(responseId);
        return;
      }
      seen.add(responseId);

      const text = cleanText(String(pick(row, "text") ?? ""));
      const error = pick(row, "error");
      const ok = !error && text.trim().length > 0;
      if (!ok) report.failed.push(responseId);
      answers.push({
        responseId,
        week: toInt(pick(row, "week")),
        engine: normaliseEngine(rawEngine, settings),
        promptId: String(pick(row, "promptId") ?? "")
          .trim()
          .toUpperCase(),
        run: toInt(pick(row, "run")),
        collectedAt: parseDate(pick(row, "collectedAt")),
        text,
        citations: citations(pick(row, "citations")),
        error: error ? String(error) : null,
        sourceFile: file.name,
        ok,
      });
    });
  }
  return { answers, report };
}
