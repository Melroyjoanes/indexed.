import { describe, expect, it } from "vitest";
import { BRANDS, CONFIG, FACTS, settings } from "../../tests/fixtures/pack";
import { brandKey, buildSettings, focusBrands, viewAs } from "./config";

describe("config", () => {
  it("derives brand keys that match facts.json", () => {
    expect(brandKey("Gridwell Systems")).toBe("gridwell");
    expect(brandKey("Corvane Fleet")).toBe("corvane");
  });

  it("reads roles from brands.json and spellings from tracker.json", () => {
    expect(settings.client).toBe("corvane");
    expect(settings.brands.corvane?.lookalikes).toEqual(["Corvane Logistics"]);
    expect(settings.brands.fleetora?.role).toBe("other");
    expect(focusBrands(settings)).toEqual(["corvane", "trakvia", "routelyne", "gridwell"]);
  });

  it("can view the market from a competitor's side without code changes", () => {
    const t = viewAs(settings, "trakvia");
    expect(t.client).toBe("trakvia");
    expect(t.brands.corvane?.role).toBe("tracked");
    expect(focusBrands(t)[0]).toBe("trakvia");
  });

  it("honours a client set in config", () => {
    const s = buildSettings(BRANDS, { ...CONFIG, client: "gridwell" }, FACTS);
    expect(s.client).toBe("gridwell");
  });

  it("ignores note keys in facts.json", () => {
    const s = buildSettings(BRANDS, CONFIG, { _note: "x", ...FACTS });
    expect(Object.keys(s.facts)).not.toContain("_note");
  });
});
