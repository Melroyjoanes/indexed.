import type { Tone } from "../types";

/** How tones are named on screen. */
export const TONE_LABEL: Record<Tone, string> = {
  recommended: "Recommended",
  neutral: "Mentioned",
  negative: "Criticised",
  not_recommended: "Advised against",
};

export const toneWord = (t: Tone | null): string =>
  t ? TONE_LABEL[t].toLowerCase() : "not mentioned";

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const listOf = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
