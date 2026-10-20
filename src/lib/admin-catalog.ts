import "server-only";
import { createHash } from "node:crypto";
import type { DeviceKind, ImageAngle } from "@prisma/client";
import { prisma } from "./prisma";
import { slugify } from "./utils";
import { canonicalKey, modelName } from "./product-identity";
import { familyOf, normalize } from "./icecat-match";
import { CATEGORY_FOR, productSearchText } from "./catalog-build";
import { FAMILY_HEX } from "./listing-publish";
import { storeOfficialPhoto } from "./catalog-photos";

// What the admin does by hand in the catalog: add a model no source has, add its colors, add its photos.
// Admin photos go online at once (the admin is the reviewer) but still go through the one door every
// catalog photo uses: resized, deduplicated, never a source the admin rejected before.

export class AdminCatalogError extends Error {}

export type NewProduct = { kind: DeviceKind; brand: string; line: string; modelNumber: string };

/** Products whose name is close to the new one (same brand, the same words in another order or one word off) */
async function closeNames(brand: string, name: string) {
  const wanted = new Set(normalize(name).split(" "));
  const sameBrand = await prisma.product.findMany({ where: { brand, status: { not: "MERGED" } }, select: { slug: true, model: true } });
  return sameBrand
    .map((p) => {
      const words = normalize(p.model).split(" ");
      const shared = words.filter((w) => wanted.has(w)).length;
      // One name inside the other ("7450" / "7450 Test"), or most words in common
      const inside = shared === Math.min(words.length, wanted.size);
      return { p, score: inside ? 1 : shared / Math.max(words.length, wanted.size) };
    })
    .filter((x) => x.score >= 0.75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ p }) => ({ slug: p.slug, name: `${brand} ${p.model}` }));
}

/**
 * Create a catalog model, live at once. Refused when the same model already exists (same canonical key),
 * and returns the close names otherwise so a near-duplicate can be caught before saving (`force` skips that).
 */
export async function createProduct(input: NewProduct, opts: { force?: boolean } = {}) {
  const brand = await prisma.brand.findFirst({ where: { name: { equals: input.brand, mode: "insensitive" } } });
  if (!brand) throw new AdminCatalogError("Marque inconnue : ajoutez-la d’abord");
  const line = input.line.trim();
  const modelNumber = input.modelNumber.trim();
  const model = modelName(line, modelNumber);
  const key = canonicalKey({ brand: brand.name, line, modelNumber });

  const existing = await prisma.product.findUnique({ where: { canonicalKey: key }, select: { slug: true, model: true } });
  if (existing) return { existing: { slug: existing.slug, name: `${brand.name} ${existing.model}` } };
  if (!opts.force) {
    const similar = await closeNames(brand.name, model);
    if (similar.length) return { similar };
  }

  const category = await prisma.category.findUnique({ where: { slug: CATEGORY_FOR[input.kind](brand.name) } });
  if (!category) throw new AdminCatalogError("Catégorie introuvable pour ce type d’appareil");
  const base = slugify(`${brand.name === "Apple" ? "" : brand.name} ${model}`);
  let slug = base;
  for (let i = 2; await prisma.product.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;

  await prisma.productLine.upsert({
    where: { brandId_slug: { brandId: brand.id, slug: slugify(line) } },
    update: { approved: true },
    create: { brandId: brand.id, name: line, slug: slugify(line), kind: input.kind, approved: true },
  });
  const product = await prisma.product.create({
    data: {
      slug, categoryId: category.id, brand: brand.name, model, line, modelNumber, kind: input.kind, canonicalKey: key,
      source: "admin", description: "", searchText: productSearchText({ brand: brand.name, model, line }),
    },
  });
  return { created: { slug: product.slug, name: `${brand.name} ${model}` } };
}

/** Add a color to a model: the family (for filters and search) comes from the name, the swatch from the family */
export async function addFinish(productId: string, nameFr: string, hex?: string) {
  const name = nameFr.trim();
  const finishes = await prisma.finish.findMany({ where: { productId } });
  if (finishes.some((f) => f.nameFr.toLowerCase() === name.toLowerCase())) throw new AdminCatalogError("Cette couleur existe déjà");
  const family = familyOf(name) ?? "OTHER";
  let slug = slugify(name);
  for (let i = 2; finishes.some((f) => f.slug === slug); i++) slug = `${slugify(name)}-${i}`;
  return prisma.finish.create({
    data: { productId, slug, nameFr: name, hex: hex || FAMILY_HEX[family], family, aliases: [], position: finishes.length },
  });
}

/** An image address the server may fetch: https, a real host name, not a local or private address */
function safeImageUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new AdminCatalogError("Adresse d’image invalide");
  }
  const host = u.hostname;
  if (u.protocol !== "https:" || host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":") || !host.includes(".")) {
    throw new AdminCatalogError("Seules les adresses https d’un site public sont acceptées");
  }
  return u;
}

const MAX_BYTES = 15_000_000;

async function fetchImage(raw: string): Promise<Buffer> {
  const u = safeImageUrl(raw);
  const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; BonetatCatalog/1.0)" }, signal: AbortSignal.timeout(15_000), redirect: "follow" }).catch(() => null);
  if (!res?.ok) throw new AdminCatalogError("Image inaccessible à cette adresse");
  if (!(res.headers.get("content-type") ?? "").startsWith("image/")) throw new AdminCatalogError("Cette adresse n’est pas une image");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new AdminCatalogError("Image trop lourde (15 Mo au plus)");
  return buf;
}

export type AdminPhoto = { productId: string; finishId: string | null; angle: ImageAngle } & ({ data: string } | { url: string });

/** Add one photo, online at once. finishId null: the model's photo whatever the color. */
export async function addPhoto(p: AdminPhoto) {
  if (p.finishId && !(await prisma.finish.findFirst({ where: { id: p.finishId, productId: p.productId }, select: { id: true } }))) {
    throw new AdminCatalogError("Couleur introuvable");
  }
  const fromUrl = "url" in p;
  const body = fromUrl ? null : Buffer.from(p.data, "base64");
  if (body && body.length > MAX_BYTES) throw new AdminCatalogError("Image trop lourde (15 Mo au plus)");
  const result = await storeOfficialPhoto({
    productId: p.productId,
    finishId: p.finishId,
    angle: p.angle,
    source: "OTHER",
    sourceRef: fromUrl ? "admin:url" : "admin:upload",
    // An upload has no address: its content stands in for one, so a rejected file is never accepted again
    sourceUrl: fromUrl ? p.url : `upload:${createHash("sha256").update(body!).digest("hex").slice(0, 32)}`,
    download: async () => (fromUrl ? fetchImage(p.url) : body!),
    approve: true,
  });
  // A color photo also becomes the model's photo when the model has none (a copy sharing the same file)
  if (result === "imported" && p.finishId && !(await prisma.catalogImage.count({ where: { productId: p.productId, finishId: null, status: "APPROVED" } }))) {
    const img = await prisma.catalogImage.findFirst({ where: { finishId: p.finishId, status: "APPROVED" }, orderBy: { createdAt: "desc" } });
    if (img) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, finishId, createdAt, ...rest } = img;
      await prisma.catalogImage.create({ data: { ...rest, finishId: null } });
    }
  }
  return result;
}
