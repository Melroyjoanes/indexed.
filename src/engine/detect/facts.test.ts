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

describe("curly apostrophes", () => {
  it("reads 'doesn’t' like 'doesn't' and keeps the sentence exactly as written", () => {
    const [c] = analyse(
      "Corvane Fleet is fine. It doesn’t integrate with QuickBooks.",
      settings,
    ).claims;
    expect(c).toMatchObject({
      factKey: "integrations",
      wrong: true,
      sentence: "It doesn’t integrate with QuickBooks.",
    });
  });
});

describe("feature negation stays in its own clause", () => {
  // Corvane's fact sheet: GPS tracking and ELD compliance yes; dashcams and payroll no.
  it.each([
    // both statements agree with the fact sheet: nothing is wrong
    ["Corvane Fleet has no dashcams and offers GPS tracking.", []],
    ["Corvane Fleet offers GPS tracking and has no dashcams.", []],
    ["Corvane Fleet offers GPS tracking, but no dashcams.", []],
    ["Corvane Fleet doesn't offer dashcams or payroll.", []],
    // paired controls: the same shapes with a real contradiction are still caught
    ["Corvane Fleet has dashcams and offers GPS tracking.", ["corvane:features.dashcams"]],
    [
      "Corvane Fleet includes GPS tracking and doesn't support ELD compliance.",
      ["corvane:features.eld_compliance"],
    ],
    [
      "Corvane Fleet lacks ELD compliance, but offers dashcams.",
      ["corvane:features.dashcams", "corvane:features.eld_compliance"],
    ],
    [
      "Corvane Fleet offers dashcams and payroll.",
      ["corvane:features.dashcams", "corvane:features.payroll"],
    ],
  ])("%s", (text, expected) => {
    expect([...wrong(text)].sort()).toEqual(expected);
  });
});

describe("founding years and subscription prices", () => {
  it.each([
    // not founding years: feature launches and tenure
    ["Corvane Fleet has offered GPS tracking since 2020.", []],
    ["Corvane Fleet launched its driver app in 2019.", []],
    ["Corvane Fleet has served fleets for ten years.", []],
    // founding years, right and wrong
    ["Corvane Fleet was founded in 2014.", []],
    ["Corvane Fleet was founded in 2009.", ["corvane:founded"]],
    ["Corvane Fleet has been in business since 2011.", ["corvane:founded"]],
    ["Corvane Fleet is fine. It has been around since 2010.", ["corvane:founded"]],
    // not subscription prices: one-off fees
    ["Corvane Fleet charges $100 for installation.", []],
    ["Corvane Fleet charges a $99 setup fee.", []],
    ["Corvane Fleet costs $500 for hardware per vehicle.", []],
    // subscription prices, right and wrong
    ["Corvane Fleet costs $29 per vehicle per month.", []],
    ["Corvane Fleet costs $40 per vehicle.", ["corvane:starting_price_usd"]],
    ["Corvane Fleet charges $35 per truck per month to start.", ["corvane:starting_price_usd"]],
    ["Corvane Fleet is fine. Plans start at about $25.", ["corvane:starting_price_usd"]],
  ])("%s", (text, expected) => {
    expect([...wrong(text)].sort()).toEqual(expected);
  });
});
