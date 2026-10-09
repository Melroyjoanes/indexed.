/**
 * Splitting an answer into sentences and table rows, and working out which
 * company each one is about. "It", "The company", "Pricing starts..." and
 * similar sentences point back to the last company named.
 */
import { MASK_CHAR, type Hit } from "./mentions";

export const LOOKALIKE = "__lookalike__";

export interface Segment {
  text: string;
  start: number;
  brands: string[]; // companies named in this segment, in order
  subject: string | null; // who it's about
  isTableRow: boolean;
  verdictCell: string; // last cell of a table row
}

// Split after . ! ? and a space. Lowercase starts count too
// ("... since 2014. gridwell.io offers ..."), but not after e.g./i.e./vs./approx./U.S./Inc.
const SENTENCE_BREAK =
  /(?<!\be\.g\.)(?<!\bi\.e\.)(?<!\bvs\.)(?<!\bapprox\.)(?<!\bU\.S\.)(?<!\bInc\.)(?<=[.!?])\s+(?=\S)/;
const POINTS_BACK = new RegExp(
  // an opening clause may come first: "For a mixed fleet, it's hard to beat"
  "^(?:\\W*)(?:(?:if|for|but|and|so|because|when|given|at|with|even|overall|honestly|for most)\\b[^.,;]{0,80},\\s*)?" +
    "(?:it|its|it's|they|their|the company|the platform|the tool|this tool|" +
    "note that it|even so|that said|however|still|plans|pricing|prices|expect to pay|" +
    "[a-z ]{0,25}\\bis included\\b)\\b",
  "i",
);
/** "complain about its contract terms": a possessive that can only mean the last company. */
const POSSESSIVE = /\bits\b/i;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}/;

/** A leading "- **Label:**" or "1. **Name**:" in front of a list item. */
export const LABEL = /^\s*(?:[-*•]|\d+[.)])?\s*\*\*[^*]{1,60}\*\*\s*:?\s*/;
export const stripLabel = (s: string) => s.replace(LABEL, "");

const trimPipes = (s: string) => s.replace(/^\|+/, "").replace(/\|+$/, "");

export function segment(text: string, masked: string, hits: Hit[]): Segment[] {
  const segs: Segment[] = [];
  let pos = 0;
  for (const line of masked.split("\n")) {
    const lineStart = pos;
    pos += line.length + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("|")) {
      if (TABLE_DIVIDER.test(trimmed)) continue;
      const cells = trimPipes(trimmed)
        .split("|")
        .map((c) => c.trim());
      segs.push({
        text: text.slice(lineStart, lineStart + line.length),
        start: lineStart,
        brands: [],
        subject: null,
        isTableRow: true,
        verdictCell: cells.length > 1 ? (cells[cells.length - 1] ?? "") : "",
      });
      continue;
    }
    let offset = 0;
    for (const part of line.split(SENTENCE_BREAK)) {
      const idx = line.indexOf(part, offset);
      offset = idx + part.length;
      const s = lineStart + idx;
      segs.push({
        text: text.slice(s, s + part.length),
        start: s,
        brands: [],
        subject: null,
        isTableRow: false,
        verdictCell: "",
      });
    }
  }

  let last: string | null = null;
  for (const seg of segs) {
    const end = seg.start + seg.text.length;
    seg.brands = [
      ...new Set(hits.filter((h) => seg.start <= h.start && h.start < end).map((h) => h.brand)),
    ];
    if (seg.brands.length) {
      // the topic is the company named in the sentence body, not in a "**Name**:" label before it
      const label = LABEL.exec(seg.text);
      const bodyFrom = seg.start + (label ? label[0].length : 0);
      const body = hits.filter((h) => bodyFrom <= h.start && h.start < end).map((h) => h.brand);
      seg.subject = (body.length ? body : seg.brands)[0] ?? null;
      last = seg.brands[seg.brands.length - 1] ?? null;
    } else if (masked.slice(seg.start, end).includes(MASK_CHAR)) {
      seg.subject = LOOKALIKE;
      last = LOOKALIKE;
    } else if (
      last &&
      last !== LOOKALIKE &&
      (POINTS_BACK.test(stripLabel(seg.text)) || POSSESSIVE.test(seg.text))
    ) {
      seg.subject = last;
    }
  }
  return segs;
}
