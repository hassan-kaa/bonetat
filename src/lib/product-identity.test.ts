import { describe, expect, it } from "vitest";
import { canonicalKey, editDistance, modelName, nearDuplicates, splitModel, type KnownProduct } from "./product-identity";

describe("canonicalKey", () => {
  it("ignores case, accents, spacing inside the line, and generation spelling", () => {
    const a = canonicalKey({ brand: "HP", line: "EliteBook", modelNumber: "8 G1i" });
    expect(a).toBe("hp|elitebook|8 g1i");
    expect(canonicalKey({ brand: "hp", line: "Elite Book", modelNumber: "8 g1i" })).toBe(a);
    expect(canonicalKey({ brand: "Lenovo", line: "ThinkPad", modelNumber: "T14 Gen 2" })).toBe(canonicalKey({ brand: "Lenovo", line: "Thinkpad", modelNumber: "T14 G2" }));
  });

  it("treats a number with or without the line's last word as the same model", () => {
    expect(canonicalKey({ brand: "Samsung", line: "Galaxy S", modelNumber: "S23" })).toBe(canonicalKey({ brand: "Samsung", line: "Galaxy S", modelNumber: "23" }));
    expect(canonicalKey({ brand: "Oppo", line: "Reno", modelNumber: "Reno4 Pro" })).toBe(canonicalKey({ brand: "Oppo", line: "Reno", modelNumber: "4 Pro" }));
    expect(canonicalKey({ brand: "Huawei", line: "P", modelNumber: "P30" })).toBe("huawei|p|30");
    expect(canonicalKey({ brand: "HP", line: "EliteBook", modelNumber: "840 G8" })).toBe("hp|elitebook|840 gen8"); // "G8" and "Gen 8" are the same generation
  });

  it("falls back to brand + model name without a repeated brand word", () => {
    expect(canonicalKey({ brand: "Samsung", model: "Samsung Galaxy S23" })).toBe("samsung|galaxy s23");
    expect(canonicalKey({ brand: "Apple", model: "iPhone 13 Pro" })).toBe("apple|iphone 13 pro");
  });
});

describe("splitModel", () => {
  it("uses the longest known line of the brand", () => {
    expect(splitModel("Galaxy S23", ["Galaxy A", "Galaxy S", "Galaxy"])).toEqual({ line: "Galaxy S", modelNumber: "S23" });
    expect(splitModel("Vostro 15 3520", ["Vostro", "Latitude"])).toEqual({ line: "Vostro", modelNumber: "15 3520" });
    expect(splitModel("EliteBook 8 G1i", ["EliteBook", "ProBook"])).toEqual({ line: "EliteBook", modelNumber: "8 G1i" });
  });

  it("falls back to the first word as the line", () => {
    expect(splitModel("Nitro ANV17", [])).toEqual({ line: "Nitro", modelNumber: "ANV17" });
  });

  it("refuses a name with no model number", () => {
    expect(splitModel("Vostro", ["Vostro"])).toBeNull();
    expect(splitModel("IdeaPad", [])).toBeNull();
  });
});

describe("nearDuplicates", () => {
  const p = (id: string, brand: string, line: string, modelNumber: string): KnownProduct => ({
    id, brand, line, modelNumber, canonicalKey: canonicalKey({ brand, line, modelNumber }),
  });
  const catalog = [
    p("g1a", "HP", "EliteBook", "8 G1a"),
    p("840", "HP", "EliteBook", "840 G11"),
    p("pro", "HP", "ProBook", "8 G1i"),
    p("vostro", "Dell", "Vostro", "15 3520"),
  ];

  it("finds the exact product whatever the spelling", () => {
    expect(nearDuplicates({ brand: "dell", line: "vostro", modelNumber: "15  3520" }, catalog).exact?.id).toBe("vostro");
  });

  it("flags a model one character away in the same line, not in another line", () => {
    const r = nearDuplicates({ brand: "HP", line: "EliteBook", modelNumber: "8 G1i" }, catalog);
    expect(r.exact).toBeNull();
    expect(r.close.map((x) => x.id)).toEqual(["g1a"]);
  });

  it("flags a model number contained in another", () => {
    expect(nearDuplicates({ brand: "HP", line: "EliteBook", modelNumber: "840" }, catalog).close.map((x) => x.id)).toEqual(["840"]);
  });
});

describe("editDistance", () => {
  it("counts single edits", () => {
    expect(editDistance("8g1i", "8g1a")).toBe(1);
    expect(editDistance("3520", "3520")).toBe(0);
    expect(editDistance("t14", "t14s")).toBe(1);
  });
});

describe("modelName", () => {
  it("doesn't repeat the line's last letter when the number starts with it", () => {
    expect(modelName("Galaxy S", "S23")).toBe("Galaxy S23");
    expect(modelName("Moto G", "G84")).toBe("Moto G84");
    expect(modelName("Galaxy Tab S", "S8")).toBe("Galaxy Tab S8");
    expect(modelName("P", "P30 Pro")).toBe("P30 Pro");
    expect(modelName("X", "X8a")).toBe("X8a");
    expect(modelName("Xiaomi", "13T")).toBe("Xiaomi 13T");
    expect(modelName("Switch", "Lite")).toBe("Switch Lite");
  });

  it("joins with a space otherwise", () => {
    expect(modelName("EliteBook", "8 G1i")).toBe("EliteBook 8 G1i");
    expect(modelName("iPhone", "13 Pro Max")).toBe("iPhone 13 Pro Max");
    expect(modelName("Redmi Note", "13 Pro")).toBe("Redmi Note 13 Pro");
  });

  it("round-trips with splitModel", () => {
    for (const name of ["Galaxy S23", "Moto G84", "EliteBook 8 G1i", "Redmi Note 13 Pro"]) {
      const s = splitModel(name, ["Galaxy S", "Moto G", "EliteBook", "Redmi Note"])!;
      expect(modelName(s.line, s.modelNumber)).toBe(name);
    }
  });
});

describe("canonicalKey and the plus sign", () => {
  it("keeps a Pro+ apart from its Pro", () => {
    expect(canonicalKey({ brand: "Xiaomi", line: "Redmi Note", modelNumber: "14 Pro+" })).not.toBe(canonicalKey({ brand: "Xiaomi", line: "Redmi Note", modelNumber: "14 Pro" }));
    expect(canonicalKey({ brand: "Samsung", line: "Galaxy Tab A", modelNumber: "A11+" })).not.toBe(canonicalKey({ brand: "Samsung", line: "Galaxy Tab A", modelNumber: "A11" }));
  });
});
