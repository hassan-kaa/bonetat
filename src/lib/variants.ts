// Variant identity and finish (color) matching. Safe to import from client and server.
import type { ColorFamily } from "@prisma/client";
import { slugify } from "./utils";

/**
 * The one string that identifies a variant inside its product: "256|8|-|bleu-alpin".
 * Stored in Variant.signature with a unique index, because Postgres treats NULLs as
 * distinct and a unique index on the nullable axes would let duplicates through.
 */
export function variantSignature(v: {
  storageGb: number | null;
  ramGb: number | null;
  option: string | null;
  finishSlug: string;
}): string {
  return [v.storageGb ?? "-", v.ramGb ?? "-", v.option ?? "-", v.finishSlug].join("|");
}

export type FinishMatchable = { id: string; slug: string; aliases: string[]; family: ColorFamily };

/**
 * Find the finish on another product that best matches the one the buyer had:
 * same slug, then an alias with that slug, then the same color family.
 * Keeps "Vert" on the iPhone 11 when the buyer switches to the 11 Pro ("Vert nuit").
 */
export function matchFinish<T extends FinishMatchable>(
  finishes: T[],
  want: { slug?: string | null; family?: string | null }
): T | null {
  if (want.slug) {
    const bySlug = finishes.find((f) => f.slug === want.slug);
    if (bySlug) return bySlug;
    const byAlias = finishes.find((f) => f.aliases.some((a) => slugify(a) === want.slug));
    if (byAlias) return byAlias;
  }
  if (want.family) return finishes.find((f) => f.family === want.family) ?? null;
  return null;
}
