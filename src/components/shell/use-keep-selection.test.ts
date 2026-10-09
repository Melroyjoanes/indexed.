import { describe, expect, it, vi } from "vitest";

let current = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => current }));
const { useKeepSelection } = await import("./use-keep-selection");

describe("links between screens", () => {
  it("keep the selected company and week", () => {
    current = new URLSearchParams("as=trakvia&week=5");
    expect(useKeepSelection()("/how-it-works")).toBe("/how-it-works?as=trakvia&week=5");
  });

  it("leave screen-specific filters behind", () => {
    current = new URLSearchParams("week=5&stage=early_research&q=fuel");
    expect(useKeepSelection()("/data")).toBe("/data?week=5");
  });

  it("stay plain when nothing is selected", () => {
    current = new URLSearchParams();
    expect(useKeepSelection()("/")).toBe("/");
  });
});
