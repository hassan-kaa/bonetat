import "server-only";
import { prisma } from "./prisma";
import { normalizeUnitPhoto, unitPrefix } from "./images";
import { putFiles } from "./storage";
import { REJECT_GRACE_DAYS, scheduleDeletion } from "./catalog-photos";

export const MAX_UNIT_PHOTOS = 3;

// A shop's photos of its actual unit live and die with the offer (units/<offerId>/):
//   awaiting moderation, correction requested → kept
//   correction never made (CORRECTION_ABANDON_DAYS) → offer withdrawn, photos deleted
//   photo refused by the admin, deleted by the shop, offer withdrawn → deleted after the grace period
//   unit sold → kept until the end of its warranty + 1 month (proof in a dispute), then deleted
// Deletion is queued (PendingDeletion) and done by `npm run media:cleanup`.

export const CORRECTION_ABANDON_DAYS = 30;
export const SOLD_KEEP_EXTRA_MONTHS = 1;

export type UploadedPhoto = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

/** Add a store's photos of the actual unit to its offer (3 at most per offer) */
export async function addOfferPhotos(offerId: string, photos: UploadedPhoto[]): Promise<number> {
  const existing = await prisma.offerPhoto.count({ where: { offerId } });
  let added = 0;
  for (const [i, p] of photos.slice(0, Math.max(0, MAX_UNIT_PHOTOS - existing)).entries()) {
    const n = await normalizeUnitPhoto(Buffer.from(p.data, "base64"), unitPrefix(offerId));
    if (await prisma.offerPhoto.findUnique({ where: { key: n.key } })) continue; // same photo twice
    await putFiles(n.files);
    await prisma.offerPhoto.create({ data: { offerId, key: n.key, width: n.width, height: n.height, position: existing + i } });
    added++;
  }
  return added;
}

/** One photo off the offer: gone from the site at once, its file deleted after the grace period */
export async function dropOfferPhoto(photoId: string, reason: string, offerId?: string): Promise<boolean> {
  const photo = await prisma.offerPhoto.findFirst({ where: { id: photoId, ...(offerId ? { offerId } : {}) } });
  if (!photo) return false;
  await prisma.$transaction(async (tx) => {
    await tx.offerPhoto.delete({ where: { id: photo.id } });
    await scheduleDeletion(photo.key, reason, REJECT_GRACE_DAYS, tx);
  });
  return true;
}

/** Every photo of an offer (withdrawn, abandoned, warranty over) */
export async function dropOfferPhotos(offerId: string, reason: string, afterDays = REJECT_GRACE_DAYS): Promise<number> {
  const photos = await prisma.offerPhoto.findMany({ where: { offerId } });
  if (!photos.length) return 0;
  await prisma.$transaction(async (tx) => {
    for (const p of photos) await scheduleDeletion(p.key, reason, afterDays, tx);
    await tx.offerPhoto.deleteMany({ where: { offerId } });
  });
  return photos.length;
}

/**
 * The photo lifecycle rules that depend on time. Run by the cleanup job before the deletions.
 */
export async function sweepOfferPhotos(log: (m: string) => void = () => {}) {
  const now = Date.now();

  // Correction requested and never made: the offer is withdrawn
  const abandoned = await prisma.offer.findMany({
    where: { status: "REJECTED", updatedAt: { lt: new Date(now - CORRECTION_ABANDON_DAYS * 86_400_000) } },
    select: { id: true },
  });
  for (const o of abandoned) {
    await prisma.offer.update({ where: { id: o.id }, data: { status: "INACTIVE" } });
    log(`offer ${o.id}: correction abandoned, withdrawn (${await dropOfferPhotos(o.id, "correction abandoned")} photos)`);
  }

  // Withdrawn offers that still have photos (safety net)
  for (const o of await prisma.offer.findMany({ where: { status: "INACTIVE", photos: { some: {} } }, select: { id: true } })) {
    log(`offer ${o.id}: withdrawn (${await dropOfferPhotos(o.id, "offer withdrawn")} photos)`);
  }

  // Sold units: proof kept until the end of the warranty + 1 month
  const sold = await prisma.offer.findMany({
    where: { status: "SOLD", photos: { some: {} } },
    select: { id: true, warrantyMonths: true, orderItems: { select: { order: { select: { deliveredAt: true, createdAt: true } } }, take: 1 } },
  });
  for (const o of sold) {
    // The warranty runs from delivery
    const order = o.orderItems[0]?.order;
    if (!order) continue;
    const end = new Date(order.deliveredAt ?? order.createdAt);
    end.setMonth(end.getMonth() + o.warrantyMonths + SOLD_KEEP_EXTRA_MONTHS);
    if (end.getTime() < now) log(`offer ${o.id}: warranty over (${await dropOfferPhotos(o.id, "warranty over", 0)} photos)`);
  }
}
