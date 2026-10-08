import "server-only";
import type { SourceFile } from "@/engine/ingest";
import { readDataDir } from "./data-dir";

const DATA_EXT = /\.(jsonl|json|csv)$/i;

export interface DataSource {
  files: SourceFile[];
  origin: "local" | "storage" | "none";
}

/**
 * Where the data pack comes from:
 * - ./data on disk (running locally), or
 * - a private Supabase Storage bucket when SUPABASE_URL and SUPABASE_SECRET_KEY
 *   are set (the hosted demo; the data can't live in the public repo).
 * The secret key only ever runs on the server.
 */
export async function loadDataSource(): Promise<DataSource> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    const files = await fromStorage(url, key, process.env.SUPABASE_BUCKET ?? "data-pack");
    if (files.length) return { files, origin: "storage" };
  }
  const files = await readDataDir();
  return { files, origin: files.length ? "local" : "none" };
}

async function fromStorage(url: string, key: string, bucket: string): Promise<SourceFile[]> {
  const base = `${url.replace(/\/$/, "")}/storage/v1/object`;
  const headers: Record<string, string> = key.startsWith("sb_")
    ? { apikey: key }
    : { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const list = await fetch(`${base}/list/${bucket}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1000 }),
      cache: "no-store",
    });
    if (!list.ok) return [];
    const names = ((await list.json()) as { name: string }[])
      .map((o) => o.name)
      .filter((n) => DATA_EXT.test(n));
    return Promise.all(
      names.map(async (name) => {
        const r = await fetch(`${base}/${bucket}/${encodeURIComponent(name)}`, {
          headers,
          cache: "no-store",
        });
        return { name, content: r.ok ? await r.text() : "" };
      }),
    );
  } catch {
    return [];
  }
}
