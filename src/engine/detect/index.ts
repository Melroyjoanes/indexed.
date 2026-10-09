import type { Settings, Tone } from "../types";
import { extractClaims, type Claim } from "./facts";
import { findMentions, positions, type Hit } from "./mentions";
import { segment, type Segment } from "./sentences";
import { tonesFor } from "./tone";

export type { Claim } from "./facts";
export type { Hit } from "./mentions";
export { classify } from "./tone";

export interface Analysis {
  hits: Hit[];
  positions: Map<string, number>; // company -> 1, 2, 3 ... in order of first mention
  tones: Map<string, Tone>;
  evidence: Map<string, string>;
  claims: Claim[];
  segments: Segment[];
}

/** Everything the tool reads from one AI answer. */
/**
 * A "Sources:" list written into the answer text names sites, not
 * recommendations. Only the list is blanked: the heading line and the list
 * items or bare links under it, up to the first line of ordinary text. Blanks
 * keep the same length, so every position still points at the original text.
 */
const SOURCES_HEADING = /^[ \t]*(?:\*\*)?(?:sources|references|citations)(?:\*\*)?:/i;
const LIST_ITEM =
  /^[ \t]*(?:[-*•]|\d+[.)]|\[\d+\])\s|^[ \t]*(?:https?:\/\/|www\.)?[\w-]+(?:\.[\w-]+)+\S*[ \t]*$/i;
export function withoutSourcesList(text: string): string {
  const lines = text.split("\n");
  let inList = false;
  return lines
    .map((line) => {
      if (SOURCES_HEADING.test(line)) inList = true;
      else if (inList && line.trim() !== "" && !LIST_ITEM.test(line)) inList = false;
      return inList ? line.replace(/[^\n]/g, " ") : line;
    })
    .join("\n");
}

export function analyse(text: string, settings: Settings): Analysis {
  const { hits, masked } = findMentions(withoutSourcesList(text), settings);
  const pos = positions(hits);
  const segments = segment(text, masked, hits);
  const { tones, evidence } = tonesFor(segments, [...pos.keys()], hits);
  return {
    hits,
    positions: pos,
    tones,
    evidence,
    claims: extractClaims(segments, settings),
    segments,
  };
}
