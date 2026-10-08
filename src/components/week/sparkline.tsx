"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

/** Tiny score trend for a card. Open dots mark weeks with missing answers. */
export function Sparkline({
  points,
  color,
}: {
  points: { week: number; score: number | null; partial: boolean }[];
  color: string;
}) {
  if (points.length < 2) return <div className="h-10" />;
  return (
    <div className="h-10" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={[0, 100]} />
          <Line
            type="monotone"
            dataKey="score"
            stroke={color}
            strokeWidth={2}
            isAnimationActive={false}
            connectNulls
            dot={(p: { cx?: number; cy?: number; index?: number }) => {
              const pt = points[p.index ?? 0];
              if (!pt?.partial || p.cx === undefined || p.cy === undefined)
                return <g key={p.index} />;
              return (
                <circle
                  key={p.index}
                  cx={p.cx}
                  cy={p.cy}
                  r={3}
                  fill="var(--card)"
                  stroke={color}
                  strokeWidth={1.5}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
