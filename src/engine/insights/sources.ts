/** Which websites the AI engines cite, and which companies appear alongside them. */
import { domainOf } from "../ingest";
import type { Results } from "../run";

export interface Source {
  domain: string;
  answers: number;
  ownedBy: string | null; // a tracked company's own site
  mentions: Record<string, number>; // company -> answers citing this site that name it
  neverClient: boolean; // cited next to competitors but never next to the client
  competitorAhead: string | null; // a tracked competitor named more often than the client
}

export function sources(res: Results, through: number): Source[] {
  const s = res.pack.settings;
  const tracked = Object.values(s.brands)
    .filter((b) => b.role === "tracked")
    .map((b) => b.key);
  const named = new Map<string, Set<string>>();
  for (const m of res.mentions)
    if (m.mentioned) named.set(m.responseId, (named.get(m.responseId) ?? new Set()).add(m.brand));

  const bySite = new Map<string, Set<string>>();
  for (const a of res.answers) {
    if (!a.ok || a.week === null || a.week > through) continue;
    for (const d of new Set(a.citations.map(domainOf)))
      bySite.set(d, (bySite.get(d) ?? new Set()).add(a.responseId));
  }
  return [...bySite.entries()]
    .map(([domain, ids]) => {
      const mentions: Record<string, number> = {};
      for (const id of ids)
        for (const b of named.get(id) ?? []) mentions[b] = (mentions[b] ?? 0) + 1;
      const client = mentions[s.client] ?? 0;
      const lead = [...tracked].sort((a, b) => (mentions[b] ?? 0) - (mentions[a] ?? 0))[0] ?? null;
      const owner = Object.values(s.brands).find(
        (b) => b.website && domain.endsWith(b.website.toLowerCase()),
      );
      return {
        domain,
        answers: ids.size,
        ownedBy: owner?.key ?? null,
        mentions,
        neverClient: client === 0 && tracked.some((b) => (mentions[b] ?? 0) > 0),
        competitorAhead: lead && (mentions[lead] ?? 0) > client ? lead : null,
      };
    })
    .sort((a, b) => b.answers - a.answers || a.domain.localeCompare(b.domain));
}
