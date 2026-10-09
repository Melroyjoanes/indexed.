/**
 * Third held-out set, written before it was ever run against the rules and
 * reported as measured. It is an evaluation sample, not a regression suite:
 * nothing here is asserted per sentence, and the rules must not be tuned to
 * it. Once a change is made after reading these results, the set counts as
 * seen and the next measurement needs a new one.
 *
 * Status: seen. Its first run was tone 8/12 and facts 3/4. Rule changes made
 * after the local model trial were informed by its misses, so it now serves
 * only as a regression sample (see docs/evaluation/local-model-trial.md).
 *
 * Facts list the exact contradictions expected; an empty list is a negative
 * control (a true statement, or a claim the fact sheet doesn't cover).
 */
import type { Tone } from "@/engine/types";

export const HELD_OUT_3_TONE: [string, string, Tone][] = [
  ["Corvane Fleet would be my first call for a small trucking firm.", "corvane", "recommended"],
  [
    "Trakvia stands out as the strongest option for dashcam-heavy fleets.",
    "trakvia",
    "recommended",
  ],
  ["Corvane Fleet earns my top recommendation for value.", "corvane", "recommended"],
  ["Gridwell is listed among enterprise telematics vendors.", "gridwell", "neutral"],
  ["Fleetora offers GPS tracking and fuel reports.", "fleetora", "neutral"],
  ["Novahaul is a newer entrant in the market.", "novahaul", "neutral"],
  ["Routelyne's mobile app crashes often, according to users.", "routelyne", "negative"],
  ["Users complain that Corvane's onboarding drags on for weeks.", "corvane", "negative"],
  ["Gridwell's pricing frustrates many smaller customers.", "gridwell", "negative"],
  ["I wouldn't recommend Trakvia to a fleet under ten trucks.", "trakvia", "not_recommended"],
  ["Stay away from Routelyne if uptime matters to you.", "routelyne", "not_recommended"],
  [
    "Look elsewhere than Gridwell if you run fewer than 20 vehicles.",
    "gridwell",
    "not_recommended",
  ],
];

export const HELD_OUT_3_FACTS: [string, string[]][] = [
  ["Corvane Fleet is based out of Cleveland, Ohio.", ["corvane:hq"]],
  ["Corvane Fleet pricing begins at $25 per vehicle per month.", ["corvane:starting_price_usd"]],
  ["Routelyne includes ELD compliance tools.", ["routelyne:features.eld_compliance"]],
  ["Gridwell was established in 2012.", ["gridwell:founded"]],
  ["Trakvia's HQ is in Austin, Texas.", []],
  ["Gridwell integrates with SAP.", []],
  ["Corvane Fleet has won several industry awards.", []],
  ["Routelyne costs about $19 per vehicle each month.", []],
];
