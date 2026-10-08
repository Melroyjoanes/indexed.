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
    if (!k.startsWith("_") && v && typeof v === "object") facts[k] = v as BrandFacts;
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
