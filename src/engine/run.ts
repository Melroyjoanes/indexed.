/**
 * Runs detection over a whole pack and returns flat rows: one per answer x
 * company, and one per claim. Everything the app, exports and scoring use
 * comes from here, so every number traces back to a response id.
 */
import { analyse, type Claim, type Hit } from "./detect";
import { rawSpan, type Answer } from "./ingest";
import type { Pack, Prompt } from "./pack";
import type { Tone } from "./types";

export interface MentionRow {
  responseId: string;
  brand: string;
  mentioned: boolean;
  position: number | null;
  tone: Tone | null;
  evidence: string;
}

export interface ClaimRow extends Claim {
  responseId: string;
  /** The claim exactly as it appears in the raw answer (footnotes, entities and all). */
  rawText: string;
}

export interface AnsweredQuestion extends Answer {
  prompt: Prompt;
  hits: Hit[];
}

export interface Results {
  pack: Pack;
  answers: AnsweredQuestion[];
  mentions: MentionRow[];
  claims: ClaimRow[];
}

const unknownPrompt = (id: string): Prompt => ({ id, question: id, stage: "unknown", priority: 1 });

export function runPack(pack: Pack): Results {
  const brands = Object.keys(pack.settings.brands);
  const answers: AnsweredQuestion[] = [];
  const mentions: MentionRow[] = [];
  const claims: ClaimRow[] = [];
  for (const a of pack.answers) {
    const r = a.ok ? analyse(a.text, pack.settings) : null;
    answers.push({
      ...a,
      prompt: pack.prompts[a.promptId] ?? unknownPrompt(a.promptId),
      hits: r?.hits ?? [],
    });
    for (const brand of brands) {
      const position = r?.positions.get(brand) ?? null;
      mentions.push({
        responseId: a.responseId,
        brand,
        mentioned: position !== null,
        position,
        tone: position !== null ? (r?.tones.get(brand) ?? "neutral") : null,
        evidence: position !== null ? (r?.evidence.get(brand) ?? "") : "",
      });
    }
    for (const c of r?.claims ?? [])
      claims.push({
        ...c,
        responseId: a.responseId,
        rawText: rawSpan(a, c.start, c.end) || c.sentence,
      });
  }
  return { pack, answers, mentions, claims };
}
