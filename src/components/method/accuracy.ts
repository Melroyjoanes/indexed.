/**
 * Measured accuracy, as printed by `npm run accuracy` (scripts/accuracy.ts,
 * backed by tests/accuracy/) and saved in tests/accuracy/REPORT.md. If
 * detection changes, rerun it and update these numbers in the same commit.
 */
export const ACCURACY = {
  /** Agreement with committed labels on 15 answers drawn from the sample pack. */
  labelled: {
    answers: 15, // drawn at random from the sample data (fixed seed)
    companyChecks: { right: 90, of: 90 }, // answer x company: named or not
    positions: { right: 39, of: 39 },
    tones: { right: 39, of: 39 },
    reviewedByPerson: false, // labels drafted by the AI assistant; see hand-labels.json
  },
  /** Held-out set 3 on its first run, before any rule saw it. It has been seen since. */
  fresh: {
    tones: { right: 8, of: 12 },
    tonesMissedAsMentioned: 4, // of the misses, how many fell back to "Mentioned"
    tonesFlipped: 0,
    wrongFacts: { found: 3, of: 4 },
    falseContradictions: 0,
    controls: { clean: 4, of: 4 }, // true or uncovered statements left alone
  },
} as const;
