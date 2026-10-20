import "server-only";
import type { DeviceKind } from "@prisma/client";
import { prisma } from "./prisma";
import { displayName } from "./catalog";
import { canonicalKey, modelName } from "./product-identity";
import { matchColor, modelMatches, normalize } from "./icecat-match";
import { searchCatalog } from "./catalog-search";
import { sanitizeSellerText } from "./seller-text";
import type { ListingExtraction } from "./listing-ai";
import { hpSeries } from "./sources/tunisianet-laptops";

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

/**
 * What a shop writes around a model number that isn't the model: a screen size ("13.6\"" on a MacBook Air 13,
 * "16P"), quotes, and HP's sales code instead of its series ("15-EC1001NK" → "15-ec1000").
 */
export function cleanModelNumber(brand: string | null, modelNumber: string | null): string | null {
  if (!modelNumber) return null;
  let m = modelNumber.replace(/["”″]|''|\bpouces?\b|\binch(es)?\b/gi, " ");
  m = m.replace(/\b(1[1-8])[.,]\d\b/g, "$1"); // 13.6 → 13, 15.3 → 15, 16.2 → 16
  m = m.replace(/\b(1[1-8])p\b/gi, ""); // "16P": a size, not the model
  if (brand === "HP") m = hpSeries(m);
  m = m.replace(/\s+/g, " ").trim();
  return m || null;
}

const tokenSet = (s: string) => new Set(normalize(s).split(" ").filter(Boolean));

/**
 * Laptops only: when no product is an exact match, the products of the same family, best first. The family is
 * the line plus the first word of the model ("Thin GF63", "Stealth 16", "Raider A18"), or the line alone when it
 * already carries the number ("V16"). Ranked by words in common with the post. Phones never get this: there,
 * "13 Pro Max" must never suggest "13 Pro".
 */
async function familyCandidates(brand: string, line: string, modelNumber: string, exclude: string[], limit = 4): Promise<ProductCandidate[]> {
  const wanted = tokenSet(modelNumber ? modelName(line, modelNumber) : line);
  const lineWords = normalize(line).split(" ");
  const first = normalize(modelNumber).split(" ")[0];
  const family = /\d/.test(line) || !first ? lineWords : [...lineWords, first];
  const products = await prisma.product.findMany({ where: { brand, kind: "LAPTOP", status: { not: "MERGED" } }, select: { id: true, brand: true, model: true } });
  return products
    .filter((p) => !exclude.includes(p.id))
    .map((p) => ({ p, words: normalize(p.model).split(" ") }))
    .filter(({ words }) => family.every((w, i) => words[i] === w))
    .map(({ p, words }) => ({ p, shared: words.filter((w) => wanted.has(w)).length, extra: words.filter((w) => !wanted.has(w)).length }))
    .sort((a, b) => b.shared - a.shared || a.extra - b.extra)
    .slice(0, limit)
    .map(({ p }) => ({ productId: p.id, label: displayName(p) }));
}

export async function resolveListing(x: ListingExtraction): Promise<ResolvedListing> {
  const brands = await prisma.brand.findMany({ include: { lines: { where: { approved: true } } } });
  const brandRow = x.brand ? brands.find((b) => normalize(b.name) === normalize(x.brand!)) ?? null : null;
  const lines = brandRow?.lines.map((l) => l.name) ?? [];
  const lineRow = x.line ? lines.find((l) => normalize(l).replace(/ /g, "") === normalize(x.line!).replace(/ /g, "")) ?? null : null;
  const line = lineRow ?? x.line;
  const brand = brandRow?.name ?? null;
  const modelNumber = cleanModelNumber(brand, x.modelNumber);

  // 1. Exact product: same canonical key, else the same words in another order ("1040 x360 G8" = "x360 1040 G8")
  const key = brand && line && modelNumber ? canonicalKey({ brand, line, modelNumber }) : null;
  let exact = key ? await prisma.product.findUnique({ where: { canonicalKey: key }, include: { finishes: true } }) : null;
  if (!exact && brand && line && modelNumber) {
    const wanted = tokenSet(modelName(line, modelNumber));
    const sameBrand = await prisma.product.findMany({ where: { brand, status: { not: "MERGED" } }, select: { id: true, model: true } });
    const hit = sameBrand.find((p) => {
      const t = tokenSet(p.model);
      return t.size === wanted.size && [...t].every((w) => wanted.has(w));
    });
    if (hit) exact = await prisma.product.findUnique({ where: { id: hit.id }, include: { finishes: true } });
  }

  // 1b. A laptop that matched a generic entry ("IdeaPad Gaming 3", "Thin 15") while the catalog has its exact
  // generations ("IdeaPad Gaming 3 15IMH05"): not picked automatically, the generations are suggested instead
  let generic: string | null = null;
  if (exact && exact.kind === "LAPTOP") {
    const prefix = `${exact.model} `;
    const longer = await prisma.product.findMany({ where: { brand: exact.brand, kind: "LAPTOP", status: { not: "MERGED" }, model: { startsWith: prefix, mode: "insensitive" } }, select: { model: true } });
    // A generation adds a code with a digit ("15IMH05", "B13U", "G2 ITL"); a word is another model ("L380 Yoga")
    if (longer.some((p) => /\d/.test(p.model.slice(prefix.length).split(" ")[0]))) {
      generic = exact.id;
      exact = null;
    }
  }

  // 2. Otherwise up to 3 catalog products. Only with a model number: a vague post ("Dell Vostro i5 12th")
  // gets no guesses, the store reads the exact model on the sticker. Strict rules: "13 Pro Max" never
  // suggests "13 Pro", "OMEN 17" never suggests an OMEN desktop "GT17".
  const candidates: ProductCandidate[] = [];
  const query = line && modelNumber ? modelName(line, modelNumber) : null;
  if (!exact && query) {
    const wanted = { brand: brand ?? x.brand ?? "", model: query };
    const anyGeneration = !/\bgen\d/.test(normalize(query));
    const hits = (await searchCatalog(query, { brand, limit: 12 })).filter((h) => modelMatches(wanted, { brand: h.brand, modelName: h.model }, { anyGeneration }));
    for (const h of hits.slice(0, 3)) candidates.push({ productId: h.productId, label: h.label });
  }
  // 2b. Laptops: the model's family, when the strict search found nothing close enough
  // A line that already names the family ("V16", "G16") is enough even without a model code
  const familyOk = modelNumber || (line && /\d/.test(line));
  // A generic entry with generations: those generations only, up to 6, so the shop finds the code on its sticker
  if (generic) candidates.splice(0, candidates.length, ...candidates.filter((c) => c.productId !== generic));
  if (!exact && brand && line && familyOk && (x.kind === "LAPTOP" || x.kind === null) && (candidates.length < 3 || generic)) {
    const max = generic ? 6 : 4;
    const more = await familyCandidates(brand, line, modelNumber ?? "", [...candidates.map((c) => c.productId), ...(generic ? [generic] : [])], max);
    candidates.push(...more.slice(0, max - candidates.length));
  }

  // 3. Pre-filled values
  const kind = (exact?.kind ?? x.kind) as DeviceKind | null;
  const option = kind === "LAPTOP" ? [x.cpu, x.gpu].filter(Boolean).join(" · ") || null : null;
  const color = exact && x.color ? matchColor(exact.finishes, { color: x.color, colorName: x.color }) : null;
  const note = sanitizeSellerText(x.included.join(", ")).slice(0, 200) || null;
  const specs = specsFromExtraction(x);

  const missing: string[] = [];
  if (!brand) missing.push("Marque");
  if (!modelNumber && !exact) missing.push("Modèle exact (numéro sous l’appareil)");
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
    modelNumber,
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
