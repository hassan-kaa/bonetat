import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SELLABLE } from "@/lib/queries";

/**
 * Current price of each unit in a cart, so stale carts get corrected.
 * A unit that sold meanwhile comes back with the next best unit of the same
 * variant + grade (same order as the buy box: price, quality score, listed first).
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
    const replacement = o
      ? await prisma.offer.findFirst({
          where: { ...SELLABLE, variantId: o.variantId, conditionGrade: o.conditionGrade, id: { notIn: [...taken] } },
          orderBy: [{ priceMillimes: "asc" }, { vendor: { qualityScore: "desc" } }, { createdAt: "asc" }],
          select: { id: true, priceMillimes: true, batteryHealth: true },
        })
      : null;
    if (replacement) taken.add(replacement.id);
    out.push({
      offerId: id,
      available: false,
      replacement: replacement ? { offerId: replacement.id, priceMillimes: replacement.priceMillimes, batteryHealth: replacement.batteryHealth } : null,
    });
  }
  return NextResponse.json(out);
}
