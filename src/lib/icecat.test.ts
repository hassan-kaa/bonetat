import { describe, expect, it } from "vitest";
import { IcecatError, icecatUrl, parseIcecatRef, parseIcecatResponse } from "./icecat";
import { angleGuess } from "./catalog-import";

describe("parseIcecatRef: what Kaa pastes in the admin field", () => {
  it("reads a manufacturer product code with the product's brand", () => {
    expect(parseIcecatRef(" SM-S911BZKDEUB ", "Samsung")).toEqual({ brand: "Samsung", productCode: "SM-S911BZKDEUB" });
  });

  it("lets an explicit brand override the product's", () => {
    expect(parseIcecatRef("Sony:CFI-1015A", "Sony Interactive")).toEqual({ brand: "Sony", productCode: "CFI-1015A" });
  });

  it("reads 12 to 14 digits as a barcode and shorter numbers as an Icecat id", () => {
    expect(parseIcecatRef("0711719709695", "Sony")).toEqual({ gtin: "0711719709695" });
    expect(parseIcecatRef("107934938", "Samsung")).toEqual({ icecatId: 107934938 });
  });

  it("returns null for an empty field", () => {
    expect(parseIcecatRef("   ", "Samsung")).toBeNull();
  });
});

describe("icecatUrl", () => {
  it("builds the live JSON API call, demo account when no username is set", () => {
    const url = new URL(icecatUrl({ brand: "Samsung", productCode: "SM-S911BZKDEUB" }));
    expect(url.origin + url.pathname).toBe("https://live.icecat.biz/api");
    expect(url.searchParams.get("Brand")).toBe("Samsung");
    expect(url.searchParams.get("ProductCode")).toBe("SM-S911BZKDEUB");
    expect(url.searchParams.get("lang")).toBe("FR");
    expect(url.searchParams.get("shopname")).toBeTruthy();
  });
});

describe("parseIcecatResponse", () => {
  // Trimmed from the real answer for SM-S911BZKDEUB (Galaxy S23 Noir), 2026-10-09
  const s23 = {
    msg: "OK",
    data: {
      GeneralInfo: { IcecatId: 107934938, Title: "Samsung Galaxy S23 SM-S911B 15,5 cm (6.1\") 128 Go Noir" },
      Gallery: [
        { Pic: "https://images.icecat.biz/img/gallery/b.jpg", PicWidth: "208", PicHeight: "388", IsMain: "N", No: "2" },
        { Pic: "https://images.icecat.biz/img/gallery/a.jpg", PicWidth: "623", PicHeight: "739", IsMain: "Y", No: "1" },
        { Pic: "https://evil.example.com/x.jpg", PicWidth: "100", PicHeight: "100", IsMain: "N", No: "3" },
      ],
    },
  };

  it("puts the main image first and keeps only Icecat-hosted images", () => {
    const p = parseIcecatResponse(s23);
    expect(p.icecatId).toBe(107934938);
    expect(p.title).toContain("Noir");
    expect(p.images.map((i) => i.url)).toEqual(["https://images.icecat.biz/img/gallery/a.jpg", "https://images.icecat.biz/img/gallery/b.jpg"]);
    expect(p.images[0]).toMatchObject({ width: 623, height: 739, isMain: true });
  });

  it("turns an Icecat error message into a readable error", () => {
    expect(() => parseIcecatResponse({ msg: "The requested product is not present in the Icecat database" })).toThrow(IcecatError);
    expect(() => parseIcecatResponse(null)).toThrow(/inattendue/);
  });
});

describe("angleGuess", () => {
  it("main image is the front, then back, side, and details", () => {
    expect([0, 1, 2, 3, 7].map(angleGuess)).toEqual(["FRONT", "BACK", "SIDE", "DETAIL", "DETAIL"]);
  });
});
