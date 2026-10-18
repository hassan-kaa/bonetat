import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { dropOfferPhoto } from "@/lib/offer-photos";

/** The admin refuses one of a shop's photos (phone number, link, not the device…): off the offer at once */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  return (await dropOfferPhoto(id, "refused by the admin"))
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
}
