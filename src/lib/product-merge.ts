import "server-only";
import { prisma } from "./prisma";
import { canonicalKey, modelName } from "./product-identity";
import { variantSignature } from "./variants";

export class MergeError extends Error {}

/**
 * Fold a duplicate product into the canonical one. Colors with the same name are shared,
 * configurations with the same signature are merged (their offers move over), everything
 * else moves as is. The duplicate stays as MERGED so its old URL can redirect.
 */
export async function mergeProducts(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new MergeError("Choisissez un autre modèle");
  return prisma.$transaction(async (tx) => {
    const source = await tx.product.findUnique({ where: { id: sourceId }, include: { finishes: true, variants: { include: { finish: true } } } });
    const target = await tx.product.findUnique({ where: { id: targetId }, include: { finishes: true, variants: true } });
    if (!source || !target) throw new MergeError("Modèle introuvable");
    if (source.status === "MERGED" || target.status === "MERGED") throw new MergeError("Ce modèle est déjà fusionné");

    // Colors: reuse the target's color with the same slug, otherwise move the color over
    const finishMap = new Map<string, string>();
    for (const f of source.finishes) {
      const same = target.finishes.find((t) => t.slug === f.slug);
      if (same) finishMap.set(f.id, same.id);
      else {
        await tx.finish.update({ where: { id: f.id }, data: { productId: target.id, position: target.finishes.length + finishMap.size } });
        finishMap.set(f.id, f.id);
      }
    }

    // Configurations: same signature on the target → move offers and favorites, drop the duplicate
    for (const v of source.variants) {
      const signature = variantSignature({ storageGb: v.storageGb, ramGb: v.ramGb, option: v.option, finishSlug: v.finish.slug });
      const same = target.variants.find((t) => t.signature === signature);
      if (same) {
        await tx.offer.updateMany({ where: { variantId: v.id }, data: { variantId: same.id } });
        const favs = await tx.favorite.findMany({ where: { variantId: v.id } });
        for (const fav of favs) {
          const dup = await tx.favorite.findUnique({ where: { userId_variantId: { userId: fav.userId, variantId: same.id } } });
          if (dup) await tx.favorite.delete({ where: { id: fav.id } });
          else await tx.favorite.update({ where: { id: fav.id }, data: { variantId: same.id } });
        }
        await tx.variant.delete({ where: { id: v.id } });
      } else {
        await tx.variant.update({ where: { id: v.id }, data: { productId: target.id, finishId: finishMap.get(v.finishId)!, signature } });
      }
    }
    // Colors left behind on the source are now empty
    await tx.finish.deleteMany({ where: { productId: source.id } });

    return tx.product.update({
      where: { id: source.id },
      // The canonical key must stay unique: the merged product keeps a tombstone key
      data: { status: "MERGED", mergedIntoId: target.id, canonicalKey: `${source.canonicalKey}#merged-${source.id}` },
    });
  });
}

/** Admin corrects a store-created model's identity; refuses a correction that would duplicate another product */
export async function correctProductIdentity(productId: string, input: { brand: string; line: string; modelNumber: string }) {
  const key = canonicalKey(input);
  const clash = await prisma.product.findUnique({ where: { canonicalKey: key } });
  if (clash && clash.id !== productId) throw new MergeError(`Ce modèle existe déjà : fusionnez avec « ${clash.model} »`);
  return prisma.product.update({
    where: { id: productId },
    data: { brand: input.brand, line: input.line, modelNumber: input.modelNumber, model: modelName(input.line, input.modelNumber), canonicalKey: key },
  });
}
