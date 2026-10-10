import { describe, expect, it } from "vitest";
import { hasContactDetails, sanitizeSellerText } from "./seller-text";

describe("sanitizeSellerText", () => {
  it("removes Tunisian phone numbers in every common format", () => {
    expect(sanitizeSellerText("☎ TEL : 26 032 547 - 51 838 001 - 24 068 049")).toBe("");
    expect(sanitizeSellerText("Chargeur original, appelez le +216 98.765.432")).toBe("Chargeur original");
    expect(sanitizeSellerText("Boîte d’origine 22123456")).toBe("Boîte d’origine");
  });

  it("removes links and handles, keeps the useful part", () => {
    expect(sanitizeSellerText("Chargeur original www.techstore.tn")).toBe("Chargeur original");
    expect(sanitizeSellerText("Housse offerte @techstore_sousse")).toBe("Housse offerte");
  });

  it("keeps specs that look numeric but aren't phone numbers", () => {
    expect(sanitizeSellerText("Écran 2560×1600 240Hz, 32 Go DDR5")).toBe("Écran 2560×1600 240Hz, 32 Go DDR5");
    expect(sanitizeSellerText("Core i7-1165G7, 1 To SSD")).toBe("Core i7-1165G7, 1 To SSD");
  });
});

describe("hasContactDetails", () => {
  it("flags leftovers for moderation", () => {
    expect(hasContactDetails("appelez 26 032 547")).toBe(true);
    expect(hasContactDetails("Chargeur original")).toBe(false);
  });
});
