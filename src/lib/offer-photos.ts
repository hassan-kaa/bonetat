import "server-only";
import { prisma } from "./prisma";
import { normalizeUnitPhoto } from "./images";
import { putFiles } from "./storage";

export const MAX_UNIT_PHOTOS = 3;

export type UploadedPhoto = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

/** Add a store's photos of the actual unit to its offer (3 at most per offer) */
export async function addOfferPhotos(offerId: string, photos: UploadedPhoto[]): Promise<number> {
  const existing = await prisma.offerPhoto.count({ where: { offerId } });
  let added = 0;
  for (const [i, p] of photos.slice(0, Math.max(0, MAX_UNIT_PHOTOS - existing)).entries()) {
    const n = await normalizeUnitPhoto(Buffer.from(p.data, "base64"), `offers/${offerId}`);
    if (await prisma.offerPhoto.findUnique({ where: { key: n.key } })) continue; // same photo twice
    await putFiles(n.files);
    await prisma.offerPhoto.create({ data: { offerId, key: n.key, width: n.width, height: n.height, position: existing + i } });
    added++;
  }
  return added;
}
