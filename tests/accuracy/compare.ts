/** Compares the tool's mentions with hand labels for a set of answers. */
import type { Results } from "@/engine/run";
import type { Tone } from "@/engine/types";

export type Labels = Record<string, Record<string, [number, Tone]>>;

export interface Disagreement {
  responseId: string;
  brand: string;
  field: "mentioned" | "position" | "tone";
  tool: string;
  hand: string;
}

export interface Agreement {
  answers: number;
  pairs: number; // answers x companies
  mentionsRight: number;
  bothMentioned: number;
  positionsRight: number;
  tonesRight: number;
  disagreements: Disagreement[];
}

export function compare(res: Results, labels: Labels): Agreement {
  const brands = Object.keys(res.pack.settings.brands);
  const out: Agreement = {
    answers: 0,
    pairs: 0,
    mentionsRight: 0,
    bothMentioned: 0,
    positionsRight: 0,
    tonesRight: 0,
    disagreements: [],
  };
  const byKey = new Map(res.mentions.map((m) => [`${m.responseId}|${m.brand}`, m]));
  for (const [responseId, hand] of Object.entries(labels)) {
    out.answers += 1;
    for (const brand of brands) {
      const tool = byKey.get(`${responseId}|${brand}`);
      if (!tool) throw new Error(`Answer ${responseId} isn't in the data`);
      const h = hand[brand];
      out.pairs += 1;
      if (tool.mentioned === Boolean(h)) out.mentionsRight += 1;
      else
        out.disagreements.push({
          responseId,
          brand,
          field: "mentioned",
          tool: String(tool.mentioned),
          hand: String(Boolean(h)),
        });
      if (!tool.mentioned || !h) continue;
      out.bothMentioned += 1;
      if (tool.position === h[0]) out.positionsRight += 1;
      else
        out.disagreements.push({
          responseId,
          brand,
          field: "position",
          tool: String(tool.position),
          hand: String(h[0]),
        });
      if (tool.tone === h[1]) out.tonesRight += 1;
      else
        out.disagreements.push({
          responseId,
          brand,
          field: "tone",
          tool: String(tool.tone),
          hand: h[1],
        });
    }
  }
  return out;
}
