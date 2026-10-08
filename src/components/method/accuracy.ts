/**
 * Measured accuracy, as printed by `npm run accuracy` (scripts/accuracy.ts,
 * backed by tests/accuracy/). If detection changes, rerun it and update these
 * numbers in the same commit.
 */
export const ACCURACY = {
  handCheck: {
    answers: 15, // drawn at random from the sample data (fixed seed)
    companyChecks: { right: 90, of: 90 }, // answer x company: named or not
    positions: { right: 39, of: 39 },
    tones: { right: 39, of: 39 },
  },
  unseenWording: {
    mentions: { right: 6, of: 6 },
    wrongFacts: { right: 6, of: 6 },
    tones: { right: 6, of: 12 },
    tonesMissedAsMentioned: 5, // of the 6 misses, how many fell back to "Mentioned"
  },
  syntheticWeek: {
    answers: 12, // tests/fixtures/synthetic-week, labels written independently
    mentionRows: { right: 72, of: 72 },
    wrongFacts: { right: 2, of: 2 },
  },
} as const;
