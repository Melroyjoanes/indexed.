# Local model trial: rejected for release

**Decision:** tone and wrong facts stay rule-based. A local language model was tested as a second opinion and rejected. Its gains were small, it invented verdicts and fact alerts the source answers don't support, and it was too slow for routine use.

**Status of the numbers:** preliminary. The expected labels were written before any model run, but have not yet been reviewed by a person.

## What was tested

|          |                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model    | `onnx-community/Qwen2.5-1.5B-Instruct`, 4-bit (`q4`), Apache 2.0                                                                                    |
| Runtime  | Transformers.js 3 (onnxruntime-node, CPU)                                                                                                           |
| Decoding | Greedy, at most 200 new tokens, chat template, 2 worked examples                                                                                    |
| Hardware | Apple M1, 8 GB RAM, macOS 14.4, Node 22.20                                                                                                          |
| Code     | [`judge.ts.txt`](local-model-trial/judge.ts.txt) (the model judge) and [`compare.mts.txt`](local-model-trial/compare.mts.txt) (the scoring harness) |

The model received each full answer and the companies the rules found in it. It returned a tone for each company and a list of factual claims. It was not shown the fact sheet: when it was, it repeated the sheet back as "wrong facts". Instead, code compared each claim with the fact sheet, and kept the claim only if the quoted sentence actually states it.

Name detection and positions stayed rule-based in every mode.

## How it was measured

- **Two synthetic sets**, both written before any model run:
  - a 30-answer screening set, [`screening-set.json`](local-model-trial/screening-set.json);
  - a separate 40-answer evaluation set, kept sealed and not yet used.
- **What the answers contain:** multi-sentence answers, final verdicts that change, tables, several companies per answer, a look-alike company, wrong facts of every type, and true or uncovered statements as negative controls.
- **Separation:** different workers wrote the sets and built the model judge, so the prompt was never tuned on the test answers.
- **Three modes:** rules only, model only, and hybrids (the model fills in where the rules said "mentioned", or decides tone with the rules as a fallback).
- **Saved predictions:** [`screening-model-predictions.json`](local-model-trial/screening-model-predictions.json), so results can be re-scored after labels are corrected without re-running the model.

## Screening results (30 answers, 57 company mentions, 21 wrong facts)

|                                  | Rules (at trial time) | Model            | Rules + model |
| -------------------------------- | --------------------- | ---------------- | ------------- |
| Tone right                       | 39 / 57               | 41 / 57          | 41 / 57       |
| Verdict given to a plain mention | **0**                 | 12               | 12            |
| Praise and criticism swapped     | 2                     | 1                | 2             |
| Wrong facts found                | 17 / 21               | 17 / 21          | 21 / 21       |
| True statements flagged as wrong | **0**                 | 5                | 5             |
| Time per answer                  | < 1 ms                | ~41 s (max 88 s) | ~41 s         |

**Where it helped.** It read verdicts the rules missed ("would be my first call", "the safer bet") and four wrong facts the rules missed.

**Where it hurt.**

- **Invented rejections.** Eight times it turned a plain listing ("X is also on the market") into "advised against". That moves that company's points for the answer from 50 to 0.
- **False fact alerts.** It flagged five true statements as wrong facts.
- **Speed.** At about 41 seconds per answer, the 510-answer sample pack would take hours, and the model needed about 3 GB of free memory.

Being repeatable (the same output on three runs) didn't make it accurate: it repeated the same mistakes.

## What happened instead

The model's wins pointed at general gaps in the rules, which were then fixed with paired tests (an example and a counterexample for each pattern):

- **Recommendation and rejection phrasing.** "my first call", "the one I'd shortlist", "I'd lean toward", "the safer bet"; and "I wouldn't shortlist", "would not be my first call".
- **Complaints.** "users report crashes"; "rarely crashes" doesn't count.
- **Pronouns after an opening clause.** "For a mixed fleet, it's hard to beat", "complain about its contract terms".
- **Shared verdicts.** "Neither A nor B …, so I'd look elsewhere" applies to both.
- **Fact wording.** "pricing begins at", "sends maintenance alerts".
- **Sources lists.** A "Sources:" list written into the answer text no longer counts as mentions.

With those fixes, the rules score 53 / 57 on tone and 20 / 21 on wrong facts on the screening set. They still invent no verdicts and raise no false alarms, and the sample-pack output is unchanged.

The screening set guided those fixes, so it is now development data. The sealed 40-answer set is the fair measure. It will be run once, after its labels are reviewed by a person, and reported in the README.

## When to revisit

Model assistance is worth another trial only if a candidate beats the current rules on a fresh, human-labelled set:

- on accuracy, with no added invented verdicts or false fact alerts;
- and on practicality: minutes, not hours, for a week of answers on ordinary hardware.

The most promising candidates are:

- a GPU-accelerated runtime (llama.cpp) with a larger instruction model and output constrained to the four labels;
- a small classifier trained on human-reviewed sentences, such as SetFit.
