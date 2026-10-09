/** How complete a week's data is, per engine, in words a client can act on. */
import { engineLabel } from "../config";
import type { Results } from "../run";
import { expectedFor } from "../score";
import { listOf, plural } from "./words";

export interface EngineCoverage {
  engine: string;
  label: string;
  expected: number;
  received: number;
  failed: number; // the call errored or came back empty
  notCollected: number;
}

export type CoverageLevel = "complete" | "minor" | "major" | "none";

export interface Coverage {
  engines: EngineCoverage[];
  expected: number;
  received: number;
  level: CoverageLevel;
  summary: string;
  comparedOn: string[]; // engine labels with answers this week
}

export function coverage(res: Results, week: number): Coverage {
  const s = res.pack.settings;
  const { engines, prompts } = expectedFor(res, week);
  const per = prompts.length * s.runsPerWeek;
  const inWeek = res.answers.filter((a) => a.week === week);
  const rows: EngineCoverage[] = engines.map((e) => {
    const got = inWeek.filter((a) => a.engine === e);
    const received = got.filter((a) => a.ok).length;
    const failed = got.length - received;
    return {
      engine: e,
      label: engineLabel(s, e),
      expected: per,
      received,
      failed,
      notCollected: Math.max(per - received - failed, 0),
    };
  });
  const expected = rows.reduce((a, r) => a + r.expected, 0);
  const received = rows.reduce((a, r) => a + r.received, 0);
  const failedCalls = rows.reduce((a, r) => a + r.failed, 0);
  const absent = rows.filter((r) => r.received === 0 && r.failed === 0).map((r) => r.label);
  const allFailed = rows.filter((r) => r.received === 0 && r.failed > 0).map((r) => r.label);
  const present = rows.filter((r) => r.received > 0).map((r) => r.label);

  const parts = [`${received} of ${expected} expected answers came in`];
  if (absent.length)
    parts.push(
      `${listOf(absent)} ${absent.length === 1 ? "wasn't" : "weren't"} collected this week`,
    );
  if (allFailed.length) parts.push(`Every request to ${listOf(allFailed)} failed`);
  if (failedCalls && !allFailed.length)
    parts.push(
      `${plural(failedCalls, "request")} failed and ${failedCalls === 1 ? "is" : "are"} left out`,
    );

  let level: CoverageLevel;
  if (received === 0) {
    level = "none";
    parts.push("There's nothing to score this week");
  } else if (absent.length || allFailed.length || received < 0.9 * expected) {
    level = "major";
    if (absent.length || allFailed.length)
      parts.push(`Changes this week compare ${listOf(present)} only`);
  } else level = received < expected ? "minor" : "complete";

  return {
    engines: rows,
    expected,
    received,
    level,
    summary: `${parts.join(". ")}.`,
    comparedOn: present,
  };
}
