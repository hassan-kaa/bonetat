import { describe, expect, it } from "vitest";
import { brandMatches, cleanModelName, familyOf, isAccessory, isRefurbished, kindForCategory, matchColor, modelMatches, numbersMatch, normalize, rankRows, titleConflicts, type FinishForMatch, type IndexRow } from "./icecat-match";

// Every case below is a real row from the Open Icecat index (2026-10-09)
const s23 = { brand: "Samsung", model: "Galaxy S23" };
const m = (product: { brand: string; model: string }, brand: string, modelName: string) => modelMatches(product, { brand, modelName });

describe("normalize", () => {
  it("unifies generations and splits watch numbers", () => {
    expect(normalize("ThinkPad T14 Gen 2")).toBe("thinkpad t14 gen2");
    expect(normalize("Lenovo Thinkpad T14 G2")).toBe("lenovo thinkpad t14 gen2");
    expect(normalize("Tab P11 (2nd Gen)")).toBe("tab p11 gen2");
    expect(normalize("Galaxy Watch6")).toBe("galaxy watch 6");
    expect(normalize("Crème")).toBe("creme");
  });
});

describe("modelMatches", () => {
  it("accepts the same model", () => {
    expect(m(s23, "Samsung", "Galaxy S23")).toBe(true);
    expect(m({ brand: "Lenovo", model: "ThinkPad T14 Gen 2" }, "Lenovo", "Lenovo Thinkpad T14 G2")).toBe(true);
    expect(m({ brand: "Samsung", model: "Galaxy Watch 6" }, "Samsung", "Galaxy Watch6")).toBe(true);
    expect(m({ brand: "Sony", model: "PlayStation 5" }, "Sony Interactive Entertainment", "PlayStation 5")).toBe(true);
  });

  it("accepts a short Icecat name that is our model number", () => {
    expect(m({ brand: "Dell", model: "XPS 13 9310" }, "DELL", "9310")).toBe(true);
    expect(m({ brand: "Dell", model: "XPS 13 9310" }, "DELL", "9310 2-in-1")).toBe(false);
    expect(m({ brand: "Dell", model: "XPS 13 9310" }, "DELL", "13")).toBe(false);
  });

  it("rejects other models of the same family", () => {
    expect(m(s23, "Samsung", "Galaxy S23 Ultra")).toBe(false);
    expect(m(s23, "Samsung", "Galaxy S23+")).toBe(false);
    expect(m(s23, "Samsung", "Galaxy S23 FE")).toBe(false);
    expect(m({ brand: "Lenovo", model: "ThinkPad T14 Gen 2" }, "Lenovo", "Lenovo Thinkpad T14 G1")).toBe(false);
    expect(m({ brand: "Lenovo", model: "Tab P11" }, "Lenovo", "Tab P11 (2nd Gen)")).toBe(false);
    expect(m({ brand: "Sony", model: "PlayStation 5" }, "Sony", "PlayStation 5 Digital Edition")).toBe(false);
    expect(m({ brand: "Sony", model: "PlayStation 5" }, "Sony", "PlayStation 5 + FIFA 23")).toBe(false);
  });

  it("offers every generation when the store didn't name one", () => {
    const p14s = { brand: "Lenovo", model: "ThinkPad P14s" };
    expect(m(p14s, "Lenovo", "ThinkPad P14s Gen 4")).toBe(false);
    expect(modelMatches(p14s, { brand: "Lenovo", modelName: "ThinkPad P14s Gen 4" }, { anyGeneration: true })).toBe(true);
  });

  it("rejects another brand", () => {
    expect(m(s23, "Apple", "Galaxy S23")).toBe(false);
  });
});

describe("rankRows", () => {
  const row = (o: Partial<IndexRow>): IndexRow => ({ icecatId: 1, kind: "PHONE", productCode: "", brand: "Samsung", modelName: "Galaxy S23", onMarket: true, quality: "ICECAT", picWidth: 500, picHeight: 500, ...o });
  it("accepts refurbished listings of the same model but ranks them last", () => {
    expect(m({ brand: "Lenovo", model: "ThinkPad T14 Gen 2" }, "Lenovo", "Lenovo ThinkPad T14 G2 (Refurbished) A")).toBe(true);
    expect(isRefurbished("Apple iPhone 12 (Refurbished) Grade A")).toBe(true);
    expect(isRefurbished("Samsung Galaxy S23")).toBe(false);
    const refurb = row({ icecatId: 9, modelName: "Galaxy S23 Refurbished", picWidth: 4000, picHeight: 4000 });
    const plain = row({ icecatId: 8, quality: "SUPPLIER", picWidth: 300, picHeight: 300 });
    expect(rankRows([refurb, plain]).map((r) => r.icecatId)).toEqual([8, 9]);
  });

  it("prefers Icecat-edited, on the market, then the biggest picture", () => {
    const supplier = row({ icecatId: 1, quality: "SUPPLIER", picWidth: 4000, picHeight: 4000 });
    const old = row({ icecatId: 2, onMarket: false, picWidth: 3000, picHeight: 3000 });
    const small = row({ icecatId: 3, picWidth: 600, picHeight: 600 });
    const big = row({ icecatId: 4, picWidth: 2000, picHeight: 2000 });
    expect(rankRows([supplier, old, small, big]).map((r) => r.icecatId)).toEqual([4, 3, 2, 1]);
  });
});

describe("matchColor", () => {
  const s23Colors: FinishForMatch[] = [
    { id: "noir", nameFr: "Noir fantôme", aliases: ["Phantom Black"], family: "BLACK" },
    { id: "creme", nameFr: "Crème", aliases: ["Cream"], family: "WHITE" },
    { id: "lavande", nameFr: "Lavande", aliases: ["Lavender"], family: "PURPLE" },
    { id: "vert", nameFr: "Vert", aliases: [], family: "GREEN" },
  ];

  it("matches the marketing color name to an alias", () => {
    expect(matchColor(s23Colors, { color: "Noir", colorName: "Phantom Black" })).toEqual({ finishId: "noir", how: "exact" });
  });

  it("matches the coarse color to our name, accents ignored", () => {
    expect(matchColor(s23Colors, { color: "Crème", colorName: null })).toEqual({ finishId: "creme", how: "exact" });
    expect(matchColor(s23Colors, { color: "Vert", colorName: null })).toEqual({ finishId: "vert", how: "exact" });
  });

  it("falls back to the color family when only one of our colors has it", () => {
    const s24: FinishForMatch[] = [
      { id: "onyx", nameFr: "Noir onyx", aliases: [], family: "BLACK" },
      { id: "marbre", nameFr: "Gris marbre", aliases: [], family: "GREY" },
    ];
    expect(matchColor(s24, { color: "Gris, Couleur marbre", colorName: null })).toEqual({ finishId: "marbre", how: "family" });
  });

  it("refuses to guess when two of our colors share the family", () => {
    const two: FinishForMatch[] = [
      { id: "a", nameFr: "Noir minuit", aliases: [], family: "BLACK" },
      { id: "b", nameFr: "Noir sidéral", aliases: [], family: "BLACK" },
    ];
    expect(matchColor(two, { color: "Noir", colorName: null })).toBeNull();
  });

  it("returns null without any color information", () => {
    expect(matchColor(s23Colors, { color: null, colorName: null })).toBeNull();
    expect(familyOf("Néon")).toBeNull();
  });
});

describe("titleConflicts", () => {
  const xps = { model: "XPS 13 9310" };
  it("catches a 2-in-1 hidden behind a short index name", () => {
    expect(titleConflicts(xps, "DELL XPS 13 9310 Intel® Core™ i5 Hybride (2-en-1) 34 cm (13.4\") Écran tactile")).toBe(true);
    expect(titleConflicts(xps, "DELL XPS 13 9310 2-in-1 Laptop")).toBe(true);
  });

  it("does not trip on operating system names", () => {
    expect(titleConflicts({ model: "ThinkPad T14 Gen 2" }, "Lenovo ThinkPad T14 G2 Ordinateur portable 35,6 cm Windows 11 Pro Noir")).toBe(false);
  });
});

describe("cleanModelName", () => {
  it("drops shop SKUs and marketing tails, keeps the model", () => {
    expect(cleanModelName("OMEN 17-db0013na")).toBe("OMEN 17");
    expect(cleanModelName("Raider 18 HX A14VGG-006BE")).toBe("Raider 18 HX");
    expect(cleanModelName("Raider 18 HX AI A2XWJG-841US")).toBe("Raider 18 HX AI");
    expect(cleanModelName("EliteBook 8 G1i Next Gen AI PC")).toBe("EliteBook 8 G1i");
    expect(cleanModelName("EliteBook 8 G1i 14 inch Notebook Next Gen AI PC")).toBe("EliteBook 8 G1i");
    expect(cleanModelName("ThinkPad P14s Gen 4 (AMD)")).toBe("ThinkPad P14s Gen 4");
    expect(cleanModelName("EliteBook 8 G1i Next Gen AI")).toBe("EliteBook 8 G1i");
    expect(cleanModelName("AMD Thinkpad T14s G1")).toBe("Thinkpad T14s G1");
    expect(cleanModelName("Raider 18 HX AI A2XWJG-075")).toBe("Raider 18 HX AI");
  });

  it("drops network, OS codes, years and labels", () => {
    expect(cleanModelName("Galaxy A04s 5G", "Samsung")).toBe("Galaxy A04s");
    expect(cleanModelName("Modern 15 W11H", "MSI")).toBe("Modern 15");
    expect(cleanModelName("Switch V2 2019", "Nintendo")).toBe("Switch V2");
    expect(cleanModelName("EliteBook 8560w Mobile Workstation", "HP")).toBe("EliteBook 8560w");
    expect(cleanModelName("EliteBook 850 G1- -pc", "HP")).toBe("EliteBook 850 G1");
    expect(cleanModelName("PlayStation 4 Slim Playstation Hits", "Sony")).toBe("PlayStation 4 Slim");
  });

  it("drops storage, color and a repeated brand", () => {
    expect(cleanModelName("Apple iPhone 13 Pro Max 256GB Silver", "Apple")).toBe("iPhone 13 Pro Max");
    expect(cleanModelName("Galaxy S23 128 Go Noir", "Samsung")).toBe("Galaxy S23");
  });

  it("drops short shop references but keeps real model numbers", () => {
    expect(cleanModelName("Galaxy S22 Ultra S908B DS", "Samsung")).toBe("Galaxy S22 Ultra");
    expect(cleanModelName("Raider A18 HX A9WIG", "MSI")).toBe("Raider A18 HX");
    expect(cleanModelName("Modern 15 H AI C1MG", "MSI")).toBe("Modern 15 H AI");
    expect(cleanModelName("Titan 18 HX AI 614US", "MSI")).toBe("Titan 18 HX AI");
    expect(cleanModelName("Galaxy A5 ( )", "Samsung")).toBe("Galaxy A5");
    expect(cleanModelName("Galaxy A5 (2016)", "Samsung")).toBe("Galaxy A5");
    expect(cleanModelName("PlayStation 4, Uncharted 4", "Sony")).toBe("PlayStation 4");
    expect(cleanModelName('TravelMate "Timeline"', "Acer")).toBe("TravelMate Timeline");
    for (const keep of ["ThinkPad T14s", "GF63 Thin", "Nitro ANV17", "EliteBook 8570p", "Moto G84", "Galaxy A54", "ThinkPad X1 Carbon", "ThinkBook 16p G4"]) {
      expect(cleanModelName(keep)).toBe(keep);
    }
  });

  it("keeps real model numbers", () => {
    expect(cleanModelName("Galaxy S23")).toBe("Galaxy S23");
    expect(cleanModelName("Nitro ANV17")).toBe("Nitro ANV17");
    expect(cleanModelName("Precision 7530")).toBe("Precision 7530");
    expect(cleanModelName("ThinkPad T14s")).toBe("ThinkPad T14s");
  });
});

describe("numbersMatch", () => {
  it("never accepts another number", () => {
    expect(numbersMatch("iPhone 16 Pro Max", "Apple iPhone 13 Pro Max 128GB")).toBe(false);
    expect(numbersMatch("Precision 7530", "Precision 7560")).toBe(false);
    expect(numbersMatch("EliteBook 840 G8", "EliteBook 840 G8")).toBe(true);
    expect(numbersMatch("omen 17", "OMEN 17")).toBe(true);
  });
});

describe("isAccessory", () => {
  it("spots bags, chargers and docks, not devices", () => {
    expect(isAccessory("17.3 in OMEN Gaming Backpack")).toBe(true);
    expect(isAccessory("USB-C Dock G5")).toBe(true);
    expect(isAccessory("65W Chargeur")).toBe(true);
    expect(isAccessory("OMEN 17")).toBe(false);
    expect(isAccessory("Galaxy Watch 6")).toBe(false);
  });
});

describe("kindForCategory", () => {
  it("maps Icecat device categories to our kinds and drops everything else", () => {
    expect(kindForCategory("1893")).toBe("PHONE");
    expect(kindForCategory("151")).toBe("LAPTOP");
    expect(kindForCategory("897")).toBe("TABLET");
    expect(kindForCategory("2647")).toBe("WATCH");
    expect(kindForCategory("1060")).toBe("CONSOLE");
    expect(kindForCategory("152")).toBeNull(); // Laptop Docks & Port Replicators
    expect(kindForCategory("")).toBeNull();
  });
});

describe("brandMatches", () => {
  it("is exact, so lookalike Icecat brands stay out", () => {
    expect(brandMatches("Apple", "Apple")).toBe(true);
    expect(brandMatches("Apple", "Apple of Eden")).toBe(false);
    expect(brandMatches("Tecno", "Tecno Baby")).toBe(false);
    expect(brandMatches("Realme", "realme")).toBe(true);
    expect(brandMatches("Sony", "Sony Interactive Entertainment")).toBe(true);
  });
});
