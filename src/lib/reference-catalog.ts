import "server-only";
import type { DeviceKind } from "@prisma/client";
import { prisma } from "./prisma";
import { BRAND_LINES } from "./brands";
import { slugify } from "./utils";
import { loadIndex } from "./icecat-index";
import { cleanModelName, isAccessory, isRefurbished, modelMatches, normalize, numbersMatch } from "./icecat-match";

// The reference catalog: Icecat index rows for every brand on our Brand list, in Postgres,
// searchable with typos (pg_trgm). It answers "which real model is this?" when a store lists
// something we don't have yet. Never shown to buyers.

const BATCH = 5000;

/** The brand list in code (src/lib/brands.ts) is the source: new brands and lines are added, nothing is removed */
async function syncBrandLists() {
  for (const [i, [name, lines]] of Object.entries(BRAND_LINES).entries()) {
    const brand = await prisma.brand.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name), position: i } });
    for (const line of lines) {
      await prisma.productLine.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: slugify(line) } },
        update: {},
        create: { brandId: brand.id, name: line, slug: slugify(line) },
      });
    }
  }
}

/**
 * Rebuild the reference catalog from the cached Icecat index: every phone, tablet, laptop,
 * watch and console of every brand on our list. Brand lists are synced from code first.
 */
export async function syncReferenceCatalog(opts: { refreshIndex?: boolean; log?: (m: string) => void } = {}) {
  await syncBrandLists();
  const brands = (await prisma.brand.findMany({ select: { name: true } })).map((b) => b.name);
  const rows = (await loadIndex(brands, { refresh: opts.refreshIndex, log: opts.log })).filter(
    // Refurbished reseller listings and nameless rows don't help identify a model
    (r) => r.modelName.trim().length > 1 && !isRefurbished(r.modelName) && !isAccessory(r.modelName)
  );
  // A full rebuild: entries that left the index (or the device categories) disappear too
  await prisma.referenceProduct.deleteMany();
  let created = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const res = await prisma.referenceProduct.createMany({
      data: rows.slice(i, i + BATCH).map((r) => ({
        icecatId: r.icecatId,
        brand: r.brand,
        modelName: r.modelName.trim(),
        productCode: r.productCode,
        searchText: normalize(`${r.brand} ${r.modelName} ${r.productCode}`),
        picWidth: r.picWidth,
        kind: r.kind,
      })),
      skipDuplicates: true,
    });
    created += res.count;
  }
  return { rows: rows.length, created };
}

export type ReferenceHit = {
  icecatId: number;
  brand: string;
  /** Model as a person names it, SKU and marketing tails removed */
  modelName: string;
  productCode: string;
  score: number;
  /** How many Icecat entries (SKUs, regions) share this model name */
  variants: number;
  /** From the Icecat category */
  kind: DeviceKind;
};

/**
 * Real models matching what the store typed or what the AI read, best first, one row per model name.
 * Typo-tolerant: "elitebok 8 g1i" still finds "EliteBook 8 G1i".
 */
export async function searchReference(query: string, brand?: string | null, limit = 8): Promise<ReferenceHit[]> {
  const q = normalize(query);
  if (q.length < 2) return [];
  const rows = await prisma.$queryRaw<Omit<ReferenceHit, "variants">[]>`
    SELECT "icecatId", brand, "modelName", "productCode", kind, word_similarity(${q}, "searchText") AS score
    FROM reference_products
    WHERE ${q} <% "searchText"
      AND (${brand ?? null}::text IS NULL OR lower(brand) = lower(${brand ?? null}::text)
           OR (lower(${brand ?? null}::text) = 'sony' AND lower(brand) = 'sony interactive entertainment'))
    ORDER BY score DESC, "picWidth" DESC
    LIMIT 200`;
  // One row per model as a person names it, best-scoring entry kept
  const byModel = new Map<string, ReferenceHit>();
  for (const r of rows) {
    const modelName = cleanModelName(r.modelName, r.brand);
    if (!modelName || isAccessory(modelName) || !numbersMatch(query, `${modelName} ${r.productCode}`)) continue;
    const k = `${r.brand.toLowerCase()}|${normalize(modelName)}`;
    const hit = byModel.get(k);
    if (hit) hit.variants++;
    else byModel.set(k, { ...r, modelName, score: Number(r.score), variants: 1 });
  }
  return [...byModel.values()].slice(0, limit);
}

/**
 * Every Icecat entry of one model (all colors, regions, storages), best pictures first.
 * Used to find official photos for a given color. Refurbished reseller listings are excluded.
 */
/** "Watch4" → "Watch 4": brands glue a series word to its number ("Galaxy Watch4"), our catalog doesn't */
const unglue = (name: string) => name.replace(/([a-z])(\d)/gi, "$1 $2");

/** A trailing machine code ("TUF Gaming A15 FA506NCG", "Vivobook 15 X1504VA"): Icecat files the laptop under it */
const MACHINE_CODE = /\b([A-Z]{1,3}\d{3,4}[A-Z]{0,4})$/;
/** Asus TUF names without a code, and the code families Icecat files them under */
const CODE_FAMILIES: Record<string, string[]> = {
  "TUF Gaming F15": ["FX506", "FX507"], "TUF Gaming A15": ["FA506", "FA507"],
  "TUF Gaming F17": ["FX706", "FX707"], "TUF Gaming A17": ["FA706", "FA707"],
  "TUF Gaming F16": ["FX607"], "TUF Gaming A16": ["FA607"], "TUF Gaming A14": ["FA401"],
};

/**
 * Icecat rows named by the model's machine code plus a SKU suffix: "FA506NCG" → "FA506NCG-HN184W".
 * Strict on purpose: "FA506NC-HN036" never feeds "FA506NCG" (a different GPU, sometimes a different body).
 */
async function entriesByCode(brand: string, model: string, limit: number) {
  const families = CODE_FAMILIES[model];
  const code = model.match(MACHINE_CODE)?.[1];
  if (!families && !code) return [];
  const brandIs = { equals: brand, mode: "insensitive" as const };
  const OR = families
    ? families.map((f) => ({ modelName: { startsWith: f, mode: "insensitive" as const } }))
    : [{ modelName: { equals: code!, mode: "insensitive" as const } }, { modelName: { startsWith: `${code}-`, mode: "insensitive" as const } }];
  const rows = await prisma.referenceProduct.findMany({ where: { brand: brandIs, OR }, orderBy: { picWidth: "desc" }, take: 300, select: { icecatId: true, modelName: true } });
  return rows.filter((r) => !isRefurbished(r.modelName)).slice(0, limit);
}

/** HP's sales code "15-fa1003na" belongs to the series "15-fa1000" (same rule as the Tunisianet source) */
const hpSeries = (s: string) => s.replace(/\b(\d{2})-([a-z]{2})(\d)\d{3}[a-z]{2}\b/gi, (_, a, b, c) => `${a}-${b.toLowerCase()}${c}000`);

/**
 * Icecat rows whose name STARTS with our model, the rest being a configuration suffix:
 *   MSI   "Katana 15 B13V"   → "Katana 15 B13VFK-1850ID"
 *   Acer  "Nitro 5 AN515-57" → "AN515-57-757K" (Icecat names Acer by code only)
 *   HP    "EliteBook 835 G9" → "835 G9" (no line name), "Victus 15-fa1000" → "Victus 15-fa1003na",
 *         "EliteBook x360 1040 G10" → "Elite x360 1040 G10 …"
 * The character after our name may never be a digit ("840 G1" never takes "840 G10"). Dell is left out: its
 * Icecat names collide across years ("E7450" is 2015, our Latitude 7450 is 2024).
 */
async function entriesByPrefix(brand: string, model: string, limit: number) {
  if (!/\d/.test(model) || !["msi", "acer", "hp"].includes(brand.toLowerCase())) return [];
  const prefixes = new Set([model]);
  const acerCode = model.match(/\b([A-Z]{2,4}\d{2,3}-\d{2})$/)?.[1];
  if (acerCode) prefixes.add(acerCode);
  if (brand.toLowerCase() === "hp") {
    const noLine = model.replace(/^(EliteBook|ProBook|ZBook)\s+/i, "");
    if (noLine !== model && /^\d/.test(noLine)) prefixes.add(noLine);
    if (/^EliteBook x360 /i.test(model)) prefixes.add(model.replace(/^EliteBook x360/i, "Elite x360"));
  }
  const brandIs = { equals: brand, mode: "insensitive" as const };
  // HP series ("15-fa1000"): fetch on the series stem, compare after reducing each row's sales code
  const hpStem = brand.toLowerCase() === "hp" ? model.match(/^(.*\b\d{2}-[a-z]{2}\d)000$/i)?.[1] : null;
  const rows = await prisma.referenceProduct.findMany({
    where: { brand: brandIs, OR: [...[...prefixes].map((p) => ({ modelName: { startsWith: p, mode: "insensitive" as const } })), ...(hpStem ? [{ modelName: { startsWith: hpStem, mode: "insensitive" as const } }] : [])] },
    orderBy: { picWidth: "desc" },
    take: 300,
    select: { icecatId: true, modelName: true },
  });
  const ok = (name: string) =>
    [...prefixes].some((p) => {
      const n = (hpStem ? hpSeries(name) : name).toLowerCase();
      if (!n.startsWith(p.toLowerCase())) return false;
      const next = n.charAt(p.length);
      return !/\d/.test(next); // "G1" must not take "G10"
    });
  return rows.filter((r) => !isRefurbished(r.modelName) && ok(r.modelName)).slice(0, limit);
}

export async function referenceEntriesForModel(brand: string, model: string, limit = 25): Promise<{ icecatId: number; modelName: string }[]> {
  const byCode = await entriesByCode(brand, model, limit);
  if (byCode.length) return byCode;
  const byPrefix = await entriesByPrefix(brand, model, limit);
  if (byPrefix.length) return byPrefix;
  const q = normalize(model);
  const rows = await prisma.$queryRaw<{ icecatId: number; brand: string; modelName: string }[]>`
    SELECT "icecatId", brand, "modelName" FROM reference_products
    WHERE ${q} <% "searchText"
      AND (lower(brand) = lower(${brand}) OR (lower(${brand}) = 'sony' AND lower(brand) = 'sony interactive entertainment'))
    ORDER BY word_similarity(${q}, "searchText") DESC, "picWidth" DESC
    LIMIT 300`;
  // Unglued BEFORE the cleanup: cleanModelName drops letter+digit tokens as SKUs, "Watch4" included
  const wanted = { brand, model: unglue(model) };
  return rows
    .filter((r) => !isRefurbished(r.modelName) && modelMatches(wanted, { brand: r.brand, modelName: cleanModelName(unglue(r.modelName), brand) }))
    .slice(0, limit)
    .map((r) => ({ icecatId: r.icecatId, modelName: r.modelName }));
}
