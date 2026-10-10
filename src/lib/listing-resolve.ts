import "server-only";
import type { DeviceKind } from "@prisma/client";
import { prisma } from "./prisma";
import { displayName } from "./catalog";
import { canonicalKey, modelName } from "./product-identity";
import { matchColor, modelMatches, normalize } from "./icecat-match";
import { searchCatalog } from "./catalog-search";
import { sanitizeSellerText } from "./seller-text";
import type { ListingExtraction } from "./listing-ai";

// Smart listing, step 2: turn what the AI read into a pre-filled publish form.
// Everything here is deterministic: which product it is, what is filled, what is missing.

/** A catalog product the post may be about (the catalog is complete in advance) */
export type ProductCandidate = { productId: string; label: string };

export type ResolvedListing = {
  kind: DeviceKind | null;
  brand: string | null;
  /** The AI's brand isn't on our list: the store picks one */
  brandUnknown: string | null;
  line: string | null;
  /** The AI's line isn't on the brand's list: proposed as a new line */
  lineIsNew: boolean;
  modelNumber: string | null;
  /** The exact catalog product (canonical key match) */
  product: { id: string; name: string; slug: string } | null;
  /** "C'est l'un de ces modèles ?" when there's no exact match */
  candidates: ProductCandidate[];
  prefill: {
    storageGb: number | null;
    ramGb: number | null;
    /** Laptop configuration shown as "Version": CPU · GPU */
    option: string | null;
    colorAsWritten: string | null;
    finishId: string | null;
    priceMillimes: number | null;
    batteryHealth: number | null;
    sellerNote: string | null;
    specs: { label: string; value: string }[];
  };
  /** The post's own condition words, shown next to the grade buttons, never used to pick a grade */
  conditionAsWritten: string | null;
  /** Fields the store must answer (French labels) */
  missing: string[];
  warnings: string[];
};

const NEEDS_STORAGE: (DeviceKind | null)[] = ["PHONE", "TABLET", "LAPTOP"];

/** Model-level specs read from a post (screen, ports, keyboard…), cleaned of any contact detail */
export function specsFromExtraction(x: Pick<ListingExtraction, "screen" | "otherSpecs">): { label: string; value: string }[] {
  return [
    ...(x.screen ? [{ label: "Écran", value: sanitizeSellerText(x.screen) }] : []),
    ...x.otherSpecs.map((s) => ({ label: sanitizeSellerText(s.label), value: sanitizeSellerText(s.value) })),
  ].filter((s) => s.label && s.value && s.label !== "Provenance");
}

export async function resolveListing(x: ListingExtraction): Promise<ResolvedListing> {
  const brands = await prisma.brand.findMany({ include: { lines: { where: { approved: true } } } });
  const brandRow = x.brand ? brands.find((b) => normalize(b.name) === normalize(x.brand!)) ?? null : null;
  const lines = brandRow?.lines.map((l) => l.name) ?? [];
  const lineRow = x.line ? lines.find((l) => normalize(l).replace(/ /g, "") === normalize(x.line!).replace(/ /g, "")) ?? null : null;
  const line = lineRow ?? x.line;
  const brand = brandRow?.name ?? null;

  // 1. Exact product: same canonical key
  const key = brand && line && x.modelNumber ? canonicalKey({ brand, line, modelNumber: x.modelNumber }) : null;
  const exact = key ? await prisma.product.findUnique({ where: { canonicalKey: key }, include: { finishes: true } }) : null;

  // 2. Otherwise up to 3 catalog products. Only with a model number: a vague post ("Dell Vostro i5 12th")
  // gets no guesses, the store reads the exact model on the sticker. Strict rules: "13 Pro Max" never
  // suggests "13 Pro", "OMEN 17" never suggests an OMEN desktop "GT17".
  const candidates: ProductCandidate[] = [];
  const query = line && x.modelNumber ? modelName(line, x.modelNumber) : null;
  if (!exact && query) {
    const wanted = { brand: brand ?? x.brand ?? "", model: query };
    const anyGeneration = !/\bgen\d/.test(normalize(query));
    const hits = (await searchCatalog(query, { brand, limit: 12 })).filter((h) => modelMatches(wanted, { brand: h.brand, modelName: h.model }, { anyGeneration }));
    for (const h of hits.slice(0, 3)) candidates.push({ productId: h.productId, label: h.label });
  }

  // 3. Pre-filled values
  const kind = (exact?.kind ?? x.kind) as DeviceKind | null;
  const option = kind === "LAPTOP" ? [x.cpu, x.gpu].filter(Boolean).join(" · ") || null : null;
  const color = exact && x.color ? matchColor(exact.finishes, { color: x.color, colorName: x.color }) : null;
  const note = sanitizeSellerText(x.included.join(", ")).slice(0, 200) || null;
  const specs = specsFromExtraction(x);

  const missing: string[] = [];
  if (!brand) missing.push("Marque");
  if (!x.modelNumber && !exact) missing.push("Modèle exact (numéro sous l’appareil)");
  if (NEEDS_STORAGE.includes(kind) && !x.storageGb) missing.push("Stockage");
  if (kind === "LAPTOP" && !x.ramGb) missing.push("Mémoire vive");
  if (!x.color) missing.push("Couleur");
  if (kind !== "CONSOLE" && x.batteryHealth === null) missing.push("Santé de la batterie");
  if (!x.priceDt) missing.push("Prix");
  missing.push("État selon la grille Bonétat");
  if (kind === "PHONE") missing.push("IMEI");

  const warnings = [...x.warnings];
  if (x.sealedNew) warnings.push("L’annonce dit « neuf » : choisissez l’état réel selon la grille Bonétat.");
  if (x.brand && !brand) warnings.push(`Marque « ${x.brand} » absente de la liste : choisissez-la ou demandez son ajout.`);

  return {
    kind,
    brand,
    brandUnknown: x.brand && !brand ? x.brand : null,
    line,
    lineIsNew: !!line && !lineRow,
    modelNumber: x.modelNumber,
    product: exact ? { id: exact.id, name: displayName(exact), slug: exact.slug } : null,
    candidates,
    prefill: {
      storageGb: x.storageGb,
      ramGb: x.ramGb,
      option,
      colorAsWritten: x.color,
      finishId: color?.finishId ?? null,
      priceMillimes: x.priceDt ? Math.round(x.priceDt * 1000) : null,
      batteryHealth: x.batteryHealth,
      sellerNote: note,
      specs,
    },
    conditionAsWritten: x.conditionAsWritten,
    missing,
    warnings,
  };
}
