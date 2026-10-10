import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { notify } from "@/lib/notify";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "Indiquez ce que l’atelier doit corriger").max(300) }),
  z.object({ action: z.literal("deactivate") }),
]);

/** Moderation, the admin's only job on offers: approve puts it live; "reject" asks the store for a correction (with the reason) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const d = schema.parse(await req.json());
    const data =
      d.action === "approve"
        ? { status: "ACTIVE" as const, rejectionReason: null }
        : d.action === "reject"
          ? { status: "REJECTED" as const, rejectionReason: d.reason }
          : { status: "INACTIVE" as const };
    const offer = await prisma.offer.update({ where: { id }, data, include: { vendor: { select: { userId: true } }, variant: { include: { product: true } } } });
    const name = displayName(offer.variant.product);
    if (d.action === "approve") await notify([offer.vendor.userId], { title: `Offre validée : ${name} est en ligne`, href: "/vendor/listings" });
    if (d.action === "reject") await notify([offer.vendor.userId], { title: `Correction demandée sur ${name} : ${d.reason}`, href: `/vendor/listings/${id}` });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
