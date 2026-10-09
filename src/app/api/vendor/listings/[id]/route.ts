import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  priceMillimes: z.number().int().positive().max(50_000_000).optional(),
  sellerNote: z.string().trim().max(200).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/** Price, note and pause/resume. Condition and battery can't change without a new check; a sold unit can't change at all. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const data = schema.parse(await req.json());
    const offer = await prisma.offer.findFirst({ where: { id, vendorId: auth.vendor.id } });
    if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    if (offer.status === "SOLD") return NextResponse.json({ error: "Cet appareil est déjà vendu" }, { status: 400 });

    if (data.status && !["ACTIVE", "INACTIVE"].includes(offer.status)) {
      return NextResponse.json({ error: "Cette offre doit d’abord être validée par Bonétat" }, { status: 400 });
    }

    const priceDrop = data.priceMillimes !== undefined && data.priceMillimes < offer.priceMillimes;
    const priceChange = data.priceMillimes !== undefined && data.priceMillimes !== offer.priceMillimes;
    await prisma.offer.update({
      where: { id },
      data: {
        ...data,
        sellerNote: data.sellerNote === undefined ? undefined : data.sellerNote || null,
        ...(priceChange
          ? { previousPriceMillimes: priceDrop ? offer.priceMillimes : null, priceChangedAt: new Date() }
          : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  const res = await prisma.offer.updateMany({ where: { id, vendorId: auth.vendor.id, status: { not: "SOLD" } }, data: { status: "INACTIVE" } });
  if (res.count === 0) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  return NextResponse.json({ success: true });
}
