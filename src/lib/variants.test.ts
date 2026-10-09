import { describe, expect, it } from "vitest";
import { matchFinish, variantSignature, type FinishMatchable } from "./variants";

describe("variantSignature", () => {
  it("joins the axes and the finish slug", () => {
    expect(variantSignature({ storageGb: 256, ramGb: 8, option: null, finishSlug: "bleu-alpin" })).toBe("256|8|-|bleu-alpin");
  });

  it("writes a placeholder for every missing axis, so NULLs can't create duplicates", () => {
    expect(variantSignature({ storageGb: null, ramGb: null, option: "41 mm, GPS", finishSlug: "minuit" })).toBe("-|-|41 mm, GPS|minuit");
  });

  it("differs when only the finish differs", () => {
    const base = { storageGb: 128, ramGb: null, option: null };
    expect(variantSignature({ ...base, finishSlug: "noir" })).not.toBe(variantSignature({ ...base, finishSlug: "blanc" }));
  });
});

describe("matchFinish", () => {
  const pro: FinishMatchable[] = [
    { id: "gris", slug: "gris-sideral", aliases: ["Space Gray"], family: "GREY" },
    { id: "vert", slug: "vert-nuit", aliases: ["Midnight Green"], family: "GREEN" },
    { id: "or", slug: "or", aliases: ["Gold"], family: "GOLD" },
  ];

  it("matches the same slug first", () => {
    expect(matchFinish(pro, { slug: "or", family: "GREEN" })?.id).toBe("or");
  });

  it("matches an alias when the slug differs", () => {
    expect(matchFinish(pro, { slug: "space-gray" })?.id).toBe("gris");
  });

  it("falls back to the color family (iPhone 11 Vert → 11 Pro Vert nuit)", () => {
    expect(matchFinish(pro, { slug: "vert", family: "GREEN" })?.id).toBe("vert");
  });

  it("returns null when nothing matches", () => {
    expect(matchFinish(pro, { slug: "rose", family: "PINK" })).toBeNull();
    expect(matchFinish(pro, {})).toBeNull();
  });
});
