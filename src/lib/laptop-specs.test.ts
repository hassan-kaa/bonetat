import { describe, expect, it } from "vitest";
import { laptopLabel, specsFromText } from "./laptop-specs";
import { cpuFamily, hasDedicatedGpu } from "./pc-filters";

describe("specsFromText", () => {
  it.each([
    ["i5-1145G7", { cpuFamily: "i5", cpuGen: "11" }],
    ["Core i7-10510U", { cpuFamily: "i7", cpuGen: "10" }],
    ["i5 8250U", { cpuFamily: "i5", cpuGen: "8" }],
    ["i7 10th gen · RTX 3050", { cpuFamily: "i7", cpuGen: "10", gpu: "RTX 3050" }],
    ["Core Ultra 7 155H", { cpuFamily: "ultra7", cpuGen: "1" }],
    ["Ryzen 7 5800H, RTX 3060 6GB", { cpuFamily: "ryzen7", cpuGen: "5000", gpu: "RTX 3060", vramGb: 6 }],
    ["GTX 1650 4 Go", { gpu: "GTX 1650", vramGb: 4 }],
    ["Quadro T1000", { gpu: "Quadro / RTX A" }],
  ])("%s", (text, expected) => expect(specsFromText(text)).toMatchObject(expected));

  it("reads Apple chips and tiers", () => {
    expect(specsFromText("Apple M2 Pro", "Apple")).toMatchObject({ cpuBrand: "APPLE", cpuFamily: "m2", cpuGen: "Pro" });
  });
});

describe("laptopLabel round trip", () => {
  it.each([
    "i5-1145G7 · RTX 3050 4 Go",
    "Ryzen 7 5800H, RTX 3060 6GB",
    "Core Ultra 7 155H",
  ])("%s", (text) => {
    const specs = specsFromText(text);
    const label = laptopLabel(specs)!;
    expect(specsFromText(label)).toMatchObject(specs);
    expect(cpuFamily(label)?.id).toBe(specs.cpuFamily);
    expect(hasDedicatedGpu(label)).toBe(!!specs.gpu);
  });

  it("writes the generated label in one fixed form", () => {
    expect(laptopLabel(specsFromText("i5-1145G7 · RTX 3050 4 Go"))).toBe("Intel Core i5 11e gén., RTX 3050 4 Go");
    expect(laptopLabel(specsFromText("M1 Pro", "Apple"), { cpuInModel: true })).toBeNull();
  });
});
