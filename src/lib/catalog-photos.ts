import "server-only";
import type { ImageAngle, ImageSource, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeCatalogImage, sameShot } from "./images";
import { deleteImage, putFiles } from "./storage";

// The one door every official photo comes in through, whatever the importer (Icecat, a brand's site…).
// The protections live here so no importer can skip them:
//   1. a source URL the admin rejected is never downloaded again
//   2. an identical file is stored once (named by its content)
//   3. a near-identical shot of the same model and color is skipped (visual fingerprint)
// Photos belong to a MODEL and, usually, one of its colors: every configuration of that color
// (storage, RAM, processor) shows them. finishId null = the model's photo whatever the color.

/** Days a rejected photo's file is kept before deletion, so a mistake can be undone */
export const REJECT_GRACE_DAYS = 7;

export type PhotoInput = {
  productId: string;
  /** null: the model's photo whatever the color */
  finishId: string | null;
  angle: ImageAngle;
  position?: number;
  source: ImageSource;
  /** Audit trail, e.g. "icecat:12345" */
  sourceRef?: string;
  /** The original file's URL: rejected ones are never fetched again */
  sourceUrl: string;
  /** Downloads the file, only called when the URL passes the rejection check */
  download: () => Promise<Buffer>;
  /** Put it online right away (official, color-matched sources) */
  approve?: boolean;
};

export type PhotoResult = "imported" | "duplicate" | "rejected-before";

const scope = (productId: string, finishId: string | null): Prisma.CatalogImageWhereInput => ({ productId, finishId });

export async function storeOfficialPhoto(p: PhotoInput): Promise<PhotoResult> {
  if (await prisma.catalogImage.findFirst({ where: { sourceUrl: p.sourceUrl, status: "REJECTED" }, select: { id: true } })) {
    return "rejected-before";
  }
  const n = await normalizeCatalogImage(await p.download());
  const existing = await prisma.catalogImage.findMany({
    where: { ...scope(p.productId, p.finishId), status: { not: "REJECTED" } },
    select: { key: true, phash: true },
  });
  if (existing.some((e) => e.key === n.key || (e.phash && sameShot(e.phash, n.phash)))) return "duplicate";
  // A file rejected elsewhere for this exact content is not brought back either
  if (await prisma.catalogImage.findFirst({ where: { key: n.key, status: "REJECTED" }, select: { id: true } })) return "rejected-before";

  await putFiles(n.files);
  const img = await prisma.catalogImage.create({
    data: {
      productId: p.productId,
      finishId: p.finishId,
      angle: p.angle,
      position: p.position ?? 0,
      key: n.key,
      phash: n.phash,
      width: n.width,
      height: n.height,
      sourceWidth: n.sourceWidth,
      sourceHeight: n.sourceHeight,
      blurDataUrl: n.blurDataUrl,
      source: p.source,
      sourceRef: p.sourceRef,
      sourceUrl: p.sourceUrl,
      status: "DRAFT",
    },
  });
  if (p.approve) await approveCatalogImage(img.id);
  return "imported";
}

/**
 * Approve one photo for its angle. Any other approved photo of the same model, color and angle goes
 * back to DRAFT (not deleted), so swapping the photo shown is always reversible.
 */
export async function approveCatalogImage(imageId: string) {
  const img = await prisma.catalogImage.findUnique({ where: { id: imageId } });
  if (!img || !img.productId) return null;
  return prisma.$transaction(async (tx) => {
    await tx.catalogImage.updateMany({
      where: { ...scope(img.productId!, img.finishId), angle: img.angle, status: "APPROVED", id: { not: img.id } },
      data: { status: "DRAFT" },
    });
    return tx.catalogImage.update({ where: { id: img.id }, data: { status: "APPROVED", rejectReason: null, rejectedAt: null } });
  });
}

/** Put a reviewed photo online; the model also gets it as its photo whatever the color if it has none */
export async function validateCatalogImage(imageId: string) {
  const img = await approveCatalogImage(imageId);
  if (!img || !img.finishId) return img;
  if (!(await prisma.catalogImage.count({ where: { productId: img.productId, finishId: null, status: "APPROVED" } }))) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, finishId, createdAt, ...rest } = img;
    await prisma.catalogImage.create({ data: { ...rest, finishId: null, status: "APPROVED" } });
  }
  return img;
}

/**
 * Take a photo down: hidden at once, its source never re-imported, its file deleted after the grace
 * period unless another photo row still uses the same file.
 */
export async function rejectCatalogImage(imageId: string, reason: string) {
  const img = await prisma.catalogImage.update({
    where: { id: imageId },
    data: { status: "REJECTED", rejectReason: reason, rejectedAt: new Date() },
  });
  await scheduleDeletion(img.key, `photo rejected: ${reason}`, REJECT_GRACE_DAYS);
  return img;
}

/** Queue a stored file for deletion by the cleanup job (npm run media:cleanup) */
export async function scheduleDeletion(key: string, reason: string, afterDays: number, db: Prisma.TransactionClient | typeof prisma = prisma) {
  await db.pendingDeletion.create({ data: { key, reason, deleteAfter: new Date(Date.now() + afterDays * 86_400_000) } });
}

/**
 * Deletes the files whose grace period is over. A catalog file still used by a live photo row (shared
 * between two colors, or approved again during the grace period) is kept.
 */
export async function runDeletions(log: (m: string) => void = () => {}): Promise<{ deleted: number; kept: number }> {
  const due = await prisma.pendingDeletion.findMany({ where: { deleteAfter: { lte: new Date() } } });
  let deleted = 0;
  let kept = 0;
  for (const d of due) {
    const inUse =
      (await prisma.catalogImage.count({ where: { key: d.key, status: { not: "REJECTED" } } })) +
      (await prisma.offerPhoto.count({ where: { key: d.key } }));
    if (inUse) kept++;
    else {
      await deleteImage(d.key);
      deleted++;
      log(`deleted ${d.key} (${d.reason})`);
    }
    await prisma.pendingDeletion.delete({ where: { id: d.id } });
  }
  return { deleted, kept };
}

/**
 * The source registry: one row per item fetched from an outside source. (source, externalId) is unique,
 * so running an import again updates the row instead of adding a duplicate.
 */
export async function recordSource(
  source: string,
  externalId: string,
  data: { url?: string; productId?: string | null; finishId?: string | null; outcome: string; detail?: string }
) {
  await prisma.sourceRecord.upsert({
    where: { source_externalId: { source, externalId } },
    create: { source, externalId, ...data },
    update: { ...data, fetchedAt: new Date() },
  });
}
