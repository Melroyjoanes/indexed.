import "server-only";
import type { SourceFile } from "@/engine/ingest";
import { readDataDir } from "./data-dir";
import { readStorage } from "./storage";

export interface DataSource {
  files: SourceFile[];
  origin: "local" | "storage" | "none";
  /** Why the hosted data couldn't be loaded, when it couldn't. */
  problem: string | null;
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
    const r = await readStorage(url, key, process.env.SUPABASE_BUCKET ?? "data-pack");
    if (r.problem) {
      // fail loud: shown on every screen, and in the server logs for alerting
      console.error(`[data] ${r.problem}`);
      return { files: [], origin: "none", problem: r.problem };
    }
    if (r.files.length) return { files: r.files, origin: "storage", problem: null };
  }
  const files = await readDataDir();
  return { files, origin: files.length ? "local" : "none", problem: null };
}
