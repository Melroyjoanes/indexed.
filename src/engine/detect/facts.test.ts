import { describe, expect, it } from "vitest";
import { settings } from "../../../tests/fixtures/pack";
import { analyse } from ".";

const wrong = (text: string) =>
  new Set(
    analyse(text, settings)
      .claims.filter((c) => c.wrong)
      .map((c) => `${c.brand}:${c.factKey}`),
  );

describe("wrong facts", () => {
  it("follows 'It' back to the last company named", () => {
    expect(
      wrong(
        "If I had to pick one for small fleets, it would be Corvane. It's based in Columbus, Georgia.",
      ),
    ).toEqual(new Set(["corvane:hq"]));
  });

  it("checks a city on its own against the company's city", () => {
    expect(wrong("Corvane Fleet is solid. The company is headquartered in Chicago.")).toEqual(
      new Set(["corvane:hq"]),
    );
    expect(wrong("Gridwell Systems is solid. The company is headquartered in Chicago.")).toEqual(
      new Set(),
    );
  });

  it("doesn't flag correct facts", () => {
    const text =
      "Corvane Fleet focuses on GPS tracking. It's based in Columbus, Ohio, and has been around since 2014. " +
      "Pricing starts at $29 per vehicle per month. It integrates with QuickBooks and WEX fuel cards. " +
      "ELD compliance is included out of the box.";
    expect(wrong(text)).toEqual(new Set());
  });

  it("flags a wrong year, price, feature, missing feature and integration", () => {
    const text =
      "Corvane Fleet is an option. It was founded in 2009. Expect to pay from $49 per vehicle each month. " +
      "It also includes built-in AI dashcams. Note that it doesn't support ELD compliance, so you'd need a separate tool. " +
      "It doesn't integrate with QuickBooks.";
    expect(wrong(text)).toEqual(
      new Set([
        "corvane:founded",
        "corvane:starting_price_usd",
        "corvane:features.dashcams",
        "corvane:features.eld_compliance",
        "corvane:integrations",
      ]),
    );
  });

  it("checks competitors too", () => {
    expect(wrong("Routelyne also operates in this space. It also handles ELD compliance.")).toEqual(
      new Set(["routelyne:features.eld_compliance"]),
    );
    expect(
      wrong("Trakvia is worth a look. Plans start at about $25 per vehicle per month."),
    ).toEqual(new Set(["trakvia:starting_price_usd"]));
  });

  it("reads other ways of saying the same thing", () => {
    expect(wrong("Corvane Fleet charges $35 per truck per month to start.")).toEqual(
      new Set(["corvane:starting_price_usd"]),
    );
    expect(wrong("Corvane Fleet lacks fuel card support.")).toEqual(
      new Set(["corvane:features.fuel_card_integration"]),
    );
    expect(wrong("Trakvia connects to QuickBooks out of the box.")).toEqual(
      new Set(["trakvia:integrations"]),
    );
  });

  it("ignores market price ranges that aren't about one company", () => {
    expect(
      wrong(
        "Corvane Fleet is good. Fleet GPS tracking usually costs between $15 and $60 per vehicle per month.",
      ),
    ).toEqual(new Set());
  });

  it("doesn't read a description of the buyer as a product claim", () => {
    expect(
      wrong(
        "If you're shopping for carriers that need ELD compliance, Routelyne is hard to beat thanks to low pricing.",
      ),
    ).toEqual(new Set());
  });

  it("ignores facts about the look-alike company", () => {
    expect(
      wrong(
        "Corvane Fleet is fine.\n\nNot to be confused with Corvane Logistics, a freight brokerage based in Ohio. It was founded in 1999.",
      ),
    ).toEqual(new Set());
  });

  it("leaves claims the fact sheet doesn't cover alone", () => {
    expect(
      wrong(
        "Corvane Fleet is popular. It has a 4.6-star average on Capterra. It's especially popular with HVAC contractors.",
      ),
    ).toEqual(new Set());
  });

  it("doesn't let a sentence that starts in lowercase inherit the previous company's facts", () => {
    expect(
      wrong(
        "It's Corvane. It's based in Columbus, Ohio, and has been around since 2014. gridwell.io offers analytics.",
      ),
    ).toEqual(new Set());
  });

  it("keeps the whole sentence as evidence", () => {
    const c = analyse("Corvane Fleet is fine. It was founded in 2009.", settings).claims[0];
    expect(c).toMatchObject({
      factKey: "founded",
      claimed: "2009",
      actual: "2014",
      sentence: "It was founded in 2009.",
    });
  });
});
