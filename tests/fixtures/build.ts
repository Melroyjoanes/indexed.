/** Builds Results from a few hand-written answers, for tests. */
import { buildPack } from "@/engine/pack";
import { runPack, type Results } from "@/engine/run";
import { BRANDS, CONFIG, FACTS } from "./pack";

export type Row = [week: number, engine: string, prompt: string, run: number, text: string];

const PROMPTS =
  "prompt_id,question,stage,priority\nP01,Best fleet tracking?,comparing_options,3\nP02,Cheapest GPS tracking?,comparing_options,2\n";

export function results(rows: Row[], prompts = PROMPTS): Results {
  const lines = rows.map(([week, engine, prompt_id, run, text], i) =>
    JSON.stringify({
      response_id: `r${i}`,
      week,
      engine,
      prompt_id,
      run,
      response_text: text,
      error: text ? null : "timeout",
    }),
  );
  return runPack(
    buildPack(
      [
        { name: "brands.json", content: JSON.stringify(BRANDS) },
        { name: "facts.json", content: JSON.stringify(FACTS) },
        { name: "prompts.csv", content: prompts },
        { name: "r.jsonl", content: lines.join("\n") },
      ],
      CONFIG,
    ),
  );
}

/** Every question, both runs, on the given engines. */
export function fullWeek(week: number, engines: string[], text: string): Row[] {
  return engines.flatMap((e) =>
    ["P01", "P02"].flatMap((p) => [1, 2].map((r) => [week, e, p, r, text] as Row)),
  );
}
