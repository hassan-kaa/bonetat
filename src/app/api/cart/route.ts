import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SELLABLE } from "@/lib/queries";
import { rankUnits } from "@/lib/configurator";

/**
 * Current price of each unit in a cart, so stale carts get corrected.
 * A unit that sold meanwhile comes back with the next best unit of the same
 * variant + grade, picked exactly like the buy box (rankUnits: price, real photos within 2 %, shop quality, listed first).
 */
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
  if (ids.length === 0) return NextResponse.json([]);
  const offers = await prisma.offer.findMany({
    where: { id: { in: ids } },
    select: { id: true, variantId: true, conditionGrade: true, priceMillimes: true, status: true, vendor: { select: { status: true } } },
  });

  const taken = new Set(ids);
  const out = [];
  for (const id of ids) {
    const o = offers.find((x) => x.id === id);
    if (o && o.status === "ACTIVE" && o.vendor.status === "APPROVED") {
      out.push({ offerId: id, available: true, priceMillimes: o.priceMillimes });
      continue;
    }
    const candidates = o
      ? await prisma.offer.findMany({
          where: { ...SELLABLE, variantId: o.variantId, conditionGrade: o.conditionGrade, id: { notIn: [...taken] } },
          select: { id: true, priceMillimes: true, batteryHealth: true, createdAt: true, vendor: { select: { storeName: true, qualityScore: true } }, photos: { select: { key: true } } },
        })
      : [];
    const ranked = rankUnits(
      candidates.map((c) => ({
        offerId: c.id, variantId: o!.variantId, grade: o!.conditionGrade, storageGb: null, ramGb: null, option: null, finishId: "", colorHex: "",
        priceMillimes: c.priceMillimes, batteryHealth: c.batteryHealth, warrantyMonths: 0, qualityScore: c.vendor.qualityScore,
        vendorName: c.vendor.storeName, photos: c.photos.map((p) => p.key), listedAt: c.createdAt.getTime(),
      }))
    );
    const replacement = ranked[0] ? candidates.find((c) => c.id === ranked[0].offerId)! : null;
    if (replacement) taken.add(replacement.id);
    out.push({
      offerId: id,
      available: false,
      replacement: replacement
        ? { offerId: replacement.id, priceMillimes: replacement.priceMillimes, batteryHealth: replacement.batteryHealth, vendorName: replacement.vendor.storeName }
        : null,
    });
  }
  return NextResponse.json(out);
}
