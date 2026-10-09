# indexed.

A weekly view of how ChatGPT, Perplexity and Google AI Overviews talk about Corvane Fleet and its competitors: who gets recommended, what the AI gets wrong, whether anything has really changed, and what to do about it.

**Live:** https://indexed-corvane.vercel.app

Analysis runs locally and needs no API keys or paid services; the same input always gives the same output. The hosted demo uses server-side credentials only to retrieve the supplied data pack.

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
npm run check        # lint, type check and the 322 tests
```

**A new week** is just another file. Drop `week7.jsonl` into `data/` and it's picked up on the next page load, or upload it on the Data page to try it in your browser first. Supported field aliases, AI tool names and date formats are normalised automatically. Structures the loader doesn't recognise are reported on the Data page and left out of scores; supporting a genuinely new export format needs a parser update.

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

**Real change or noise.** Each question was asked twice per AI tool per week, and the two answers often differ. That difference is the yardstick: a change only counts as clear when it's more than twice the usual gap between two runs. Weeks are compared only on the questions and AI tools both have, so week 5's missing Perplexity answers don't look like a drop. Week to week, nothing in this data is a clear change. Since week 3, though, Corvane is down 12 points (47 to 35), which is a clear change.

Companies, spellings, look-alikes, AI tool names and score weights all live in `config/tracker.json`. Adding a competitor is a config change. The field names the loader accepts are structural and live in code (`FIELDS` in `src/engine/ingest.ts`).

---

## Architecture and stack choice

The analysis engine (`src/engine/`) is plain TypeScript with no UI code. The same functions run in the browser (so an uploaded week is analysed in the visitor's tab), on the server and in the command-line export, so there is one implementation of every rule, and the dashboard and the scoring files come from the same code. Next.js provides the interface and deploys to Vercel.

The workload is reading files, matching text and calculating scores, so it doesn't need Python's machine-learning ecosystem today. Python would also have been a reasonable choice; I'd add it behind a documented service if a local model proved worthwhile.

---

## What I prioritised, and why

The brief says the scoring files are checked against an answer key, on data we haven't seen. So the order was:

1. **Reading the data correctly**, then **detection**, before any screen. Detection was compared row by row with an earlier, separately written implementation: all 3,060 mention rows and all 95 wrong facts agree. Agreement between two implementations catches bugs in either one, but it doesn't prove both are right.
2. **Proof before interface.** The export, the accuracy checks and a regression lock (a fingerprint of both scoring files that fails the tests if any row changes) went in before any UI work, so no screen can quietly change a number.
3. **The score and Marcus's weekly view**, because that's the core of what he asked for.
4. **The stretch items, built in parallel** once the engine was stable: Priya's question view, head-to-head, competitor facts, sources, the board report, the method page and uploads.
5. **Deployment and documentation** followed validation of the analysis engine and exports.

The commit history follows this order. Changes were delivered through pull requests with CI checks; after an early merge went in before its check had registered, every later merge waited for checks to complete successfully.

**What I chose not to do**

- **No AI model in the scoring, after testing two.** Small local NLI models (DeBERTa, MobileBERT) read plain mentions as recommendations. A local instruction model (Qwen2.5 1.5B) was then trialled on 30 full answers as a second opinion: it fixed a few verdicts the rules missed, but gave 12 verdicts to plain mentions, flagged 5 true statements as wrong facts, and took about 41 seconds per answer. It was rejected for release, and the gaps it exposed were fixed in the rules instead. The full record, with predictions and settings, is in [`docs/evaluation/local-model-trial.md`](docs/evaluation/local-model-trial.md).
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
- A clearly identified "Sources:" list within an answer is treated as citation material and excluded from company-mention detection. The surrounding answer remains eligible for analysis.
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

**2. A fresh evaluation, first run.** `tests/accuracy/held-out-3.ts` was written before it was ever run against the rules. These are its first-run results:

|                                                    | Result |
| -------------------------------------------------- | ------ |
| Tone                                               | 8 / 12 |
| … misses that fell back to "mentioned"             | 4 of 4 |
| … praise read as criticism, or the reverse         | 0      |
| Wrong facts found in contradicting sentences       | 3 / 4  |
| False contradictions                               | 0      |
| True or uncovered statements left alone (controls) | 4 / 4  |

These are small samples, so they show the kind of mistakes to expect rather than a precise rate. On this set, missing a verdict was the only tone error, and the one missed fact was a price phrased as "pricing begins at". Earlier held-out sets measured 5 / 12 and 4 / 12 on first run.

All three sets have been seen since, so they now only serve as regressions. Later rule changes, prompted by the local model trial, were informed by their misses, and set 3 now scores 10 / 12 on tone and 4 / 4 on facts. Because those changes saw the misses, that isn't a fresh result. A new sealed 40-answer set is the next fresh measure. It will be run once, after its labels are reviewed by a person, and reported here.

On the development screening set (30 synthetic answers, labels not yet reviewed by a person), tone classifications improved from 39 / 57 to 53 / 57, and detected factual contradictions increased from 17 / 21 to 20 / 21, with no correct statements flagged as wrong before or after. These examples informed development, so these figures are not an independent estimate of accuracy on unseen data.

**3. Regression checks.** These say the output hasn't changed, not that it's right:

- A fingerprint (SHA-256) of both scoring files from the sample pack fails the tests if a single row changes (`tests/golden.test.ts`).
- Development sentences in new wording (`tests/accuracy/unseen-wording.ts`) are asserted exactly, including true statements and uncovered claims that must not be flagged, and 24 seen tone sentences are checked for flipped verdicts.
- End-to-end tests check that every exported `claim_text` is an exact substring of its raw answer, footnotes and HTML entities included.

**What runs where.** Public CI has no data pack, so the label-agreement and fingerprint tests are skipped there and CI covers everything else. With the pack in `data/`, `npm test` runs them too, and `npm run accuracy -- --write` saves `tests/accuracy/REPORT.md`, which records the commit and a fingerprint of the pack so each result can be tied to the code and data it came from.

---

## How I used AI tools

I built this with Claude Code. I set the product requirements, made the decisions on scope, stack, scoring and what to leave out, and reviewed the results. Claude wrote the code, the tests and first drafts of the docs; the stretch screens were built by Claude sub-agents on separate branches and merged one at a time. An independent AI review (OpenAI Codex) audited the code and live flows, and its findings were filed as issues and fixed through the same pull-request process.

I also evaluated a small local language model against the rules-based baseline. It identified language patterns the rules missed, but also introduced incorrect verdicts and factual false positives, with substantial processing time. I used the findings to improve the rules and did not include the model in the released application ([trial record](docs/evaluation/local-model-trial.md)).

Things that went wrong and were caught:

- **Negation was misread.** "isn't something I'd suggest" was never recognised, because there's no word boundary inside a contraction, and "helps avoid outages" read as advice against the company. Both were fixed with tests that pin the corrected behaviour.
- **Evaluation contamination.** The first tone accuracy on new wording looked better than it was, because the rules had been tuned on those same sentences. Each later change was measured on a set written before it was run, since a set stops being fresh once it has been looked at.
- **History could be rewritten.** Adding a later week changed the run-to-run variation estimate, and with it an earlier week's "clear change" verdict. The estimate now uses only weeks up to the report week, and a test checks that appending a week leaves an earlier report unchanged.
- **Exported evidence didn't match the source.** `claim_text` came from a cleaned copy of the answer, so footnotes and HTML entities were lost. The export now maps each claim back to the raw answer, tested end to end.
- **Unvalidated input could look like a clean result.** An empty `facts.json` hid every wrong fact, and answer text sent as an object was scored as an answer naming nobody. Both are now rejected or set aside, with tests.
- **A dependency carried a high-severity audit warning.** A setup tool installed its own CLI as an app dependency; it was moved to dev-only.

---

## Running this every day for 20 clients (proposed)

A design, not something built here: the repository analyses answers it's given and doesn't collect them.

**Collection.** The brief measures consumer products, and a model API isn't the same thing. ChatGPT would be collected through the OpenAI API with web search (closest available match, spot-checked against the app), Perplexity through its own API, and Google AI Overviews through a search-results provider or a headless browser, since there's no official API. Each answer records its route, so a change of route isn't mistaken for a change in the market.

**Workload and cost.** 15 questions × 3 AI tools × 2 runs = 90 requests per client per day, 1,800 for 20 clients, about 54,000 a month. Cost is dominated by collection: `54,000 × (1 + retry rate) × cost per answer`, plus storage, database, jobs and monitoring. At an assumed $0.01 to $0.03 per answer that's $540 to $1,620 a month before retries; the per-answer price should be quoted per route first. Storage and analysis are small: sample answers average about 680 bytes (about 450 MB a year for 20 clients), and all 510 sample answers are analysed in about 0.1 seconds.

**Operation.** One scheduled job per client per day writes raw answers once, unchanged, to client-scoped storage keyed by client, date, AI tool, question and run, so retries are idempotent and any day can be re-run after a parser or rule fix. Client-scoped storage, access policies and isolation tests would enforce separation between tenants. Responses in an unrecognised shape are quarantined with an alert instead of being scored, and an alert also fires when the share of answers naming no company spikes, which usually means the text has moved to a field we're not reading.

**Format changes** happened in this data (week 4). Company and AI tool aliases are configuration (`config/tracker.json`); field-name aliases are structural and live in code (`FIELDS` in `src/engine/ingest.ts`), so adding one is a small code change with a test.

---

## Deployment architecture

The hosted demo runs on Vercel. Server-side code retrieves the supplied data files from a private Supabase Storage bucket, keeping them out of the public repository; if the bucket can't be read, every screen says so rather than showing partial data. Browser uploads are temporary and never modify the saved dataset. Local development reads `data/` and needs no hosted services.

| Variable              | What it is                                                  |
| --------------------- | ----------------------------------------------------------- |
| `SUPABASE_URL`        | The Supabase project URL                                    |
| `SUPABASE_SECRET_KEY` | A server-only secret key with read access to Storage        |
| `SUPABASE_BUCKET`     | Optional. The bucket holding the pack (default `data-pack`) |

To set it up, create a private bucket, upload the four data-pack files to its root, and add the variables in the Vercel project settings. No secret is stored in this repository. The private bucket protects the source files only: the demo dashboard itself is public and has no client authentication or access control.

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
## What I would improve next

I would keep the current rules-based approach as the baseline and use new examples to understand where it falls short.

If the tool needed to handle more varied language while staying fully local, I would test a small model through Ollama or Transformers.js. The model trial showed that adding AI can introduce errors as well as fix them, so I would only adopt one if it improved results on unseen, human-reviewed examples and ran comfortably on the target laptop. Score calculations would stay in code.

For broken or incomplete files, I would improve validation and support documented format variations, with clear messages explaining what needs fixing. I would preserve the original answers rather than rewrite them or guess missing information.

As more representative data became available, I would build a human-labelled dataset covering the mistakes we actually see. That would help me compare better rules, a small trained classifier and model-assisted analysis. I would keep a separate test set untouched and report both improvements and remaining errors.

© 2026 Melroy Joanes. Written as a case study for Indexed's AI-Native Developer application;
