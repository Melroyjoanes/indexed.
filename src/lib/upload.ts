/**
 * Turning dropped or picked files into data pack files. A .zip is opened in
 * the browser (jszip is only loaded when a zip arrives) and only the data
 * files inside it are kept; folders inside the zip don't matter.
 */
import type { SourceFile } from "@/engine/ingest";

const DATA_EXT = /\.(jsonl|json|csv)$/i;

/** The file's own name, without any folder it sat in. */
export const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** A data file worth reading: .jsonl, .json or .csv, not hidden, not macOS zip clutter. */
export function isDataFile(path: string): boolean {
  if (/(^|[\\/])__MACOSX[\\/]/.test(path)) return false;
  const name = baseName(path);
  return !name.startsWith(".") && DATA_EXT.test(name);
}

export const isZip = (name: string) => /\.zip$/i.test(name);

export interface ReadResult {
  files: SourceFile[];
  skipped: string[]; // names that weren't data files
}

/** Data files inside a zip, by their own names. If two share a name, the first is kept. */
export async function filesFromZip(
  data: ArrayBuffer | Uint8Array,
  zipName = "the zip",
): Promise<ReadResult> {
  const { default: JSZip } = await import("jszip");
  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error(`${zipName} couldn't be opened as a zip file.`);
  }
  const files: SourceFile[] = [];
  const skipped: string[] = [];
  const entries = Object.values(zip.files)
    .filter((e) => !e.dir)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const name = baseName(entry.name);
    if (!isDataFile(entry.name)) {
      if (!/(^|[\\/])__MACOSX[\\/]/.test(entry.name) && !name.startsWith(".")) skipped.push(name);
      continue;
    }
    if (files.some((f) => f.name === name)) continue;
    files.push({ name, content: await entry.async("string") });
  }
  return { files, skipped };
}

/** Anything with a name and its bytes or text, so tests don't need a browser File. */
export interface PickedFile {
  name: string;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Reads loose data files and zips together. Later files replace earlier ones of the same name. */
export async function readPicked(picked: PickedFile[]): Promise<ReadResult> {
  const byName = new Map<string, SourceFile>();
  const skipped: string[] = [];
  for (const f of picked) {
    if (isZip(f.name)) {
      const z = await filesFromZip(await f.arrayBuffer(), f.name);
      for (const file of z.files) byName.set(file.name, file);
      skipped.push(...z.skipped);
    } else if (isDataFile(f.name)) {
      byName.set(baseName(f.name), { name: baseName(f.name), content: await f.text() });
    } else skipped.push(baseName(f.name));
  }
  return { files: [...byName.values()], skipped };
}
