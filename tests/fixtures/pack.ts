/**
 * Company list and fact sheet as described in the brief, so tests run without
 * the client's data pack (which is never committed).
 */
import trackerConfig from "../../config/tracker.json";
import { buildSettings, type BrandsFile, type TrackerConfig } from "@/engine/config";

export const BRANDS: BrandsFile = {
  client: { name: "Corvane Fleet", website: "corvanefleet.com" },
  tracked_competitors: [
    { name: "Trakvia", website: "trakvia.com" },
    { name: "Routelyne", website: "routelyne.com" },
    { name: "Gridwell Systems", website: "gridwell.io" },
  ],
  other_companies: [
    { name: "Fleetora", website: "fleetora.com" },
    { name: "Novahaul", website: "novahaul.com" },
  ],
};

const FEATURES = [
  "gps_tracking",
  "eld_compliance",
  "fuel_card_integration",
  "maintenance_alerts",
  "driver_app",
  "dashcams",
  "payroll",
] as const;
const has = (...on: string[]) => Object.fromEntries(FEATURES.map((f) => [f, on.includes(f)]));

export const FACTS = {
  corvane: {
    starting_price_usd: 29,
    hq: "Columbus, Ohio",
    founded: 2014,
    features: has(
      "gps_tracking",
      "eld_compliance",
      "fuel_card_integration",
      "maintenance_alerts",
      "driver_app",
    ),
    integrations: ["QuickBooks", "WEX", "Comdata"],
  },
  trakvia: {
    starting_price_usd: 39,
    hq: "Austin, Texas",
    founded: 2016,
    features: has("gps_tracking", "eld_compliance", "maintenance_alerts", "driver_app", "dashcams"),
    integrations: ["Salesforce"],
  },
  routelyne: {
    starting_price_usd: 19,
    hq: "Phoenix, Arizona",
    founded: 2019,
    features: has("gps_tracking", "driver_app"),
    integrations: [],
  },
  gridwell: {
    starting_price_usd: 55,
    hq: "Chicago, Illinois",
    founded: 2008,
    features: has(
      "gps_tracking",
      "eld_compliance",
      "fuel_card_integration",
      "maintenance_alerts",
      "driver_app",
      "dashcams",
    ),
    integrations: ["SAP", "Oracle"],
  },
};

export const CONFIG = trackerConfig as TrackerConfig;
export const settings = buildSettings(BRANDS, CONFIG, FACTS);
