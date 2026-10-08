/**
 * What goes into the monthly board report and the evaluation files, as plain
 * data. The PDF and Excel code only lays this out, so every sentence and
 * number here is tested once and reads the same in both files.
 *
 * A report for week N only ever uses weeks up to N.
 */
import { engineLabel, focusBrands, shortName } from "./config";
import { mentionsCsv, wrongFactsCsv } from "./export";
import {
  describeFact,
  howMany,
  listOf,
  plural,
  sources,
  weeklyBrief,
  winners,
  type ChangeView,
} from "./insights";
import type { Results } from "./run";
import { compare, expectedFor, type Change, type Scoring } from "./score";
import type { Settings } from "./types";

/* ---------- wording helpers ---------- */

/**
 * The report never contains em or en dashes, including inside quoted AI
 * answers: a dash between numbers becomes "to", any other becomes a comma.
 */
export function plainDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[–—]+\s*/g, ", ")
    .replace(/−/g, "-");
}

const finite = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

/** Whole points, as on the dashboard. */
export const scoreText = (n: number | null | undefined) =>
  finite(n) ? String(Math.round(n)) : "n/a";

/** "+3.1" / "-2.0" / "0.0", with a plain hyphen so it prints in any font. */
export const signedText = (n: number) => {
  const v = Math.abs(n).toFixed(1);
  if (v === "0.0") return "0.0";
  return n > 0 ? `+${v}` : `-${v}`;
};

export const percentText = (n: number | null | undefined) =>
  finite(n) ? `${Math.round(n * 100)}%` : "n/a";

const oneDecimal = (n: number | null | undefined) => (finite(n) ? Math.round(n * 10) / 10 : null);

/** "recommended / not mentioned" (the two runs differ) -> "recommended in one run, not mentioned in the other" */
export const runs = (states: string) => {
  const [a, b] = states.split(" / ");
  return b ? `${a} in one run, ${b} in the other` : states;
};

const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ---------- the report ---------- */

export type Verdict = "clear change" | "normal variation" | "no matching answers";

export interface ReportChange {
  against: number;
  delta: number | null;
  verdict: Verdict;
  /** "+3.1 vs week 5, normal variation" */
  text: string;
  /** AI tools compared, only when fewer than usual. */
  comparedOn: string[] | null;
}

export interface ReportScoreRow {
  brand: string;
  name: string;
  isClient: boolean;
  score: number | null;
  scoreText: string;
  rank: number;
  namedIn: string;
  vsLastWeek: ReportChange | null;
  vsEarlier: ReportChange | null;
}

export interface ReportFact {
  /** "8 answers say Corvane is based in Chicago. In fact, it's in Columbus, Ohio." */
  text: string;
  /** "2 this week, first seen in week 3" */
  detail: string;
  thisWeek: number;
  answers: number;
  firstWeek: number;
  lastWeek: number;
}

export interface ReportContent {
  /** "AI visibility report, Corvane Fleet, week 6" */
  title: string;
  fileName: string; // without extension
  clientName: string;
  week: number;
  weeks: number[];
  earlier: number | null;
  headline: string;
  completeness: string;
  completenessLevel: "complete" | "minor" | "major" | "none";
  scores: ReportScoreRow[];
  scoreNote: string;
  /** The three questions that moved the client's score most. */
  changes: { title: string; detail: string }[];
  changesTitle: string;
  changesEmpty: string;
  gained: string[];
  gainedTitle: string;
  gainedEmpty: string;
  factsThisWeek: ReportFact[];
  factsHistory: ReportFact[];
  nextSteps: { title: string; detail: string }[];
  howToRead: string[];
}

function changeOf(view: ChangeView | null): ReportChange | null {
  if (!view) return null;
  if (view.delta === null)
    return {
      against: view.against,
      delta: null,
      verdict: "no matching answers",
      text: `No matching answers to compare with week ${view.against}`,
      comparedOn: null,
    };
  const verdict: Verdict = view.clear ? "clear change" : "normal variation";
  return {
    against: view.against,
    delta: view.delta,
    verdict,
    text: `${signedText(view.delta)} vs week ${view.against}, ${verdict}`,
    comparedOn: view.comparedOn,
  };
}

/** The score explained for someone who has never seen the dashboard. */
export function howToRead(s: Settings): string[] {
  const p = s.points;
  const times = (n: number) => (n === 2 ? "twice" : `${n} times`);
  return [
    `The score runs from 0 to 100 and shows how strongly AI answers point buyers toward a company. Each answer gives ${p.recommended} points when the company is recommended, ${p.neutral} when it is only mentioned, ${p.negative} when it is criticised and ${p.not_recommended} when it is advised against or left out. Being named further down the answer counts a little less.`,
    "Questions closest to a purchase count more than early research questions. The score is the average over every question and AI tool that answered that week.",
    `Every question is asked ${times(s.runsPerWeek)} on each AI tool every week, and the answers differ a little each time. A change is called a clear change only when it is more than ${times(s.clearChangeMultiplier)} that usual run-to-run variation. Anything smaller is normal variation and is not worth acting on alone.`,
    "Changes compare only the questions and AI tools both weeks have, so a missing AI tool or a failed request can't look like a drop.",
  ];
}

export function reportContent(res: Results, sc: Scoring, week: number): ReportContent {
  const s = res.pack.settings;
  const brief = weeklyBrief(res, sc, week);
  const client = shortName(s, s.client);
  const none = brief.coverage.level === "none";

  const scores: ReportScoreRow[] = brief.cards.map((c) => ({
    brand: c.brand,
    name: c.name,
    isClient: c.isClient,
    score: c.score,
    scoreText: scoreText(c.score),
    rank: c.rank,
    namedIn: percentText(c.mentionRate),
    vsLastWeek: changeOf(c.vsLastWeek),
    vsEarlier: changeOf(c.vsEarlier),
  }));
  const missingFrom = (compared: string[]) =>
    expectedFor(res, week)
      .engines.map((e) => engineLabel(s, e))
      .filter((l) => !compared.includes(l));
  const narrowed = scores.find((r) => r.vsLastWeek?.comparedOn)?.vsLastWeek;
  const scoreNote =
    brief.earlier === null && brief.weeks.length < 2
      ? `Week ${week} is the first week of data, so there are no changes to show yet.`
      : narrowed?.comparedOn
        ? `Changes vs week ${narrowed.against} compare ${listOf(narrowed.comparedOn)} only, because ${listOf(missingFrom(narrowed.comparedOn))} ${missingFrom(narrowed.comparedOn).length === 1 ? "is" : "are"} missing from one of the two weeks.`
        : "Changes compare the same questions and AI tools in both weeks.";

  const facts: ReportFact[] = brief.facts.map((f) => ({
    text: `${howMany(f.answers, f.claim)}. In fact, ${f.truth}.`,
    detail:
      f.thisWeek > 0
        ? `${f.thisWeek} this week, first seen in week ${f.firstWeek}`
        : `Not seen this week, last seen in week ${f.lastWeek}`,
    thisWeek: f.thisWeek,
    answers: f.answers,
    firstWeek: f.firstWeek,
    lastWeek: f.lastWeek,
  }));

  const content: ReportContent = {
    title: `AI visibility report, ${brief.clientName}, week ${week}`,
    fileName: `${s.client}-ai-visibility-week-${week}`,
    clientName: brief.clientName,
    week,
    weeks: brief.weeks,
    earlier: brief.earlier,
    headline: brief.headline,
    completeness: brief.coverage.summary,
    completenessLevel: brief.coverage.level,
    scores: none ? [] : scores,
    scoreNote,
    changesTitle:
      brief.earlier === null
        ? "The three biggest changes"
        : `The three biggest changes for ${client} since week ${brief.earlier}`,
    changes: brief.changes.map((c) => ({
      title: `"${c.question}" on ${c.engineLabel}`,
      detail: `Week ${brief.earlier}: ${runs(c.before)}. Week ${week}: ${runs(c.now)}. This moved ${client}'s overall score by ${signedText(c.impact)} points.`,
    })),
    changesEmpty: none
      ? `No usable answers came in for week ${week}.`
      : brief.earlier === null
        ? "This is the first week of data. Changes show from the second week."
        : `No question moved for ${client}.`,
    gainedTitle: `Who gained where ${client} dropped`,
    gained: brief.gained.map(
      (g) =>
        `${g.name} gained on ${plural(g.pairs.length, "question")}, including "${g.pairs[0]!.question}" on ${g.pairs[0]!.engineLabel}.`,
    ),
    gainedEmpty:
      brief.earlier === null || none
        ? "Nothing to compare yet."
        : "No company gained in particular where the score dropped.",
    factsThisWeek: facts.filter((f) => f.thisWeek > 0),
    factsHistory: facts,
    nextSteps: brief.actions.map((a) => ({ title: a.title, detail: a.detail })),
    howToRead: howToRead(s),
  };
  return clean(content);
}

/** Applies plainDashes to every string in the report, however deep. */
function clean<T>(value: T): T {
  if (typeof value === "string") return plainDashes(value) as T;
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)])) as T;
  return value;
}

/* ---------- the workbook ---------- */

export type CellValue = string | number | null;

export interface SheetColumn {
  header: string;
  /** "score": one decimal; "count": whole number; "long": wraps; default: short text. */
  kind?: "score" | "count" | "long";
}

export interface SheetContent {
  name: string;
  columns: SheetColumn[];
  rows: CellValue[][];
}

function summarySheet(r: ReportContent): SheetContent {
  const rows: CellValue[][] = [
    ["Report", r.title],
    ["Headline", r.headline],
    ["Data completeness", r.completeness],
  ];
  for (const c of r.scores) {
    const parts = [
      `score ${c.scoreText} (rank ${c.rank} of ${r.scores.length})`,
      c.vsLastWeek?.text ?? "first week of data",
      ...(c.vsEarlier ? [c.vsEarlier.text] : []),
      `named in ${c.namedIn} of answers`,
    ];
    rows.push([`Score, ${c.name}`, `${parts.join("; ")}.`]);
  }
  rows.push(["About the changes", r.scoreNote]);
  if (r.changes.length)
    for (const c of r.changes) rows.push(["Biggest change", `${c.title}: ${c.detail}`]);
  else rows.push(["Biggest changes", r.changesEmpty]);
  if (r.gained.length) for (const g of r.gained) rows.push(["Who gained", g]);
  else rows.push(["Who gained", r.gainedEmpty]);
  if (r.factsThisWeek.length)
    for (const f of r.factsThisWeek) rows.push(["Wrong fact this week", `${f.text} ${f.detail}.`]);
  else rows.push(["Wrong facts this week", "None in this week's answers."]);
  rows.push([
    "Wrong facts up to this week",
    r.factsHistory.length
      ? `${plural(r.factsHistory.length, "different wrong claim")} since week ${r.weeks[0]}. Every one is listed on the Wrong facts sheet.`
      : "Nothing has contradicted the fact sheet so far.",
  ]);
  for (const a of r.nextSteps) rows.push(["Suggested next step", `${a.title}. ${a.detail}`]);
  return {
    name: "Summary",
    columns: [{ header: "Topic" }, { header: "Detail", kind: "long" }],
    rows,
  };
}

function scoresSheet(res: Results, sc: Scoring, week: number): SheetContent {
  const s = res.pack.settings;
  const weeks = sc.weeks.filter((w) => w <= week);
  const at = (b: string, w: number) => sc.table.find((t) => t.brand === b && t.week === w);
  const rows: CellValue[][] = focusBrands(s).map((b) => [
    s.brands[b]?.name ?? b,
    ...weeks.map((w) => oneDecimal(at(b, w)?.score)),
  ]);
  rows.push(["Answers received", ...weeks.map((w) => at(s.client, w)?.answers ?? 0)]);
  rows.push(["Answers expected", ...weeks.map((w) => at(s.client, w)?.expectedAnswers ?? 0)]);
  rows.push([
    "AI tools missing",
    ...weeks.map((w) => {
      const missing = at(s.client, w)?.missingEngines ?? [];
      return missing.length ? missing.map((e) => engineLabel(s, e)).join(", ") : "None";
    }),
  ]);
  return {
    name: "Scores by week",
    columns: [
      { header: "Company" },
      ...weeks.map((w) => ({ header: `Week ${w}`, kind: "score" as const })),
    ],
    rows,
  };
}

function verdictOf(c: Change): string {
  if (c.firstWeek) return "First week of data, nothing to compare";
  if (!c.cells) return "No matching answers to compare";
  return c.clear ? "Clear change" : "Normal variation";
}

function changesSheet(res: Results, sc: Scoring, week: number): SheetContent {
  const s = res.pack.settings;
  const weeks = sc.weeks.filter((w) => w <= week);
  const prev = weeks.length > 1 ? weeks[weeks.length - 2]! : null;
  const back = weeks.length >= 4 ? weeks[weeks.length - 4]! : null;
  const rows: CellValue[][] = [];
  for (const b of focusBrands(s)) {
    const against = [prev, ...(back === null ? [] : [back])];
    for (const earlier of against) {
      const c = compare(sc, b, week, earlier, s);
      rows.push([
        s.brands[b]?.name ?? b,
        earlier === null ? `Week ${week}` : `Week ${week} vs week ${earlier}`,
        c.engines.length ? c.engines.map((e) => engineLabel(s, e)).join(", ") : "None",
        c.cells || null,
        oneDecimal(c.before),
        oneDecimal(c.now),
        oneDecimal(c.delta),
        oneDecimal(s.clearChangeMultiplier * c.se),
        verdictOf(c),
      ]);
    }
  }
  return {
    name: "Changes",
    columns: [
      { header: "Company" },
      { header: "Comparison" },
      { header: "AI tools compared" },
      { header: "Question and AI tool pairs compared", kind: "count" },
      { header: "Score before", kind: "score" },
      { header: "Score now", kind: "score" },
      { header: "Change", kind: "score" },
      { header: "Usual variation (a clear change is bigger)", kind: "score" },
      { header: "Verdict" },
    ],
    rows,
  };
}

function wrongFactsSheet(res: Results, week: number): SheetContent {
  const s = res.pack.settings;
  const byId = new Map(res.answers.map((a) => [a.responseId, a]));
  const rows = res.claims
    .filter((c) => c.wrong)
    .map((c) => ({ c, a: byId.get(c.responseId) }))
    .filter(({ a }) => a && a.week !== null && a.week <= week)
    .sort(
      (x, y) =>
        y.a!.week! - x.a!.week! ||
        x.a!.engine.localeCompare(y.a!.engine) ||
        x.a!.promptId.localeCompare(y.a!.promptId) ||
        x.c.responseId.localeCompare(y.c.responseId),
    )
    .map(({ c, a }) => {
      const name = shortName(s, c.brand);
      const d = describeFact(name, c.factKey, c.claimed, c.actual);
      return [
        a!.week,
        engineLabel(s, a!.engine),
        a!.prompt.question,
        name,
        capital(d.claim),
        capital(d.truth),
        c.sentence,
        c.responseId,
      ] as CellValue[];
    });
  return {
    name: "Wrong facts",
    columns: [
      { header: "Week", kind: "count" },
      { header: "AI tool" },
      { header: "Question", kind: "long" },
      { header: "Company" },
      { header: "What was said", kind: "long" },
      { header: "What's true" },
      { header: "The sentence", kind: "long" },
      { header: "Answer id" },
    ],
    rows,
  };
}

/** Who each AI tool recommends most for each question in week N, ties spelled out. */
export function recommendsSheet(res: Results, sc: Scoring, week: number): SheetContent {
  const s = res.pack.settings;
  const { engines, prompts } = expectedFor(res, week);
  const won = winners(sc.rows, [week]);
  const cell = (promptId: string, engine: string): string => {
    const w = won.find((x) => x.promptId === promptId && x.engine === engine);
    if (!w) return "No answers this week";
    if (w.status === "none") return "No one recommended";
    const names = w.winners.map((b) => shortName(s, b));
    return w.status === "tie" ? `Tie: ${listOf(names)}` : names[0]!;
  };
  return {
    name: "Who AI recommends",
    columns: [
      { header: "Question", kind: "long" },
      ...engines.map((e) => ({ header: engineLabel(s, e) })),
    ],
    rows: prompts.map((p) => [
      res.pack.prompts[p]?.question ?? p,
      ...engines.map((e) => cell(p, e)),
    ]),
  };
}

function sourcesSheet(res: Results, week: number, firstWeek: number): SheetContent {
  const s = res.pack.settings;
  const focus = focusBrands(s);
  const client = shortName(s, s.client);
  return {
    name: "Sources",
    columns: [
      { header: "Website" },
      {
        header:
          firstWeek === week
            ? `Answers citing it (week ${week})`
            : `Answers citing it (weeks ${firstWeek} to ${week})`,
        kind: "count",
      },
      { header: "Own site of" },
      ...focus.map((b) => ({
        header: `Of those, naming ${shortName(s, b)}`,
        kind: "count" as const,
      })),
      { header: "Note", kind: "long" },
    ],
    rows: sources(res, week).map((x) => [
      x.domain,
      x.answers,
      x.ownedBy ? shortName(s, x.ownedBy) : "",
      ...focus.map((b) => x.mentions[b] ?? 0),
      x.ownedBy
        ? ""
        : x.neverClient
          ? `Cited next to competitors, never next to ${client}`
          : x.competitorAhead
            ? `${shortName(s, x.competitorAhead)} is named more often than ${client}`
            : "",
    ]),
  };
}

function methodSheet(s: Settings): SheetContent {
  const read = howToRead(s);
  return {
    name: "Method",
    columns: [{ header: "Topic" }, { header: "Explanation", kind: "long" }],
    rows: [
      ["The score", read[0]!],
      ["Weighting", read[1]!],
      ["Clear change or normal variation", read[2]!],
      [
        "Usual variation",
        `For each comparison, the Changes sheet shows how big a change has to be before it counts as clear: ${s.clearChangeMultiplier === 2 ? "twice" : `${s.clearChangeMultiplier} times`} the usual run-to-run variation for those questions and AI tools. A clear change also has to be at least 1 point.`,
      ],
      ["Like-for-like comparison", read[3]!],
      [
        "Missing data",
        "Failed requests and AI tools that weren't collected are left out, never counted as zero. Each week's score uses the answers that came in, and the Scores by week sheet shows how many answers came in against how many were expected.",
      ],
      [
        "Wrong facts",
        "A wrong fact is a sentence in an AI answer that contradicts the fact sheet (facts.json) on price, location, founding year, features or integrations. Each row links back to its answer id.",
      ],
      [
        "Who AI recommends",
        "For each question and AI tool, the company with the most points among those actually recommended at least once that week. Equal points are shown as a tie. When no company was recommended it says so.",
      ],
      [
        "Sources",
        "Websites the AI tools cited, counted once per answer, with how many of those answers named each company.",
      ],
      [
        "Quotes",
        "Sentences are quoted from the AI answers. Dashes inside them are replaced with commas so the report reads the same everywhere; the answer id leads to the original text.",
      ],
    ],
  };
}

/** Every sheet of the Excel workbook, in order. */
export function workbookContent(res: Results, sc: Scoring, week: number): SheetContent[] {
  const r = reportContent(res, sc, week);
  return clean([
    summarySheet(r),
    scoresSheet(res, sc, week),
    changesSheet(res, sc, week),
    wrongFactsSheet(res, week),
    recommendsSheet(res, sc, week),
    sourcesSheet(res, week, r.weeks[0] ?? week),
    methodSheet(res.pack.settings),
  ]);
}

/* ---------- evaluation files ---------- */

export interface EvaluationFile {
  name: "mentions.csv" | "wrong_facts.csv";
  content: string;
  rows: number; // data rows, without the header
}

/**
 * The two scoring files, exactly as `npm run export` writes them: every
 * loaded answer, every week and company, whichever week or company is shown.
 */
export function evaluationFiles(res: Results): EvaluationFile[] {
  return [
    { name: "mentions.csv", content: mentionsCsv(res), rows: res.mentions.length },
    {
      name: "wrong_facts.csv",
      content: wrongFactsCsv(res),
      rows: res.claims.filter((c) => c.wrong).length,
    },
  ];
}
