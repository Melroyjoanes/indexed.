"use client";

import { Fragment, useMemo } from "react";
import { engineLabel } from "@/engine/config";
import { useDataset } from "@/components/data/dataset-provider";
import { brandColors, shortOf } from "@/lib/brands";
import { ToneBadge } from "./tone-badge";

/** One AI answer as the engine read it: companies highlighted, wrong claims underlined. */
export function AnswerView({
  responseId,
  showQuestion = true,
}: {
  responseId: string;
  showQuestion?: boolean;
}) {
  const { results } = useDataset();
  const s = results.pack.settings;
  const a = results.answers.find((x) => x.responseId === responseId);
  const colors = useMemo(() => brandColors(s), [s]);
  const mentions = results.mentions
    .filter((m) => m.responseId === responseId && m.mentioned)
    .sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
  const wrong = results.claims.filter((c) => c.responseId === responseId && c.wrong);

  const pieces = useMemo(() => {
    if (!a) return [];
    const spans: { start: number; end: number }[] = [];
    for (const c of wrong) {
      const i = a.text.indexOf(c.sentence);
      if (i >= 0) spans.push({ start: i, end: i + c.sentence.length });
    }
    const cuts = new Set<number>([0, a.text.length]);
    for (const h of a.hits) cuts.add(h.start).add(h.end);
    for (const sp of spans) cuts.add(sp.start).add(sp.end);
    const sorted = [...cuts].sort((x, y) => x - y);
    return sorted.slice(0, -1).map((start, i) => {
      const end = sorted[i + 1]!;
      const hit = a.hits.find((h) => h.start <= start && end <= h.end);
      const isWrong = spans.some((sp) => sp.start <= start && end <= sp.end);
      return { text: a.text.slice(start, end), brand: hit?.brand ?? null, isWrong };
    });
  }, [a, wrong]);

  if (!a)
    return <p className="text-muted-foreground text-sm">This answer isn&apos;t in the data.</p>;

  return (
    <article className="space-y-4">
      <header className="space-y-1">
        {showQuestion ? <p className="leading-snug font-medium">{a.prompt.question}</p> : null}
        <p className="text-muted-foreground text-sm">
          {engineLabel(s, a.engine)}, week {a.week}, run {a.run ?? "?"}
        </p>
      </header>

      {!a.ok ? (
        <p className="bg-muted text-muted-foreground rounded-lg p-4 text-sm">
          This request failed ({a.error ?? "empty answer"}), so it isn&apos;t counted in any score.
        </p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2" aria-label="Companies in this answer">
            {mentions.length === 0 ? (
              <li className="text-muted-foreground text-sm">No tracked company is mentioned.</li>
            ) : (
              mentions.map((m) => (
                <li
                  key={m.brand}
                  className="flex items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-2.5 text-sm"
                >
                  <span className="tabular text-muted-foreground">{m.position}.</span>
                  <span className="font-medium" style={{ color: colors[m.brand] }}>
                    {shortOf(s, m.brand)}
                  </span>
                  <ToneBadge tone={m.tone} />
                </li>
              ))
            )}
          </ul>

          <div className="bg-subtle rounded-lg border p-4 text-[15px] leading-relaxed whitespace-pre-wrap">
            {pieces.map((p, i) => {
              const inner = p.brand ? (
                <mark
                  className="rounded px-0.5 font-medium"
                  style={{
                    color: colors[p.brand],
                    background: `color-mix(in oklch, ${colors[p.brand]} 12%, transparent)`,
                  }}
                  title={s.brands[p.brand]?.name}
                >
                  {p.text}
                </mark>
              ) : (
                p.text
              );
              return p.isWrong ? (
                <span
                  key={i}
                  className="decoration-destructive underline decoration-wavy underline-offset-4"
                  title="Contradicts the fact sheet"
                >
                  {inner}
                </span>
              ) : (
                <Fragment key={i}>{inner}</Fragment>
              );
            })}
          </div>

          {wrong.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-sm font-medium">Wrong facts in this answer</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                {wrong.map((c, i) => (
                  <li key={i}>
                    <span className="text-foreground font-medium">{shortOf(s, c.brand)}:</span> “
                    {c.sentence}” The fact sheet says{" "}
                    {c.factKey === "starting_price_usd" ? `$${c.actual}` : c.actual}.
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mentions.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-sm font-medium">Why each tone</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                {mentions.map((m) => (
                  <li key={m.brand}>
                    <span className="text-foreground font-medium">{shortOf(s, m.brand)}</span>:{" "}
                    {m.evidence
                      ? `“${m.evidence}”`
                      : "named without a verdict, so it counts as mentioned."}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </article>
  );
}
