import { describe, expect, it } from "vitest";
import { settings } from "../../../tests/fixtures/pack";
import { analyse } from ".";
import { findMentions, positions } from "./mentions";

const found = (text: string) => Object.fromEntries(positions(findMentions(text, settings).hits));

describe("finding companies", () => {
  it.each([
    ["Corvane Fleet is a strong pick.", "corvane"],
    ["CORVANE Fleet is a strong pick.", "corvane"],
    ["CorvaneFleet is a strong pick.", "corvane"],
    ["I'd start with corvanefleet.com.", "corvane"],
    ["I'd recommend Corvain Fleet.", "corvane"],
    ["Corvaine has a nice app.", "corvane"],
    ["Trackvia is popular with safety managers.", "trakvia"],
    ["TrakVia is the best overall option.", "trakvia"],
    ["Route Lyne stands out for budget GPS tracking.", "routelyne"],
    ["Route-Lyne is often recommended.", "routelyne"],
    ["GridWell can work.", "gridwell"],
    ["gridwell.io offers analytics.", "gridwell"],
    ["Check out www.corvanefleet.com for pricing.", "corvane"],
    ["NovaHaul is a reliable choice.", "novahaul"],
  ])("%s -> %s", (text, brand) => {
    expect(found(text)).toHaveProperty(brand);
  });

  it("never counts Corvane Logistics as the client", () => {
    expect(
      found("Not to be confused with Corvane Logistics, a freight brokerage based in Ohio."),
    ).toEqual({});
  });

  it("still finds the real Corvane in an answer that also mentions Corvane Logistics", () => {
    const text =
      "Corvane Fleet is an option, but setup takes longer than expected.\n\n" +
      "Not to be confused with Corvane Logistics, a freight brokerage based in Ohio.";
    expect(found(text)).toEqual({ corvane: 1 });
  });

  it("doesn't mistake ordinary words for company names", () => {
    expect(
      found("Fleet tracking helps you plan routes better and cut fuel for your fleet."),
    ).toEqual({});
  });

  it("orders companies by their first mention", () => {
    const text =
      "- Fleetora covers the basics.\n- RouteLyne is cheap.\n- Corvane is solid.\n" +
      "- Fleetora again.\n**Bottom line:** I'd start with Routelyne.";
    expect(found(text)).toEqual({ fleetora: 1, routelyne: 2, corvane: 3 });
  });

  it("reads company names inside tables", () => {
    const text =
      "| Provider | Best for | Verdict |\n|---|---|---|\n| Novahaul | Field service | Top pick |\n| Trakvia | Video safety | Alternative |";
    expect(found(text)).toEqual({ novahaul: 1, trakvia: 2 });
  });

  it("keeps the original spelling and character positions for highlighting", () => {
    const { hits } = findMentions("Try corvanefleet.com today", settings);
    expect(hits[0]).toMatchObject({
      start: 4,
      end: 20,
      surface: "corvanefleet.com",
      how: "website",
    });
  });
});

describe("a sources list written into the answer", () => {
  it("doesn't count the sites listed under it as mentions", () => {
    const r = analyse(
      "Fleetora is the easiest to roll out.\n\nSources: fleetora.com, trakvia.com, routelyne.com",
      settings,
    );
    expect([...r.positions.keys()]).toEqual(["fleetora"]);
  });

  it("still counts companies named in the answer itself", () => {
    const r = analyse("Trakvia and Fleetora both work.\n\nSources: trakvia.com", settings);
    expect([...r.positions.keys()]).toEqual(["trakvia", "fleetora"]);
  });
});
