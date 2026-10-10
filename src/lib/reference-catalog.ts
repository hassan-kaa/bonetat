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
export async function referenceEntriesForModel(brand: string, model: string, limit = 25): Promise<{ icecatId: number; modelName: string }[]> {
  const q = normalize(model);
  const rows = await prisma.$queryRaw<{ icecatId: number; brand: string; modelName: string }[]>`
    SELECT "icecatId", brand, "modelName" FROM reference_products
    WHERE ${q} <% "searchText"
      AND (lower(brand) = lower(${brand}) OR (lower(${brand}) = 'sony' AND lower(brand) = 'sony interactive entertainment'))
    ORDER BY word_similarity(${q}, "searchText") DESC, "picWidth" DESC
    LIMIT 300`;
  const wanted = { brand, model };
  return rows
    .filter((r) => !isRefurbished(r.modelName) && modelMatches(wanted, { brand: r.brand, modelName: cleanModelName(r.modelName, brand) }))
    .slice(0, limit)
    .map((r) => ({ icecatId: r.icecatId, modelName: r.modelName }));
}
