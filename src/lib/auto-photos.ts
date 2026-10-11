import "server-only";
import { prisma } from "./prisma";
import { cachedIcecatProduct } from "./icecat-index";
import { downloadIcecatImage } from "./icecat";
import { normalizeCatalogImage } from "./images";
import { putFiles } from "./storage";
import { isRefurbished, matchColor } from "./icecat-match";
import { referenceEntriesForModel } from "./reference-catalog";
import { importIcecatForFinish } from "./catalog-import";
import type { IcecatProduct } from "./icecat";

// Photos without admin work: when a color gets its first unit for sale, its official photos
// are fetched from Icecat and put online directly. Only official (non-refurbished) entries whose
// own color field matches this color are used; otherwise the color keeps the illustration.

export type PhotoOutcome = "already" | "imported" | "no-match";

export async function ensureFinishPhotos(finishId: string): Promise<PhotoOutcome> {
  const finish = await prisma.finish.findUnique({
    where: { id: finishId },
    include: { product: true, images: { where: { status: "APPROVED", angle: "FRONT" }, take: 1 } },
  });
  if (!finish) return "no-match";
  if (finish.images.length) return "already";

  const { product } = finish;
  const model = product.model;
  let best: { entry: IcecatProduct; how: "exact" | "family" } | null = null;
  for (const ref of await referenceEntriesForModel(product.brand, model)) {
    let entry: IcecatProduct;
    try {
      entry = await cachedIcecatProduct(ref.icecatId);
    } catch {
      continue; // restricted or removed entry
    }
    if (!entry.images.length) continue;
    // A refurbisher's listing ("Teqcycle … Reconditionné"): its photos carry the refurbisher's branding
    if (isRefurbished(entry.title)) continue;
    const m = matchColor([finish], entry);
    if (!m) continue;
    // An exact color name beats a family match; then the bigger picture
    if (!best || (m.how === "exact" && best.how === "family") || (m.how === best.how && (entry.images[0].width ?? 0) > (best.entry.images[0].width ?? 0))) {
      best = { entry, how: m.how };
    }
    if (best.how === "exact" && (best.entry.images[0].width ?? 0) >= 1000) break;
  }
  if (!best) return "no-match";
  await importIcecatForFinish(finishId, String(best.entry.icecatId), { product: best.entry, match: best.how, approveAll: true });
  return "imported";
}

/**
 * The model's cover: its official main photo, whatever the color. Shown when a color has no photo
 * of its own, labelled as indicative. Official (non-refurbished) Icecat entries only.
 */
export async function ensureProductCover(productId: string): Promise<PhotoOutcome> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return "no-match";
  if (product.coverKey) return "already";
  for (const ref of await referenceEntriesForModel(product.brand, product.model, 8)) {
    let entry: IcecatProduct;
    try {
      entry = await cachedIcecatProduct(ref.icecatId);
    } catch {
      continue;
    }
    const main = entry.images[0];
    if (!main || isRefurbished(entry.title)) continue;
    try {
      const normalized = await normalizeCatalogImage(await downloadIcecatImage(main.url), `catalog/${product.slug}/cover`);
      await putFiles(normalized.files);
      await prisma.product.update({ where: { id: productId }, data: { coverKey: normalized.key } });
      return "imported";
    } catch {
      continue;
    }
  }
  return "no-match";
}

/** Run `fn` over items with a small concurrency (kind to Icecat's servers) */
async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

/**
 * Photos for the whole catalog, no admin step: every color on sale gets its official photo in that
 * color, every model gets a cover. Safe to rerun: what already has photos is skipped.
 */
export async function syncAllPhotos(log: (m: string) => void = () => {}) {
  const finishes = await prisma.finish.findMany({
    where: {
      images: { none: { status: "APPROVED", angle: "FRONT" } },
      variants: { some: { offers: { some: { status: { in: ["ACTIVE", "PENDING_REVIEW"] } } } } },
    },
    select: { id: true },
  });
  const colors = { imported: 0, "no-match": 0, already: 0 };
  await pool(finishes, 3, async (f) => {
    colors[await ensureFinishPhotos(f.id).catch(() => "no-match" as const)]++;
  });
  log(`Couleurs en vente : ${colors.imported} avec photo officielle, ${colors["no-match"]} sans photo de cette couleur`);

  const products = await prisma.product.findMany({ where: { coverKey: null, status: { not: "MERGED" } }, select: { id: true } });
  const covers = { imported: 0, "no-match": 0, already: 0 };
  let done = 0;
  await pool(products, 4, async (p) => {
    covers[await ensureProductCover(p.id).catch(() => "no-match" as const)]++;
    if (++done % 100 === 0) log(`  couvertures : ${done} / ${products.length}`);
  });
  log(`Modèles : ${covers.imported} couvertures ajoutées, ${covers["no-match"]} sans photo officielle disponible`);
  return { colors, covers };
}
