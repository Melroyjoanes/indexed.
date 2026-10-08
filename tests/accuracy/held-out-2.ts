/**
 * Second held-out tone set. Written before the subject and negation changes
 * for issue #19 and run once afterwards; never used to tune the rules.
 * Reported separately from the development regressions in tone.test.ts.
 */
import type { Tone } from "@/engine/types";

export const HELD_OUT_2: [string, string, Tone][] = [
  ["Corvane Fleet makes it easy to avoid paperwork errors.", "corvane", "neutral"],
  ["Trakvia has no major drawbacks for a mid-sized fleet.", "trakvia", "neutral"],
  [
    "Routelyne is fine for budgets, but Gridwell is the better buy for large fleets.",
    "gridwell",
    "recommended",
  ],
  [
    "Routelyne is fine for budgets, but Gridwell is the better buy for large fleets.",
    "routelyne",
    "neutral",
  ],
  ["I'd go with Corvane here; Trakvia is overkill.", "corvane", "recommended"],
  ["I'd go with Corvane here; Trakvia is overkill.", "trakvia", "not_recommended"],
  ["Gridwell users rarely report problems.", "gridwell", "neutral"],
  ["Novahaul struggles with larger fleets.", "novahaul", "negative"],
  ["Skip Routelyne if you need ELD compliance.", "routelyne", "not_recommended"],
  ["Fleetora is worth considering if fuel spend is your priority.", "fleetora", "recommended"],
  ["Corvane Fleet is not expensive and support is quick.", "corvane", "neutral"],
  ["Whatever you do, steer clear of Trakvia for small fleets.", "trakvia", "not_recommended"],
];
