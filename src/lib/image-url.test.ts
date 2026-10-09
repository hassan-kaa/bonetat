import { afterEach, describe, expect, it, vi } from "vitest";

// The base URL is read at import time, so each test imports a fresh copy of the module
async function load(base?: string) {
  vi.resetModules();
  if (base === undefined) vi.stubEnv("NEXT_PUBLIC_IMAGE_BASE_URL", "");
  else vi.stubEnv("NEXT_PUBLIC_IMAGE_BASE_URL", base);
  return import("./image-url");
}

afterEach(() => vi.unstubAllEnvs());

describe("imageUrl", () => {
  it("picks the smallest pre-built width that covers the request", async () => {
    const { imageUrl } = await load("https://img.bonetat.tn");
    expect(imageUrl("catalog/iphone-13/bleu/abc", 80)).toBe("https://img.bonetat.tn/catalog/iphone-13/bleu/abc-400.webp");
    expect(imageUrl("k", 400)).toBe("https://img.bonetat.tn/k-400.webp");
    expect(imageUrl("k", 401)).toBe("https://img.bonetat.tn/k-800.webp");
    expect(imageUrl("k", 1200)).toBe("https://img.bonetat.tn/k-1600.webp");
  });

  it("caps at the largest width", async () => {
    const { imageUrl } = await load("https://img.bonetat.tn");
    expect(imageUrl("k", 3840)).toBe("https://img.bonetat.tn/k-1600.webp");
  });

  it("defaults to the largest width and tolerates a trailing slash in the base", async () => {
    const { imageUrl } = await load("https://img.bonetat.tn/");
    expect(imageUrl("k")).toBe("https://img.bonetat.tn/k-1600.webp");
  });

  it("the next/image loader uses the same rule", async () => {
    const { storedImageLoader } = await load("https://img.bonetat.tn");
    expect(storedImageLoader({ src: "k", width: 640 })).toBe("https://img.bonetat.tn/k-800.webp");
  });
});
