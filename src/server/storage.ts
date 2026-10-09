/**
 * Reads the data pack from a private Supabase Storage bucket. Kept apart from
 * source.ts so it can be tested with a stand-in fetch. Only server code
 * imports it: the key must never reach the browser.
 */
import type { SourceFile } from "@/engine/ingest";

const DATA_EXT = /\.(jsonl|json|csv)$/i;

export type StorageResult = { files: SourceFile[]; problem: null } | { files: []; problem: string };

/**
 * All the pack's files, or a problem saying what failed. A partial pack is
 * never returned: a missing facts.json would quietly show "no wrong facts".
 */
export async function readStorage(
  url: string,
  key: string,
  bucket: string,
  fetchFn: typeof fetch = fetch,
): Promise<StorageResult> {
  const base = `${url.replace(/\/$/, "")}/storage/v1/object`;
  const headers: Record<string, string> = key.startsWith("sb_")
    ? { apikey: key }
    : { apikey: key, Authorization: `Bearer ${key}` };
  const fail = (problem: string) => ({ files: [] as [], problem });
  try {
    const list = await fetchFn(`${base}/list/${bucket}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1000 }),
      cache: "no-store",
    });
    if (!list.ok) return fail(`Listing the "${bucket}" bucket failed (HTTP ${list.status}).`);
    const names = ((await list.json()) as { name: string }[])
      .map((o) => o.name)
      .filter((n) => DATA_EXT.test(n));
    const files: SourceFile[] = [];
    for (const name of names) {
      const r = await fetchFn(`${base}/${bucket}/${encodeURIComponent(name)}`, {
        headers,
        cache: "no-store",
      });
      if (!r.ok) return fail(`Reading ${name} from storage failed (HTTP ${r.status}).`);
      files.push({ name, content: await r.text() });
    }
    return { files, problem: null };
  } catch (e) {
    return fail(`Storage couldn't be reached (${e instanceof Error ? e.message : String(e)}).`);
  }
}
