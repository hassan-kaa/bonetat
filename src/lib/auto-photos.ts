import "server-only";
import { prisma } from "./prisma";
import { cachedIcecatProduct } from "./icecat-index";
import { downloadIcecatImage } from "./icecat";
import { recordSource, storeOfficialPhoto } from "./catalog-photos";
import { isRefurbished, matchColor } from "./icecat-match";
import { referenceEntriesForModel } from "./reference-catalog";
import { importIcecatForFinish } from "./catalog-import";
import type { IcecatProduct } from "./icecat";
import type { ColorFamily } from "@prisma/client";

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
  if (await prisma.catalogImage.count({ where: { productId, finishId: null, status: "APPROVED" } })) return "already";
  for (const ref of await referenceEntriesForModel(product.brand, product.model, 8)) {
    let entry: IcecatProduct;
    try {
      entry = await cachedIcecatProduct(ref.icecatId);
    } catch {
      continue;
    }
    const main = entry.images[0];
    if (!main) continue;
    if (isRefurbished(entry.title)) {
      await recordSource("icecat", String(entry.icecatId), { productId, outcome: "skipped:refurbished", detail: entry.title });
      continue;
    }
    try {
      const r = await storeOfficialPhoto({
        productId,
        finishId: null,
        angle: "FRONT",
        source: "ICECAT",
        sourceRef: `icecat:${entry.icecatId}`,
        sourceUrl: main.url,
        download: () => downloadIcecatImage(main.url),
        approve: true,
      });
      await recordSource("icecat", String(entry.icecatId), { productId, outcome: r === "imported" ? "imported" : `skipped:${r}` });
      if (r === "imported") return "imported";
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

  const products = await prisma.product.findMany({
    where: { status: { not: "MERGED" }, images: { none: { finishId: null, status: "APPROVED" } } },
    select: { id: true },
  });
  const covers = { imported: 0, "no-match": 0, already: 0 };
  let done = 0;
  await pool(products, 4, async (p) => {
    covers[await ensureProductCover(p.id).catch(() => "no-match" as const)]++;
    if (++done % 100 === 0) log(`  couvertures : ${done} / ${products.length}`);
  });
  log(`Modèles : ${covers.imported} couvertures ajoutées, ${covers["no-match"]} sans photo officielle disponible`);
  return { colors, covers };
}

/**
 * A model's colors, created from Icecat when the catalog has none (one Icecat listing = the model in one
 * color), each with its official photo. One color per color family; refurbisher listings skipped.
 * Returns how many colors got a photo.
 */
const FAMILY_FR: Record<ColorFamily, string> = {
  BLACK: "Noir", WHITE: "Blanc", GREY: "Gris", SILVER: "Argent", GOLD: "Or", BLUE: "Bleu", GREEN: "Vert",
  PURPLE: "Violet", PINK: "Rose", RED: "Rouge", YELLOW: "Jaune", ORANGE: "Orange", OTHER: "Autre",
};

export async function ensureColorsFromIcecat(productId: string, log: (m: string) => void = () => {}): Promise<number> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return 0;
  const { FAMILY_HEX } = await import("./listing-publish");
  const { familyOf } = await import("./icecat-match");
  const { slugify } = await import("./utils");
  let added = 0;
  const done = new Set<string>();
  for (const ref of await referenceEntriesForModel(product.brand, product.model, 25)) {
    let entry: IcecatProduct;
    try {
      entry = await cachedIcecatProduct(ref.icecatId);
    } catch {
      continue;
    }
    if (!entry.images[0]) continue;
    if (isRefurbished(entry.title)) {
      await recordSource("icecat", String(entry.icecatId), { productId, outcome: "skipped:refurbished", detail: entry.title });
      continue;
    }
    // Watches have no "product color" field on Icecat: their title carries it ("… 4G Vert Wifi GPS")
    const fromTitle = entry.color || entry.colorName ? null : colorInTitle(entry.title);
    const family = familyOf(entry.colorName) ?? familyOf(entry.color) ?? familyOf(fromTitle);
    if (!family || done.has(family)) continue;
    done.add(family);

    const finishes = await prisma.finish.findMany({ where: { productId } });
    const names = [entry.color, entry.colorName, fromTitle].filter((x): x is string => !!x);
    let finish =
      finishes.find((f) => names.some((n) => f.nameFr.toLowerCase() === n.toLowerCase() || f.aliases.some((a) => a.toLowerCase() === n.toLowerCase()))) ??
      finishes.find((f) => f.family === family);
    if (!finish) {
      // French coarse color as the name ("Noir"), the brand's marketing name kept as an alias ("Phantom Black")
      // A two-tone listed as "Noir, Gris" is named by its family ("Gris"), the list kept as an alias
      const raw = (entry.color ?? entry.colorName ?? fromTitle)!;
      const name = raw.includes(",") ? FAMILY_FR[family] : raw.replace(/^\w/, (c) => c.toUpperCase());
      let slug = slugify(name);
      if (finishes.some((f) => f.slug === slug)) slug = `${slug}-${finishes.length + 1}`;
      finish = await prisma.finish.create({
        data: { productId, slug, nameFr: name, hex: FAMILY_HEX[family], family, aliases: names.filter((n) => n !== name), position: finishes.length },
      });
    }
    if (await prisma.catalogImage.count({ where: { finishId: finish.id, status: "APPROVED" } })) continue;
    const main = entry.images[0];
    const r = await storeOfficialPhoto({
      productId,
      finishId: finish.id,
      angle: "FRONT",
      source: "ICECAT",
      sourceRef: `icecat:${entry.icecatId}`,
      sourceUrl: main.url,
      download: () => downloadIcecatImage(main.url),
      approve: true,
    }).catch(() => "error" as const);
    await recordSource("icecat", String(entry.icecatId), { productId, finishId: finish.id, outcome: r === "imported" ? "imported" : `skipped:${r}` });
    if (r === "imported") {
      added++;
      log(`  ${product.model} ${finish.nameFr}: imported`);
    }
  }
  return added;
}

/** The first French color word of an Icecat title, as written ("Vert", "Argent", "Or rose") */
const TITLE_COLORS = ["or rose", "gris sidéral", "noir", "blanc", "gris", "graphite", "argent", "or", "rose", "bleu", "vert", "violet", "lavande", "rouge", "jaune", "orange", "crème", "beige", "marron", "bronze"];
function colorInTitle(title: string): string | null {
  const t = ` ${title.toLowerCase()} `;
  let best: { word: string; at: number } | null = null;
  for (const w of TITLE_COLORS) {
    const at = t.search(new RegExp(`[\\s,(]${w}[\\s,)]`));
    if (at >= 0 && (!best || at < best.at || (at === best.at && w.length > best.word.length))) best = { word: w, at };
  }
  return best ? best.word.replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : null;
}
