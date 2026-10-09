# Accuracy report

Commit 81e2be7.
Data pack fingerprint (SHA-256 of the files in data/): cb3664ac722a17c8.

## Agreement with the committed labels (sample pack)

15 answers drawn with seed 15: r_e967478bef8a, r_3547cb3c0abc, r_07cc4ca2a168, r_a67f33638775, r_0e7279be82e1, r_45c06d07e851, r_78ca2f29e180, r_cfb0f711032e, r_62eed69dc265, r_8da19479bde4, r_8c9c23c0de29, r_d97d861eb8df, r_26bc1ebaaf74, r_3cdb8045dfc9, r_0ae70f2aa206.
Labels: drafted by Claude Code (the AI assistant used to build this project) from the raw answer text, before the tool's output for these answers was compared. Not yet reviewed by a person.

- Named or not: 90 / 90 answer and company pairs
- Position: 39 / 39
- Tone: 39 / 39

## Held-out set 3 (first run: tone 8 / 12, facts 3 / 4; seen since, so no longer fresh)

Tone: 10 / 12 right
  misses: 2 fell back to mentioned, 0 gave a verdict to a neutral sentence, 0 right direction but wrong strength, 0 flipped
  - "Corvane Fleet earns my top recommendation for value." corvane: expected recommended, got neutral
  - "Stay away from Routelyne if uptime matters to you." routelyne: expected not_recommended, got neutral
Wrong facts: 4 / 4 contradictions found
  0 missed, 0 false contradictions, 4 / 4 negative controls clean

## Development regressions (seen while building; not an accuracy estimate)

Mentions: 6 / 6
Wrong facts: 6 / 6 contradictions found
  0 missed, 0 false contradictions, 6 / 6 negative controls clean
Tone, set 1 (first reported at 5 / 12): 6 / 12 right
  misses: 5 fell back to mentioned, 0 gave a verdict to a neutral sentence, 1 right direction but wrong strength, 0 flipped
  - "If you want my advice, Corvane Fleet is where I'd begin." corvane: expected recommended, got neutral
  - "Trakvia is the clear front-runner for camera-based safety." trakvia: expected recommended, got neutral
  - "Small carriers tend to love Corvane for its simplicity." corvane: expected recommended, got neutral
  - "Routelyne is a sensible budget option." routelyne: expected recommended, got neutral
  - "Some drivers dislike Trakvia's in-cab cameras." trakvia: expected negative, got neutral
  - "Gridwell is overpriced for what small fleets need, so it's hard to justify." gridwell: expected not_recommended, got negative
Tone, set 2 (first reported at 4 / 12): 10 / 12 right
  misses: 2 fell back to mentioned, 0 gave a verdict to a neutral sentence, 0 right direction but wrong strength, 0 flipped
  - "Routelyne is fine for budgets, but Gridwell is the better buy for large fleets." gridwell: expected recommended, got neutral
  - "Skip Routelyne if you need ELD compliance." routelyne: expected not_recommended, got neutral
