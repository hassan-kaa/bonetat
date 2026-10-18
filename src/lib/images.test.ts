import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { CANVAS, catalogKey, dhash, normalizeCatalogImage, normalizeUnitPhoto, sameShot } from "./images";

/** A dark "device" off-center on a white photo, like an Icecat image with uneven margins */
async function fakePhoto(width: number, height: number, device: { left: number; top: number; w: number; h: number }) {
  const rect = await sharp({ create: { width: device.w, height: device.h, channels: 3, background: "#202125" } }).png().toBuffer();
  return sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite([{ input: rect, left: device.left, top: device.top }])
    .jpeg()
    .toBuffer();
}

async function pixel(buf: Buffer, x: number, y: number) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
}

describe("normalizeCatalogImage", () => {
  it("centers the device on a white 1600 square, about 80 % of the frame, in three sizes", async () => {
    const out = await normalizeCatalogImage(await fakePhoto(623, 739, { left: 40, top: 300, w: 200, h: 400 }));
    expect(out.width).toBe(CANVAS);
    expect(out.files.map((f) => f.path)).toEqual([`${out.key}-400.webp`, `${out.key}-800.webp`, `${out.key}-1600.webp`]);
    expect(out.key).toMatch(/^catalog\/[0-9a-f]{2}\/[0-9a-f]{16}$/);
    expect(out).toMatchObject({ sourceWidth: 623, sourceHeight: 739 });

    const big = out.files[2].body;
    const meta = await sharp(big).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1600, 1600, "webp"]);
    // Corners are white, the center is the dark device
    expect((await pixel(big, 5, 5)).every((c) => c > 245)).toBe(true);
    expect((await pixel(big, 800, 800)).every((c) => c < 60)).toBe(true);
    // Tall device fitted to 80 % of the height: white just above 10 %, dark just below
    expect((await pixel(big, 800, 150)).every((c) => c > 245)).toBe(true);
    expect((await pixel(big, 800, 175)).every((c) => c < 60)).toBe(true);
  });

  it("gives the same key to the same file, and a new key to a different one (re-imports are no-ops)", async () => {
    const photo = await fakePhoto(600, 700, { left: 50, top: 100, w: 200, h: 400 });
    const a = await normalizeCatalogImage(photo);
    const again = await normalizeCatalogImage(photo);
    const other = await normalizeCatalogImage(await fakePhoto(600, 700, { left: 50, top: 100, w: 400, h: 200 }));
    expect(again.key).toBe(a.key);
    expect(other.key).not.toBe(a.key);
  });

  it("produces a tiny blur placeholder", async () => {
    const out = await normalizeCatalogImage(await fakePhoto(300, 300, { left: 100, top: 100, w: 50, h: 100 }));
    expect(out.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(out.blurDataUrl.length).toBeLessThan(1000);
  });
});

describe("normalizeUnitPhoto", () => {
  it("strips every metadata block (EXIF with GPS, owner) and keeps the photo as taken", async () => {
    const withExif = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#7a6f60" } })
      .withExif({ IFD0: { Artist: "Shop owner", Copyright: "TechStore" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "36/1 48/1 0/1" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const out = await normalizeUnitPhoto(withExif, "units/o1");
    for (const f of out.files) {
      const meta = await sharp(f.body).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.format).toBe("webp");
    }
    expect([out.width, out.height]).toEqual([1200, 900]); // no square canvas, no enlargement
    expect(out.key).toMatch(/^units\/o1\/[0-9a-f]{16}$/);
  });
});

describe("storage keys and fingerprints", () => {
  it("names official photos by content, spread over 256 folders", () => {
    expect(catalogKey("ab3f9c0011223344")).toBe("catalog/ab/ab3f9c0011223344");
  });

  it("recognizes the same shot resized and re-encoded, not a different shot", async () => {
    const photo = await fakePhoto(800, 900, { left: 100, top: 150, w: 400, h: 600 });
    const smaller = await sharp(photo).resize(300).jpeg({ quality: 60 }).toBuffer();
    const other = await fakePhoto(800, 900, { left: 450, top: 50, w: 300, h: 200 });
    expect(sameShot(await dhash(photo), await dhash(smaller))).toBe(true);
    expect(sameShot(await dhash(photo), await dhash(other))).toBe(false);
  });
});
