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
npm run check        # lint, type check and the 219 tests
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

Companies, spellings, look-alikes, AI tool names and score weights all live in `config/tracker.json`. Adding a competitor is a config change.

---

## What I prioritised, and why

The brief says the scoring files are checked against an answer key, on data we haven't seen. So the order was:

1. **Reading the data correctly**, then **detection**, before any screen. Detection was checked row by row against a reference implementation: all 3,060 mention rows and all 95 wrong facts are identical.
2. **Proof before interface.** The export, the accuracy checks and a regression lock (a fingerprint of both scoring files that fails the tests if any row changes) went in before any UI work, so no screen can quietly change a number.
3. **The score and Marcus's weekly view**, because that's the core of what he asked for.
4. **The stretch items, built in parallel** once the engine was stable: Priya's question view, head-to-head, competitor facts, sources, the board report, the method page and uploads.
5. **Deployment and docs last**, so every number here is final.

The commit history follows this order: 13 pull requests, each through CI.

**What I chose not to do**

- **No AI model for tone, after testing one.** I tried two small models that run locally for free (DeBERTa and MobileBERT, via transformers.js) as a second opinion for sentences the rules can't judge. They read plain mentions as recommendations ("Trakvia is another option" came back as recommended with 74% confidence), and those are exactly the sentences they'd be asked about, so accuracy would have gone down. A larger local model through Ollama would likely do better, but needs a separate install and gives answers that vary between runs, which makes accuracy hard to report honestly. It stays the next step, tested against the same checks before it's switched on.
- **No logins or database.** Not needed to use it, and they get in the way of "open it and use it".
- **No collection from the AI tools.** The brief provides the answers.

---

## Assumptions

- Week 4 dates like `07/09/2026` are day/month/year; the other weeks put week 4 in early September.
- A duplicate `response_id` keeps its first copy.
- Failed requests still get six rows in `mentions.csv` (not mentioned) but aren't counted in any score.
- A price is a claim only when it's a starting price for a named company. "Usually costs between $15 and $60" isn't about anyone.
- "Headquartered in Chicago" with no state is checked against the city.
- A phrase describing the buyer ("carriers that need ELD compliance") isn't a claim about the product.
- If a sentence names two companies, no fact claim is taken from it.
- A company named without a verdict is "mentioned" (neutral).
- In a table, the last column is the verdict ("Top pick" is recommended, "Skip at your size" is advised against).
- `claim_text` is the whole sentence, without list markers or `[1]` footnotes.
- No site in this data is cited only next to competitors, so Sources also flags sites where a competitor is named more often than Corvane.

---

## Accuracy

**15 random answers, checked by hand.** They're drawn with a seeded shuffle (seed 15, `tests/accuracy/sample.ts`), so anyone gets the same 15. The labels are in `tests/accuracy/hand-labels.json`; the answer text isn't committed, because it's client data.

|                                     | Result  |
| ----------------------------------- | ------- |
| Mentions (15 answers × 6 companies) | 90 / 90 |
| Positions                           | 39 / 39 |
| Tone                                | 39 / 39 |

The sample includes an answer that only mentions Corvane Logistics, a five-company list with a fact claim, and "expensive at first. Even so, I'd pick it". A test fails if the tool ever disagrees with these labels, so this number can't drift.

**Wrong facts.** All 95 claims flagged in the sample pack match the full list of factual sentences in the data, and every `claim_text` appears word for word in its answer.

**Where it's weaker.** The sample answers follow recognisable patterns and the rules were written after reading them, so the result above is the best case. I also tested sentences in wording the data never uses (`tests/accuracy/unseen-wording.ts`):

| New wording                                                    | Result     |
| -------------------------------------------------------------- | ---------- |
| Mentions (hyphens, `www.`, new misspellings, the look-alike)   | 6 / 6      |
| Wrong facts ("charges $35 to start", "connects to QuickBooks") | 6 / 6      |
| Tone, on a set written after the rules were final              | **6 / 12** |

Direct advice ("For this buyer, choose X", "do not choose X") is read as a verdict, and negations written as contractions ("isn't something I'd suggest") are recognised.

When tone is wrong on new wording, it almost always falls back to "mentioned" rather than flipping the verdict ("a sensible budget option" reads as mentioned, not recommended). A test enforces that it never turns praise into criticism. If new data uses the same patterns, I'd expect results close to the hand check. If it's freely written, mentions and facts should hold up and tone will be closer to half right.

`npm run accuracy` prints all of this.

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
- **The first tone accuracy on new wording looked better than it was**, because the rules had been tuned on those same sentences. A fresh, untuned set gave the honest 5 / 12 at the time (6 / 12 after the contraction fix below).
- **A test week uploaded through the app exposed missed direct advice** ("choose X") and a negation bug: "isn't" was never recognised, because there's no word boundary inside a contraction. Both fixed, with unit tests.

---

## Running this every day for 20 clients

**Cost.** Collecting answers is the cost: 15 questions × 3 AI tools × 2 runs is 90 requests per client per day, about 1,800 a day for 20 clients. At typical API prices for short answers that's in the low hundreds of dollars a month. The analysis is free; the full sample pack takes about a second.

**Storage.** Raw answers are kept exactly as received in file storage (Supabase Storage or S3), one file per client per day and never edited, so everything can be re-run when the rules improve. Results go into Postgres. That's about 540 rows per client per day, or roughly 4 million a year for 20 clients, which is small.

**Running it.** One scheduled job a day per client: collect, analyse, save, then refresh the dashboard and the Monday summary. Each client is a config file and a fact sheet, so adding one needs no code.

**When an AI tool changes its format.** It already happened in this data (week 4). The loader maps field names by alias, so most changes are one line of config. For the ones that slip through, three things:

- Unreadable or empty answers are counted on every load, and an alert fires when that count jumps.
- The share of answers that mention no company at all is watched; a sudden spike usually means the text has moved to a field we're not reading.
- Raw files are kept, so the affected days can be re-run once the loader is fixed.

---

## Hosting

The live version runs on Vercel. It reads the data pack from a private Supabase Storage bucket at request time; the key is a server-only environment variable and never reaches the browser. Uploads on the Data page stay in the visitor's browser tab. Running locally needs none of this.

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

© Indexed. All rights reserved. Shared for review only; no licence is granted to copy, modify or distribute this code.
