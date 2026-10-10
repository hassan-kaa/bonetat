import "server-only";
import type { ImageAngle } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeCatalogImage } from "./images";
import { putFiles } from "./storage";
import { IcecatError, downloadIcecatImage, fetchIcecatProduct, parseIcecatRef, type IcecatProduct } from "./icecat";

/** Icecat galleries have no angle labels: main image first, then a best guess Kaa corrects on review */
const ANGLE_GUESS: ImageAngle[] = ["FRONT", "BACK", "SIDE"];
export const angleGuess = (index: number): ImageAngle => ANGLE_GUESS[index] ?? "DETAIL";

/** Enough to pick a FRONT, BACK and SIDE from; the rest of a gallery is usually box shots and accessories */
const MAX_IMAGES = 8;

export type ImportResult = { icecatId: number; title: string; imported: number; skipped: number; failed: number; approvedFront: boolean };

export type ImportOptions = {
  /** Product details already fetched (by the sync), to avoid a second API call */
  product?: IcecatProduct;
  /** How the match was made; "manual" when Kaa pasted the reference or picked a suggestion */
  match?: "exact" | "family" | "manual";
  /** Put the main image online as FRONT right away (certain matches only, and only if no FRONT is live) */
  approveFront?: boolean;
  /** Put every imported image online (automatic photos on publish: official, color-matched sources only) */
  approveAll?: boolean;
};

/**
 * Link a finish (one color of one product) to an Icecat product and import its gallery as DRAFT
 * catalog images. Safe to run again: images already imported (same pixels) are skipped.
 */
export async function importIcecatForFinish(finishId: string, refInput: string, opts: ImportOptions = {}): Promise<ImportResult> {
  const finish = await prisma.finish.findUnique({ where: { id: finishId }, include: { product: true, images: { select: { key: true } } } });
  if (!finish) throw new IcecatError("Couleur introuvable");
  let product = opts.product;
  if (!product) {
    const ref = parseIcecatRef(refInput, finish.product.brand);
    if (!ref) throw new IcecatError("Collez un code produit, un EAN ou un identifiant Icecat");
    product = await fetchIcecatProduct(ref);
  }
  if (product.images.length === 0) throw new IcecatError(`« ${product.title} » n’a aucune image sur Icecat`);

  const known = new Set(finish.images.map((i) => i.key));
  const prefix = `catalog/${finish.product.slug}/${finish.slug}`;
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let frontId: string | null = null;

  for (const [i, img] of product.images.slice(0, MAX_IMAGES).entries()) {
    try {
      const normalized = await normalizeCatalogImage(await downloadIcecatImage(img.url), prefix);
      if (known.has(normalized.key) || (await prisma.catalogImage.findUnique({ where: { key: normalized.key } }))) {
        skipped++;
        continue;
      }
      await putFiles(normalized.files);
      const created = await prisma.catalogImage.create({
        data: {
          finishId,
          angle: angleGuess(i),
          position: i,
          key: normalized.key,
          width: normalized.width,
          height: normalized.height,
          sourceWidth: normalized.sourceWidth,
          sourceHeight: normalized.sourceHeight,
          blurDataUrl: normalized.blurDataUrl,
          source: "ICECAT",
          sourceRef: `icecat:${product.icecatId} ${img.url}`,
          status: "DRAFT",
        },
      });
      if (i === 0) frontId = created.id;
      if (opts.approveAll) await approveCatalogImage(created.id);
      known.add(normalized.key);
      imported++;
    } catch (err) {
      console.error(`Icecat image import failed (${img.url})`, err);
      failed++;
    }
  }

  // A confirmed match teaches us the manufacturer's color name: the next model with "Phantom Black" matches by itself
  const learned = product.colorName && ![finish.nameFr, ...finish.aliases].some((n) => n.toLowerCase() === product.colorName!.toLowerCase());
  await prisma.finish.update({
    where: { id: finishId },
    data: {
      icecatId: product.icecatId,
      icecatMatch: opts.match ?? "manual",
      ...(learned ? { aliases: { push: product.colorName! } } : {}),
    },
  });
  await prisma.icecatCandidate.deleteMany({ where: { finishId } });

  let approvedFront = false;
  if (opts.approveFront && frontId) {
    const live = await prisma.catalogImage.count({ where: { finishId, angle: "FRONT", status: "APPROVED" } });
    if (live === 0) {
      await approveCatalogImage(frontId);
      approvedFront = true;
    }
  }
  return { icecatId: product.icecatId, title: product.title, imported, skipped, failed, approvedFront };
}

/**
 * Approve one image for its angle. Any other approved image of the same finish and angle
 * goes back to DRAFT (not archived), so swapping the photo shown is always reversible.
 */
export async function approveCatalogImage(imageId: string) {
  const img = await prisma.catalogImage.findUnique({ where: { id: imageId } });
  if (!img) return null;
  return prisma.$transaction(async (tx) => {
    await tx.catalogImage.updateMany({
      where: { finishId: img.finishId, angle: img.angle, status: "APPROVED", id: { not: img.id } },
      data: { status: "DRAFT" },
    });
    return tx.catalogImage.update({ where: { id: img.id }, data: { status: "APPROVED" } });
  });
}
