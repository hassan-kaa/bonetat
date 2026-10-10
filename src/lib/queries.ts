import "server-only";
import { cpuFamily, hasDedicatedGpu, laptopText } from "./pc-filters";
import type { ConditionGrade, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { displayName, variantLabel } from "./catalog";
import { cheapest, type ConfigOffer } from "./configurator";
import type { ReasonTag, VariantCardData } from "@/types";

/** An offer a buyer can actually purchase right now (one offer = one unit, SOLD ones drop out) */
export const SELLABLE: Prisma.OfferWhereInput = {
  status: "ACTIVE",
  vendor: { status: "APPROVED" },
};

/** A finish with its main catalog photo, if one is approved. No photo → DeviceArt illustration. */
export const finishWithFront = {
  include: {
    images: {
      where: { status: "APPROVED", angle: "FRONT" },
      orderBy: { position: "asc" },
      take: 1,
      select: { key: true },
    },
  },
} satisfies Prisma.FinishDefaultArgs;

const DAY = 24 * 60 * 60 * 1000;

type ProductForCards = {
  variants: (Prisma.VariantGetPayload<{ include: { finish: true } }> & {
    offers: (Prisma.OfferGetPayload<{ include: { vendor: { select: { qualityScore: true; storeName: true } } } }> & { photos?: { key: string }[] })[];
  })[];
};

export function toConfigOffers(product: ProductForCards): ConfigOffer[] {
  return product.variants.flatMap((v) =>
    v.offers.map((o) => ({
      offerId: o.id,
      variantId: v.id,
      grade: o.conditionGrade,
      storageGb: v.storageGb,
      ramGb: v.ramGb,
      option: v.option,
      finishId: v.finishId,
      colorHex: v.finish.hex,
      priceMillimes: o.priceMillimes,
      batteryHealth: o.batteryHealth,
      warrantyMonths: o.warrantyMonths,
      qualityScore: o.vendor.qualityScore,
      vendorName: o.vendor.storeName,
      photos: o.photos?.map((p) => p.key) ?? [],
      listedAt: o.createdAt.getTime(),
    }))
  );
}

export function productHref(slug: string, variantId?: string, grade?: ConditionGrade) {
  const q = new URLSearchParams();
  if (variantId) q.set("v", variantId);
  if (grade) q.set("g", grade);
  const s = q.toString();
  return `/products/${slug}${s ? `?${s}` : ""}`;
}

/** Variant ids sold at least twice in the last 30 days */
async function topSellerVariantIds(): Promise<Set<string>> {
  const rows = await prisma.orderItem.groupBy({
    by: ["offerId"],
    where: { order: { createdAt: { gte: new Date(Date.now() - 30 * DAY) }, status: { not: "CANCELLED" } } },
    _count: { _all: true },
  });
  if (rows.length === 0) return new Set();
  const offers = await prisma.offer.findMany({
    where: { id: { in: rows.map((r) => r.offerId) } },
    select: { id: true, variantId: true },
  });
  const byVariant = new Map<string, number>();
  for (const r of rows) {
    const v = offers.find((o) => o.id === r.offerId)?.variantId;
    if (v) byVariant.set(v, (byVariant.get(v) ?? 0) + r._count._all);
  }
  return new Set([...byVariant].filter(([, n]) => n >= 2).map(([v]) => v));
}

/**
 * One card per variant: its cheapest sellable offer (optionally limited to a grade).
 * The partner behind the offer is never part of the result.
 */
export async function getVariantCards(opts: {
  where?: Prisma.ProductWhereInput;
  /** Union: a card shows the cheapest unit among these grades */
  grades?: ConditionGrade[];
  sort?: "deal" | "price-asc" | "price-desc" | "new";
  take?: number;
  onePerProduct?: boolean;
  minPriceMillimes?: number;
  maxPriceMillimes?: number;
}): Promise<VariantCardData[]> {
  const products = await prisma.product.findMany({
    where: { ...opts.where, variants: { some: { offers: { some: SELLABLE } } } },
    include: {
      variants: {
        include: {
          finish: finishWithFront,
          offers: {
            where: { ...SELLABLE, ...(opts.grades?.length ? { conditionGrade: { in: opts.grades } } : {}) },
            include: { vendor: { select: { qualityScore: true, storeName: true } } },
          },
        },
      },
    },
  });
  const tops = await topSellerVariantIds();

  const cards: (VariantCardData & { createdAt: number; discount: number })[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const config = toConfigOffers({ ...p, variants: [v] });
      const best = cheapest(config);
      if (!best) continue;
      if (opts.minPriceMillimes && best.priceMillimes < opts.minPriceMillimes) continue;
      if (opts.maxPriceMillimes && best.priceMillimes > opts.maxPriceMillimes) continue;
      const offer = v.offers.find((o) => o.id === best.offerId)!;
      const newPrice = v.newPriceMillimes ?? p.newPriceMillimes;
      const sameUnits = v.offers.filter((o) => o.conditionGrade === best.grade).length;
      const discount = newPrice ? 1 - best.priceMillimes / newPrice : 0;
      let tag: ReasonTag | null = null;
      if (sameUnits === 1) tag = "last";
      else if (Date.now() - offer.createdAt.getTime() < 2 * DAY) tag = "fresh";
      else if (tops.has(v.id)) tag = "top";
      else if (
        offer.previousPriceMillimes &&
        offer.previousPriceMillimes > offer.priceMillimes &&
        offer.priceChangedAt &&
        Date.now() - offer.priceChangedAt.getTime() < 7 * DAY
      ) tag = "drop";
      else if (discount >= 0.55) tag = "deal";

      cards.push({
        offerId: best.offerId,
        variantId: v.id,
        productSlug: p.slug,
        name: displayName(p),
        config: variantLabel(v, p.kind),
        kind: p.kind,
        brand: p.brand,
        ramGb: v.ramGb,
        storageGb: v.storageGb,
        cpu: p.kind === "LAPTOP" ? cpuFamily(laptopText(p, v), p.brand) : null,
        gpu: p.kind === "LAPTOP" && hasDedicatedGpu(laptopText(p, v)),
        cameras: p.cameraCount,
        colorHex: v.finish.hex,
        imageKey: v.finish.images[0]?.key ?? p.coverKey,
        imageIsCover: !v.finish.images[0] && !!p.coverKey,
        vendorName: best.vendorName,
        offerCount: v.offers.length,
        grade: best.grade,
        batteryHealth: best.batteryHealth,
        priceMillimes: best.priceMillimes,
        newPriceMillimes: newPrice,
        tag,
        href: productHref(p.slug, v.id, best.grade),
        createdAt: offer.createdAt.getTime(),
        discount,
      });
    }
  }

  switch (opts.sort) {
    case "price-asc": cards.sort((a, b) => a.priceMillimes - b.priceMillimes); break;
    case "price-desc": cards.sort((a, b) => b.priceMillimes - a.priceMillimes); break;
    case "new": cards.sort((a, b) => b.createdAt - a.createdAt); break;
    default: cards.sort((a, b) => b.discount - a.discount);
  }
  let list = cards;
  if (opts.onePerProduct) {
    const seen = new Set<string>();
    list = cards.filter((c) => (seen.has(c.productSlug) ? false : (seen.add(c.productSlug), true)));
  }
  const out = opts.take ? list.slice(0, opts.take) : list;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return out.map(({ createdAt, discount, ...card }) => card);
}

/** Cheapest sellable price per category, for the category tiles */
export async function categoryFloors(): Promise<Map<string, number>> {
  const rows = await prisma.offer.findMany({
    where: SELLABLE,
    select: { priceMillimes: true, variant: { select: { product: { select: { categoryId: true } } } } },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const c = r.variant.product.categoryId;
    map.set(c, Math.min(map.get(c) ?? Infinity, r.priceMillimes));
  }
  return map;
}
