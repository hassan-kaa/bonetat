import "server-only";
import type { DeviceKind } from "@prisma/client";
import { prisma } from "./prisma";
import { normalize, numbersMatch } from "./icecat-match";

// Searching the catalog the way a store types: typos ("elitebok 840 g8"), missing brand
// ("s23 ultra"), any word order. The catalog is built in advance (catalog-build.ts), so this
// is the only place a store looks for its model.

export type CatalogHit = { productId: string; brand: string; model: string; kind: DeviceKind; label: string; score: number };

export async function searchCatalog(query: string, opts: { brand?: string | null; limit?: number } = {}): Promise<CatalogHit[]> {
  const q = normalize(query);
  if (q.length < 2) return [];
  const brand = opts.brand ?? null;
  const rows = await prisma.$queryRaw<{ id: string; brand: string; model: string; kind: DeviceKind; searchText: string; score: number }[]>`
    SELECT id, brand, model, kind, "searchText", word_similarity(${q}, "searchText") AS score
    FROM products
    WHERE status <> 'MERGED'
      AND (${q} <% "searchText" OR "searchText" LIKE ${"%" + q + "%"})
      AND (${brand}::text IS NULL OR brand = ${brand}::text)
    ORDER BY score DESC, length(model) ASC
    LIMIT 60`;
  return rows
    // "iPhone 16 Pro Max" is never "iPhone 13 Pro Max"
    .filter((r) => numbersMatch(query, r.searchText))
    .slice(0, opts.limit ?? 10)
    .map((r) => ({
      productId: r.id,
      brand: r.brand,
      model: r.model,
      kind: r.kind,
      label: r.brand === "Apple" || r.model.toLowerCase().startsWith(r.brand.toLowerCase()) ? r.model : `${r.brand} ${r.model}`,
      score: Number(r.score),
    }));
}
