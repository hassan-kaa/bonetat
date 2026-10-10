import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { IMAGE_WIDTHS } from "./image-url";
import type { StoredFile } from "./storage";

// The catalog photo standard: every image, whatever its source, comes out as
// a 1600 × 1600 white square with the device centered at about 80 % of the frame.
// White, not grey: Icecat and press images are cut out on pure white, and padding
// them onto another color leaves white halos around rounded corners.

export const CANVAS = 1600;
const DEVICE_BOX = Math.round(CANVAS * 0.8);
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

export type NormalizedImage = {
  /** Storage key without size suffix: catalog/<product>/<finish>/<hash> */
  key: string;
  files: StoredFile[];
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  blurDataUrl: string;
};

export async function normalizeCatalogImage(input: Buffer, prefix: string): Promise<NormalizedImage> {
  // Auto-rotate from camera metadata, flatten any transparency onto white. Output never carries metadata.
  const flat = await sharp(input, { failOn: "none" }).rotate().flatten({ background: WHITE }).toBuffer({ resolveWithObject: true });

  // Cut the empty white border so every device gets the same margin. A blank image can't be trimmed: keep it as is.
  let device = flat.data;
  try {
    device = await sharp(flat.data).trim({ background: "#ffffff", threshold: 12 }).toBuffer();
  } catch {
    /* nothing to trim */
  }

  const fitted = await sharp(device)
    .resize(DEVICE_BOX, DEVICE_BOX, { fit: "inside", kernel: "lanczos3" })
    .toBuffer({ resolveWithObject: true });
  const left = Math.floor((CANVAS - fitted.info.width) / 2);
  const top = Math.floor((CANVAS - fitted.info.height) / 2);
  const master = await sharp(fitted.data)
    .extend({ top, left, bottom: CANVAS - fitted.info.height - top, right: CANVAS - fitted.info.width - left, background: WHITE })
    .png()
    .toBuffer();

  // Same pixels → same key, so re-importing the same image is a no-op
  const hash = createHash("sha256").update(master).digest("hex").slice(0, 16);
  const key = `${prefix}/${hash}`;

  const files: StoredFile[] = [];
  for (const w of IMAGE_WIDTHS) {
    const body = await sharp(master).resize(w, w).webp({ quality: 82 }).toBuffer();
    files.push({ path: `${key}-${w}.webp`, body, contentType: "image/webp" });
  }
  const blur = await sharp(master).resize(16, 16).webp({ quality: 40 }).toBuffer();

  return {
    key,
    files,
    width: CANVAS,
    height: CANVAS,
    sourceWidth: flat.info.width,
    sourceHeight: flat.info.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

/** Below this on its longest side, the source is visibly blurry once enlarged to the product page */
export const LOW_RES_PX = 800;

/**
 * A store's photo of the actual unit: kept as taken (no trimming, no white canvas), but rotated
 * upright, stripped of all metadata (GPS location, phone owner) and resized to the 3 standard widths.
 */
export async function normalizeUnitPhoto(input: Buffer, prefix: string): Promise<{ key: string; files: StoredFile[]; width: number; height: number }> {
  const upright = await sharp(input, { failOn: "none" })
    .rotate()
    .resize(CANVAS, CANVAS, { fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const hash = createHash("sha256").update(upright.data).digest("hex").slice(0, 16);
  const key = `${prefix}/${hash}`;
  const files: StoredFile[] = [];
  for (const w of IMAGE_WIDTHS) {
    const body = await sharp(upright.data).resize(w, w, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    files.push({ path: `${key}-${w}.webp`, body, contentType: "image/webp" });
  }
  return { key, files, width: upright.info.width, height: upright.info.height };
}
