export const score = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "n/a" : Math.round(n).toString();

/** One decimal, for scores shown next to a one-decimal change. */
export const score1 = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "n/a" : n.toFixed(1);

export const signed = (n: number | null | undefined, digits = 0) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  const v = n.toFixed(digits);
  return n > 0 ? `+${v}` : v.replace("-", "−");
};

export const percent = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "n/a" : `${Math.round(n * 100)}%`;
