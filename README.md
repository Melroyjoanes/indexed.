# indexed.

A weekly view of how ChatGPT, Perplexity and Google AI Overviews talk about Corvane Fleet and its competitors: who gets recommended, what the AI gets wrong, whether anything has really changed, and what to do about it.

**Live:** https://indexed-corvane.vercel.app

Everything runs on a normal laptop. No paid APIs, no API keys, and the same input always gives the same output.

---

## Run it

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

The data pack isn't in this repository. Unzip it into a `data/` folder at the project root:

```
data/
  responses.jsonl    # the AI answers (any number of .jsonl files are read)
  prompts.csv        # the buyer questions
  brands.json        # client, tracked competitors, other companies
  facts.json         # what's actually true about each company
```

Other commands:

```bash
npm run export       # writes out/mentions.csv and out/wrong_facts.csv
npm run accuracy     # prints the accuracy check below
npm run check        # lint, type check and the 301 tests
```

**A new week** is just another file. Drop `week7.jsonl` into `data/` and it's picked up on the next page load, or upload it on the Data page to try it in your browser first. Field names, engine names and date formats that differ between exports are handled, so small format changes don't need code changes.

---

## What's in it

| Screen                      | For           | What it answers                                                                                                                                                       |
| --------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **This week**               | Marcus        | Are we winning or losing, against whom, why, and what to do. One headline, four scores, the biggest changes, who gained, wrong facts, suggested next steps.           |
| **Questions**               | Priya         | How each AI tool answered each of the 15 buyer questions, with filters for company, stage, AI tool and tone. Every cell opens the actual answers.                     |
| **Competitors**             | Marcus, sales | Score trends, who AI recommends for each question, who took Corvane's place when it dropped out, wrong facts about competitors, and which websites the AI tools cite. |
| **Reports**                 | Priya         | A board report for any week as PDF and Excel, and separately the two scoring files used for the accuracy check.                                                       |
| **How it works** / **Data** | Anyone        | The method in plain English with a worked example from the live data; data health; uploading a new week.                                                              |

The week is picked once, in the header, and every screen follows it. Nothing after the selected week is ever used. The company switch next to it shows the whole market from Trakvia's, Routelyne's or Gridwell's side.

---

## How it works

**Reading the files** (`src/engine/ingest.ts`). The exports aren't consistent. Week 4 used different field names, engine names and a day/month date format. There are 8 duplicate answers and 3 failed requests, and week 5 has no Perplexity answers at all. All of it is mapped to one shape first, and every problem is counted and shown on the Data page.

**Finding companies** (`src/engine/detect/`). It hides look-alike names first ("Corvane Logistics" is a different company), then matches names, spelling variants and websites, and catches unlisted misspellings like "Corvaine". Citations alone don't count as a mention.

**Tone.** Each sentence is tied to the company it's about, and "It…" or "The company…" points back to the last company named. In a mixed sentence the part after "but" decides, and a company's last verdict in the answer wins, as the brief defines it.

**Wrong facts.** Claims about price, HQ, founding year, features and integrations are checked against `facts.json`. Anything the fact sheet doesn't cover is left alone.

**The score** (`src/engine/score.ts`). From 0 to 100: recommended 100, mentioned 50, criticised 20, advised against or missing 0, a little less when not named first. It's averaged across every question and AI tool, and the questions closest to a purchase count three times as much. I chose this over a mention count because a mention can hurt: "Routelyne is cheap but support is slow" is still a mention.

**Real change or noise.** Each question was asked twice per AI tool per week, and the two answers often differ. That difference is the yardstick: a change only counts as clear when it's more than twice the usual gap between two runs. Weeks are compared only on the questions and AI tools both have, so week 5's missing Perplexity answers don't look like a drop. Week to week, nothing in this data is a clear change. Since week 3, though, Corvane is down 12 points (47 to 35), which is.

Companies, spellings, look-alikes, AI tool names and score weights all live in `config/tracker.json`. Adding a competitor is a config change. The field names the loader accepts are structural and live in code (`FIELDS` in `src/engine/ingest.ts`).

---

## What I prioritised, and why

The brief says the scoring files are checked against an answer key, on data we haven't seen. So the order was:

1. **Reading the data correctly**, then **detection**, before any screen. Detection was compared row by row with an earlier, separately written implementation: all 3,060 mention rows and all 95 wrong facts agree. Agreement between two implementations catches bugs in either one, but it doesn't prove both are right.
2. **Proof before interface.** The export, the accuracy checks and a regression lock (a fingerprint of both scoring files that fails the tests if any row changes) went in before any UI work, so no screen can quietly change a number.
3. **The score and Marcus's weekly view**, because that's the core of what he asked for.
4. **The stretch items, built in parallel** once the engine was stable: Priya's question view, head-to-head, competitor facts, sources, the board report, the method page and uploads.
5. **Deployment and docs last**, so every number here is final.

The commit history follows this order. Each change went in as a pull request that had to pass CI before merging.

**What I chose not to do**

- **No AI model for tone, after testing one.** I tried two small models that run locally for free (DeBERTa and MobileBERT, via transformers.js) as a second opinion for sentences the rules can't judge. They read plain mentions as recommendations ("Trakvia is another option" came back as recommended with 74% confidence), and those are exactly the sentences they'd be asked about, so accuracy would have gone down. A larger local model through Ollama would likely do better, but needs a separate install and gives answers that vary between runs, which makes accuracy hard to report honestly. It stays the next step, tested against the same checks before it's switched on.
- **No logins or database.** Not needed to use it, and they get in the way of "open it and use it".
- **No collection from the AI tools.** The brief provides the answers.

---

## Assumptions

- Week 4 dates like `07/09/2026` are day/month/year; the other weeks put week 4 in early September.
- A duplicate `response_id` keeps its first copy.
- Answer text must be a string. An object, list, number or true/false is counted as a malformed, failed answer and left out of scores, rather than read as text that names nobody.
- An answer with no AI tool or question id still gets its rows in `mentions.csv` but isn't placed in any week.
- `facts.json` is optional, but if it's there it must hold at least one checkable fact (price, HQ, founding year, features or integrations) for a company in `brands.json`, or the pack is refused. Fields of the wrong type are ignored. For a company with no checkable facts, every screen and report says fact-checking is unavailable instead of "no wrong facts".
- Failed requests still get six rows in `mentions.csv` (not mentioned) but aren't counted in any score.
- A price is a claim only when it's a starting price for a named company. "Usually costs between $15 and $60" isn't about anyone.
- "Headquartered in Chicago" with no state is checked against the city.
- A phrase describing the buyer ("carriers that need ELD compliance") isn't a claim about the product.
- If a sentence names two companies, no fact claim is taken from it.
- A company named without a verdict is "mentioned" (neutral).
- In a table, the last column is the verdict ("Top pick" is recommended, "Skip at your size" is advised against).
- `claim_text` is the whole sentence copied exactly from the raw answer, including any `[1]` footnotes or `&amp;` entities, without the list marker or bold label in front of it. Detection reads a cleaned copy; the export maps the match back to the original text.
- No site in this data is cited only next to competitors, so Sources also flags sites where a competitor is named more often than Corvane.

---

## Accuracy

There are three different kinds of evidence here, and they say different things.

**1. Agreement with labelled answers (sample pack).** 15 answers are drawn with a seeded shuffle (seed 15, `tests/accuracy/sample.ts`), so anyone gets the same 15. Their labels are in `tests/accuracy/hand-labels.json`; the answer text isn't committed, because it's client data. The labels were drafted by Claude Code from the answer text, before the tool's output for those answers was compared, and **haven't yet been reviewed by a person**. The file records who labelled them and who reviewed them.

|                                     | Agreement |
| ----------------------------------- | --------- |
| Mentions (15 answers × 6 companies) | 90 / 90   |
| Positions                           | 39 / 39   |
| Tone                                | 39 / 39   |

The rules were written after reading the sample pack, so this is the best case, not an estimate for new data.

**2. A fresh evaluation.** `tests/accuracy/held-out-3.ts` was written before it was ever run against the rules and hasn't been used to tune them.

|                                                    | Result |
| -------------------------------------------------- | ------ |
| Tone                                               | 8 / 12 |
| … misses that fell back to "mentioned"             | 4 of 4 |
| … praise read as criticism, or the reverse         | 0      |
| Wrong facts found in contradicting sentences       | 3 / 4  |
| False contradictions                               | 0      |
| True or uncovered statements left alone (controls) | 4 / 4  |

These are small samples, so they show the kind of mistakes to expect rather than a precise rate. On this set, missing a verdict was the only tone error, and the one missed fact was a price phrased as "pricing begins at". Earlier held-out sets measured 5 / 12 and 4 / 12 on first run; both have been seen since, so they now only serve as regressions (below).

**3. Regression checks.** These say the output hasn't changed, not that it's right:

- A fingerprint (SHA-256) of both scoring files from the sample pack fails the tests if a single row changes (`tests/golden.test.ts`).
- Development sentences in new wording (`tests/accuracy/unseen-wording.ts`) are asserted exactly, including true statements and uncovered claims that must not be flagged, and 24 seen tone sentences are checked for flipped verdicts.
- End-to-end tests check that every exported `claim_text` is an exact substring of its raw answer, footnotes and HTML entities included.

**What runs where.** Public CI has no data pack, so the label-agreement and fingerprint tests are skipped there and CI covers everything else. With the pack in `data/`, `npm test` runs them too, and `npm run accuracy -- --write` saves `tests/accuracy/REPORT.md`, which records the commit and a fingerprint of the pack so each result can be tied to the code and data it came from.

---

## How I used AI tools

I built this with Claude Code. I set the product requirements, made the decisions on scope, stack, scoring and what to leave out, and steered the work through prompts. Claude wrote the code, the tests and first drafts of the docs. The stretch screens were built by four Claude sub-agents in parallel, each in its own copy of the repo and branch, then reviewed and merged one by one.

Things that went wrong and were caught:

- **A setup tool pulled in a package called `cn`.** It was checked before trusting it (it's published by the shadcn team). The same tool installed its own command-line package as an app dependency, which carried a high-severity audit warning, so it was moved to dev-only.
- **A loose regular expression** in a feature-claim rule turned up in a line-by-line review. It was tightened, and the row-by-row comparison showed no result changed.
- **Next.js 16 rejected the first layout** because of its new caching model. It was rebuilt the documented way, with data read inside a Suspense boundary.
- **A pull request was merged before CI had registered its check.** CI was green, but from then on a helper waited for checks to exist and pass before merging.
- **All four parallel agents hit a usage limit mid-task** and were resumed where they stopped.
- **Reviewing the screens together found real bugs.** With no data loaded there was no way to upload any. AI tools were listed in a different order on two screens. Phones had no company switch. All fixed in #12.
- **The first tone accuracy on new wording looked better than it was**, because the rules had been tuned on those same sentences. A fresh, untuned set gave 5 / 12 at the time. Each later fix was measured on a new set written before the fix was run, since a set stops being fresh once it has been looked at.
- **A test week uploaded through the app exposed missed direct advice** ("choose X") and a negation bug: "isn't" was never recognised, because there's no word boundary inside a contraction. Both fixed, with unit tests.

---

## Running this every day for 20 clients (proposed)

This is a design, not something built here. The repository analyses answers it's given; it doesn't collect them.

**What gets collected, and how.** The brief measures what buyers see in three consumer products, and a model API is not the same thing as the product. So each AI tool needs its own route, chosen to stay as close as possible to what a buyer sees:

| AI tool             | What buyers see                               | Collection route                                                                                                                                                                          |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ChatGPT             | The ChatGPT app answering with web search     | The OpenAI API with web search turned on. Closest available match, not identical to the app; checked weekly against a few answers taken by hand.                                          |
| Perplexity          | Perplexity's answer with citations            | Perplexity's own API, which returns answers and citations from its search.                                                                                                                |
| Google AI Overviews | The AI Overview above Google's search results | No official API. A search-results provider that returns the AI Overview block, or a headless browser. Not every search shows an Overview, so "none shown" is recorded as its own outcome. |

Each answer is stored with the route it came from, so a change of route shows up as a change in the data rather than in the market.

**Workload.** 15 questions × 3 AI tools × 2 runs = 90 requests per client per day, 1,800 a day for 20 clients, about 54,000 a month.

**Cost**, as a formula to fill in with real quotes:

```
monthly ≈ 54,000 × (1 + retry rate) × cost per collected answer
        + storage + database + scheduled jobs + monitoring
```

- **Cost per collected answer** depends on the route and is the number to get quoted first. Each $0.01 per answer adds about $540 a month at this volume, so $0.01 to $0.03 is $540 to $1,620, before retries.
- **Retries:** plan for 10% (failed requests showed up in the sample pack), so multiply by 1.1.
- **Storage** is small. Raw answers in the sample pack average about 680 bytes, so 1,800 a day is about 1.2 MB a day, or 450 MB a year. Results are 540 rows per client per day, roughly 4 million rows a year for 20 clients.
- **Compute** is small too. Analysing and scoring all 510 sample answers takes about 0.1 seconds on a laptop, so analysis isn't a meaningful cost. The bigger compute cost is the headless browser, if that's the route for Google.
- **Monitoring and alerts** fit the free or entry tiers of most hosted tools at this size.

**How it would run.**

- **Tenant isolation.** Each client has its own folder of raw files and its own rows, keyed by client id, with database row-level security, so one client's data can never appear in another's dashboard.
- **Raw files are immutable.** Every answer is written once, exactly as received, to `raw/<client>/<date>/<engine>/<prompt>-<run>.json`, and never edited. Everything else is derived from them.
- **Retention.** Raw files are kept for as long as the client contract says (assumed 24 months), then deleted; derived results can be rebuilt from what's kept.
- **Idempotent retries.** The file path above is the job's key, so a retried request overwrites nothing and a rerun of a finished day does nothing.
- **Schema versions.** Each raw file records the route and the format version of the response. The loader reads by version.
- **Quarantine.** A response in a shape the loader doesn't recognise (no text field, an unknown engine name) is set aside with an alert instead of being scored as "not mentioned", so a format change can't look like a drop in visibility.
- **Replay.** Once the loader or a rule is fixed, the affected days are re-run from the raw files, and the result tables are replaced for those days only.

**When an AI tool changes its format.** It already happened in this data (week 4). There are two kinds of alias, kept in different places:

- **Company and AI tool names** (`"Corvain"`, `"AI Overview"`) are configuration, in `config/tracker.json`. Adding one needs no code.
- **Field names** (`response_text` vs `answer`, `run` vs `run_number`) are structural and live in code, in `FIELDS` in `src/engine/ingest.ts`. Adding one is a one-line code change with a test.

Alerts fire when unreadable or empty answers jump, or when the share of answers naming no company at all spikes, which usually means the text has moved to a field we're not reading.

---

## Hosting

The live version runs on Vercel. It reads the data pack at request time from a private Supabase Storage bucket, using these server-only environment variables:

| Variable              | What it is                                                  |
| --------------------- | ----------------------------------------------------------- |
| `SUPABASE_URL`        | The Supabase project URL                                    |
| `SUPABASE_SECRET_KEY` | A secret key with read access to Storage                    |
| `SUPABASE_BUCKET`     | Optional. The bucket holding the pack (default `data-pack`) |

To set it up: create a private bucket, upload the four data-pack files to its root, and add the variables in the Vercel project settings (or with `vercel env add`). The key never reaches the browser, and no secret is stored in this repository. Uploads on the Data page stay in the visitor's browser tab. Running locally needs none of this: without the variables, the app reads `data/`.

---

## Project layout

```
src/engine/          all logic, plain TypeScript, no UI
  ingest.ts          reading files, format differences
  detect/            mentions, sentences, tone, wrong facts
  score.ts           the score, run-to-run variation, like-for-like changes
  insights/          what changed, who gained, head-to-head, sources, questions, actions
  report.ts          board report content
  export.ts          the two scoring CSVs
src/app/             one route per screen
src/components/      UI, grouped by screen
config/tracker.json  companies, spellings, AI tools, score weights
tests/               fixtures, golden lock, accuracy checks
scripts/             export and accuracy commands
```

---

© 2026 Melroy Joanes. Written as a case study for Indexed's AI-Native Developer application; Corvane Fleet and its competitors are fictional. Shared for review only; no licence is granted to copy, modify or distribute this code.
