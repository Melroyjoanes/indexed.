import { describe, expect, it } from "vitest";
import { similarity } from "./similarity";

// Expected values computed with Python's difflib.SequenceMatcher(None, a, b).ratio()
describe("similarity", () => {
  it.each([
    ["corvain", "corvane", 0.8571428571428571],
    ["trackvia", "trakvia", 0.9333333333333333],
    ["fleet", "fleetora", 0.7692307692307693],
    ["routes", "routelyne", 0.6666666666666666],
    ["abc", "xyz", 0],
    ["same", "same", 1],
  ])("%s vs %s", (a, b, expected) => {
    expect(similarity(a, b)).toBeCloseTo(expected, 10);
  });
});
