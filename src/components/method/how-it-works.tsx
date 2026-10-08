"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { AnswersSheet } from "@/components/answers/answers-sheet";
import { ToneBadge } from "@/components/answers/tone-badge";
import { useDataset } from "@/components/data/dataset-provider";
import { listOf, plural, toneWord } from "@/engine/insights";
import {
  LAST_VERDICT_EXAMPLE,
  methodFacts,
  missingToolExample,
  TONE_EXAMPLES,
  workedExample,
  type WorkedExample,
} from "@/engine/method";
import type { Settings, Tone } from "@/engine/types";
import { score } from "@/lib/format";
import { ACCURACY } from "./accuracy";

const TONES: Tone[] = ["recommended", "neutral", "negative", "not_recommended"];
const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth"];
const ordinal = (n: number) => ORDINAL[n - 1] ?? `number ${n}`;
const pct = (w: number) => `${Math.round(w * 100)}%`;

const SECTIONS = [
  ["reads", "What the tool reads"],
  ["found", "How a company is found"],
  ["tone", "Position and tone"],
  ["score", "The score"],
  ["change", "Clear change or normal variation"],
  ["missing", "Missing data"],
  ["facts", "Wrong facts"],
  ["accuracy", "How accurate it is"],
  ["limits", "What it can't tell you"],
] as const;

function Section({ id, children }: { id: (typeof SECTIONS)[number][0]; children: ReactNode }) {
  const title = SECTIONS.find(([k]) => k === id)![1];
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-border text-muted-foreground border-l-2 pl-4 italic">
      {children}
    </blockquote>
  );
}

/** "first: full points, second: 90%, third or later: 80%" */
function positionRule(s: Settings): string {
  const pw = s.positionWeight;
  if (!pw.length) return "Where a company is named doesn't change its points.";
  const parts = pw.map((w, i) => {
    const place = i === pw.length - 1 ? `${ordinal(i + 1)} or later` : ordinal(i + 1);
    return `${place}, ${w === 1 ? "full points" : pct(w)}`;
  });
  return `Being named early counts a little more: named ${parts.join("; ")}.`;
}

function Worked({ ex, name }: { ex: WorkedExample; name: string }) {
  const others = ex.runs.filter((r) => r.responseId !== ex.responseId);
  return (
    <div className="bg-subtle space-y-4 rounded-xl border p-5">
      <p className="text-muted-foreground text-sm">
        Worked example from week {ex.week}, {ex.engineLabel}, run {ex.run ?? "?"}
      </p>
      <p className="font-medium">“{ex.question}”</p>
      {ex.evidence ? <Quote>{ex.evidence.replace(/\*\*/g, "")}</Quote> : null}
      <ol className="space-y-2 text-sm">
        <li className="flex items-baseline justify-between gap-4">
          <span>
            {name} is <ToneBadge tone={ex.tone} className="mx-0.5" />
          </span>
          <span className="tabular">{ex.basePoints} points</span>
        </li>
        <li className="flex items-baseline justify-between gap-4">
          <span>Named {ordinal(ex.position)} of the companies in the answer</span>
          <span className="tabular">
            × {pct(ex.weight)} = <span className="font-medium">{score(ex.points)} points</span>
          </span>
        </li>
        {others.map((r) => (
          <li key={r.responseId} className="flex items-baseline justify-between gap-4">
            <span className="text-muted-foreground">
              The other run, run {r.run ?? "?"}: {toneWord(r.tone)}
              {r.position ? `, named ${ordinal(r.position)}` : ""}
            </span>
            <span className="tabular text-muted-foreground">{score(r.points)} points</span>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-4 border-t pt-2">
          <span>Average for this question on {ex.engineLabel}</span>
          <span className="tabular font-medium">{score(ex.average)} points</span>
        </li>
      </ol>
      <p className="text-sm">
        This is a priority {ex.priority} question, so that average counts{" "}
        {ex.priority === 1 ? "once" : `${ex.priority} times as much as a priority 1 question`} when
        all of the week&apos;s questions and AI tools are combined. Together they give {name} a
        score of <span className="font-medium">{score(ex.weekScore)}</span> for week {ex.week}.
      </p>
      <AnswersSheet
        title={ex.question}
        description={`${ex.engineLabel}, week ${ex.week}, both runs`}
        responseIds={ex.runs.map((r) => r.responseId)}
        trigger={
          <span className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            Read the answers
            <ArrowRightIcon className="size-3.5" />
          </span>
        }
      />
    </div>
  );
}

export function HowItWorks() {
  const { results, scoring, week, client } = useDataset();
  const s = results.pack.settings;
  const name = s.brands[client]?.name ?? client;
  const facts = useMemo(() => methodFacts(results), [results]);
  const ex = useMemo(
    () => workedExample(results, scoring, client, week),
    [results, scoring, client, week],
  );
  const gap = useMemo(() => missingToolExample(results, week), [results, week]);

  const clientBrand = s.brands[client];
  const plainNames = clientBrand
    ? [clientBrand.name, clientBrand.name.split(/\s+/)[0]!].map((n) => n.toLowerCase())
    : [];
  const spellings = (clientBrand?.aliases ?? [])
    .filter((a) => !plainNames.includes(a.toLowerCase()))
    .slice(0, 3);
  const lookalikes = Object.values(s.brands).flatMap((b) => b.lookalikes);
  const factCompanies = Object.keys(s.facts)
    .map((k) => s.brands[k]?.name ?? k)
    .filter(Boolean);
  const { handCheck: hc, unseenWording: uw, syntheticWeek: sw } = ACCURACY;
  const first = facts.weeks[0];
  const last = facts.weeks[facts.weeks.length - 1];

  return (
    <article className="mx-auto max-w-[70ch] space-y-12 leading-relaxed">
      <header className="space-y-3">
        <p className="text-muted-foreground text-sm">How it works</p>
        <h1 className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">
          How indexed. reads AI answers and turns them into a score
        </h1>
        <p className="text-muted-foreground">
          A plain-English account of what is counted, how, and how far you can rely on it. Every
          number on this page comes from the data and settings in use right now.
        </p>
        <nav aria-label="On this page" className="pt-2">
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {SECTIONS.map(([id, title]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="hover:text-foreground underline-offset-4 hover:underline"
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Section id="reads">
        <p>
          Every week the same {plural(facts.questions, "buyer question")} are put to{" "}
          {listOf(facts.engines)}. These are the questions a fleet manager types when looking for
          software, from early research to comparing named companies.
        </p>
        <p
          className="bg-subtle tabular rounded-xl border px-5 py-4 text-center text-sm sm:text-base"
          aria-label={`${facts.questions} questions times ${facts.engines.length} AI tools times ${facts.runsPerWeek} runs equals ${facts.perWeek} answers a week`}
        >
          <span className="font-medium">{facts.questions}</span> questions ×{" "}
          <span className="font-medium">{facts.engines.length}</span> AI tools ×{" "}
          <span className="font-medium">{facts.runsPerWeek}</span> runs ={" "}
          <span className="font-medium">{facts.perWeek}</span> answers a week
        </p>
        <p>
          Each question is asked {facts.runsPerWeek === 2 ? "twice" : `${facts.runsPerWeek} times`}{" "}
          on each AI tool because the same question can get a different answer a few minutes later.
          Comparing the runs is how the tool tells a real change from chance.
          {first !== undefined
            ? ` The data loaded now holds ${facts.answers} answers from week ${first} to week ${last}.`
            : ""}
        </p>
        <p>
          Some questions matter more than others. Each has a priority from 1 to 3, with 3 closest to
          a purchase: here {facts.byPriority[3] ?? 0} are priority 3, {facts.byPriority[2] ?? 0}{" "}
          priority 2 and {facts.byPriority[1] ?? 0} priority 1.
        </p>
      </Section>

      <Section id="found">
        <p>A company counts as mentioned when the answer itself names it, in any of these ways:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Its name, in full or short
            {clientBrand ? ` (“${clientBrand.name}”, “${clientBrand.name.split(/\s+/)[0]}”)` : ""}.
          </li>
          {spellings.length ? (
            <li>Known spellings, such as {listOf(spellings.map((a) => `“${a}”`))}.</li>
          ) : null}
          {clientBrand?.website ? <li>Its website, such as {clientBrand.website}.</li> : null}
          <li>Close misspellings of longer names, which AI tools sometimes produce.</li>
        </ul>
        {lookalikes.length ? (
          <p>
            {listOf(lookalikes)}{" "}
            {lookalikes.length === 1 ? "is a different company" : "are different companies"} with a
            similar name and {lookalikes.length === 1 ? "is" : "are"} never counted.
          </p>
        ) : null}
        <p>
          Links alone don&apos;t count. AI tools often list their sources under an answer; a company
          that appears only there, and not in the answer, isn&apos;t counted as mentioned.
        </p>
      </Section>

      <Section id="tone">
        <p>
          <span className="font-medium">Position</span> is the order companies are first named in: 1
          for the first, 2 for the next new one, and so on.
        </p>
        <p>
          <span className="font-medium">Tone</span> is what the answer says about each company.
          There are four:
        </p>
        <ul className="space-y-3">
          {TONES.map((t) => (
            <li key={t} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <ToneBadge tone={t} className="w-fit shrink-0 sm:w-36 sm:justify-center" />
              <span className="text-muted-foreground">“{TONE_EXAMPLES[t]}”</span>
            </li>
          ))}
        </ul>
        <p>
          A company that is named but not judged is Mentioned. When an answer changes its mind, the
          last verdict in the answer wins, and within a sentence the part after “but” or “though”
          decides:
        </p>
        <Quote>
          {LAST_VERDICT_EXAMPLE} <ToneBadge tone="not_recommended" className="not-italic" />
        </Quote>
      </Section>

      <Section id="score">
        <p>
          The score, from 0 to 100, is how strongly AI answers point buyers toward a company. Each
          answer gives each company points for its tone:
        </p>
        <table className="w-full max-w-sm text-sm">
          <caption className="sr-only">Points per answer by tone</caption>
          <tbody className="divide-y">
            {TONES.map((t) => (
              <tr key={t}>
                <th scope="row" className="py-2 text-left font-normal">
                  <ToneBadge tone={t} />
                </th>
                <td className="tabular py-2 text-right">{s.points[t]} points</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-2 text-left font-normal">
                <ToneBadge tone={null} />
              </th>
              <td className="tabular py-2 text-right">0 points</td>
            </tr>
          </tbody>
        </table>
        <p>{positionRule(s)}</p>
        <p>
          The runs of each question on each AI tool are averaged. Those averages are then combined
          into one score for the week, with each question weighted by its priority: a priority 3
          question counts three times as much as a priority 1 question.
        </p>
        {ex ? (
          <Worked ex={ex} name={name} />
        ) : (
          <p className="bg-subtle text-muted-foreground rounded-xl border p-5 text-sm">
            {name} wasn&apos;t named in any answer in week {week}, so there&apos;s no worked example
            to show for that week.
          </p>
        )}
      </Section>

      <Section id="change">
        <p>
          Ask an AI tool the same question twice and the answer can differ. So the tool measures,
          for each company, how much its points usually differ between the two runs of the same
          question in the same week. That is the usual run-to-run difference.
        </p>
        <p>
          A change between two weeks is called a <span className="font-medium">clear change</span>{" "}
          when it is more than{" "}
          {s.clearChangeMultiplier === 2 ? "twice" : `${s.clearChangeMultiplier} times`} the usual
          run-to-run difference for the questions compared, and at least one point. Anything smaller
          is <span className="font-medium">normal variation</span>: it may be real, but it could
          also be chance.
        </p>
        <p className="text-muted-foreground">
          This is a rule of thumb, not proof. With only a few weeks and two runs, the estimate of
          normal variation is itself rough. A small but real shift can read as normal variation
          until it lasts a few weeks, and a clear change says that something moved, not why.
        </p>
      </Section>

      <Section id="missing">
        <p>
          A request that fails, with an error or an empty answer, is left out. It doesn&apos;t count
          as zero, because a company can&apos;t lose points for an answer that never came back.
          Duplicate copies of the same answer are counted once.
        </p>
        <p>
          Week-on-week changes compare like with like: only the questions and AI tools that both
          weeks have. If an AI tool is missing for a week, it can&apos;t look like a drop.
          {gap
            ? ` For example, week ${gap.week} has no answers from ${listOf(gap.missing)}, so changes that week compare ${listOf(gap.comparedOn)} only.`
            : ""}
        </p>
        <p>
          Screens with an incomplete week say so at the top.{" "}
          <Link href="/data" className="text-primary underline-offset-4 hover:underline">
            See what came in each week
          </Link>
          .
        </p>
      </Section>

      <Section id="facts">
        <p>
          Claims about a company are checked against the fact sheet
          {factCompanies.length ? `, which covers ${listOf(factCompanies)}` : ""}. Five kinds of
          claim are checked:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>starting price</li>
          <li>where the company is based</li>
          <li>the year it was founded</li>
          <li>features on the fact sheet, such as dashcams or ELD compliance</li>
          <li>integrations, such as QuickBooks</li>
        </ul>
        <p>
          Anything not on the fact sheet, such as review ratings or customer numbers, is left alone.
          It isn&apos;t marked wrong, because there&apos;s nothing to check it against. A sentence
          that names two companies isn&apos;t checked either, since it&apos;s unclear which company
          the claim is about.
        </p>
      </Section>

      <Section id="accuracy">
        <p>
          {hc.answers} answers were drawn at random from the sample data and checked by hand. The
          tool matched on all {hc.companyChecks.of} company checks (whether each company was named),
          all {hc.positions.of} positions and all {hc.tones.of} tones.
        </p>
        <p>
          It was also tested on wording that doesn&apos;t appear in the sample data. Mentions held
          up on {uw.mentions.right} of {uw.mentions.of} and wrong facts on {uw.wrongFacts.right} of{" "}
          {uw.wrongFacts.of}. Tone was right on {uw.tones.right} of {uw.tones.of}. In{" "}
          {uw.tonesMissedAsMentioned} of the {uw.tones.of - uw.tones.right} misses it fell back to
          Mentioned rather than guessing.
        </p>
        <p>
          A separate test week of {sw.answers} answers, written independently with its own expected
          results, matched on all {sw.mentionRows.of} company, position and tone checks and found
          both wrong facts ({sw.wrongFacts.right} of {sw.wrongFacts.of}).
        </p>
        <p>
          In practice: who is named, and in what order, can be trusted on new data. Tone is reliable
          on phrasing like the sample, but new ways of praising or warning against a company may
          show as Mentioned until the tool learns them, so scores could understate strong opinions.
        </p>
      </Section>

      <Section id="limits">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            The history is short
            {facts.weeks.length ? `: ${plural(facts.weeks.length, "week")} so far` : ""}. Trends get
            more trustworthy with every week added.
          </li>
          <li>
            {facts.questions} questions aren&apos;t the whole market. Buyers ask many other things,
            in other words, and AI answers to those may differ.
          </li>
          <li>
            The tool shows patterns, not causes. It can tell you that an AI tool stopped
            recommending a company, not why.
          </li>
        </ul>
      </Section>
    </article>
  );
}
