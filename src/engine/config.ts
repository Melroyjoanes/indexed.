import type { Brand, BrandFacts, EngineConfig, Role, Settings, Tone } from "./types";

/** brands.json as shipped in the data pack. */
export interface BrandsFile {
  client: { name: string; website: string };
  tracked_competitors?: { name: string; website: string }[];
  other_companies?: { name: string; website: string }[];
}

/** config/tracker.json */
export interface TrackerConfig {
  client?: string;
  brands?: Record<string, { aliases?: string[]; lookalikes?: string[] }>;
  engines: Record<string, EngineConfig>;
  runsPerWeek: number;
  score: {
    points: Record<Tone, number>;
    positionWeight: number[];
    clearChangeMultiplier: number;
  };
}

/** "Gridwell Systems" -> "gridwell". Matches the keys used in facts.json. */
export function brandKey(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The checkable part of one company's facts.json entry, or null when nothing
 * in it can be checked. Fields of the wrong type are dropped rather than
 * trusted: a founding year written as "2014" or a feature list that isn't
 * true/false would otherwise produce wrong contradictions.
 */
export function usableFacts(v: unknown): BrandFacts | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const out: BrandFacts = {};
  if (typeof o.name === "string") out.name = o.name;
  if (typeof o.website === "string") out.website = o.website;
  if (typeof o.price_unit === "string") out.price_unit = o.price_unit;
  if (typeof o.starting_price_usd === "number" && Number.isFinite(o.starting_price_usd))
    out.starting_price_usd = o.starting_price_usd;
  if (typeof o.hq === "string" && o.hq.trim()) out.hq = o.hq;
  if (typeof o.founded === "number" && Number.isInteger(o.founded)) out.founded = o.founded;
  if (o.features && typeof o.features === "object" && !Array.isArray(o.features)) {
    const f = Object.entries(o.features).filter(([, x]) => typeof x === "boolean");
    if (f.length) out.features = Object.fromEntries(f) as Record<string, boolean>;
  }
  if (Array.isArray(o.integrations) && o.integrations.every((x) => typeof x === "string"))
    out.integrations = o.integrations;
  const checkable =
    out.starting_price_usd !== undefined ||
    out.hq !== undefined ||
    out.founded !== undefined ||
    out.features !== undefined ||
    out.integrations !== undefined;
  return checkable ? out : null;
}

export function buildSettings(
  brandsFile: BrandsFile,
  config: TrackerConfig,
  factsFile: Record<string, unknown> = {},
): Settings {
  const entries: [{ name: string; website: string }, Role][] = [
    [brandsFile.client, "client"],
    ...(brandsFile.tracked_competitors ?? []).map((b) => [b, "tracked"] as [typeof b, Role]),
    ...(brandsFile.other_companies ?? []).map((b) => [b, "other"] as [typeof b, Role]),
  ];

  const brands: Record<string, Brand> = {};
  for (const [b, role] of entries) {
    const key = brandKey(b.name);
    const extra = config.brands?.[key] ?? {};
    brands[key] = {
      key,
      name: b.name,
      website: b.website ?? "",
      role,
      aliases: extra.aliases ?? [],
      lookalikes: extra.lookalikes ?? [],
    };
  }

  const facts: Record<string, BrandFacts> = {};
  for (const [k, v] of Object.entries(factsFile)) {
    const f = k.startsWith("_") ? null : usableFacts(v);
    if (f && brands[k]) facts[k] = f;
  }

  const settings: Settings = {
    client: brandKey(brandsFile.client.name),
    brands,
    engines: config.engines,
    runsPerWeek: config.runsPerWeek,
    points: config.score.points,
    positionWeight: config.score.positionWeight,
    clearChangeMultiplier: config.score.clearChangeMultiplier,
    facts,
  };
  return config.client && brands[config.client] ? viewAs(settings, config.client) : settings;
}

/** The same settings seen from another company's side. */
export function viewAs(settings: Settings, key: string): Settings {
  if (!settings.brands[key]) throw new Error(`Unknown company: ${key}`);
  const brands: Record<string, Brand> = {};
  for (const [k, b] of Object.entries(settings.brands)) {
    const focus = b.role === "client" || b.role === "tracked";
    brands[k] = { ...b, role: k === key ? "client" : focus ? "tracked" : "other" };
  }
  return { ...settings, client: key, brands };
}

/** Companies shown side by side: the client first, then tracked competitors. */
export function focusBrands(settings: Settings): string[] {
  const keys = Object.values(settings.brands)
    .filter((b) => b.role === "tracked")
    .map((b) => b.key);
  return [settings.client, ...keys];
}

export function shortName(settings: Settings, key: string): string {
  return settings.brands[key]?.name.split(/\s+/)[0] ?? key;
}

export function engineLabel(settings: Settings, key: string): string {
  return settings.engines[key]?.label ?? key.replace(/_/g, " ");
}

/** Engines in the order they're listed in config, then any others alphabetically. */
export function orderEngines(engines: Iterable<string>, settings: Settings): string[] {
  const known = Object.keys(settings.engines);
  const rank = (e: string) => (known.includes(e) ? known.indexOf(e) : known.length);
  return [...new Set(engines)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
