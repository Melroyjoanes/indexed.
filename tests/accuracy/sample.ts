/**
 * Picks the answers for the hand check: a seeded shuffle of every usable
 * answer (sorted by id first, so the draw doesn't depend on file order),
 * then the first n. Same seed, same answers, on any machine.
 */
import type { Answer } from "@/engine/ingest";

export const SEED = 15;
export const SIZE = 15;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawSample(answers: Answer[], n = SIZE, seed = SEED): Answer[] {
  const pool = answers.filter((a) => a.ok).sort((x, y) => x.responseId.localeCompare(y.responseId));
  const rand = mulberry32(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, n);
}
