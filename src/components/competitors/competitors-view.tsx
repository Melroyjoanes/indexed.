"use client";

import { useMemo } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { useDataset } from "@/components/data/dataset-provider";
import { focusBrands } from "@/engine/config";
import {
  coverage,
  factAlerts,
  listOf,
  replacements,
  scoreTrend,
  sources,
  tallySentence,
  winners,
  winnerTally,
  whoReplaced,
} from "@/engine/insights";
import { brandColors, shortOf } from "@/lib/brands";
import { CompetitorFacts } from "./competitor-facts";
import { HeadToHead } from "./head-to-head";
import { Section } from "./parts";
import { Replaced } from "./replaced";
import { ScoreTrend } from "./score-trend";
import { SourcesList } from "./sources-list";

const SECTIONS = [
  { id: "trend", label: "Score trend" },
  { id: "head-to-head", label: "Question by question" },
  { id: "replaced", label: "Who replaced whom" },
  { id: "facts", label: "Wrong facts about competitors" },
  { id: "sources", label: "Sources" },
];

export function CompetitorsView() {
  const { results, scoring, week } = useDataset();
  const s = results.pack.settings;
  const colors = useMemo(() => brandColors(s), [s]);
  const name = useMemo(() => (b: string) => shortOf(s, b), [s]);
  const focus = useMemo(() => focusBrands(s), [s]);
  const client = name(s.client);
  const cov = useMemo(() => coverage(results, week), [results, week]);
  const trend = useMemo(() => scoreTrend(scoring, s, week), [scoring, s, week]);
  const leaders = useMemo(() => winners(scoring.rows, [week]), [scoring, week]);
  const tally = useMemo(() => winnerTally(leaders), [leaders]);
  const replaced = useMemo(
    () => whoReplaced(replacements(scoring.rows), s.client, week),
    [scoring, s.client, week],
  );
  const cited = useMemo(() => sources(results, week), [results, week]);
  const facts = useMemo(
    () =>
      factAlerts(
        results,
        focus.filter((b) => b !== s.client && s.facts[b]),
        week,
      ),
    [results, focus, s, week],
  );

  const top = tally.led[0];
  const mine = tally.led.find((l) => l.brand === s.client)?.count ?? 0;
  const headline = !top
    ? `How ${client} compares with ${listOf(focus.slice(1).map(name))}.`
    : top.brand === s.client
      ? `${client} is the company AI recommends most this week. It leads ${top.count} of ${tally.pairs} question and AI tool pairs.`
      : `${name(top.brand)} is the company AI recommends most this week. It leads ${top.count} of ${tally.pairs} question and AI tool pairs. ${client} leads ${mine}.`;

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-muted-foreground text-sm">
          {s.brands[s.client]?.name ?? client} and competitors, week {week}
        </p>
        <h1 className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">
          {headline}
        </h1>
        {cov.level === "major" || cov.level === "none" ? (
          <p className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm">
            <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
            {cov.summary}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{cov.summary}</p>
        )}
      </header>

      <nav aria-label="On this page" className="-mt-4 flex flex-wrap gap-2">
        {SECTIONS.map((x) => (
          <a
            key={x.id}
            href={`#${x.id}`}
            className="bg-secondary text-secondary-foreground hover:bg-muted rounded-full px-3 py-1 text-sm transition-colors"
          >
            {x.label}
          </a>
        ))}
      </nav>

      <Section
        id="trend"
        title="Score trend"
        intro={`Each company's score (0 to 100) every week up to week ${week}. Higher means AI answers point buyers toward them more strongly.`}
      >
        <ScoreTrend points={trend} brands={focus} client={s.client} name={name} colors={colors} />
      </Section>

      <Section
        id="head-to-head"
        title="Who AI recommends, question by question"
        intro={`For each question and AI tool in week ${week}, the company the answers recommended most strongly. Open one to read the answers.`}
      >
        <p className="max-w-3xl">{tallySentence(tally, name)}</p>
        {tally.pairs > 0 ? (
          <HeadToHead winners={leaders} week={week} name={name} colors={colors} />
        ) : null}
      </Section>

      <Section
        id="replaced"
        title={`Who took ${client}'s place`}
        intro={`When ${client} stopped being named in a question on one AI tool from one week to the next, the companies named there instead.`}
      >
        {week === trend[0]?.week ? (
          <p className="text-muted-foreground">
            This is the first week of data. Changes will show from next week.
          </p>
        ) : (
          <Replaced summary={replaced} week={week} name={name} colors={colors} />
        )}
      </Section>

      <Section
        id="facts"
        title="What AI gets wrong about competitors"
        intro={`Claims in answers up to week ${week} that contradict the competitors' own fact sheets. Useful for sales conversations, when a buyer repeats one of them.`}
      >
        <CompetitorFacts
          facts={facts}
          week={week}
          colors={colors}
          unchecked={focus.filter((b) => b !== s.client && !s.facts[b]).map(name)}
        />
      </Section>

      <Section
        id="sources"
        title="Which websites the AI tools cite"
        intro={`The sites AI answers point to as sources, most cited first. Sites where a competitor is named more often than ${client} are highlighted, and may be worth trying to get covered on.`}
      >
        <SourcesList
          list={cited}
          brands={focus}
          client={s.client}
          week={week}
          name={name}
          colors={colors}
        />
      </Section>
    </div>
  );
}
