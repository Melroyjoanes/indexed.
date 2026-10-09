import { describe, expect, it } from "vitest";
import { readStorage } from "./storage";

/** A stand-in for Supabase Storage: a list of files and their HTTP statuses. */
function fakeStorage(files: Record<string, { status: number; body?: string }>, listStatus = 200) {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/object/list/"))
      return new Response(JSON.stringify(Object.keys(files).map((name) => ({ name }))), {
        status: listStatus,
      });
    const name = decodeURIComponent(url.split("/").pop()!);
    const f = files[name]!;
    return new Response(f.body ?? "", { status: f.status });
  }) as typeof fetch;
}

const read = (fetchFn: typeof fetch) =>
  readStorage("https://x.supabase.co", "sb_secret_test", "data-pack", fetchFn);

describe("reading the data pack from storage", () => {
  it("returns every data file", async () => {
    const r = await read(
      fakeStorage({
        "facts.json": { status: 200, body: "{}" },
        "responses.jsonl": { status: 200, body: "{}" },
        "notes.txt": { status: 200 },
      }),
    );
    expect(r.problem).toBeNull();
    expect(r.files.map((f) => f.name)).toEqual(["facts.json", "responses.jsonl"]);
  });

  it("refuses a partial pack when one file fails", async () => {
    const r = await read(
      fakeStorage({
        "facts.json": { status: 500 },
        "responses.jsonl": { status: 200, body: "{}" },
      }),
    );
    expect(r).toEqual({ files: [], problem: "Reading facts.json from storage failed (HTTP 500)." });
  });

  it("says when the bucket can't be listed", async () => {
    const r = await read(fakeStorage({}, 403));
    expect(r.problem).toBe('Listing the "data-pack" bucket failed (HTTP 403).');
  });

  it("says when storage can't be reached, without echoing the key", async () => {
    const r = await read((async () => {
      throw new Error("fetch failed");
    }) as typeof fetch);
    expect(r.problem).toBe("Storage couldn't be reached (fetch failed).");
    expect(r.problem).not.toContain("sb_secret_test");
  });
});
