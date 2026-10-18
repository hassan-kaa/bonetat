import "server-only";
import type { ImageAngle } from "@prisma/client";
import { prisma } from "./prisma";
import { isRefurbished } from "./icecat-match";
import { approveCatalogImage, recordSource, storeOfficialPhoto } from "./catalog-photos";
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
 * Link a finish (one color of one product) to an Icecat product and import its gallery. Goes through
 * storeOfficialPhoto: rejected sources, identical files and near-identical shots are skipped.
 */
export async function importIcecatForFinish(finishId: string, refInput: string, opts: ImportOptions = {}): Promise<ImportResult> {
  const finish = await prisma.finish.findUnique({ where: { id: finishId }, include: { product: true } });
  if (!finish) throw new IcecatError("Couleur introuvable");
  let product = opts.product;
  if (!product) {
    const ref = parseIcecatRef(refInput, finish.product.brand);
    if (!ref) throw new IcecatError("Collez un code produit, un EAN ou un identifiant Icecat");
    product = await fetchIcecatProduct(ref);
  }
  const record = (outcome: string, detail?: string) =>
    recordSource("icecat", String(product!.icecatId), { productId: finish.productId, finishId, outcome, detail });
  if (isRefurbished(product.title)) {
    await record("skipped:refurbished", product.title);
    throw new IcecatError(`« ${product.title} » est une annonce de reconditionneur, pas de la marque : ses photos portent sa marque`);
  }
  if (product.images.length === 0) throw new IcecatError(`« ${product.title} » n’a aucune image sur Icecat`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  for (const [i, img] of product.images.slice(0, MAX_IMAGES).entries()) {
    try {
      const r = await storeOfficialPhoto({
        productId: finish.productId,
        finishId,
        angle: angleGuess(i),
        position: i,
        source: "ICECAT",
        sourceRef: `icecat:${product.icecatId}`,
        sourceUrl: img.url,
        download: () => downloadIcecatImage(img.url),
        approve: opts.approveAll || (opts.approveFront && i === 0),
      });
      if (r === "imported") imported++;
      else skipped++;
    } catch (err) {
      console.error(`Icecat image import failed (${img.url})`, err);
      failed++;
    }
  }
  await record(imported ? "imported" : "skipped:duplicate", `${imported} new, ${skipped} skipped, ${failed} failed`);

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
  const approvedFront = !!(opts.approveFront || opts.approveAll) && imported > 0;
  return { icecatId: product.icecatId, title: product.title, imported, skipped, failed, approvedFront };
}

export { approveCatalogImage };
