import type { Settings } from "@/engine/types";

const PALETTE = [
  "var(--brand-1)",
  "var(--brand-2)",
  "var(--brand-3)",
  "var(--brand-4)",
  "var(--brand-5)",
  "var(--brand-6)",
];

/** One colour per company, stable for a given client: the client always gets the accent. */
export function brandColors(settings: Settings): Record<string, string> {
  const order = [
    settings.client,
    ...Object.keys(settings.brands).filter((k) => k !== settings.client),
  ];
  return Object.fromEntries(order.map((k, i) => [k, PALETTE[i % PALETTE.length]!]));
}

export const shortOf = (settings: Settings, key: string) =>
  settings.brands[key]?.name.split(/\s+/)[0] ?? key;
