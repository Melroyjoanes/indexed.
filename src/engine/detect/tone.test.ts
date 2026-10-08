import { describe, expect, it } from "vitest";
import { settings } from "../../../tests/fixtures/pack";
import { analyse } from ".";

const tone = (text: string, brand: string) => analyse(text, settings).tones.get(brand);

describe("tone of a single sentence", () => {
  it.each([
    ["For small fleets, Corvane is a strong pick.", "recommended"],
    ["If I had to pick one for small fleets, it would be Corvane.", "recommended"],
    [
      "Corvane stands out for maintenance alerts, which is why it's the top suggestion here.",
      "recommended",
    ],
    ["Other options include Corvane and Fleetora.", "neutral"],
    ["You may also come across Corvane Fleet.", "neutral"],
    ["Corvane also operates in this space, with a driver app.", "neutral"],
    ["Corvane is an option, but setup reportedly takes longer than expected.", "negative"],
    ["Corvane offers maintenance alerts, but some users report slow customer support.", "negative"],
    [
      "Some fleets like Corvane for its dashboard, although its contract terms have drawn complaints.",
      "negative",
    ],
    ["Avoid Corvane if you run fewer than 100 vehicles.", "not_recommended"],
    [
      "Corvane looks impressive in demos, but for small fleets it isn't the right choice.",
      "not_recommended",
    ],
    ["For small fleets, Corvane is likely overkill, so I'd skip it.", "not_recommended"],
    ["I wouldn't choose Corvane for a 20-truck fleet.", "not_recommended"],
    ["Corvane would not be my pick for a 10-truck operation.", "not_recommended"],
  ])("%s", (text, expected) => {
    expect(tone(text, "corvane")).toBe(expected);
  });
});

describe("tone across an answer", () => {
  it("lets the part after 'but' decide a mixed sentence", () => {
    const text =
      "Corvane has had a few billing complaints, but overall it's still one of the better choices for small fleets.";
    expect(tone(text, "corvane")).toBe("recommended");
  });

  it("uses the final verdict when earlier criticism is outweighed", () => {
    expect(
      tone(
        "Some users find Corvane expensive at first. Even so, for small fleets it's the one I'd pick.",
        "corvane",
      ),
    ).toBe("recommended");
  });

  it("uses the final verdict when earlier praise is reversed", () => {
    expect(
      tone(
        "Corvane has a polished interface and decent reviews. That said, for small fleets I'd skip it.",
        "corvane",
      ),
    ).toBe("not_recommended");
  });

  it("lets a bottom line override a neutral mention", () => {
    const text =
      "- Routelyne also operates in this space.\n\n**Bottom line:** for tight budgets, I'd start with RouteLyne.";
    expect(tone(text, "routelyne")).toBe("recommended");
  });

  it("gives each company its own verdict", () => {
    const r = analyse(
      "- Trakvia is well worth shortlisting for dashcams.\n" +
        "- Routelyne covers the basics, though reviewers mention a clunky mobile app.\n" +
        "- Gridwell is probably not the right fit for small fleets.",
      settings,
    ).tones;
    expect(Object.fromEntries(r)).toEqual({
      trakvia: "recommended",
      routelyne: "negative",
      gridwell: "not_recommended",
    });
  });

  it("reads the label in front of a list item as part of the same company's verdict", () => {
    expect(tone("1. **Corvane Fleet**: You may also come across Corvain Fleet.", "corvane")).toBe(
      "neutral",
    );
  });
});

describe("tables", () => {
  it.each([
    ["Top pick", "recommended"],
    ["Strong choice", "recommended"],
    ["Best overall", "recommended"],
    ["Option to compare", "neutral"],
    ["Alternative", "neutral"],
    ["Also available", "neutral"],
    ["Mixed reviews", "negative"],
    ["Fine, but support complaints", "negative"],
    ["Basic, some complaints", "negative"],
    ["Not recommended here", "not_recommended"],
    ["Skip at your size", "not_recommended"],
    ["Not for small fleets", "not_recommended"],
  ])("verdict column '%s' -> %s", (verdict, expected) => {
    const text = `| Provider | Best for | Verdict |\n|---|---|---|\n| Trakvia | Video safety | ${verdict} |`;
    expect(tone(text, "trakvia")).toBe(expected);
  });
});

describe("direct advice", () => {
  it.each([
    ["For this small fleet, choose Corvane Fleet.", "recommended"],
    ["Choose Corvane if compliance matters most.", "recommended"],
    ["If budget matters, go with Corvane.", "recommended"],
    ["I would pick Corvane for a 20-truck fleet.", "recommended"],
    ["Nevertheless, do not choose Corvane for this buyer.", "not_recommended"],
    ["Don't go with Corvane if you need dashcams.", "not_recommended"],
    ["Never buy Corvane for an enterprise fleet.", "not_recommended"],
  ])("%s", (text, expected) => {
    expect(tone(text, "corvane")).toBe(expected);
  });

  it("doesn't read 'choose' in the middle of a description as advice", () => {
    expect(tone("Fleets that choose Corvane get maintenance alerts.", "corvane")).toBe("neutral");
  });
});

describe("negated praise with contractions", () => {
  it.each([
    "Corvane isn't something I'd suggest for regulated carriers.",
    "Corvane wouldn't be my pick for a 10-truck operation.",
    "Corvane isn’t my recommendation here.",
  ])("%s", (text) => {
    expect(tone(text, "corvane")).toBe("not_recommended");
  });
});
