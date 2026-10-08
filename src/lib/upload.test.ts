import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { filesFromZip, isDataFile, readPicked, type PickedFile } from "./upload";

async function zipOf(entries: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) zip.file(path, content);
  return zip.generateAsync({ type: "uint8array" });
}

const picked = (name: string, content: string | Uint8Array): PickedFile => ({
  name,
  text: async () => (typeof content === "string" ? content : new TextDecoder().decode(content)),
  arrayBuffer: async () => {
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  },
});

describe("isDataFile", () => {
  it("accepts answer, company and question files", () => {
    expect(isDataFile("responses.jsonl")).toBe(true);
    expect(isDataFile("pack/brands.json")).toBe(true);
    expect(isDataFile("PROMPTS.CSV")).toBe(true);
  });

  it("ignores other files, hidden files and macOS zip clutter", () => {
    expect(isDataFile("readme.txt")).toBe(false);
    expect(isDataFile(".DS_Store")).toBe(false);
    expect(isDataFile("pack/._responses.jsonl")).toBe(false);
    expect(isDataFile("__MACOSX/pack/responses.jsonl")).toBe(false);
  });
});

describe("filesFromZip", () => {
  it("keeps only data files, by their own names, wherever they sit in the zip", async () => {
    const data = await zipOf({
      "pack/responses.jsonl": '{"response_id":"a"}',
      "pack/brands.json": "{}",
      "pack/notes.txt": "hello",
      "__MACOSX/pack/._brands.json": "junk",
      "pack/.hidden.json": "{}",
    });
    const { files, skipped } = await filesFromZip(data);
    expect(files.map((f) => f.name).sort()).toEqual(["brands.json", "responses.jsonl"]);
    expect(files.find((f) => f.name === "responses.jsonl")!.content).toBe('{"response_id":"a"}');
    expect(skipped).toEqual(["notes.txt"]);
  });

  it("says plainly when a file isn't a zip", async () => {
    await expect(filesFromZip(new TextEncoder().encode("not a zip"), "week7.zip")).rejects.toThrow(
      "week7.zip couldn't be opened as a zip file.",
    );
  });
});

describe("readPicked", () => {
  it("reads loose files and zips together, later files replacing earlier ones", async () => {
    const zip = await zipOf({ "responses.jsonl": "from zip", "prompts.csv": "a,b" });
    const { files, skipped } = await readPicked([
      picked("responses.jsonl", "loose"),
      picked("pack.zip", zip),
      picked("photo.png", "x"),
    ]);
    const byName = Object.fromEntries(files.map((f) => [f.name, f.content]));
    expect(byName).toEqual({ "responses.jsonl": "from zip", "prompts.csv": "a,b" });
    expect(skipped).toEqual(["photo.png"]);
  });
});
