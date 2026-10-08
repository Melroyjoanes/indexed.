# indexed.

Weekly AI visibility tracking for Corvane Fleet: how ChatGPT, Perplexity and Google AI Overviews
talk about Corvane and its competitors, what they get wrong, and what to do about it.

> Work in progress. Setup, method, accuracy and decisions are documented as each part lands.

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

The client's data pack is not part of this repository. Put its files in a `data/` folder at the
project root (see [Data](#data)).

## Data

```
data/
  responses.jsonl   # AI answers; any number of .jsonl files are read, one per week is fine
  prompts.csv       # the buyer questions
  brands.json       # client, tracked competitors, other companies
  facts.json        # what is actually true about each company
```

## Development

```bash
npm run check   # lint, type check and tests
npm run format  # format the code
```

---

© Indexed. All rights reserved. This repository is shared for review only; no licence is granted
to copy, modify or distribute it.
