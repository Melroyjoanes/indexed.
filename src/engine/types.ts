export type Tone = "recommended" | "neutral" | "negative" | "not_recommended";
export type Role = "client" | "tracked" | "other";

export interface Brand {
  key: string;
  name: string;
  website: string;
  role: Role;
  aliases: string[];
  lookalikes: string[];
}

export interface EngineConfig {
  label: string;
  aliases: string[];
}

export interface BrandFacts {
  name?: string;
  website?: string;
  starting_price_usd?: number;
  price_unit?: string;
  hq?: string;
  founded?: number;
  features?: Record<string, boolean>;
  integrations?: string[];
}

export interface Settings {
  client: string;
  brands: Record<string, Brand>;
  engines: Record<string, EngineConfig>;
  runsPerWeek: number;
  points: Record<Tone, number>;
  positionWeight: number[];
  clearChangeMultiplier: number;
  facts: Record<string, BrandFacts>;
}
