"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/engine/insights";
import { score } from "@/lib/format";
import { Company, Dot } from "./parts";

interface Props {
  points: TrendPoint[];
  brands: string[]; // client first
  client: string;
  name: (brand: string) => string;
  colors: Record<string, string>;
}

type Datum = Record<string, number | null | boolean | [number, number] | null> & {
  week: number;
  partial: boolean;
  band: [number, number] | null;
};

function TrendTooltip({
  active,
  label,
  brands,
  name,
  colors,
  data,
}: {
  active?: boolean;
  label?: number | string;
  brands: string[];
  name: (b: string) => string;
  colors: Record<string, string>;
  data: Datum[];
}) {
  const d = data.find((x) => x.week === Number(label));
  if (!active || !d) return null;
  const ranked = [...brands].sort(
    (a, b) => ((d[b] as number | null) ?? -1) - ((d[a] as number | null) ?? -1),
  );
  return (
    <div className="bg-popover text-popover-foreground space-y-1.5 rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="font-medium">
        Week {d.week}
        {d.partial ? (
          <span className="text-muted-foreground font-normal">, some answers missing</span>
        ) : null}
      </p>
      <ul className="space-y-0.5">
        {ranked.map((b) => (
          <li key={b} className="flex items-center justify-between gap-4">
            <Company name={name(b)} color={colors[b]} />
            <span className="tabular">{score(d[b] as number | null)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Weekly scores of the four tracked companies, with the client's usual variation shaded. */
export function ScoreTrend({ points, brands, client, name, colors }: Props) {
  const data = useMemo<Datum[]>(
    () =>
      points.map((p) => ({
        week: p.week,
        partial: p.partial,
        band: p.low !== null && p.high !== null ? [p.low, p.high] : null,
        ...p.scores,
      })),
    [points],
  );
  const last = points[points.length - 1];
  const hasPartial = points.some((p) => p.partial);
  const clientName = name(client);

  return (
    <div className="space-y-4">
      <ul
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
        aria-label="Scores in the latest week shown"
      >
        {brands.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <Company name={name(b)} color={colors[b]} strong={b === client} />
            <span className="tabular text-muted-foreground">{score(last?.scores[b])}</span>
          </li>
        ))}
      </ul>

      <div
        className="bg-card h-72 rounded-xl border p-3 sm:h-80 sm:p-4"
        role="img"
        aria-label={`Line chart of weekly scores from week ${points[0]?.week} to week ${last?.week}. The numbers are in the table below.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tickFormatter={(w: number) => `Week ${w}`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={<TrendTooltip brands={brands} name={name} colors={colors} data={data} />}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill={colors[client]}
              fillOpacity={0.14}
              isAnimationActive={false}
              activeDot={false}
              connectNulls
            />
            {[...brands].reverse().map((b) => (
              <Line
                key={b}
                dataKey={b}
                name={name(b)}
                stroke={colors[b]}
                strokeWidth={b === client ? 2.5 : 1.5}
                isAnimationActive={false}
                connectNulls
                activeDot={{ r: 4 }}
                dot={(p: { cx?: number; cy?: number; index?: number }) => {
                  if (p.cx === undefined || p.cy === undefined || p.cy === null)
                    return <g key={`${b}${p.index}`} />;
                  const partial = data[p.index ?? 0]?.partial;
                  return (
                    <circle
                      key={`${b}${p.index}`}
                      cx={p.cx}
                      cy={p.cy}
                      r={partial ? 3.5 : 3}
                      fill={partial ? "var(--card)" : colors[b]}
                      stroke={colors[b]}
                      strokeWidth={1.5}
                    />
                  );
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-sm"
            style={{ background: colors[client], opacity: 0.2 }}
          />
          The shaded area is {clientName}&apos;s usual run-to-run variation: a move outside it is a
          clear change, a move inside it may just be chance.
        </span>
        {hasPartial ? (
          <span className="inline-flex items-center gap-2">
            <Dot color="transparent" className="border-muted-foreground border-[1.5px]" />
            Open circles mark weeks with some answers missing.
          </span>
        ) : null}
      </p>

      <details className="text-sm">
        <summary className="text-primary cursor-pointer font-medium underline-offset-4 hover:underline">
          Show the numbers
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full max-w-2xl text-left">
            <caption className="sr-only">Score by week, 0 to 100</caption>
            <thead>
              <tr className="text-muted-foreground border-b">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Week
                </th>
                {brands.map((b) => (
                  <th key={b} scope="col" className="py-2 pr-4 text-right font-medium">
                    {name(b)}
                  </th>
                ))}
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {clientName}&apos;s usual range
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {points.map((p) => (
                <tr key={p.week} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    Week {p.week}
                    {p.partial ? (
                      <span className="text-muted-foreground"> (some answers missing)</span>
                    ) : null}
                  </th>
                  {brands.map((b) => (
                    <td key={b} className="py-2 pr-4 text-right">
                      {score(p.scores[b])}
                    </td>
                  ))}
                  <td className="text-muted-foreground py-2 pr-4 text-right">
                    {p.low === null || p.high === null
                      ? "n/a"
                      : `${score(p.low)} to ${score(p.high)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
