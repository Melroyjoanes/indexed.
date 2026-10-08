/**
 * Sentences written in wording that doesn't appear in the sample pack.
 *
 * The sample answers follow recognisable patterns, so a perfect score on them
 * says little about new data. These estimate how the rules cope with new
 * phrasing. FRESH_TONE was written after the rules were final and is
 * reported as-is; it is never used to tune them.
 */
import type { Tone } from "@/engine/types";

export const MENTIONS: [string, string, boolean][] = [
  ["Corvane-Fleet offers GPS tracking.", "corvane", true],
  ["Check out www.corvanefleet.com for pricing.", "corvane", true],
  ["Trackvia is popular with safety managers.", "trakvia", true],
  ["Gridwel Systems suits enterprises.", "gridwell", true],
  ["Corvane Logistics moves freight across Ohio.", "corvane", false],
  ["Our fleet uses route planning daily.", "routelyne", false],
];

export const FACTS: [string, string][] = [
  ["Corvane Fleet is solid. Its headquarters are in Dayton, Ohio.", "corvane:hq"],
  ["Corvane Fleet charges $35 per truck per month to start.", "corvane:starting_price_usd"],
  ["Corvane Fleet has been in business since 2011.", "corvane:founded"],
  ["Corvane Fleet lacks fuel card support.", "corvane:features.fuel_card_integration"],
  ["Corvane Fleet now comes with payroll built in.", "corvane:features.payroll"],
  ["Trakvia connects to QuickBooks out of the box.", "trakvia:integrations"],
];

export const FRESH_TONE: [string, string, Tone][] = [
  ["If you want my advice, Corvane Fleet is where I'd begin.", "corvane", "recommended"],
  ["Trakvia is the clear front-runner for camera-based safety.", "trakvia", "recommended"],
  ["Small carriers tend to love Corvane for its simplicity.", "corvane", "recommended"],
  ["Routelyne is a sensible budget option.", "routelyne", "recommended"],
  ["Gridwell Systems is one of several enterprise vendors.", "gridwell", "neutral"],
  ["Corvane, Trakvia and Routelyne all offer GPS tracking.", "corvane", "neutral"],
  ["Routelyne's support team is notoriously slow to respond.", "routelyne", "negative"],
  ["Corvane has drawn criticism for its long contracts.", "corvane", "negative"],
  ["Some drivers dislike Trakvia's in-cab cameras.", "trakvia", "negative"],
  [
    "Gridwell is overpriced for what small fleets need, so it's hard to justify.",
    "gridwell",
    "not_recommended",
  ],
  ["For a 15-truck fleet I'd pass on Gridwell.", "gridwell", "not_recommended"],
  ["Routelyne isn't something I'd suggest for regulated carriers.", "routelyne", "not_recommended"],
];
