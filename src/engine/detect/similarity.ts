/**
 * Similarity of two short strings, 0..1. Same algorithm as Python's
 * difflib.SequenceMatcher.ratio() (Ratcliff/Obershelp): repeatedly take the
 * longest common block, recurse on both sides, ratio = 2 * matches / total.
 */
export function similarity(a: string, b: string): number {
  const total = a.length + b.length;
  return total === 0 ? 1 : (2 * matched(a, 0, a.length, b, 0, b.length)) / total;
}

function matched(a: string, alo: number, ahi: number, b: string, blo: number, bhi: number): number {
  if (alo >= ahi || blo >= bhi) return 0;
  // longest common block; ties go to the earliest in a, then in b (as difflib)
  let bestI = alo;
  let bestJ = blo;
  let bestK = 0;
  let prev = new Array<number>(bhi - blo + 1).fill(0);
  for (let i = alo; i < ahi; i++) {
    const cur = new Array<number>(bhi - blo + 1).fill(0);
    for (let j = blo; j < bhi; j++) {
      if (a[i] === b[j]) {
        const k = prev[j - blo]! + 1;
        cur[j - blo + 1] = k;
        if (k > bestK) {
          bestK = k;
          bestI = i - k + 1;
          bestJ = j - k + 1;
        }
      }
    }
    prev = cur;
  }
  if (bestK === 0) return 0;
  return (
    bestK +
    matched(a, alo, bestI, b, blo, bestJ) +
    matched(a, bestI + bestK, ahi, b, bestJ + bestK, bhi)
  );
}
