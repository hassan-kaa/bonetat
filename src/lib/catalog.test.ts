import { describe, expect, it } from "vitest";
import { GRADES, GRADE_ORDER, MIN_BATTERY_HEALTH, batteryProblem, displayName, formatStorage, variantLabel } from "./catalog";
import { COMMISSION_LABEL, calcCommission, discountPercent, formatPrice, savings } from "./money";

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
  it("orders grades best first", () => {
    expect(GRADE_ORDER.map((g) => GRADES[g].level)).toEqual([4, 3, 2, 1]);
  });

  it("never mentions battery: the grade is about appearance only", () => {
    for (const g of GRADE_ORDER) {
      expect([GRADES[g].description, ...GRADES[g].criteria].join(" ")).not.toMatch(/batterie/i);
    }
  });
});

describe("batteryProblem", () => {
  it("accepts any grade's unit from the 75 % floor up to 100 %", () => {
    expect(batteryProblem("PHONE", MIN_BATTERY_HEALTH)).toBeNull();
    expect(batteryProblem("PHONE", 100)).toBeNull();
  });

  it("rejects a missing, too low or impossible value", () => {
    expect(batteryProblem("PHONE", null)).toMatch(/Indiquez/);
    expect(batteryProblem("LAPTOP", 74)).toMatch(/remplacez-la/);
    expect(batteryProblem("WATCH", 101)).toMatch(/100 %/);
  });

  it("skips devices without a battery", () => {
    expect(batteryProblem("CONSOLE", null)).toBeNull();
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

  it("takes a 2.5 % commission, rounded to the millime, shown unrounded to stores", () => {
    expect(calcCommission(1_500_000)).toBe(37_500);
    expect(calcCommission(1_229_990)).toBe(30_750);
    expect(COMMISSION_LABEL).toBe("2,5 %");
  });
});
