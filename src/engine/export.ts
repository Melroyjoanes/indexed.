/** The two scoring files, in exactly the format the brief specifies. */
import type { Results } from "./run";

function cell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const toCsv = (header: string[], rows: string[][]) =>
  [header, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";

/** One row per answer and company (six per answer), mentioned or not. */
export function mentionsCsv(res: Results): string {
  return toCsv(
    ["response_id", "brand", "mentioned", "position", "tone"],
    res.mentions.map((m) => [
      m.responseId,
      m.brand,
      String(m.mentioned),
      m.position === null ? "" : String(m.position),
      m.tone ?? "",
    ]),
  );
}

/** One row per claim that contradicts facts.json. */
export function wrongFactsCsv(res: Results): string {
  return toCsv(
    ["response_id", "brand", "fact_key", "claim_text"],
    res.claims.filter((c) => c.wrong).map((c) => [c.responseId, c.brand, c.factKey, c.rawText]),
  );
}
