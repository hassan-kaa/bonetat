import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_UNIT_PHOTOS, addOfferPhotos, dropOfferPhoto } from "@/lib/offer-photos";

const photo = z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(3_000_000, "Photo trop lourde") });
const schema = z.object({ photos: z.array(photo).min(1).max(MAX_UNIT_PHOTOS) });

async function ownOffer(id: string) {
  const auth = await getVendorUser();
  if (!auth) return null;
  return prisma.offer.findFirst({ where: { id, vendorId: auth.vendor.id } });
}

/** A store adds real photos of its unit */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await ownOffer(id);
  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (offer.status === "SOLD") return NextResponse.json({ error: "Cet appareil est déjà vendu" }, { status: 400 });
  try {
    const { photos } = schema.parse(await req.json());
    const added = await addOfferPhotos(id, photos);
    return NextResponse.json({ added });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Photo illisible ou serveur indisponible" }, { status: 500 });
  }
}

/** Remove one of them (?photo=<id>) */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await ownOffer(id);
  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  const photoId = req.nextUrl.searchParams.get("photo") ?? "";
  return (await dropOfferPhoto(photoId, "deleted by the shop", id))
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
}
