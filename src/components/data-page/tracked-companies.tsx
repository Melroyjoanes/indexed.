"use client";

import { useMemo } from "react";
import { useDataset } from "@/components/data/dataset-provider";
import { trackedCompanies } from "@/engine/health";
import { listOf } from "@/engine/insights";
import { brandColors } from "@/lib/brands";

export function TrackedCompanies() {
  const { results } = useDataset();
  const s = results.pack.settings;
  const groups = useMemo(() => trackedCompanies(s), [s]);
  const colors = useMemo(() => brandColors(s), [s]);

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-3">
        {groups.map((g) => (
          <div key={g.role} className="space-y-3">
            <h3 className="text-muted-foreground text-sm font-medium">{g.label}</h3>
            <ul className="space-y-3">
              {g.companies.map((c) => (
                <li key={c.key} className="bg-card space-y-1.5 rounded-xl border p-4">
                  <p className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: colors[c.key] }}
                      aria-hidden
                    />
                    {c.name}
                  </p>
                  {c.website ? <p className="text-muted-foreground text-sm">{c.website}</p> : null}
                  <p className="text-sm">
                    <span className="text-muted-foreground">Also matched: </span>
                    {c.spellings.length ? listOf(c.spellings) : "no other spellings listed"}
                  </p>
                  {c.lookalikes.length ? (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Never counted: </span>
                      {listOf(c.lookalikes)}, a different company
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        Companies come from brands.json in the data pack; spellings, look-alikes and scoring come
        from config/tracker.json. Adding a competitor or a new spelling is a change to those files,
        with no code change.
      </p>
    </div>
  );
}
