import "server-only";
import type { ColorFamily, DeviceKind, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { canonicalKey, modelName, nearDuplicates, splitModel } from "./product-identity";
import { cleanModelName, normalize } from "./icecat-match";
import { slugify } from "./utils";
import { productSearchText } from "./catalog-build";
import { variantSignature } from "./variants";

// Smart listing, step 3: create what the store's device needs and doesn't exist yet,
// a product (from the reference catalog or typed by the store) and a configuration.

export class PublishError extends Error {}

/** Where a store-created product is filed: Apple gets its own categories, as in the seeded catalog */
const CATEGORY_FOR: Record<DeviceKind, (brand: string) => string> = {
  PHONE: (b) => (b === "Apple" ? "iphone" : "android"),
  TABLET: (b) => (b === "Apple" ? "ipad" : "tablettes-android"),
  LAPTOP: (b) => (b === "Apple" ? "macbook" : "ordinateurs"),
  WATCH: () => "montres",
  CONSOLE: () => "consoles",
  OTHER: () => "ordinateurs",
};

/** Swatch color for a store-created color, by family (admin can refine it later) */
export const FAMILY_HEX: Record<ColorFamily, string> = {
  BLACK: "#202125", WHITE: "#F1F0EB", GREY: "#6B6E75", SILVER: "#D9DCE2", GOLD: "#EAD7BF", BLUE: "#2F5C8F",
  GREEN: "#C4E6D2", PURPLE: "#CFC6E6", PINK: "#F2D4D7", RED: "#B3202D", YELLOW: "#F4D35E", ORANGE: "#F28C38", OTHER: "#9AA0A6",
};

export type NewModelInput =
  | { from: "reference"; icecatId: number; kind?: DeviceKind }
  | { from: "manual"; brand: string; line: string; modelNumber: string; kind: DeviceKind };

/**
 * Create the product a store is listing, or return the existing one when it turns out to be
 * a duplicate. The catalog is complete in advance, so this is the rare case: the product is live
 * at once (no approval); admin can still correct or merge it from "Modèles ajoutés par les ateliers".
 */
export async function createProductForStore(input: NewModelInput, vendorId: string) {
  const brands = await prisma.brand.findMany({ include: { lines: true } });

  let brand: string;
  let line: string;
  let modelNumber: string;
  let referenceId: string | null = null;
  let kind: DeviceKind = input.kind ?? "OTHER";
  /** A line the store typed that isn't on the brand's list yet: saved only if the product is really new */
  let newLine: { brandId: string; name: string } | null = null;
  if (input.from === "reference") {
    const ref = await prisma.referenceProduct.findUnique({ where: { icecatId: input.icecatId } });
    if (!ref) throw new PublishError("Modèle de référence introuvable");
    const b = brands.find((x) => ref.brand.toLowerCase() === x.name.toLowerCase() || ref.brand.toLowerCase().startsWith(x.name.toLowerCase() + " "));
    if (!b) throw new PublishError(`Marque « ${ref.brand} » absente de la liste`);
    const split = splitModel(cleanModelName(ref.modelName, b.name), b.lines.map((l) => l.name));
    if (!split) throw new PublishError("Ce modèle de référence n’a pas de numéro de modèle exploitable : créez-le à la main");
    ({ line, modelNumber } = split);
    brand = b.name;
    referenceId = ref.id;
    kind = input.kind ?? ref.kind;
  } else {
    const b = brands.find((x) => x.name === input.brand);
    if (!b) throw new PublishError("Choisissez la marque dans la liste");
    brand = b.name;
    line = input.line.trim();
    modelNumber = input.modelNumber.trim().replace(/\s+/g, " ");
    if (!line || !modelNumber) throw new PublishError("Indiquez la gamme et le numéro de modèle");
    // "Elite Book" is "EliteBook": compare without spaces, and reuse the known spelling
    const squash = (x: string) => normalize(x).replace(/ /g, "");
    const known = b.lines.find((l) => squash(l.name) === squash(line));
    if (known) line = known.name;
    else newLine = { brandId: b.id, name: line };
    kind = input.kind;
  }

  const products = await prisma.product.findMany({
    where: { brand, status: { not: "MERGED" } },
    select: { id: true, brand: true, line: true, modelNumber: true, canonicalKey: true },
  });
  const { exact } = nearDuplicates({ brand, line, modelNumber }, products);
  if (exact) return prisma.product.findUniqueOrThrow({ where: { id: exact.id } });
  // A new line joins the brand's list, pending review with the product
  if (newLine) {
    await prisma.productLine.create({ data: { brandId: newLine.brandId, name: newLine.name, slug: slugify(newLine.name), kind, approved: false } });
  }

  const category = await prisma.category.findUnique({ where: { slug: CATEGORY_FOR[kind](brand) } });
  if (!category) throw new PublishError("Catégorie introuvable");
  const model = modelName(line, modelNumber);
  const base = slugify(`${brand === "Apple" ? "" : brand} ${model}`);
  let slug = base;
  for (let i = 2; await prisma.product.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  return prisma.product.create({
    data: {
      slug,
      categoryId: category.id,
      brand,
      model,
      line,
      modelNumber,
      kind,
      canonicalKey: canonicalKey({ brand, line, modelNumber }),
      status: "ACTIVE",
      source: input.from === "reference" ? "icecat" : "store",
      searchText: productSearchText({ brand, model, line }),
      createdByVendorId: vendorId,
      referenceId,
      description: "",
    },
  });
}

export type VariantInput = {
  productId: string;
  storageGb: number | null;
  ramGb: number | null;
  option: string | null;
  finish: { id: string } | { name: string; family: ColorFamily };
};

/** The configuration a store is listing: the existing variant, or a new one (and a new color if needed) */
export async function ensureVariant(input: VariantInput, tx: Prisma.TransactionClient = prisma) {
  let finish;
  if ("id" in input.finish) {
    finish = await tx.finish.findFirst({ where: { id: input.finish.id, productId: input.productId } });
    if (!finish) throw new PublishError("Couleur introuvable pour ce modèle");
  } else {
    const name = input.finish.name.trim();
    if (!name) throw new PublishError("Indiquez la couleur");
    const slug = slugify(name);
    finish =
      (await tx.finish.findUnique({ where: { productId_slug: { productId: input.productId, slug } } })) ??
      (await tx.finish.create({
        data: {
          productId: input.productId,
          slug,
          nameFr: name.charAt(0).toUpperCase() + name.slice(1),
          hex: FAMILY_HEX[input.finish.family],
          family: input.finish.family,
          position: await tx.finish.count({ where: { productId: input.productId } }),
        },
      }));
  }
  const option = input.option?.trim() || null;
  const signature = variantSignature({ storageGb: input.storageGb, ramGb: input.ramGb, option, finishSlug: finish.slug });
  return (
    (await tx.variant.findUnique({ where: { productId_signature: { productId: input.productId, signature } } })) ??
    tx.variant.create({
      data: {
        productId: input.productId,
        storageGb: input.storageGb,
        ramGb: input.ramGb,
        option,
        finishId: finish.id,
        signature,
        position: await tx.variant.count({ where: { productId: input.productId } }),
      },
    })
  );
}
