import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { batteryProblem } from "@/lib/catalog";
import { sanitizeSellerText } from "@/lib/seller-text";
import { adminIds, notify } from "@/lib/notify";
import { dropOfferPhotos } from "@/lib/offer-photos";

const schema = z.object({
  priceMillimes: z.number().int().positive().max(50_000_000).optional(),
  sellerNote: z.string().trim().max(200).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  // Only while Bonétat asks for a correction:
  conditionGrade: z.enum(["COMME_NEUF", "TRES_BON", "BON", "CORRECT"]).optional(),
  batteryHealth: z.number().int().min(0).max(100).nullable().optional(),
  imei: z.string().regex(/^\d{15}$/, "L’IMEI fait 15 chiffres (composez *#06#)").nullable().optional(),
  /** Send the corrected offer back to moderation */
  resubmit: z.literal(true).optional(),
});

/**
 * Price, note and pause/resume. Grade, battery and IMEI change only while Bonétat asks for a
 * correction, and the offer then goes back to moderation. A sold unit can't change at all.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const data = schema.parse(await req.json());
    const offer = await prisma.offer.findFirst({ where: { id, vendorId: auth.vendor.id } });
    if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    if (offer.status === "SOLD") return NextResponse.json({ error: "Cet appareil est déjà vendu" }, { status: 400 });
    if (offer.status === "WITHDRAWN") return NextResponse.json({ error: "Cette offre a été supprimée" }, { status: 400 });

    if (data.status && !["ACTIVE", "INACTIVE"].includes(offer.status)) {
      return NextResponse.json({ error: "Cette offre doit d’abord être validée par Bonétat" }, { status: 400 });
    }
    const correcting = offer.status === "REJECTED";
    if (!correcting && (data.conditionGrade || data.batteryHealth !== undefined || data.imei !== undefined || data.resubmit)) {
      return NextResponse.json({ error: "L’état et la batterie ne se modifient que si Bonétat demande une correction" }, { status: 400 });
    }
    if (correcting && data.batteryHealth !== undefined) {
      const product = await prisma.product.findFirstOrThrow({ where: { variants: { some: { id: offer.variantId } } }, select: { kind: true } });
      const problem = batteryProblem(product.kind, data.batteryHealth);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    }

    const priceDrop = data.priceMillimes !== undefined && data.priceMillimes < offer.priceMillimes;
    const priceChange = data.priceMillimes !== undefined && data.priceMillimes !== offer.priceMillimes;
    await prisma.offer.update({
      where: { id },
      data: {
        priceMillimes: data.priceMillimes,
        status: data.resubmit ? "PENDING_REVIEW" : data.status,
        conditionGrade: data.conditionGrade,
        batteryHealth: data.batteryHealth,
        imei: data.imei,
        ...(data.resubmit ? { rejectionReason: null } : {}),
        sellerNote: data.sellerNote === undefined ? undefined : data.sellerNote ? sanitizeSellerText(data.sellerNote) || null : null,
        ...(priceChange
          ? { previousPriceMillimes: priceDrop ? offer.priceMillimes : null, priceChangedAt: new Date() }
          : {}),
      },
    });
    if (data.resubmit) await notify(await adminIds(), { title: `Offre corrigée à recontrôler (${auth.vendor.storeName})`, href: "/admin/listings" });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

const withdrawSchema = z.object({ reason: z.enum(["SOLD_ELSEWHERE", "UNAVAILABLE", "MISTAKE"], { message: "Choisissez une raison" }) });

/**
 * Delete an offer: it disappears for the shop and the buyers, its photos are released. Kept in the database
 * (past orders point to it, and the reason tells Bonétat how often units sell elsewhere). Not while in an order.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const { reason } = withdrawSchema.parse(await req.json().catch(() => ({})));
    const res = await prisma.offer.updateMany({
      where: { id, vendorId: auth.vendor.id, status: { notIn: ["SOLD", "WITHDRAWN"] } },
      data: { status: "WITHDRAWN", withdrawnReason: reason, withdrawnAt: new Date() },
    });
    if (res.count === 0) {
      const sold = await prisma.offer.count({ where: { id, vendorId: auth.vendor.id, status: "SOLD" } });
      return NextResponse.json({ error: sold ? "Cet appareil est dans une commande : il ne peut pas être supprimé" : "Offre introuvable" }, { status: sold ? 400 : 404 });
    }
    await dropOfferPhotos(id, `offer deleted by the shop (${reason})`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
