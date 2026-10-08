"use client";

import { useState } from "react";
import { cn } from "cn";
import { Toggle } from "@/components/ui/toggle";
import type { Source } from "@/engine/insights";
import { Dot, MoreButton } from "./parts";

const FIRST = 10;

function Flags({
  src,
  client,
  name,
}: {
  src: Source;
  client: string;
  name: (b: string) => string;
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {src.ownedBy ? (
        <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs">
          {src.ownedBy === client ? "Your own site" : `${name(src.ownedBy)}'s own site`}
        </span>
      ) : null}
      {src.neverClient ? (
        <span className="bg-warn-surface text-warn rounded-full px-2 py-0.5 text-xs font-medium">
          Never next to {name(client)}
        </span>
      ) : src.competitorAhead ? (
        <span className="bg-warn-surface text-warn rounded-full px-2 py-0.5 text-xs">
          {name(src.competitorAhead)} named more often
        </span>
      ) : null}
    </span>
  );
}

/** Websites the AI tools cite, and how often each tracked company is named next to them. */
export function SourcesList({
  list,
  brands,
  client,
  week,
  name,
  colors,
}: {
  list: Source[];
  brands: string[]; // client first
  client: string;
  week: number;
  name: (b: string) => string;
  colors: Record<string, string>;
}) {
  const [own, setOwn] = useState(false);
  const [all, setAll] = useState(false);
  const shown = list.filter((x) => own || !x.ownedBy);
  const rows = all ? shown : shown.slice(0, FIRST);
  const ahead = (x: Source, b: string) =>
    b !== client && (x.mentions[b] ?? 0) > (x.mentions[client] ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-3xl text-sm">
          &ldquo;Answers&rdquo; is how many AI answers up to week {week} cite the site. Each company
          column counts how many of those answers also name that company: a higher number means AI
          names that company more often when it relies on that site.
        </p>
        <Toggle variant="outline" size="sm" pressed={own} onPressedChange={setOwn}>
          Include companies&apos; own sites
        </Toggle>
      </div>

      {shown.length === 0 ? (
        <p className="text-muted-foreground">
          No answers up to week {week} cite {own ? "any site" : "an independent site"}.
        </p>
      ) : (
        <>
          <div className="bg-card hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Sites cited by AI answers up to week {week}, and how often each company is named
                alongside
              </caption>
              <thead className="bg-subtle">
                <tr className="text-muted-foreground border-b">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Site
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Answers
                  </th>
                  {brands.map((b) => (
                    <th key={b} scope="col" className="px-3 py-2.5 text-right font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Dot color={colors[b]} className="size-2" />
                        {name(b)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular">
                {rows.map((x) => (
                  <tr
                    key={x.domain}
                    className={cn(
                      "border-b last:border-0",
                      x.competitorAhead && "bg-warn-surface/40",
                    )}
                  >
                    <th scope="row" className="px-4 py-2.5 font-normal">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{x.domain}</span>
                        <Flags src={x} client={client} name={name} />
                      </span>
                    </th>
                    <td className="px-3 py-2.5 text-right">{x.answers}</td>
                    {brands.map((b) => (
                      <td
                        key={b}
                        className={cn(
                          "px-3 py-2.5 text-right",
                          b === client && "font-medium",
                          ahead(x, b) ? "text-warn font-medium" : "",
                          !x.mentions[b] && "text-muted-foreground",
                        )}
                      >
                        {x.mentions[b] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((x) => (
              <li
                key={x.domain}
                className={cn(
                  "bg-card space-y-2 rounded-xl border p-4",
                  x.competitorAhead && "border-warn/40",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium break-all">{x.domain}</span>
                  <span className="text-muted-foreground tabular shrink-0 text-sm">
                    {x.answers} {x.answers === 1 ? "answer" : "answers"}
                  </span>
                </div>
                <Flags src={x} client={client} name={name} />
                <ul className="tabular grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {brands.map((b) => (
                    <li key={b} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Dot color={colors[b]} className="size-2" />
                        {name(b)}
                      </span>
                      <span className={cn(ahead(x, b) && "text-warn font-medium")}>
                        {x.mentions[b] ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {shown.length > FIRST ? (
            <MoreButton onClick={() => setAll((v) => !v)}>
              {all ? "Show fewer" : `Show all ${shown.length} sites`}
            </MoreButton>
          ) : null}
        </>
      )}
    </div>
  );
}
