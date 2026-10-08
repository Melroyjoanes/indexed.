import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SourceFile } from "@/engine/ingest";

const DATA_EXT = /\.(jsonl|json|csv)$/i;

/** Reads the data pack files from a folder (default: ./data). */
export async function readDataDir(dir = path.join(process.cwd(), "data")): Promise<SourceFile[]> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const files = names.filter((n) => DATA_EXT.test(n) && !n.startsWith("."));
  return Promise.all(
    files.map(async (name) => ({ name, content: await readFile(path.join(dir, name), "utf8") })),
  );
}
