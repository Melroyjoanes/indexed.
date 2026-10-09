/**
 * The health of a loaded data pack, in words: what was read, what was
 * dropped, which file formats and engine names turned up, and who is tracked.
 */
import { engineLabel } from "./config";
import { FIELDS, normaliseEngine, type LoadReport } from "./ingest";
import { coverage, type Coverage } from "./insights/coverage";
import { listOf } from "./insights/words";
import type { Results } from "./run";
import type { Role, Settings } from "./types";

export interface PackTotals {
  files: string[];
  linesRead: number;
  duplicates: number;
  unreadable: string[]; // "file:line"
  kept: number; // answers after duplicates and unreadable lines are dropped
  failed: number; // kept, but the request errored or came back empty
  scored: number;
  unplaced: number; // kept, but missing a week, AI tool or question id
}

export function packTotals(res: Results): PackTotals {
  const r = res.pack.report;
  return {
    files: r.files,
    linesRead: r.linesRead,
    duplicates: r.duplicates.length,
    unreadable: r.unreadable,
    kept: res.answers.length,
    failed: r.failed.length,
    scored: res.answers.filter((a) => a.ok && a.placed).length,
    unplaced: res.answers.filter((a) => !a.placed).length,
  };
}

/** [1, 2, 3, 5, 6] -> "1 to 3, 5 and 6" */
export function weekRanges(weeks: number[]): string {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    if (j - i >= 2) runs.push(`${sorted[i]} to ${sorted[j]}`);
    else for (let k = i; k <= j; k++) runs.push(String(sorted[k]));
    i = j + 1;
  }
  return listOf(runs);
}

const weeksLabel = (weeks: number[]) =>
  weeks.length === 0
    ? "Some lines"
    : `${weeks.length === 1 ? "Week" : "Weeks"} ${weekRanges(weeks)}`;

type Part = keyof typeof FIELDS;
/** Most telling first, for the description. */
const PART_ORDER: Part[] = [
  "text",
  "citations",
  "collectedAt",
  "run",
  "engine",
  "promptId",
  "week",
  "responseId",
  "error",
];
const partOf = (field: string): Part | null =>
  PART_ORDER.find((p) => (FIELDS[p] as readonly string[]).includes(field)) ?? null;

export interface FormatNote {
  fields: string[];
  lines: number;
  weeks: number[];
  usual: boolean;
  renamed: string[]; // fields this format names differently from the usual one
  ignored: string[]; // fields the tool doesn't read
  text: string;
}

/**
 * The field sets seen, described against the most common one. Sets that
 * differ only by an "error" field (present on failed requests) count as one.
 */
export function describeFormats(report: LoadReport): FormatNote[] {
  const groups = new Map<string, { fields: string[]; lines: number; weeks: Set<number> }>();
  for (const [shape, lines] of Object.entries(report.formats)) {
    const fields = shape
      .split(",")
      .filter((f) => f && f !== "error")
      .sort();
    const key = fields.join(",");
    const g = groups.get(key) ?? { fields, lines: 0, weeks: new Set<number>() };
    g.lines += lines;
    for (const w of report.formatWeeks?.[shape] ?? []) g.weeks.add(w);
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => b.lines - a.lines);
  const usual = list[0];
  if (!usual) return [];
  const usualName = new Map<Part, string>();
  for (const f of usual.fields) {
    const p = partOf(f);
    if (p) usualName.set(p, f);
  }

  return list.map((g, i) => {
    const weeks = [...g.weeks].sort((a, b) => a - b);
    const ignored = g.fields.filter((f) => !partOf(f));
    const renamed = g.fields
      .filter((f) => {
        const p = partOf(f);
        return p !== null && usualName.has(p) && usualName.get(p) !== f;
      })
      .sort((a, b) => PART_ORDER.indexOf(partOf(a)!) - PART_ORDER.indexOf(partOf(b)!));
    const who = weeksLabel(weeks);
    const lines = `${g.lines} ${g.lines === 1 ? "line" : "lines"}`;
    let text: string;
    if (i === 0) text = `${who} used the usual format (${lines}).`;
    else {
      const bits: string[] = [];
      if (renamed.length) bits.push(`different field names (${renamed.join(", ")})`);
      if (ignored.length) bits.push(`extra fields the tool doesn't read (${ignored.join(", ")})`);
      text = bits.length
        ? `${who} used ${bits.join(" and ")}, ${lines}. They were read the same way.`
        : `${who} used a slightly different set of fields (${g.fields.join(", ")}), ${lines}.`;
    }
    return { fields: g.fields, lines: g.lines, weeks, usual: i === 0, renamed, ignored, text };
  });
}

export interface EngineName {
  raw: string;
  lines: number;
  engine: string;
  label: string;
  known: boolean; // matched an AI tool in config/tracker.json
}

/** Every engine name seen in the files and the AI tool it was counted as. */
export function engineNames(report: LoadReport, settings: Settings): EngineName[] {
  return Object.entries(report.engineNames)
    .map(([raw, lines]) => {
      const engine = normaliseEngine(raw, settings);
      return {
        raw: raw || "(blank)",
        lines,
        engine,
        label: engineLabel(settings, engine),
        known: engine in settings.engines,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label) || b.lines - a.lines);
}

export interface WeekHealth {
  week: number;
  coverage: Coverage;
  missingTools: string[]; // AI tools with nothing at all that week
}

export function weekHealth(res: Results): WeekHealth[] {
  const weeks = [
    ...new Set(res.answers.map((a) => a.week).filter((w): w is number => w !== null)),
  ].sort((a, b) => a - b);
  return weeks.map((week) => {
    const c = coverage(res, week);
    return {
      week,
      coverage: c,
      missingTools: c.engines.filter((e) => e.received === 0 && e.failed === 0).map((e) => e.label),
    };
  });
}

export interface TrackedCompany {
  key: string;
  name: string;
  website: string;
  spellings: string[];
  lookalikes: string[];
}

export interface TrackedGroup {
  role: Role;
  label: string;
  companies: TrackedCompany[];
}

const ROLE_LABEL: Record<Role, string> = {
  client: "Your company",
  tracked: "Tracked competitors",
  other: "Other companies watched",
};

export function trackedCompanies(settings: Settings): TrackedGroup[] {
  return (["client", "tracked", "other"] as Role[])
    .map((role) => ({
      role,
      label: ROLE_LABEL[role],
      companies: Object.values(settings.brands)
        .filter((b) => b.role === role)
        .map((b) => ({
          key: b.key,
          name: b.name,
          website: b.website,
          spellings: b.aliases.filter((a) => a.toLowerCase() !== b.name.toLowerCase()),
          lookalikes: b.lookalikes,
        })),
    }))
    .filter((g) => g.companies.length);
}
