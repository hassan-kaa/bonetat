import { describe, expect, it } from "vitest";
import {
  cheapest, initialSelection, matches, optionsFor, resolve, selectionOf, winner, type ConfigOffer,
} from "./configurator";

// A small iPhone-like catalog: 2 storages × 2 finishes, a few grades, one unit per offer
let n = 0;
function offer(o: Partial<ConfigOffer>): ConfigOffer {
  n++;
  return {
    offerId: `o${n}`,
    variantId: `${o.storageGb ?? 128}-${o.finishId ?? "noir"}`,
    grade: "BON",
    storageGb: 128,
    ramGb: null,
    option: null,
    finishId: "noir",
    colorHex: "#000",
    priceMillimes: 1_000_000,
    batteryHealth: 85,
    warrantyMonths: 12,
    qualityScore: 90,
    listedAt: 1_000,
    ...o,
  };
}

describe("cheapest", () => {
  it("returns null for no offers", () => {
    expect(cheapest([])).toBeNull();
  });

  it("picks the lowest price", () => {
    const a = offer({ priceMillimes: 900_000 });
    const b = offer({ priceMillimes: 800_000 });
    expect(cheapest([a, b])).toBe(b);
  });

  it("breaks a price tie with the partner quality score", () => {
    const a = offer({ qualityScore: 91 });
    const b = offer({ qualityScore: 97 });
    expect(cheapest([a, b])).toBe(b);
  });

  it("breaks a full tie with the unit listed first", () => {
    const later = offer({ listedAt: 5_000 });
    const first = offer({ listedAt: 2_000 });
    expect(cheapest([later, first])).toBe(first);
  });
});

describe("matching on finish ids", () => {
  it("compares the color axis by finish id, not by name", () => {
    const o = offer({ finishId: "f-bleu" });
    expect(matches(o, { ...selectionOf(o) })).toBe(true);
    expect(matches(o, { ...selectionOf(o), color: "Bleu" })).toBe(false);
  });

  it("selectionOf stores the finish id on the color axis", () => {
    expect(selectionOf(offer({ finishId: "f-vert" })).color).toBe("f-vert");
  });

  it("winner returns the cheapest unit of the exact selection", () => {
    const a = offer({ priceMillimes: 1_100_000 });
    const b = offer({ priceMillimes: 1_050_000 });
    const other = offer({ priceMillimes: 500_000, finishId: "blanc" });
    expect(winner([a, b, other], selectionOf(a))).toBe(b);
  });
});

describe("resolve", () => {
  const noir128 = offer({ storageGb: 128, finishId: "noir", grade: "BON", priceMillimes: 1_000_000 });
  const noir256 = offer({ storageGb: 256, finishId: "noir", grade: "BON", priceMillimes: 1_200_000 });
  const blanc256 = offer({ storageGb: 256, finishId: "blanc", grade: "TRES_BON", priceMillimes: 1_400_000 });
  const all = [noir128, noir256, blanc256];

  it("keeps the other axes when the new value allows it", () => {
    expect(resolve(all, selectionOf(noir128), "storage")).toBe(noir128);
    expect(resolve(all, { ...selectionOf(noir128), storage: 256 }, "storage")).toBe(noir256);
  });

  it("gives up lower-priority axes before higher ones", () => {
    // Blanc only exists in 256 / TRES_BON: storage and grade follow the color
    expect(resolve(all, { ...selectionOf(noir128), color: "blanc" }, "color")).toBe(blanc256);
  });

  it("returns null when nothing is for sale with that value", () => {
    expect(resolve(all, { ...selectionOf(noir128), color: "rose" }, "color")).toBeNull();
  });
});

describe("optionsFor", () => {
  it("shows the exact price you land on, and null when sold out", () => {
    const a = offer({ finishId: "noir", priceMillimes: 1_000_000 });
    const b = offer({ finishId: "blanc", priceMillimes: 1_090_000 });
    const opts = optionsFor([a, b], selectionOf(a), "color", ["noir", "blanc", "rose"]);
    expect(opts.map((o) => o.target?.priceMillimes ?? null)).toEqual([1_000_000, 1_090_000, null]);
    expect(opts.map((o) => o.selected)).toEqual([true, false, false]);
  });
});

describe("initialSelection", () => {
  const cheapBon = offer({ variantId: "v1", grade: "BON", priceMillimes: 900_000 });
  const v1Tb = offer({ variantId: "v1", grade: "TRES_BON", priceMillimes: 1_000_000 });
  const v2 = offer({ variantId: "v2", grade: "TRES_BON", priceMillimes: 1_300_000 });
  const all = [cheapBon, v1Tb, v2];

  it("honours the requested variant and grade", () => {
    expect(initialSelection(all, { variantId: "v2", grade: "TRES_BON" })).toBe(v2);
  });

  it("falls back to the cheapest unit of the variant when the grade is missing", () => {
    expect(initialSelection(all, { variantId: "v1", grade: "COMME_NEUF" })).toBe(cheapBon);
  });

  it("ignores an unknown grade string and returns the overall cheapest", () => {
    expect(initialSelection(all, { grade: "PAS_UN_ETAT" })).toBe(cheapBon);
  });
});
