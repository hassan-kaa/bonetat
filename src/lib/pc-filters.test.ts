import { describe, expect, it } from "vitest";
import { cpuFamily, hasDedicatedGpu, laptopText } from "./pc-filters";

describe("cpuFamily", () => {
  it.each([
    ["Intel Core i5 11e gén.", "i5"],
    ["ThinkPad T14 · Core i7-1185G7", "i7"],
    ["EliteBook 840 G8 i5-1145G7", "i5"],
    ["Intel Core Ultra 7 155H", "ultra7"],
    ["AMD Ryzen 5 5600H", "ryzen5"],
    ["Ryzen AI 9 HX 370", "ryzen9"],
    ["Intel Celeron N4020", "entry"],
  ])("%s → %s", (text, id) => expect(cpuFamily(text)?.id).toBe(id));

  it("reads Apple chips only on Apple machines", () => {
    expect(cpuFamily("MacBook Pro 14 · M1 Pro", "Apple")?.id).toBe("m1");
    expect(cpuFamily("Galaxy Book M2 edition", "Samsung")).toBeNull();
  });

  it("returns null when nothing names a processor", () => {
    expect(cpuFamily("XPS 13 9310")).toBeNull();
  });
  it("reads specs stored as [key, value] pairs", () => {
    expect(laptopText({ model: "MacBook Air M1", specsJson: [["Puce", "Apple M1"], ["Poids", "1,29 kg"]] }, {})).toBe("MacBook Air M1 · Apple M1 · 1,29 kg");
  });
});

describe("hasDedicatedGpu", () => {
  it.each(["RTX 3060", "GeForce GTX 1650", "Quadro T1000", "Radeon RX 6600M", "Intel Arc A370M"])("%s", (t) => expect(hasDedicatedGpu(t)).toBe(true));
  it.each(["Intel Iris Xe", "Radeon Graphics", "Apple M1", "XPS 13"])("not %s", (t) => expect(hasDedicatedGpu(t)).toBe(false));
});

describe("laptopText", () => {
  it("joins model, option and string specs", () => {
    expect(laptopText({ model: "Legion 5", specsJson: { Processeur: "Ryzen 7", Poids: 2.4 } }, { option: "RTX 3060" })).toBe("Legion 5 · RTX 3060 · Ryzen 7");
  });
});
