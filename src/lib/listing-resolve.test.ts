import { describe, expect, it } from "vitest";
import { specsFromExtraction } from "./listing-resolve";

describe("specsFromExtraction", () => {
  it("keeps model specs, drops the origin and any contact detail", () => {
    const specs = specsFromExtraction({
      screen: "14 pouces, 1920×1200",
      otherSpecs: [
        { label: "Provenance", value: "Officiel" },
        { label: "Clavier", value: "Rétroéclairé" },
        { label: "Contact", value: "26 032 547" },
      ],
    });
    expect(specs).toEqual([
      { label: "Écran", value: "14 pouces, 1920×1200" },
      { label: "Clavier", value: "Rétroéclairé" },
    ]);
  });
});
