import { describe, expect, it } from "vitest";
import { GRADES, GRADE_ORDER, displayName, formatStorage, variantLabel } from "./catalog";
import { calcCommission, discountPercent, formatPrice, savings } from "./money";

describe("variantLabel", () => {
  it("phone: storage then color name from the finish", () => {
    expect(variantLabel({ storageGb: 128, ramGb: null, option: null, finish: { nameFr: "Noir" } }, "PHONE")).toBe("128 Go, Noir");
  });

  it("laptop: RAM, SSD, color", () => {
    expect(variantLabel({ storageGb: 256, ramGb: 8, option: null, finish: { nameFr: "Gris sidéral" } }, "LAPTOP")).toBe("8 Go, SSD 256 Go, Gris sidéral");
  });

  it("watch: option, color", () => {
    expect(variantLabel({ storageGb: null, ramGb: null, option: "41 mm, GPS", finish: { nameFr: "Minuit" } }, "WATCH")).toBe("41 mm, GPS, Minuit");
  });
});

describe("formatStorage and displayName", () => {
  it("switches to To at 1000 Go", () => {
    expect(formatStorage(512)).toBe("512 Go");
    expect(formatStorage(1000)).toBe("1 To");
  });

  it("drops the brand for Apple and when the model already contains it", () => {
    expect(displayName({ brand: "Apple", model: "iPhone 13" })).toBe("iPhone 13");
    expect(displayName({ brand: "Samsung", model: "Galaxy S23" })).toBe("Samsung Galaxy S23");
  });
});

describe("grading standard", () => {
  it("orders grades best first with strictly falling battery floors", () => {
    const floors = GRADE_ORDER.map((g) => GRADES[g].minBattery);
    expect(floors).toEqual([90, 85, 80, 75]);
  });
});

describe("money", () => {
  it("formats whole dinars without millimes and keeps 3 decimals otherwise", () => {
    expect(formatPrice(1_029_000)).toBe("1 029 DT");
    expect(formatPrice(1_500)).toBe("1,500 DT");
  });

  it("computes savings and discount only when the device is cheaper than new", () => {
    expect(savings(800_000, 1_000_000)).toBe(200_000);
    expect(discountPercent(800_000, 1_000_000)).toBe(20);
    expect(savings(1_000_000, 900_000)).toBeNull();
    expect(discountPercent(1_000_000, null)).toBeNull();
  });

  it("takes a 5 % commission, rounded to the millime", () => {
    expect(calcCommission(1_229_990)).toBe(61_500);
  });
});
